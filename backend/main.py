from fastapi import FastAPI, Request, HTTPException
from fastapi.responses import StreamingResponse
from fastapi.middleware.cors import CORSMiddleware
from pdf_loader import load_pdf, chunk_text
from chat_handler import PDFContext, client
from time import time
from collections import defaultdict
import asyncio
import json

# === Configuration ===
RATE_LIMIT = 5         # máx number of request per IP
WINDOW_SECONDS = 60    # time window for rate limiting

# Stores timestamps of requests per IP
user_requests = defaultdict(list)

def is_rate_limited(ip: str) -> bool:
    """
    Checks if the given IP exceed the allowed request rate

    Args: 
        ip(str): the IP address of the client

    Returns: 
        bool: True if rate-limited, False otherwise

    """
    now = time()
    requests = user_requests[ip]
    
    # Remove old request timestamps
    user_requests[ip] = [ts for ts in requests if now - ts < WINDOW_SECONDS]

    if len(user_requests[ip]) >= RATE_LIMIT:
        return True

    # register current request
    user_requests[ip].append(now)
    return False

# === FastAPI Initialization ===
app = FastAPI()

# Enable CORS for frontend development on localhost
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Load and preprocess the PDF document at startup
pdf_text = load_pdf("document.pdf")
chunks = chunk_text(pdf_text)
pdf_context = PDFContext(chunks)

@app.post("/chat")
async def chat(request: Request):
    """
    Handles chat request using context extracted from a PDF document.

    Receives a user question, fetches relevant text chunks from the PDF,
    and queries the OpenAI chat completion API using streamed responses.

    Rate-limiting is applied per IP

    Args:
        request (Request): the http request containing the question.

    Returns:
        StreamingResponse: a Server-Sent Events (SSE) response streaming the answer.
    
    """
    ip = request.client.host
    if is_rate_limited(ip):
        raise HTTPException(status_code=429, detail="Too many requests. Please wait a moment.")
    data = await request.json()
    question = data.get("message")

    # Get the most relevant PDF sections
    relevant_chunks = pdf_context.get_relevant_chunks(question)
    context_text = "\n\n".join(relevant_chunks)

    messages = [
        {"role": "system", "content": "You are a helpful assistant that answers questions based on provided context."},
        {"role": "user", "content": f"Context:\n{context_text}\n\nQuestion: {question}"}
    ]

    #Stream OpenAI response in real time
    stream = client.chat.completions.create(
        model="gpt-3.5-turbo",
        messages=messages,
        stream=True,
    )

    full_response = {"text": ""}

    async def event_generator():
        """
        Asynchronously yields response chunks from OpenAI API using SSE format
        """
        for chunk in stream:
            content = getattr(chunk.choices[0].delta, "content", None)
            if content:
                full_response["text"] += content
                payload = {
                    "type": "content",
                    "content": content
                }
                yield f"data: {json.dumps(payload)}\n\n"
            await asyncio.sleep(0) # Yield control to the event loop

        # Calculate token usage (not streamed to client)
        usage_response = client.chat.completions.create(
            model="gpt-3.5-turbo",
            messages=messages + [{"role": "assistant", "content": full_response["text"]}],
            stream=False,
        )

        total_tokens = usage_response.usage.total_tokens if usage_response.usage else 0

        yield f"data: {json.dumps({'type': 'done', 'usage': {'total_tokens': total_tokens}})}\n\n"

    return StreamingResponse(event_generator(), media_type="text/event-stream")

# === Development Server Entry Point ===
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=True
    )
