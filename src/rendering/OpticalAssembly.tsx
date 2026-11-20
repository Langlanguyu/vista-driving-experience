import { useEffect, useMemo } from "react";
import * as T from "three";
import { solveOptics, type Surface } from "../domain/opticalRayTracer";
import { disposeLocal } from "./cockpit";

export interface OpticalSettings {
  vid: number;
  eyeX: number;
  eyeY: number;
  orbit: number;
  section: boolean;
  rays: boolean;
  extensions: boolean;
  hardware: boolean;
  flat: boolean;
  overview: boolean;
}
export const opticalDefaults: OpticalSettings = {
  vid: 10,
  eyeX: 0,
  eyeY: 0,
  orbit: 1.32,
  section: true,
  rays: true,
  extensions: true,
  hardware: true,
  flat: false,
  overview: false,
};
const v = (x = 0, y = 0, z = 0) => new T.Vector3(x, y, z);
function line(points: T.Vector3[], color: string, dash = false) {
  const mat = dash
    ? new T.LineDashedMaterial({ color, dashSize: 0.07, gapSize: 0.05 })
    : new T.LineBasicMaterial({ color });
  const obj = new T.Line(new T.BufferGeometry().setFromPoints(points), mat);
  obj.computeLineDistances();
  return obj;
}
function lettering(word: string) {
  const canvas = document.createElement("canvas");
  canvas.width = 620;
  canvas.height = 80;
  const ctx = canvas.getContext("2d")!;
  ctx.font = "500 40px Helvetica Neue, sans-serif";
  ctx.fillStyle = "#edf1e6";
  ctx.fillText(word, 3, 54);
  const map = new T.CanvasTexture(canvas);
  map.colorSpace = T.SRGBColorSpace;
  const sprite = new T.Sprite(
    new T.SpriteMaterial({ map, depthTest: false, transparent: true }),
  );
  sprite.center.set(0, 0.5);
  sprite.scale.set(0.43, 0.056, 1);
  sprite.renderOrder = 12;
  return sprite;
}
function plate(s: Surface, color: string, clear = false) {
  const mesh = new T.Mesh(
    new T.BoxGeometry(s.width, s.height, clear ? 0.002 : 0.012),
    new T.MeshStandardMaterial({
      color,
      metalness: clear ? 0.15 : 0.68,
      roughness: 0.29,
      transparent: clear,
      opacity: clear ? 0.18 : 1,
      depthWrite: !clear,
    }),
  );
  mesh.position.copy(s.center);
  mesh.quaternion.setFromRotationMatrix(
    new T.Matrix4().makeBasis(s.horizontal, s.vertical, s.normal),
  );
  return mesh;
}
type Solution = ReturnType<typeof solveOptics>;
export function OpticalAssembly({
  solution,
  hardware,
  real,
  virtual,
  image,
  section,
  boundary,
  eyeX,
  eyeY,
}: {
  solution: Solution;
  hardware: number;
  real: number;
  virtual: number;
  image: number;
  section: number;
  boundary: number;
  eyeX: number;
  eyeY: number;
}) {
  const model = useMemo(() => {
    const group = new T.Group(),
      parts = new T.Group(),
      paths = new T.Group(),
      back = new T.Group(),
      plane = new T.Group(),
      glyph = new T.Group(),
      labels = new T.Group();
    group.add(parts, paths, back, plane, glyph);
    parts.add(labels);
    const { bench: b, size } = solution;
    parts.add(
      plate(b.emitter, "#99dab5"),
      plate(b.mirror1, "#d0d8dc"),
      plate(b.glass, "#9bdbd2", true),
      plate(b.eye, "#b4d4c3", true),
    );
    // Housing and mirror bevels carry the surfaces on finite, separate pieces of hardware.
    for (const [s, name] of [
      [b.emitter, "pgu"],
      [b.mirror1, "fold"],
    ] as const) {
      const base = plate(
        { ...s, width: s.width + 0.017, height: s.height + 0.017 },
        "#475050",
      );
      base.position.addScaledVector(s.normal, -0.012);
      parts.add(base);
      if (name === "pgu") {
        for (let j = -2; j <= 2; j++) {
          const fin = plate(
            { ...s, width: s.width + 0.026, height: 0.004 },
            "#788580",
          );
          fin.position
            .addScaledVector(s.vertical, j * 0.011)
            .addScaledVector(s.normal, -0.025);
          parts.add(fin);
        }
      }
    }
    function rim(s: Surface, color: string) {
      const pts = [
        [-1, -1],
        [1, -1],
        [1, 1],
        [-1, 1],
        [-1, -1],
      ].map(([x, y]) =>
        s.center
          .clone()
          .addScaledVector(s.horizontal, (x * s.width) / 2)
          .addScaledVector(s.vertical, (y * s.height) / 2),
      );
      parts.add(line(pts, color));
    }
    rim(b.eye, "#b5ccae");
    rim(b.glass, "#a4c4ba");
    rim(b.mirror1, "#c4cab7");
    // Tessellate the identical finite implicit M2 surface used by the ray solver.
    const verts: number[] = [],
      indices: number[] = [];
    for (let j = 0; j <= 8; j++)
      for (let i = 0; i <= 14; i++) {
        const p = b.mirror2.center
          .clone()
          .addScaledVector(
            b.mirror2.horizontal,
            (i / 14 - 0.5) * b.mirror2.width,
          )
          .addScaledVector(
            b.mirror2.vertical,
            (j / 8 - 0.5) * b.mirror2.height,
          );
        const d = b.mirror2.normal;
        const hit =
          b.hitMain(
            p.clone().addScaledVector(d, 0.15),
            d.clone().negate(),
            false,
          ) ?? p;
        verts.push(...hit.toArray());
        if (i < 14 && j < 8) {
          const k = j * 15 + i;
          indices.push(k, k + 1, k + 15, k + 1, k + 16, k + 15);
        }
      }
    const geom = new T.BufferGeometry();
    geom.setAttribute("position", new T.Float32BufferAttribute(verts, 3));
    geom.setIndex(indices);
    geom.computeVertexNormals();
    parts.add(
      new T.Mesh(
        geom,
        new T.MeshStandardMaterial({
          color: "#c6d2d4",
          metalness: 0.83,
          roughness: 0.22,
          side: T.DoubleSide,
        }),
      ),
    );
    const edgePoints = (idx: number) =>
      v(verts[idx * 3], verts[idx * 3 + 1], verts[idx * 3 + 2]);
    const rimLoop = [
      ...Array.from({ length: 15 }, (_, i) => i),
      ...Array.from({ length: 8 }, (_, i) => (i + 1) * 15 + 14),
      ...Array.from({ length: 14 }, (_, i) => 133 - i),
      ...Array.from({ length: 8 }, (_, i) => (7 - i) * 15),
    ];
    parts.add(line(rimLoop.map(edgePoints), "#d7dccc"));
    const entries: [string, T.Vector3, T.Vector3][] = [
      ["PGU", b.emitter.center, v(0.1, -0.115, 0.1)],
      ["M1  /  FOLD", b.mirror1.center, v(0, -0.19, -0.1)],
      ["FREEFORM MIRROR", b.mirror2.center, v(0.02, -0.1, 0.08)],
      ["WINDSHIELD", b.glass.center, v(0.03, 0.15, -0.12)],
      ["EYEBOX", b.eye.center, v(0, 0.095, 0.01)],
    ];
    for (const [word, origin, offset] of entries) {
      const end = origin.clone().add(offset),
        tag = lettering(word);
      tag.position.copy(end);
      labels.add(line([origin, end], "#84958b"), tag);
    }
    const eye = new T.Mesh(
      new T.SphereGeometry(0.007),
      new T.MeshBasicMaterial({ color: "#f7cc79" }),
    );
    eye.position.set(eyeX, eyeY, 0);
    parts.add(eye);
    for (const { path, pixel } of solution.fields) {
      const p = path.points;
      const primary = pixel.distanceTo(b.virtual) < 1e-6;
      // Begin at the receiving end of the chain, then reveal successively earlier legs.
      for (let j = 3; j >= 0; j--) {
        const l = line([p[j], p[j + 1]], "#f8c876");
        l.material.transparent = true;
        l.material.opacity = primary ? 0.95 : 0.24;
        if (primary) {
          const beam = new T.Mesh(
            new T.CylinderGeometry(0.0034, 0.0034, 1, 10),
            new T.MeshBasicMaterial({ color: "#ffce85" }),
          );
          beam.quaternion.setFromUnitVectors(
            v(0, 1, 0),
            p[j + 1].clone().sub(p[j]).normalize(),
          );
          beam.userData = { start: p[j], end: p[j + 1], leg: j, beam: true };
          paths.add(beam);
        }
        l.userData.leg = j;
        l.userData.start = p[j];
        l.userData.end = p[j + 1];
        paths.add(l);
        const arrow = new T.Mesh(
          new T.ConeGeometry(0.005, 0.019, 8),
          new T.MeshBasicMaterial({ color: "#ffcf82" }),
        );
        arrow.position.copy(p[j]).lerp(p[j + 1], 0.64);
        arrow.quaternion.setFromUnitVectors(
          v(0, 1, 0),
          p[j + 1].clone().sub(p[j]).normalize(),
        );
        arrow.userData.leg = j;
        if (primary) paths.add(arrow);
        else {
          arrow.geometry.dispose();
          arrow.material.dispose();
        }
      }
      const through = p[4]
        .clone()
        .addScaledVector(path.received, -p[4].distanceTo(pixel));
      const extension = line([p[3], through], "#95b8b1", true);
      extension.userData.start = p[3];
      extension.userData.end = through;
      back.add(extension);
    }
    const center = solution.image ?? b.virtual;
    const forward = center.clone().normalize(),
      right = v(1, 0, 0),
      up = right.clone().cross(forward).normalize();
    function point(x: number, y: number) {
      return center
        .clone()
        .addScaledVector(right, x * size.width)
        .addScaledVector(up, y * size.height);
    }
    const corners = [
      point(-0.5, -0.5),
      point(0.5, -0.5),
      point(0.5, 0.5),
      point(-0.5, 0.5),
      point(-0.5, -0.5),
    ];
    plane.add(line(corners, "#c5e6dc"));
    const distance = lettering(
      (solution.image?.length() ?? 0).toFixed(2) + " m   /   VID",
    );
    distance.scale.multiplyScalar(5);
    distance.position.copy(point(-0.5, 0.68));
    plane.add(distance);
    const pane = new T.Mesh(
      new T.PlaneGeometry(size.width, size.height),
      new T.MeshBasicMaterial({
        color: "#77b9a6",
        transparent: true,
        opacity: 0.095,
        side: T.DoubleSide,
        depthWrite: false,
      }),
    );
    pane.position.copy(center);
    pane.lookAt(v());
    plane.add(pane);
    // Navigation chevrons lie on the reconstructed virtual image plane.
    for (const oy of [-0.1, 0.1]) {
      const pts = [
        point(-0.092, oy - 0.055),
        point(0, oy + 0.17),
        point(0.092, oy - 0.055),
        point(0.074, oy - 0.1),
        point(0, oy + 0.075),
        point(-0.074, oy - 0.1),
      ];
      const g = new T.BufferGeometry().setFromPoints(pts);
      g.setIndex([0, 1, 4, 0, 4, 5, 1, 2, 3, 1, 3, 4]);
      glyph.add(
        new T.Mesh(
          g,
          new T.MeshBasicMaterial({
            color: "#e6ffdc",
            side: T.DoubleSide,
            transparent: true,
            toneMapped: false,
          }),
        ),
      );
    }
    return { group, parts, paths, back, plane, glyph, labels };
  }, [solution, eyeX, eyeY]);
  useEffect(() => () => disposeLocal(model.group), [model]);
  const { parts, paths, back, plane, glyph, labels } = model;
  parts.visible = hardware > 0.01;
  // The machined faces stay in exact registration with their computed reflection points.
  parts.traverse((o) => {
    if (o instanceof T.Mesh) {
      const mat = o.material as T.Material;
      if (mat.userData.nativeOpacity === undefined)
        mat.userData.nativeOpacity = mat.opacity;
      mat.transparent = true;
      mat.opacity = hardware * mat.userData.nativeOpacity;
    }
  });
  const clipLine = (l: T.Line, amount: number, backwards = false) => {
    const a = l.userData.start as T.Vector3,
      b = l.userData.end as T.Vector3;
    if (!a || !b) return;
    const p = backwards ? b.clone().lerp(a, amount) : a.clone().lerp(b, amount);
    const positions = l.geometry.getAttribute("position");
    positions.setXYZ(backwards ? 0 : 1, p.x, p.y, p.z);
    positions.needsUpdate = true;
    l.frustumCulled = false;
  };
  labels.visible = section > 0.56;
  paths.visible = real > 0.01;
  paths.children.forEach((l) => {
    const progress = T.MathUtils.clamp(real * 4 - l.userData.leg, 0, 1);
    l.visible = progress > (l instanceof T.Line ? 0.001 : 0.37);
    if (l instanceof T.Line) clipLine(l, progress);
    if (l.userData.beam) {
      const { start, end } = l.userData;
      l.visible = progress > 0.002;
      l.position.copy(start).lerp(end, progress / 2);
      l.scale.y = start.distanceTo(end) * progress;
    }
  });
  back.visible = virtual > 0.01;
  back.children.forEach((l) => {
    const mat = (l as T.Line).material as T.LineDashedMaterial;
    mat.transparent = true;
    mat.opacity = virtual * 0.8;
    clipLine(l as T.Line, virtual);
  });
  plane.visible = virtual > 0.12 || boundary > 0.01;
  plane.children.forEach((o) => {
    if (o instanceof T.Sprite) o.visible = virtual > 0.55;
    if (o instanceof T.Line) {
      o.material.transparent = true;
      o.material.opacity = Math.max(virtual, boundary);
    }
  });
  glyph.visible = Math.max(image, virtual) > 0.01 && !!solution.image;
  glyph.children.forEach(
    (o) =>
      (((o as T.Mesh).material as T.MeshBasicMaterial).opacity = Math.max(
        image,
        virtual,
      )),
  );
  return <primitive object={model.group} />;
}
