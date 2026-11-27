/** Galeria de cenários com personagens para inspeção visual (npm run studio → SceneGallery). */
import React from "react";
import { useCurrentFrame } from "remotion";
import { Camera } from "../camera/Camera";
import { Character } from "../characters/Character";
import { CAST } from "../characters/cast";
import * as S from "../scenes";

export const SCENE_NAMES = ["bedroom", "street", "streetEnd", "bakery", "city", "kitchen", "beach", "classroom"] as const;

export const SceneGallery: React.FC<{ scene: (typeof SCENE_NAMES)[number] }> = ({ scene }) => {
  const f = useCurrentFrame();
  const C = (x: number, y: number, id: keyof typeof CAST = "voce") => <Character def={CAST[id]} frame={f} x={x} y={y} pose="idle" expr="happy" />;
  switch (scene) {
    case "bedroom":
      return <Camera frame={f}><S.Bedroom frame={f}>{C(960, S.BEDROOM_FLOOR + 40)}</S.Bedroom></Camera>;
    case "street":
      return <Camera frame={f} state={{ x: 960 }}><S.Street frame={f} cars={[{ x: 1400 }]}>{C(700, S.STREET_WALK)}{C(1350, S.STREET_WALK, "neide")}</S.Street></Camera>;
    case "streetEnd":
      return <Camera frame={f} state={{ x: 3200, zoom: 0.85 }}><S.Street frame={f}>{C(2700, S.STREET_WALK)}{C(3560, S.STREET_WALK, "valdir")}</S.Street></Camera>;
    case "bakery":
      return <Camera frame={f}><S.Bakery frame={f} behind={C(1000, S.BAKERY_FLOOR - 40, "valdir")}>{C(1650, S.BAKERY_FLOOR + 40)}</S.Bakery></Camera>;
    case "city":
      return <Camera frame={f}><S.City frame={f} /></Camera>;
    case "kitchen":
      return <Camera frame={f}><S.Kitchen frame={f} fridgeOpen={0.6}>{C(1100, S.KITCHEN_FLOOR + 40, "bia")}</S.Kitchen></Camera>;
    case "beach":
      return <Camera frame={f}><S.Beach frame={f}>{C(900, S.BEACH_SAND + 60, "theo")}</S.Beach></Camera>;
    case "classroom":
      return <Camera frame={f}><S.Classroom frame={f}>{C(1700, S.CLASSROOM_FLOOR, "rafa")}</S.Classroom></Camera>;
  }
};
