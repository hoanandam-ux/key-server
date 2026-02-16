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

  const expireTime = keys[key].expire;

  res.send(`
  <!DOCTYPE html>
  <html>
  <head>
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>AXL DEV - KEY SUCCESS</title>

  <style>
  body{
    margin:0;
    height:100vh;
    background:linear-gradient(135deg,#0f172a,#020617);
    font-family: 'Segoe UI', sans-serif;
    display:flex;
    justify-content:center;
    align-items:center;
    color:white;
  }

  .card{
    background:#1e293b;
    padding:45px;
    width:420px;
    border-radius:25px;
    text-align:center;
    box-shadow:0 0 60px #00f2ff20;
    animation:fadeIn 0.6s ease;
  }

  @keyframes fadeIn{
    from{opacity:0; transform:translateY(20px);}
    to{opacity:1; transform:translateY(0);}
  }

  h2{
    margin:0;
    font-weight:600;
  }

  .success{
    font-size:14px;
    color:#22c55e;
    margin-top:8px;
  }

  .key-box{
    margin-top:25px;
    background:#0f172a;
    padding:18px;
    border-radius:15px;
    font-size:22px;
    font-weight:bold;
    letter-spacing:3px;
    border:1px solid #334155;
    user-select:all;
  }

  .btn{
    margin-top:20px;
    padding:14px;
    width:100%;
    border:none;
    border-radius:12px;
    background:#00f2ff;
    font-weight:bold;
    font-size:15px;
    cursor:pointer;
    transition:0.3s;
  }

  .btn:hover{
    background:#00d4e0;
  }

  .copied{
    margin-top:12px;
    font-size:13px;
    color:#22c55e;
    display:none;
  }

  .expire{
    margin-top:18px;
    font-size:13px;
    color:#94a3b8;
  }

  .footer{
    margin-top:25px;
    font-size:12px;
    color:#64748b;
  }
  </style>
  </head>

  <body>

  <div class="card">
    <h2>🔐 KEY ĐÃ SẴN SÀNG</h2>
    <div class="success">Vượt link thành công</div>

    <div class="key-box" id="keyText">${key}</div>

    <button class="btn" onclick="copyKey()">SAO CHÉP KEY</button>

    <div class="copied" id="copiedMsg">✓ Đã sao chép vào clipboard</div>

    <div class="expire">
      Hết hạn sau: <span id="countdown"></span>
    </div>

    <div class="footer">
      © 2026 AXL DEV
    </div>
  </div>

  <script>
  function copyKey(){
    const text = document.getElementById("keyText").innerText;
    navigator.clipboard.writeText(text);

    const msg = document.getElementById("copiedMsg");
    msg.style.display = "block";

    setTimeout(()=>{
      msg.style.display = "none";
    },2000);
  }

  const expireTime = ${expireTime};

  function updateCountdown(){
    const now = Date.now();
    const diff = expireTime - now;

    if(diff <= 0){
      document.getElementById("countdown").innerText = "ĐÃ HẾT HẠN";
      return;
    }

    const hours = Math.floor(diff / (1000*60*60));
    const minutes = Math.floor((diff % (1000*60*60)) / (1000*60));
    const seconds = Math.floor((diff % (1000*60)) / 1000);

    document.getElementById("countdown").innerText =
      hours + "h " + minutes + "m " + seconds + "s";
  }

  setInterval(updateCountdown,1000);
  updateCountdown();
  </script>

  </body>
  </html>
  `);
});

