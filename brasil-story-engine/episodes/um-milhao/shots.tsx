/**
 * PILOTO — "E se todo brasileiro ganhasse R$ 1 milhão amanhã?"
 * Cada cena lê os tempos reais das falas (useLine) → animação sincronizada com a voz.
 */
import React from "react";
import { Camera, ScreenLayer, Layer } from "../../src/camera/Camera";
import { Character } from "../../src/characters/Character";
import { CAST, extra } from "../../src/characters/cast";
import { poseTrack, exprTrack, walkBetween, jumpAt } from "../../src/characters/library";
import { useLine, useSpeaking } from "../../src/core/timeline";
import { clamp, prog, sec, track, noise, pop, EASE } from "../../src/core/anim";
import { PAL } from "../../src/core/color";
import * as S from "../../src/scenes";
import { Phone, BreadBag, Bread, MoneyRain, PriceTag } from "../../src/props/props";
import { NotifBubble, PhoneScreen, Counter, Stamp, CompareBar, ImpactLines, Confetti, brl } from "../../src/ui/overlays";
import { FONT_TITLE, FONT_UI } from "../../src/fonts";
import type { ShotComponent } from "../../src/episode/types";

/** intensidade de vibração do celular: pulsos de 0.9 s a partir de cada tempo */
const buzzAt = (f: number, starts: number[]) =>
  starts.some((s) => f >= s && f < s + 27) ? Math.sin(f * 2.2) * (Math.sin(((f % 13) / 13) * Math.PI) > 0.2 ? 1 : 0) : 0;

// =====================================================================  S01 — HOOK: celular vibrando
const S01: ShotComponent = ({ frame: f, dur }) => {
  const l01 = useLine("l01");
  const wake = l01.start + sec(1.3);
  const sitUp = l01.start + sec(2.2);
  const grab = l01.end - sec(0.6);
  const buzz = buzzAt(f, [3, wake, grab]);
  const grabbed = f >= grab + 6;
  const pose = poseTrack(f, [
    [0, "sleep"],
    [sitUp, { base: "sitLean", handF: "open", armF: [40, 40] }],
    [grab, { base: "phoneUp", legF: [88, 88], legB: [84, 84] }],
  ], 12);
  const x = track(f, [[sitUp, 330], [sitUp + 12, 560, "out"]]);
  const y = track(f, [[sitUp, 909], [sitUp + 12, 905, "out"]]);
  const expr = exprTrack(f, [[0, "sleepy"], [wake, { base: "surprised", lid: 0.35 }], [sitUp + 10, "confused"], [grab + 8, "surprised"]]);
  return (
    <Camera
      frame={f}
      keys={[
        { f: 0, x: 712, y: 735, zoom: 2.7 },
        { f: l01.start + 4, x: 712, y: 735, zoom: 2.7 },
        { f: l01.start + 36, x: 470, y: 640, zoom: 1.45, ease: "inOut" },
        { f: sitUp + 6, x: 520, y: 640, zoom: 1.5 },
        { f: grab + 4, x: 620, y: 560, zoom: 2.0, ease: "inOut" },
        { f: dur, x: 630, y: 550, zoom: 2.15 },
      ]}
      shakes={buzz ? [{ at: 3, dur: 2, amp: 0 }] : []}
    >
      <S.Bedroom
        frame={f}
        time="morning"
        onNightstand={!grabbed ? <g transform={`translate(${buzz * 3}, 0) rotate(-90)`}><Phone glow={buzz ? 1 : 0.2} buzz={buzz} /></g> : null}
      >
        <Character
          def={CAST.voce}
          frame={f}
          x={x}
          y={y}
          facing={1}
          pose={pose}
          expr={expr}
          gaze={f < wake ? [0, 0] : [0.8, 0.3]}
          holdF={grabbed ? <Phone glow={buzz ? 1 : 0.6} buzz={buzz} /> : undefined}
          shadow={false}
        />
        {/* zzz enquanto dorme */}
        {f < wake &&
          [0, 1, 2].map((i) => {
            const t = ((f + i * 14) % 42) / 42;
            return (
              <text key={i} x={150 + t * 60 + i * 10} y={700 - t * 120} fontFamily={FONT_TITLE} fontWeight={700} fontSize={36 + i * 8} fill={PAL.ink} opacity={Math.sin(t * Math.PI)}>z</text>
            );
          })}
        {buzz !== 0 && (
          <g opacity={0.8}>
            {[-1, 1].map((sd) => (
              <path key={sd} d={`M${712 + sd * 40},${742} q${sd * 8},10 0,20 q${sd * -8},10 0,20`} transform={`translate(0,-60)`} fill="none" stroke={PAL.ink} strokeWidth={4} strokeLinecap="round" />
            ))}
          </g>
        )}
      </S.Bedroom>
    </Camera>
  );
};

