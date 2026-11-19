import * as T from "three";

// Author-space metres/units and child transforms are preserved. The tracking
// parent stays unit scale, so a world translation never inherits a unit conversion.
export function vehicleModel(source: T.Object3D, lengthM: number) {
  const oriented = new T.Group();
  oriented.rotation.y = Math.PI;
  oriented.add(source.clone(true));
  const bounds = new T.Box3().setFromObject(oriented, true);
  const size = bounds.getSize(new T.Vector3());
  if (!(size.z > 0 && lengthM > 0))
    throw new Error("Vehicle has no positive longitudinal extent");
  const factor = lengthM / size.z,
    center = bounds.getCenter(new T.Vector3());
  oriented.scale.setScalar(factor);
  oriented.position.set(
    -center.x * factor,
    -bounds.min.y * factor,
    -center.z * factor,
  );
  oriented.traverse((node) => {
    if ((node as T.Mesh).isMesh) {
      node.castShadow = true;
      node.receiveShadow = true;
    }
  });
  const vehicle = new T.Group();
  vehicle.add(oriented);
  return vehicle;
}

// Exact diagnostic bounds of visible mesh vertices, excluding the ground-shadow decal.
export function visibleDimensions(root: T.Object3D, exclude?: T.Object3D) {
  root.updateWorldMatrix(true, true);
  const box = new T.Box3(),
    v = new T.Vector3();
  root.traverseVisible((node) => {
    if (!(node instanceof T.Mesh) || node === exclude) return;
    const positions = node.geometry.getAttribute("position");
    for (let i = 0; i < positions.count; i++)
      box.expandByPoint(
        node.getVertexPosition(i, v).applyMatrix4(node.matrixWorld),
      );
  });
  return box.getSize(v).toArray();
}
