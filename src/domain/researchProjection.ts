// Backward ray map shared byte-for-byte by the screen pass and HUD registration.
import { project } from "./geometry";
import { curvature, centerPreservation } from "./adaptiveProjection";
import type { CameraPose, ObjectPosition } from "./types";
export type Algorithm = "current" | "pannini" | "structure";
export interface ProjectionSettings {
  algorithm: Algorithm;
  center: number;
  protection: number;
}
export const researchDefaults: ProjectionSettings = {
  algorithm: "structure",
  center: 0.28,
  protection: 1,
};
export const NX = 129,
  NY = 65;
const clamp = (n: number, l = 0, h = 1) => Math.min(h, Math.max(l, n));
const smooth = (n: number) => {
  const t = clamp(n);
  return t * t * (3 - 2 * t);
};
export function bridgePoint(x: number) {
  return {
    east: x * Math.cos(0.36) + 3.4 * Math.sin(0.36),
    north: 116 + x * Math.sin(0.36) - 3.4 * Math.cos(0.36),
    up: 11.1,
  };
}
export function projectionField(
  camera: CameraPose,
  w: number,
  h: number,
  target: ObjectPosition | null,
  strength: number,
  settings: ProjectionSettings,
) {
  const data = new Float32Array(NX * NY * 2),
    tan = (Math.tan(camera.verticalFov / 2) * w) / h;
  const convert = (p: ObjectPosition) => {
    const result = project(p, camera, w, h);
    return result
      ? { x: (2 * result.x) / w - 1, y: 1 - (2 * result.y) / h }
      : null;
  };
  const a = convert(bridgePoint(-47)),
    b = convert(bridgePoint(47));
  const railSlope = a && b ? (b.y - a.y) / (b.x - a.x) : 0;
  const vanishing = convert({ east: 0, north: 1e6, up: 0 });
  const car = target && convert(target);
  const bounds = [];
  if (target)
    for (const east of [-2.2, 2.2])
      for (const north of [-1.284, 1.284])
        for (const up of [-0.58, 0.58]) {
          const q = convert({
            east: target.east + east,
            north: target.north + north,
            up: target.up + up,
          });
          if (q) bounds.push(q);
        }
  const halfX = car
    ? Math.max(0.04, ...bounds.map((q) => Math.abs(q.x - car.x)))
    : 0;
  const halfY = car
    ? Math.max(0.055, ...bounds.map((q) => Math.abs(q.y - car.y)))
    : 0;
  const side = Math.sign(strength),
    power = Math.abs(strength),
    c = settings.center;
  const reach = curvature * (1 - centerPreservation) ** 2;
  const end = 1 + power * reach;
  // Stereographic Pannini (d=1): x'=2 tan(theta/2), y'=2 tan(phi)/(1+cos(theta)).
  const pan = (x: number) => 2 * Math.tan(Math.atan(x * tan) / 2);
  const p0 = pan(c),
    p1 = pan(end),
    dp =
      tan / Math.hypot(1, c * tan) ** 2 / Math.cos(Math.atan(c * tan) / 2) ** 2;
  function source(u: number) {
    const t = (side * u - c) / (1 - c);
    if (t <= 0 || power === 0) return u;
    const legacy = u + side * power * reach * t * t;
    if (settings.algorithm !== "pannini") return legacy;
    const q = p0 + dp * (1 - c) * t + (p1 - p0 - dp * (1 - c)) * t * t;
    return (
      (1 - power) * legacy +
      (power * side * Math.tan(2 * Math.atan(q / 2))) / tan
    );
  }
  // A rectilinear off-screen vehicle may already be severely stretched. Measure
  // its silhouette in a tangent camera centered on its sight ray at the SAME eye.
  const azimuth = Math.atan((car?.x ?? 0) * tan),
    co = Math.cos(azimuth),
    si = Math.sin(azimuth);
  const depth = (x: number) => Math.max(0.15, co + x * tan * si);
  const tangentX = (x: number) => (co * x - si / tan) / depth(x);
  const displayed = (x: number) => {
    if (settings.algorithm !== "structure") return x;
    const d = side * x - c;
    if (d <= 0 || !power) return x;
    return (
      side *
      (c +
        (2 * d) / (1 + Math.sqrt(1 + (4 * power * reach * d) / (1 - c) ** 2)))
    );
  };
  const minX = Math.min(...bounds.map((p) => p.x)),
    maxX = Math.max(...bounds.map((p) => p.x));
  const localScale = car
    ? (displayed(maxX) - displayed(minX)) / (tangentX(maxX) - tangentX(minX))
    : 1;
  const rows = new Float64Array(NY);
  for (let i = 0; i < NX; i++) {
    const u = (2 * i) / (NX - 1) - 1,
      x = source(u);
    const dx = (source(u + 0.0001) - source(u - 0.0001)) / 0.0002;
    const wing = smooth((side * u - c) / 0.16) * power;
    const gain =
      1 +
      ((dx * Math.hypot(1, tan * u)) / Math.hypot(1, tan * x) - 1) *
        smooth((side * u - c) / 0.16);
    const panScale = 2 / (1 + Math.hypot(1, x * tan)),
      centerScale = 2 / (1 + Math.hypot(1, c * tan));
    const rail = a ? a.y + railSlope * (x - a.x) : 2;
    const lineWeight =
      a && b
        ? smooth(
            (Math.min(x - Math.min(a.x, b.x), Math.max(a.x, b.x) - x) + 0.5) /
              0.35,
          )
        : 0;
    const carSize = halfX;
    const carWeight = car
      ? smooth(
          1 - Math.max(0, Math.abs(x - car.x) - carSize) / (carSize + 0.13),
        )
      : 0;
    for (let j = 0; j < NY; j++) {
      const y = (2 * j) / (NY - 1) - 1;
      const legacy = y / (gain - (gain - 1) * Math.abs(y));
      let mapped = legacy;
      if (settings.algorithm === "pannini")
        mapped =
          y *
          (1 +
            wing *
              (panScale / centerScale - 1) *
              (1 - smooth((Math.abs(y) - 0.7) / 0.3)));
      if (settings.algorithm === "structure") {
        // Continue the projected girder's central tangent; locally preserve vehicle aspect
        // with its same-eye local tangent image at the measured horizontal scale.
        const atRail =
          smooth(1 - Math.max(0, Math.abs(y - rail) - 0.13) / 0.45) *
          lineWeight;
        const shear = clamp(railSlope * (u - x), -0.36, 0.36) * atRail;
        const body = car
          ? (car.y + localScale * (y / depth(x) - car.y / depth(car.x)) - y) *
            wing *
            carWeight *
            smooth(1 - Math.max(0, Math.abs(y - car.y) - halfY - 0.06) / 0.19)
          : 0;
        // Longitudinal curb/ribbon lines converge on the projected road vanishing point.
        // Below the vehicle, retain their central tangent and fade toward the texture border.
        const road =
          vanishing && Math.abs(x - vanishing.x) > 0.05
            ? (y - vanishing.y) *
              ((u - vanishing.x) / (x - vanishing.x) - 1) *
              smooth((vanishing.y - y - 0.08) / 0.24) *
              (1 - carWeight)
            : 0;
        const result =
          y + (shear + body + road) * (1 - smooth((Math.abs(y) - 0.92) / 0.08));
        mapped = legacy + (result - legacy) * settings.protection;
      }
      // Project onto ordered ordinates, preserving endpoints and a positive Jacobian.
      rows[j] =
        j === 0
          ? -1
          : j === NY - 1
            ? 1
            : clamp(mapped, rows[j - 1] + 0.001, 1 - (NY - 1 - j) * 0.001);
    }
    let j = 0;
    for (let row = 0; row < NY; row++) {
      const y = (2 * row) / (NY - 1) - 1;
      while (j < NY - 2 && rows[j + 1] < y) j++;
      const k = 2 * (row * NX + i);
      data[k] = x;
      data[k + 1] =
        (2 * (j + (y - rows[j]) / (rows[j + 1] - rows[j]))) / (NY - 1) - 1;
    }
  }
  return { data, left: data[0], right: data[2 * (NX - 1)] };
}
export type Field = ReturnType<typeof projectionField>;
export function mappedPoint(field: Field, sx: number, sy: number) {
  const { data } = field;
  if (sx < field.left || sx > field.right) {
    const i = sx < field.left ? 0 : NX - 2;
    const f = (sx - data[2 * i]) / (data[2 * i + 2] - data[2 * i]);
    return { u: (2 * (i + f)) / (NX - 1) - 1, v: sy };
  }
  let lo = 0,
    hi = NX - 1;
  while (hi - lo > 1) {
    const m = (lo + hi) >> 1;
    if (data[2 * m] < sx) lo = m;
    else hi = m;
  }
  const fraction = (sx - data[2 * lo]) / (data[2 * hi] - data[2 * lo]);
  const u = (2 * (lo + fraction)) / (NX - 1) - 1;
  const value = (j: number) => {
    const k = 2 * (j * NX + lo) + 1;
    return data[k] + fraction * (data[k + 2] - data[k]);
  };
  if (Math.abs(sy) > 1) return { u, v: sy };
  let bottom = 0,
    top = NY - 1;
  while (top - bottom > 1) {
    const m = (top + bottom) >> 1;
    if (value(m) < sy) bottom = m;
    else top = m;
  }
  return {
    u,
    v:
      (2 * (bottom + (sy - value(bottom)) / (value(top) - value(bottom)))) /
        (NY - 1) -
      1,
  };
}
export function registerPoint(
  p: ObjectPosition,
  c: CameraPose,
  w: number,
  h: number,
  field: Field,
) {
  const raw = project(p, c, w, h);
  if (!raw) return null;
  const { u, v } = mappedPoint(field, (2 * raw.x) / w - 1, 1 - (2 * raw.y) / h);
  return { x: ((u + 1) * w) / 2, y: ((1 - v) * h) / 2, scale: raw.scale };
}
export function labMetrics(
  field: Field,
  camera: CameraPose,
  w: number,
  h: number,
  target: ObjectPosition,
) {
  const points = Array.from({ length: 95 }, (_, i) =>
    registerPoint(bridgePoint(i - 47), camera, w, h, field),
  ).filter((p) => p && p.x > 1 && p.x < w - 1 && p.y > 0 && p.y < h);
  const a = points[0],
    b = points.at(-1);
  const distances =
    a && b
      ? points.map(
          (p) =>
            Math.abs((b.x - a.x) * (a.y - p!.y) - (a.x - p!.x) * (b.y - a.y)) /
            Math.hypot(b.x - a.x, b.y - a.y),
        )
      : [];
  const rect = (mapped: boolean, local = false) => {
    const tangentCamera = {
      ...camera,
      yaw: Math.atan2(
        target.east - camera.eye.east,
        target.north - camera.eye.north,
      ),
    };
    const samples = [];
    for (const de of [-2.2, 2.2])
      for (const dn of [-1.2836, 1.2836])
        for (const up of [0, 1.1601]) {
          const p = { east: target.east + de, north: target.north + dn, up };
          const q = mapped
            ? registerPoint(p, camera, w, h, field)
            : project(p, local ? tangentCamera : camera, w, h);
          if (q) samples.push(q);
        }
    const xs = samples.map((p) => p.x),
      ys = samples.map((p) => p.y);
    return (
      (Math.max(...xs) - Math.min(...xs)) / (Math.max(...ys) - Math.min(...ys))
    );
  };
  const tan = (Math.tan(camera.verticalFov / 2) * w) / h;
  return {
    railRms: Math.sqrt(
      distances.reduce((a, b) => a + b * b, 0) / distances.length,
    ),
    railMax: Math.max(...distances),
    carAspectChange: 100 * (rect(true) / rect(false, true) - 1),
    aspectVsWidePerspective: 100 * (rect(true) / rect(false) - 1),
    extraDegrees:
      ((Math.atan(field.right * tan) -
        Math.atan(field.left * tan) -
        2 * Math.atan(tan)) *
        180) /
      Math.PI,
  };
}
