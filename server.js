const express = require("express");
const { v4: uuidv4 } = require("uuid");
const axios = require("axios");

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3000;

let keys = {};

// ===== AUTO XÓA KEY HẾT HẠN =====
setInterval(() => {
  const now = Date.now();
  for (let key in keys) {
    if (keys[key].expire < now) {
      delete keys[key];
    }
  }
}, 60000);

// ===== HÀM MÃ HÓA KEY =====
function encodeKey(key) {
  return Buffer.from(key).toString("base64");
}

function decodeKey(encoded) {
  return Buffer.from(encoded, "base64").toString("utf8");
}

// =================================
// 🔥 TRANG CHỦ – TỰ TẠO 1 KEY DUY NHẤT
// =================================
app.get("/", async (req, res) => {
  try {

    const key = "AXL-" + uuidv4().slice(0, 8).toUpperCase();
    const expire = Date.now() + (2 * 60 * 60 * 1000);

    keys[key] = { expire };

    const encoded = encodeKey(key);

    const apiToken = "687f718ea1faab07844af330";

    const targetUrl =
      `https://key-server-rg35.onrender.com/get/${encoded}`;

    const apiUrl =
      `https://link4m.co/api-shorten/v2?api=${apiToken}&url=${encodeURIComponent(targetUrl)}`;

    const response = await axios.get(apiUrl);

    if (response.data.status !== "success") {
      return res.send("Lỗi tạo link4m");
    }

    const shortLink = response.data.shortenedUrl;

    // ===== GIAO DIỆN AUTO =====
    res.send(`
      <html>
      <head>
        <title>AXL KEY SYSTEM</title>
        <style>
          body{
            background:#0f172a;
            color:white;
            font-family:Arial;
            display:flex;
            justify-content:center;
            align-items:center;
            height:100vh;
          }
          .box{
            background:#1e293b;
            padding:30px;
            border-radius:15px;
            text-align:center;
            width:400px;
            box-shadow:0 0 25px #00f2ff40;
          }
          a{
            display:inline-block;
            margin-top:15px;
            padding:10px 20px;
            background:#00f2ff;
            color:black;
            text-decoration:none;
            border-radius:8px;
            font-weight:bold;
          }
        </style>
      </head>
      <body>
        <div class="box">
          <h2>🚀 KEY ĐÃ ĐƯỢC TẠO</h2>
          <p>Key hợp lệ trong 2 giờ</p>
          <a href="${shortLink}" target="_blank">
            NHẤN ĐỂ VƯỢT LINK
          </a>
        </div>
      </body>
      </html>
    `);

  } catch (e) {
    res.send("Server error");
  }
});

// =================================
// =================================
// 🔥 GET KEY SAU KHI VƯỢT LINK4M
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

  const expire = keys[key].expire;

  res.send(`
  <!DOCTYPE html>
  <html>
  <head>
    <title>AXL KEY SYSTEM</title>
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>
      body{
        margin:0;
        background:linear-gradient(135deg,#0f172a,#1e293b);
        font-family:Arial, sans-serif;
        color:white;
        display:flex;
        justify-content:center;
        align-items:center;
        height:100vh;
      }
      .card{
        background:#111827;
        padding:40px;
        border-radius:20px;
        width:420px;
        text-align:center;
        box-shadow:0 0 40px #00f2ff40;
        animation:fadeIn 0.6s ease;
      }
      @keyframes fadeIn{
        from{opacity:0;transform:translateY(20px)}
        to{opacity:1;transform:translateY(0)}
      }
      .key-box{
        background:#0f172a;
        padding:15px;
        margin:20px 0;
        border-radius:12px;
        font-size:22px;
        font-weight:bold;
        letter-spacing:2px;
        border:1px solid #00f2ff50;
      }
      button{
        background:#00f2ff;
        color:black;
        border:none;
        padding:12px 25px;
        border-radius:10px;
        font-weight:bold;
        cursor:pointer;
        transition:0.2s;
      }
      button:hover{
        background:#00c2cc;
        transform:scale(1.05);
      }
      .timer{
        margin-top:15px;
        font-size:14px;
        color:#94a3b8;
      }
      .success{
        color:#22c55e;
        font-size:14px;
        margin-top:10px;
        display:none;
      }
    </style>
  </head>
  <body>
    <div class="card">
      <h2>🔑 KEY CỦA BẠN</h2>

      <div class="key-box" id="keyText">${key}</div>

      <button onclick="copyKey()">SAO CHÉP KEY</button>

      <div class="success" id="copied">✔ Đã sao chép thành công</div>

      <div class="timer">
        Hết hạn sau: <span id="countdown"></span>
      </div>
    </div>

    <script>
      const expireTime = ${expire};

      function copyKey(){
        const key = document.getElementById("keyText").innerText;
        navigator.clipboard.writeText(key);
        document.getElementById("copied").style.display = "block";
      }

      function updateCountdown(){
        const now = Date.now();
        const distance = expireTime - now;

        if(distance <= 0){
          document.getElementById("countdown").innerText = "ĐÃ HẾT HẠN";
          return;
        }

        const hours = Math.floor(distance / (1000*60*60));
        const minutes = Math.floor((distance % (1000*60*60)) / (1000*60));
        const seconds = Math.floor((distance % (1000*60)) / 1000);

        document.getElementById("countdown").innerText =
          hours + "h " + minutes + "m " + seconds + "s";
      }

      setInterval(updateCountdown, 1000);
      updateCountdown();
    </script>
  </body>
  </html>
  `);
});
