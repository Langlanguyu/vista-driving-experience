// Run with node --import tsx scripts/r5b-metrics.ts. Pixel units at 1440 x 900.
import { writeFileSync } from "node:fs";
import { defaults, frame } from "../src/scenes/corridor";
import {
  projectionField,
  labMetrics,
  registerPoint,
  bridgePoint,
  researchDefaults,
  mappedPoint,
  type Algorithm,
} from "../src/domain/researchProjection";
import { solveOptics } from "../src/domain/opticalRayTracer";
const width = 1440,
  height = 900,
  s = frame(2.4, defaults, "cross", "left", true);
const rows = [];
for (const mode of ["normal", "current", "pannini", "structure"] as const) {
  const algorithm: Algorithm = mode === "normal" ? "current" : mode;
  const settings = { ...researchDefaults, algorithm };
  const field = projectionField(
    s.camera,
    width,
    height,
    s.track!.position,
    mode === "normal" ? 0 : -1,
    settings,
  );
  let centerMax = 0,
    maxStep = 0,
    maxSecondDiff = 0;
  for (const x of [-0.25, -0.125, 0, 0.125, 0.25])
    for (const y of [-0.84, -0.42, 0, 0.42, 0.84]) {
      const q = mappedPoint(field, x, y);
      centerMax = Math.max(
        centerMax,
        Math.hypot(((q.u - x) * width) / 2, ((q.v - y) * height) / 2),
      );
    }
  // Moving eye/vehicle plus a smooth wing deployment, sampled at 60 Hz over two seconds.
  const samples = [];
  for (let i = 0; i <= 120; i++) {
    const u = i / 120,
      power = mode === "normal" ? 0 : -u * u * (3 - 2 * u);
    const live = frame(1.2 + i / 60, defaults, "cross", "left", true);
    const grid = projectionField(
      live.camera,
      width,
      height,
      live.track?.position ?? null,
      power,
      settings,
    );
    const anchor = registerPoint(
      bridgePoint(-16),
      live.camera,
      width,
      height,
      grid,
    )!;
    samples.push(anchor);
    if (i > 0) {
      const b = samples[i - 1];
      maxStep = Math.max(maxStep, Math.hypot(anchor.x - b.x, anchor.y - b.y));
    }
    if (i > 1) {
      const a = samples[i - 2],
        b = samples[i - 1];
      maxSecondDiff = Math.max(
        maxSecondDiff,
        Math.hypot(anchor.x - 2 * b.x + a.x, anchor.y - 2 * b.y + a.y),
      );
    }
  }
  rows.push({
    mode,
    ...labMetrics(field, s.camera, width, height, s.truth.target),
    centerMaxPx: centerMax,
    maxStepPx60Hz: maxStep,
    maxSecondDifferencePx60Hz: maxSecondDiff,
  });
}
const optics = [];
for (const d of [3, 7.5, 10, 14])
  for (const x of [0, 0.06, 0.065, 0.085]) {
    const { rays, image, residual, fields } = solveOptics(d, x, 0);
    optics.push({
      designM: d,
      eyeXmm: 1000 * x,
      accepted: rays.length,
      fieldChiefRays: fields.length,
      fittedM: image?.length() ?? null,
      rmsLineResidualM: residual,
    });
  }
writeFileSync(
  "docs/verification/round5b/geometry.json",
  JSON.stringify(
    { viewport: [width, height], cueSeconds: 2.4, rows, optics },
    null,
    2,
  ) + "\n",
);
