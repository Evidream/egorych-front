const chat = document.getElementById("chat");
const textInput = document.getElementById("textInput");
const sendBtn = document.getElementById("sendBtn");
const fileInput = document.getElementById("fileInput");
const cameraPreview = document.getElementById("cameraPreview");
const video = document.getElementById("video");

let selectedFile = null;
let mediaStream = null;
let lastBotReply = "";
let isSending = false;

// Добавляем по Enter
textInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") {
    e.preventDefault();
    send();
  }
});

fileInput.addEventListener("change", () => {
  selectedFile = fileInput.files[0];
  if (selectedFile) {
    appendMessage(`📎 Готов к отправке: ${selectedFile.name}`, "user");
  }
});

function appendMessage(text, sender) {
  const bubble = document.createElement("div");
  bubble.className = sender === "bot" ? "bubble-bot" : "bubble-user";
  bubble.textContent = text;

  // Для бота добавляем кнопку прослушать
  if (sender === "bot") {
    const listenBtn = document.createElement("img");
    listenBtn.src = "assets/listen-button.svg";
    listenBtn.alt = "Слушать";
    listenBtn.className = "listen-button";
    listenBtn.onclick = speakLast;
    bubble.appendChild(listenBtn);

    lastBotReply = text; // сохраняем только для бота
  }

  chat.appendChild(bubble);
  chat.scrollTop = chat.scrollHeight;
}

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
    appendMessage("📸 Сделан снимок", "user");
    closeCamera();
  }, "image/jpeg", 0.95);
}

async function send() {
  if (isSending) return;
  isSending = true;

  const text = textInput.value.trim();

  // Если есть текст
  if (text) {
    appendMessage(text, "user");
    textInput.value = "";

    try {
      const res = await fetch("https://egorych-backend-production.up.railway.app/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text })
      });
      const data = await res.json();
      appendMessage(data.reply || "🤖 Егорыч молчит...", "bot");
    } catch (err) {
      appendMessage("❌ Ошибка ответа от Егорыча", "bot");
    }
  }

  // Если есть файл
  if (selectedFile) {
    appendMessage(`📤 Отправка файла: ${selectedFile.name}`, "user");

    const formData = new FormData();
    formData.append("file", selectedFile);

    try {
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
        appendMessage(visionData.reply || "🤖 Егорыч посмотрел, но ничего не понял.", "bot");
      } else {
        appendMessage("❌ Ошибка загрузки файла", "bot");
      }
    } catch (err) {
      appendMessage("❌ Ошибка при загрузке", "bot");
    }

    selectedFile = null;
    fileInput.value = "";
  }

  isSending = false;
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
    appendMessage("❌ Ошибка озвучки", "bot");
  }
}

// Кнопка отправки
sendBtn.addEventListener("click", send);