// =====================================================================  S02 — tela do banco
const S02: ShotComponent = ({ frame: f, dur }) => {
  const l02 = useLine("l02");
  const l03 = useLine("l03");
  const notif = l02.start + sec(0.9);
  const countEnd = l03.end - sec(0.3);
  const bal = 47.32 + 1_000_000 * prog(f, l03.start, countEnd, "in");
  const enter = EASE.backOut(clamp(f / 14));
  return (
    <Camera frame={f} keys={[{ f: 0, zoom: 1 }, { f: l03.start, zoom: 1.04 }, { f: countEnd, zoom: 1.12, ease: "in" }, { f: dur, zoom: 1.14 }]} shakes={[{ at: countEnd, amp: 16, dur: 14 }]}>
      <S.GraphicBg frame={f} color="#18454a" color2="#21616a">
        <PhoneScreen frame={f} balance={bal} notifAt={notif} highlight={prog(f, l03.start, countEnd)} y={560 + (1 - enter) * 900} scale={0.8} tilt={-3 + noise(f / 40, 2) * 1.5} />
        <ImpactLines frame={f} at={countEnd} x={960} y={420} r={430} color="#fff" />
        <Confetti frame={f} at={countEnd} x={960} y={420} n={50} />
        <MoneyRain frame={f} start={countEnd - 4} count={26} />
        {/* mão segurando o celular */}
        <g transform={`translate(${960 + 240},${1060 + (1 - enter) * 900}) rotate(-12)`}>
          <ellipse cx={0} cy={0} rx={90} ry={130} fill={CAST.voce.skin} stroke={PAL.ink} strokeWidth={8} />
          <ellipse cx={-70} cy={-70} rx={34} ry={60} transform="rotate(-30,-70,-70)" fill={CAST.voce.skin} stroke={PAL.ink} strokeWidth={8} />
        </g>
      </S.GraphicBg>
    </Camera>
  );
};

// =====================================================================  S03 — comemoração na cama
const S03: ShotComponent = ({ frame: f, dur }) => {
  const l04 = useLine("l04");
  const jumps = [sec(0.1), sec(1.05), sec(2.0)];
  let j = { y: 0, squash: 1, air: false };
  for (const s of jumps) {
    const r = jumpAt(f, s, 85, 17);
    if (r.y !== 0 || r.squash !== 1) j = r;
  }
  const settle = l04.end - sec(0.2);
  const pose = f < settle ? (j.air ? "armsUp" : { base: "cheer" as const, handF: "hold" as const }) : { base: "phoneUp" as const };
  return (
    <Camera frame={f} keys={[{ f: 0, x: 520, y: 560, zoom: 1.25 }, { f: dur, x: 560, y: 590, zoom: 1.4, ease: "linear" }]}>
      <S.Bedroom frame={f} time="morning" blanketFold={0.4}>
        <Character
          def={CAST.voce}
          frame={f}
          x={420}
          y={795}
          lift={j.y}
          pose={{ ...(typeof pose === "string" ? { base: pose } : pose), squash: j.squash, airborne: false, handF: "hold" } as never}
          expr={f < settle ? "ecstatic" : "joy"}
          holdF={<Phone glow={0.6} />}
          gaze={[0.3, -0.6]}
        />
      </S.Bedroom>
      <ScreenLayer>
        <MoneyRain frame={f} start={0} count={34} seed={4} />
        <Stamp frame={f} at={l04.start + 2} x={1380} y={240} text="NÃO É GOLPE" size={88} color="#fff" bg={PAL.red} rot={4} />
      </ScreenLayer>
    </Camera>
  );
};

