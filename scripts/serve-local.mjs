// A loopback-only front door for the built app, preserving the dev user's data.
import http from "node:http";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));
const worker = spawn(process.execPath, ["--import", "./scripts/sites-env.mjs",
  "./node_modules/wrangler/bin/wrangler.js", "dev", "--config", "dist/server/wrangler.json",
  "--local", "--persist-to", ".wrangler/state", "--ip", "127.0.0.1",
  "--inspector-port", "0", "--port", "5174"], { cwd: root, stdio: "inherit" });

const server = http.createServer((req, res) => {
  const url = new URL(req.url, "http://localhost:5173");
  if (!["localhost:5173", "127.0.0.1:5173"].includes(req.headers.host)) {
    res.writeHead(403).end(); return;
  }
  const auth = ["/signin-with-chatgpt", "/signout-with-chatgpt"].includes(url.pathname);
  if (auth) {
    if ((req.headers.origin && req.headers.origin !== `http://${req.headers.host}`)
      || req.headers["sec-fetch-site"] === "cross-site") {
      res.writeHead(403).end(); return;
    }
    if (req.method !== "GET" && !(url.pathname === "/signout-with-chatgpt" && req.method === "POST")) {
      res.writeHead(405).end(); return;
    }
    let target;
    try { target = new URL(url.searchParams.get("return_to") || "/", url.origin); }
    catch { target = new URL("/", url.origin); }
    if (target.origin !== url.origin || ["/signin-with-chatgpt", "/signout-with-chatgpt", "/callback"].includes(target.pathname)) target = new URL("/", url.origin);
    const signIn = url.pathname === "/signin-with-chatgpt";
    res.writeHead(302, { Location: target.pathname + target.search + target.hash,
      "Cache-Control": "private, no-store",
      "Set-Cookie": `__sites_local_auth=${signIn ? "1" : ""}; Path=/; HttpOnly; SameSite=Lax${signIn ? "" : "; Max-Age=0"}` }).end();
    return;
  }
  const headers = { ...req.headers };
  for (const key of Object.keys(headers)) if (key.startsWith("oai-authenticated-user-")) delete headers[key];
  const cookies = (headers.cookie || "").split(";").map(value => value.trim());
  if (cookies.filter(value => value.startsWith("__sites_local_auth=")).join() === "__sites_local_auth=1") {
    headers["oai-authenticated-user-id"] = "local_seedy";
    headers["oai-authenticated-user-email"] = "seedy@sites.test";
    headers["oai-authenticated-user-full-name"] = "Seedy";
    headers["oai-authenticated-user-full-name-encoding"] = "percent-encoded-utf-8";
  }
  headers.cookie = cookies.filter(value => !value.startsWith("__sites_local_auth=")).join("; ");
  const upstream = http.request({ hostname: "127.0.0.1", port: 5174,
    path: req.url, method: req.method, headers }, response => {
    res.writeHead(response.statusCode, response.headers); response.pipe(res);
  });
  upstream.setTimeout(30000, () => upstream.destroy());
  upstream.on("error", () => {
    if (!res.headersSent) res.writeHead(503, { "Content-Type": "text/plain" });
    res.end("Meal Fold is starting. Refresh this page in a moment.");
  });
  req.pipe(upstream);
});
server.on("error", error => { console.error(error.message); worker.kill(); process.exitCode = 1; });
server.listen(5173, "127.0.0.1", () => console.log("Meal Fold: http://localhost:5173/"));
worker.on("exit", code => { server.close(); process.exit(code ?? 1); });
for (const signal of ["SIGINT", "SIGTERM"]) process.on(signal, () => worker.kill(signal));
