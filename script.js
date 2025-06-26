const chat = document.getElementById("chat");
const chatWrapper = document.getElementById("chat-wrapper");
const textInput = document.querySelector(".input-container input");
const sendBtn = document.querySelector(".send-button");
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

cameraBtn.addEventListener("click", () => {
  navigator.mediaDevices.getUserMedia({ video: true })
    .then(stream => {
      mediaStream = stream;
      const video = document.createElement("video");
      video.srcObject = stream;
      video.autoplay = true;
      video.playsInline = true;
      document.body.appendChild(video);

      const snapBtn = document.createElement("button");
      snapBtn.innerText = "📸";
      document.body.appendChild(snapBtn);

      snapBtn.addEventListener("click", () => {
        const canvas = document.createElement("canvas");
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        canvas.getContext("2d").drawImage(video, 0, 0);
        canvas.toBlob(blob => {
          selectedFile = new File([blob], "photo.jpg", { type: "image/jpeg" });
          appendMessage("📸 Снимок готов", "user");
          stopCamera(video, snapBtn);
        }, "image/jpeg");
      });
    })
    .catch(() => {
      appendMessage("🚫 Нет доступа к камере", "bot");
    });
});

function stopCamera(video, snapBtn) {
  if (mediaStream) {
    mediaStream.getTracks().forEach(track => track.stop());
    mediaStream = null;
  }
  video.remove();
  snapBtn.remove();
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

    // === Хитрый фикс ширины перед печатью ===
    const measure = document.createElement("span");
    measure.style.visibility = "hidden";
    measure.style.position = "absolute";
    measure.style.whiteSpace = "pre-wrap";
    measure.style.fontSize = window.getComputedStyle(bubble).fontSize;
    measure.style.fontWeight = window.getComputedStyle(bubble).fontWeight;
    measure.style.maxWidth = "767px";
    measure.textContent = text;
    document.body.appendChild(measure);

    const measuredWidth = Math.min(measure.offsetWidth + 40, 767); // padding approx
    bubble.style.width = measuredWidth + "px";

    document.body.removeChild(measure);

    bubble.textContent = "";

    const listenBtn = document.createElement("img");
    listenBtn.src = "assets/listen-button.svg";
    listenBtn.alt = "Слушать";
    listenBtn.className = "listen-button";
    listenBtn.onclick = () => speak(text);

    wrapper.appendChild(circle);
    wrapper.appendChild(bubble);
    wrapper.appendChild(listenBtn);

    chat.appendChild(wrapper);

    // Плавное появление
    setTimeout(() => {
      wrapper.classList.add("show");
    }, 50);

    // Печатать по буквам
    typeText(bubble, text);
    lastBotReply = text;

  } else {
    const bubble = document.createElement("div");
    bubble.className = "bubble-user";
    bubble.textContent = text;

    const circle = document.createElement("div");
    circle.className = "user-circle";

    wrapper.appendChild(bubble);
    wrapper.appendChild(circle);

    chat.appendChild(wrapper);
    setTimeout(() => {
      wrapper.classList.add("show");
    }, 50);
  }

  // ✅ Прокрутка вниз — враппер
  chatWrapper.scrollTop = chatWrapper.scrollHeight;
}

// === Печать по буквам ===
function typeText(element, text, i = 0) {
  if (i < text.length) {
    element.textContent += text.charAt(i);
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
    audio.play();
  } catch {
    appendMessage("❌ Ошибка озвучки", "bot");
  }
}
