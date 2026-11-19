import cfg from "../data/corridor.json";
import type {
  HUDDisplayDecision,
  RiskAssessment,
  TrackedObject,
  ObjectPosition,
} from "./types";
type Mode = HUDDisplayDecision["mode"];
const states = {
  world: ["CONFIRMED_TARGET", "确认"],
  region: ["ESTIMATED_TARGET", "估计"],
  direction: ["DIRECTION_ONLY", "降级"],
  unavailable: ["PERCEPTION_LIMITED", "不可用"],
  none: ["NO_WARNING", "无提示"],
} as const;
export function chooseQuality(
  track: TrackedObject,
  age: number,
  wasPrecise: boolean,
) {
  const q = track.quality;
  if (q.existence < 0.52 || q.stability < 0.32 || age > cfg.maxAge)
    return "unavailable";
  if (
    q.uncertainty.lateralSigmaM > cfg.regionSigma ||
    q.existence < 0.7 ||
    q.stability < 0.5
  )
    return "direction";
  // Schmitt band on the sampled position error; reacquisition has a stricter threshold.
  if (
    q.uncertainty.lateralSigmaM > (wasPrecise ? 0.44 : 0.36) ||
    age > cfg.nearAge ||
    q.stability < 0.78
  )
    return "region";
  return "world";
}
export function displayDecision(
  mode: Mode,
  id: string,
  anchor: ObjectPosition | null,
  reason: string,
  direction: HUDDisplayDecision["direction"],
  risk: RiskAssessment,
  sigmaM: number | null,
  occlusion: HUDDisplayDecision["occlusion"],
  coverage: number | null,
): HUDDisplayDecision {
  const [policy, status] = states[mode];
  return {
    mode,
    id,
    policy,
    status,
    anchor: mode === "world" || mode === "region" ? anchor : null,
    reason,
    direction,
    risk,
    sigmaM,
    occlusion,
    coverage,
  };
}

interface PolicyInput {
  id: string;
  track: TrackedObject | null;
  age: number | null;
  sensorVisibility: number;
  risk: RiskAssessment;
  direction: HUDDisplayDecision["direction"];
  inHud: boolean;
  baseline: boolean;
  cleared: boolean;
  wasPrecise: boolean;
  occlusion: HUDDisplayDecision["occlusion"];
  coverage: number | null;
}
export function perceptionDisplayPolicy(i: PolicyInput): HUDDisplayDecision {
  const track = i.track;
  let mode: Mode = "unavailable",
    reason =
      i.age === null
        ? "等待有效观测"
        : i.age > cfg.maxAge
          ? "V2X 观测已过期"
          : "目标依据不足";
  if (track && i.age !== null && i.age <= cfg.maxAge) {
    mode = chooseQuality(track, i.age, i.wasPrecise);
    if (i.cleared) {
      const resolved = mode === "world" && i.sensorVisibility >= 0.45;
      mode = resolved ? "none" : "unavailable";
      reason = resolved
        ? "可靠观测确认已驶离冲突区"
        : "依据不足，无法确认风险解除";
    } else if (mode !== "unavailable") {
      if (i.baseline || !i.inHud) mode = "direction";
      reason = i.baseline
        ? "固定位置提示"
        : !i.inHud
          ? "超出驾驶 HUD 视场"
          : mode === "direction"
            ? "位置或跟踪依据不足"
            : mode === "region"
              ? "位置或跟踪仍在估计"
              : "路侧位置配准有效";
    }
  }
  if (mode === "unavailable")
    return displayDecision(
      mode,
      i.id,
      null,
      reason,
      i.direction,
      { level: "unknown", ttcS: null },
      null,
      null,
      null,
    );
  return displayDecision(
    mode,
    i.id,
    track?.position ?? null,
    reason,
    i.direction,
    i.risk,
    track?.quality.uncertainty.lateralSigmaM ?? null,
    i.occlusion,
    i.coverage,
  );
}
