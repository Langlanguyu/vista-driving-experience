// Optical bench in driver-local metres: right +X, up +Y, forward -Z.
import { Vector3 as V, Matrix3 } from "three";
const vec = (x = 0, y = 0, z = 0) => new V(x, y, z);
const toward = (a: V, b: V) => b.clone().sub(a).normalize();
export interface Surface {
  center: V;
  normal: V;
  horizontal: V;
  vertical: V;
  width: number;
  height: number;
}
export function surface(
  center: V,
  normal: V,
  width: number,
  height: number,
): Surface {
  const horizontal = vec(1).addScaledVector(normal, -normal.x).normalize();
  return {
    center,
    normal,
    horizontal,
    vertical: normal.clone().cross(horizontal),
    width,
    height,
  };
}
export function inAperture(p: V, s: Surface) {
  const offset = p.clone().sub(s.center);
  return (
    Math.abs(offset.dot(s.horizontal)) <= s.width / 2 + 1e-8 &&
    Math.abs(offset.dot(s.vertical)) <= s.height / 2 + 1e-8
  );
}
export function intersectPlane(o: V, d: V, s: Surface, finite = true) {
  const dot = d.dot(s.normal);
  if (Math.abs(dot) < 1e-9) return null;
  const t = s.center.clone().sub(o).dot(s.normal) / dot;
  if (t < 1e-7) return null;
  const p = o.clone().addScaledVector(d, t);
  return !finite || inAperture(p, s) ? p : null;
}
export const reflect = (d: V, n: V) =>
  d
    .clone()
    .addScaledVector(n, -2 * d.dot(n))
    .normalize();
const mirrored = (p: V, s: Surface) =>
  p
    .clone()
    .addScaledVector(s.normal, -2 * p.clone().sub(s.center).dot(s.normal));
