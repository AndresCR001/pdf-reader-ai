from fastapi import FastAPI, Request, HTTPException
from fastapi.responses import StreamingResponse
from fastapi.middleware.cors import CORSMiddleware
from pdf_loader import load_pdf, chunk_text
from chat_handler import PDFContext, client
from time import time
from collections import defaultdict
import asyncio
import json

RATE_LIMIT = 5         # máx. 5 requests
WINDOW_SECONDS = 60    # for 60 seconds

user_requests = defaultdict(list)

def is_rate_limited(ip: str) -> bool:
    now = time()
    requests = user_requests[ip]
    
    # Remover timestamps viejos fuera de ventana
    user_requests[ip] = [ts for ts in requests if now - ts < WINDOW_SECONDS]

    if len(user_requests[ip]) >= RATE_LIMIT:
        return True

    user_requests[ip].append(now)
    return False


app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

pdf_text = load_pdf("document.pdf")
chunks = chunk_text(pdf_text)
pdf_context = PDFContext(chunks)

@app.post("/chat")
async def chat(request: Request):
    ip = request.client.host
    if is_rate_limited(ip):
        raise HTTPException(status_code=429, detail="Too many requests. Please wait a moment.")
    data = await request.json()
    question = data.get("message")

    relevant_chunks = pdf_context.get_relevant_chunks(question)
    context_text = "\n\n".join(relevant_chunks)

    messages = [
        {"role": "system", "content": "You are a helpful assistant that answers questions based on provided context."},
        {"role": "user", "content": f"Context:\n{context_text}\n\nQuestion: {question}"}
    ]

    stream = client.chat.completions.create(
        model="gpt-3.5-turbo",
        messages=messages,
        stream=True,
    )

    full_response = {"text": ""}

    async def event_generator():
        # Iterar de forma síncrona en un hilo con run_in_executor
        for chunk in stream:
            content = getattr(chunk.choices[0].delta, "content", None)
            if content:
                full_response["text"] += content
                payload = {
                    "type": "content",
                    "content": content
                }
                yield f"data: {json.dumps(payload)}\n\n"
            await asyncio.sleep(0)

        # Segunda llamada para contar tokens (no se envía al usuario)
        usage_response = client.chat.completions.create(
            model="gpt-3.5-turbo",
            messages=messages + [{"role": "assistant", "content": full_response["text"]}],
            stream=False,
        )

        total_tokens = usage_response.usage.total_tokens if usage_response.usage else 0

        yield f"data: {json.dumps({'type': 'done', 'usage': {'total_tokens': total_tokens}})}\n\n"

    return StreamingResponse(event_generator(), media_type="text/event-stream")