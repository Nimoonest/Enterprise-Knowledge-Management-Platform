const http = require("http");
const fs = require("fs");
const path = require("path");
const { spawn } = require("child_process");

const root = __dirname;
const port = Number(process.env.PORT || 5178);

const mimeTypes = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".md": "text/plain; charset=utf-8",
  ".json": "application/json; charset=utf-8",
};

function send(res, status, body, type = "application/json; charset=utf-8") {
  res.writeHead(status, {
    "Content-Type": type,
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  });
  res.end(body);
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", (chunk) => {
      body += chunk;
      if (body.length > 1024 * 1024) {
        reject(new Error("Request body too large"));
        req.destroy();
      }
    });
    req.on("end", () => resolve(body));
    req.on("error", reject);
  });
}

function callMaxKB(payload) {
  return new Promise((resolve, reject) => {
    const child = spawn("wsl.exe", [
      "-d",
      "Ubuntu-22.04",
      "-u",
      "root",
      "--",
      "docker",
      "exec",
      "-i",
      "maxkb",
      "python",
      "/tmp/maxkb_call_app.py",
    ]);

    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (data) => {
      stdout += data.toString();
    });
    child.stderr.on("data", (data) => {
      stderr += data.toString();
    });
    child.on("error", reject);
    child.on("close", (code) => {
      if (code !== 0) {
        reject(new Error(stderr || `MaxKB process exited with ${code}`));
        return;
      }
      const jsonLine = stdout.trim().split(/\r?\n/).reverse().find((line) => line.trim().startsWith("{"));
      if (!jsonLine) {
        reject(new Error(`No JSON returned from MaxKB. Output: ${stdout.slice(-800)}`));
        return;
      }
      try {
        resolve(JSON.parse(jsonLine));
      } catch (error) {
        reject(new Error(`Invalid JSON from MaxKB: ${error.message}`));
      }
    });
    child.stdin.write(JSON.stringify(payload));
    child.stdin.end();
  });
}

const server = http.createServer(async (req, res) => {
  if (req.method === "OPTIONS") {
    send(res, 204, "");
    return;
  }

  if (req.method === "POST" && req.url === "/api/chat") {
    try {
      const payload = JSON.parse(await readBody(req));
      if ((!payload.app_name && !payload.app_id) || !payload.message) {
        send(res, 400, JSON.stringify({ error: "app_name/app_id and message are required" }));
        return;
      }
      const result = await callMaxKB(payload);
      send(res, 200, JSON.stringify(result));
    } catch (error) {
      send(res, 500, JSON.stringify({ error: error.message }));
    }
    return;
  }

  const urlPath = req.url === "/" ? "/index.html" : decodeURIComponent(req.url.split("?")[0]);
  const filePath = path.normalize(path.join(root, urlPath));
  if (!filePath.startsWith(root)) {
    send(res, 403, "Forbidden", "text/plain; charset=utf-8");
    return;
  }
  fs.readFile(filePath, (error, data) => {
    if (error) {
      send(res, 404, "Not found", "text/plain; charset=utf-8");
      return;
    }
    send(res, 200, data, mimeTypes[path.extname(filePath)] || "application/octet-stream");
  });
});

server.listen(port, () => {
  console.log(`MaxKB demo frontend running at http://localhost:${port}`);
});

