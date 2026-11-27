/**
 * Monta um episódio: cenas na ordem da timeline + transições + áudio mixado.
 * Transições não alteram a duração (a voz manda no tempo): a cena seguinte
 * entra sobreposta, centrada no corte.
 */
import React from "react";
import { AbsoluteFill, Audio, Sequence, staticFile, useCurrentFrame } from "remotion";
import { EPISODES } from "../../episodes";
import { FPS, clamp, EASE } from "../core/anim";
import { ShotProvider } from "../core/timeline";
import { TRANSITIONS, TransitionName } from "../fx/transitions";

const TDUR: Record<string, number> = { cut: 0, fade: 14, whip: 12, wipe: 16, iris: 18, flash: 10, dip: 18, zoom: 14 };

export const EpisodeVideo: React.FC<{ episodeId: string; muted?: boolean }> = ({ episodeId, muted }) => {
  const ep = EPISODES.find((e) => e.id === episodeId);
  const g = useCurrentFrame();
  if (!ep) return <AbsoluteFill style={{ background: "#f0f" }} />;
  const tl = ep.timeline;
  const shots = tl.shots;
  return (
    <AbsoluteFill style={{ background: "#111" }}>
      {shots.map((s, i) => {
        const start = Math.round(s.start * FPS);
        const end = Math.round(s.end * FPS);
        const tIn = (s.transition ?? "cut") as TransitionName;
        const inDur = TDUR[tIn] ?? 0;
        const next = shots[i + 1];
        const outDur = next ? TDUR[next.transition ?? "cut"] ?? 0 : 0;
        const from = start - Math.ceil(inDur / 2);
        const to = end + Math.ceil(outDur / 2);
        const Comp = ep.shots[s.id];
        if (!Comp) return null;
        const p = inDur > 0 ? clamp((g - from) / inDur) : 1;
        const style = inDur > 0 && p < 1 ? TRANSITIONS[tIn](EASE.inOut(p)) : {};
        return (
          <Sequence key={s.id} from={from} durationInFrames={Math.max(1, to - from)} name={s.id}>
            <AbsoluteFill style={style}>
              <ShotProvider value={{ shot: s, timeline: tl, frames: end - start }}>
                <ShotFrame Comp={Comp} offset={start - from} dur={end - start} />
              </ShotProvider>
            </AbsoluteFill>
          </Sequence>
        );
      })}
      {!muted && ep.audio && <Audio src={staticFile(ep.audio)} />}
    </AbsoluteFill>
  );
};

const ShotFrame: React.FC<{ Comp: React.FC<{ frame: number; dur: number }>; offset: number; dur: number }> = ({ Comp, offset, dur }) => {
  const f = useCurrentFrame() - offset; // frame 0 = início real da cena (pode ser negativo durante a transição)
  return <Comp frame={Math.max(0, f)} dur={dur} />;
};
