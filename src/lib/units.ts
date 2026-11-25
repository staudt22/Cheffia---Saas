import type { InventoryUnit } from "@/lib/types";

/** Mirrors public.convert_quantity in SQL. Returns null for incompatible units. */
export function convertQuantity(qty: number, from: InventoryUnit, to: InventoryUnit): number | null {
  if (from === to) return qty;
  if (from === "g" && to === "kg") return qty / 1000;
  if (from === "kg" && to === "g") return qty * 1000;
  if (from === "ml" && to === "l") return qty / 1000;
  if (from === "l" && to === "ml") return qty * 1000;
  return null;
}

export function compatibleUnits(unit: InventoryUnit): InventoryUnit[] {
  if (unit === "kg" || unit === "g") return ["g", "kg"];
  if (unit === "l" || unit === "ml") return ["ml", "l"];
  return [unit];
}

export function defaultRecipeUnit(unit: InventoryUnit): InventoryUnit {
  return unit === "kg" ? "g" : unit === "l" ? "ml" : unit;
}
