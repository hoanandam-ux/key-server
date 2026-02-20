const express = require("express");
const fs = require("fs");
const crypto = require("crypto");
const axios = require("axios");

const app = express();
app.set("trust proxy", true);
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(__dirname));

// ===== HEALTH CHECK =====
app.get("/ping", (req, res) => res.send("OK"));

// ===== CONFIG =====
const PORT = process.env.PORT || 10000;
const DATA_FILE = "database.json";
const LINK4M_TOKEN = "687f718ea1faab07844af330";
const KEY_DURATION = 2 * 60 * 60 * 1000; // 2 giờ
const ADS_DELAY = 30000; // 30s quảng cáo
const VPN_CHECK_API = "http://ip-api.com/json/";
const RATE_LIMIT = 5; // max tạo 5 key / phút / IP

// ===== ADS SESSION (ANTI BYPASS) =====
const adSessions = {}; // lưu thời gian bắt đầu xem quảng cáo theo IP + key

// ===== DATABASE SAFE LOAD =====
let db = { keys: {} };
try {
  if (fs.existsSync(DATA_FILE)) {
    const raw = fs.readFileSync(DATA_FILE, "utf8");
    db = raw ? JSON.parse(raw) : { keys: {} };
  }
} catch {
  db = { keys: {} };
}

function saveDB() {
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(db, null, 2));
  } catch {}
}

// ===== AUTO CLEAN EXPIRED KEYS =====
setInterval(() => {
  const now = Date.now();
  for (let key in db.keys) {
    if (db.keys[key].expireAt < now) {
      delete db.keys[key];
    }
  }
  saveDB();
}, 60000);

// ===== RATE LIMIT CREATE KEY =====
const createLogs = {};
function canCreate(ip) {
  const now = Date.now();
  if (!createLogs[ip]) createLogs[ip] = [];
  createLogs[ip] = createLogs[ip].filter(t => now - t < 60000);
  if (createLogs[ip].length >= RATE_LIMIT) return false;
  createLogs[ip].push(now);
  return true;
}

// ===== SECURITY HEADERS =====
app.use((req, res, next) => {
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("X-Content-Type-Options", "nosniff");
  next();
});

// ===== ANTI VPN =====
async function isVPN(ip) {
  try {
    const res = await axios.get(VPN_CHECK_API + ip + "?fields=proxy,hosting", {
      timeout: 4000
    });
    return res.data.proxy === true || res.data.hosting === true;
  } catch {
    return false;
  }
}

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
animation:gradient 12s ease infinite;
color:#fff;
}
@keyframes gradient{
0%{background-position:0% 50%}
50%{background-position:100% 50%}
100%{background-position:0% 50%}
}
.card{
width:520px;
padding:45px;
border-radius:25px;
background:rgba(0,0,0,0.65);
backdrop-filter:blur(25px);
box-shadow:0 0 60px rgba(0,255,255,0.2);
text-align:center;
}
h2{margin-bottom:20px}
button{
margin-top:20px;
width:100%;
padding:15px;
border:none;
border-radius:12px;
background:linear-gradient(45deg,#00ffff,#00ff88);
font-weight:bold;
cursor:pointer;
}
input{
width:100%;
padding:15px;
margin-top:15px;
border:none;
border-radius:12px;
background:#111;
color:#00ffff;
text-align:center;
}
.notice{margin-top:15px;font-size:13px;opacity:0.8}
.error{color:#ff4d4d}
.success{color:#00ff88}
</style>
<script>
function copyKey(text){
navigator.clipboard.writeText(text);
alert("Copied!");
}
</script>
</head>
<body>
<div class="card">
${content}
</div>
</body>
</html>
`;
}

// ===== HOME =====
app.get("/", (req, res) => {
  res.send(layout("Secure Server", `
    <h2>TOOL MD5 PRO</h2>
    <form method="POST" action="/create">
      <button>TẠO KEY</button>
    </form>
  `));
});

// ===== CREATE KEY (GIỮ NGUYÊN LINK4M) =====
app.post("/create", async (req, res) => {
  const ip = req.ip;
  if (!canCreate(ip)) {
    return res.send(layout("Spam Block", `
      <h2 class="error">TẠO KEY QUÁ NHANH</h2>
      <div class="notice">Vui lòng chờ 1 phút rồi thử lại</div>
    `));
  }

  const key = crypto.randomBytes(8).toString("hex");
  const now = Date.now();

  db.keys[key] = {
    expireAt: now + KEY_DURATION,
    used: false,
    device: null
  };
  saveDB();

  const baseUrl = req.protocol + "://" + req.get("host");
  const targetUrl = baseUrl + "/get/" + key;

  try {
    const apiUrl =
      `https://link4m.co/api-shorten/v2?api=${LINK4M_TOKEN}&url=${encodeURIComponent(targetUrl)}`;
    const response = await axios.get(apiUrl, { timeout: 5000 });
    const shortLink = response.data.shortenedUrl;

    res.send(layout("Link Created", `
      <h2 class="success">VƯỢT LINK ĐỂ LẤY KEY</h2>
      <input value="${shortLink}" readonly>
      <button onclick="copyKey('${shortLink}')">COPY LINK</button>
      <div class="notice">Bạn vẫn phải vượt Link4M trước khi xem quảng cáo</div>
    `));
  } catch {
    res.send(layout("Error", `<h2 class="error">LỖI LINK4M</h2>`));
  }
});

