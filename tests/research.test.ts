import test from "node:test";
import assert from "node:assert/strict";
import { Vector3 as V } from "three";
import {
  opticalBench,
  solveOptics,
  intersectPlane,
  reflect,
  imageSize,
  displayBoundary,
  inAperture,
  traceForward,
} from "../src/domain/opticalRayTracer";
import {
  projectionField,
  NX,
  NY,
  mappedPoint,
  labMetrics,
  researchDefaults,
  type Algorithm,
} from "../src/domain/researchProjection";
import { frame, defaults } from "../src/scenes/corridor";
import { storyFrame } from "../src/scenes/story";
const near = (a: number, b: number, eps = 1e-6) =>
  assert.ok(Math.abs(a - b) < eps, `${a} vs ${b}`);
test("finite optical surfaces reject parallel, rearward and aperture misses; specular law holds on the actual figured surface", () => {
  const b = opticalBench(),
    m = b.mirror1;
  assert.equal(
    intersectPlane(m.center.clone().add(m.normal), m.normal, m),
    null,
  );
  assert.equal(
    intersectPlane(m.center.clone().add(m.normal), m.horizontal, m),
    null,
  );
  assert.equal(
    intersectPlane(
      m.center.clone().add(m.normal).add(m.horizontal),
      m.normal.clone().negate(),
      m,
    ),
    null,
  );
  for (const flat of [true, false]) {
    const s = solveOptics(10, 0, 0, flat);
    assert.equal(s.rays.length, 9);
    assert.ok(s.fields.length >= 1);
    for (const ray of s.rays) {
      const p = ray.points,
        bb = s.bench;
      assert.ok(p[0].distanceTo(bb.emitter.center) < 1e-7);
      for (const [i, surface] of [bb.mirror1, bb.mirror2, bb.glass].entries()) {
        const hit = p[i + 1],
          normal = i === 1 ? bb.normal(hit) : surface.normal;
        const incident = hit.clone().sub(p[i]).normalize(),
          out = p[i + 2].clone().sub(hit).normalize();
        near(-incident.dot(normal), out.dot(normal));
        near(reflect(incident, normal).distanceTo(out), 0);
        assert.ok(inAperture(hit, surface));
      }
      assert.ok(s.image!.clone().sub(p[4]).dot(ray.received) < 0);
    }
    assert.ok(s.residual! < 1e-7);
  }
  const curvature = solveOptics(10, 0, 0),
    edge = curvature.bench.mirror2;
  const origin = edge.center
    .clone()
    .addScaledVector(edge.horizontal, 0.12)
    .addScaledVector(edge.normal, 0.15);
  const hit = curvature.bench.hitMain(origin, edge.normal.clone().negate())!;
  assert.ok(Math.abs(hit.clone().sub(edge.center).dot(edge.normal)) > 0.0001);
  assert.equal(
    curvature.bench.hitMain(
      origin.clone().add(edge.horizontal),
      edge.normal.clone().negate(),
    ),
    null,
  );
  assert.equal(
    traceForward(b, b.emitter.center, b.emitter.normal.clone().negate()),
    null,
  );
});
test("reported VID comes from received directions; pupil excursions, finite angular field and main mirror affect the result", () => {
  for (const d of [3, 7.5, 10, 14]) {
    const s = solveOptics(d, 0.032, -0.008);
    near(s.image!.length(), d);
    assert.equal(
      displayBoundary(s.bench.virtual, new V(), s.bench, d),
      "inside",
    );
    assert.equal(
      displayBoundary(new V(-14, -1, -10), new V(), s.bench, d),
      "field",
    );
    assert.equal(
      displayBoundary(s.bench.virtual, new V(0.08, 0, 0), s.bench, d),
      "eye",
    );
  }
  near(imageSize(10).width, 2.2787, 0.001);
  assert.equal(solveOptics(10, 0.085, 0).image, null);
  const partial = solveOptics(10, 0.065, 0);
  assert.ok(partial.rays.length > 0 && partial.rays.length < 9);
  assert.ok(solveOptics(10, 0, 0, true).image!.length() < 3);
});
test("all LUT cells maintain orientation on either wing, central rays and edge FOV agree at matched power", () => {
  const s = frame(2.4, defaults, "cross", "left", true);
  for (const sign of [-1, 1])
    for (const power of [0.12, 0.55, 1]) {
      let reference: number | undefined;
      for (const algorithm of [
        "current",
        "pannini",
        "structure",
      ] as Algorithm[]) {
        const f = projectionField(
          s.camera,
          1440,
          900,
          s.track!.position,
          sign * power,
          { ...researchDefaults, algorithm },
        );
        const span = f.right - f.left;
        if (reference) near(span, reference);
        reference = span;
        for (let i = 0; i < NX; i++)
          for (let j = 0; j < NY; j++) {
            const k = 2 * (j * NX + i);
            if (i) assert.ok(f.data[k] > f.data[k - 2]);
            if (j) assert.ok(f.data[k + 1] > f.data[k + 1 - 2 * NX]);
          }
        for (const x of [-0.23, 0, 0.23])
          for (const y of [-0.8, 0, 0.8]) {
            const p = mappedPoint(f, x, y);
            near(x, p.u);
            near(y, p.v);
          }
      }
    }
  const metrics = (algorithm: Algorithm) =>
    labMetrics(
      projectionField(s.camera, 1440, 900, s.track!.position, -1, {
        ...researchDefaults,
        algorithm,
      }),
      s.camera,
      1440,
      900,
      s.truth.target,
    );
  const old = metrics("current"),
    structure = metrics("structure");
  assert.ok(structure.railRms < old.railRms * 0.05);
  assert.ok(
    Math.abs(structure.carAspectChange) < Math.abs(old.carAspectChange) * 0.3,
  );
});
test("optical inspection, boundary and center display are reversible and restore the driver eye", () => {
  const at = (t: number) => storyFrame(t / 180);
  assert.equal(at(105).optics.image, 1);
  assert.equal(at(122).optics.dashboardReveal, 1);
  assert.ok(at(128).optics.virtualRayProgress > 0.85);
  assert.equal(at(136).optics.section, 0);
  assert.ok(at(146.5).reality.eyeX > 0.065);
  assert.ok(at(156).future.console > 0.95);
  assert.equal(at(180).future.console, 0);
  assert.equal(at(160).cabinOpacity, 1);
  assert.equal(at(180).cabinOpacity, 0);
  assert.equal(at(180).exterior, true);
  for (let sec = 105; sec < 136; sec += 0.1) {
    const o = at(sec).optics;
    if (o.section > 0.01) assert.ok(o.dashboardReveal > 0.99);
  }
  const a = at(126);
  at(173);
  assert.deepEqual(at(126), a);
});
