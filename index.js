const express = require("express");
const { v4: uuidv4 } = require("uuid");

const app = express();
app.use(express.json());

let keys = {};

function getClientIP(req) {
  return req.headers["x-forwarded-for"] || req.socket.remoteAddress;
}

app.get("/", (req, res) => {
  res.send("Server is running");
});

app.get("/create", (req, res) => {
  const ip = getClientIP(req);
  const key = uuidv4();

  keys[key] = {
    ip: ip,
    expire: Date.now() + 2 * 60 * 60 * 1000
  };

  res.json({
    key: key,
    expire: "2 hours"
  });
});

app.get("/verify", (req, res) => {
  const { key } = req.query;
  const ip = getClientIP(req);

  if (!keys[key]) return res.json({ status: "invalid" });
  if (keys[key].ip !== ip) return res.json({ status: "wrong_ip" });
  if (Date.now() > keys[key].expire) {
    delete keys[key];
    return res.json({ status: "expired" });
  }

  res.json({ status: "valid" });
});

app.listen(3000, () => {
  console.log("Server running on port 3000");
});
