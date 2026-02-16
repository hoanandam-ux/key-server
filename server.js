const express = require("express");
const { v4: uuidv4 } = require("uuid");
const axios = require("axios");

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3000;

let keys = {};
let ipStore = {};

// ===== AUTO XÓA KEY HẾT HẠN =====
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

// ===== MÃ HÓA KEY =====
function encodeKey(key) {
  return Buffer.from(key).toString("base64");
}

function decodeKey(encoded) {
  return Buffer.from(encoded, "base64").toString("utf8");
}

// =================================
// 🔥 TRANG CHỦ – 1 IP = 1 KEY
// =================================
app.get("/", async (req, res) => {
  try {

    const userIP =
      req.headers["x-forwarded-for"] || req.socket.remoteAddress;

    const now = Date.now();

    if (ipStore[userIP] && ipStore[userIP] > now) {
      return res.send("⚠ IP này đã tạo key. Vui lòng đợi hết hạn.");
    }

    const key = "AXL-" + uuidv4().slice(0, 8).toUpperCase();
    const expire = now + (2 * 60 * 60 * 1000);

    keys[key] = {
      expire,
      used: false
    };

    ipStore[userIP] = expire;

    const encoded = encodeKey(key);

    const apiToken = "687f718ea1faab07844af330"; // TOKEN LINK4M

    const targetUrl =
      `https://key-server-rg35.onrender.com/get/${encoded}`;

    const apiUrl =
      `https://link4m.co/api-shorten/v2?api=${apiToken}&url=${encodeURIComponent(targetUrl)}`;

    const response = await axios.get(apiUrl);

    if (response.data.status !== "success") {
      return res.send("Lỗi tạo link4m");
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
      font-family:Arial;
      display:flex;
      justify-content:center;
      align-items:center;
      height:100vh;
      color:white;
    }
    .card{
      background:#1e293b;
      padding:40px;
      border-radius:20px;
      width:420px;
      text-align:center;
      box-shadow:0 0 40px #00f2ff30;
    }
    .btn{
      display:inline-block;
      margin-top:20px;
      padding:12px 25px;
      background:#00f2ff;
      color:black;
      font-weight:bold;
      text-decoration:none;
      border-radius:10px;
    }
    .tag{
      margin-top:15px;
      font-size:13px;
      color:#94a3b8;
    }
    </style>
    </head>
    <body>

    <div class="card">
      <h2>🚀 AXL DEV KEY SYSTEM</h2>
      <p>Key hợp lệ trong 2 giờ</p>

      <a class="btn" href="${shortLink}" target="_blank">
        VƯỢT LINK ĐỂ LẤY KEY
      </a>

      <div class="tag">
        © 2026 AXL DEV
      </div>
    </div>

    </body>
    </html>
    `);

  } catch (e) {
    res.send("Server error");
  }
});

// =================================
// 🔥 GET KEY (CHỐNG SHARE)
// =================================
app.get("/get/:encoded", (req, res) => {

  const encoded = req.params.encoded;
  const key = decodeKey(encoded);

  if (!keys[key]) {
    return res.send("Key không tồn tại");
  }

  if (Date.now() > keys[key].expire) {
    delete keys[key];
    return res.send("Key đã hết hạn");
  }

  if (keys[key].used) {
    return res.send("⚠ Key đã được sử dụng");
  }

  keys[key].used = true;

  res.send(`
  <!DOCTYPE html>
  <html>
  <head>
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>AXL DEV KEY</title>
  <style>
  body{
    margin:0;
    background:#0f172a;
    font-family:Arial;
    display:flex;
    justify-content:center;
    align-items:center;
    height:100vh;
    color:white;
  }
  .card{
    background:#1e293b;
    padding:40px;
    border-radius:20px;
    width:400px;
    text-align:center;
  }
  .key{
    margin-top:20px;
    background:#0f172a;
    padding:15px;
    border-radius:12px;
    font-size:20px;
    font-weight:bold;
    letter-spacing:2px;
  }
  button{
    margin-top:20px;
    padding:12px 25px;
    border:none;
    border-radius:10px;
    background:#00f2ff;
    color:black;
    font-weight:bold;
    cursor:pointer;
  }
  .timer{
    margin-top:15px;
    font-size:14px;
    color:#94a3b8;
  }
  </style>
  </head>
  <body>

  <div class="card">
    <h2>🔐 AXL DEV KEY</h2>

    <div class="key" id="keyText">${key}</div>

    <button onclick="copyKey()">SAO CHÉP KEY</button>

    <div class="timer">
      Tự chuyển về app sau 5 giây...
    </div>
  </div>

  <script>
  setTimeout(()=>{
    window.location.href="https://google.com";
  },5000);

  function copyKey(){
    const text = document.getElementById("keyText").innerText;
    navigator.clipboard.writeText(text);
    alert("Đã sao chép key");
  }
  </script>

  </body>
  </html>
  `);
});

// =================================
// 🔥 VERIFY API
// =================================
app.get("/verify", (req, res) => {

  const { key } = req.query;

  if (!keys[key]) {
    return res.json({ status: "invalid" });
  }

  if (Date.now() > keys[key].expire) {
    delete keys[key];
    return res.json({ status: "expired" });
  }

  res.json({
    status: "valid",
    expire: keys[key].expire
  });
});

// =================================

app.listen(PORT, () => {
  console.log("Server running on port " + PORT);
});
