const express = require("express");
const fs = require("fs");
const crypto = require("crypto");
const axios = require("axios");

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const PORT = process.env.PORT || 10000;
const DATA_FILE = "keys.json";
const LINK4M_TOKEN = "687f718ea1faab07844af330";
const KEY_DURATION = 2 * 60 * 60 * 1000; // 2 giờ

// ================= LOAD DATA =================

let keys = {};
if (fs.existsSync(DATA_FILE)) {
  keys = JSON.parse(fs.readFileSync(DATA_FILE));
}

function saveKeys() {
  fs.writeFileSync(DATA_FILE, JSON.stringify(keys, null, 2));
}

// Auto clean mỗi 60s
setInterval(() => {
  const now = Date.now();
  for (let k in keys) {
    if (keys[k].expireAt < now) {
      delete keys[k];
    }
  }
  saveKeys();
}, 60000);

// ================= UI LAYOUT =================

function layout(title, content) {
return `
<!DOCTYPE html>
<html>
<head>
<meta name="viewport" content="width=device-width, initial-scale=1.0"/>
<title>${title}</title>

<style>
@import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@400;700&display=swap');

*{margin:0;padding:0;box-sizing:border-box}

body{
height:100vh;
display:flex;
justify-content:center;
align-items:center;
font-family:'Orbitron',sans-serif;
color:#fff;
background:linear-gradient(-45deg,#0f172a,#020617,#0f172a,#111827);
background-size:400% 400%;
animation:bgMove 15s ease infinite;
}

@keyframes bgMove{
0%{background-position:0% 50%}
50%{background-position:100% 50%}
100%{background-position:0% 50%}
}

.card{
width:440px;
padding:40px;
border-radius:20px;
background:rgba(30,41,59,0.6);
backdrop-filter:blur(20px);
box-shadow:0 0 40px rgba(0,255,255,0.15);
position:relative;
animation:fadeIn 1s ease forwards;
}

@keyframes fadeIn{
from{opacity:0;transform:translateY(20px)}
to{opacity:1;transform:translateY(0)}
}

.card::before{
content:"";
position:absolute;
top:-2px;left:-2px;right:-2px;bottom:-2px;
border-radius:20px;
background:linear-gradient(45deg,#00f2ff,#00ff88,#00f2ff);
z-index:-1;
filter:blur(10px);
opacity:0.5;
}

h2{
text-align:center;
margin-bottom:20px;
letter-spacing:1px;
}

input{
width:100%;
padding:14px;
border:none;
border-radius:12px;
background:#0f172a;
color:#00f2ff;
text-align:center;
outline:none;
margin-top:10px;
box-shadow:inset 0 0 10px rgba(0,255,255,0.2);
}

button{
margin-top:18px;
width:100%;
padding:14px;
border:none;
border-radius:12px;
background:linear-gradient(45deg,#00f2ff,#00ff88);
color:#000;
font-weight:bold;
cursor:pointer;
transition:0.3s;
}

button:hover{
transform:scale(1.05);
box-shadow:0 0 20px #00f2ff;
}

.toast{
position:fixed;
bottom:30px;
background:#00ff88;
color:#000;
padding:12px 20px;
border-radius:8px;
opacity:0;
transition:0.4s;
}

.toast.show{opacity:1}

.typing{
border-right:2px solid #00f2ff;
white-space:nowrap;
overflow:hidden;
animation:typing 2s steps(20), blink 0.7s infinite;
}

@keyframes typing{
from{width:0}
to{width:100%}
}

@keyframes blink{
50%{border-color:transparent}
}
</style>
</head>

<body>

<div class="card">
${content}
</div>

<div class="toast" id="toast">✔ Copied Successfully</div>

<script>
function copyText(text){
navigator.clipboard.writeText(text);
let t=document.getElementById("toast");
t.classList.add("show");
setTimeout(()=>{t.classList.remove("show")},2000);
}
</script>

</body>
</html>
`;
}

// ================= ROUTES =================

// Trang chính
app.get("/", (req, res) => {
  res.send(layout("Dev Key Server", `
  <h2 class="typing">DEV KEY GENERATOR</h2>
  <form method="POST" action="/create">
    <button>TẠO KEY</button>
  </form>
  `));
});

// Tạo key
app.post("/create", async (req, res) => {

  const key = crypto.randomBytes(6).toString("hex");
  keys[key] = { expireAt: Date.now() + KEY_DURATION };
  saveKeys();

  const baseUrl = req.protocol + "://" + req.get("host");
  const targetUrl = baseUrl + "/get/" + key;

  const apiUrl =
    `https://link4m.co/api-shorten/v2?api=${LINK4M_TOKEN}&url=${encodeURIComponent(targetUrl)}`;

  try {
    const response = await axios.get(apiUrl);
    const shortLink = response.data.shortenedUrl;

    res.send(layout("Link Created", `
    <h2 class="typing">LINK GENERATED</h2>
    <input value="${shortLink}" readonly>
    <button onclick="copyText('${shortLink}')">COPY LINK</button>
    `));

  } catch (err) {
    res.send(layout("Error", `<h2>❌ Lỗi tạo link4m</h2>`));
  }
});

// Sau khi vượt link
app.get("/get/:key", (req, res) => {

  const key = req.params.key;

  if (!keys[key]) {
    return res.send(layout("Error", `<h2>❌ Key không tồn tại</h2>`));
  }

  if (Date.now() > keys[key].expireAt) {
    delete keys[key];
    saveKeys();
    return res.send(layout("Expired", `<h2>⏳ Key đã hết hạn</h2>`));
  }

  res.send(layout("Your Key", `
  <h2 class="typing">ACCESS GRANTED</h2>
  <input value="${key}" readonly>
  <button onclick="copyText('${key}')">COPY KEY</button>
  `));
});

app.listen(PORT, () => {
  console.log("Server running on port " + PORT);
});
