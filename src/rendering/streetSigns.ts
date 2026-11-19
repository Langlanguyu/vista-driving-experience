import * as T from "three";
/** Original, local street lettering. All signs are textured meshes in the street. */
export function lettering(
  title: string,
  subtitle: string,
  bg: string,
  ink: string,
) {
  const c = document.createElement("canvas");
  c.width = 768;
  c.height = 176;
  const ctx = c.getContext("2d")!;
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, c.width, c.height);
  ctx.fillStyle = ink;
  ctx.font = "600 66px Georgia, serif";
  ctx.textAlign = "center";
  ctx.fillText(title, 384, 93, 710);
  ctx.fillRect(125, 110, 518, 2);
  ctx.font = "17px monospace";
  ctx.fillText(subtitle, 384, 142, 620);
  const map = new T.CanvasTexture(c);
  map.colorSpace = T.SRGBColorSpace;
  map.anisotropy = 4;
  return new T.MeshStandardMaterial({ map, roughness: 0.78 });
}

export function freightMarkings() {
  const group = new T.Group(),
    metal = new T.MeshStandardMaterial({
      color: "#677068",
      metalness: 0.58,
      roughness: 0.52,
    });
  const rubber = new T.MeshStandardMaterial({
    color: "#292c29",
    roughness: 0.94,
  });
  const brass = new T.MeshStandardMaterial({
    color: "#e8be78",
    metalness: 0.18,
    roughness: 0.42,
  });
  const lens = new T.MeshStandardMaterial({
    color: "#ae3524",
    emissive: "#7a2115",
    emissiveIntensity: 0.35,
    roughness: 0.28,
  });
  const geo = new T.BoxGeometry();
  function box(
    x: number,
    y: number,
    z: number,
    w: number,
    h: number,
    d: number,
    m: T.Material,
  ) {
    const piece = new T.Mesh(geo, m);
    piece.position.set(x, y, z);
    piece.scale.set(w, h, d);
    group.add(piece);
  }
  box(0, 0.76, 3.54, 2.26, 0.13, 0.14, metal);
  for (const x of [-0.91, 0.91]) {
    box(x, 0.94, 3.65, 0.43, 0.16, 0.07, rubber);
    box(x, 0.94, 3.699, 0.31, 0.093, 0.018, lens);
    box(x + 0.1, 0.94, 3.712, 0.065, 0.093, 0.012, brass);
    box(x, 0.52, 3.06, 0.39, 0.44, 0.045, rubber);
    box(x, 1.52, 3.7, 0.52, 0.058, 0.012, brass);
  }
  const plate = lettering("BQ · 7024", "COMMERCIAL", "#bcb59a", "#242b28");
  for (const [x, y, w, h, m] of [[0, 1.03, 0.55, 0.16, plate]] as const) {
    const panel = new T.Mesh(new T.PlaneGeometry(w, h), m);
    panel.position.set(x, y, 3.711);
    group.add(panel);
  }
  group.userData.release = () => {
    for (const m of [metal, rubber, brass, lens, plate]) m.dispose();

    plate.map?.dispose();
    group.traverse((n) => {
      if (n instanceof T.Mesh) n.geometry.dispose();
    });
  };
  return group;
}

export function contactShadow(width: number, length: number) {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 96;
  const p = canvas.getContext("2d")!,
    grad = p.createRadialGradient(48, 48, 10, 48, 48, 47);
  grad.addColorStop(0, "rgba(15,17,16,.76)");
  grad.addColorStop(0.54, "rgba(15,17,16,.58)");
  grad.addColorStop(1, "rgba(15,17,16,0)");
  p.fillStyle = grad;
  p.fillRect(0, 0, 96, 96);
  const texture = new T.CanvasTexture(canvas);
  const m = new T.Mesh(
    new T.PlaneGeometry(width, length),
    new T.MeshBasicMaterial({
      map: texture,
      transparent: true,
      depthWrite: false,
      polygonOffset: true,
      polygonOffsetFactor: -1,
    }),
  );
  m.rotation.x = -Math.PI / 2;
  m.position.y = 0.027;
  m.userData.release = () => {
    texture.dispose();
    m.geometry.dispose();
    m.material.dispose();
  };
  return m;
}
