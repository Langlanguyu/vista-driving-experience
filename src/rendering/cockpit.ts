import * as T from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";

// Physical dimensions relative to the driver's eye, in metres. Z points aft.
export function makeCockpit(speedKmh: number) {
  const cabin = new T.Group();
  const finish = (color: string, roughness = 0.6, metalness = 0.05) =>
    new T.MeshStandardMaterial({ color, roughness, metalness });
  const leather = finish("#292d30", 0.68),
    lining = finish("#777771", 0.91),
    seal = finish("#181b1b", 0.81),
    alloy = finish("#979c99", 0.29, 0.85),
    grain = finish("#44423e", 0.57, 0.18),
    screen = finish("#111a1d", 0.19, 0.4);
  const v = (x: number, y: number, z: number) => new T.Vector3(x, y, z);
  function pipe(points: T.Vector3[], r: number, mat: T.Material) {
    const m = new T.Mesh(
      new T.TubeGeometry(new T.CatmullRomCurve3(points), 32, r, 10, false),
      mat,
    );
    cabin.add(m);
    return m;
  }
  function pad(
    x: number,
    y: number,
    z: number,
    w: number,
    h: number,
    d: number,
    mat: T.Material,
    r = 0.016,
  ) {
    const m = new T.Mesh(new RoundedBoxGeometry(w, h, d, 3, r), mat);
    m.position.set(x, y, z);
    cabin.add(m);
    return m;
  }
  function surface(rows: T.Vector3[][], mat: T.Material) {
    const verts: number[] = [],
      index: number[] = [];
    const n = rows[0].length;
    for (const row of rows) for (const p of row) verts.push(p.x, p.y, p.z);
    for (let j = 0; j < rows.length - 1; j++)
      for (let i = 0; i < n - 1; i++) {
        const k = j * n + i;
        index.push(k, k + 1, k + n, k + 1, k + n + 1, k + n);
      }
    const geo = new T.BufferGeometry();
    geo.setAttribute("position", new T.Float32BufferAttribute(verts, 3));
    geo.setAttribute(
      "uv",
      new T.Float32BufferAttribute(
        rows.flatMap((row, j) =>
          row.flatMap((_, i) => [i / (n - 1), j / (rows.length - 1)]),
        ),
        2,
      ),
    );
    geo.setIndex(index);
    geo.computeVertexNormals();
    mat.side = T.DoubleSide;
    const mesh = new T.Mesh(geo, mat);
    cabin.add(mesh);
    return mesh;
  }
  const row = (y: number, z: number, curve: number) =>
    Array.from({ length: 33 }, (_, i) => {
      const x = -1.35 + (i * 2.7) / 32;
      return v(x, y + 0.017 * x * x, z + curve * x * x);
    });
  surface(
    [
      row(-0.53, -0.43, 0.035),
      row(-0.347, -0.69, 0.09),
      row(-0.304, -0.91, 0.12),
      row(-0.383, -1.26, 0.16),
    ],
    leather,
  );
  pipe(row(-0.355, -0.68, 0.09), 0.0045, alloy);
  surface([row(-0.359, -0.674, 0.09), row(-0.399, -0.65, 0.09)], grain);
  pipe(row(-0.398, -0.65, 0.09), 0.003, alloy);
  for (let j = 0; j < 4; j++)
    pipe(row(-0.405 - j * 0.006, -0.643, 0.09), 0.0022, seal);
  // Rounded cowl, instrument binnacle and the upper rim of a tilted steering wheel.
  pad(-0.15, -0.325, -0.78, 0.48, 0.082, 0.23, leather, 0.037);
  const cluster = pad(
    -0.15,
    -0.335,
    -0.649,
    0.416,
    0.078,
    0.019,
    screen,
    0.022,
  );
  cluster.rotation.x = -0.19;
  const lcd = document.createElement("canvas");
  lcd.width = 1024;
  lcd.height = 192;
  const lcdCtx = lcd.getContext("2d")!;
  lcdCtx.fillStyle = "#161d20";
  lcdCtx.fillRect(0, 0, 1024, 192);
  lcdCtx.fillStyle = "#dfe8e5";
  lcdCtx.textAlign = "center";
  lcdCtx.font = "400 82px Helvetica Neue, sans-serif";
  lcdCtx.fillText(String(speedKmh), 520, 115);
  lcdCtx.font = "20px sans-serif";
  lcdCtx.fillText("km/h", 520, 153);
  lcdCtx.lineWidth = 4;
  for (const cx of [188, 828]) {
    lcdCtx.strokeStyle = "#52605e";
    lcdCtx.beginPath();
    lcdCtx.arc(cx, 160, 127, Math.PI * 1.07, Math.PI * 1.93);
    lcdCtx.stroke();
    for (let i = 0; i < 25; i++) {
      const a = Math.PI * (1.07 + (0.86 * i) / 24);
      lcdCtx.strokeStyle = i < 9 ? "#b6d3bd" : "#586560";
      lcdCtx.beginPath();
      lcdCtx.moveTo(cx + Math.cos(a) * 116, 160 + Math.sin(a) * 116);
      lcdCtx.lineTo(cx + Math.cos(a) * 124, 160 + Math.sin(a) * 124);
      lcdCtx.stroke();
    }
  }
  lcdCtx.font = "22px monospace";
  lcdCtx.fillStyle = "#acbdb3";
  lcdCtx.fillText("D", 188, 141);
  lcdCtx.fillText("READY", 828, 141);
  const displayTexture = new T.CanvasTexture(lcd);
  cabin.userData.updateSpeed = (kmh: number) => {
    if (kmh === speedKmh) return;
    speedKmh = kmh;
    lcdCtx.fillStyle = "#161d20";
    lcdCtx.fillRect(400, 20, 240, 103);
    lcdCtx.font = "400 82px Helvetica Neue, sans-serif";
    lcdCtx.fillStyle = "#dfe8e5";
    lcdCtx.fillText(String(kmh), 520, 115);
    displayTexture.needsUpdate = true;
  };
  displayTexture.colorSpace = T.SRGBColorSpace;
  const lcdMesh = new T.Mesh(
    new T.PlaneGeometry(0.395, 0.069),
    new T.MeshBasicMaterial({ map: displayTexture, toneMapped: false }),
  );
  lcdMesh.position.set(-0.15, -0.332, -0.636);
  lcdMesh.rotation.x = -0.19;
  cabin.add(lcdMesh);
  // Weave is model-space surface relief and stays below the road's contrast.
  const textureCanvas = document.createElement("canvas");
  textureCanvas.width = textureCanvas.height = 128;
  const ctx = textureCanvas.getContext("2d")!,
    pixels = ctx.createImageData(128, 128);
  let seed = 751;
  for (let i = 0; i < pixels.data.length; i += 4) {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    const v = 100 + (seed % 85);
    pixels.data.set([v, v, v, 255], i);
  }
  ctx.putImageData(pixels, 0, 0);
  const bump = new T.CanvasTexture(textureCanvas);
  bump.wrapS = bump.wrapT = T.RepeatWrapping;
  bump.repeat.set(6, 4);
  leather.bumpMap = bump;
  leather.bumpScale = 0.00045;
  const wheel = new T.Group();
  wheel.position.set(-0.2, -0.39, -0.56);
  wheel.rotation.x = -0.34;
  cabin.add(wheel);
  const rim = new T.Mesh(new T.TorusGeometry(0.172, 0.017, 18, 100), leather);
  wheel.add(rim);
  const seam = new T.Mesh(new T.TorusGeometry(0.157, 0.0015, 6, 100), grain);
  seam.position.z = 0.009;
  wheel.add(seam);
  const hub = new T.Mesh(
    new RoundedBoxGeometry(0.185, 0.095, 0.055, 4, 0.027),
    leather,
  );
  hub.position.y = -0.005;
  wheel.add(hub);
  for (const sign of [-1, 1]) {
    const spoke = new T.Mesh(
      new RoundedBoxGeometry(0.115, 0.028, 0.025, 3, 0.008),
      alloy,
    );
    spoke.position.set(sign * 0.112, -0.019, 0);
    spoke.rotation.z = sign * 0.23;
    wheel.add(spoke);
  }
  // A-pillars consist of a padded moulding, rubber glazing channel and inner seam.
  for (const side of [-1, 1]) {
    const offset = side === 1 ? 0.07 : 0;
    const path = [
      v(side * (1.16 + offset), -0.48, -1.02),
      v(side * (1.01 + offset), -0.11, -1.02),
      v(side * (0.8 + offset), 0.235, -0.89),
      v(side * (0.63 + offset), 0.494, -0.73),
    ];
    pipe(path, 0.039, lining);
    pipe(
      path.map((p) => p.clone().add(v(-side * 0.037, 0, -0.017))),
      0.012,
      seal,
    );
  }
  pipe(
    [
      v(-0.72, 0.48, -0.73),
      v(-0.32, 0.509, -0.81),
      v(0.3, 0.511, -0.83),
      v(0.79, 0.47, -0.74),
    ],
    0.038,
    lining,
  );
  // Curved glass reflects the environment at grazing angles; its central transmission stays clear.
  const windshield = new T.MeshPhysicalMaterial({
    color: "#e7edf0",
    roughness: 0.085,
    metalness: 0.65,
    transparent: true,
    opacity: 0.07,
    depthWrite: false,
    side: T.DoubleSide,
    envMapIntensity: 0.64,
  });
  windshield.onBeforeCompile = (shader) => {
    shader.fragmentShader = shader.fragmentShader.replace(
      "#include <opaque_fragment>",
      "diffuseColor.a *= 0.16 + 0.84 * pow(1.0 - abs(dot(normalize(vViewPosition),normal)), 2.0);\n#include <opaque_fragment>",
    );
  };
  const glassRows = [];
  for (let j = 0; j < 9; j++) {
    const t = j / 8;
    glassRows.push(
      Array.from({ length: 25 }, (_, i) => {
        const x = (i / 12 - 1) * (1.15 - 0.47 * t);
        return v(x, -0.395 + 0.89 * t, -1.24 + 0.45 * t + 0.14 * x * x);
      }),
    );
  }
  const glass = surface(glassRows, windshield);
  const perimeter = [
    ...glassRows[0],
    ...glassRows.slice(1).map((r) => r[r.length - 1]),
    ...glassRows.at(-1)!.slice(0, -1).reverse(),
    ...glassRows
      .slice(1, -1)
      .reverse()
      .map((r) => r[0]),
  ];
  const lip = new T.LineLoop(
    new T.BufferGeometry().setFromPoints(perimeter),
    new T.LineBasicMaterial({ color: 0xbdded4, transparent: true }),
  );
  glass.add(lip);
  lip.visible = false;
  // The glass stays on its real mounting through the optical cutaway.
  const body = cabin.children.filter((n) => n !== glass);
  const materials = new Set<T.Material>();
  for (const node of body)
    node.traverse((n) => {
      if (n instanceof T.Mesh) materials.add(n.material);
    });
  const originals = Array.from(materials, (m) => ({
    m,
    opacity: m.opacity,
    transparent: m.transparent,
    depth: m.depthWrite,
  }));
  cabin.userData.section = (amount: number) => {
    for (const record of originals) {
      const { m } = record;
      m.opacity = record.opacity * (1 - amount);
      m.transparent = amount > 0.001 || record.transparent;
      m.depthWrite = amount < 0.03 && record.depth;
    }
    for (const node of body) node.visible = amount < 0.995;
    windshield.opacity = 0.07 + 0.06 * amount;
    lip.visible = amount > 0.005;
    lip.material.opacity = amount * 0.16;
  };
  cabin.traverse(
    (o) =>
      (o.renderOrder =
        o instanceof T.Mesh && o.material === windshield ? 5 : 0),
  );
  return cabin;
}

export function disposeLocal(group: T.Group) {
  const geos = new Set<T.BufferGeometry>(),
    mats = new Set<T.Material>();
  group.traverse((n) => {
    if (n instanceof T.Sprite) mats.add(n.material);
    if (n instanceof T.Mesh || n instanceof T.Line) {
      geos.add(n.geometry);
      for (const m of ([] as T.Material[]).concat(n.material)) mats.add(m);
    }
  });
  geos.forEach((g) => g.dispose());
  mats.forEach((m) => {
    for (const value of Object.values(m))
      if (value instanceof T.Texture) value.dispose();
    m.dispose();
  });
}
