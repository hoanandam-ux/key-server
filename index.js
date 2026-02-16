const express = require("express");
const { v4: uuidv4 } = require("uuid");
const axios = require("axios");

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3000;

// Lưu key tạm (RAM)
let keys = {};

// ===== XÓA KEY HẾT HẠN =====
setInterval(() => {
  const now = Date.now();
  for (let key in keys) {
    if (keys[key].expire < now) {
      delete keys[key];
    }
  }
}, 60000);

// ===== TẠO KEY + LINK4M =====
app.get("/create", async (req, res) => {
  try {
    const key = "AXL-" + uuidv4().slice(0, 8).toUpperCase();
    const expire = Date.now() + (2 * 60 * 60 * 1000); // 2 giờ

    keys[key] = {
      expire: expire,
      used: false
    };

    // ===== LINK4M API =====
    const apiToken = "687f718ea1faab07844af330";
    const targetUrl = `https://yourdomain.com/getkey?key=${key}`;

    const apiUrl = `https://link4m.co/api-shorten/v2?api=${apiToken}&url=${encodeURIComponent(targetUrl)}`;

    const response = await axios.get(apiUrl);

    if (response.data.status !== "success") {
      return res.json({ error: "link4m_failed" });
    }

    res.json({
      key: key,
      short_link: response.data.shortenedUrl,
      expire: expire
    });

  } catch (e) {
    res.json({ error: "server_error" });
  }
});

// ===== VERIFY KEY =====
app.get("/verify", (req, res) => {
  const { key } = req.query;

  if (!keys[key]) {
    return res.json({ status: "invalid" });
  }

  if (Date.now() > keys[key].expire) {
    delete keys[key];
    return res.json({ status: "expired" });
  }

  res.json({ status: "valid" });
});

app.listen(PORT, () => {
  console.log("Server running");
});

