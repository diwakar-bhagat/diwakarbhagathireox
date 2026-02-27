import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";
import { createRequire } from "node:module";

if (!(process.platform === "linux" && process.arch === "x64")) {
  process.exit(0);
}

const require = createRequire(import.meta.url);
const nativePackageName = "lightningcss-linux-x64-gnu";

const run = (command) => {
  console.log(`[build] ${command}`);
  execSync(command, { stdio: "inherit" });
};

const resolveLightningPackage = () => {
  try {
    return require.resolve("lightningcss/package.json");
  } catch {
    throw new Error("Unable to resolve lightningcss package. Ensure dependencies are installed first.");
  }
};

const getLightningDetails = () => {
  const packagePath = resolveLightningPackage();
  const packageJson = JSON.parse(fs.readFileSync(packagePath, "utf8"));
  const packageDir = path.dirname(packagePath);
  const binaryPath = path.join(packageDir, "node", "lightningcss.linux-x64-gnu.node");
  const nativeVersion = packageJson.optionalDependencies?.[nativePackageName] || packageJson.version;
  return {
    binaryPath,
    packageVersion: packageJson.version,
    nativeVersion,
  };
};

const canLoadLightningCss = () => {
  try {
    require("lightningcss");
    return true;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.warn(`[build] lightningcss load failed: ${message}`);
    return false;
  }
};

const isHealthy = () => {
  const details = getLightningDetails();
  const hasBinary = fs.existsSync(details.binaryPath);
  const loads = canLoadLightningCss();
  return hasBinary && loads;
};

if (isHealthy()) {
  process.exit(0);
}

const details = getLightningDetails();
console.warn(
  `[build] Missing or broken lightningcss Linux native binary at ${details.binaryPath}. Attempting repair...`
);

try {
  run("npm rebuild lightningcss");
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  console.warn(`[build] npm rebuild lightningcss failed: ${message}`);
}

if (isHealthy()) {
  process.exit(0);
}

try {
  run(
    `npm install --no-save --no-package-lock --include=optional ${nativePackageName}@${details.nativeVersion}`
  );
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  console.warn(`[build] native package install failed: ${message}`);
}

if (isHealthy()) {
  process.exit(0);
}

try {
  run(
    `npm install --no-save --no-package-lock --include=optional lightningcss@${details.packageVersion}`
  );
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  console.warn(`[build] lightningcss reinstall failed: ${message}`);
}

if (!isHealthy()) {
  throw new Error(
    "Unable to recover lightningcss Linux native binary. Re-run install with: npm ci --include=optional"
  );
}
