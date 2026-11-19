import test from "node:test";
import assert from "node:assert/strict";
import { cfg, defaults, frame, pos, riskOf } from "../src/scenes/corridor";
import { project, rad, truckBlocks } from "../src/domain/geometry";
test("projection follows eye and yaw, rejects near and rear points", () => {
  const camera = { eye: pos(0, 0, 1), verticalFov: rad(60), pitch: 0, yaw: 0 };
  assert.equal(project(pos(0, 10, 1), camera, 800, 400)?.x, 400);
  assert.equal(project(pos(0, 10, 1), camera, 800, 400)?.y, 200);
  assert.ok(
    project(pos(0, 10, 1), { ...camera, eye: pos(1, 0, 1) }, 800, 400)!.x < 400,
  );
  assert.equal(project(pos(0, -2), camera, 800, 400), null);
  assert.equal(project(pos(0, 0.09), camera, 800, 400), null);
  assert.ok(
    Math.abs(
      project(pos(10, 0, 1), { ...camera, yaw: Math.PI / 2 }, 800, 400)!.x -
        400,
    ) < 1e-6,
  );
});
test("truck occludes only a point behind its silhouette", () => {
  const eye = pos(0, 0, 1.5),
    truck = pos(0, 18);
  assert.ok(truckBlocks(eye, pos(0, 40, 0.72), truck, cfg.truckSize));
  assert.ok(!truckBlocks(eye, pos(7, 40, 0.72), truck, cfg.truckSize));
  assert.ok(!truckBlocks(eye, pos(0, 10, 0.72), truck, cfg.truckSize));
});
test("quality changes positional uncertainty independently of track identity and existence", () => {
  const frames = (["high", "medium", "low"] as const).map((quality) =>
    frame(2.4, { ...defaults, quality }),
  );
  assert.deepEqual(
    frames.map((f) => f.decision.mode),
    ["world", "region", "direction"],
  );
  assert.ok(
    frames.every(
      (f) =>
        f.track?.quality.existence === cfg.existence &&
        f.track.quality.classification === cfg.classification,
    ),
  );
  assert.equal(frames[2].decision.anchor, null);
  assert.deepEqual(frames[0].truth, frames[2].truth);
});
test("stale observation grows, expires and reacquires after a short recovery", () => {
  const opts = { ...defaults, cutAt: 2, restoreAt: 5 };
  const a = frame(2.1, opts),
    b = frame(3, opts);
  assert.equal(a.track?.capturedAt, b.track?.capturedAt);
  assert.ok(b.decision.sigmaM! > a.decision.sigmaM!);
  assert.equal(frame(4, opts).decision.risk.level, "unknown");
  assert.equal(frame(4, opts).decision.mode, "unavailable");
  assert.equal(frame(5.2, opts).decision.mode, "region");
  assert.equal(frame(5.6, opts).decision.mode, "world");
  assert.deepEqual(frame(3, opts), b);
});
test("trajectory clears the truck without overlapping either vehicle", () => {
  for (let t = 0; t <= 12; t += 0.02) {
    const { truth, ego } = frame(t);
    assert.ok(
      Math.abs(truth.target.north - truth.truck.north) >
        (cfg.targetSize[2] + cfg.truckSize[2]) / 2 ||
        Math.abs(truth.target.east - truth.truck.east) >
          (cfg.targetSize[0] + cfg.truckSize[0]) / 2,
    );
    assert.ok(truth.truck.north - ego.position.north > 6);
  }
  assert.equal(frame(0).decision.occlusion, "truck");
  assert.ok(frame(9).decision.coverage! > 0 && frame(9).decision.coverage! < 1);
  assert.equal(frame(10).decision.occlusion, "visible");
  assert.equal(frame(12).decision.mode, "direction");
});
test("finite TTC needs closing motion and a shared corridor", () => {
  const { track, ego } = frame(0);
  assert.ok(riskOf(track!, ego).ttcS! > 0);
  for (const speed of [12, 15])
    assert.equal(
      riskOf({ ...track!, velocity: pos(0, speed) }, ego).ttcS,
      null,
    );
  assert.equal(riskOf({ ...track!, position: pos(5, 30) }, ego).ttcS, null);
});
test("nine-point depth coverage resolves emergence without conflating it with risk", () => {
  const frames = Array.from({ length: 121 }, (_, i) => frame(i / 10));
  assert.ok(frames.slice(0, 60).every((f) => f.decision.coverage === 1));
  assert.ok(
    frames.some((f) => f.decision.coverage! > 0 && f.decision.coverage! < 1),
  );
  assert.equal(frames.at(-1)?.decision.coverage, 0);
});
test("horizontal field of view stays invariant as viewport aspect changes", async () => {
  const { verticalFov } = await import("../src/domain/geometry");
  for (const aspect of [1.6, 16 / 9, 2.1])
    for (const hfov of [80, 88, 95]) {
      const recovered =
        (Math.atan(Math.tan(verticalFov(hfov, aspect) / 2) * aspect) * 360) /
        Math.PI;
      assert.ok(Math.abs(recovered - hfov) < 1e-8);
    }
});

