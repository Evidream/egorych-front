const textInput = document.getElementById("textInput");
const sendBtn = document.getElementById("sendBtn");
const fileInput = document.getElementById("fileInput");
const cameraPreview = document.getElementById("cameraPreview");
const video = document.getElementById("video");

let selectedFile = null;
let mediaStream = null;
let lastBotReply = "";
let isSending = false;

// === Камера ===
function openCamera() {
  navigator.mediaDevices.getUserMedia({ video: true })
    .then(stream => {
      mediaStream = stream;
      video.srcObject = stream;
      cameraPreview.style.display = "block";
    })
    .catch(() => {
      alert("Нет доступа к камере");
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
    alert("📸 Снимок сделан и готов к отправке");
    closeCamera();
  }, "image/jpeg", 0.95);
}

// === Скрепка ===
fileInput.addEventListener("change", () => {
  selectedFile = fileInput.files[0];
  if (selectedFile) {
    alert(`📎 Прикреплен файл: ${selectedFile.name}`);
  }
});

// === Отправка ===
sendBtn.addEventListener("click", send);

async function send() {
  if (isSending) return;
  isSending = true;

  const text = textInput.value.trim();

  if (text) {
    console.log("📝 Текст:", text);

    try {
      const res = await fetch("https://egorych-backend-production.up.railway.app/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text })
      });

      const data = await res.json();
      lastBotReply = data.reply?.trim() || "🤖 Егорыч молчит...";
      console.log("🤖 Ответ:", lastBotReply);
    } catch {
      console.log("❌ Ошибка ответа Егорыча");
    }
  }

  if (selectedFile) {
    console.log("📤 Отправка файла:", selectedFile.name);

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
        lastBotReply = visionData.reply?.trim() || "🤖 Егорыч посмотрел, но ничего не понял.";
        console.log("🧿 Vision ответ:", lastBotReply);
      } else {
        console.log("❌ Ошибка загрузки файла");
      }

    } catch {
      console.log("❌ Ошибка при загрузке");
    }

    selectedFile = null;
    fileInput.value = "";
  }

  textInput.value = "";
  isSending = false;
}

// === Озвучка ===
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
    new Audio(url).play();
  } catch {
    console.log("❌ Ошибка озвучки");
  }
}
