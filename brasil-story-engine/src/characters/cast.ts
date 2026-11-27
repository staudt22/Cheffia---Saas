/**
 * ELENCO FIXO DO CANAL — estilo original "Bairro".
 * Estes personagens se repetem entre episódios; nunca altere cores/traços
 * de um personagem existente (consistência). Para um personagem novo,
 * adicione uma entrada nova.
 */
import { CharacterDef } from "./types";

export const CAST = {
  /** Protagonista "você": neutro, identificável, camiseta laranja-queimado. */
  voce: {
    id: "voce",
    name: "Você (Davi)",
    bio: "Protagonista padrão das histórias em 2ª pessoa. 20 e poucos anos, cabelo cacheado, camiseta laranja, jeans.",
    skin: "#c98b5e",
    hair: { style: "curly", color: "#2e2026" },
    shirt: { style: "tee", color: "#ff8a3d" },
    pants: { style: "jeans", color: "#3d5a8a" },
    shoes: "#f4f1ea",
    voice: "narrador",
  },
  /** Protagonista alternativa. */
  bia: {
    id: "bia",
    name: "Bia",
    bio: "Amiga/protagonista alternativa. Rabo de cavalo, camiseta verde-água, saia mostarda.",
    skin: "#8d5a3b",
    hair: { style: "ponytail", color: "#1f1517" },
    shirt: { style: "tee", color: "#2aa79b" },
    pants: { style: "skirt", color: "#e8b13a" },
    shoes: "#3a2f45",
    accessories: { earrings: "#ffc83d" },
    voice: "bia",
  },
  /** Vizinha fofoqueira e adorável. */
  neide: {
    id: "neide",
    name: "Dona Neide",
    bio: "Vizinha de 68 anos, coque grisalho, óculos vermelhos, blusa lilás. Sabe de tudo antes de todo mundo.",
    skin: "#e2b08c",
    hair: { style: "bun", color: "#c9c4cf" },
    shirt: { style: "blouse", color: "#a684d6", detail: "#f2c6e0" },
    pants: { style: "skirt", color: "#5b4a7a" },
    shoes: "#7a3b3b",
    accessories: { glasses: "#d64545", necklace: "#ffd27a" },
    build: { height: 0.9, width: 1.08 },
    voice: "neide",
  },
  /** Dono do mercadinho/padaria. */
  valdir: {
    id: "valdir",
    name: "Seu Valdir",
    bio: "Dono da padaria da esquina. Careca, bigode, avental branco sobre camisa azul.",
    skin: "#d9a074",
    hair: { style: "bald", color: "#4a3a33" },
    shirt: { style: "polo", color: "#4f7fbf" },
    pants: { style: "jeans", color: "#3b3b48" },
    shoes: "#2b2233",
    accessories: { mustache: true, apron: "#f7f3ea" },
    build: { height: 0.96, width: 1.22 },
    voice: "valdir",
  },
  /** Criança (sobrinho, aluno, etc.). */
  theo: {
    id: "theo",
    name: "Théo",
    bio: "Criança de 9 anos, boné vermelho, camiseta amarela, bermuda.",
    skin: "#f0c39d",
    hair: { style: "short", color: "#6b4228" },
    shirt: { style: "tee", color: "#ffd34d" },
    pants: { style: "shorts", color: "#3f6fb0" },
    shoes: "#e5574d",
    accessories: { cap: "#e5574d" },
    build: { height: 0.66, width: 0.85, head: 0.95 },
    voice: "theo",
  },
  /** Idoso do bairro (bisavô). */
  joao: {
    id: "joao",
    name: "Seu João",
    bio: "Bisavô de 86 anos, careca com cabelo branco nas laterais, bigode branco, óculos, camisa bege de botão.",
    skin: "#d9a074",
    hair: { style: "bald", color: "#e9e6ef" },
    shirt: { style: "polo", color: "#d9c39a" },
    pants: { style: "jeans", color: "#6b5a48" },
    shoes: "#4a3a33",
    accessories: { mustache: true, glasses: "#4a3f55" },
    build: { height: 0.86, width: 1.0, head: 0.98 },
    voice: "valdir",
  },
  /** Figurante genérico (motorista, gerente, apresentador, etc.). */
  rafa: {
    id: "rafa",
    name: "Rafa",
    bio: "Figurante versátil: cabelo black power, jaqueta verde-oliva. Use como motorista, repórter, colega de trabalho.",
    skin: "#6e4630",
    hair: { style: "afro", color: "#1d1416" },
    shirt: { style: "jacket", color: "#6f7d45" },
    pants: { style: "jeans", color: "#2f3550" },
    shoes: "#d9cfc1",
    accessories: { beard: true },
    voice: "rafa",
  },
} satisfies Record<string, CharacterDef>;

export type CastId = keyof typeof CAST;

/** Figurantes de multidão: variações determinísticas (paleta controlada). */
const SKINS = ["#f0c39d", "#e2b08c", "#c98b5e", "#a86f48", "#8d5a3b", "#6e4630"];
const SHIRTS = ["#e5574d", "#4f7fbf", "#2aa79b", "#ffd34d", "#a684d6", "#ff8a3d", "#7cc26b", "#f2f2f2"];
const PANTS = ["#3d5a8a", "#2f3550", "#5b4a7a", "#6b5a48", "#3b3b48"];
const HAIRS: CharacterDef["hair"]["style"][] = ["short", "curly", "long", "ponytail", "afro", "bald", "bun"];
const HAIRC = ["#1f1517", "#2e2026", "#6b4228", "#c9c4cf", "#8a5434"];
export const extra = (i: number): CharacterDef => ({
  id: `extra${i}`,
  name: `Figurante ${i}`,
  bio: "figurante",
  skin: SKINS[(i * 7) % SKINS.length],
  hair: { style: HAIRS[(i * 3) % HAIRS.length], color: HAIRC[(i * 5) % HAIRC.length] },
  shirt: { style: i % 4 === 0 ? "polo" : "tee", color: SHIRTS[(i * 5 + 1) % SHIRTS.length] },
  pants: { style: i % 5 === 2 ? "skirt" : i % 3 === 0 ? "shorts" : "jeans", color: PANTS[(i * 3) % PANTS.length] },
  shoes: ["#2b2233", "#f4f1ea", "#7a3b3b"][i % 3],
  accessories: i % 6 === 1 ? { glasses: "#2b2233" } : i % 7 === 3 ? { cap: SHIRTS[(i + 3) % SHIRTS.length] } : {},
  build: { height: 0.92 + ((i * 37) % 17) / 100, width: 0.92 + ((i * 53) % 25) / 100 },
});
