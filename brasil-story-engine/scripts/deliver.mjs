// ENTREGA (Fase 10): junta vídeo, thumbnail, legendas, roteiro, título e descrição em out/<ep>/
import fs from "node:fs";
import path from "node:path";
const ep = process.argv[2];
if (!ep) throw new Error("uso: npm run deliver -- <episodio>");
const E = path.resolve("episodes", ep);
const out = path.resolve("out", ep);
fs.mkdirSync(out, { recursive: true });
const script = JSON.parse(fs.readFileSync(path.join(E, "script.json"), "utf8"));
const tl = JSON.parse(fs.readFileSync(path.join(E, "generated/timeline.json"), "utf8"));
const meta = fs.existsSync(path.join(E, "meta.json")) ? JSON.parse(fs.readFileSync(path.join(E, "meta.json"), "utf8")) : {};
fs.copyFileSync(path.join(E, "generated/subtitles.srt"), path.join(out, `${ep}.pt-BR.srt`));
const ts = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;
// roteiro
let md = `# ${script.title}\n\nDuração: ${ts(tl.duration)} · ${tl.shots.length} cenas · ${tl.lines.length} falas\n\n`;
for (const s of script.shots) {
  const t = tl.shots.find((x) => x.id === s.id);
  md += `## ${s.id} · ${s.beat ?? ""} · ${ts(t.start)}–${ts(t.end)}\n*Cenário:* ${s.scene ?? "-"} · *transição:* ${s.transition ?? "cut"} · *música:* ${s.music ?? "(continua)"} · *ambiente:* ${s.ambience ?? "-"}\n\n`;
  for (const l of s.lines ?? []) md += `- **${(l.speaker ?? "narrador").toUpperCase()}:** ${l.text}\n`;
  if (s.sfx?.length) md += `\n*SFX:* ${s.sfx.map((x) => `${x.name} @ ${x.at}`).join(", ")}\n`;
  md += "\n";
}
fs.writeFileSync(path.join(out, "roteiro.md"), md);
// capítulos por ato (beat)
const chapters = [];
for (const s of script.shots) {
  const t = tl.shots.find((x) => x.id === s.id);
  if (s.beat && (!chapters.length || chapters.at(-1).beat !== s.beat)) chapters.push({ beat: s.beat, t: t.start });
}
const chapterTxt = chapters.length > 2 && tl.duration > 180 ? "\n\nCapítulos:\n" + chapters.map((c) => `${ts(c.t)} ${c.beat[0] + c.beat.slice(1).toLowerCase()}`).join("\n") : "";
const desc = `${meta.title ?? script.title}\n\n${meta.description ?? ""}${chapterTxt}\n\n${meta.sources?.length ? "Fontes:\n" + meta.sources.map((s) => "• " + s).join("\n") + "\n\n" : ""}Animação 100% feita por código.\n\n${(meta.tags ?? []).map((t) => "#" + t.replace(/\s+/g, "")).join(" ")}\n`;
fs.writeFileSync(path.join(out, "youtube.txt"), `TÍTULO:\n${meta.title ?? script.title}\n\nALTERNATIVAS:\n${(meta.titleAlternatives ?? []).join("\n")}\n\nDESCRIÇÃO:\n${desc}\nTAGS:\n${(meta.tags ?? []).join(", ")}\n`);
console.log("✔ entrega em", out);
for (const f of fs.readdirSync(out)) console.log("  ·", f);
