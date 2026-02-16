const express = require("express");
const fs = require("fs");
const crypto = require("crypto");
const axios = require("axios");

const app = express();
app.set("trust proxy", true);

// ===== CONFIG =====
const PORT = process.env.PORT || 10000;
const DATA_FILE = "database.json";
const LINK4M_TOKEN = "687f718ea1faab07844af330"; // HARD CODE
const KEY_DURATION = 2 * 60 * 60 * 1000; // 2 giờ
// ===================

// ===== LOAD DATABASE =====
let db = { keys: {} };

if (fs.existsSync(DATA_FILE)) {
  db = JSON.parse(fs.readFileSync(DATA_FILE));
}

function saveDB() {
  fs.writeFileSync(DATA_FILE, JSON.stringify(db, null, 2));
}

// ===== AUTO CLEAN =====
setInterval(() => {
  const now = Date.now();

  for (let key in db.keys) {
    if (db.keys[key].expireAt < now) {
      delete db.keys[key];
    }
  }

  saveDB();
}, 60000);

// ===== SECURITY HEADERS =====
app.use((req, res, next) => {
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-XSS-Protection", "1; mode=block");
  res.setHeader("Content-Security-Policy", "default-src 'self' https://fonts.googleapis.com https://fonts.gstatic.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; script-src 'self' 'unsafe-inline'");
  next();
});

// ===== UI LAYOUT =====
function layout(title, content) {
return `
<!DOCTYPE html>
<html>
<head>
<meta name="viewport" content="width=device-width, initial-scale=1"/>
<title>${title}</title>

<link href="https://fonts.googleapis.com/css2?family=Orbitron:wght@500;700&display=swap" rel="stylesheet">

<style>
*{margin:0;padding:0;box-sizing:border-box}

body{
height:100vh;
display:flex;
justify-content:center;
align-items:center;
font-family:'Orbitron',sans-serif;
background:linear-gradient(-45deg,#0f2027,#203a43,#2c5364,#1c1c1c);
background-size:400% 400%;
animation:gradient 15s ease infinite;
overflow:hidden;
color:#fff;
}

@keyframes gradient{
0%{background-position:0% 50%}
50%{background-position:100% 50%}
100%{background-position:0% 50%}
}

.card{
width:480px;
padding:40px;
border-radius:25px;
background:rgba(0,0,0,0.65);
backdrop-filter:blur(25px);
box-shadow:0 0 60px rgba(0,255,255,0.2);
animation:fade 0.7s ease;
position:relative;
}

@keyframes fade{
from{opacity:0;transform:translateY(20px)}
to{opacity:1;transform:translateY(0)}
}

h2{
text-align:center;
margin-bottom:20px;
letter-spacing:2px;
text-shadow:0 0 10px #00ffff;
}

input{
width:100%;
padding:15px;
border:none;
border-radius:12px;
background:#111;
color:#00ffff;
text-align:center;
margin-top:15px;
font-size:14px;
box-shadow:0 0 15px rgba(0,255,255,0.2);
}

button{
margin-top:20px;
width:100%;
padding:15px;
border:none;
border-radius:12px;
background:linear-gradient(45deg,#00ffff,#00ff88);
font-weight:bold;
cursor:pointer;
transition:0.3s;
font-size:15px;
}

button:hover{
transform:scale(1.05);
box-shadow:0 0 25px #00ffff;
}

.notice{
margin-top:15px;
text-align:center;
font-size:13px;
opacity:0.8;
}

.error{color:#ff4d4d;text-align:center}
.success{color:#00ff88;text-align:center}

.toast{
position:fixed;
bottom:30px;
right:30px;
background:#00ff88;
color:#000;
padding:15px 25px;
border-radius:12px;
box-shadow:0 0 20px #00ff88;
opacity:0;
transition:0.4s;
}
.toast.show{
opacity:1;
}
</style>

<script>
function copyText(text){
navigator.clipboard.writeText(text);
const toast=document.getElementById("toast");
toast.classList.add("show");
setTimeout(()=>toast.classList.remove("show"),2000);
}
</script>

</head>
<body>
<div class="card">
${content}
</div>
<div id="toast" class="toast">Copied to clipboard</div>
</body>
</html>
`;
}

// ===== HOME =====
app.get("/", (req, res) => {
  res.send(layout("Secure Key Server", `
    <h2>SECURE KEY GENERATOR</h2>
    <form method="POST" action="/create">
      <button>TẠO KEY</button>
    </form>
    <div class="notice">Key tồn tại 2 giờ • Chỉ dùng 1 lần</div>
  `));
});

// ===== CREATE KEY =====
app.post("/create", async (req, res) => {

  const key = crypto.randomBytes(8).toString("hex");
  const now = Date.now();

  db.keys[key] = {
    expireAt: now + KEY_DURATION,
    used: false
  };

  saveDB();

  const baseUrl = req.protocol + "://" + req.get("host");
  const targetUrl = baseUrl + "/get/" + key;

  const apiUrl =
    `https://link4m.co/api-shorten/v2?api=${LINK4M_TOKEN}&url=${encodeURIComponent(targetUrl)}`;

  try {
    const response = await axios.get(apiUrl);
    const shortLink = response.data.shortenedUrl;

    res.send(layout("Link Created", `
      <h2 class="success">LINK GENERATED</h2>
      <input value="${shortLink}" readonly>
      <button onclick="copyText('${shortLink}')">COPY LINK</button>
      <div class="notice">Key hết hạn sau 2 giờ</div>
    `));

  } catch {
    res.send(layout("Error", `
      <h2 class="error">LỖI TẠO LINK4M</h2>
    `));
  }
});

// ===== GET KEY =====
app.get("/get/:key", (req, res) => {

  const key = req.params.key;

  if (!db.keys[key]) {
    return res.send(layout("Error", `
      <h2 class="error">KEY KHÔNG TỒN TẠI</h2>
    `));
  }

  const data = db.keys[key];

  if (Date.now() > data.expireAt) {
    delete db.keys[key];
    saveDB();
    return res.send(layout("Expired", `
      <h2 class="error">KEY ĐÃ HẾT HẠN</h2>
    `));
  }

  if (data.used) {
    return res.send(layout("Used", `
      <h2 class="error">KEY ĐÃ ĐƯỢC SỬ DỤNG</h2>
    `));
  }

  db.keys[key].used = true;
  saveDB();

  res.send(layout("Your Key", `
    <h2 class="success">ACCESS GRANTED</h2>
    <input value="${key}" readonly>
    <button onclick="copyText('${key}')">COPY KEY</button>
    <div class="notice">Key chỉ dùng 1 lần</div>
  `));
});

app.listen(PORT, () => {
  console.log("Secure server running on port " + PORT);
});
