const chat = document.getElementById("chat");
const input = document.getElementById("userInput");
const fileInput = document.getElementById("fileInput");
const preview = document.getElementById("preview");
const cameraPreview = document.getElementById("cameraPreview");
const video = document.getElementById("video");

let selectedFile = null;
let mediaStream = null;

function appendMessage(text, sender) {
  const bubble = document.createElement("div");
  bubble.className = `bubble ${sender}`;
  bubble.textContent = text;
  chat.appendChild(bubble);
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
    showPreview(selectedFile);
    closeCamera();
  }, "image/jpeg", 0.95);
}

async function sendMessage() {
  const message = input.value.trim();
  if (!message && !selectedFile) return;

  if (message) {
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
        chatbotId: "5JFv8PIdG3zeZb0RvFsTr"
      })
    });

    const data = await response.json();
    const reply = data.messages?.[0]?.content || "Егорыч молчит...";
    appendMessage(reply, "bot");
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
      } else {
        appendMessage("❌ Ошибка загрузки файла", "bot");
      }
    } catch (err) {
      appendMessage("❌ Ошибка при загрузке", "bot");
      console.error("Upload error:", err);
    }

    // Сброс
    selectedFile = null;
    fileInput.value = "";
    preview.innerHTML = "";
  }
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