import {
  displayToSource,
  sourceToDisplay,
  projectWorldToDisplay,
} from "../src/domain/adaptiveProjection";
import { chooseQuality } from "../src/domain/displayPolicy";
import { storyFrame } from "../src/scenes/story";
test("projection is monotone, invertible, central-preserving and mirror symmetric at every blend", () => {
  for (const a of [-1, -0.65, -0.01, 0, 0.3, 1]) {
    let last = -Infinity;
    for (let x = -1; x <= 1.001; x += 0.01) {
      const source = displayToSource(x, a);
      assert.ok(source > last);
      last = source;
      assert.ok(Math.abs(sourceToDisplay(source, a) - x) < 1e-10);
      assert.ok(Math.abs(source + displayToSource(-x, -a)) < 1e-10);
      if (Math.abs(x) < 0.28) assert.equal(source, x);
    }
  }
  const s = frame(3.2, defaults, "cross", "left", true);
  assert.ok(
    projectWorldToDisplay(s.track!.position, s.camera, 1440, 900, 0)!.x < 0,
  );
  assert.ok(
    projectWorldToDisplay(s.track!.position, s.camera, 1440, 900, -1)!.x > 0,
  );
});
test("left and right conflicting tracks retain a direction in DRIVE; clearing removes the warning", () => {
  for (const side of ["left", "right"] as const) {
    const f = frame(3.2, defaults, "cross", side);
    assert.equal(f.decision.direction, side === "left" ? "左前方" : "右前方");
    assert.equal(f.decision.policy, "DIRECTION_ONLY");
    assert.equal(f.decision.risk.level, "urgent");
    assert.equal(
      frame(3.2, defaults, "cross", side, true).decision.policy,
      "CONFIRMED_TARGET",
    );
    assert.equal(
      frame(3.2, { ...defaults, quality: "low" }, "cross", side, true).decision
        .policy,
      "DIRECTION_ONLY",
    );
    assert.equal(
      frame(10, defaults, "cross", side).decision.policy,
      "NO_WARNING",
    );
    assert.equal(frame(6.6, defaults, "cross", side).decision.risk.ttcS, null);
  }
});
test("fog trace deteriorates, expires, and recovers deterministically; position has a hysteresis band", () => {
  const sample = frame(2, defaults).track!;
  sample.quality.uncertainty.lateralSigmaM = 0.39;
  assert.equal(chooseQuality(sample, 0.1, true), "world");
  assert.equal(chooseQuality(sample, 0.1, false), "region");
  sample.quality.existence = 0.35;
  assert.equal(chooseQuality(sample, 0.1, true), "unavailable");
  const trace = [0, 3.2, 5, 7.2, 11.8].map(
    (t) => frame(t, defaults, "degraded").decision.policy,
  );
  assert.deepEqual(trace, [
    "CONFIRMED_TARGET",
    "ESTIMATED_TARGET",
    "DIRECTION_ONLY",
    "PERCEPTION_LIMITED",
    "CONFIRMED_TARGET",
  ]);
});
test("story camera moves in space and remains continuous through the junction handover", () => {
  assert.notDeepEqual(
    storyFrame(0.13).s.camera.eye,
    storyFrame(0.3).s.camera.eye,
  );
  const a = storyFrame((43 - 0.001) / 180).s.camera,
    b = storyFrame((43 + 0.001) / 180).s.camera;
  assert.ok(
    Math.hypot(
      a.eye.north - b.eye.north,
      a.eye.east - b.eye.east,
      a.eye.up - b.eye.up,
    ) < 0.01,
  );
  assert.deepEqual(storyFrame(0.48), storyFrame(0.48));
});
test("overlapping manual and fog outages never revive a lost sample", () => {
  const early = frame(
    6.1,
    { ...defaults, cutAt: 5, restoreAt: 5.8 },
    "degraded",
  );
  assert.ok(early.track && early.track.capturedAt < 5);
  const late = frame(
    8.6,
    { ...defaults, cutAt: 7.5, restoreAt: 9 },
    "degraded",
  );
  assert.equal(late.track, null);
});

