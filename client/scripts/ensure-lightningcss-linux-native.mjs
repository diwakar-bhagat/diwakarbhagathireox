import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";

const cwd = process.cwd(); // Render root dir is client/, so this should be .../client
const pkgDir = path.join(cwd, "node_modules", "lightningcss");
const pkgJson = path.join(pkgDir, "package.json");

function exists(p) {
  try {
    fs.accessSync(p);
    return true;
  } catch {
    return false;
  }
}

function runNpm(args) {
  execFileSync("npm", args, { stdio: "inherit", cwd });
}

function listDirSafe(dir) {
  try {
    return fs.readdirSync(dir);
  } catch {
    return null;
  }
}

function findNativeBinary() {
  const candidates = [
    path.join(pkgDir, "lightningcss.linux-x64-gnu.node"),
    path.join(pkgDir, "node", "lightningcss.linux-x64-gnu.node"),
    path.join(pkgDir, "lightningcss.linux-x64-musl.node"),
    path.join(pkgDir, "node", "lightningcss.linux-x64-musl.node"),
  ];
  return candidates.find(exists) || null;
}

(function main() {
  // Only enforce on Render-like linux x64
  if (process.platform !== "linux" || process.arch !== "x64") {
    console.log("[native-deps] Non-linux-x64 environment; skipping lightningcss check.");
    process.exit(0);
  }

  // If lightningcss isn't installed, don't fail the build here.
  // It might be a transitive dep that isn't required depending on configuration.
  if (!exists(pkgJson)) {
    console.log("[native-deps] lightningcss not found in node_modules; skipping check.");
    process.exit(0);
  }

  const found = findNativeBinary();
  if (found) {
    console.log(`[native-deps] lightningcss native binary OK: ${found}`);
    process.exit(0);
  }

  console.log("[native-deps] lightningcss native binary missing. Attempting repair...");
  console.log("[native-deps] lightningcss dir listing:", listDirSafe(pkgDir));
  console.log("[native-deps] lightningcss/node dir listing:", listDirSafe(path.join(pkgDir, "node")));

  // Attempt 1: rebuild
  try {
    runNpm(["rebuild", "lightningcss"]);
  } catch {
    console.warn("[native-deps] npm rebuild lightningcss failed; continuing to reinstall attempt.");
  }

  const foundAfterRebuild = findNativeBinary();
  if (foundAfterRebuild) {
    console.log(`[native-deps] lightningcss repaired via rebuild: ${foundAfterRebuild}`);
    process.exit(0);
  }

  // Attempt 2: reinstall optional deps
  runNpm(["install", "--include=optional"]);

  const foundAfterInstall = findNativeBinary();
  if (foundAfterInstall) {
    console.log(`[native-deps] lightningcss repaired via reinstall: ${foundAfterInstall}`);
    process.exit(0);
  }

  console.log("[native-deps] lightningcss dir listing (final):", listDirSafe(pkgDir));
  console.log("[native-deps] lightningcss/node dir listing (final):", listDirSafe(path.join(pkgDir, "node")));

  throw new Error("[native-deps] lightningcss native binary still missing after repair attempts.");
})();
