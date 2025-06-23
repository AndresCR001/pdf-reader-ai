const chatBox = document.getElementById("chatBox");
const questionInput = document.getElementById("questionInput");
const askBtn = document.getElementById("askBtn");
const resetBtn = document.getElementById("resetBtn");
const typingIndicator = document.getElementById("typingIndicator");
const sessionList = document.getElementById("sessionList");
const newSessionBtn = document.getElementById("newSessionBtn");
const activeSessionName = document.getElementById("activeSessionName");

let sessions = {};
let activeSessionId = null;

// Crear nueva sesión
function createSession(name = `Chat ${Object.keys(sessions).length + 1}`) {
  const id = crypto.randomUUID();
  sessions[id] = { name, messages: [], tokens: 0, cost: 0};
  activeSessionId = id;
  updateSessionList();
  loadSessionMessages();
  updateSessionName();
}

// Actualizar lista visual de sesiones
function updateSessionList() {
  sessionList.innerHTML = '';
  for (const [id, session] of Object.entries(sessions)) {
    const li = document.createElement('li');
    li.textContent = session.name;
    li.className = id === activeSessionId ? 'active' : '';
    li.onclick = () => {
      activeSessionId = id;
      updateSessionList();
      loadSessionMessages();
      updateSessionName();
    };
    sessionList.appendChild(li);
  }
}

function updateSessionName() {
  const session = sessions[activeSessionId];
  activeSessionName.textContent = session ? `Active: ${session.name}` : 'Active: None';
  updateUsageInfo();
}

function updateUsageInfo() {
  const session = sessions[activeSessionId];
  const usageInfo = document.getElementById('usageInfo');
  if (session) {
    usageInfo.textContent = `Tokens: ${session.tokens} | Cost: $${session.cost.toFixed(4)}`;
  } else {
    usageInfo.textContent = `Tokens: 0 | Cost: $0.0000`;
  }
}

function exportConversation(format = "txt") {
  if (!activeSessionId || !sessions[activeSessionId]) return;

  const messages = sessions[activeSessionId].messages;
  if (!messages || messages.length === 0) return;

  let content = "";

  if (format === "md") {
    content += `# Chat Session: ${sessions[activeSessionId].name}\n\n`;
    messages.forEach((msg) => {
      if (msg.role === "user") {
        content += `**You:** ${msg.content}\n\n`;
      } else if (msg.role === "ai") {
        content += `**AI:** ${msg.content}\n\n`;
      }
    });
  } else {
    content += `Chat Session: ${sessions[activeSessionId].name}\n\n`;
    messages.forEach((msg) => {
      const label = msg.role === "user" ? "You" : "AI";
      content += `${label}: ${msg.content}\n\n`;
    });
  }

  const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
  const link = document.createElement("a");
  const filename = `${sessions[activeSessionId].name.replace(/\s+/g, "_")}.${format}`;

  link.href = URL.createObjectURL(blob);
  link.download = filename;
  link.click();
}


// Cargar mensajes de la sesión activa
function loadSessionMessages() {
  chatBox.innerHTML = '';
  const messages = sessions[activeSessionId]?.messages || [];
  messages.forEach(({ role, content }) => {
    const msg = document.createElement('div');
    msg.className = `message ${role}`;
    msg.textContent = content;
    chatBox.appendChild(msg);
  });
}

// Enviar mensaje y obtener respuesta
async function sendMessageToSession(question) {
  if (!activeSessionId) return;

  // Mostrar mensaje del usuario
  sessions[activeSessionId].messages.push({ role: 'user', content: question });
  const userMsg = document.createElement('div');
  userMsg.className = 'message user';
  userMsg.textContent = question;
  chatBox.appendChild(userMsg);

  // Mostrar mensaje en blanco para la respuesta
  const aiMsg = document.createElement('div');
  aiMsg.className = 'message ai';
  chatBox.appendChild(aiMsg);

  typingIndicator.style.display = "block";

  try {
    const response = await fetch("http://localhost:8000/chat", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ message: question })
    });

    if (response.status === 429) {
        errorMsg.style.display = "block";
        errorMsg.textContent = "You are sending messages too quickly. Please wait.";
        typingIndicator.style.display = "none";
        return;
    }


    if (!response.ok || !response.body) {
      throw new Error("No response stream");
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder("utf-8");
    let buffer = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      const lines = buffer.split("\n").filter(line => line.trim() !== "");
      for (const line of lines) {
        if (line.startsWith("data:")) {
          const json = line.replace("data:", "").trim();
          try {
            const data = JSON.parse(json);
            if (data.type === "content") {
              aiMsg.textContent += data.content;
            } else if (data.type === "done") {
              typingIndicator.style.display = "none";
              sessions[activeSessionId].messages.push({ role: 'ai', content: aiMsg.textContent });
            
              //Token & cost tracking 
              const tokenCount = data.usage?.total_tokens || 0;
              const estimatedCost = tokenCount * 0.000002;

              sessions[activeSessionId].tokens += tokenCount;
              sessions[activeSessionId].cost += estimatedCost;

              updateUsageInfo();
            }
          } catch (e) {
            console.warn("Error parsing SSE JSON", json, e);
          }
        }
      }
      if (buffer.endsWith("\n")) buffer = "";
    }
  } catch (err) {
    console.error(err);
    aiMsg.innerHTML += "<em>Connection error with the server.</em>";
    typingIndicator.style.display = "none";
  }
}

// Eventos
askBtn.addEventListener("click", () => {
  const question = questionInput.value.trim();
  if (!question || !activeSessionId) return;
  questionInput.value = "";
  sendMessageToSession(question);
});

resetBtn.addEventListener("click", () => {
  if (!activeSessionId) return;
  sessions[activeSessionId].messages = [];
  loadSessionMessages();
  questionInput.value = "";
});

newSessionBtn.addEventListener("click", () => {
  createSession();
});

document.getElementById("exportBtn").onclick = () => {
  const format = document.getElementById("exportFormat").value;
  exportConversation(format);
};

// Crear sesión inicial al cargar
window.onload = () => {
  createSession("Default");
};
