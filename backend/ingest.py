import os
from typing import List
from langchain_community.document_loaders import (
    PyPDFLoader,
    TextLoader,
    Docx2txtLoader,
    CSVLoader,
    UnstructuredExcelLoader,
)
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_huggingface import HuggingFaceEmbeddings
from langchain_chroma import Chroma
from dotenv import load_dotenv

load_dotenv()

# Configuration
DB_DIR = os.path.join(os.path.dirname(__file__), "db")

def get_loader(file_path: str):
    ext = os.path.splitext(file_path)[1].lower()
    if ext == ".pdf":
        return PyPDFLoader(file_path)
    elif ext == ".txt":
        return TextLoader(file_path)
    elif ext in [".doc", ".docx"]:
        return Docx2txtLoader(file_path)
    elif ext == ".csv":
        return CSVLoader(file_path)
    elif ext in [".xls", ".xlsx"]:
        return UnstructuredExcelLoader(file_path)
    else:
        raise ValueError(f"Unsupported file format: {ext}")

def ingest_docs(file_path: str, target_db_dir: str):
    if not os.path.exists(file_path):
        print(f"Error: File not found at {file_path}")
        return False

    print(f"Loading document from {file_path}...")
    try:
        loader = get_loader(file_path)
        documents = loader.load()
    except Exception as e:
        print(f"Error loading document: {e}")
        return False

    print("Splitting documents...")
    text_splitter = RecursiveCharacterTextSplitter(chunk_size=1000, chunk_overlap=100)
    docs = text_splitter.split_documents(documents)

    print(f"Creating/Updating embeddings and storing in Chroma at {target_db_dir}...")
    embeddings = HuggingFaceEmbeddings(model_name="all-MiniLM-L6-v2")
    
    # Initialize/Update Chroma vector store
    vectorstore = Chroma.from_documents(
        documents=docs,
        embedding=embeddings,
        persist_directory=target_db_dir
    )
    
    # Explicitly close the client after ingestion to release file locks on Windows
    if hasattr(vectorstore, "_client"):
        if hasattr(vectorstore._client, "close"):
            vectorstore._client.close()
        elif hasattr(vectorstore._client, "stop"):
            vectorstore._client.stop()
    
    print("Ingestion complete!")
    return True

if __name__ == "__main__":
    # For testing purposes
    TEST_PATH = os.path.join(os.path.dirname(__file__), "data", "banking_policy.pdf")
    if os.path.exists(TEST_PATH):
        ingest_docs(TEST_PATH)
    else:
        print("Set a valid path in TEST_PATH for local testing.")
