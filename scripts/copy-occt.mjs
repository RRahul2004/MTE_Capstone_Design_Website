// Copies the OpenCascade WASM used for in-browser STEP previews into /public.
import { copyFileSync, existsSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const source = join(root, "node_modules", "occt-import-js", "dist", "occt-import-js.wasm");
const target = join(root, "public", "occt");

if (existsSync(source)) {
  mkdirSync(target, { recursive: true });
  copyFileSync(source, join(target, "occt-import-js.wasm"));
} else {
  console.warn("occt-import-js is not installed; STEP previews will be unavailable.");
}
