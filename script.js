const chat = document.getElementById("chat");
const input = document.getElementById("textInput");
const fileInput = document.getElementById("fileInput");
const cameraPreview = document.getElementById("cameraPreview");
const video = document.getElementById("video");

let selectedFile = null;
let lastBotReply = "";
let mediaStream = null;

function appendMessage(text, sender) {
  const bubble = document.createElement("div");
  bubble.className = `message ${sender}`;
  bubble.textContent = text;
  chat.appendChild(bubble);
  chat.scrollTop = chat.scrollHeight;
}

fileInput.addEventListener("change", () => {
  selectedFile = fileInput.files[0];
  if (selectedFile) {
    appendMessage(`📎 Готов к отправке: ${selectedFile.name}`, "user");
  }
});

function openCamera() {
  navigator.mediaDevices.getUserMedia({ video: true })
    .then(stream => {
      mediaStream = stream;
      video.srcObject = stream;
      cameraPreview.style.display = "block";
    })
    .catch(err => {
      appendMessage("🚫 Нет доступа к камере", "bot");
      console.error("Ошибка камеры:", err);
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
    appendMessage("📸 Сделан снимок", "user");
    closeCamera();
  }, "image/jpeg", 0.95);
}

async function sendText() {
  const text = input.value.trim();
  if (!text) return;

  appendMessage(text, "user");
  input.value = "";

  try {
    const res = await fetch("https://egorych-backend-production.up.railway.app/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text })
    });

    const data = await res.json();
    lastBotReply = data.reply || "🤖 Егорыч молчит...";
    appendMessage(lastBotReply, "bot");
  } catch (err) {
    console.error("Ошибка чата:", err);
    appendMessage("❌ Ошибка ответа от Егорыча", "bot");
  }
}

async function sendFile() {
  if (!selectedFile) return;

  const formData = new FormData();
  formData.append("file", selectedFile);
  appendMessage(`📤 Отправка файла: ${selectedFile.name}`, "user");

  try {
    const res = await fetch("https://egorych-backend-production.up.railway.app/upload", {
      method: "POST",
      body: formData
    });

    const data = await res.json();
    if (data.filename) {
      appendMessage(`✅ Файл загружен: ${data.filename}`, "bot");
    } else {
      appendMessage("❌ Ошибка загрузки файла", "bot");
    }
  } catch (err) {
    console.error("Ошибка загрузки:", err);
    appendMessage("❌ Ошибка при загрузке", "bot");
  }

  selectedFile = null;
  fileInput.value = "";
}

async function send() {
  await sendText();
  if (selectedFile) await sendFile();
}

async function speakLast() {
  if (!lastBotReply) return;

  try {
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
  } catch (err) {
    console.error("Ошибка озвучки:", err);
  }
}
