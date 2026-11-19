import type { CameraPose, ObjectPosition } from "./types";
export const rad = (deg: number) => (deg * Math.PI) / 180;
export function viewPoint(p: ObjectPosition, c: CameraPose) {
  const e = p.east - c.eye.east,
    n = p.north - c.eye.north,
    h = p.up - c.eye.up;
  const x = e * Math.cos(c.yaw) - n * Math.sin(c.yaw),
    f = e * Math.sin(c.yaw) + n * Math.cos(c.yaw);
  return {
    x,
    y: h * Math.cos(c.pitch) - f * Math.sin(c.pitch),
    z: f * Math.cos(c.pitch) + h * Math.sin(c.pitch),
  };
}
export function project(
  p: ObjectPosition,
  c: CameraPose,
  w: number,
  h: number,
) {
  const v = viewPoint(p, c);
  if (v.z <= 0.1) return null;
  const f = h / (2 * Math.tan(c.verticalFov / 2));
  return {
    x: w / 2 + (f * v.x) / v.z,
    y: h / 2 - (f * v.y) / v.z,
    scale: f / v.z,
  };
}
// Segment versus truck box: the segment ends at the target centre.
export function truckBlocks(
  eye: ObjectPosition,
  target: ObjectPosition,
  truck: ObjectPosition,
  size: number[],
) {
  let entry = 0,
    exit = 1;
  const bounds = {
    east: [-size[0] / 2, size[0] / 2],
    north: [-size[2] / 2, size[2] / 2],
    up: [0, size[1]],
  };
  for (const axis of ["east", "north", "up"] as const) {
    const delta = target[axis] - eye[axis],
      lo = truck[axis] + bounds[axis][0] - eye[axis],
      hi = truck[axis] + bounds[axis][1] - eye[axis];
    if (Math.abs(delta) < 1e-8) {
      if (lo > 0 || hi < 0) return false;
      continue;
    }
    entry = Math.max(entry, Math.min(lo / delta, hi / delta));
    exit = Math.min(exit, Math.max(lo / delta, hi / delta));
    if (entry > exit) return false;
  }
  return entry < 0.999 && exit > 0;
}

export function verticalFov(horizontalDegrees: number, aspect: number) {
  return (
    2 * Math.atan(Math.tan(rad(horizontalDegrees) / 2) / Math.max(0.1, aspect))
  );
}

// Sample a metric grid on the estimated vehicle's rear face. This estimates
// silhouette coverage by the truck proxy, independently of the renderer's depth buffer.
export function coverage(
  eye: ObjectPosition,
  target: ObjectPosition,
  truck: ObjectPosition,
  truckSize: number[],
  targetSize: number[],
) {
  let blocked = 0;
  for (const u of [-0.45, 0, 0.45])
    for (const h of [0.17, 0.52, 0.9]) {
      const p = {
        east: target.east + u * targetSize[0],
        north: target.north - targetSize[2] / 2,
        up: targetSize[1] * h,
      };
      if (truckBlocks(eye, p, truck, truckSize)) blocked++;
    }
  return blocked / 9;
}
