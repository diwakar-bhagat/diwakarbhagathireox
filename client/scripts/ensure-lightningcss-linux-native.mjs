import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";

const cwd = process.cwd();
const pkgDir = path.join(cwd, "node_modules", "lightningcss");
const pkgJson = path.join(pkgDir, "package.json");

if (!(process.platform === "linux" && process.arch === "x64")) {
  process.exit(0);
}

const nativeBin = path.join(pkgDir, "lightningcss.linux-x64-gnu.node");

const exists = (targetPath) => {
  try {
    fs.accessSync(targetPath);
    return true;
  } catch {
    return false;
  }
};

const run = (command, args) => {
  execFileSync(command, args, { stdio: "inherit", cwd });
};

if (!exists(pkgJson)) {
  console.log("[native-deps] lightningcss not found in node_modules; skipping check.");
  process.exit(0);
}

if (exists(nativeBin)) {
  console.log("[native-deps] lightningcss native binary OK.");
  process.exit(0);
}

console.log("[native-deps] lightningcss native binary missing. Attempting repair...");

try {
  run("npm", ["rebuild", "lightningcss"]);
} catch {
  console.warn("[native-deps] npm rebuild lightningcss failed, trying reinstall with optional deps...");
}

if (exists(nativeBin)) {
  console.log("[native-deps] lightningcss repaired via rebuild.");
  process.exit(0);
}

run("npm", ["install", "--include=optional"]);

if (exists(nativeBin)) {
  console.log("[native-deps] lightningcss repaired via reinstall.");
  process.exit(0);
}

throw new Error("[native-deps] lightningcss native binary still missing after repair attempts.");
