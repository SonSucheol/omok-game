import { execSync, spawn } from "node:child_process";
import { rmSync } from "node:fs";

function killPort3000() {
  if (process.platform !== "win32") {
    return;
  }

  try {
    const output = execSync("netstat -ano | findstr :3000", {
      encoding: "utf8",
      stdio: ["pipe", "pipe", "ignore"],
    });

    const pids = new Set();
    for (const line of output.split("\n")) {
      if (!line.includes("LISTENING")) {
        continue;
      }
      const parts = line.trim().split(/\s+/);
      const pid = parts.at(-1);
      if (pid && pid !== "0") {
        pids.add(pid);
      }
    }

    for (const pid of pids) {
      try {
        execSync(`taskkill /PID ${pid} /F`, { stdio: "ignore" });
        console.log(`> stopped process on port 3000 (PID ${pid})`);
      } catch {
        // already exited
      }
    }
  } catch {
    // nothing listening
  }
}

killPort3000();

try {
  rmSync(".next", { recursive: true, force: true });
  console.log("> removed .next cache");
} catch {
  // ignore
}

execSync("node scripts/lan-url.mjs", { stdio: "inherit" });

const child = spawn("tsx", ["server.ts"], {
  stdio: "inherit",
  shell: true,
});

child.on("exit", (code) => {
  process.exit(code ?? 0);
});
