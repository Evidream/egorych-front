const chat = document.getElementById("chat");
const textInput = document.getElementById("textInput");
const sendBtn = document.getElementById("sendBtn");
const fileInput = document.getElementById("fileInput");
const cameraPreview = document.getElementById("cameraPreview");
const video = document.getElementById("video");

let selectedFile = null;
let mediaStream = null;
let lastBotReply = "";

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
    listenBtn.className = "listen-button";
    listenBtn.onclick = speakLast;

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

fileInput.addEventListener("change", () => {
  selectedFile = fileInput.files[0];
  if (selectedFile) {
    appendMessage(`📎 ${selectedFile.name} готово`, "user");
  }
});

function openCamera() {
  navigator.mediaDevices.getUserMedia({ video: true })
    .then(stream => {
      mediaStream = stream;
      video.srcObject = stream;
      cameraPreview.style.display = "block";
    })
    .catch(() => {
      appendMessage("🚫 Нет доступа к камере", "bot");
    });
}

function closeCamera() {
  if (mediaStream) {
    mediaStream.getTracks().forEach(track => track.stop());
    mediaStream = null;
  }
  cameraPreview.style.display = "none";
}

function takePhoto() {
  const canvas = document.createElement("canvas");
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  const ctx = canvas.getContext("2d");
  ctx.drawImage(video, 0, 0);
  canvas.toBlob(blob => {
    selectedFile = new File([blob], "camera-photo.jpg", { type: "image/jpeg" });
    appendMessage("📸 Снимок сделан", "user");
    closeCamera();
  }, "image/jpeg", 0.95);
}

async function send() {
  const text = textInput.value.trim();
  if (!text && !selectedFile) return;

  if (text) {
    appendMessage(text, "user");
    textInput.value = "";

    const res = await fetch("https://egorych-backend-production.up.railway.app/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text })
    });
    const data = await res.json();
    appendMessage(data.reply || "🤖 Егорыч молчит...", "bot");
  }

  if (selectedFile) {
    const formData = new FormData();
    formData.append("file", selectedFile);

    const res = await fetch("https://egorych-backend-production.up.railway.app/upload", {
      method: "POST",
      body: formData
    });
    const data = await res.json();
    if (data.base64) {
      const visionRes = await fetch("https://egorych-backend-production.up.railway.app/vision", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ base64: data.base64 })
      });
      const visionData = await visionRes.json();
      appendMessage(visionData.reply || "🤖 Егорыч посмотрел, но не понял.", "bot");
    }
    selectedFile = null;
    fileInput.value = "";
  }
}

textInput.addEventListener("keydown", e => {
  if (e.key === "Enter") send();
});

async function speakLast() {
  if (!lastBotReply) return;
  const res = await fetch("https://egorych-backend-production.up.railway.app/speak", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message: lastBotReply })
  });
  const audioData = await res.arrayBuffer();
  const blob = new Blob([audioData], { type: "audio/mpeg" });
  const url = URL.createObjectURL(blob);
  const audio = new Audio(url);
  audio.play();
}
