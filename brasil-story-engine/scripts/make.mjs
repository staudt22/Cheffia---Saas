// PIPELINE COMPLETO: áudio → storyboard → render → revisão → entrega.  Uso: npm run make -- <episodio> [--skip-storyboard]
import { execSync } from "node:child_process";
const [ep, ...flags] = process.argv.slice(2);
if (!ep) throw new Error("uso: npm run make -- <episodio>");
const run = (c) => { console.log(`\n▶ ${c}`); execSync(c, { stdio: "inherit" }); };
run(`python3 scripts/audio/build_audio.py ${ep}`);
if (!flags.includes("--skip-storyboard")) run(`node scripts/storyboard.mjs ${ep}`);
run(`node scripts/render.mjs ${ep}`);
try { run(`python3 scripts/review.py ${ep}`); } catch { console.log("⚠ revisão encontrou problemas — veja out/" + ep + "/review.md"); }
run(`node scripts/deliver.mjs ${ep}`);
