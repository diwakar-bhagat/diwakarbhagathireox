import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";

const cwd = process.cwd();
const oxideDir = path.join(cwd, "node_modules", "@tailwindcss", "oxide");
const oxidePkgPath = path.join(oxideDir, "package.json");
const lockPath = path.join(cwd, "package-lock.json");
const gnuPkgDir = path.join(cwd, "node_modules", "@tailwindcss", "oxide-linux-x64-gnu");
const muslPkgDir = path.join(cwd, "node_modules", "@tailwindcss", "oxide-linux-x64-musl");

function exists(targetPath) {
  try {
    fs.accessSync(targetPath);
    return true;
  } catch {
    return false;
  }
}

function listDirSafe(targetPath) {
  try {
    return fs.readdirSync(targetPath);
  } catch {
    return null;
  }
}

function runNpm(args) {
  execFileSync("npm", args, { stdio: "inherit", cwd });
}

function collectNodeFiles(baseDir, depth = 2) {
  if (!exists(baseDir)) {
    return [];
  }
  const results = [];
  const queue = [{ dir: baseDir, level: 0 }];

  while (queue.length > 0) {
    const current = queue.shift();
    if (!current) {
      continue;
    }

    let entries = [];
    try {
      entries = fs.readdirSync(current.dir, { withFileTypes: true });
    } catch {
      continue;
    }

    for (const entry of entries) {
      const fullPath = path.join(current.dir, entry.name);
      if (entry.isFile() && entry.name.endsWith(".node")) {
        results.push(fullPath);
      } else if (entry.isDirectory() && current.level < depth) {
        queue.push({ dir: fullPath, level: current.level + 1 });
      }
    }
  }

  return results;
}

function readOxideVersion() {
  if (exists(oxidePkgPath)) {
    const oxidePackage = JSON.parse(fs.readFileSync(oxidePkgPath, "utf8"));
    if (oxidePackage?.version) {
      return oxidePackage.version;
    }
  }

  if (exists(lockPath)) {
    const lock = JSON.parse(fs.readFileSync(lockPath, "utf8"));
    const packageVersion = lock?.packages?.["node_modules/@tailwindcss/oxide"]?.version;
    if (packageVersion) {
      return packageVersion;
    }
  }

  return "";
}

function hasOxideBinding() {
  const directBindings = collectNodeFiles(oxideDir, 1);
  const gnuBindings = collectNodeFiles(gnuPkgDir, 2);
  const muslBindings = collectNodeFiles(muslPkgDir, 2);

  const allBindings = [...directBindings, ...gnuBindings, ...muslBindings];
  return allBindings.length > 0 ? allBindings[0] : null;
}

(function main() {
  if (process.platform !== "linux" || process.arch !== "x64") {
    console.log("[native-deps] Non-linux-x64 environment; skipping tailwind oxide check.");
    process.exit(0);
  }

  if (!exists(oxidePkgPath)) {
    throw new Error("[native-deps] @tailwindcss/oxide is missing from node_modules.");
  }

  const binding = hasOxideBinding();
  if (binding) {
    console.log(`[native-deps] tailwind oxide native binding OK: ${binding}`);
    process.exit(0);
  }

  console.log("[native-deps] tailwind oxide native binding missing. Attempting repair...");
  console.log("[native-deps] @tailwindcss/oxide dir listing:", listDirSafe(oxideDir));
  console.log("[native-deps] @tailwindcss/oxide-linux-x64-gnu dir listing:", listDirSafe(gnuPkgDir));
  console.log("[native-deps] @tailwindcss/oxide-linux-x64-musl dir listing:", listDirSafe(muslPkgDir));

  try {
    runNpm(["rebuild", "@tailwindcss/oxide"]);
  } catch {
    console.warn("[native-deps] npm rebuild @tailwindcss/oxide failed; continuing with install recovery.");
  }

  const bindingAfterRebuild = hasOxideBinding();
  if (bindingAfterRebuild) {
    console.log(`[native-deps] tailwind oxide repaired via rebuild: ${bindingAfterRebuild}`);
    process.exit(0);
  }

  const version = readOxideVersion();
  if (!version) {
    throw new Error("[native-deps] Unable to determine @tailwindcss/oxide version for recovery.");
  }
  console.log(`[native-deps] @tailwindcss/oxide version detected: ${version}`);

  try {
    runNpm(["install", "--no-save", "--include=optional", `@tailwindcss/oxide-linux-x64-gnu@${version}`]);
  } catch {
    console.warn("[native-deps] gnu package install failed; trying musl package.");
    runNpm(["install", "--no-save", "--include=optional", `@tailwindcss/oxide-linux-x64-musl@${version}`]);
  }

  const bindingAfterInstall = hasOxideBinding();
  if (bindingAfterInstall) {
    console.log(`[native-deps] tailwind oxide repaired via explicit platform install: ${bindingAfterInstall}`);
    process.exit(0);
  }

  console.log("[native-deps] @tailwindcss/oxide dir listing (final):", listDirSafe(oxideDir));
  console.log("[native-deps] @tailwindcss/oxide-linux-x64-gnu dir listing (final):", listDirSafe(gnuPkgDir));
  console.log("[native-deps] @tailwindcss/oxide-linux-x64-musl dir listing (final):", listDirSafe(muslPkgDir));
  throw new Error("[native-deps] tailwind oxide native binding still missing after repair attempts.");
})();