import * as THREE from "three";
import { vehicleModel } from "../src/rendering/vehicleModel";
import { verticalGain } from "../src/domain/adaptiveProjection";
import { perceptionDisplayPolicy } from "../src/domain/displayPolicy";

test("vehicle registration preserves authored hierarchy, distances and ground contact", () => {
  const source = new THREE.Group(),
    parent = new THREE.Group();
  parent.scale.set(1.2, 0.9, 1.35);
  parent.rotation.y = 0.17;
  const body = new THREE.Mesh(new THREE.BoxGeometry(2, 1.8, 5));
  body.position.set(1, 3, -2);
  source.add(parent);
  parent.add(body);
  const raw = new THREE.Box3().setFromObject(source, true);
  const fitted = vehicleModel(source, 7.4);
  const box = new THREE.Box3().setFromObject(fitted, true);
  const size = box.getSize(new THREE.Vector3()),
    original = raw.getSize(new THREE.Vector3());
  assert.ok(Math.abs(size.z - 7.4) < 1e-9 && Math.abs(box.min.y) < 1e-9);
  assert.ok(Math.abs(size.y / size.z - original.y / original.z) < 1e-9);
  assert.ok(Math.abs(size.x / size.z - original.x / original.z) < 1e-9);
  assert.ok(
    Math.abs(box.max.x + box.min.x) + Math.abs(box.max.z + box.min.z) < 1e-9,
  );
  assert.deepEqual(fitted.scale.toArray(), [1, 1, 1]);
  assert.deepEqual(
    fitted.children[0].children[0].children[0].scale.toArray(),
    parent.scale.toArray(),
  );
  assert.equal(source.parent, null);
  assert.throws(() => vehicleModel(new THREE.Group(), 2));
});
test("wing preserves the central image and bounds angular aspect distortion at the horizon", () => {
  const tangent = Math.tan(rad(44)),
    step = 0.00001;
  for (const strength of [-1, -0.5, 0, 0.5, 1]) {
    for (const u of [-0.93, -0.68, -0.25, 0, 0.25, 0.68, 0.93]) {
      const source = displayToSource(u, strength),
        gain = verticalGain(u, strength, tangent);
      const slope =
        (displayToSource(u + step, strength) -
          displayToSource(u - step, strength)) /
        (2 * step);
      const relative =
        (slope * Math.hypot(1, tangent * u)) /
        (gain * Math.hypot(1, tangent * source));
      assert.ok(Math.abs(relative - 1) < 1e-6);
      if (Math.abs(u) <= 0.25) assert.equal(gain, 1);
    }
  }
});
test("dense fog, radio transport and source quality can be isolated by holding the other inputs fixed", () => {
  const dense = {
    ...defaults,
    qualityTimeline: false,
    linkTimeline: false,
    fogOverride: 1,
  };
  const [high, mid, low] = (["high", "medium", "low"] as const).map((quality) =>
    frame(5, { ...dense, quality }, "degraded"),
  );
  assert.deepEqual(
    [high, mid, low].map((f) => f.decision.policy),
    ["CONFIRMED_TARGET", "ESTIMATED_TARGET", "DIRECTION_ONLY"],
  );
  assert.ok(high.sensorVisibility < 0.11);
  assert.equal(low.decision.anchor, null);
  assert.equal(high.network.communicationAge, low.network.communicationAge);
  assert.equal(high.decision.risk.level, low.decision.risk.level);
  assert.equal(
    frame(5, { ...dense, existenceOverride: 0.2 }, "degraded").decision.policy,
    "PERCEPTION_LIMITED",
  );
  assert.equal(
    frame(5, { ...dense, stabilityOverride: 0.6 }, "degraded").decision.policy,
    "ESTIMATED_TARGET",
  );
  const expired = frame(
    7.2,
    { ...dense, linkTimeline: true, fogOverride: 0 },
    "degraded",
  );
  assert.equal(expired.sensorVisibility, 1);
  assert.ok(expired.network.communicationAge! > cfg.maxAge);
  assert.equal(expired.track, null);
  assert.equal(expired.decision.policy, "PERCEPTION_LIMITED");
  assert.equal(expired.decision.anchor, null);
  assert.equal(expired.decision.sigmaM, null);
  const late = frame(5.8, defaults, "degraded").track!;
  assert.ok(late.receivedAt <= 5.8 - cfg.renderLag);
  assert.ok(Math.abs(late.receivedAt - late.capturedAt - 0.73) < 1e-7);
  const good = frame(10, { ...defaults, quality: "low" }, "cross");
  assert.equal(good.decision.policy, "PERCEPTION_LIMITED");
  const stale = perceptionDisplayPolicy({
    track: high.track,
    age: 1.6,
    id: "old",
    risk: { level: "urgent", ttcS: 0.4 },
    sensorVisibility: 1,
    cleared: true,
    wasPrecise: true,
    inHud: true,
    baseline: false,
    occlusion: "truck",
    coverage: 1,
    direction: "前方",
  });
  assert.deepEqual(
    [
      stale.policy,
      stale.anchor,
      stale.sigmaM,
      stale.risk.level,
      stale.risk.ttcS,
    ],
    ["PERCEPTION_LIMITED", null, null, "unknown", null],
  );
});

