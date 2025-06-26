// src/App.jsx
import React, { useEffect, useRef, useState } from "react";
import "./App.css";

export default function App() {
  const questionInputRef = useRef();
  const typingIndicatorRef = useRef();
  const usageInfoRef = useRef();

  const [sessions, setSessions] = useState({});
  const [activeSessionId, setActiveSessionId] = useState(null);
  const [messages, setMessages] = useState([]);

  useEffect(() => {
    createSession("Chat");
  }, []);

  const createSession = (name = `Chat ${Object.keys(sessions).length + 1}`) => {
    const id = crypto.randomUUID();
    const newSession = {
      ...sessions,
      [id]: { name, messages: [], tokens: 0, cost: 0 }
    };
    setSessions(newSession);
    setActiveSessionId(id);
    setMessages([]); // reset messages on new session
  };

  const sendMessage = async () => {
    const question = questionInputRef.current.value.trim();
    if (!question || !activeSessionId) return;

    // Añadir mensaje del usuario
    setMessages(prev => [...prev, { role: "user", content: question }]);

    // Actualizar sesión localmente
    const newSessions = { ...sessions };
    const session = newSessions[activeSessionId];
    session.messages.push({ role: "user", content: question });
    setSessions(newSessions);

    typingIndicatorRef.current.style.display = "block";

    try {
      const response = await fetch("/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: question }),
      });

      if (!response.ok || !response.body) throw new Error("No response stream");

      const reader = response.body.getReader();
      const decoder = new TextDecoder("utf-8");
      let buffer = "";
      let aiContent = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });

        const lines = buffer.split("\n").filter(line => line.trim() !== "");
        for (const line of lines) {
          if (line.startsWith("data:")) {
            const json = line.replace("data:", "").trim();
            const data = JSON.parse(json);

            if (data.type === "content") {
              aiContent += data.content;
              // Actualizar mensaje AI mientras llega contenido
              setMessages(prev => {
                // Remover último mensaje AI si existe para actualizarlo
                const prevFiltered = prev.filter(m => m.role !== "ai");
                return [...prevFiltered, { role: "ai", content: aiContent }];
              });
            } else if (data.type === "done") {
              typingIndicatorRef.current.style.display = "none";

              session.messages.push({ role: "ai", content: aiContent });
              const tokenCount = data.usage?.total_tokens || 0;
              const estimatedCost = tokenCount * 0.000002;
              session.tokens += tokenCount;
              session.cost += estimatedCost;
              updateUsageDisplay(session);
            }
          }
        }

        if (buffer.endsWith("\n")) buffer = "";
      }
    } catch (err) {
      setMessages(prev => [...prev, { role: "ai", content: "Error de conexión con el servidor." }]);
      typingIndicatorRef.current.style.display = "none";
    }

    questionInputRef.current.value = "";
  };

  const updateUsageDisplay = (session) => {
    usageInfoRef.current.textContent = `Tokens: ${session.tokens} | Cost: $${session.cost.toFixed(4)}`;
  };

  return (
    <div className="app-wrapper">
      <aside className="sidebar">
        <div className="session-header">
          <h2>Sessions</h2>
          <button onClick={() => createSession()}>＋</button>
        </div>
        <ul className="session-list">
          {Object.entries(sessions).map(([id, session]) => (
            <li
              key={id}
              className={id === activeSessionId ? "active" : ""}
              onClick={() => {
                setActiveSessionId(id);
                setMessages(sessions[id].messages);
                updateUsageDisplay(sessions[id]);
              }}
            >
              {session.name}
            </li>
          ))}
        </ul>
      </aside>

      <main className="main-chat">
        <header className="app-header">
          <h1>PDF Reader AI</h1>
          <p id="activeSessionName">
            Active: {sessions[activeSessionId]?.name || "None"}
          </p>
          <p className="usage-info" ref={usageInfoRef}>
            Tokens: 0 | Cost: $0.0000
          </p>
        </header>

        <section className="chat-box">
          {messages.map((msg, idx) => (
            <div key={idx} className={`message ${msg.role}`}>
              {msg.content}
            </div>
          ))}
        </section>

        <section className="chat-input-section">
          <textarea
            ref={questionInputRef}
            placeholder="Type your question..."
          />
          <div className="chat-buttons">
            <button className="btn btn-ask" onClick={sendMessage}>Ask</button>
            <button className="btn btn-clear"
              onClick={() => {
                // Limpiar mensajes de la sesión activa
                const updated = { ...sessions };
                if (updated[activeSessionId]) {
                  updated[activeSessionId].messages = [];
                  updated[activeSessionId].tokens = 0;
                  updated[activeSessionId].cost = 0;
                }
                setSessions(updated);
                setMessages([]);
                questionInputRef.current.value = "";
                usageInfoRef.current.textContent = "Tokens: 0 | Cost: $0.0000";
              }}
            >
              Clear
            </button>
            <select id="exportFormat">
              <option value="txt">.txt</option>
              <option value="md">.md</option>
            </select>
            <button className="btn btn-export" id="exportBtn">Export Chat</button>
          </div>
          <p
            ref={typingIndicatorRef}
            className="typing-indicator"
            style={{ display: "none" }}
          >
            AI is typing...
          </p>
        </section>
      </main>
    </div>
  );
}
