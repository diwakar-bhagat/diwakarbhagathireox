import path from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";

const currentFile = fileURLToPath(import.meta.url);
const scriptsDir = path.dirname(currentFile);

const runScript = (scriptName) => {
  const scriptPath = path.join(scriptsDir, scriptName);
  try {
    execFileSync(process.execPath, [scriptPath], { stdio: "inherit" });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.warn(`[native-deps] ${scriptName} failed: ${message}`);
    console.warn("[native-deps] Continuing build; vite will validate runtime requirements.");
  }
};

runScript("ensure-lightningcss-linux-native.mjs");
runScript("ensure-rollup-linux-native.mjs");
