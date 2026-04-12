import os
import shutil
import gc
import uuid
from typing import List
from fastapi import FastAPI, HTTPException, UploadFile, File
from pydantic import BaseModel
from langchain_openai import ChatOpenAI
from langchain_huggingface import HuggingFaceEmbeddings
from langchain_chroma import Chroma
from langchain_classic.chains import RetrievalQA
from langchain_core.prompts import PromptTemplate
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
from ingest import ingest_docs

load_dotenv()

# Configuration
DB_ROOT_DIR = os.path.join(os.path.dirname(__file__), "db")
UPLOAD_DIR = os.path.join(os.path.dirname(__file__), "temp_uploads")
os.makedirs(DB_ROOT_DIR, exist_ok=True)
os.makedirs(UPLOAD_DIR, exist_ok=True)

app = FastAPI(title="Banking Policy Multilingual Chatbot")

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global variables for state
qa_chain = None
current_db_dir = None
embeddings = HuggingFaceEmbeddings(model_name="all-MiniLM-L6-v2")

def initialize_qa_chain(db_dir: str):
    global qa_chain, current_db_dir
    if os.path.exists(db_dir) and os.listdir(db_dir):
        try:
            vectorstore = Chroma(persist_directory=db_dir, embedding_function=embeddings)
            llm = ChatOpenAI(model_name="gpt-3.5-turbo", temperature=0)
            
            # Guardrail: Strict Prompt Template
            template = """You are a professional banking assistant. Use the following pieces of context to answer the question at the end. 
            If you don't know the answer, just say that you don't know, don't try to make up an answer.
            Keep the answer professional and related to banking policies.
            Respond in the same language as the question.

            {context}

            Question: {question}
            Helpful Answer:"""
            
            QA_CHAIN_PROMPT = PromptTemplate(
                input_variables=["context", "question"],
                template=template,
            )

            qa_chain = RetrievalQA.from_chain_type(
                llm=llm,
                chain_type="stuff",
                retriever=vectorstore.as_retriever(search_kwargs={"k": 3}),
                return_source_documents=True,
                chain_type_kwargs={"prompt": QA_CHAIN_PROMPT}
            )
            current_db_dir = db_dir
            print(f"QA Chain initialized successfully with DB at {db_dir}")
            return True
        except Exception as e:
            print(f"Error initializing QA chain: {e}")
            return False
    return False

# Attempt to find the most recent DB folder on startup
subdirs = [os.path.join(DB_ROOT_DIR, d) for d in os.listdir(DB_ROOT_DIR) if os.path.isdir(os.path.join(DB_ROOT_DIR, d))]
if subdirs:
    # Sort by creation time to get the latest
    latest_db = max(subdirs, key=os.path.getmtime)
    initialize_qa_chain(latest_db)

class ChatRequest(BaseModel):
    message: str

class ChatResponse(BaseModel):
    answer: str
    sources: List[str]

@app.get("/")
def read_root():
    return {"message": "Banking Policy Chatbot API is running!"}

@app.get("/status")
def get_status():
    return {"ingested": qa_chain is not None}

@app.post("/upload")
async def upload_file(file: UploadFile = File(...)):
    global qa_chain
    # Save the file temporarily
    file_path = os.path.join(UPLOAD_DIR, file.filename)
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
    
    try:
        # Create a unique subdirectory for this ingestion to avoid WinError 32
        session_db_dir = os.path.join(DB_ROOT_DIR, f"session_{uuid.uuid4().hex[:8]}")
        os.makedirs(session_db_dir, exist_ok=True)

        # Ingest the new file into the unique subdirectory
        success = ingest_docs(file_path, session_db_dir)
        
        if success:
            # Shutdown old connection if any
            if qa_chain:
                try:
                    vs = qa_chain.retriever.vectorstore
                    if hasattr(vs, "_client"):
                        if hasattr(vs._client, "close"): vs._client.close()
                        elif hasattr(vs._client, "stop"): vs._client.stop()
                    del vs
                except Exception: pass
                qa_chain = None
                gc.collect()

            # Initialize the QA chain with the new directory
            if initialize_qa_chain(session_db_dir):
                return {"message": f"File '{file.filename}' uploaded and ingested successfully."}
            else:
                raise HTTPException(status_code=500, detail="Failed to initialize QA chain after ingestion.")
        else:
            raise HTTPException(status_code=500, detail="Failed to ingest the uploaded file.")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        # Cleanup temp upload file
        if os.path.exists(file_path):
            os.remove(file_path)

@app.post("/chat", response_model=ChatResponse)
async def chat(request: ChatRequest):
    if not qa_chain:
        raise HTTPException(
            status_code=400, 
            detail="No banking policy has been uploaded yet. Please upload a policy file first."
        )

    try:       
        result = qa_chain({"query": request.message})
        answer = result["result"]
        sources = list(set([doc.metadata.get("source", "Unknown") for doc in result["source_documents"]]))
        return ChatResponse(answer=answer, sources=sources)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=8001)
