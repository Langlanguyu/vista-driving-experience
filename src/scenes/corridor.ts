import cfg from "../data/corridor.json";
import type {
  EgoVehicle,
  Level,
  ObjectPosition,
  RiskAssessment,
  SceneState,
  TrackedObject,
} from "../domain/types";
import { fogLoad, junction, type Scenario, type Side } from "../data/scenarios";
import {
  chooseQuality,
  perceptionDisplayPolicy,
} from "../domain/displayPolicy";
import {
  rad,
  truckBlocks,
  coverage,
  verticalFov,
  viewPoint,
} from "../domain/geometry";
export { cfg };
export const pos = (east: number, north: number, up = 0): ObjectPosition => ({
  east,
  north,
  up,
});
// Car begins moving into the adjacent lane after six seconds (smoothstep).
export function targetAt(t: number) {
  const u = Math.min(1, Math.max(0, (t - 6) / 4));
  return {
    position: pos(
      -3.6 * u * u * (3 - 2 * u),
      cfg.targetStart + t * cfg.targetSpeed,
    ),
    velocity: pos(-5.4 * u * (1 - u), cfg.targetSpeed),
  };
}
export function riskOf(track: TrackedObject, ego: EgoVehicle): RiskAssessment {
  const closing = ego.velocity.north - track.velocity.north;
  const gap =
    track.position.north - ego.position.north - cfg.targetSize[2] / 2 - 1.5;
  const candidate = closing > 0 && gap > 0 ? gap / closing : null;
  const corridor =
    candidate !== null &&
    Math.abs(
      track.position.east -
        ego.position.east +
        candidate * (track.velocity.east - ego.velocity.east),
    ) < 1.9;
  const ttcS = corridor ? candidate : null;
  return {
    level: ttcS !== null && ttcS <= cfg.riskHorizon ? "caution" : "monitor",
    ttcS,
  };
}
export interface Controls {
  quality: Level;
  latencyMs: number;
  cutAt: number | null;
  restoreAt: number | null;
  baseline: boolean;
  fogOverride: number | null;
  linkTimeline: boolean;
  qualityTimeline: boolean;
  existenceOverride: number | null;
  stabilityOverride: number | null;
}
export const defaults: Controls = {
  quality: "high",
  latencyMs: 80,
  cutAt: null,
  restoreAt: null,
  baseline: false,
  fogOverride: null,
  linkTimeline: true,
  qualityTimeline: true,
  existenceOverride: null,
  stabilityOverride: null,
};
function trajectory(t: number, scene: Scenario, side: Side) {
  if (scene === "cross") {
    const sign = side === "left" ? 1 : -1;
    return {
      position: pos(sign * (-39 + 5.4 * t), junction.north),
      velocity: pos(sign * 5.4, 0),
    };
  }
  if (scene === "degraded")
    return {
      position: pos(-0.15, 38 + 32.5 + 11.35 * t),
      velocity: pos(0, 11.35),
    };
  return targetAt(t);
}
function egoAt(t: number, scene: Scenario): EgoVehicle {
  if (scene !== "cross")
    return {
      position: pos(0, t * cfg.egoSpeed + (scene === "degraded" ? 38 : 0)),
      velocity: pos(0, cfg.egoSpeed),
    };
  const braking = Math.max(0, Math.min(2.5, t - 4));
  return {
    position: pos(
      0,
      65 + 4 * Math.min(t, 4) + 4 * braking - 0.8 * braking ** 2,
    ),
    velocity: pos(0, 4 - 1.6 * braking),
  };
}
function visibility(t: number, o: Controls, scene: Scenario) {
  return 1 - 0.9 * (scene === "degraded" ? (o.fogOverride ?? fogLoad(t)) : 0);
}
function delayAt(sample: number, o: Controls, scene: Scenario) {
  // Transport is a separate scripted experiment. Each packet keeps its own delay.
  const congestion =
    scene === "degraded" && o.linkTimeline && sample >= 4.75 && sample < 8.2;
  return (o.latencyMs + (congestion ? 650 : 0)) / 1000;
}
function dropped(t: number, o: Controls, scene: Scenario) {
  return (
    (scene === "degraded" && o.linkTimeline && t >= 5.2 && t < 8.2) ||
    (o.cutAt !== null &&
      t >= o.cutAt &&
      (o.restoreAt === null || t < o.restoreAt))
  );
}
// Synthetic RSU coverage along the north axis, metres. Independent of weather
// and packet delivery, including when the target is observed in clear air.
function rsuCalibrationLoss(north: number) {
  const edge = Math.min(
    1,
    Math.max(0, (north - 80.034) / 45.4),
    Math.max(0, (193.534 - north) / 34.05),
  );
  return edge * edge * (3 - 2 * edge);
}
interface Observation {
  track: TrackedObject | null;
  age: number | null;
}
function observe(
  t: number,
  o: Controls,
  scene: Scenario,
  side: Side,
): Observation {
  let slot = Math.floor(
    (t - cfg.renderLag - o.latencyMs / 1000 + 1e-9) / cfg.samplePeriod,
  );
  let capturedAt = slot * cfg.samplePeriod;
  while (
    dropped(capturedAt, o, scene) ||
    capturedAt + delayAt(capturedAt, o, scene) > t - cfg.renderLag + 1e-9
  ) {
    capturedAt = --slot * cfg.samplePeriod;
  }
  if (scene === "cross" && capturedAt < 0.8) return { track: null, age: null };
  const age = t - capturedAt;
  if (age > cfg.maxAge) return { track: null, age };
  const sample = trajectory(capturedAt, scene, side);
  const opticalLoss = 1 - visibility(t, o, scene);
  // Independent RSU localization profile at the edge of its calibrated region.
  const edge =
    scene === "degraded" && o.qualityTimeline
      ? rsuCalibrationLoss(sample.position.north)
      : 0;
  const sourceSigma = cfg.sigma[o.quality] + 1.16 * edge;
  const sigma = Math.hypot(
    sourceSigma,
    0.26 * opticalLoss,
    age * cfg.lateralRateError,
  );
  const recovering = [
    o.restoreAt,
    scene === "degraded" && o.linkTimeline ? 8.2 : null,
  ].some(
    (start) =>
      start !== null &&
      capturedAt >= start &&
      capturedAt < start + cfg.recoverySeconds,
  );
  const stability = Math.max(
    0,
    0.98 - 0.18 * edge - 0.11 * opticalLoss - 0.24 * Math.max(0, age - 0.15),
  );
  const noise = sourceSigma * 0.28 * Math.sin(capturedAt * 1.7);
  const track: TrackedObject = {
    id:
      scene === "cross" ? "C-02" : scene === "degraded" ? "F-03" : cfg.targetId,
    category: "vehicle",
    source: "RSU-01",
    capturedAt,
    receivedAt: capturedAt + delayAt(capturedAt, o, scene),
    position: pos(
      sample.position.east + noise + sample.velocity.east * age,
      sample.position.north + sample.velocity.north * age,
      cfg.targetSize[1] / 2,
    ),
    velocity: sample.velocity,
    quality: {
      existence: o.existenceOverride ?? cfg.existence,
      classification: cfg.classification,
      stability: Math.min(
        o.stabilityOverride ?? stability,
        recovering ? 0.7 : 1,
      ),
      uncertainty: { lateralSigmaM: sigma },
    },
  };
  return { track, age };
}
export function crossingRisk(
  track: TrackedObject,
  ego: EgoVehicle,
): RiskAssessment {
  const arrival = (0 - track.position.east) / track.velocity.east;
  const self =
    ego.velocity.north > 0.05
      ? (junction.north - ego.position.north) / ego.velocity.north
      : Infinity;
  const overlap = arrival >= 0 && self >= 0 && Math.abs(arrival - self) < 1.8;
  return {
    level:
      overlap && arrival < 4.6
        ? "urgent"
        : arrival >= -0.65 && arrival < 7
          ? "caution"
          : "monitor",
    ttcS: overlap ? Math.max(self, arrival) : null,
  };
}
export function frame(
  t: number,
  o: Controls = defaults,
  scene: Scenario = "truck",
  side: Side = "left",
  research = false,
): SceneState {
  const ego = egoAt(t, scene);
  const camera = {
    eye: pos(-0.3, ego.position.north, cfg.eyeHeight),
    pitch: cfg.pitch,
    yaw: 0,
    verticalFov: verticalFov(cfg.horizontalFov, 1.6),
  };
  const truck = pos(
    0.05,
    cfg.truckStart + t * cfg.truckSpeed + (scene === "degraded" ? 38 : 0),
  );
  const target = trajectory(t, scene, side),
    observation = observe(t, o, scene, side),
    track = observation.track,
    cross = scene === "cross";
  const direction =
    track && track.position.east - camera.eye.east < -0.7
      ? "左前方"
      : track && track.position.east - camera.eye.east > 0.7
        ? "右前方"
        : "前方";
  const sensorVisibility = visibility(t, o, scene);
  let decision = perceptionDisplayPolicy({
    track,
    age: observation.age,
    sensorVisibility,
    direction,
    id: cross ? "C-02" : scene === "degraded" ? "F-03" : cfg.targetId,
    risk: { level: "unknown", ttcS: null },
    occlusion: null,
    coverage: null,
    inHud: false,
    baseline: o.baseline,
    cleared: false,
    wasPrecise: false,
  });
  if (track) {
    const p = track.position,
      v = viewPoint(p, camera),
      az = Math.atan2(v.x, v.z),
      risk = cross ? crossingRisk(track, ego) : riskOf(track, ego);
    const frac = cross
      ? +truckBlocks(
          camera.eye,
          p,
          pos(
            (side === "left" ? 1 : -1) *
              (junction.cornerEast - junction.cornerWidth / 2),
            junction.north - junction.width / 2 - junction.cornerDepth / 2,
          ),
          [junction.cornerWidth, 10, junction.cornerDepth],
        )
      : coverage(camera.eye, p, truck, cfg.truckSize, cfg.targetSize);
    // Replay sampled Schmitt transitions from the scenario's warm start, independent of seek order.
    let precise = true;
    for (let i = 0; i <= Math.floor(t / cfg.samplePeriod); i++) {
      const at = i * cfg.samplePeriod,
        prior = observe(at, o, scene, side).track;
      precise =
        !!prior &&
        chooseQuality(prior, at - prior.capturedAt, precise) === "world";
    }
    const inHud =
      v.z > 0.1 &&
      Math.abs(az) <= rad(cfg.hudHalfAnglesDeg[0]) &&
      Math.abs(Math.atan2(v.y, v.z)) <= rad(cfg.hudHalfAnglesDeg[1]);
    decision = perceptionDisplayPolicy({
      id: track.id,
      track,
      age: observation.age,
      sensorVisibility,
      direction,
      risk,
      occlusion: frac ? (cross ? "building" : "truck") : "visible",
      coverage: frac,
      inHud: inHud || (cross && research),
      baseline: o.baseline,
      cleared:
        cross &&
        risk.level === "monitor" &&
        -p.east / track.velocity.east < -0.65,
      wasPrecise: precise,
    });
  }
  return {
    scenario: scene,
    side,
    time: t,
    ego,
    camera,
    weather: scene === "degraded" ? "fog" : "clear",
    fog: scene === "degraded" ? (o.fogOverride ?? fogLoad(t)) : 0,
    sensorVisibility,
    network: {
      latencyMs: Math.round(delayAt(t, o, scene) * 1000),
      outage: dropped(t, o, scene),
      communicationAge: observation.age,
    },
    truth: { truck, target: target.position },
    targetHeading: Math.atan2(target.velocity.east, target.velocity.north),
    track,
    decision,
  };
}
