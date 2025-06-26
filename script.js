// === DOM-элементы ===
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

// === Лимит для guest ===
let localGuestCount = Number(localStorage.getItem("egorych_guest_count")) || 0;

// === Приветственный бабл ===
window.addEventListener("DOMContentLoaded", () => {
  appendMessage("Ну чё ты, как ты, роднуля? Давай рассказывай - всё порешаем!", "bot");
});

// === Обработка Enter ===
textInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") {
    e.preventDefault();
    send();
  }
});

// === Прикрепление файла ===
clipBtn.addEventListener("click", () => {
  const fileInput = document.createElement("input");
  fileInput.type = "file";
  fileInput.style.display = "none";
  document.body.appendChild(fileInput);

  fileInput.addEventListener("change", () => {
    selectedFile = fileInput.files[0];
    document.body.removeChild(fileInput);
  });

  fileInput.click();
});

// === Камера ===
cameraBtn.addEventListener("click", openCamera);

function openCamera() {
  navigator.mediaDevices.getUserMedia({ video: true })
    .then(stream => {
      mediaStream = stream;
      const video = document.getElementById("video");
      video.srcObject = stream;
      document.getElementById("cameraPreview").style.display = "block";
    })
    .catch(() => appendMessage("🚫 Нет доступа к камере", "bot"));
}

function closeCamera() {
  if (mediaStream) {
    mediaStream.getTracks().forEach(track => track.stop());
    mediaStream = null;
  }
  const video = document.getElementById("video");
  if (video) video.srcObject = null;
  document.getElementById("cameraPreview").style.display = "none";
}

function takePhoto() {
  const video = document.getElementById("video");
  const canvas = document.createElement("canvas");
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  canvas.getContext("2d").drawImage(video, 0, 0);
  canvas.toBlob(blob => {
    selectedFile = new File([blob], "photo.jpg", { type: "image/jpeg" });
    closeCamera();
  }, "image/jpeg");
}

function getTildaEmail() {
  let email = "";
  try {
    email = localStorage.getItem('egorych_email') || "";
    if (!email) {
      const allrecords = document.querySelector("#allrecords");
      if (allrecords) {
        const projectId = allrecords.dataset.tildaprojectid;
        const ls = localStorage.getItem('tilda_members_profile' + projectId);
        email = ls ? JSON.parse(ls).login : "";
      }
    }
  } catch (e) {
    console.log("❌ Ошибка в getTildaEmail:", e);
  }
  return email;
}

function scrollToBottom() {
  chatWrapper.scrollTop = chatWrapper.scrollHeight;
}

function appendMessage(text, sender) {
  if (!text) return;
  const wrapper = document.createElement("div");
  wrapper.className = sender === "bot" ? "bubble-wrapper" : "user-wrapper";

  if (sender === "bot") {
    const bubble = document.createElement("div");
    bubble.className = "bubble-bot";
    bubble.textContent = "";

    const listenBtn = document.createElement("img");
    listenBtn.src = "assets/listen-button.svg";
    listenBtn.alt = "Слушать";
    listenBtn.className = "listen-button";
    listenBtn.onclick = () => speak(text);

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
    wrapper.appendChild(bubble);
    chat.appendChild(wrapper);
    setTimeout(() => wrapper.classList.add("show"), 50);
  }

  scrollToBottom();
}

function typeText(element, text, i = 0) {
  if (i < text.length) {
    element.textContent += text.charAt(i);
    scrollToBottom();
    setTimeout(() => typeText(element, text, i + 1), 20);
  }
}

sendBtn.addEventListener("click", send);

async function send() {
  if (isSending) return;
  isSending = true;

  const text = textInput.value.trim();
  const actualEmail = getTildaEmail();

  if (text) {
    appendMessage(text, "user");
    textInput.value = "";

    try {
      if (actualEmail) {
        localStorage.removeItem("egorych_guest_count");
        localGuestCount = 0;
      } else if (localGuestCount >= 20) {
        appendMessage("🥲 Слушай, ты всё уже выговорил! Зарегистрируйся и продолжим без лимитов.", "bot");
        isSending = false;
        return;
      }

      const res = await fetch(`${BACKEND_URL}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, email: actualEmail || "" })
      });
      const data = await res.json();
      appendMessage(data.reply || "🤖 Егорыч молчит...", "bot");

      if (!actualEmail) {
        localGuestCount++;
        localStorage.setItem("egorych_guest_count", localGuestCount);
      }
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
