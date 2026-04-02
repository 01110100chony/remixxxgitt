/**
 * Utility functions for filtering orientations to postgraduate-only (mestrado/doutorado).
 * Used across dashboard, evaluation, and reports.
 */

const PG_TYPES = ["mestrado", "doutorado", "pós-doutorado"];

/**
 * Returns true if the orientation type is postgraduate (mestrado, doutorado, pós-doutorado).
 * Matches against the `type` field stored in the DB (originally from Lattes `kind`).
 */
export function isPGOrientation(type: string): boolean {
  const t = type.toLowerCase();
  return PG_TYPES.some((pg) => t.includes(pg));
}

export function isMestrado(type: string): boolean {
  const t = type.toLowerCase();
  return t.includes("mestrado") && !t.includes("pós");
}

export function isDoutorado(type: string): boolean {
  return type.toLowerCase().includes("doutorado");
}

export function isPosDoutorado(type: string): boolean {
  return type.toLowerCase().includes("pós-doutorado");
}

export function getQuadrienio(): [number, number] {
  const y = new Date().getFullYear();
  return [y - 3, y];
}
