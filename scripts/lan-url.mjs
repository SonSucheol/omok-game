import os from "node:os";

const port = process.env.PORT ?? "3000";

function getLanIpv4() {
  const interfaces = os.networkInterfaces();
  for (const entries of Object.values(interfaces)) {
    if (!entries) {
      continue;
    }
    for (const entry of entries) {
      if (entry.family === "IPv4" && !entry.internal) {
        return entry.address;
      }
    }
  }
  return null;
}

const ip = getLanIpv4();
if (ip) {
  const slug = ip.replace(/\./g, "-");
  console.log("");
  console.log("=== 같은 Wi-Fi (PC + 모바일) ===");
  console.log(`  http://${ip}:${port}`);
  console.log(`  http://${slug}.sslip.io:${port}  (무료 LAN 도메인)`);
  console.log("");
} else {
  console.log("LAN IP를 찾지 못했습니다.");
}

console.log("=== 다른 네트워크 (LTE 등) ===");
console.log("  npm run dev:public 실행 후 trycloudflare.com 주소 사용");
console.log("");
