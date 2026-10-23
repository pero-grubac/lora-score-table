import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";

const root = new URL("../", import.meta.url);
const read = (f) => readFileSync(new URL(f, root), "utf8");
const exists = (f) => existsSync(new URL(f.replace(/^\.\//, ""), root));

test("every file precached by the service worker exists", () => {
  const list = read("service-worker.js").match(/const SHELL = \[([\s\S]*?)\];/)[1];
  const files = [...list.matchAll(/"([^"]+)"/g)].map((m) => m[1]).filter((f) => f !== "./");
  assert.ok(files.length > 0);
  for (const f of files) assert.ok(exists(f), `${f} is missing`);
});

test("every manifest icon exists", () => {
  for (const icon of JSON.parse(read("manifest.json")).icons) {
    assert.ok(exists(icon.src), `${icon.src} is missing`);
  }
});

test("every font used in style.css is precached", () => {
  const sw = read("service-worker.js");
  for (const [, font] of read("style.css").matchAll(/url\(["']?(fonts\/[^"')]+)["']?\)/g)) {
    assert.ok(sw.includes(font), `${font} is not in SHELL`);
  }
});
