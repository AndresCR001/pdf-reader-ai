from PyPDF2 import PdfReader

def load_pdf(path: str) -> str:
    reader = PdfReader(path)
    text = ""
    for page in reader.pages:
        text += page.extract_text() + "\n"
    return text

def chunk_text(text: str, max_length: int = 2000) -> list[str]:
    return [text[i:i+max_length] for i in range(0, len(text), max_length)]
