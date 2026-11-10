import fs from "node:fs";

const toml = fs.readFileSync(new URL("../wrangler.toml", import.meta.url), "utf8");
const hasMain = /^main\s*=/m.test(toml);
const hasPagesDir = /^pages_build_output_dir\s*=\s*"dist"/m.test(toml);
const hasProject = /^name\s*=\s*"thevault-77h"/m.test(toml);

if (hasMain) {
  console.error("wrangler.toml must not set main. Pages Functions live in functions/.");
  process.exit(1);
}

if (!hasPagesDir) {
  console.error('wrangler.toml must set pages_build_output_dir = "dist".');
  process.exit(1);
}

if (!hasProject) {
  console.error('wrangler.toml name must be the Pages project "thevault-77h".');
  process.exit(1);
}

console.log("Pages config ok: thevault-77h, dist, no Worker main.");
