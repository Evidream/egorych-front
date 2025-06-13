// === script.js ===

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

function appendMessage(text, sender) {
  const wrapper = document.createElement("div");
  wrapper.className = `message-wrapper ${sender}`;

  const bubble = document.createElement("div");
  bubble.className = `message ${sender === "bot" ? "bubble-bot" : "bubble-user"}`;
  bubble.textContent = text;
  wrapper.appendChild(bubble);

  if (sender === "bot") {
    const speakButton = document.createElement("button");
    speakButton.className = "voice-button";
    speakButton.onclick = speakLast;

    const img = document.createElement("img");
    img.src = "assets/listen-button.svg";
    img.alt = "Озвучить";
    speakButton.appendChild(img);

    wrapper.appendChild(speakButton);
  }

  chat.appendChild(wrapper);
  chat.scrollTop = chat.scrollHeight;
}

fileInput.addEventListener("change", () => {
  selectedFile = fileInput.files[0];
  if (selectedFile) {
    appendMessage(`\ud83d\udccE Готов к отправке: ${selectedFile.name}`, "user");
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
      appendMessage("\ud83d\udeab Нет доступа к камере", "bot");
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
    appendMessage("\ud83d\udcf8 Сделан снимок", "user");
    closeCamera();
  }, "image/jpeg", 0.95);
}

async function send() {
  if (isSending) return;
  isSending = true;

  const text = textInput.value.trim();

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
      lastBotReply = data.reply?.trim() || "\ud83e\udd16 Егорыч молчит...";
      appendMessage(lastBotReply, "bot");
    } catch (err) {
      appendMessage("\u274c Ошибка ответа от Егорыча", "bot");
    }
  }

  if (selectedFile) {
    appendMessage(`\ud83d\udce4 Отправка файла: ${selectedFile.name}`, "user");

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
        lastBotReply = visionData.reply?.trim() || "\ud83e\udd16 Егорыч посмотрел, но ничего не понял.";
        appendMessage(lastBotReply, "bot");
      } else {
        appendMessage("\u274c Ошибка загрузки файла", "bot");
      }

    } catch (err) {
      appendMessage("\u274c Ошибка при загрузке", "bot");
    }

    selectedFile = null;
    fileInput.value = "";
  }

  isSending = false;
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
    appendMessage("\u274c Ошибка озвучки", "bot");
  }
}
