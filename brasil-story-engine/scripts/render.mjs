// RENDER FINAL: 1920x1080 · 30 fps · H.264 · AAC estéreo
// Uso: npm run render -- <episodio> [--draft]   (--draft = metade da resolução, rápido)
import { bundle } from "@remotion/bundler";
import { renderMedia, renderStill, selectComposition } from "@remotion/renderer";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";

const [ep, ...flags] = process.argv.slice(2);
if (!ep) throw new Error("uso: npm run render -- <episodio>");
const draft = flags.includes("--draft");
const browserExecutable = process.env.BSE_CHROME || undefined;
const outDir = path.resolve(`out/${ep}`);
fs.mkdirSync(outDir, { recursive: true });
const serveUrl = await bundle({ entryPoint: path.resolve("src/index.ts"), publicDir: path.resolve("public") });
const composition = await selectComposition({ serveUrl, id: ep, inputProps: { episodeId: ep }, browserExecutable });
const output = path.join(outDir, draft ? `${ep}-draft.mp4` : `${ep}.mp4`);
const t0 = Date.now();
await renderMedia({
  composition, serveUrl, codec: "h264", outputLocation: output, browserExecutable,
  inputProps: { episodeId: ep },
  crf: draft ? 28 : 18, scale: draft ? 0.5 : 1,
  audioCodec: "aac", audioBitrate: "192k",
  concurrency: Math.max(1, Math.min(8, os.cpus().length)),
  x264Preset: draft ? "veryfast" : "medium",
  onProgress: ({ progress }) => process.stdout.write(`\r  render ${(progress * 100).toFixed(1)}%   `),
});
if (!fs.existsSync(output)) throw new Error("render terminou mas o arquivo não existe: " + output);
console.log(`\n✔ vídeo: ${output} (${(fs.statSync(output).size / 1e6).toFixed(1)} MB, ${((Date.now() - t0) / 1000).toFixed(0)}s)`);
try {
  const thumb = await selectComposition({ serveUrl, id: `${ep}-thumb`, browserExecutable });
  await renderStill({ composition: thumb, serveUrl, output: path.join(outDir, "thumbnail.png"), browserExecutable });
  console.log(`✔ thumbnail: ${path.join(outDir, "thumbnail.png")}`);
} catch (e) { console.log("(sem thumbnail)", e.message); }
