import { cfg, defaults, frame, type Controls } from "./corridor";
import type { Scenario } from "../data/scenarios";
import type { SceneState } from "../domain/types";

export const filmDuration = 180;
export const chapters = [
  { start: 0, end: 15, title: "Prologue", cn: "序幕" },
  { start: 15, end: 45, title: "The unseen", cn: "穿过遮挡" },
  { start: 45, end: 75, title: "Beyond the frame", cn: "视野之外" },
  { start: 75, end: 105, title: "When data fades", cn: "感知的边界" },
  { start: 105, end: 136, title: "How light reaches you", cn: "从数据到视野" },
  { start: 136, end: 151, title: "From simulation to reality", cn: "回到真实" },
  { start: 151, end: 180, title: "Future cockpit", cn: "未来座舱" },
] as const;
export const clamp = (u: number) => Math.min(1, Math.max(0, u));
export function smooth(value: number) {
  const u = clamp(value);
  return u * u * (3 - 2 * u);
}
export const ramp = (t: number, a: number, b: number) =>
  smooth((t - a) / (b - a));
const pulse = (t: number, a: number, b: number, c: number, d: number) =>
  ramp(t, a, b) * (1 - ramp(t, c, d));

// R5B receives stateless normalized chapter samples, including entry and exit poses.
export function opticalScene(progress: number) {
  return {
    progress,
    section: pulse(progress, 0.22, 0.36, 0.82, 0.93),
    angle: 1.12 + 0.28 * ramp(progress, 0.32, 0.7),
    dashboardReveal: pulse(progress, 0.065, 0.22, 0.93, 0.995),
    opticalComponentVisibility: pulse(progress, 0.1, 0.24, 0.9, 0.985),
    rayRevealProgress: pulse(progress, 0.36, 0.63, 0.82, 0.91),
    virtualRayProgress: pulse(progress, 0.64, 0.75, 0.81, 0.9),
    environmentFade: pulse(progress, 0.09, 0.22, 0.93, 1),
    image: 1 - ramp(progress, 0.12, 0.25) + ramp(progress, 0.9, 1),
  };
}
export function realityComparison(progress: number) {
  return {
    progress,
    section: 0,
    boundary: pulse(progress, 0.12, 0.34, 0.91, 1),
    eyeX: 0.08 * pulse(progress, 0.56, 0.68, 0.75, 0.89),
    wipe: 1 - ramp(progress, 0.42, 0.84),
  };
}
export function cockpitFuture(progress: number) {
  return {
    progress,
    exterior: ramp(progress, 16 / 29, 24 / 29),
    console: pulse(progress, 2 / 29, 4 / 29, 7 / 29, 9 / 29),
    signature: ramp(progress, 19 / 29, 25 / 29),
  };
}

export function evidenceLevel(
  s: SceneState,
): "precise" | "estimated" | "directional" | "limited" | "stale" | "clear" {
  if (s.decision.policy === "PERCEPTION_LIMITED")
    return (s.network.communicationAge ?? 0) > cfg.maxAge ? "stale" : "limited";
  if (s.decision.mode === "world") return "precise";
  if (s.decision.mode === "region") return "estimated";
  if (s.decision.mode === "direction") return "directional";
  return "clear";
}
export function storyFrame(p: number) {
  const sec = clamp(p) * filmDuration,
    chapter = chapters.findIndex((c) => sec < c.end);
  const index = chapter < 0 ? 6 : chapter,
    c = chapters[index],
    local = clamp((sec - c.start) / (c.end - c.start));
  const optics = opticalScene(clamp((sec - 105) / 31)),
    reality = realityComparison(clamp((sec - 136) / 15)),
    future = cockpitFuture(clamp((sec - 151) / 29));
  const study =
    index === 4 ? optics.section : index === 5 ? reality.section : 0;
  const opts: Controls = { ...defaults };
  let scene: Scenario = "truck",
    time = 2.4 * ramp(sec, 0, 24) + (65 / 12 - 2.4) * ramp(sec, 32, 45),
    strength = 0;
  if (index === 2) {
    scene = "cross";
    time = 3.2 * ramp(sec, 45, 52) + 4.9 * ramp(sec, 63, 74);
    strength = -pulse(sec, 53, 59, 67, 72);
  } else if (index === 3 || index === 4) {
    scene = "degraded";
    time =
      4 +
      2.65 * ramp(sec, 90, 95) +
      1.55 * ramp(sec, 95, 100) +
      3.6 * ramp(sec, 100, 105);
    opts.qualityTimeline = false;
    opts.fogOverride = ramp(sec, 78, 91) * (1 - ramp(sec, 100, 105));
    opts.quality =
      sec < 80 || sec >= 103.5
        ? "high"
        : sec < 85 || sec >= 102
          ? "medium"
          : "low";
    opts.existenceOverride = sec >= 90 && sec < 100 ? 0.41 : null;
  } else if (index >= 5) {
    scene = "cross";
    time = 3.2 + 3.97 * ramp(sec, 160, 180);
    strength = -pulse(sec, 136, 137.8, 139, 142);
  }
  const s = frame(time, opts, scene, "left", strength < -0.001);
  const outside = 1 - ramp(sec, 2, 14),
    side = pulse(sec, 30, 36, 38, 45);
  const exit = future.exterior;
  const eye = { ...s.camera.eye };
  if (index === 5)
    eye.north +=
      (38 + 11.8 * cfg.egoSpeed - eye.north) * (1 - ramp(sec, 136, 139));
  eye.east += 0.14 * future.console;
  eye.up -= 0.05 * future.console;
  eye.north += 0.12 * future.console;
  eye.east -= outside * 3.9 + side * 5.8 + exit * 4.9;
  eye.north += -outside * 6.6 + side * 9.3 - exit * 7.2;
  eye.up += outside * 1.8 + side * 2.15 + exit * 1.2;
  s.camera = {
    ...s.camera,
    eye,
    yaw: future.console * 0.31 + outside * 0.32 + side * 0.3 + exit * 0.39,
    pitch:
      s.camera.pitch -
      future.console * 0.24 -
      outside * 0.15 -
      side * 0.13 -
      exit * 0.09,
  };
  const reveal = pulse(sec, 30, 33, 38, 41);
  const xrayAmount =
    index === 1 ? pulse(sec, 23, 26, 30, 31) : index === 3 ? 1 : 0;
  const cabinOpacity =
    (1 - ramp(outside, 0.015, 0.15)) *
    (1 - ramp(side, 0.015, 0.17)) *
    (1 - ramp(exit, 0.01, 0.15));
  return {
    s,
    sec,
    crossingType: pulse(sec, 65.2, 67.3, 71.4, 73.4),
    chapter: index,
    local,
    strength,
    reveal,
    xray: xrayAmount > 0,
    xrayAmount,
    hud:
      index === 1
        ? sec >= 23 && sec < 40
        : index === 2
          ? sec > 47
          : index === 3,
    cockpit: cabinOpacity > 0,
    cabinOpacity,
    exterior: outside > 0.16 || exit > 0.16,
    study,
    studyAngle: index === 4 ? optics.angle : 1,
    optics,
    reality,
    future,
    wipe: 1,
    evidence: evidenceLevel(s),
  };
}
export type StorySample = ReturnType<typeof storyFrame>;
