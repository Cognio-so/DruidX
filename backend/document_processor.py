import streamlit as st
from typing import List, Dict, Any
import PyPDF2
import docx
from io import BytesIO
import uuid

def extract_text_from_pdf(file_content: bytes) -> str:
    """Extract text from PDF file"""
    try:
        pdf_reader = PyPDF2.PdfReader(BytesIO(file_content))
        text = ""
        for page in pdf_reader.pages:
            text += page.extract_text() + "\n"
        return text
    except Exception as e:
        st.error(f"Error reading PDF: {e}")
        return ""

def extract_text_from_docx(file_content: bytes) -> str:
    """Extract text from DOCX file"""
    try:
        doc = docx.Document(BytesIO(file_content))
        text = ""
        for paragraph in doc.paragraphs:
            text += paragraph.text + "\n"
        return text
    except Exception as e:
        st.error(f"Error reading DOCX: {e}")
        return ""

def extract_text_from_txt(file_content: bytes) -> str:
    """Extract text from TXT file"""
    try:
        return file_content.decode('utf-8')
    except Exception as e:
        st.error(f"Error reading TXT: {e}")
        return ""

def process_uploaded_files(uploaded_files: List[Any]) -> List[Dict[str, Any]]:
    """Process uploaded files and extract text content"""
    processed_docs = []
    
    for file in uploaded_files:
        if file is not None:
            file_content = file.read()
            file_type = file.type
            if file_type == "application/pdf":
                text = extract_text_from_pdf(file_content)
            elif file_type == "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
                text = extract_text_from_docx(file_content)
            elif file_type == "text/plain":
                text = extract_text_from_txt(file_content)
            else:
                st.warning(f"Unsupported file type: {file_type}")
                continue
            
            if text.strip():
                processed_docs.append({
                    "filename": file.name,
                    "content": text,
                    "type": file_type,
                    "id": str(uuid.uuid4())
                })
            else:
                st.warning(f"No text content found in {file.name}")
    
    return processed_docs

def display_document_preview(docs: List[Dict[str, Any]], title: str = "Documents"):
    """Display a preview of processed documents"""
    if docs:
        with st.expander(f"📄 {title} Preview ({len(docs)} files)"):
            for i, doc in enumerate(docs):
                st.write(f"**{i+1}. {doc['filename']}**")
                preview = doc['content'][:200] + "..." if len(doc['content']) > 200 else doc['content']
                st.text_area(f"Preview {i+1}", preview, height=100, key=f"preview_{doc['id']}")