// STORYBOARD: renderiza quadros-chave de cada cena e monta uma prancha para revisão.
// Uso: npm run storyboard -- <episodio> [--per 3] [--shots s01,s04]
import { bundle } from "@remotion/bundler";
import { renderStill, selectComposition } from "@remotion/renderer";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const args = process.argv.slice(2);
const ep = args[0];
if (!ep) throw new Error("uso: npm run storyboard -- <episodio>");
const per = Number(args[args.indexOf("--per") + 1] || 3) || 3;
const only = args.includes("--shots") ? args[args.indexOf("--shots") + 1].split(",") : null;
const tl = JSON.parse(fs.readFileSync(`episodes/${ep}/generated/timeline.json`, "utf8"));
const script = JSON.parse(fs.readFileSync(`episodes/${ep}/script.json`, "utf8"));
const out = path.resolve(`storyboards/${ep}`);
fs.mkdirSync(out, { recursive: true });
const browserExecutable = process.env.BSE_CHROME || undefined;

console.log("• empacotando…");
const serveUrl = await bundle({ entryPoint: path.resolve("src/index.ts"), publicDir: path.resolve("public") });
const composition = await selectComposition({ serveUrl, id: ep, inputProps: { episodeId: ep, muted: true }, browserExecutable });
const fps = tl.fps;
const frames = [];
for (const s of tl.shots) {
  if (only && !only.includes(s.id)) continue;
  const a = Math.round(s.start * fps), b = Math.round(s.end * fps);
  for (let k = 0; k < per; k++) {
    const f = Math.min(b - 1, Math.round(a + (b - a) * ((k + 0.5) / per)));
    frames.push({ shot: s.id, k, f });
  }
}
for (const fr of frames) {
  const file = path.join(out, `${fr.shot}_${fr.k}.jpg`);
  await renderStill({ composition, serveUrl, output: file, frame: fr.f, imageFormat: "jpeg", jpegQuality: 80, scale: 0.5, inputProps: { episodeId: ep, muted: true }, browserExecutable });
  process.stdout.write(`  ${fr.shot} f${fr.f}\r`);
}
fs.writeFileSync(path.join(out, "frames.json"), JSON.stringify({ frames, per, script, timeline: tl }, null, 1));
execFileSync("python3", ["scripts/contact_sheet.py", out], { stdio: "inherit" });
