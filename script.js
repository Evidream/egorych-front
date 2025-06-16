const chat = document.getElementById("chat");
const input = document.getElementById("userInput");
const sendBtn = document.getElementById("sendBtn");

// === Авто-приветственный бабл при загрузке ===
window.onload = () => {
  botReply("Привет, роднуля! 🫶 Напиши, как ты?");
};

// === При нажатии кнопки отправки ===
sendBtn.onclick = sendMessage;
input.addEventListener("keypress", (e) => {
  if (e.key === "Enter") sendMessage();
});

// === Отправка сообщения ===
function sendMessage() {
  const text = input.value.trim();
  if (!text) return;
  addBubble(text, "user");
  input.value = "";

  // Симуляция печати ответа
  setTimeout(() => {
    typeReply("Ого! Ща расскажу всё по красоте 😉");
  }, 800);
}

// === Добавить пузырь ===
function addBubble(text, type) {
  const bubble = document.createElement("div");
  bubble.className = `bubble ${type}`;
  bubble.textContent = text;
  chat.appendChild(bubble);
  chat.scrollTop = chat.scrollHeight;
}

// === Появление бот-ответа с эффектом печати ===
function typeReply(text) {
  const bubble = document.createElement("div");
  bubble.className = "bubble bot";
  chat.appendChild(bubble);

  let i = 0;
  const typer = setInterval(() => {
    bubble.textContent = text.slice(0, i + 1);
    i++;
    if (i >= text.length) clearInterval(typer);
    chat.scrollTop = chat.scrollHeight;
  }, 30);
}
