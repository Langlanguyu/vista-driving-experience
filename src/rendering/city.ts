import * as T from "three";
import { junction } from "../data/scenarios";
import { lettering } from "./streetSigns";

// Repeated architectural elements share geometry, material and a draw call.
export function makeCity(
  bays: T.Object3D,
  tree: T.Object3D,
  roadMaps: T.Texture[],
) {
  const city = new T.Group(),
    cube = new T.BoxGeometry(),
    round = new T.CylinderGeometry(0.5, 0.5, 1, 12);
  const mats = new Map<string, T.MeshStandardMaterial>();
  const material = (color: string, metalness = 0, roughness = 0.77) => {
    const key = [color, metalness, roughness].join("/");
    if (!mats.has(key))
      mats.set(
        key,
        new T.MeshStandardMaterial({ color, metalness, roughness }),
      );
    return mats.get(key)!;
  };
  const batches = new Map<
    string,
    { geo: T.BufferGeometry; mat: T.Material; matrices: T.Matrix4[] }
  >();
  const dummy = new T.Object3D();
  function place(geo: T.BufferGeometry, mat: T.Material, matrix: T.Matrix4) {
    const key = geo.uuid + mat.uuid;
    if (!batches.has(key)) batches.set(key, { geo, mat, matrices: [] });
    batches.get(key)!.matrices.push(matrix.clone());
  }
  function at(x: number, y: number, z: number, w = 1, h = 1, d = 1, ry = 0) {
    dummy.position.set(x, y, z);
    dummy.scale.set(w, h, d);
    dummy.rotation.set(0, ry, 0);
    dummy.updateMatrix();
    return dummy.matrix;
  }
  function box(
    x: number,
    y: number,
    z: number,
    w: number,
    h: number,
    d: number,
    mat: T.Material,
    ry = 0,
  ) {
    place(cube, mat, at(x, y, z, w, h, d, ry));
  }
  function beam(
    a: T.Vector3,
    b: T.Vector3,
    w: number,
    depth: number,
    mat: T.Material,
  ) {
    dummy.position.copy(a).lerp(b, 0.5);
    dummy.quaternion.setFromUnitVectors(
      new T.Vector3(0, 1, 0),
      b.clone().sub(a).normalize(),
    );
    dummy.scale.set(w, a.distanceTo(b), depth);
    dummy.updateMatrix();
    place(cube, mat, dummy.matrix);
  }
  const stone = material("#a39c8e"),
    curb = material("#a7a196"),
    pave = material("#a59c88"),
    steel = material("#424c48", 0.5),
    rail = material("#67756d", 0.6),
    paint = material("#c0c1b8", 0, 0.9),
    glass = material("#5c767b", 0.73, 0.24),
    dark = material("#323c3a");
  // Patch the road paint with metric-scale wear shared by dashes and turn arrows.
  paint.onBeforeCompile = (shader) => {
    shader.vertexShader =
      "varying vec3 vPaintPoint;\n" +
      shader.vertexShader.replace(
        "#include <project_vertex>",
        "#include <project_vertex>\nvPaintPoint=(instanceMatrix*vec4(transformed,1.0)).xyz;",
      );
    shader.fragmentShader =
      "varying vec3 vPaintPoint;\n" +
      shader.fragmentShader.replace(
        "#include <color_fragment>",
        "#include <color_fragment>\nfloat wear=fract(sin(dot(floor(vPaintPoint.xz*74.),vec2(12.9898,78.233)))*43758.5453);diffuseColor.rgb*=mix(.58,1.0,smoothstep(.06,.37,wear));",
      );
  };
  const road = new T.Mesh(
    new T.PlaneGeometry(25, 630),
    new T.MeshStandardMaterial({
      color: "#858988",
      map: roadMaps[0],
      normalMap: roadMaps[1],
      roughnessMap: roadMaps[2],
      normalScale: new T.Vector2(0.57, 0.57),
      roughness: 0.95,
    }),
  );
  road.rotation.x = -Math.PI / 2;
  road.position.set(-2, 0, -240);
  road.receiveShadow = true;
  city.add(road);
  for (const tex of roadMaps.slice(0, 3)) {
    tex.wrapS = tex.wrapT = T.RepeatWrapping;
    tex.repeat.set(6, 151);
    tex.anisotropy = 6;
  }
  roadMaps[0].colorSpace = T.SRGBColorSpace;
  // Modulate continuous brick and concrete at architectural scale.
  const brick = roadMaps[3],
    concrete = roadMaps[4],
    leaf = roadMaps[5];
  for (const map of [brick, concrete, leaf]) {
    map.colorSpace = T.SRGBColorSpace;
    map.anisotropy = 4;
  }
  brick.wrapS =
    brick.wrapT =
    concrete.wrapS =
    concrete.wrapT =
      T.RepeatWrapping;
  brick.repeat.set(5, 4);
  concrete.repeat.set(2, 1);
  pave.map = concrete;
  stone.map = concrete;
  curb.map = concrete;
  const slate = material("#45504a", 0.25),
    brass = material("#ab946c", 0.58);
  const frontMat = new T.MeshStandardMaterial({
    map: roadMaps[6],
    roughnessMap: roadMaps[7],
    normalMap: roadMaps[8],
    normalScale: new T.Vector2(0.7, 0.7),
    color: "#c9beb0",
    roughness: 0.78,
    metalness: 0.13,
  });
  roadMaps[6].colorSpace = T.SRGBColorSpace;
  for (const tex of roadMaps.slice(6)) {
    tex.wrapS = tex.wrapT = T.RepeatWrapping;
    tex.anisotropy = 6;
  }
  const shopSigns = [
    lettering(
      "Alder & Finch",
      "BOOKSELLERS   ·   EST. 1968",
      "#34443c",
      "#e3dac2",
    ),
    lettering("RIVERSIDE", "MARKET   /   FRESH PRODUCE", "#59483b", "#ece4c8"),
    lettering("PORTSIDE", "SUPPLY  COMPANY", "#36454a", "#ede5d5"),
    lettering("ATELIER  07", "DESIGN   &   OBJECTS", "#a99074", "#222d29"),
  ];
  const shopWindows = roadMaps.slice(9, 12).map((map) => {
    map.colorSpace = T.SRGBColorSpace;
    map.anisotropy = 6;
    return new T.MeshStandardMaterial({
      map,
      color: "#909893",
      roughness: 0.25,
      metalness: 0.28,
    });
  });
  const streetBoard = lettering(
    "RIVER QUAY",
    "QUAYSIDE   /   EAST DISTRICT",
    "#30463d",
    "#e5eadc",
  );
  const quad = new T.PlaneGeometry(1, 1);
  const leafMat = new T.MeshStandardMaterial({
    map: leaf,
    transparent: false,
    alphaTest: 0.28,
    side: T.DoubleSide,
    roughness: 0.96,
    emissive: "#1e2114",
    emissiveIntensity: 0.28,
  });
  box(0, -0.23, -220, 900, 0.35, 700, pave);
  const jn = junction.north,
    rw = junction.width;
  const inJunction = (n: number, margin = 0) =>
    Math.abs(n - jn) < rw / 2 + margin;
  for (let n = -60; n < 490; n += 10) {
    if (inJunction(n, 3)) continue;
    for (const x of [-9, -1.8, 1.8])
      box(x, 0.009, -n, 0.115, 0.012, 3.7, paint);
    for (const x of [-5.46, -5.18])
      box(x, 0.012, -n, 0.1, 0.012, 10, material("#cdb06b"));
  }
  for (const x of [-13.4, 6.5])
    for (const [start, end] of [
      [-60, jn - rw / 2],
      [jn + rw / 2, 500],
    ])
      box(x, 0.014, -(start + end) / 2, 0.13, 0.012, end - start, paint);
  for (const side of [-1, 1]) {
    const edge = side === 1 ? 7.3 : -14.2;
    for (let n = -54; n < 462; n += 3) {
      if (inJunction(n, 1.45)) continue;
      box(edge, 0.085, -n, 0.3, 0.17, 2.98, curb);
      box(edge + side * 2.8, 0.048, -n, 5.35, 0.16, 2.985, pave);
    }
  }
  const arrowShape = new T.Shape();
  arrowShape.moveTo(-0.13, -2);
  arrowShape.lineTo(0.13, -2);
  arrowShape.lineTo(0.13, 0.35);
  arrowShape.lineTo(0.67, 0.18);
  arrowShape.lineTo(0, 1.85);
  arrowShape.lineTo(-0.67, 0.18);
  arrowShape.lineTo(-0.13, 0.35);
  arrowShape.closePath();
  const arrowGeo = new T.ShapeGeometry(arrowShape);
  arrowGeo.rotateX(-Math.PI / 2);
  for (const n of [41, 75, 174, 221])
    for (const x of [-3.6, 0, 3.6]) place(arrowGeo, paint, at(x, 0.022, -n));
  for (const n of [57, 188, 279])
    for (let x = -13; x < 7; x += 1.05)
      box(x, 0.019, -n, 0.47, 0.012, 3.4, paint);
  // Facade kit uses native three-metre bays, facing local +Z.
  const modules = new Map<
    string,
    { g: T.BufferGeometry; m: T.Material; matrix: T.Matrix4 }[]
  >();
  for (const part of bays.children) {
    const pieces: { g: T.BufferGeometry; m: T.Material; matrix: T.Matrix4 }[] =
      [];
    part.updateMatrixWorld(true);
    part.traverse((obj) => {
      if (obj instanceof T.Mesh)
        pieces.push({
          g: obj.geometry,
          m: obj.material,
          matrix: obj.matrixWorld.clone(),
        });
    });
    modules.set(part.name, pieces);
  }
  function tile(name: string, matrix: T.Matrix4) {
    for (const p of modules.get(name) ?? [])
      place(p.g, p.m, matrix.clone().multiply(p.matrix));
  }
  const stoneColors = ["#9a8c78", "#bbad96", "#9c9b90", "#b9a58e", "#918c80"];
  for (const side of [-1, 1]) {
    let n = -34;
    for (let i = 0; i < 14; i++) {
      const modern = (i + (side === 1 ? 0 : 2)) % 4 === 2;
      const baysWide = [7, 10, 5, 8, 9][(i + (side === 1 ? 0 : 2)) % 5],
        stories = [3, 4, 3, 4, 5, 3][(i + (side === 1 ? 1 : 0)) % 6],
        len = 3 * baysWide;
      if (n < jn + rw / 2 + 2 && n + len > jn - rw / 2 - 20) {
        n = jn + rw / 2 + 4;
      }
      const x = side * (side === 1 ? 13.5 : 21) + (i % 3) * side * 1.4,
        mid = -n - len / 2,
        rot = (-side * Math.PI) / 2;
      const wall = material(stoneColors[i % 5]),
        h = stories * 3.05;
      wall.map = brick;
      box(x + side * 7.65, h / 2, mid, 15, h, len, wall);
      box(x + side * 7.4, h + 0.17, mid, 15.4, 0.34, len + 0.42, stone);
      box(x + side * 8, h + 1.2, mid + 1, 4, 2.3, 5, dark);
      for (let floor = 0; floor < stories; floor++) {
        const y = 0.14 + floor * 3.05;
        box(x + side * 7.35, y + 2.96, mid, 15.5, 0.15, len + 0.25, curb);
        for (let j = 0; j < baysWide; j++) {
          const z = -n - 1.5 - 3 * j;
          if (floor === 0) {
            // Shop windows have recessed glazing, transoms, deep jambs and a canopy.
            box(x + side * 0.11, 1.5, z, 0.16, 2.62, 2.85, dark);
            place(
              quad,
              shopWindows[(i + Math.floor(j / 2)) % 3],
              at(x - side * 0.035, 1.62, z, 2.65, 2.32, 1, rot),
            );
            for (const offs of [-1.37, 0, 1.37])
              box(x - side * 0.15, 1.55, z + offs, 0.19, 2.72, 0.065, brass);
            box(x - side * 0.16, 2.19, z, 0.2, 0.075, 2.84, steel);
            box(x - side * 0.16, 0.36, z, 0.22, 0.26, 2.88, slate);
            if (j % 4 === 1) {
              place(
                quad,
                shopSigns[(i + (side === 1 ? 1 : 0)) % 4],
                at(x - side * 0.38, 2.79, z, 6.3, 0.92, 1, rot),
              );
            }
          } else if (modern) {
            box(x, y + 1.55, z, 0.19, 2.77, 2.92, glass);
            box(x - side * 0.18, y + 1.51, z, 0.3, 3.03, 0.09, rail);
            box(x - side * 0.22, y + 1.99, z, 0.32, 0.1, 2.96, rail);
          } else {
            const ground = floor === 0;
            const m = at(x, y, z + side * 1.5, 1, 1, 1, rot).clone();
            tile(
              ground
                ? "wall_door_centered_large_01"
                : "wall_window_centered_large_01",
              m,
            );
            tile(
              ground ? "door_centered_large_01" : "window_centered_large_01",
              m,
            );
            if (floor > 0 && i % 3 === 0 && j % 3 === 1) {
              box(x - side * 0.61, y + 0.15, z, 1.35, 0.16, 2.9, stone);
              box(x - side * 1.22, y + 0.89, z, 0.07, 0.07, 2.81, rail);
              for (let v = -1.32; v < 1.4; v += 0.38)
                box(x - side * 1.22, y + 0.54, z + v, 0.04, 0.73, 0.04, rail);
            }
          }
        }
        // Return walls with inset windows on both ends of each block.
      }
      for (const zn of [mid - len / 2 - 0.06, mid + len / 2 + 0.06]) {
        const outward = zn > mid ? 0 : Math.PI;
        place(
          quad,
          frontMat,
          at(x + side * 7.65, h / 2, zn, 15, h, 1, outward),
        );
      }
      if (i % 2 === 0) {
        box(x - side * 0.85, 3.45, mid, 2.3, 0.16, len * 0.94, slate);
        for (let j = 0; j < baysWide; j += 2)
          beam(
            new T.Vector3(x, 4.2, -n - 3 * j),
            new T.Vector3(x - side * 1.9, 3.5, -n - 3 * j),
            0.045,
            0.05,
            steel,
          );
      }
      if (i % 3 === 0) {
        const poleX = x - side * 0.65;
        box(poleX, 5.4, mid, 1.3, 0.075, 0.085, steel);
        // Double-sided perpendicular shop sign visible on approach.
        box(x - side * 1.22, 4.83, mid, 1.9, 1.12, 0.12, slate);
        place(
          quad,
          shopSigns[i % 4],
          at(x - side * 1.22, 4.83, mid + 0.069, 1.84, 0.92, 1),
        );
      }
      for (let j = 0; j < 2; j++) {
        box(
          x + side * (4 + j * 3),
          h + 0.85,
          mid - 4 + j * 7,
          2.01,
          1.4,
          2.55,
          rail,
        );
      }

      n += len + (i % 3 === 0 ? 11 : 3);
    }
  }
  // Overhead steel railway crosses the street obliquely. Riveted plate girders,
  // concrete piers and diagonal bracing cast shadows on the road below.
  const bridge = new T.Matrix4().makeRotationY(0.36),
    v = (x: number, y: number, z: number) =>
      new T.Vector3(x, y, z)
        .applyMatrix4(bridge)
        .add(new T.Vector3(0, 0, -116));
  const girder = material("#59645b", 0.55),
    cap = material("#677468", 0.48);
  const bridgeBox = (
    x: number,
    y: number,
    z: number,
    w: number,
    h: number,
    d: number,
    m: T.Material,
  ) => {
    const p = v(x, y, z);
    box(p.x, p.y, p.z, w, h, d, m, 0.36);
  };
  bridgeBox(0, 8.55, 0, 94, 0.56, 7.3, stone);
  for (const z of [-3.4, 3.4]) {
    for (const y of [8.33, 11.1]) {
      bridgeBox(0, y, z, 94, 0.22, 0.36, girder);
      bridgeBox(0, y + 0.12, z, 94, 0.075, 0.48, cap);
    }
    for (let x = -46; x < 46; x += 3.8) {
      beam(v(x, 8.44, z), v(x + 3.8, 11, z), 0.16, 0.16, girder);
      beam(v(x, 11, z), v(x + 3.8, 8.44, z), 0.13, 0.14, girder);
      bridgeBox(x, 9.65, z, 0.16, 2.8, 0.2, cap);
    }
  }
  for (const x of [-18, 11, 31, -38]) {
    bridgeBox(x, 3.9, 0, 1.25, 7.8, 4.8, stone);
    bridgeBox(x, 7.8, 0, 2.3, 1, 6.9, curb);
  }
  const bridgeLabel = lettering(
    "EAST DOCK RAILWAY",
    "R I V E R   Q U A R T E R",
    "#434e46",
    "#dfdac6",
  );
  const bp = v(-9, 8.53, 3.74);
  place(quad, bridgeLabel, at(bp.x, bp.y, bp.z, 7.9, 1.35, 1, 0.36));
  for (const n of [47, 159, 273]) {
    place(round, steel, at(8.5, 2.72, -n, 0.12, 5.44, 0.12));
    place(quad, streetBoard, at(8.53, 4.87, -n + 0.08, 3.55, 1.15, 1, -0.14));
  }
  // Pavement furniture and northbound lamps.
  for (let n = -28; n < 412; n += 22) {
    if (inJunction(n, 4)) continue;
    for (const side of [-1, 1]) {
      const x = side === 1 ? 8.5 : -15.2;
      place(round, rail, at(x, 3.55, -n, 0.14, 7.1, 0.14));
      place(round, dark, at(x, 0.55, -n, 0.28, 1.1, 0.28));
      beam(
        new T.Vector3(x, 6.8, -n),
        new T.Vector3(x - side * 2.85, 7.6, -n),
        0.1,
        0.12,
        rail,
      );
      box(x - side * 3, 7.54, -n, 1.02, 0.12, 0.42, dark);
      box(x + side * 0.8, 0.26, -n - 4, 0.46, 0.52, 0.5, dark);
    }
  }
  for (let i = 0; i < 26; i++) {
    const e = i % 2 === 0 ? 9.8 : -16.1,
      n = -15 + Math.floor(i / 2) * 24 + (i % 2) * 8;
    if (inJunction(n, 4)) continue;
    const angle = i * 1.834,
      scale = i % 3 === 1 ? 2.1 : 1.8;
    tree.updateMatrixWorld(true);
    const m = at(e, 0.18, -n, scale, scale, scale, angle).clone();
    tree.traverse((obj) => {
      if (obj instanceof T.Mesh)
        place(obj.geometry, obj.material, m.clone().multiply(obj.matrixWorld));
    });
    // A baked high-detail canopy LOD supplements the simplified trunk and branches.
    for (let j = 0; j < 2; j++)
      place(
        quad,
        leafMat,
        at(
          e,
          0.18 + 2.25 * scale,
          -n,
          5 * scale,
          5 * scale,
          1,
          (j * Math.PI) / 2 + angle,
        ),
      );
    box(e, 0.153, -n, 1.75, 0.04, 1.88, dark);
    if (i % 3 === 1) {
      for (let k = 0; k < 4; k++)
        box(
          e,
          0.68,
          -n - 3 + k * 0.12,
          1.75,
          0.075,
          0.095,
          material("#826749"),
        );
      for (const dx of [-0.62, 0.62])
        box(e + dx, 0.37, -n - 2.8, 0.085, 0.65, 0.38, steel);
    }
  }
  // Continuous cross street with two anchored corner occluders and shopfronts along its depth.
  const crossRoad = new T.Mesh(new T.PlaneGeometry(rw, 240), road.material);
  crossRoad.rotation.order = "YXZ";
  crossRoad.rotation.set(-Math.PI / 2, Math.PI / 2, 0);
  crossRoad.position.set(0, 0.004, -jn);
  crossRoad.geometry.attributes.uv.array.forEach((value, i, arr) => {
    arr[i] = value * (i % 2 === 0 ? 0.56 : 0.38);
  });
  crossRoad.receiveShadow = true;
  city.add(crossRoad);
  for (const side of [-1, 1]) {
    const cornerX =
      side * (Math.abs(junction.cornerEast) + junction.cornerWidth / 2);
    const z = -(jn - rw / 2 - junction.cornerDepth / 2);
    box(cornerX, 5, z, junction.cornerWidth, 10, junction.cornerDepth, stone);
    place(
      quad,
      frontMat,
      at(cornerX, 5, z + junction.cornerDepth / 2 + 0.03, 15, 10),
    );
    place(
      quad,
      frontMat,
      at(cornerX, 5, z - junction.cornerDepth / 2 - 0.03, 15, 10, 1, Math.PI),
    );
    place(
      quad,
      frontMat,
      at(side * 19.98, 5, z, 18, 10, 1, (-side * Math.PI) / 2),
    );
    box(cornerX, 10.12, z, 15.3, 0.24, 18.3, curb);
    for (let x = 17; x < 116; x += 4) {
      place(cube, paint, at(side * x, 0.02, -jn, 2.1, 0.012, 0.12));
      for (const edge of [-1, 1])
        box(side * x, 0.07, -jn + edge * (rw / 2 + 1.3), 4, 0.14, 2.6, pave);
    }
    for (let x = 40; x < 110; x += 16)
      for (const edge of [-1, 1]) {
        const height = 9 + 3 * ((x / 8) % 3),
          zz = -jn + edge * (rw / 2 + 8);
        box(side * x, height / 2, zz, 15, height, 10, stone);
        place(
          quad,
          frontMat,
          at(
            side * x,
            height / 2,
            zz - edge * 5.03,
            15,
            height,
            1,
            edge === 1 ? Math.PI : 0,
          ),
        );
      }
    for (let x = -12; x < 7; x += 1.15)
      box(x, 0.021, -jn + side * 9.7, 0.49, 0.012, 2.3, paint);
    const sx = side === 1 ? 7.9 : -15.4;
    box(sx, 2.5, -jn - side * 9, 0.14, 5, 0.14, steel);
    box(sx, 4.55, -jn - side * 9, 0.39, 1.16, 0.33, dark);
    for (let k = 0; k < 3; k++)
      box(
        sx,
        4.9 - k * 0.33,
        -jn - side * 9 + 0.18,
        0.19,
        0.19,
        0.04,
        material(k === 0 ? "#ce6251" : "#38433c"),
      );
  }
  // Far buildings terminate the axis instead of exposing the end of the roadway.
  for (let i = 0; i < 24; i++) {
    const h = 20 + ((i * 19) % 53),
      w = 12 + (i % 4) * 3.5,
      x = (i - 12) * 13,
      z = -475 - (i % 5) * 15;
    box(x, h / 2, z, w, h, 18, material(stoneColors[i % 5]));
    for (let y = 3; y < h - 1; y += 3)
      box(x, y, z + 9.1, w - 0.4, 1.15, 0.18, glass);
  }
  for (const b of batches.values()) {
    const mesh = new T.InstancedMesh(b.geo, b.mat, b.matrices.length);
    b.matrices.forEach((m, i) => mesh.setMatrixAt(i, m));
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    city.add(mesh);
  }
  const dry = road.material.color.clone(),
    wet = new T.Color("#646a6b");
  city.userData.wet = (amount: number) => {
    road.material.color.copy(dry).lerp(wet, amount);
    road.material.roughness = 0.88 - 0.65 * amount;
    road.material.envMapIntensity = 1 + 0.65 * amount;
  };
  city.userData.release = () => {
    for (const m of mats.values()) m.dispose();
    for (const m of shopSigns) {
      m.map?.dispose();
      m.dispose();
    }
    shopWindows.forEach((m) => m.dispose());
    frontMat.dispose();
    streetBoard.map?.dispose();
    streetBoard.dispose();
    bridgeLabel.map?.dispose();
    bridgeLabel.dispose();
    arrowGeo.dispose();
    leafMat.dispose();
    cube.dispose();
    quad.dispose();
    round.dispose();
    crossRoad.geometry.dispose();
    road.geometry.dispose();
    road.material.dispose();
  };
  return city;
}
