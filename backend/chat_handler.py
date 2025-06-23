import os
import numpy as np
from openai import OpenAI
from typing import List
from dotenv import load_dotenv

# load environment variables from .env file
load_dotenv()

# Initize the OpenAI client using the APY fro the .env
client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

def get_embedding(text: str) -> np.ndarray:
    """
    Generates an embedding vector for a given text using OpenAI's embedding API

    Args:
        text (str): text to be embedded 
    
        Returns:
            np.ndarray: a numpy array representing embedded text
    """
    response = client.embeddings.create(
        model="text-embedding-3-small",
        input=text
    )
    return np.array(response.data[0].embedding)

def cosine_similarity(a: np.ndarray, b: np.ndarray) -> float:
    """
    Calculate cosine similarity between embedded vectors
    Used to measure semantic similarity

    Args: 
        a (np.ndarray): first embedding vector
        b (np.ndarray): second embedding vector

    Returns:
        float: cosine similarity score between them (range -1 to 1)

    """
    return np.dot(a, b) / (np.linalg.norm(a) * np.linalg.norm(b))

class PDFContext:
    def __init__(self, chunks: List[str]):
        """
        Initializes the PDFContext with text chunks and precomputes their embeddings

        Args:
            chunks (List[str]): A list of text chunks extracted from a PDF

        """
        self.chunks = chunks
        self.embeddings = [get_embedding(chunk) for chunk in chunks]

    def get_relevant_chunks(self, question: str, top_k=3) -> List[str]:
        """
        Retrives the most relevant chunks from the PDF based on a given question

        Uses cosine similarity between the question embedding and the chunks enbbedings
        to identify the top-k semantically closest chunks

        Args:
            question (str): the input question
            top_k (int, optional): number of top relevant chunks to return. defaults to 3
        
        Returns:
            List[str]: a list of the most relevant chunks of text

        """
        question_emb = get_embedding(question)

        # Compute similarity score for each chunk
        similarities = [cosine_similarity(question_emb, emb) for emb in self.embeddings]
        
        # get indices of the top-k most similar chunks
        top_indices = np.argsort(similarities)[-top_k:]

        # Return the corresponding text chunks
        return [self.chunks[i] for i in top_indices]
