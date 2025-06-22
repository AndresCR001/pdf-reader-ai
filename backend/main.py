from fastapi import FastAPI, Request
from fastapi.responses import StreamingResponse
from fastapi.middleware.cors import CORSMiddleware
from pdf_loader import load_pdf, chunk_text
from chat_handler import PDFContext, client
import asyncio

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

    async def event_generator():
        # Iterar de forma síncrona en un hilo con run_in_executor
        for chunk in stream:
            content = getattr(chunk.choices[0].delta, "content", None)
            if content:
                yield f"data: {{\"type\": \"content\", \"content\": \"{content}\"}}\n\n"
            # Opcional: espera mínima para ceder control y evitar bloqueos
            await asyncio.sleep(0)
        yield 'data: {"type": "done"}\n\n'

    return StreamingResponse(event_generator(), media_type="text/event-stream")
