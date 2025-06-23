# PDF Reader AI

A lightweight web application that allows users to interact with a PDF document using OpenAI's GPT model. Users can ask questions about the document, receive streaming responses, manage multiple chat sessions, and export conversations.

## Features

- Upload and embed a PDF (preloaded in backend)
- Ask questions based on document content
- Real-time streamed responses using Server-Sent Events (SSE)
- OpenAI GPT-3.5 integration for question answering
- Session management with token and cost tracking
- Export chat history as `.txt` or `.md`

---

## Tech Stack

### Backend
- [FastAPI](https://fastapi.tiangolo.com/) – Python web framework
- [OpenAI Python SDK](https://github.com/openai/openai-python)
- [PyPDF2](https://pypi.org/project/PyPDF2/) – PDF parsing
- [dotenv](https://pypi.org/project/python-dotenv/)

### Frontend
- HTML5 / CSS3 / Vanilla JavaScript
- [Live Server](https://www.npmjs.com/package/live-server) for local development

---

## 📂 Project Structure

pdf-reader-ai/
├── backend/
│ ├── main.py # FastAPI server and chat endpoint
│ ├── pdf_loader.py # PDF reading and chunking logic
│ ├── chat_handler.py # Embedding, context search, OpenAI interaction
│ ├── document.pdf # Target PDF file
│ └── .env # API key
├── frontend/
│ ├── index.html # Web UI
│ ├── style.css # Styling
│ ├── main.js # Chat interaction and session logic
│ └── package.json # Dev tools (Live Server)


---

## ⚙️ Getting Started

### 1. Clone the repository

```bash
git clone https://github.com/AndresCR001/pdf-reader-ai.git
cd pdf-reader-ai
```

### 2. Backend Setup

```bash
cd backend
python3 -m venv venv
source venv/bin/activate  # For macOS/Linux
venv\Scripts\activate     # For Windows

pip install -r requirements.txt
```

- Rename .env.example to .env and add your OpenAI Key
```env
OPENAI_API_KEY=your-api-key-here
```

- Run the backend server (running at http://localhost:8000)
```bash
python3 main.py
```

### Frontend Setup

```bash
cd ../frontend
npm install
npm start
```
- The back end will be running at http://localhost:3000


Example Use

1. The app loads a PDF (by default document.pdf in backend).
2. User types a question like:
    "What is the main conclusion of this document?"
3. The backend searches the most relevant chunks and streams the GPT response.
4. You can view usage, clear chat, switch sessions, or export the conversation.


Environment Variables

The backend uses the following:

Variable	        Description
OPENAI_API_KEY	    Your OpenAI API Key


Author
Andrés Chavarría Elizondo
+506 71437888
andres.chava.eliz@gmail.com