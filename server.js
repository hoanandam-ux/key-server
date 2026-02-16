const express = require("express");
const { v4: uuidv4 } = require("uuid");
const axios = require("axios");

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3000;

/* =========================================
   ⚙ CẤU HÌNH
========================================= */

const BASE_URL = "https://key-server-rg35.onrender.com";
const LINK4M_TOKEN = "687f718ea1faab07844af330"; // 🔥 TOKEN CỦA BẠN

/* =========================================
   🗂 RAM STORE
========================================= */

let keys = {};
let ipStore = {};

/* =========================================
   ⏳ AUTO CLEAN 60s
========================================= */

setInterval(() => {
  const now = Date.now();

  for (let key in keys) {
    if (keys[key].expire < now) {
      delete keys[key];
    }
  }

  for (let ip in ipStore) {
    if (ipStore[ip] < now) {
      delete ipStore[ip];
    }
  }

}, 60000);

/* =========================================
   🔐 ENCODE
========================================= */

function encodeKey(key) {
  return Buffer.from(key).toString("base64");
}

function decodeKey(encoded) {
  return Buffer.from(encoded, "base64").toString("utf8");
}

/* =========================================
   🏠 TRANG TẠO LINK
========================================= */

app.get("/", async (req, res) => {

  try {

    const userIP =
      req.headers["x-forwarded-for"] || req.socket.remoteAddress;

    const now = Date.now();

    if (ipStore[userIP] && ipStore[userIP] > now) {
      return res.send(`
        <h2 style="text-align:center;margin-top:100px;font-family:Segoe UI">
        ⚠ IP này đã tạo key. Vui lòng đợi 2 giờ.
        </h2>
      `);
    }

    const key = "AXL-" + uuidv4().slice(0, 8).toUpperCase();
    const expire = now + (2 * 60 * 60 * 1000);

    keys[key] = { expire, used: false };
    ipStore[userIP] = expire;

    const encoded = encodeKey(key);

    const targetUrl = `${BASE_URL}/get/${encoded}`;

    const apiUrl =
      `https://link4m.co/api-shorten/v2?api=${LINK4M_TOKEN}&url=${encodeURIComponent(targetUrl)}`;

    const response = await axios.get(apiUrl);

    if (!response.data || response.data.status !== "success") {
      return res.send("❌ Lỗi tạo link4m");
    }

    const shortLink = response.data.shortenedUrl;

    res.send(`
<!DOCTYPE html>
<html>
<head>
<meta name="viewport" content="width=device-width, initial-scale=1.0"/>
<title>AXL DEV KEY SYSTEM</title>
<style>
body{
margin:0;
background:linear-gradient(135deg,#0f172a,#020617);
font-family:Segoe UI;
display:flex;
justify-content:center;
align-items:center;
height:100vh;
color:white;
}
.card{
background:#1e293b;
padding:45px;
border-radius:25px;
width:420px;
text-align:center;
box-shadow:0 0 60px #00f2ff30;
}
.btn{
margin-top:30px;
padding:14px;
width:100%;
border:none;
border-radius:14px;
background:#00f2ff;
font-weight:bold;
text-decoration:none;
display:inline-block;
color:black;
transition:0.3s;
font-size:16px;
}
.btn:hover{
background:#00d4e0;
}
.small{
opacity:0.7;
margin-top:15px;
font-size:13px;
}
</style>
</head>
<body>
<div class="card">
<h2>🚀 AXL PREMIUM KEY SYSTEM</h2>
<p>Key có hiệu lực trong 2 giờ</p>

<a class="btn" href="${shortLink}" target="_blank">
VƯỢT LINK ĐỂ NHẬN KEY
</a>

<p class="small">Hệ thống bảo mật 1 IP = 1 Key</p>
</div>
</body>
</html>
    `);

  } catch (err) {
    console.log(err);
    res.send("Server error");
  }

});

/* =========================================
   🔑 NHẬN KEY (SAU KHI VƯỢT LINK)
========================================= */

app.get("/get/:encoded", (req, res) => {

  const key = decodeKey(req.params.encoded);

  if (!keys[key]) {
    return res.send("Key không tồn tại hoặc đã hết hạn.");
  }

  if (Date.now() > keys[key].expire) {
    delete keys[key];
    return res.send("Key đã hết hạn.");
  }

  if (keys[key].used) {
    return res.send("⚠ Key đã được sử dụng.");
  }

  keys[key].used = true;

  res.send(`
<!DOCTYPE html>
<html>
<head>
<meta name="viewport" content="width=device-width, initial-scale=1.0"/>
<title>YOUR KEY</title>
<style>
body{
margin:0;
background:linear-gradient(135deg,#0f172a,#020617);
font-family:Segoe UI;
display:flex;
justify-content:center;
align-items:center;
height:100vh;
color:white;
}
.card{
background:#1e293b;
padding:50px;
border-radius:25px;
width:450px;
text-align:center;
box-shadow:0 0 80px #00f2ff40;
}
.keybox{
background:#0f172a;
padding:18px;
border-radius:12px;
font-size:22px;
margin-top:20px;
letter-spacing:2px;
}
.btn{
margin-top:25px;
padding:14px;
width:100%;
border:none;
border-radius:14px;
background:#00f2ff;
font-weight:bold;
cursor:pointer;
font-size:16px;
}
.btn:hover{
background:#00d4e0;
}
.success{
margin-top:15px;
color:#22c55e;
display:none;
}
</style>
</head>
<body>
<div class="card">
<h2>🔐 KEY CỦA BẠN</h2>

<div class="keybox" id="key">${key}</div>

<button class="btn" onclick="copyKey()">SAO CHÉP KEY</button>

<div class="success" id="success">✔ Đã sao chép thành công</div>
</div>

<script>
function copyKey(){
const text=document.getElementById("key").innerText;
navigator.clipboard.writeText(text);
document.getElementById("success").style.display="block";
}
</script>

</body>
</html>
  `);

});

/* =========================================
   🔎 VERIFY
========================================= */

app.get("/verify", (req, res) => {

  const { key } = req.query;

  if (!keys[key]) {
    return res.json({ status: "invalid" });
  }

  if (Date.now() > keys[key].expire) {
    delete keys[key];
    return res.json({ status: "expired" });
  }

  if (!keys[key].used) {
    return res.json({ status: "not_used_yet" });
  }

  res.json({
    status: "valid",
    expire: keys[key].expire
  });

});

/* ========================================= */

app.listen(PORT, () => {
  console.log("Server running on port " + PORT);
});