// ===== VERIFY API (GIỮ NGUYÊN) =====
app.post("/verify", async (req, res) => {
  const key = req.body.key;
  const ip = req.ip;

  if (!db.keys[key]) return res.json({ status: "invalid" });

  const data = db.keys[key];

  if (Date.now() > data.expireAt) {
    delete db.keys[key];
    saveDB();
    return res.json({ status: "expired" });
  }

  if (!data.used) return res.json({ status: "not_claimed" });
  if (data.device !== ip) return res.json({ status: "device_mismatch" });

  return res.json({
    status: "valid",
    expireAt: data.expireAt
  });
});

// ===== GET KEY =====
app.get("/get/:key", async (req, res) => {
  const key = req.params.key;
  const ip = req.ip;

  if (await isVPN(ip)) {
    return res.send(layout("Blocked", `
      <h2 class="error">VPN / PROXY KHÔNG ĐƯỢC PHÉP</h2>
      <div class="notice">Vui lòng tắt VPN để tiếp tục</div>
    `));
  }

  if (!db.keys[key]) {
    return res.send(layout("Error", `<h2 class="error">KEY KHÔNG TỒN TẠI</h2>`));
  }

  const data = db.keys[key];

  if (Date.now() > data.expireAt) {
    delete db.keys[key];
    saveDB();
    return res.send(layout("Expired", `<h2 class="error">KEY HẾT HẠN</h2>`));
  }

  if (data.used) {
    if (data.device === ip) {
      const timeLeft = Math.floor((data.expireAt - Date.now()) / 60000);
      return res.send(layout("Your Key", `
        <h2 class="success">KEY CỦA BẠN</h2>
        <input value="${key}" readonly>
        <button onclick="copyKey('${key}')">COPY KEY</button>
        <div class="notice">Còn ${timeLeft} phút sử dụng</div>
      `));
    }
    return res.send(layout("Blocked", `
      <h2 class="error">KEY ĐÃ ĐƯỢC SỬ DỤNG TRÊN THIẾT BỊ KHÁC</h2>
    `));
  }

  res.send(layout("Claim", `
    <h2>NHẬN KEY</h2>
    <form method="GET" action="/ads/${key}">
      <button>NHẬN KEY</button>
    </form>
  `));
});

// ===== ADS GATE (ANTI BYPASS 30s) =====
app.get("/ads/:key", (req, res) => {
  const key = req.params.key;
  const ip = req.ip;

  if (!db.keys[key]) {
    return res.send(layout("Error", `<h2 class="error">KEY KHÔNG TỒN TẠI</h2>`));
  }

  // lưu thời gian bắt đầu xem quảng cáo
  adSessions[ip + "_" + key] = Date.now();

  res.send(layout("Watching Ads", `
    <h2>VUI LÒNG XEM QUẢNG CÁO 30 GIÂY</h2>
    <div class="notice">Không tắt tab để tiếp tục...</div>

    <!-- DÁN SCRIPT QUẢNG CÁO PROP / MONETAG TẠI ĐÂY -->

    <script>
      setTimeout(() => {
        window.location.href = "/claim/${key}";
      }, ${ADS_DELAY});
    </script>
  `));
});

// ===== CLAIM KEY (CHECK 30s SERVER SIDE) =====
app.get("/claim/:key", async (req, res) => {
  const key = req.params.key;
  const ip = req.ip;

  const sessionKey = ip + "_" + key;
  if (!adSessions[sessionKey]) {
    return res.send(layout("Error", `
      <h2 class="error">BẠN CHƯA XEM QUẢNG CÁO</h2>
      <div class="notice">Vui lòng quay lại và xem đủ 30 giây</div>
    `));
  }

  const waited = Date.now() - adSessions[sessionKey];
  if (waited < ADS_DELAY) {
    const remain = Math.ceil((ADS_DELAY - waited) / 1000);
    return res.send(layout("Wait", `
      <h2 class="error">CHƯA ĐỦ THỜI GIAN</h2>
      <div class="notice">Vui lòng xem quảng cáo thêm ${remain}s</div>
    `));
  }

  delete adSessions[sessionKey];

  if (await isVPN(ip)) {
    return res.send(layout("Blocked", `
      <h2 class="error">VPN / PROXY KHÔNG ĐƯỢC PHÉP</h2>
    `));
  }

  if (!db.keys[key] || db.keys[key].used) {
    return res.send(layout("Used", `<h2 class="error">KEY ĐÃ ĐƯỢC SỬ DỤNG</h2>`));
  }

  db.keys[key].used = true;
  db.keys[key].device = ip;
  saveDB();

  const timeLeft = Math.floor((db.keys[key].expireAt - Date.now()) / 60000);

  res.send(layout("Your Key", `
    <h2 class="success">ACCESS GRANTED</h2>
    <input value="${key}" readonly>
    <button onclick="copyKey('${key}')">COPY KEY</button>
    <div class="notice">Còn ${timeLeft} phút sử dụng</div>
  `));
});

app.listen(PORT, () => {
  console.log("Secure server running on port " + PORT);
});
