import * as T from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";

// A sealed, ribbed freight body fitted to the existing licensed chassis.
export function cargoBody() {
  const group = new T.Group();
  const c = document.createElement("canvas");
  c.width = 768;
  c.height = 768;
  const g = c.getContext("2d")!,
    shade = g.createLinearGradient(0, 0, 0, 768);
  shade.addColorStop(0, "#c9c8ba");
  shade.addColorStop(0.13, "#e3e1d4");
  shade.addColorStop(0.82, "#d6d7cd");
  shade.addColorStop(1, "#a5a89f");
  g.fillStyle = shade;
  g.fillRect(0, 0, 768, 768);
  let seed = 2817;
  const rand = () =>
    ((seed = Math.imul(1664525, seed) + 1013904223) >>> 0) / 4294967296;
  for (let i = 0; i < 4500; i++) {
    g.fillStyle = "rgba(71,73,61," + rand() * 0.065 + ")";
    g.fillRect(rand() * 768, rand() * 768, rand() * 2 + 1, rand() * 25);
  }
  g.fillStyle = "#435553";
  g.font = "italic bold 57px Arial";
  g.fillText("Rivage", 41, 184);
  g.font = "14px monospace";
  g.fillText("C I T Y   F R E I G H T", 46, 215);
  g.fillStyle = "#827a67";
  g.font = "17px monospace";
  g.fillText("RQ  /  027", 546, 635);
  g.fillStyle = "#b7a275";
  g.fillRect(12, 674, 744, 9);
  const tex = new T.CanvasTexture(c);
  tex.colorSpace = T.SRGBColorSpace;
  const shell = new T.MeshStandardMaterial({
    color: "#d0d0c5",
    roughness: 0.4,
    metalness: 0.33,
  });
  const door = new T.MeshStandardMaterial({
    map: tex,
    roughness: 0.48,
    metalness: 0.22,
  });
  const satin = new T.MeshStandardMaterial({
    color: "#939a97",
    roughness: 0.34,
    metalness: 0.76,
  });
  const seal = new T.MeshStandardMaterial({ color: "#353b37", roughness: 0.8 });
  function block(
    x: number,
    y: number,
    z: number,
    w: number,
    h: number,
    d: number,
    mat: T.Material,
    round = false,
  ) {
    const m = new T.Mesh(
      round
        ? new RoundedBoxGeometry(w, h, d, 2, 0.035)
        : new T.BoxGeometry(w, h, d),
      mat,
    );
    m.position.set(x, y, z);
    m.castShadow = true;
    m.receiveShadow = true;
    group.add(m);
  }
  block(0, 2.35, 0.78, 2.59, 2.57, 5.72, shell, true);
  const panel = new T.Mesh(new T.PlaneGeometry(2.5, 2.42), door);
  panel.position.set(0, 2.37, 3.647);
  group.add(panel);
  for (const x of [-1.265, 0, 1.265])
    block(x, 2.37, 3.657, 0.022, 2.48, 0.022, seal);
  for (const x of [-0.78, 0.77]) {
    block(x, 2.36, 3.675, 0.032, 2.33, 0.035, satin);
    for (const y of [1.35, 1.94, 2.81, 3.39])
      block(x, y, 3.69, 0.09, 0.042, 0.04, satin);
    block(x + 0.09, 1.57, 3.705, 0.2, 0.032, 0.032, seal);
  }
  for (const y of [1.13, 3.59]) block(0, y, 3.655, 2.59, 0.076, 0.066, satin);
  for (const x of [-1.21, 1.21])
    for (const y of [1.45, 2.4, 3.22])
      block(x, y, 3.68, 0.2, 0.08, 0.04, satin);
  for (const x of [-1.3, 1.3])
    for (let z = -1.92; z < 3.62; z += 0.48)
      block(x, 2.35, z, 0.017, 2.44, 0.022, satin);
  block(0, 0.84, 3.45, 2.33, 0.24, 0.18, seal);
  group.position.z = 0.095;
  return group;
}
