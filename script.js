const chat = document.getElementById("chat");
const textInput = document.querySelector(".input-container input");
const sendBtn = document.querySelector(".send-button");
const clipBtn = document.querySelector(".icon-clip");
const cameraBtn = document.querySelector(".icon-camera");

let selectedFile = null;
let lastBotReply = "";
let isSending = false;

textInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") {
    e.preventDefault();
    send();
  }
});

function appendMessage(text, sender) {
  const wrapper = document.createElement("div");
  wrapper.className = sender === "bot" ? "bubble-wrapper" : "user-wrapper";

  if (sender === "bot") {
    const circle = document.createElement("div");
    circle.className = "bot-circle";

    const bubble = document.createElement("div");
    bubble.className = "bubble-bot";
    bubble.textContent = text;

    const listenBtn = document.createElement("img");
    listenBtn.src = "assets/listen-button.svg";
    listenBtn.alt = "Слушать";
    listenBtn.className = "listen-button";
    listenBtn.onclick = () => speakThis(text);

    wrapper.appendChild(circle);
    wrapper.appendChild(bubble);
    wrapper.appendChild(listenBtn);

    lastBotReply = text;
  } else {
    const bubble = document.createElement("div");
    bubble.className = "bubble-user";
    bubble.textContent = text;

    const circle = document.createElement("div");
    circle.className = "user-circle";

    wrapper.appendChild(bubble);
    wrapper.appendChild(circle);
  }

  chat.appendChild(wrapper);
  chat.scrollTop = chat.scrollHeight;
}

async function send() {
  if (isSending) return;
  isSending = true;

  const text = textInput.value.trim();
  if (text) {
    appendMessage(text, "user");
    textInput.value = "";

    const res = await fetch("/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
    });
    const data = await res.json();
    appendMessage(data.reply || "🤖 Егорыч молчит...", "bot");
  }

  isSending = false;
}

async function speakThis(text) {
  if (!text) return;
  const res = await fetch("/speak", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text }),
  });
  const audioData = await res.arrayBuffer();
  const audio = new Audio(URL.createObjectURL(new Blob([audioData], { type: "audio/mpeg" })));
  audio.play();
}

sendBtn.addEventListener("click", send);
