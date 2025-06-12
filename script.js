const chat = document.getElementById("chat");
const textInput = document.getElementById("textInput");
const fileInput = document.getElementById("fileInput");
const preview = document.getElementById("preview");
const video = document.getElementById("video");
const cameraPreview = document.getElementById("cameraPreview");

let selectedFile = null;
let lastBotReply = "";
let mediaStream = null;

function appendMessage(text, sender = "bot") {
  const message = document.createElement("div");
  message.className = `message ${sender}`;
  message.textContent = text;
  chat.appendChild(message);
  chat.scrollTop = chat.scrollHeight;
}

fileInput.addEventListener("change", () => {
  selectedFile = fileInput.files[0];
  if (selectedFile) {
    appendMessage(`📎 Готов к отправке: ${selectedFile.name}`, "user");
    showPreview(selectedFile);
  }
});

function showPreview(file) {
  preview.innerHTML = "";
  if (!file || !file.type.startsWith("image/")) return;
  const img = document.createElement("img");
  img.src = URL.createObjectURL(file);
  img.style.maxWidth = "100px";
  img.style.borderRadius = "8px";
  preview.appendChild(img);
}

function openCamera() {
  navigator.mediaDevices.getUserMedia({ video: true })
    .then(stream => {
      mediaStream = stream;
      video.srcObject = stream;
      cameraPreview.style.display = "block";
    })
    .catch(err => {
      appendMessage("🚫 Нет доступа к камере", "bot");
      console.error("Камера:", err);
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
    showPreview(selectedFile);
    closeCamera();
  }, "image/jpeg", 0.95);
}

async function sendText() {
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
      lastBotReply = data.reply;
      appendMessage(lastBotReply, "bot");
    } catch (err) {
      appendMessage("❌ Ошибка ответа от Егорыча", "bot");
      console.error(err);
    }
    textInput.value = "";
  }

  if (selectedFile) {
    const formData = new FormData();
    formData.append("file", selectedFile);
    appendMessage(`📤 Отправка файла: ${selectedFile.name}`, "user");

    try {
      const uploadRes = await fetch("https://egorych-backend-production.up.railway.app/upload", {
        method: "POST",
        body: formData
      });
      const uploadData = await uploadRes.json();
      if (uploadData.filename) {
        appendMessage(`✅ Файл загружен: ${uploadData.filename}`, "bot");

        // если это изображение — запустить Vision
        if (selectedFile.type.startsWith("image/")) {
          const reader = new FileReader();
          reader.onload = async function () {
            const base64 = reader.result.split(",")[1];
            try {
              const visionRes = await fetch("https://egorych-backend-production.up.railway.app/vision", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ base64 })
              });
              const visionData = await visionRes.json();
              appendMessage(visionData.reply || "🤖 Егорыч посмотрел, но ничего не понял", "bot");
            } catch {
              appendMessage("❌ Егорыч не смог посмотреть фото", "bot");
            }
          };
          reader.readAsDataURL(selectedFile);
        }
      } else {
        appendMessage("❌ Ошибка загрузки файла", "bot");
      }
    } catch (err) {
      appendMessage("❌ Ошибка при загрузке", "bot");
      console.error(err);
    }

    selectedFile = null;
    fileInput.value = "";
    preview.innerHTML = "";
  }
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