// =====================================================================  S04 — o país inteiro
const S04: ShotComponent = ({ frame: f, dur }) => {
  const l05 = useLine("l05");
  const spots = [
    [380, 420], [820, 300], [1250, 380], [1600, 260], [520, 600], [1050, 560], [1450, 540], [300, 250], [1750, 470], [700, 470], [1200, 200], [950, 420],
  ];
  const kidsAt = l05.start + Math.round((l05.end - l05.start) * 0.38);
  const kidPop = pop(f, kidsAt);
  const oldPop = pop(f, kidsAt + 14);
  return (
    <Camera frame={f} keys={[{ f: 0, x: 860, y: 520, zoom: 1.08 }, { f: dur, x: 1080, y: 560, zoom: 1.18, ease: "linear" }]}>
      <S.City frame={f} time="morning">
        {spots.map(([x, y], i) => (
          <NotifBubble key={i} frame={f} at={l05.start + 6 + i * 7} x={x + 120} y={y} title="Pix recebido" body="+ R$ 1.000.000,00" scale={0.42 + (i % 3) * 0.06} />
        ))}
        <g opacity={clamp(kidPop * 2)}>
          <Character def={CAST.theo} frame={f} x={700} y={900 + (1 - kidPop) * 200} pose={{ base: "cheer", handF: "hold", armF: [150, 30] }} holdF={<Phone glow={0.8} />} expr="ecstatic" lift={jumpAt(f, kidsAt + 20, 70, 16).y} />
        </g>
        <g opacity={clamp(oldPop * 2)}>
          <Character def={CAST.joao} frame={f} x={1420} y={900 + (1 - oldPop) * 200} facing={-1} pose="holdPhone" holdF={<Phone glow={0.8} />} expr={f > kidsAt + 40 ? "shocked" : "surprised"} gaze={[0.5, 0.8]} />
        </g>
      </S.City>
    </Camera>
  );
};

