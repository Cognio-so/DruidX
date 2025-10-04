from typing import List, Dict, Any
import pypdf
import docx
import json
from io import BytesIO
import uuid
from fastapi import UploadFile
from models import DocumentInfo

def extract_text_from_pdf(file_content: bytes) -> str:
    """Extract text from PDF file"""
    try:
        pdf_reader = pypdf.PdfReader(BytesIO(file_content))
        text = ""
        for page in pdf_reader.pages:
            text += page.extract_text() + "\n"
        return text
    except Exception as e:
        print(f"Error reading PDF: {e}")
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
        print(f"Error reading DOCX: {e}")
        return ""

def extract_text_from_txt(file_content: bytes) -> str:
    """Extract text from TXT file"""
    try:
        return file_content.decode('utf-8')
    except Exception as e:
        print(f"Error reading TXT: {e}")
        return ""

def extract_text_from_json(file_content: bytes) -> str:
    """Extract text from JSON file"""
    try:
        data = json.loads(file_content.decode('utf-8'))
        # Convert JSON to readable text format
        if isinstance(data, dict):
            text = ""
            for key, value in data.items():
                text += f"{key}: {value}\n"
            return text
        elif isinstance(data, list):
            text = ""
            for i, item in enumerate(data):
                text += f"Item {i+1}: {item}\n"
            return text
        else:
            return str(data)
    except Exception as e:
        print(f"Error reading JSON: {e}")
        return ""

async def process_uploaded_files_api(uploaded_files: List[UploadFile]) -> List[DocumentInfo]:
    """Process uploaded files and extract text content for API"""
    processed_docs = []
    
    for file in uploaded_files:
        if file is not None:
            try:
                # Read file content
                file_content = await file.read()
                file_extension = file.filename.split('.')[-1].lower() if '.' in file.filename else 'txt'
                file_id = str(uuid.uuid4())
                
                # Extract text based on file type
                text = ""
                if file_extension == 'pdf':
                    text = extract_text_from_pdf(file_content)
                elif file_extension == 'docx':
                    text = extract_text_from_docx(file_content)
                elif file_extension == 'txt':
                    text = extract_text_from_txt(file_content)
                elif file_extension == 'json':
                    text = extract_text_from_json(file_content)
                else:
                    text = extract_text_from_txt(file_content)  # Default fallback
                
                if text.strip():
                    # Create DocumentInfo object with correct fields
                    doc_info = DocumentInfo(
                        id=file_id,
                        filename=file.filename,
                        content=text,
                        file_type=file_extension,
                        file_url=f"uploaded/{file.filename}",  # Simple URL for now
                        size=len(file_content)
                    )
                    processed_docs.append(doc_info)
                else:
                    print(f"No text content found in {file.filename}")
                    
            except Exception as e:
                print(f"Error processing {file.filename}: {e}")
                continue
    
    return processed_docs

async def process_knowledge_base_files(uploaded_files: List[UploadFile]) -> List[DocumentInfo]:
    """Process knowledge base files and extract text content"""
    processed_docs = []
    
    for file in uploaded_files:
        if file is not None:
            try:
                # Read file content
                file_content = await file.read()
                file_extension = file.filename.split('.')[-1].lower() if '.' in file.filename else 'txt'
                file_id = str(uuid.uuid4())
                
                # Extract text based on file type
                text = ""
                if file_extension == 'pdf':
                    text = extract_text_from_pdf(file_content)
                elif file_extension == 'docx':
                    text = extract_text_from_docx(file_content)
                elif file_extension == 'txt':
                    text = extract_text_from_txt(file_content)
                elif file_extension == 'json':
                    text = extract_text_from_json(file_content)
                else:
                    text = extract_text_from_txt(file_content)  # Default fallback
                
                if text.strip():
                    # Create DocumentInfo object with correct fields
                    doc_info = DocumentInfo(
                        id=file_id,
                        filename=file.filename,
                        content=text,
                        file_type=file_extension,
                        file_url=f"kb/{file.filename}",  # Simple URL for KB docs
                        size=len(file_content)
                    )
                    processed_docs.append(doc_info)
                else:
                    print(f"No text content found in KB file {file.filename}")
                    
            except Exception as e:
                print(f"Error processing KB file {file.filename}: {e}")
                continue
    
    return processed_docs