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

// === Локальный счётчик для guest ===
let localGuestCount = Number(localStorage.getItem("egorych_guest_count")) || 0;

// === Приветственный бабл ===
window.addEventListener("DOMContentLoaded", () => {
  appendMessage("Ну чё ты, как ты, роднуля? Давай рассказывай - всё порешаем!", "bot");
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

// === НАДЁЖНЫЙ EMAIL ===
function getTildaEmail() {
  let email = "";
  try {
    // 1️⃣ Берём напрямую твой egorych_email
    email = localStorage.getItem('egorych_email') || "";

    // 2️⃣ Если пусто — fallback на TildaMembers
    if (!email) {
      const allrecords = document.querySelector("#allrecords");
      if (allrecords) {
        const projectId = allrecords.dataset.tildaprojectid;
        const ls = localStorage.getItem('tilda_members_profile' + projectId);
        email = ls ? JSON.parse(ls).login : "";
      }
    }

    console.log("===================");
    console.log("✅ Итоговый email:", email);
    console.log("===================");
  } catch (e) {
    console.log("❌ Ошибка в getTildaEmail:", e);
  }
  return email;
}

// === Добавление баблов ===
function appendMessage(text, sender) {
  const wrapper = document.createElement("div");
  wrapper.className = sender === "bot" ? "bubble-wrapper" : "user-wrapper";

  if (sender === "bot") {
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

    wrapper.appendChild(bubble);
    wrapper.appendChild(listenBtn);

    chat.appendChild(wrapper);
    setTimeout(() => {
      wrapper.classList.add("show");
    }, 50);

    typeText(bubble, text);
    lastBotReply = text;

  } else {
    const bubble = document.createElement("div");
    bubble.className = "bubble-user";
    bubble.textContent = text;

    wrapper.appendChild(bubble);
    chat.appendChild(wrapper);
    setTimeout(() => {
      wrapper.classList.add("show");
    }, 50);
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

async function send() {
  if (isSending) return;
  isSending = true;

  const text = textInput.value.trim();
  if (text) {
    appendMessage(text, "user");
    textInput.value = "";

    try {
      const actualEmail = getTildaEmail();

      // Если юзер залогинен — сбрасываем guest лимит
      if (actualEmail) {
        localStorage.removeItem("egorych_guest_count");
        localGuestCount = 0;
      }

      // Если гость — проверяем лимит
      if (!actualEmail && localGuestCount >= 20) {
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

console.log("====================");
console.log("✅ Проверка LocalStorage:");
console.log("egorych_email =", localStorage.getItem("egorych_email"));

const projectIdCheck = document.querySelector('#allrecords')?.dataset?.tildaProjectId;
console.log("projectId =", projectIdCheck);

if (projectIdCheck) {
  const tildaRaw = localStorage.getItem('tilda_members_profile' + projectIdCheck);
  console.log("Tilda raw:", tildaRaw);
  if (tildaRaw) {
    try {
      const tildaParsed = JSON.parse(tildaRaw);
      console.log("Tilda login =", tildaParsed.login);
    } catch (e) {
      console.log("Ошибка парсинга tilda_members_profile:", e);
    }
  } else {
    console.log("Нет tilda_members_profile для ProjectID");
  }
}
console.log("====================");

