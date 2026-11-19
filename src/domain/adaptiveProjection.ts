// Display coordinates are normalized to [-1,1]. Signed strength selects the wing.
import { project } from "./geometry";
import type { CameraPose, ObjectPosition } from "./types";
export type ProjectionMode = "normal" | "left" | "right" | "compare" | "auto";
export const centerPreservation = 0.28;
export const peripheralScale = 0.24;
export const curvature =
  (1 / peripheralScale - 1) / (2 * (1 - centerPreservation));
export function displayToSource(u: number, strength: number) {
  const outside = Math.max(0, Math.sign(strength) * u - centerPreservation);
  return u + strength * curvature * outside * outside;
}
export function sourceToDisplay(x: number, strength: number) {
  const side = Math.sign(strength),
    d = side * x - centerPreservation;
  if (!strength || d <= 0) return x;
  return (
    side *
    (centerPreservation +
      (2 * d) / (1 + Math.sqrt(1 + 4 * Math.abs(strength) * curvature * d)))
  );
}
// Moderate vertical stretch near the wing horizon. The bounded rational map
// keeps the top/bottom rays inside the same source texture and is invertible.
// Match local horizontal/vertical angular magnification at the horizon.
// Ease the correction in at the focus boundary and retain bounded vertical rays.
export const wingBlendWidth = 0.16;
export function verticalGain(u: number, strength: number, tanHalfFov: number) {
  const d = Math.max(0, Math.sign(strength) * u - centerPreservation);
  const raw = displayToSource(u, strength);
  const slope = 1 + 2 * Math.abs(strength) * curvature * d;
  const angularGain =
    (slope * Math.hypot(1, tanHalfFov * u)) / Math.hypot(1, tanHalfFov * raw);
  const mix = Math.min(1, d / wingBlendWidth);
  return 1 + (angularGain - 1) * mix * mix * (3 - 2 * mix);
}
export function projectWorldToDisplay(
  p: ObjectPosition,
  c: CameraPose,
  w: number,
  h: number,
  strength = 0,
) {
  const raw = project(p, c, w, h);
  if (!raw) return null;
  const u = sourceToDisplay((2 * raw.x) / w - 1, strength);
  const gain = verticalGain(u, strength, (Math.tan(c.verticalFov / 2) * w) / h),
    ry = 1 - (2 * raw.y) / h;
  if (Math.abs(ry) > 1 || Math.abs(u) > 1)
    return { ...raw, x: ((1 + u) * w) / 2 };
  const y = ry / (gain - (gain - 1) * Math.abs(ry));
  return {
    ...raw,
    x: ((1 + u) * w) / 2,
    y: ((1 - y) * h) / 2,
    scale: raw.scale / gain,
  };
}
