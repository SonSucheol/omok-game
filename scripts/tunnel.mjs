import { spawn } from "node:child_process";

const port = process.env.PORT ?? "3000";
// Use 127.0.0.1 — on Windows, localhost often resolves to ::1 and
// cloudflared gets Bad Gateway if the app only listens on IPv4.
const target = `http://127.0.0.1:${port}`;

console.log("");
console.log(`> Cloudflare 무료 터널 시작 중... (${target})`);
console.log("> 잠시 후 https://xxxx.trycloudflare.com 주소가 표시됩니다.");
console.log("> PC·모바일 모두 그 주소로 접속하세요.");
console.log("");

const child = spawn(
  "npx",
  ["--yes", "cloudflared", "tunnel", "--url", target],
  {
    stdio: ["inherit", "pipe", "pipe"],
    shell: true,
  },
);

const urlPattern = /https:\/\/[a-z0-9-]+\.trycloudflare\.com/gi;

function announceUrl(chunk) {
  const text = chunk.toString();
  process.stdout.write(text);
  const matches = text.match(urlPattern);
  if (matches?.length) {
    const url = matches[matches.length - 1];
    console.log("");
    console.log("========================================");
    console.log("  접속 주소 (PC·모바일 공통)");
    console.log(`  ${url}`);
    console.log("  온라인 대전: " + url + "/online");
    console.log("========================================");
    console.log("");
  }
}

child.stdout?.on("data", announceUrl);
child.stderr?.on("data", announceUrl);

child.on("exit", (code) => {
  process.exit(code ?? 0);
});
