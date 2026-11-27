// Renderiza vários stills num único bundle (rápido). Uso: node scripts/stills.mjs <composition> <outDir> '<json array de {props, frame, name}>'
import { bundle } from "@remotion/bundler";
import { renderStill, selectComposition } from "@remotion/renderer";
import path from "node:path";
import fs from "node:fs";
const [comp, outDir, jobsJson] = process.argv.slice(2);
const jobs = JSON.parse(jobsJson);
const browserExecutable = process.env.BSE_CHROME || undefined;
const serveUrl = await bundle({ entryPoint: path.resolve("src/index.ts"), publicDir: path.resolve("public") });
fs.mkdirSync(outDir, { recursive: true });
for (const j of jobs) {
  const composition = await selectComposition({ serveUrl, id: comp, inputProps: j.props ?? {}, browserExecutable });
  await renderStill({ composition, serveUrl, output: path.join(outDir, `${j.name}.png`), frame: j.frame ?? 0, inputProps: j.props ?? {}, browserExecutable });
  console.log("ok", j.name);
}
