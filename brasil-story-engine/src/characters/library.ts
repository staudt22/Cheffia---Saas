/**
 * Biblioteca de poses e expressões + ferramentas de blending e ciclos (andar/correr).
 */
import { Expression, Pose } from "./types";
import { EASE, clamp, lerp } from "../core/anim";

const P = (p: Partial<Pose>): Pose => ({
  lean: 0,
  headTilt: 0,
  armB: [6, 12],
  armF: [-5, 14],
  legB: [-3, 3],
  legF: [3, 3],
  handB: "open",
  handF: "open",
  bodyRot: 0,
  squash: 1,
  ...p,
});

export const POSES = {
  idle: P({}),
  relaxed: P({ armB: [4, 18], armF: [-2, 20], headTilt: 2 }),
  point: P({ armF: [95, 4], handF: "point", lean: 3, headTilt: -2, armB: [0, 14] }),
  pointUp: P({ armF: [160, 6], handF: "point", lean: -3, headTilt: -10 }),
  pointSelf: P({ armF: [35, 125], handF: "point", lean: -2 }),
  armsUp: P({ armB: [165, 12], armF: [160, -8], handB: "open", handF: "open", lean: -4, headTilt: -8 }),
  cheer: P({ armF: [150, 35], handF: "fist", armB: [20, 70], handB: "fist", lean: -3, headTilt: -6 }),
  shrug: P({ armF: [25, 105], armB: [-25, -100], headTilt: 9, lean: -2 }),
  think: P({ armF: [28, 145], handF: "fist", armB: [12, 95], handB: "fist", headTilt: -7 }),
  facepalm: P({ armF: [55, 140], handF: "open", headTilt: 14, lean: 7 }),
  holdPhone: P({ armF: [42, 85], handF: "hold", armB: [18, 70], handB: "open", headTilt: 10, lean: 2 }),
  phoneUp: P({ armF: [75, 60], handF: "hold", armB: [10, 40], headTilt: -2, lean: 0 }),
  holdFront: P({ armF: [38, 62], handF: "hold", armB: [10, 30], lean: 1 }),
  carry: P({ armF: [30, 75], handF: "hold", armB: [30, 75], handB: "hold", lean: -3 }),
  crossArms: P({ armF: [-30, -105], handF: "fist", armB: [30, 105], handB: "fist", lean: -2 }),
  wave: P({ armF: [150, 30], handF: "open", headTilt: 4 }),
  shocked: P({ armF: [55, 75], armB: [-30, 80], handF: "open", handB: "open", lean: -7, headTilt: -4 }),
  panic: P({ armF: [150, 60], armB: [150, -60], lean: -4, headTilt: 4 }),
  sad: P({ lean: 8, headTilt: 14, armB: [2, 6], armF: [2, 6] }),
  sit: P({ legF: [88, 88], legB: [84, 84], armF: [30, 40], armB: [20, 40], lean: -2 }),
  sitLean: P({ legF: [88, 88], legB: [84, 84], armF: [50, 60], handF: "hold", lean: 6, headTilt: 8 }),
  crouch: P({ legF: [55, 100], legB: [30, 95], lean: 18, armF: [40, 30], armB: [30, 30] }),
  jump: P({ legF: [45, 80], legB: [20, 70], armF: [160, 10], armB: [150, -10], airborne: true, lean: -4 }),
  lieBack: P({ bodyRot: -90, armF: [20, 20], armB: [10, 20], legF: [0, 0], legB: [4, 4], airborne: true }),
  sleep: P({ bodyRot: -90, armF: [150, 40], armB: [10, 20], legF: [10, 20], legB: [4, 4], airborne: true, headTilt: -6 }),
  fall: P({ bodyRot: -25, armF: [140, 30], armB: [160, -30], legF: [40, 40], legB: [-20, 10], airborne: true, lean: -8 }),
  lean: P({ lean: 10, armF: [60, 40], armB: [20, 20], headTilt: 6 }),
  bow: P({ lean: 30, headTilt: 10, armF: [10, 10], armB: [5, 10] }),
} satisfies Record<string, Pose>;
export type PoseName = keyof typeof POSES;

const E = (e: Partial<Expression>): Expression => ({
  browL: 0,
  browR: 0,
  browAng: 0,
  lid: 0.12,
  pupil: 1,
  squint: 0,
  mouthW: 24,
  mouthOpen: 0,
  mouthCurve: 0.35,
  teeth: 0,
  tongue: 0,
  blush: 0,
  sweat: 0,
  ...e,
});

