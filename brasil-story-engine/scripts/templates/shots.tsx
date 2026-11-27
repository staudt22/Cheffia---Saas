/** Cenas de "__TITLE__". Cada cena: frame local + duração. Use useLine("lXX") para sincronizar com a voz. */
import React from "react";
import { Camera } from "../../src/camera/Camera";
import { Character } from "../../src/characters/Character";
import { CAST } from "../../src/characters/cast";
import { walkBetween } from "../../src/characters/library";
import { useLine } from "../../src/core/timeline";
import * as S from "../../src/scenes";
import type { ShotComponent } from "../../src/episode/types";

const S01: ShotComponent = ({ frame: f, dur }) => {
  const l01 = useLine("l01");
  const w = walkBetween(f, 0, l01.end, 300, 900);
  return (
    <Camera frame={f} keys={[{ f: 0, x: 700, y: 620, zoom: 1.3 }, { f: dur, x: 900, y: 600, zoom: 1.5 }]}>
      <S.Street frame={f}>
        <Character def={CAST.voce} frame={f} x={w.x} y={S.STREET_WALK} walk={w} expr={f < l01.mid ? "neutral" : "confused"} />
      </S.Street>
    </Camera>
  );
};

export const SHOTS = { s01: S01 };