test("the seven chapter seams restore the same pose when sampled forwards or backwards", () => {
  const at = (t: number) => storyFrame(t / 180);
  for (const [k, cut] of [15, 43, 75, 105, 135, 163].entries()) {
    const a = at(cut - 0.001),
      b = at(cut + 0.001);
    assert.equal(a.chapter, k);
    assert.equal(b.chapter, k + 1);
    assert.ok(
      Math.hypot(
        a.s.camera.eye.east - b.s.camera.eye.east,
        a.s.camera.eye.north - b.s.camera.eye.north,
        a.s.camera.eye.up - b.s.camera.eye.up,
      ) < 0.008,
    );
    assert.ok(Math.abs(a.s.camera.yaw - b.s.camera.yaw) < 0.0001);
  }
  for (const t of [
    0, 17, 27, 36, 54, 61, 76, 87, 97, 105, 124, 145, 156, 179, 180,
  ]) {
    const original = at(t);
    at(180 - t);
    assert.deepEqual(at(t), original);
  }
  assert.equal(at(-1).sec, 0);
  assert.equal(at(182).sec, 180);
});
test("the spatial fold holds all physical poses while the peripheral target enters view", () => {
  const first = storyFrame(52 / 180),
    last = storyFrame(60 / 180);
  assert.deepEqual(first.s.camera, last.s.camera);
  assert.deepEqual(first.s.truth, last.s.truth);
  assert.equal(first.cabinOpacity, 1);
  assert.equal(last.cabinOpacity, 1);
  assert.equal(last.strength, -1);
  assert.equal(first.s.decision.mode, "direction");
  assert.equal(last.s.decision.mode, "world");
  const loc = last.s.track!.position;
  assert.ok(projectWorldToDisplay(loc, last.s.camera, 1440, 900, 0)!.x < 0);
  assert.ok(
    projectWorldToDisplay(loc, last.s.camera, 1440, 900, last.strength)!.x > 0,
  );
});
test("one fog target progresses through five evidence levels and staged reacquisition", () => {
  const samples = [77, 82, 87, 92, 97, 101.8, 102.8, 104.8].map((t) =>
    storyFrame(t / 180),
  );
  assert.deepEqual(
    samples.map((f) => f.evidence),
    [
      "precise",
      "estimated",
      "directional",
      "limited",
      "stale",
      "directional",
      "estimated",
      "precise",
    ],
  );
  assert.deepEqual(samples[0].s.truth, samples[2].s.truth);
  assert.ok(samples.every((f) => f.s.decision.id === "F-03"));
  assert.ok(samples[3].s.track && samples[3].s.network.communicationAge! < 1.5);
  assert.equal(samples[4].s.track, null);
  assert.ok(samples[4].s.network.communicationAge! > 1.5);
  for (const idx of [2, 3, 4, 5])
    assert.equal(samples[idx].s.decision.anchor, null);
  assert.equal(samples[7].s.decision.occlusion, "truck");
});
