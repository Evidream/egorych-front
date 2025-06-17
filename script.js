const chat = document.getElementById("chat");
const chatWrapper = document.getElementById("chat-wrapper");
const textInput = document.getElementById("textInput");
const sendBtn = document.getElementById("sendBtn");
const clipBtn = document.querySelector(".icon-clip");
const cameraBtn = document.querySelector(".icon-camera");

let selectedFile = null;
let mediaStream = null;
let lastBotReply = "";
let isSending = false;

const BACKEND_URL = "https://egorych-backend-production.up.railway.app";

// === Приветственный бабл ===
window.addEventListener("DOMContentLoaded", () => {
  appendMessage("Привет, роднуля! 👋 Как дела? Напиши что-нибудь!", "bot");
});

textInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") {
    e.preventDefault();
    send();
  }
});

clipBtn.addEventListener("click", () => {
  const fileInput = document.createElement("input");
  fileInput.type = "file";
  fileInput.style.display = "none";
  document.body.appendChild(fileInput);

  fileInput.addEventListener("change", () => {
    selectedFile = fileInput.files[0];
    appendMessage(`📎 Готов к отправке: ${selectedFile.name}`, "user");
    document.body.removeChild(fileInput);
  });

  fileInput.click();
});

cameraBtn.addEventListener("click", openCamera);

function openCamera() {
  navigator.mediaDevices.getUserMedia({ video: true })
    .then(stream => {
      mediaStream = stream;
      const video = document.getElementById("video");
      video.srcObject = stream;
      document.getElementById("cameraPreview").style.display = "block";
    })
    .catch(() => {
      appendMessage("🚫 Нет доступа к камере", "bot");
    });
}

function takePhoto() {
  const video = document.getElementById("video");
  const canvas = document.createElement("canvas");
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  canvas.getContext("2d").drawImage(video, 0, 0);
  canvas.toBlob(blob => {
    selectedFile = new File([blob], "photo.jpg", { type: "image/jpeg" });
    appendMessage("📸 Снимок готов", "user");
    closeCamera();
  }, "image/jpeg");
}

function closeCamera() {
  if (mediaStream) {
    mediaStream.getTracks().forEach(track => track.stop());
    mediaStream = null;
  }
  document.getElementById("cameraPreview").style.display = "none";
}

// === Добавление баблов ===
function appendMessage(text, sender) {
  const wrapper = document.createElement("div");
  wrapper.className = sender === "bot" ? "bubble-wrapper" : "user-wrapper";

  if (sender === "bot") {
    const circle = document.createElement("div");
    circle.className = "bot-circle";

    const bubble = document.createElement("div");
    bubble.className = "bubble-bot";
    bubble.textContent = ""; // сначала пустой

    const listenBtn = document.createElement("img");
    listenBtn.src = "assets/listen-button.svg";
    listenBtn.alt = "Слушать";
    listenBtn.className = "listen-button";
    listenBtn.onclick = () => speak(text);

    // сначала кружок
    wrapper.appendChild(circle);
    chat.appendChild(wrapper);

    // плавное появление кружка
    setTimeout(() => {
      wrapper.classList.add("show");
    }, 50);

    // потом вставляем бабл и кнопку — уже со стилем показа!
    setTimeout(() => {
      wrapper.appendChild(bubble);
      wrapper.appendChild(listenBtn);

      // важный момент — бабл появится, а текст внутри будет печататься
      typeText(bubble, text);

    }, 350); // 350мс подождали кружок

    lastBotReply = text;

  } else {
    // === для юзера ===
    const circle = document.createElement("div");
    circle.className = "user-circle";

    const bubble = document.createElement("div");
    bubble.className = "bubble-user";
    bubble.textContent = text;

    wrapper.appendChild(circle);
    chat.appendChild(wrapper);

    setTimeout(() => {
      wrapper.classList.add("show");
    }, 50);

    setTimeout(() => {
      wrapper.appendChild(bubble);
    }, 350);
  }

  chatWrapper.scrollTop = chatWrapper.scrollHeight;
}

// === Печать по буквам ===
function typeText(element, text, i = 0) {
  if (i < text.length) {
    element.textContent += text.charAt(i);
    chatWrapper.scrollTop = chatWrapper.scrollHeight;
    setTimeout(() => typeText(element, text, i + 1), 20);
  }
}

async function send() {
  if (isSending) return;
  isSending = true;

  const text = textInput.value.trim();
  if (text) {
    appendMessage(text, "user");
    textInput.value = "";

    try {
      const res = await fetch(`${BACKEND_URL}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text })
      });
      const data = await res.json();
      appendMessage(data.reply || "🤖 Егорыч молчит...", "bot");
    } catch {
      appendMessage("❌ Ошибка ответа", "bot");
    }
  }

  if (selectedFile) {
    appendMessage(`📤 Отправка файла: ${selectedFile.name}`, "user");

    const formData = new FormData();
    formData.append("file", selectedFile);

    try {
      const res = await fetch(`${BACKEND_URL}/upload`, {
        method: "POST",
        body: formData
      });
      const data = await res.json();

      if (data.base64) {
        const visionRes = await fetch(`${BACKEND_URL}/vision`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ base64: data.base64 })
        });
        const visionData = await visionRes.json();
        appendMessage(visionData.reply || "🤖 Егорыч посмотрел, но ничего не понял.", "bot");
      } else {
        appendMessage("❌ Ошибка загрузки файла", "bot");
      }
    } catch {
      appendMessage("❌ Ошибка при загрузке", "bot");
    }

    selectedFile = null;
  }

  isSending = false;
}

sendBtn.addEventListener("click", send);

async function speak(text) {
  try {
    const res = await fetch(`${BACKEND_URL}/speak`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text })
    });
    const audioData = await res.arrayBuffer();
    const audio = new Audio(URL.createObjectURL(new Blob([audioData], { type: "audio/mpeg" })));
    audio.volume = 1.0; // ✅ ГРОМКОСТЬ максимум
    audio.play();
  } catch {
    appendMessage("❌ Ошибка озвучки", "bot");
  }
}
