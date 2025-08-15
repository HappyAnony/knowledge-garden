import { readFileSync, writeFileSync } from "fs";

const pkgPath = new URL("./package.json", import.meta.url);
const manifestPath = new URL("./manifest.json", import.meta.url);

const pkg = JSON.parse(readFileSync(pkgPath, "utf8"));
const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));

if (manifest.version !== pkg.version) {
  manifest.version = pkg.version;
  writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
  console.log(`[smart-canvas] manifest version bumped to ${pkg.version}`);
} else {
  console.log("[smart-canvas] manifest already in sync");
}


