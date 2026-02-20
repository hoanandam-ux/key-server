const fs = require("fs");

function loadKeys() {
  if (!fs.existsSync("keys.json")) return {};
  return JSON.parse(fs.readFileSync("keys.json"));
}

function saveKeys(data) {
  fs.writeFileSync("keys.json", JSON.stringify(data, null, 2));
}

module.exports = { loadKeys, saveKeys };
