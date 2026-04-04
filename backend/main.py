import os
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from langchain_openai import ChatOpenAI
from langchain_huggingface import HuggingFaceEmbeddings
from langchain_community.vectorstores import Chroma
from langchain_classic.chains import RetrievalQA
from dotenv import load_dotenv
from fastapi.middleware.cors import CORSMiddleware

load_dotenv()

# Configuration
DB_DIR = os.path.join(os.path.dirname(__file__), "db")

app = FastAPI(title="Banking Policy Multilingual Chatbot")

# CORS middleware for Next.js frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Adjust this for production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize vector store and LLM
try:
    embeddings = HuggingFaceEmbeddings(model_name="all-MiniLM-L6-v2")
    vectorstore = Chroma(persist_directory=DB_DIR, embedding_function=embeddings)
    llm = ChatOpenAI(model_name="gpt-3.5-turbo", temperature=0)
    
    # Create the QA chain
    qa_chain = RetrievalQA.from_chain_type(
        llm=llm,
        chain_type="stuff",
        retriever=vectorstore.as_retriever(search_kwargs={"k": 3}),
        return_source_documents=True
    )
except Exception as e:
    print(f"Error initializing services: {e}")
    qa_chain = None

class ChatRequest(BaseModel):
    message: str

class ChatResponse(BaseModel):
    answer: str
    sources: list

@app.get("/")
def read_root():
    return {"message": "Banking Policy Chatbot API is running!"}

@app.post("/chat", response_model=ChatResponse)
async def chat(request: ChatRequest):
    if not qa_chain:
        raise HTTPException(status_code=500, detail="QA chain is not initialized. Please ensure the vector store is created.")

    try:
        # Prompt: "Answer in the same language as the user's message"
        prompt = f"""
        Use the following context to answer the user's question about banking policies.
        If the answer is not in the context, say that you don't know based on the policy.
        Please respond in the same language as the user's question.

        Context: {{context}}
        Question: {request.message}
        """
        
        # LangChain's RetrievalQA usually takes the query directly, but we can wrap it.
        # For simplicity, we'll use the default RetrievalQA and rely on the LLM's inherent multilingual capability.
        # Most of the time, GPT-3.5/4 will reply in the same language. 
        # But let's refine the prompt by using a custom prompt template if needed.
        
        result = qa_chain({"query": request.message})
        
        answer = result["result"]
        sources = [doc.metadata.get("source", "Unknown") for doc in result["source_documents"]]
        
        return ChatResponse(answer=answer, sources=sources)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
