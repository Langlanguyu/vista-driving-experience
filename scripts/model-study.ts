// Dev-server acceptance fixture. No runtime route or lab camera depends on it.
import * as T from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { RGBELoader } from "three/addons/loaders/RGBELoader.js";
import { vehicleModel } from "../src/rendering/vehicleModel";
const query = new URLSearchParams(location.search);
const kind = query.get("asset") === "cargo" ? "cargo" : "coupe",
  mode = query.get("mode") ?? "raw";
const [file, hdr] = await Promise.all([
  new GLTFLoader().loadAsync("/assets/" + kind + ".glb"),
  new RGBELoader().loadAsync("/assets/reflection.hdr"),
]);
const scene = new T.Scene(),
  raw = file.scene;
const object =
  mode === "raw" ? raw : vehicleModel(raw, kind === "cargo" ? 7.4 : 4.4);
const bounds = (n: T.Object3D) => new T.Box3().setFromObject(n, true);
if (mode === "legacy") {
  const size = bounds(object).getSize(new T.Vector3());
  const target = kind === "cargo" ? [2.65, 3.65, 7.4] : [1.82, 1.45, 4.4];
  object.scale.set(target[0] / size.x, target[1] / size.y, target[2] / size.z);
}
scene.add(object);
const box = bounds(object),
  dims = box.getSize(new T.Vector3()),
  center = box.getCenter(new T.Vector3());
const rawSize = bounds(raw).getSize(new T.Vector3());
const nodes: {
  name: string;
  parent: string;
  localScale: number[];
  worldScale: number[];
}[] = [];
raw.traverse((n) =>
  nodes.push({
    name: n.name,
    parent: n.parent?.name ?? "",
    localScale: n.scale.toArray(),
    worldScale: n.getWorldScale(new T.Vector3()).toArray(),
  }),
);
document.body.dataset.audit = JSON.stringify({
  asset: kind,
  mode,
  rawXYZ: rawSize.toArray(),
  renderedXYZ: dims.toArray(),
  nodes,
});
hdr.mapping = T.EquirectangularReflectionMapping;
scene.environment = hdr;
scene.background = new T.Color("#cdd5d5");
scene.add(new T.HemisphereLight(0xfff8ef, 0x687981, 1.3));
const sun = new T.DirectionalLight(0xfff4de, 2.2);
sun.position.set(4, 7, -5);
scene.add(sun);
const plane = new T.Mesh(
  new T.PlaneGeometry(2000, 2000),
  new T.MeshStandardMaterial({ color: 0x9ca9a8, roughness: 0.86 }),
);
plane.rotation.x = -Math.PI / 2;
plane.position.y = box.min.y - 0.002;
scene.add(plane);
const renderer = new T.WebGLRenderer({ antialias: true });
renderer.setSize(innerWidth, innerHeight);
renderer.toneMapping = T.ACESFilmicToneMapping;
document.body.append(renderer.domElement);
const cam = new T.PerspectiveCamera(35, innerWidth / innerHeight, 0.01, 2000);
const sign = mode === "raw" ? -1 : 1;
cam.position
  .copy(center)
  .add(new T.Vector3(0.88 * sign, 0.37, 1.12 * sign).multiplyScalar(dims.z));
cam.lookAt(center);
renderer.render(scene, cam);
document.body.dataset.ready = "true";
