from PyPDF2 import PdfReader

def load_pdf(path: str) -> str:
    """
    Loads a PDF file and extracts its full textual content

    Args:
        path (str): The file path to the PDF document

    Returns:
        str: the extracted text from the all pages of th PDF, separated by newlines
    """
    reader = PdfReader(path)
    text = ""

    # Iterate through each page and extract its text
    for page in reader.pages:
        text += page.extract_text() + "\n"
    return text

def chunk_text(text: str, max_length: int = 2000) -> list[str]:
    """
    Splits a large string into smaller chunks of a specified maximum lenght

    Manage token limits

    Args:
        text (str): the input text to be chunked
        max_lenght (int, optional): Maximum lenght of each chunk

    Returns:
        list[str]: list of text chunks
    """
    return [text[i:i+max_length] for i in range(0, len(text), max_length)]