// =====================================================================  S05 — a rua inteira já sabe
const S05: ShotComponent = ({ frame: f, dur }) => {
  const l06 = useLine("l06");
  const l07 = useLine("l07");
  const W0 = sec(0.8);
  const W1 = l06.start + sec(2.0);
  const w = walkBetween(f, W0, W1, 515, 1180);
  const reveal = l06.start + Math.round((l06.end - l06.start) * 0.55);
  const neideTalking = useSpeaking("neide", f);
  const extras = [extra(3), extra(8), extra(12)];
  const camX = track(f, [[0, 620], [W0, 620], [W1, 1150, "inOut"], [reveal, 1150], [reveal + 18, 1500, "inOut"], [l07.start - 4, 1500], [l07.start + 12, 1330, "inOut"]]);
  const camZ = track(f, [[0, 1.35], [W1, 1.35], [reveal, 1.35], [reveal + 18, 0.78, "inOut"], [l07.start - 4, 0.78], [l07.start + 12, 1.55, "inOut"], [dur, 1.62]]);
  const camY = track(f, [[0, 690], [reveal, 690], [reveal + 18, 560, "inOut"], [l07.start - 4, 560], [l07.start + 12, 700, "inOut"]]);
  return (
    <Camera frame={f} keys={[{ f: 0, x: camX, y: camY, zoom: camZ }]} state={{ x: camX, y: camY, zoom: camZ }}>
      <S.Street frame={f} time="day" gateOpen={prog(f, 0, sec(0.7), "out")}>
        {extras.map((d, i) => (
          <Character key={i} def={d} frame={f + i * 9} x={1950 + i * 230} y={S.STREET_WALK} facing={i % 2 ? -1 : 1}
            pose={i === 1 ? "armsUp" : i === 0 ? { base: "cheer", handF: "hold" } : "wave"} wave={i === 2 ? 1 : 0}
            holdF={i === 0 ? <Phone glow={0.7} /> : undefined} expr={i === 1 ? "joy" : "ecstatic"}
            lift={i === 1 ? jumpAt(f % 34, 4, 60, 18).y : 0} />
        ))}
        <Character
          def={CAST.neide}
          frame={f}
          x={1530}
          y={S.STREET_WALK}
          facing={-1}
          pose={poseTrack(f, [[0, "holdPhone"], [l07.start, { base: "wave", handB: "hold", armB: [40, 70] }], [l07.start + sec(1.6), { base: "pointUp", handB: "hold", armB: [40, 70] }]])}
          holdF={f < l07.start ? <Phone glow={0.7} /> : undefined}
          holdB={f >= l07.start ? <Phone glow={0.7} /> : undefined}
          wave={f >= l07.start && f < l07.start + sec(1.6) ? 1 : 0}
          expr={f < l07.start ? { base: "happy", lid: 0.2 } : "ecstatic"}
          talking={neideTalking}
          gaze={f < l07.start ? [0.4, 0.9] : [0.6, 0]}
        />
        <Character
          def={CAST.voce}
          frame={f}
          x={w.x}
          y={S.STREET_WALK}
          facing={1}
          walk={w}
          pose={f < l07.start ? "relaxed" : f < l07.start + sec(1.8) ? "shocked" : "shrug"}
          expr={f < reveal ? "happy" : f < l07.start ? "surprised" : f < l07.start + sec(1.8) ? "surprised" : "confused"}
          gaze={f < reveal ? [0.6, 0] : [1, -0.1]}
        />
        {/* aviãozinho de "Paris" saindo do celular da Neide */}
        {f > l07.start + sec(1.4) && (
          <g transform={`translate(${1500 - (f - l07.start - sec(1.4)) * 6},${560 - (f - l07.start - sec(1.4)) * 4}) rotate(-20) scale(${pop(f, l07.start + sec(1.4))})`}>
            <path d="M-50,0 L40,-8 Q60,0 40,8 Z M-10,-4 L-30,-40 L-14,-40 L14,-4 Z M-10,4 L-30,40 L-14,40 L14,4 Z M-44,0 L-58,-18 L-50,-18 L-36,0 Z" fill="#fff" stroke={PAL.ink} strokeWidth={4} strokeLinejoin="round" />
          </g>
        )}
      </S.Street>
    </Camera>
  );
};

