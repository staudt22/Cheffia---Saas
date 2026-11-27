/**
 * <Character> — rig 2D programático.
 *
 * Origem (x, y) = ponto entre os pés, no chão. Escala 1 ≈ 455px de altura.
 * Tudo é desenhado por geometria (cinemática direta). O mesmo CharacterDef gera
 * sempre o mesmo personagem → consistência entre cenas e episódios.
 */
import React, { useId } from "react";
import { CharacterDef, Expression, HandShape, Pose } from "./types";
import { EXPRESSIONS, ExprRef, POSES, PoseRef, mixPose, resolveExpr, resolvePose, walkPose } from "./library";
import { PAL, shade } from "../core/color";
import { blinkAt, clamp, noise, seedOf } from "../core/anim";

const INK = PAL.ink;
const OUT = 5; // espessura do contorno
const rad = (d: number) => (d * Math.PI) / 180;
const dir = (a: number) => [Math.sin(rad(a)), Math.cos(rad(a))] as const;

export type CharacterProps = {
  def: CharacterDef;
  frame: number;
  x: number;
  y: number;
  scale?: number;
  facing?: 1 | -1;
  /** "3q" = três-quartos (padrão), "front" = de frente */
  view?: "3q" | "front";
  pose?: PoseRef;
  expr?: ExprRef;
  /** direção do olhar -1..1 (x: frente/trás, y: cima/baixo) */
  gaze?: [number, number];
  /** boca mexendo (fala) */
  talking?: boolean;
  /** ciclo de caminhada: phase (ciclos), amount 0..1, run 0..1 */
  walk?: { phase: number; amount: number; run?: number };
  /** abanar a mão da frente (0..1) */
  wave?: number;
  /** objeto na mão da frente/de trás (desenhado na origem 0,0 = palma) */
  holdF?: React.ReactNode;
  holdB?: React.ReactNode;
  /** deslocamento vertical extra (pulos) */
  lift?: number;
  opacity?: number;
  /** desliga respiração/idle (raro) */
  still?: boolean;
  /** sombra no chão */
  shadow?: boolean;
};

