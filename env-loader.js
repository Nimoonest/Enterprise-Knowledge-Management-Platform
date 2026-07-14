const fs = require("fs");

function loadEnvFile(filePath, env = process.env) {
  if (!fs.existsSync(filePath)) return false;
  const lines = fs.readFileSync(filePath, "utf8").split(/\r?\n/);
  lines.forEach((line) => {
    const value = line.trim();
    if (!value || value.startsWith("#")) return;
    const separator = value.indexOf("=");
    if (separator < 1) return;
    const key = value.slice(0, separator).trim();
    let content = value.slice(separator + 1).trim();
    if ((content.startsWith('"') && content.endsWith('"')) || (content.startsWith("'") && content.endsWith("'"))) content = content.slice(1, -1);
    if (env[key] === undefined) env[key] = content;
  });
  return true;
}

module.exports = { loadEnvFile };