// =====================================================================  S06 — ponto de ônibus vazio
const S06: ShotComponent = ({ frame: f, dur }) => {
  const l08 = useLine("l08");
  const l09 = useLine("l09");
  const rafa = walkBetween(f, l09.start - sec(0.3), l09.end + sec(0.6), 2200, 3300, { scale: 1 });
  const lookL = [sec(0.4), sec(1.4), sec(2.4)];
  const look = lookL.filter((t) => f >= t).length % 2 === 0 ? 1 : -1;
  const followRafa = f > l09.start + sec(0.5);
  const bag = { x: track(f, [[0, 2300], [dur, 3100, "linear"]]), r: f * 7 };
  return (
    <Camera
      frame={f}
      keys={[
        { f: 0, x: 2700, y: 560, zoom: 1.0 },
        { f: l08.end, x: 2720, y: 640, zoom: 1.45, ease: "inOut" },
        { f: l09.start + sec(0.6), x: 2700, y: 600, zoom: 1.2, ease: "inOut" },
        { f: dur, x: 2800, y: 600, zoom: 1.25 },
      ]}
    >
      <S.Street frame={f} time="day">
        <Character def={CAST.voce} frame={f} x={2700} y={905} facing={followRafa ? (rafa.x > 2700 ? 1 : -1) : (look as 1 | -1)}
          pose={f < l09.start ? "sitLean" : "sit"} expr={f < l08.end ? { base: "sleepy", lid: 0.5 } : followRafa ? "confused" : "neutral"}
          gaze={followRafa ? [0.8, -0.2] : [0.7, 0]} shadow={false} />
        {/* sacola plástica voando */}
        <g transform={`translate(${bag.x},${880 + Math.sin(f / 9) * 30}) rotate(${Math.sin(f / 7) * 30})`} opacity={0.9}>
          <path d="M-24,-20 Q0,-34 24,-20 L30,18 Q0,30 -30,18 Z" fill="#f4f1ea" stroke={PAL.ink} strokeWidth={3} />
        </g>
        {f > l09.start - sec(0.3) && (
          <Character def={CAST.rafa} frame={f} x={rafa.x} y={S.STREET_WALK + 30} walk={rafa} facing={1}
            pose={{ base: "holdFront", handB: "open" }} expr="smug"
            holdF={<g><rect x={-6} y={-200} width={12} height={240} fill={PAL.woodDark} stroke={PAL.ink} strokeWidth={3} /><path d="M-90,-190 Q0,-260 90,-190 Z" fill="#ffd34d" stroke={PAL.ink} strokeWidth={5} /></g>} />
        )}
        {f > l09.start + sec(0.8) && (
          <g transform={`translate(${rafa.x},${S.STREET_WALK - 560})`}>
            <Stamp frame={f} at={l09.start + sec(0.8)} x={0} y={0} text="FOLGA ETERNA" size={54} color="#fff" bg={PAL.teal} rot={-3} />
          </g>
        )}
      </S.Street>
      <ScreenLayer>
        {/* relógio de espera */}
        <g transform="translate(1720,140)" opacity={clamp(1 - prog(f, l08.end, l08.end + 10))}>
          <circle r={70} fill="#fff" stroke={PAL.ink} strokeWidth={7} />
          <line x1={0} y1={0} x2={0} y2={-48} stroke={PAL.ink} strokeWidth={7} strokeLinecap="round" transform={`rotate(${Math.floor(f / 30) * 30})`} />
          <line x1={0} y1={0} x2={30} y2={0} stroke={PAL.ink} strokeWidth={7} strokeLinecap="round" />
        </g>
      </ScreenLayer>
    </Camera>
  );
};

// =====================================================================  S07 — padaria: pão a R$ 900
const S07: ShotComponent = ({ frame: f, dur }) => {
  const l10 = useLine("l10");
  const l11 = useLine("l11");
  const p1 = l11.start + sec(0.9);
  const p2 = l11.start + sec(1.4);
  const hit = l11.end - sec(0.4);
  const enter = walkBetween(f, 0, sec(1.8), 2050, 1600);
  const price = f < p1 ? "R$ 0,80" : f < p2 ? "R$ 50,00" : "R$ 900,00";
  const hl = f < p1 ? 0 : 0.6 + 0.4 * Math.sin(f / 3);
  const valdirTalk = useSpeaking("valdir", f);
  return (
    <Camera
      frame={f}
      keys={[
        { f: 0, x: 1150, y: 560, zoom: 1.0 },
        { f: l10.end, x: 1250, y: 560, zoom: 1.08, ease: "linear" },
        { f: l11.start + 8, x: 1010, y: 520, zoom: 1.7, ease: "inOut" },
        { f: p1 - 6, x: 1010, y: 520, zoom: 1.72 },
        { f: p1 + 6, x: 300, y: 380, zoom: 2.0, ease: "snap" },
        { f: hit - 2, x: 300, y: 380, zoom: 2.15 },
        { f: hit + 4, x: 1600, y: 560, zoom: 2.6, ease: "snap" },
        { f: dur, x: 1600, y: 560, zoom: 2.8 },
      ]}
      shakes={[{ at: hit + 4, amp: 22, dur: 16 }]}
    >
      <S.Bakery
        frame={f}
        prices={[
          { item: "Pão francês", price, highlight: hl },
          { item: "Pão de queijo", price: f < p2 ? "R$ 2,50" : "R$ 2.800,00" },
          { item: "Cafezinho", price: f < p2 ? "R$ 3,00" : "R$ 3.500,00" },
          { item: "Sonho", price: f < p2 ? "R$ 5,00" : "R$ 6.000,00" },
        ]}
        behind={
          <Character def={CAST.valdir} frame={f} x={1000} y={S.BAKERY_FLOOR - 20} facing={1}
            pose={poseTrack(f, [[0, "idle"], [l11.start, "shrug"], [l11.start + sec(1.3), { base: "point", armF: [70, 10] }]])}
            expr={f < l11.start ? "happy" : { base: "smug", mouthCurve: 0.5 }} talking={valdirTalk} gaze={[0.8, 0]} />
        }
        onCounter={<g transform={`translate(800,${S.BAKERY_COUNTER.top - 14})`}><Bread /></g>}
      >
        <Character def={CAST.voce} frame={f} x={enter.x} y={S.BAKERY_FLOOR + 40} facing={-1} walk={enter}
          pose={f < hit ? "relaxed" : "shocked"} expr={f < l11.start ? "happy" : f < hit ? "surprised" : "shocked"} gaze={[0.9, 0]} />
        <ImpactLines frame={f} at={hit + 4} x={1600} y={S.BAKERY_FLOOR - 330} r={200} />
      </S.Bakery>
    </Camera>
  );
};