export const EXPRESSIONS = {
  neutral: E({}),
  calm: E({ lid: 0.3, mouthCurve: 0.4 }),
  happy: E({ browL: 4, browR: 4, lid: 0.05, mouthW: 34, mouthOpen: 0.35, mouthCurve: 1, teeth: 1 }),
  ecstatic: E({ browL: 12, browR: 12, lid: 0, pupil: 1.12, mouthW: 46, mouthOpen: 0.95, mouthCurve: 1, teeth: 1, tongue: 1, blush: 0.7 }),
  joy: E({ squint: 1, browL: 8, browR: 8, mouthW: 40, mouthOpen: 0.6, mouthCurve: 1, teeth: 1, tongue: 1, blush: 0.8 }),
  shocked: E({ browL: 17, browR: 17, browAng: -5, lid: 0, pupil: 0.55, mouthW: 22, mouthOpen: 1, mouthCurve: 0 }),
  surprised: E({ browL: 12, browR: 12, lid: 0, pupil: 0.8, mouthW: 18, mouthOpen: 0.55, mouthCurve: 0.1 }),
  worried: E({ browL: 8, browR: 8, browAng: -15, lid: 0.1, mouthW: 26, mouthOpen: 0.12, mouthCurve: -0.55, sweat: 1 }),
  angry: E({ browL: -6, browR: -6, browAng: 20, lid: 0.35, mouthW: 30, mouthOpen: 0.3, mouthCurve: -0.8, teeth: 1 }),
  sad: E({ browL: 5, browR: 5, browAng: -17, lid: 0.38, mouthW: 22, mouthCurve: -0.85 }),
  smug: E({ browL: 7, browR: -3, lid: 0.45, mouthW: 30, mouthCurve: 0.8 }),
  sleepy: E({ lid: 0.78, browL: -2, browR: -2, mouthCurve: 0.05, mouthW: 18 }),
  confused: E({ browL: 11, browR: -5, mouthW: 20, mouthCurve: -0.25, mouthOpen: 0.05 }),
  scared: E({ browL: 14, browR: 14, browAng: -14, lid: 0, pupil: 0.5, mouthW: 30, mouthOpen: 0.45, mouthCurve: -0.7, teeth: 1, sweat: 1 }),
  determined: E({ browL: -2, browR: -2, browAng: 12, lid: 0.25, mouthW: 26, mouthCurve: 0.25 }),
  greedy: E({ browL: 6, browR: 6, lid: 0.3, pupil: 1.2, mouthW: 40, mouthOpen: 0.25, mouthCurve: 1, teeth: 1, blush: 0.4 }),
} satisfies Record<string, Expression>;
export type ExprName = keyof typeof EXPRESSIONS;

// ---------------------------------------------------------------- blending
export const mixPose = (a: Pose, b: Pose, t: number): Pose => ({
  lean: lerp(a.lean, b.lean, t),
  headTilt: lerp(a.headTilt, b.headTilt, t),
  armB: [lerp(a.armB[0], b.armB[0], t), lerp(a.armB[1], b.armB[1], t)],
  armF: [lerp(a.armF[0], b.armF[0], t), lerp(a.armF[1], b.armF[1], t)],
  legB: [lerp(a.legB[0], b.legB[0], t), lerp(a.legB[1], b.legB[1], t)],
  legF: [lerp(a.legF[0], b.legF[0], t), lerp(a.legF[1], b.legF[1], t)],
  handB: t < 0.5 ? a.handB : b.handB,
  handF: t < 0.5 ? a.handF : b.handF,
  bodyRot: lerp(a.bodyRot, b.bodyRot, t),
  squash: lerp(a.squash, b.squash, t),
  airborne: t < 0.5 ? a.airborne : b.airborne,
});

export const mixExpr = (a: Expression, b: Expression, t: number): Expression => {
  const o = {} as Expression;
  (Object.keys(a) as (keyof Expression)[]).forEach((k) => (o[k] = lerp(a[k], b[k], t)));
  return o;
};

