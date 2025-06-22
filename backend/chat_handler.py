import os
import numpy as np
from openai import OpenAI
from typing import List
from dotenv import load_dotenv

load_dotenv()

client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

def get_embedding(text: str) -> np.ndarray:
    response = client.embeddings.create(
        model="text-embedding-3-small",
        input=text
    )
    return np.array(response.data[0].embedding)

def cosine_similarity(a: np.ndarray, b: np.ndarray) -> float:
    return np.dot(a, b) / (np.linalg.norm(a) * np.linalg.norm(b))

class PDFContext:
    def __init__(self, chunks: List[str]):
        self.chunks = chunks
        self.embeddings = [get_embedding(chunk) for chunk in chunks]

    def get_relevant_chunks(self, question: str, top_k=3) -> List[str]:
        question_emb = get_embedding(question)
        similarities = [cosine_similarity(question_emb, emb) for emb in self.embeddings]
        top_indices = np.argsort(similarities)[-top_k:]
        return [self.chunks[i] for i in top_indices]
