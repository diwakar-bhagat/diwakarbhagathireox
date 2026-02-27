import path from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";

const currentFile = fileURLToPath(import.meta.url);
const scriptsDir = path.dirname(currentFile);

const runScript = (scriptName) => {
  const scriptPath = path.join(scriptsDir, scriptName);
  execFileSync(process.execPath, [scriptPath], { stdio: "inherit" });
};

runScript("ensure-tailwind-oxide-linux-native.mjs");
runScript("ensure-lightningcss-linux-native.mjs");
runScript("ensure-rollup-linux-native.mjs");
