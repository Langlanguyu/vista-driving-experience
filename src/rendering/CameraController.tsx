import { useLayoutEffect } from "react";
import { useThree } from "@react-three/fiber";
import * as T from "three";
import type { SceneState } from "../domain/types";
import { junction } from "../data/scenarios";
const verifyPose =
  import.meta.env.DEV &&
  new URLSearchParams(location.search).has("verifyCamera");
export type CameraOwner = "driver" | "story" | "inspect";
// The only writer of the active R3F camera. The compositing pass owns its own
// scratch cameras and cannot change the driver's pose.
export function CameraController({
  s,
  owner,
}: {
  s: SceneState;
  owner: CameraOwner;
}) {
  const { camera, invalidate, gl } = useThree();
  useLayoutEffect(() => {
    const c = camera as T.PerspectiveCamera,
      n = s.ego.position.north;
    if (owner === "inspect") {
      if (s.scenario === "cross") {
        c.fov = 62;
        c.position.set(s.side === "left" ? 15 : -15, 22, -n + 15);
        c.lookAt(s.truth.target.east * 0.42, 0, -(n + junction.north) / 2);
      } else {
        c.fov = 54;
        c.position.set(-11, 12, -n + 1.6);
        c.lookAt(0, 0.6, -n - 22);
      }
    } else {
      c.fov = T.MathUtils.radToDeg(s.camera.verticalFov);
      c.position.set(s.camera.eye.east, s.camera.eye.up, -s.camera.eye.north);
      c.rotation.set(s.camera.pitch, -s.camera.yaw, 0, "YXZ");
    }
    c.updateMatrixWorld();
    c.updateProjectionMatrix();
    if (verifyPose) {
      const forward = c.getWorldDirection(new T.Vector3());
      gl.domElement.dataset.heading = Math.atan2(forward.x, -forward.z).toFixed(
        6,
      );
    }
    invalidate();
  }, [s, owner, camera, invalidate, gl]);
  return null;
}
