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

  res.send(`
    <html>
      <body style="background:#0f172a;color:white;font-family:Arial;text-align:center;padding-top:100px;">
        <h2>🔑 KEY CỦA BẠN</h2>
        <h1>${key}</h1>
        <p>Hạn: 2 giờ</p>
      </body>
    </html>
  `);
});

// =================================
// 🔥 VERIFY
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

app.listen(PORT, () => {
  console.log("Server running");
});
