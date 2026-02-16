const express = require("express");
const { v4: uuidv4 } = require("uuid");
const axios = require("axios");

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3000;

/* =====================================================
   🗂 BỘ NHỚ LƯU KEY & IP (RAM)
===================================================== */
let keys = {};
let ipStore = {};

/* =====================================================
   ⏳ TỰ ĐỘNG XOÁ KEY & IP HẾT HẠN (MỖI 60 GIÂY)
===================================================== */
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

/* =====================================================
   🔐 MÃ HOÁ & GIẢI MÃ KEY
===================================================== */
function encodeKey(key) {
  return Buffer.from(key).toString("base64");
}

function decodeKey(encoded) {
  return Buffer.from(encoded, "base64").toString("utf8");
}

/* =====================================================
   🚀 TRANG CHỦ – TẠO KEY (1 IP = 1 KEY)
===================================================== */
app.get("/", async (req, res) => {

  try {

    const userIP =
      req.headers["x-forwarded-for"] || req.socket.remoteAddress;

    const now = Date.now();

    // Nếu IP đã có key chưa hết hạn
    if (ipStore[userIP] && ipStore[userIP] > now) {
      return res.send("⚠ IP này đã tạo key. Vui lòng đợi hết hạn.");
    }

    // Tạo key mới
    const key = "AXL-" + uuidv4().slice(0, 8).toUpperCase();
    const expire = now + (2 * 60 * 60 * 1000); // 2 giờ

    keys[key] = {
      expire,
      used: false
    };

    ipStore[userIP] = expire;

    const encoded = encodeKey(key);

    // ===== LINK4M API =====
    const apiToken = process.env.LINK4M_TOKEN;
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
      <html>
      <body style="background:#0f172a;color:white;text-align:center;padding-top:100px;font-family:Arial">
      <h2>🚀 AXL DEV KEY SYSTEM</h2>
      <p>Key hợp lệ trong 2 giờ</p>
      <a href="${shortLink}" target="_blank"
         style="padding:12px 25px;background:#00f2ff;color:black;text-decoration:none;border-radius:10px;font-weight:bold">
         VƯỢT LINK ĐỂ LẤY KEY
      </a>
      </body>
      </html>
    `);

  } catch (e) {
    res.send("Server error");
  }
});

/* =====================================================
   🔥 GET KEY – KEY CHỈ DÙNG 1 LẦN
===================================================== */
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

  // Đánh dấu đã dùng
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
  </style>
  </head>

  <body>

  <div class="card">
    <h2>🔐 KEY ĐÃ SẴN SÀNG</h2>

    <div class="key-box" id="keyText">${key}</div>

    <button class="btn" onclick="copyKey()">SAO CHÉP KEY</button>

    <div class="copied" id="copiedMsg">✓ Đã sao chép</div>

    <div class="expire">
      Hết hạn sau: <span id="countdown"></span>
    </div>
  </div>

  <script>
  function copyKey(){
    const text = document.getElementById("keyText").innerText;
    navigator.clipboard.writeText(text);
    const msg = document.getElementById("copiedMsg");
    msg.style.display = "block";
    setTimeout(()=>{ msg.style.display = "none"; },2000);
  }

  const expireTime = ${expireTime};

  function updateCountdown(){
    const now = Date.now();
    const diff = expireTime - now;

    if(diff <= 0){
      document.getElementById("countdown").innerText = "ĐÃ HẾT HẠN";
      return;
    }

    const h = Math.floor(diff/(1000*60*60));
    const m = Math.floor((diff%(1000*60*60))/(1000*60));
    const s = Math.floor((diff%(1000*60))/1000);

    document.getElementById("countdown").innerText =
      h+"h "+m+"m "+s+"s";
  }

  setInterval(updateCountdown,1000);
  updateCountdown();
  </script>

  </body>
  </html>
  `);
});

/* =====================================================
   🔎 VERIFY API
===================================================== */
app.get("/verify", (req, res) => {

  const { key } = req.query;

  if (!keys[key]) {
    return res.json({ status: "invalid" });
  }

  if (Date.now() > keys[key].expire) {
    delete keys[key];
    return res.json({ status: "expired" });
  }

  if (keys[key].used === false) {
    return res.json({ status: "not_used_yet" });
  }

  res.json({
    status: "valid",
    expire: keys[key].expire
  });
});

/* ===================================================== */

app.listen(PORT, () => {
  console.log("Server running on port " + PORT);
});