export const Character: React.FC<CharacterProps> = (props) => {
  const {
    def, frame, x, y, scale = 1, facing = 1, view = "3q", talking = false, walk, wave = 0,
    holdF, holdB, lift = 0, opacity = 1, still = false, shadow = true,
  } = props;
  const uid = useId().replace(/:/g, "");
  const seed = seedOf(def.id);
  const b = { height: 1, width: 1, head: 1, ...def.build };

  // ---------------------------------------------------------------- pose final
  let pose: Pose = resolvePose(props.pose ?? "idle");
  if (walk && walk.amount > 0) {
    const w = walkPose(walk.phase, walk.run ?? 0);
    // mantém mãos/objetos da pose base quando segurando algo
    const wp = mixPose(pose, w, walk.amount);
    if (pose.handF === "hold") { wp.armF = pose.armF; wp.handF = "hold"; }
    if (pose.handB === "hold") { wp.armB = pose.armB; wp.handB = "hold"; }
    pose = wp;
  }
  if (!still) {
    pose = {
      ...pose,
      lean: pose.lean + noise(frame / 40, seed * 9) * 1.4,
      headTilt: pose.headTilt + noise(frame / 33, seed * 7) * 2.2,
      armB: [pose.armB[0] + noise(frame / 37, seed * 5) * 2, pose.armB[1]],
      armF: [pose.armF[0] + noise(frame / 41, seed * 3) * 2, pose.armF[1] + wave * 28 * Math.sin(frame / 2.6)],
    };
  }
  const breath = still ? 0 : Math.sin((frame / 30) * Math.PI * 2 * 0.28 + seed * 6);

  let ex: Expression = resolveExpr(props.expr ?? "neutral");
  if (talking) {
    const o = clamp(0.25 + 0.5 * (noise(frame / 2.1, seed * 13) * 0.5 + 0.5) + 0.25 * Math.sin(frame / 1.7));
    ex = { ...ex, mouthOpen: Math.max(ex.mouthOpen, o * 0.75), mouthW: Math.max(ex.mouthW, 24) };
  }
  const blink = Math.max(blinkAt(frame, seed * 100), 0);
  const lid = clamp(Math.max(ex.lid, blink));
  const gaze = props.gaze ?? [0.25, 0];

  // ---------------------------------------------------------------- geometria
  const H = b.height;
  const THIGH = 80 * H;
  const SHIN = 72 * H;
  const UPPER = 64 * H;
  const FORE = 58 * H;
  const TORSO = 132 * H;
  const TW = 100 * b.width; // largura no ombro
  const HW = 90 * b.width; // largura no quadril
  const hip = { x: 0, y: -(THIGH + SHIN) };
  const LIMB = 28 * Math.sqrt(b.width);
  const LEG = 30 * Math.sqrt(b.width);

  const legPts = (hipX: number, [h, k]: [number, number]) => {
    const [dx1, dy1] = dir(h);
    const knee = { x: hipX + dx1 * THIGH, y: hip.y + dy1 * THIGH };
    const [dx2, dy2] = dir(h - k);
    const ankle = { x: knee.x + dx2 * SHIN, y: knee.y + dy2 * SHIN };
    return { hip: { x: hipX, y: hip.y }, knee, ankle };
  };
  const lB = legPts(-12 * b.width, pose.legB);
  const lF = legPts(12 * b.width, pose.legF);
  // "cola" o pé mais baixo no chão (gera o sobe-e-desce natural da caminhada)
  const bodyDrop = pose.airborne ? 0 : -12 - Math.max(lB.ankle.y, lF.ankle.y);

  const shoulderY = hip.y - TORSO + 18;
  const neck = { x: 4, y: hip.y - TORSO - 4 };
  const armPts = (sx: number, [s, e]: [number, number]) => {
    const sh = { x: sx, y: shoulderY };
    const [dx1, dy1] = dir(s);
    const el = { x: sh.x + dx1 * UPPER, y: sh.y + dy1 * UPPER };
    const [dx2, dy2] = dir(s + e);
    const wr = { x: el.x + dx2 * FORE, y: el.y + dy2 * FORE };
    return { sh, el, wr, foreAng: s + e };
  };
  const aB = armPts(-TW * 0.36, pose.armB);
  const aF = armPts(TW * 0.4, pose.armF);

  const skin = def.skin;
  const skinB = shade(skin, 0.86);
  const shirt = def.shirt.color;
  const pants = def.pants.color;
  const shorts = def.pants.style === "shorts";
  const skirt = def.pants.style === "skirt";

  // ---------------------------------------------------------------- partes
  const Seg: React.FC<{ a: { x: number; y: number }; b: { x: number; y: number }; c?: { x: number; y: number }; w: number; col: string; col2?: string }> = ({ a, b: bb, c, w, col, col2 }) => (
    <g strokeLinecap="round" strokeLinejoin="round" fill="none">
      <path d={`M${a.x},${a.y} L${bb.x},${bb.y}${c ? ` L${c.x},${c.y}` : ""}`} stroke={INK} strokeWidth={w + OUT * 2} />
      <path d={`M${a.x},${a.y} L${bb.x},${bb.y}`} stroke={col} strokeWidth={w} />
      {c && <path d={`M${bb.x},${bb.y} L${c.x},${c.y}`} stroke={col2 ?? col} strokeWidth={w} />}
      {c && <circle cx={bb.x} cy={bb.y} r={w / 2} fill={col2 ?? col} />}
    </g>
  );

  const Hand: React.FC<{ p: { x: number; y: number }; ang: number; shape: HandShape; col: string; hold?: React.ReactNode }> = ({ p, ang, shape, col, hold }) => {
    const r = 15 * Math.sqrt(b.width);
    const [dx, dy] = dir(ang);
    return (
      <g>
        {shape === "point" && (
          <g strokeLinecap="round">
            <line x1={p.x} y1={p.y} x2={p.x + dx * 30} y2={p.y + dy * 30} stroke={INK} strokeWidth={10 + OUT * 2} />
            <line x1={p.x} y1={p.y} x2={p.x + dx * 30} y2={p.y + dy * 30} stroke={col} strokeWidth={10} />
          </g>
        )}
        {shape === "thumb" && (
          <g strokeLinecap="round">
            <line x1={p.x} y1={p.y} x2={p.x} y2={p.y - 26} stroke={INK} strokeWidth={10 + OUT * 2} />
            <line x1={p.x} y1={p.y} x2={p.x} y2={p.y - 26} stroke={col} strokeWidth={10} />
          </g>
        )}
        <circle cx={p.x} cy={p.y} r={shape === "fist" ? r * 0.92 : r} fill={col} stroke={INK} strokeWidth={OUT} />
        {shape === "open" && (
          <circle cx={p.x + dy * 8 + dx * 6} cy={p.y - dx * 8 + dy * 6} r={6} fill={col} stroke={INK} strokeWidth={3.5} />
        )}
        {shape === "hold" && hold && (
          <g transform={`translate(${p.x},${p.y}) scale(${facing}, 1)`}>{hold}</g>
        )}
      </g>
    );
  };

  const Shoe: React.FC<{ p: { x: number; y: number }; col: string }> = ({ p, col }) => (
    <g transform={`translate(${p.x},${p.y})`}>
      <path d="M-18,-6 C-20,-22 8,-24 22,-10 C34,-4 36,8 26,10 L-16,10 C-24,10 -22,0 -18,-6 Z" fill={col} stroke={INK} strokeWidth={OUT} strokeLinejoin="round" />
      <path d="M-18,6 L28,6" stroke={shade(col, 1.5)} strokeWidth={4} strokeLinecap="round" />
    </g>
  );

  const Leg: React.FC<{ l: ReturnType<typeof legPts>; back?: boolean }> = ({ l, back }) => {
    const pc = back ? shade(pants, 0.85) : pants;
    const sc = back ? skinB : skin;
    return (
      <g>
        <Seg a={l.hip} b={l.knee} c={l.ankle} w={LEG} col={pc} col2={shorts || skirt ? sc : pc} />
        <Shoe p={{ x: l.ankle.x, y: l.ankle.y + 4 }} col={back ? shade(def.shoes, 0.85) : def.shoes} />
      </g>
    );
  };

  const Arm: React.FC<{ a: ReturnType<typeof armPts>; back?: boolean; shape: HandShape; hold?: React.ReactNode }> = ({ a, back, shape, hold }) => {
    const sleeve = def.shirt.style === "tank" ? (back ? skinB : skin) : back ? shade(shirt, 0.85) : shirt;
    const longSleeve = def.shirt.style === "jacket";
    const sc = back ? skinB : skin;
    return (
      <g>
        <Seg a={a.sh} b={a.el} c={a.wr} w={LIMB} col={sleeve} col2={longSleeve ? sleeve : sc} />
        <Hand p={a.wr} ang={a.foreAng} shape={shape} col={sc} hold={hold} />
      </g>
    );
  };

  // tronco
  const tTop = hip.y - TORSO;
  const torsoPath = `M${-HW / 2},${hip.y + 6} L${-TW / 2 + 4},${tTop + 22} Q${-TW / 2},${tTop} ${-TW / 2 + 24},${tTop} L${TW / 2 - 24},${tTop} Q${TW / 2},${tTop} ${TW / 2 - 4},${tTop + 22} L${HW / 2},${hip.y + 6} Q0,${hip.y + 16} ${-HW / 2},${hip.y + 6} Z`;
  const Torso = () => (
    <g>
      <clipPath id={`tc${uid}`}>
        <path d={torsoPath} />
      </clipPath>
      <path d={torsoPath} fill={shirt} stroke={INK} strokeWidth={OUT} strokeLinejoin="round" />
      <g clipPath={`url(#tc${uid})`}>
        {/* sombra própria: lado de trás mais escuro → volume */}
        <ellipse cx={-TW * 0.62} cy={hip.y - TORSO / 2} rx={TW * 0.38} ry={TORSO} fill={shade(shirt, 0.82)} />
        {/* cintura / calça aparecendo */}
        {skirt ? (
          <path d={`M${-HW / 2 - 10},${hip.y - 10} L${HW / 2 + 10},${hip.y - 10} L${HW / 2 + 26},${hip.y + 60} L${-HW / 2 - 26},${hip.y + 60} Z`} fill={pants} />
        ) : (
          <rect x={-HW} y={hip.y - 8} width={HW * 2} height={30} fill={pants} />
        )}
        {def.shirt.style === "polo" && (
          <path d={`M-22,${tTop} L0,${tTop + 26} L22,${tTop}`} fill={shade(shirt, 1.25)} stroke={INK} strokeWidth={3.5} />
        )}
        {def.shirt.style === "jacket" && (
          <path d={`M4,${tTop} L4,${hip.y}`} stroke={shade(shirt, 0.7)} strokeWidth={5} />
        )}
        {def.shirt.detail && (
          <circle cx={TW * 0.12} cy={tTop + 52} r={13} fill={def.shirt.detail} opacity={0.9} />
        )}
        {def.accessories?.apron && (
          <path d={`M${-HW / 2 + 6},${tTop + 40} L${HW / 2 - 2},${tTop + 40} L${HW / 2 + 6},${hip.y + 50} L${-HW / 2},${hip.y + 50} Z`} fill={def.accessories.apron} stroke={INK} strokeWidth={3.5} />
        )}
      </g>
      {skirt && (
        <path d={`M${-HW / 2 - 4},${hip.y} L${HW / 2 + 4},${hip.y} L${HW / 2 + 20},${hip.y + 58} Q0,${hip.y + 66} ${-HW / 2 - 20},${hip.y + 58} Z`} fill={pants} stroke={INK} strokeWidth={OUT} strokeLinejoin="round" />
      )}
      {def.accessories?.necklace && (
        <path d={`M-18,${tTop + 2} Q4,${tTop + 30} 26,${tTop + 2}`} fill="none" stroke={def.accessories.necklace} strokeWidth={4} />
      )}
    </g>
  );

  // cabeça
  const HS = b.head;
  const front = view === "front";
  const fx = front ? 0 : 12; // deslocamento 3/4 dos traços do rosto
  const Head = () => {
    const hr = { rx: 84, ry: 80 };
    const eyeXs = front ? [-30, 30] : [-18 + fx, 32 + fx];
    const eyeY = -4;
    const hair = def.hair.color;
    const hairD = shade(hair, 0.8);
    const browCol = shade(hair, 0.7);
    const mouthX = front ? 0 : 20 + fx * 0.4;
    const mouthY = 42;
    const mw = ex.mouthW;
    const mc = ex.mouthCurve;
    const mo = ex.mouthOpen;
    const gx = clamp(gaze[0], -1, 1) * 6;
    const gy = clamp(gaze[1], -1, 1) * 6;

    const hairBack = () => {
      switch (def.hair.style) {
        case "long":
          return <path d="M-86,-20 C-100,60 -80,130 -40,140 L60,140 C80,120 90,60 82,-10 Z" fill={hairD} stroke={INK} strokeWidth={OUT} />;
        case "ponytail":
          return <path d="M-70,-40 C-130,-30 -140,40 -110,90 C-100,60 -90,20 -60,0 Z" fill={hairD} stroke={INK} strokeWidth={OUT} />;
        case "bun":
          return <circle cx={-48} cy={-78} r={32} fill={hair} stroke={INK} strokeWidth={OUT} />;
        case "afro":
          return <circle cx={-8} cy={-30} r={112} fill={hair} stroke={INK} strokeWidth={OUT} />;
        default:
          return null;
      }
    };
    const hairFront = () => {
      switch (def.hair.style) {
        case "curly": {
          const pts = [[-78, -20], [-70, -52], [-46, -76], [-14, -88], [20, -86], [50, -72], [72, -46], [-80, 10]];
          return (
            <g>
              {pts.map(([px, py], i) => (
                <circle key={i} cx={px} cy={py} r={i === 7 ? 18 : 27} fill={hair} stroke={INK} strokeWidth={OUT} />
              ))}
              {pts.map(([px, py], i) => (
                <circle key={`h${i}`} cx={px} cy={py + 6} r={i === 7 ? 12 : 21} fill={hair} />
              ))}
            </g>
          );
        }
        case "short":
        case "ponytail":
          return (
            <path d="M-86,0 C-92,-70 -40,-102 10,-100 C60,-98 92,-66 86,-24 C70,-44 40,-58 4,-56 C-30,-54 -56,-40 -66,4 Z" fill={hair} stroke={INK} strokeWidth={OUT} strokeLinejoin="round" />
          );
        case "long":
          return (
            <path d="M-88,10 C-96,-70 -40,-104 12,-102 C62,-100 94,-62 86,-6 C76,-40 44,-60 8,-60 C-24,-60 -50,-40 -58,-6 C-64,20 -76,40 -88,10 Z" fill={hair} stroke={INK} strokeWidth={OUT} strokeLinejoin="round" />
          );
        case "bun":
          return (
            <path d="M-86,4 C-90,-66 -40,-96 8,-96 C56,-96 92,-62 86,-16 C72,-40 40,-52 6,-50 C-30,-48 -58,-30 -68,6 Z" fill={hair} stroke={INK} strokeWidth={OUT} strokeLinejoin="round" />
          );
        case "afro":
          return null;
        case "bald":
          return <path d="M-84,10 C-86,-10 -82,-26 -76,-34 L-64,-10 Z" fill={hair} stroke={INK} strokeWidth={3} />;
      }
    };

    const eye = (ex0: number, i: number) => {
      const rx = 15.5;
      const ry = 19;
      if (ex.squint > 0.5) {
        return (
          <path key={i} d={`M${ex0 - 14},${eyeY + 4} Q${ex0},${eyeY - 14} ${ex0 + 14},${eyeY + 4}`} fill="none" stroke={INK} strokeWidth={6} strokeLinecap="round" />
        );
      }
      const lidH = ry * 2 * lid;
      return (
        <g key={i}>
          <clipPath id={`e${uid}${i}`}>
            <ellipse cx={ex0} cy={eyeY} rx={rx} ry={ry} />
          </clipPath>
          <ellipse cx={ex0} cy={eyeY} rx={rx} ry={ry} fill={PAL.white} />
          <g clipPath={`url(#e${uid}${i})`}>
            <circle cx={ex0 + gx + (front ? 0 : 3)} cy={eyeY + gy + 2} r={9 * ex.pupil} fill={INK} />
            <circle cx={ex0 + gx + (front ? 0 : 3) + 3.5} cy={eyeY + gy - 2} r={3.2 * Math.min(1.2, ex.pupil + 0.2)} fill="#fff" />
            <rect x={ex0 - rx - 2} y={eyeY - ry - 2} width={rx * 2 + 4} height={lidH + 2} fill={skin} />
            {lid > 0.08 && (
              <line x1={ex0 - rx} y1={eyeY - ry + lidH} x2={ex0 + rx} y2={eyeY - ry + lidH} stroke={INK} strokeWidth={4} />
            )}
          </g>
          <ellipse cx={ex0} cy={eyeY} rx={rx} ry={ry} fill="none" stroke={INK} strokeWidth={4} />
        </g>
      );
    };
    const brow = (bx: number, raise: number, i: number) => {
      const side = i === 0 ? -1 : 1; // interno = lado do nariz
      const a = ex.browAng * (side === -1 ? -1 : 1) * 0.5;
      const by = eyeY - 30 - raise;
      const inner = side === -1 ? bx + 12 : bx - 12;
      const outer = side === -1 ? bx - 14 : bx + 14;
      return (
        <path key={`b${i}`} d={`M${outer},${by - a * (side === -1 ? -0.4 : 0.4)} Q${bx},${by - 6} ${inner},${by + a}`} fill="none" stroke={browCol} strokeWidth={7.5} strokeLinecap="round" />
      );
    };

    const mouth = () => {
      if (mo < 0.08) {
        return (
          <path d={`M${mouthX - mw / 2},${mouthY - mc * 4} Q${mouthX},${mouthY + mc * 14} ${mouthX + mw / 2},${mouthY - mc * 4}`} fill="none" stroke={INK} strokeWidth={5.5} strokeLinecap="round" />
        );
      }
      const top = mouthY - Math.max(0, mc) * 4;
      const depth = 8 + mo * 34;
      const d = `M${mouthX - mw / 2},${top} Q${mouthX},${top + mc * 8} ${mouthX + mw / 2},${top} Q${mouthX + mw / 2 + 2},${top + depth} ${mouthX},${top + depth + Math.max(0, mc) * 6} Q${mouthX - mw / 2 - 2},${top + depth} ${mouthX - mw / 2},${top} Z`;
      return (
        <g>
          <clipPath id={`m${uid}`}>
            <path d={d} />
          </clipPath>
          <path d={d} fill="#5b2333" />
          <g clipPath={`url(#m${uid})`}>
            {ex.teeth > 0.5 && <rect x={mouthX - mw} y={top - 4} width={mw * 2} height={10} fill="#fff" />}
            {ex.tongue > 0.5 && <ellipse cx={mouthX + 2} cy={top + depth + 4} rx={mw * 0.38} ry={12} fill="#ef7d8a" />}
          </g>
          <path d={d} fill="none" stroke={INK} strokeWidth={4.5} strokeLinejoin="round" />
        </g>
      );
    };

    return (
      <g>
        {hairBack()}
        {/* orelha */}
        {!front && <ellipse cx={-70} cy={8} rx={15} ry={21} fill={skin} stroke={INK} strokeWidth={OUT} />}
        {front && <ellipse cx={-82} cy={8} rx={13} ry={19} fill={skin} stroke={INK} strokeWidth={OUT} />}
        {front && <ellipse cx={82} cy={8} rx={13} ry={19} fill={skin} stroke={INK} strokeWidth={OUT} />}
        {def.accessories?.earrings && !front && <circle cx={-70} cy={34} r={6} fill={def.accessories.earrings} stroke={INK} strokeWidth={2.5} />}
        <clipPath id={`h${uid}`}>
          <ellipse cx={0} cy={0} rx={hr.rx} ry={hr.ry} />
        </clipPath>
        <ellipse cx={0} cy={0} rx={hr.rx} ry={hr.ry} fill={skin} />
        <g clipPath={`url(#h${uid})`}>
          {/* sombreamento lateral + luz de topo */}
          <ellipse cx={-hr.rx * 1.05} cy={10} rx={hr.rx * 0.55} ry={hr.ry * 1.3} fill={skinB} />
          <ellipse cx={20} cy={-56} rx={44} ry={20} fill={shade(skin, 1.12)} opacity={0.6} />
        </g>
        <ellipse cx={0} cy={0} rx={hr.rx} ry={hr.ry} fill="none" stroke={INK} strokeWidth={OUT} />
        {!front && <path d="M-74,-4 Q-66,8 -72,20" fill="none" stroke={INK} strokeWidth={3} strokeLinecap="round" />}
        {/* bochechas */}
        {ex.blush > 0.05 && (
          <g opacity={ex.blush * 0.55}>
            <ellipse cx={eyeXs[0] - 6} cy={28} rx={14} ry={8} fill="#ff6f7d" />
            <ellipse cx={eyeXs[1] + 8} cy={28} rx={14} ry={8} fill="#ff6f7d" />
          </g>
        )}
        {eyeXs.map((e, i) => eye(e, i))}
        {brow(eyeXs[0], ex.browL, 0)}
        {brow(eyeXs[1], ex.browR, 1)}
        {/* nariz */}
        {front ? (
          <path d="M-6,20 Q0,26 6,20" fill="none" stroke={INK} strokeWidth={4} strokeLinecap="round" />
        ) : (
          <path d={`M${52 + fx * 0.4},6 Q${66 + fx * 0.4},20 ${50 + fx * 0.4},26`} fill={skin} stroke={INK} strokeWidth={4.5} strokeLinecap="round" />
        )}
        {def.accessories?.mustache && (
          <path d={`M${mouthX - 26},${mouthY - 8} Q${mouthX},${mouthY - 24} ${mouthX + 28},${mouthY - 8} Q${mouthX},${mouthY - 2} ${mouthX - 26},${mouthY - 8} Z`} fill={shade(def.hair.color, 0.9)} stroke={INK} strokeWidth={3} />
        )}
        {mouth()}
        {def.accessories?.beard && (
          <path d={`M-70,20 Q-60,90 10,92 Q70,90 80,20 Q60,70 10,72 Q-40,72 -70,20 Z`} fill={def.hair.color} stroke={INK} strokeWidth={3.5} />
        )}
        {def.accessories?.glasses && (
          <g fill="none" stroke={def.accessories.glasses} strokeWidth={5}>
            <circle cx={eyeXs[0]} cy={eyeY} r={23} />
            <circle cx={eyeXs[1]} cy={eyeY} r={23} />
            <path d={`M${eyeXs[0] + 23},${eyeY - 2} Q${(eyeXs[0] + eyeXs[1]) / 2},${eyeY - 8} ${eyeXs[1] - 23},${eyeY - 2}`} />
            {!front && <line x1={eyeXs[0] - 23} y1={eyeY - 4} x2={-68} y2={-6} />}
          </g>
        )}
        {/* suor */}
        {ex.sweat > 0.05 && (
          <path
            d={`M74,${-40 + ((frame * 1.6) % 40)} q8,14 0,20 q-8,-6 0,-20 Z`}
            fill="#9fdcff"
            stroke={INK}
            strokeWidth={3}
            opacity={ex.sweat * clamp(1 - ((frame * 1.6) % 40) / 40)}
          />
        )}
        {hairFront()}
        {def.accessories?.cap && (
          <g>
            <path d="M-84,-26 C-86,-90 80,-104 86,-30 Z" fill={def.accessories.cap} stroke={INK} strokeWidth={OUT} strokeLinejoin="round" />
            <path d="M40,-38 C80,-46 126,-40 130,-28 C110,-22 70,-24 40,-28 Z" fill={shade(def.accessories.cap, 0.8)} stroke={INK} strokeWidth={OUT} strokeLinejoin="round" />
          </g>
        )}
      </g>
    );
  };

  // braço erguido acima do ombro passa por trás da cabeça (não cobre o rosto)
  const armBehindHead = pose.armF[0] > 125 && pose.armF[0] + pose.armF[1] > 120;
  const leanT = `rotate(${pose.lean}, ${hip.x}, ${hip.y})`;
  const breathT = `translate(0, ${hip.y}) scale(1, ${1 + breath * 0.012}) translate(0, ${-hip.y})`;
  const headPivot = { x: neck.x, y: neck.y };
  const headT = `rotate(${pose.headTilt}, ${headPivot.x}, ${headPivot.y}) translate(${headPivot.x + 6}, ${headPivot.y - 70 * HS + breath * 1.2}) scale(${HS})`;
  const rootT = `translate(${x}, ${y + lift}) scale(${scale * facing}, ${scale}) translate(0, ${bodyDrop}) rotate(${pose.bodyRot}, 0, ${hip.y}) translate(0, ${hip.y}) scale(${1 / Math.sqrt(pose.squash)}, ${pose.squash}) translate(0, ${-hip.y})`;

  const shadowS = clamp(1 + lift / 400, 0.4, 1);
  return (
    <g opacity={opacity}>
      {shadow && (
        <ellipse cx={x} cy={y + 4} rx={78 * scale * b.width * shadowS} ry={14 * scale * shadowS} fill="#1a1020" opacity={0.18 * shadowS} />
      )}
      <g transform={rootT}>
        <g transform={leanT}>
          <g transform={breathT}>
            <Arm a={aB} back shape={pose.handB} hold={holdB} />
          </g>
        </g>
        <Leg l={lB} back />
        <Leg l={lF} />
        <g transform={leanT}>
          <g transform={breathT}>
            <path d={`M${neck.x - 14},${neck.y + 12} L${neck.x - 12},${neck.y - 20} L${neck.x + 14},${neck.y - 20} L${neck.x + 16},${neck.y + 12} Z`} fill={skinB} stroke={INK} strokeWidth={OUT} strokeLinejoin="round" />
            <Torso />
            {armBehindHead && <Arm a={aF} shape={pose.handF} hold={holdF} />}
            <g transform={headT}>
              <Head />
            </g>
            {!armBehindHead && <Arm a={aF} shape={pose.handF} hold={holdF} />}
          </g>
        </g>
      </g>
    </g>
  );
};

export { POSES, EXPRESSIONS };