export type PoseRef = PoseName | Pose | (Partial<Pose> & { base: PoseName });
export const resolvePose = (p: PoseRef): Pose => {
  if (typeof p === "string") return POSES[p];
  if ("base" in p) {
    const { base, ...rest } = p;
    return { ...POSES[base], ...rest } as Pose;
  }
  return p as Pose;
};
export type ExprRef = ExprName | Expression | (Partial<Expression> & { base: ExprName });
export const resolveExpr = (e: ExprRef): Expression => {
  if (typeof e === "string") return EXPRESSIONS[e];
  if ("base" in e) {
    const { base, ...rest } = e;
    return { ...EXPRESSIONS[base], ...rest } as Expression;
  }
  return e as Expression;
};

/**
 * Trilha de poses: [[frame, pose], ...]. A partir de cada frame o corpo transita
 * para a nova pose em `blend` frames (com leve overshoot: antecipação natural).
 */
export const poseTrack = (frame: number, keys: [number, PoseRef][], blend = 9): Pose => {
  let cur = resolvePose(keys[0][1]);
  for (let i = 1; i < keys.length; i++) {
    const [f, p] = keys[i];
    if (frame < f) break;
    const t = clamp((frame - f) / blend);
    cur = mixPose(cur, resolvePose(p), EASE.back(t));
  }
  return cur;
};

export const exprTrack = (frame: number, keys: [number, ExprRef][], blend = 5): Expression => {
  let cur = resolveExpr(keys[0][1]);
  for (let i = 1; i < keys.length; i++) {
    const [f, e] = keys[i];
    if (frame < f) break;
    const t = clamp((frame - f) / blend);
    cur = mixExpr(cur, resolveExpr(e), EASE.out(t));
  }
  return cur;
};

// ---------------------------------------------------------------- ciclos
/** Ciclo de caminhada. phase em ciclos (1 = passo esquerdo + direito). */
export const walkPose = (phase: number, run = 0): Pose => {
  const a = phase * Math.PI * 2;
  const s = Math.sin(a);
  const amp = lerp(24, 42, run);
  const knee = (ph: number) => lerp(6, 14, run) + lerp(34, 70, run) * Math.max(0, Math.sin(ph - 0.9));
  return P({
    lean: lerp(3, 12, run),
    headTilt: lerp(0, -4, run) + Math.sin(a * 2) * 1.2,
    legF: [amp * s, knee(a)],
    legB: [-amp * s, knee(a + Math.PI)],
    armF: [-lerp(20, 55, run) * s, lerp(16, 85, run)],
    armB: [lerp(20, 55, run) * s, lerp(16, 85, run)],
    handF: run > 0.5 ? "fist" : "open",
    handB: run > 0.5 ? "fist" : "open",
  });
};

/**
 * Caminhada de A até B. Retorna posição x, fase do ciclo (sem patinar: fase = distância/passada)
 * e quanto do ciclo aplicar (0 parado, 1 andando) — passe tudo para <Character walk>.
 */
export const walkBetween = (
  frame: number,
  f0: number,
  f1: number,
  x0: number,
  x1: number,
  opts: { scale?: number; stride?: number; run?: number } = {},
) => {
  const scale = opts.scale ?? 1;
  const stride = (opts.stride ?? (opts.run ? 300 : 190)) * scale;
  const t = clamp((frame - f0) / Math.max(1, f1 - f0));
  // aceleração/desaceleração suave sem perder sincronismo pé-chão
  const e = EASE.inOut(t);
  const x = lerp(x0, x1, e);
  const dist = Math.abs(x - x0);
  const moving = frame > f0 && frame < f1 ? clamp(Math.min((frame - f0) / 6, (f1 - frame) / 6)) : 0;
  return { x, phase: dist / stride, amount: moving, run: opts.run ?? 0, facing: (x1 >= x0 ? 1 : -1) as 1 | -1 };
};

/** Pulo: retorna deslocamento vertical (negativo = para cima) e squash. */
export const jumpAt = (frame: number, f0: number, height = 160, dur = 22) => {
  const t = (frame - f0) / dur;
  if (t < -0.25 || t > 1.25) return { y: 0, squash: 1, air: false };
  if (t < 0) return { y: 0, squash: 1 - 0.12 * Math.sin(((t + 0.25) / 0.25) * Math.PI * 0.5), air: false }; // antecipação
  if (t > 1) return { y: 0, squash: 1 - 0.1 * Math.sin(((t - 1) / 0.25) * Math.PI), air: false }; // aterrissagem
  return { y: -height * 4 * t * (1 - t), squash: 1 + 0.08 * Math.sin(t * Math.PI), air: true };
};
