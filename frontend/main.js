const chatBox = document.getElementById("chatBox");
const questionInput = document.getElementById("questionInput");
const askBtn = document.getElementById("askBtn");
const resetBtn = document.getElementById("resetBtn");
const typingIndicator = document.getElementById("typingIndicator");

resetBtn.addEventListener("click", () => {
  chatBox.innerHTML = "";
  questionInput.value = "";
});

askBtn.addEventListener("click", async () => {
  const question = questionInput.value.trim();
  if (!question) return;

  const userMsg = document.createElement("p");
  userMsg.innerHTML = `<strong>You:</strong> ${question}`;
  chatBox.appendChild(userMsg);

  const aiMsg = document.createElement("p");
  aiMsg.innerHTML = `<strong>AI:</strong> `;
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

      // Por si llegan varias líneas de golpe
      const lines = buffer.split("\n").filter(line => line.trim() !== "");

      for (const line of lines) {
        if (line.startsWith("data:")) {
          const json = line.replace("data:", "").trim();

          try {
            const data = JSON.parse(json);
            if (data.type === "content") {
              aiMsg.innerHTML += data.content;
            } else if (data.type === "done") {
              typingIndicator.style.display = "none";
            }
          } catch (e) {
            console.warn("Error parsing SSE JSON", json, e);
          }
        }
      }

      // limpia buffer si hay \n al final
      if (buffer.endsWith("\n")) {
        buffer = "";
      }
    }
  } catch (err) {
    console.error(err);
    aiMsg.innerHTML += "<em>Connection error with the server.</em>";
  }

  typingIndicator.style.display = "none";
  questionInput.value = "";
});
