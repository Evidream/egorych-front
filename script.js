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
let userEmail = localStorage.getItem("egorych_email") || ""; // 🆕 приоритет localStorage

const BACKEND_URL = "https://egorych-backend-production.up.railway.app";

window.addEventListener("DOMContentLoaded", async () => {
  // 🆕 Парсим email из URL
  const urlParams = new URLSearchParams(window.location.search);
  const emailFromUrl = urlParams.get("email");

  if (emailFromUrl) {
    userEmail = emailFromUrl;
    localStorage.setItem("egorych_email", userEmail);
    console.log("✅ Email из URL:", userEmail);
  }

  // 🧠 Приоритет: window → localStorage
  if (window.egorychEmail) {
    userEmail = window.egorychEmail;
    localStorage.setItem("egorych_email", userEmail);
    console.log("✅ Email из window.egorychEmail:", userEmail);
  } else if (userEmail) {
    console.log("✅ Email из localStorage:", userEmail);
  } else {
    console.warn("⚠️ Email не найден");
    appendMessage("Привет! Напиши что-нибудь ✍️", "bot");
    return;
  }

  try {
    const res = await fetch(`${BACKEND_URL}/user-info?email=${userEmail}`);
    if (!res.ok) throw new Error(`Ошибка запроса: ${res.status}`);

    const data = await res.json();
    console.log("📦 Ответ от /user-info:", data);

    const plan = data?.plan || "unknown";
    console.log("🍺 Тариф пользователя:", plan);

    switch (plan) {
      case "guest":
        appendMessage("Привет, гость! У тебя 20 сообщений.", "bot");
        break;
      case "user":
        appendMessage("Добро пожаловать, базовый план! У тебя 50 сообщений.", "bot");
        break;
      case "beer":
        appendMessage("План ПИВО! Осталось 500 сообщений 🍺", "bot");
        break;
      case "whisky":
        appendMessage("План ВИСКИ! Ты бессмертен, родной 🥃", "bot");
        break;
      default:
        appendMessage("Привет! Напиши что-нибудь ✍️", "bot");
    }
  } catch (error) {
    console.error("❌ Ошибка при получении данных:", error);
    appendMessage("Привет! Напиши что-нибудь ✍️", "bot");
  }
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

function appendMessage(text, sender) {
  const wrapper = document.createElement("div");
  wrapper.className = sender === "bot" ? "bubble-wrapper" : "user-wrapper";

  if (sender === "bot") {
    const circle = document.createElement("div");
    circle.className = "bot-circle";

    const bubble = document.createElement("div");
    bubble.className = "bubble-bot";

    const measure = document.createElement("span");
    measure.style.visibility = "hidden";
    measure.style.position = "absolute";
    measure.style.whiteSpace = "pre-wrap";
    measure.style.fontSize = window.getComputedStyle(bubble).fontSize;
    measure.style.fontWeight = window.getComputedStyle(bubble).fontWeight;
    measure.style.maxWidth = "767px";
    measure.textContent = text;
    document.body.appendChild(measure);

    const measuredWidth = Math.min(measure.offsetWidth + 40, 767);
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
    setTimeout(() => wrapper.classList.add("show"), 50);

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
    setTimeout(() => wrapper.classList.add("show"), 50);
  }

  chatWrapper.scrollTop = chatWrapper.scrollHeight;
}

function typeText(element, text, i = 0) {
  if (i < text.length) {
    element.textContent += text.charAt(i);
    chatWrapper.scrollTop = chatWrapper.scrollHeight;
    setTimeout(() => typeText(element, text, i + 1), 20);
  }
}

async function decreaseEgorychLimit() {
  if (!userEmail) {
    console.warn("⚠️ Email не установлен");
    return;
  }

  try {
    const res = await fetch(`${BACKEND_URL}/decrease`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: userEmail }),
    });
    const json = await res.json();
    console.log("✅ Ответ от /decrease:", json);
  } catch (err) {
    console.error("❌ Ошибка при уменьшении лимита:", err);
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
      await decreaseEgorychLimit();
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
        await decreaseEgorychLimit();
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
    audio.volume = 1.0;
    audio.play();
  } catch {
    appendMessage("❌ Ошибка озвучки", "bot");
  }
}