// =====================================================================  S08 — explicação: inflação
const S08: ShotComponent = ({ frame: f, dur }) => {
  const l12 = useLine("l12");
  const l13 = useLine("l13");
  const l14 = useLine("l14");
  const ninguem = l12.start + Math.round((l12.end - l12.start) * 0.55);
  const people = [1, 2, 4, 5, 6, 9, 10];
  const fadePeople = 1 - prog(f, l13.start - 6, l13.start + 6);
  const barsIn = l13.start + sec(4.4);
  const fadeBars = 1 - prog(f, l14.start - 4, l14.start + 8);
  const inflation = l14.end - sec(0.75);
  return (
    <Camera frame={f} keys={[{ f: 0, zoom: 1.0 }, { f: dur, zoom: 1.06, ease: "linear" }]} shakes={[{ at: inflation, amp: 26, dur: 18 }]}>
      <S.GraphicBg frame={f}>
        {/* L12: todo mundo tem um milhão */}
        <g opacity={fadePeople}>
          {people.map((id, i) => {
            const x = 300 + i * 220;
            const p = pop(f, 4 + i * 3);
            return (
              <g key={id}>
                <Character def={extra(id)} frame={f + i * 11} x={x} y={930} scale={0.62 * p} pose={f < ninguem ? "cheer" : "shrug"} expr={f < ninguem ? "happy" : "confused"} />
                <g transform={`translate(${x},${560}) scale(${p})`} opacity={f < ninguem ? 1 : 0.35}>
                  <rect x={-90} y={-36} width={180} height={64} rx={20} fill={f < ninguem ? PAL.money : "#8a8494"} stroke={PAL.ink} strokeWidth={5} />
                  <text textAnchor="middle" y={12} fontFamily={FONT_TITLE} fontWeight={700} fontSize={36} fill="#fff">R$ 1 mi</text>
                </g>
              </g>
            );
          })}
          <Stamp frame={f} at={ninguem} x={960} y={300} text="= NINGUÉM TEM" size={110} color="#fff" bg={PAL.red} rot={-3} />
        </g>
        {/* L13: 213 trilhões vs PIB */}
        <g opacity={fadeBars * clamp((f - l13.start) / 6)}>
          <Counter frame={f} to={213.4} f0={l13.start + 6} f1={l13.start + sec(3.2)} x={960} y={300} size={150}
            fmt={(v) => `R$ ${v.toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 })} TRILHÕES`} color={PAL.gold} />
          <text x={960} y={380} textAnchor="middle" fontFamily={FONT_UI} fontWeight={800} fontSize={40} fill="#cfd6ff">213,4 milhões de pessoas × R$ 1 milhão</text>
          <CompareBar frame={f} at={barsIn} x={180} y={560} w={60} color="#7fa8c0" label="Tudo que o Brasil produziu em 2025 (PIB)" value="R$ 12,7 tri" />
          <CompareBar frame={f} at={barsIn + 14} x={180} y={790} w={1010} color={PAL.money} label="Dinheiro que surgiu do nada" value="R$ 213 tri" />
          <Stamp frame={f} at={barsIn + 30} x={1650} y={700} text="≈17×" size={130} color={PAL.gold} rot={6} />
        </g>
        {/* L14: mesmo pão → inflação */}
        {f > l14.start - 4 && (
          <g>
            <g transform={`translate(860,${600}) scale(${pop(f, l14.start) * 4.2})`}>
              <Bread />
            </g>
            <g transform={`translate(1360,${440}) scale(1.9)`}>
              <PriceTag price={f < l14.start + sec(1.8) ? "R$ 0,80" : f < l14.start + sec(2.6) ? "R$ 90" : "R$ 900"} scale={pop(f, l14.start + 8)} swing={Math.sin(f / 8) * 5} color={f < l14.start + sec(1.8) ? PAL.gold : PAL.red} />
            </g>
            <g opacity={clamp((f - l14.start - 6) / 8)}>
              <text x={860} y={300} textAnchor="middle" fontFamily={FONT_TITLE} fontWeight={700} fontSize={64} fill="#fff" stroke={PAL.ink} strokeWidth={10} paintOrder="stroke">MESMO PÃO</text>
            </g>
            <Stamp frame={f} at={inflation} x={960} y={880} text="INFLAÇÃO" size={150} color="#fff" bg={PAL.red} rot={-2} />
          </g>
        )}
      </S.GraphicBg>
    </Camera>
  );
};

