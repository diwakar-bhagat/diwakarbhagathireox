import fs from "node:fs";
import { execSync } from "node:child_process";
import { createRequire } from "node:module";

if (!(process.platform === "linux" && process.arch === "x64")) {
  process.exit(0);
}

const require = createRequire(import.meta.url);
const linuxNativePackage = "@rollup/rollup-linux-x64-gnu";

const resolvePackage = (packageName) => {
  try {
    return require.resolve(`${packageName}/package.json`);
  } catch {
    return null;
  }
};

if (resolvePackage(linuxNativePackage)) {
  process.exit(0);
}

let rollupVersion = "";
try {
  const rollupPackagePath = require.resolve("rollup/package.json");
  const rollupPackage = JSON.parse(fs.readFileSync(rollupPackagePath, "utf8"));
  rollupVersion = rollupPackage.version;
} catch {
  throw new Error("Unable to resolve installed rollup version before build.");
}

const versionedNativePackage = `${linuxNativePackage}@${rollupVersion}`;
console.warn(
  `[build] Missing ${linuxNativePackage}. Installing ${versionedNativePackage} to recover from optional dependency install issues.`
);

try {
  execSync(
    `npm install --no-save --no-package-lock --include=optional ${versionedNativePackage}`,
    { stdio: "inherit" }
  );
} catch {
  throw new Error(
    `Failed to install ${versionedNativePackage}. Re-run install with: npm ci --include=optional`
  );
}

if (!resolvePackage(linuxNativePackage)) {
  throw new Error(
    `Rollup native package still missing after recovery: ${linuxNativePackage}. Re-run install with: npm ci --include=optional`
  );
}