export const opticalCase = {
  horizontal: 13,
  vertical: 5,
  eyeWidth: 0.13,
  eyeHeight: 0.05,
  vid: 10,
};
export function imageSize(vid: number) {
  return {
    width: 2 * vid * Math.tan((13 * Math.PI) / 360),
    height: 2 * vid * Math.tan((5 * Math.PI) / 360),
  };
}
export function opticalBench(vid = 10, flat = false) {
  const eye = vec(),
    glass = surface(
      vec(0, -0.115, -1.0984),
      vec(0, -0.45 / 0.89, 1).normalize(),
      0.51,
      0.27,
    );
  const out = toward(glass.center, eye),
    incoming = reflect(out, glass.normal);
  const m2 = glass.center.clone().addScaledVector(incoming, -0.48),
    m1 = m2.clone().add(vec(0.16, -0.07, -0.28)),
    pgu = m1.clone().add(vec(0.16, 0.095, 0.14));
  const mirror1 = surface(
    m1,
    toward(pgu, m1).sub(toward(m1, m2)).normalize(),
    0.146,
    0.113,
  );
  const mirror2 = surface(
    m2,
    toward(m1, m2).sub(incoming).normalize(),
    0.32,
    0.22,
  );
  const emitter = surface(pgu, toward(pgu, m1), 0.085, 0.054);
  const virtual = glass.center.clone().normalize().multiplyScalar(vid);
  const source = mirrored(pgu, mirror1),
    focus = mirrored(virtual, glass);
  // Confocal hyperboloid patch. Its path difference gradient supplies the actual surface normal.
  const level = m2.distanceTo(source) - m2.distanceTo(focus);
  const normal = (p: V) =>
    flat ? mirror2.normal : toward(source, p).sub(toward(focus, p)).normalize();
  function hitMain(o: V, d: V, finite = true) {
    const tangent = intersectPlane(o, d, mirror2, false);
    if (!tangent) return null;
    let t = tangent.distanceTo(o);
    if (!flat)
      for (let i = 0; i < 12; i++) {
        const p = o.clone().addScaledVector(d, t);
        const f = p.distanceTo(source) - p.distanceTo(focus) - level;
        if (Math.abs(f) < 1e-10) break;
        const derivative = d.dot(toward(source, p).sub(toward(focus, p)));
        if (Math.abs(derivative) < 1e-7) return null;
        t -= f / derivative;
      }
    const p = o.clone().addScaledVector(d, t);
    if (
      t < 1e-7 ||
      (!flat &&
        Math.abs(p.distanceTo(source) - p.distanceTo(focus) - level) > 1e-7)
    )
      return null;
    return !finite || inAperture(p, mirror2) ? p : null;
  }
  if (flat) virtual.copy(mirrored(mirrored(source, mirror2), glass));
  return {
    emitter,
    mirror1,
    mirror2,
    glass,
    eye: surface(eye, vec(0, 0, 1), 0.13, 0.05),
    virtual,
    normal,
    hitMain,
  };
}
type Bench = ReturnType<typeof opticalBench>;
export function traceForward(bench: Bench, o: V, d: V) {
  const { mirror1, glass, eye } = bench;
  const m = intersectPlane(o, d, mirror1);
  if (!m) return null;
  const d1 = reflect(d, mirror1.normal),
    n = bench.hitMain(m, d1);
  if (!n) return null;
  const d2 = reflect(d1, bench.normal(n)),
    w = intersectPlane(n, d2, glass);
  if (!w) return null;
  const received = reflect(d2, glass.normal),
    e = intersectPlane(w, received, eye);
  if (!e) return null;
  return { points: [o, m, n, w, e], received };
}
export function solveOptics(
  vid: number,
  eyeX: number,
  eyeY: number,
  flat = false,
) {
  const bench = opticalBench(vid, flat);
  const rays: NonNullable<ReturnType<typeof traceForward>>[] = [];
  // Sample the finite pupil at its requested eye position. Reverse shooting finds the
  // PGU pixel and launch direction, then independent forward tracing checks each hit.
  const fields: {
    path: NonNullable<ReturnType<typeof traceForward>>;
    pixel: V;
  }[] = [];
  for (const field of [-1, 0, 1])
    for (const x of [-0.0025, 0, 0.0025])
      for (const y of [-0.0025, 0, 0.0025]) {
        const eye = vec(eyeX + x, eyeY + y, 0),
          pixel = bench.virtual
            .clone()
            .add(
              vec(
                field * imageSize(vid).width * 0.1,
                field * imageSize(vid).height * 0.08,
                0,
              ),
            ),
          d = toward(eye, pixel);
        const w = intersectPlane(eye, d, bench.glass);
        if (!w) continue;
        const d1 = reflect(d, bench.glass.normal),
          n = bench.hitMain(w, d1);
        if (!n) continue;
        const d2 = reflect(d1, bench.normal(n)),
          m = intersectPlane(n, d2, bench.mirror1);
        if (!m) continue;
        const p = intersectPlane(
          m,
          reflect(d2, bench.mirror1.normal),
          bench.emitter,
        );
        if (!p) continue;
        const path = traceForward(bench, p, toward(p, m));
        if (path && path.points[4].distanceTo(eye) < 1e-5) {
          if (field === 0) rays.push(path);
          if (x === 0 && y === 0) fields.push({ path, pixel });
        }
      }
  const matrix = new Matrix3().set(0, 0, 0, 0, 0, 0, 0, 0, 0),
    rhs = vec();
  for (const { received: d, points } of rays) {
    const a = new Matrix3().set(
      1 - d.x * d.x,
      -d.x * d.y,
      -d.x * d.z,
      -d.y * d.x,
      1 - d.y * d.y,
      -d.y * d.z,
      -d.z * d.x,
      -d.z * d.y,
      1 - d.z * d.z,
    );
    for (let i = 0; i < 9; i++) matrix.elements[i] += a.elements[i];
    rhs.add(points[4].clone().applyMatrix3(a));
  }
  const image =
    rays.length >= 3 && Math.abs(matrix.determinant()) > 1e-12
      ? rhs.applyMatrix3(matrix.invert())
      : null;
  const residual = image
    ? Math.sqrt(
        rays.reduce(
          (sum, r) =>
            sum + image.clone().sub(r.points[4]).cross(r.received).lengthSq(),
          0,
        ) / rays.length,
      )
    : null;
  return {
    bench,
    rays,
    fields,
    image,
    residual,
    size: imageSize(image?.length() ?? vid),
  };
}
// Intersect a driver's sight ray with the finite reference virtual plane and glass.
export function displayBoundary(
  target: V,
  eyeOffset: V,
  bench: Bench,
  vid: number,
) {
  if (!inAperture(eyeOffset, bench.eye)) return "eye" as const;
  const axis = bench.virtual.clone().normalize(),
    { width, height } = imageSize(vid);
  const window = surface(bench.virtual, axis, width, height);
  const d = toward(eyeOffset, target);
  if (
    !intersectPlane(eyeOffset, d, window) ||
    !intersectPlane(eyeOffset, d, bench.glass)
  )
    return "field" as const;
  return "inside" as const;
}