// =====================================================================  S09 — final: mais um milhão
const S09: ShotComponent = ({ frame: f, dur }) => {
  const l15 = useLine("l15");
  const l16 = useLine("l16");
  const l17 = useLine("l17");
  const w = walkBetween(f, 0, l15.end, 1500, 780);
  const buzz = buzzAt(f, [l16.start + sec(0.4)]);
  const takePhone = l16.start + sec(0.6);
  const notif = l17.start;
  const irisStart = dur - sec(1.3);
  const iris = prog(f, irisStart, dur - 4, "in");
  const pose = poseTrack(f, [
    [0, { base: "holdFront", handF: "hold" }],
    [takePhone, { base: "phoneUp", handB: "hold", armB: [20, 40] }],
    [l17.start + sec(1.2), { base: "phoneUp", handB: "hold", armB: [20, 40], lean: -4, headTilt: 6 }],
  ]);
  return (
    <Camera
      frame={f}
      keys={[
        { f: 0, x: 1250, y: 620, zoom: 1.3 },
        { f: l15.end, x: 820, y: 640, zoom: 1.4, ease: "inOut" },
        { f: takePhone, x: 800, y: 600, zoom: 1.75, ease: "inOut" },
        { f: dur, x: 790, y: 560, zoom: 2.6, ease: "inOut" },
      ]}
    >
      <S.Street frame={f} time="sunset">
        <Character def={CAST.voce} frame={f} x={w.x} y={S.STREET_WALK} facing={-1} walk={w} pose={pose}
          holdF={f < takePhone ? <BreadBag /> : <Phone glow={buzz ? 1 : 0.7} buzz={buzz} />}
          holdB={f >= takePhone ? <BreadBag scale={0.9} /> : undefined}
          expr={exprTrack(f, [[0, { base: "calm", lid: 0.4 }], [l16.start, "surprised"], [notif + 6, "shocked"], [l17.start + sec(1.6), "scared"]])}
          gaze={f < takePhone ? [0.6, 0.1] : [0.6, 0.7]} />
        <NotifBubble frame={f} at={notif} x={1010} y={470} title="Pix recebido" body="+ R$ 1.000.000,00" scale={0.62} />
      </S.Street>
      <ScreenLayer>
        {iris > 0 && (
          <>
            <defs>
              <mask id="iris">
                <rect width={1920} height={1080} fill="#fff" />
                <circle cx={900} cy={480} r={1200 * (1 - iris) + 1} fill="#000" />
              </mask>
            </defs>
            <rect width={1920} height={1080} fill="#120d18" mask="url(#iris)" />
          </>
        )}
      </ScreenLayer>
    </Camera>
  );
};

export const SHOTS = { s01: S01, s02: S02, s03: S03, s04: S04, s05: S05, s06: S06, s07: S07, s08: S08, s09: S09 };
export { Layer, brl };
