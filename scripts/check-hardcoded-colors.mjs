#!/usr/bin/env node
/**
 * Fails when app/ or components/ contain hardcoded hex colors outside token files.
 * Allowed: app/globals.css (and any *tokens* / *theme* css under app/).
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const HEX = /#[0-9a-fA-F]{3,8}\b/g;

const allow = (rel) => {
  const n = rel.replace(/\\/g, "/");
  if (n === "app/globals.css") return true;
  if (/^app\/.*tokens.*\.css$/i.test(n)) return true;
  if (/^app\/.*theme.*\.css$/i.test(n)) return true;
  // Thermal / document print styles need pure black/white for printers.
  if (/print/i.test(n) && n.endsWith(".css")) return true;
  return false;
};

const hits = [];

const walk = (dir, base) => {
  for (const name of readdirSync(dir)) {
    if (name === "node_modules" || name === ".next") continue;
    const full = path.join(dir, name);
    const st = statSync(full);
    if (st.isDirectory()) {
      walk(full, base);
      continue;
    }
    if (!/\.(ts|tsx|js|jsx|css)$/.test(name)) continue;
    const rel = path.relative(root, full);
    if (allow(rel)) continue;
    const text = readFileSync(full, "utf8");
    let m;
    HEX.lastIndex = 0;
    while ((m = HEX.exec(text))) {
      const line = text.slice(0, m.index).split("\n").length;
      hits.push(`${rel.replace(/\\/g, "/")}:${line}: ${m[0]}`);
    }
  }
};

walk(path.join(root, "app"), "app");
walk(path.join(root, "components"), "components");

if (hits.length === 0) {
  console.log("check-hardcoded-colors: ok (no hex colors outside tokens)");
  process.exit(0);
}

console.error("Hardcoded hex colors found outside token files:");
for (const h of hits) console.error(`  ${h}`);
process.exit(1);
