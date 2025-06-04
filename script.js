const chat = document.getElementById("chat");

function appendMessage(text, sender) {
  const bubble = document.createElement("div");
  bubble.className = `bubble ${sender}`;
  bubble.textContent = text;
  chat.appendChild(bubble);
  chat.scrollTop = chat.scrollHeight;
}

async function sendMessage() {
  const input = document.getElementById("userInput");
  const message = input.value.trim();
  if (!message) return;

  appendMessage(message, "user");
  input.value = "";

  const response = await fetch("https://www.chatbase.co/api/v1/chat", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": "Bearer ТВОЙ_CHATBASE_API_KEY"
    },
    body: JSON.stringify({
      messages: [{ role: "user", content: message }],
      chatbotId: "ТВОЙ_CHATBASE_CHATBOT_ID"
    })
  });

  const data = await response.json();
  const reply = data.messages?.[0]?.content || "Егорыч молчит...";
  appendMessage(reply, "bot");
}

async function speakLast() {
  const botMessages = document.querySelectorAll(".bot");
  if (!botMessages.length) return;
  const lastMessage = botMessages[botMessages.length - 1].textContent;

  const response = await fetch("https://nodejs-production-78841.up.railway.app/speak", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text: lastMessage })
  });

  const blob = await response.blob();
  const audioURL = URL.createObjectURL(blob);
  const audio = new Audio(audioURL);
  audio.play();
}
