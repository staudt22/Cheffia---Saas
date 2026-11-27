export type HairStyle = "curly" | "short" | "bun" | "long" | "bald" | "afro" | "ponytail";
export type ShirtStyle = "tee" | "polo" | "blouse" | "tank" | "jacket";
export type PantsStyle = "jeans" | "shorts" | "skirt";

/** Ficha visual de um personagem. Mantenha em src/characters/cast.ts — nunca redesenhe por cena. */
export type CharacterDef = {
  id: string;
  name: string;
  /** descrição curta para a ficha/briefing */
  bio: string;
  skin: string;
  hair: { style: HairStyle; color: string };
  shirt: { style: ShirtStyle; color: string; detail?: string };
  pants: { style: PantsStyle; color: string };
  shoes: string;
  accessories?: {
    glasses?: string; // cor da armação
    cap?: string; // cor do boné
    mustache?: boolean;
    beard?: boolean;
    earrings?: string;
    apron?: string;
    necklace?: string;
  };
  /** proporções: 1 = adulto padrão (~455px de altura em escala 1) */
  build?: { height?: number; width?: number; head?: number };
  /** voz padrão (ver config/voices.json) */
  voice?: string;
};

export type HandShape = "open" | "fist" | "point" | "hold" | "thumb";

/** Ângulos em graus. 0 = membro apontando para baixo. Positivo = gira para FRENTE (direção em que o personagem olha). */
export type Pose = {
  lean: number; // inclinação do tronco
  headTilt: number;
  armB: [number, number]; // [ombro, cotovelo] braço de trás
  armF: [number, number]; // braço da frente
  legB: [number, number]; // [quadril, joelho] (joelho positivo dobra pra trás)
  legF: [number, number];
  handB: HandShape;
  handF: HandShape;
  /** rotação do corpo inteiro (quedas, deitar) */
  bodyRot: number;
  /** squash & stretch vertical (1 = normal) */
  squash: number;
  /** se true, não "cola" os pés no chão (salto/queda) */
  airborne?: boolean;
};

export type Expression = {
  browL: number; // levantar sobrancelha (px)
  browR: number;
  browAng: number; // + = bravo (interno pra baixo), - = preocupado
  lid: number; // pálpebra superior 0..1
  pupil: number; // escala da pupila
  squint: number; // > .5 desenha olhos felizes ^ ^
  mouthW: number;
  mouthOpen: number; // 0..1
  mouthCurve: number; // -1 (triste) .. 1 (sorriso)
  teeth: number; // 0..1
  tongue: number; // 0..1
  blush: number; // 0..1
  sweat: number; // 0..1
};
