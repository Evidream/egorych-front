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
  const text = textInput.value.trim();
  if (!text && !selectedFile) return;

  if (text) {
    appendMessage(text, "user");
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
      appendMessage("❌ Ошибка ответа от Егорыча", "bot");
    }
    textInput.value = "";
  }

  if (selectedFile) {
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
        const visionRes = await fetch("https://egorych-backend-production.up.railway.app/vision", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ base64: await toBase64(selectedFile) })
        });
        const visionData = await visionRes.json();
        if (visionData.reply) {
          appendMessage(visionData.reply, "bot");
        } else {
          appendMessage("🤖 Егорыч посмотрел, но ничего не понял.", "bot");
        }
      } else {
        appendMessage("❌ Ошибка загрузки файла", "bot");
      }
    } catch (err) {
      appendMessage("❌ Ошибка при загрузке", "bot");
    }

    selectedFile = null;
    fileInput.value = "";
  }
}

sendBtn.addEventListener("click", send);

async function toBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result.split(",")[1]);
    reader.onerror = error => reject(error);
  });
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
