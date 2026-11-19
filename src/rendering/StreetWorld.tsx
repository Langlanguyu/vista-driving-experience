import {assetUrl} from "../utils/assetUrl";
import { useLayoutEffect, useMemo } from "react";
import { createPortal, useFrame, useThree } from "@react-three/fiber";
import { Environment, useGLTF, useTexture } from "@react-three/drei";
import * as T from "three";
import { centerDisplay } from "./consoleDisplay";
import { makeCockpit, disposeLocal } from "./cockpit";
import { cargoBody } from "./cargoBody";
import { freightMarkings, contactShadow } from "./streetSigns";
import { makeCity } from "./city";
import { Weather } from "./Weather";
import { vehicleModel, visibleDimensions } from "./vehicleModel";
import { makeXray } from "./spatialXray";
import { cfg } from "../scenes/corridor";
import type { SceneState } from "../domain/types";
export function StreetWorld({
  s,
  inspect,
  cabinOn,
  reveal,
  hud,
  study = 0,
  futureConsole = false,
  xrayAmount = 1,
  exterior,
  cockpitLayer,
  ready,
}: {
  s: SceneState;
  inspect: boolean;
  cabinOn: boolean;
  reveal: number;
  hud: boolean;
  study?: number;
  futureConsole?: boolean;
  xrayAmount?: number;
  exterior: boolean;
  ready: () => void;
  cockpitLayer: T.Scene;
}) {
  const { gl, invalidate } = useThree();
  const benchmark = useMemo(
    () => new URLSearchParams(location.search).has("benchmark"),
    [],
  );
  useFrame(() => {
    if (benchmark) {
      const host = window as Window & { vistaFrames?: number[] };
      (host.vistaFrames ??= []).push(performance.now());
    }
  });
  const [truckFile, carFile, facade, tree] = useGLTF(
    [
      assetUrl("cargo.glb"),
      assetUrl("coupe.glb"),
      assetUrl("bay.glb"),
      assetUrl("tree.glb"),
    ],
    false,
    false,
  );
  const maps = useTexture([
    assetUrl("road-color.webp"),
    assetUrl("road-normal.webp"),
    assetUrl("road-rough.webp"),
    assetUrl("brick.webp"),
    assetUrl("concrete.webp"),
    assetUrl("foliage.webp"),
    assetUrl("facade-color.webp"),
    assetUrl("facade-rough.webp"),
    assetUrl("facade-normal.webp"),
    assetUrl("shop-0.webp"),
    assetUrl("shop-1.webp"),
    assetUrl("shop-2.webp"),
  ]);
  const city = useMemo(
    () => makeCity(facade.scene, tree.scene, maps),
    [facade, tree, maps[0]],
  );
  const trim = useMemo(freightMarkings, []);
  const contact = useMemo(() => contactShadow(3.6, 9.1), []);
  const coach = useMemo(cargoBody, []);
  const truck = useMemo(() => {
    const group = new T.Group(),
      chassis = vehicleModel(truckFile.scene, 7.4);
    chassis.traverse((o) => {
      if (o instanceof T.Mesh) {
        if (/back.main|back.side|back.down/i.test(o.name)) o.visible = false;
        o.material = o.material.clone();
        o.material.userData.localChassis = true;
      }
    });
    group.add(chassis, coach, trim, contact);
    return group;
  }, [truckFile, trim, contact, coach]);
  const surfaces = useMemo(() => {
    const list = new Map<
      T.Material,
      {
        opacity: number;
        depthWrite: boolean;
        transparent: boolean;
        floor: number;
      }
    >();
    truck.traverse((o) => {
      if (o instanceof T.Mesh && o !== contact) {
        const m = o.material as T.Material;
        m.stencilWrite = true;
        m.stencilRef = 1;
        m.stencilFunc = T.AlwaysStencilFunc;
        m.stencilZPass = T.ReplaceStencilOp;
        list.set(m, {
          opacity: m.opacity,
          depthWrite: m.depthWrite,
          transparent: m.transparent,
          floor: /tire/i.test(o.name)
            ? 0.32
            : /back rim|steel/i.test(o.name)
              ? 0.18
              : 0.055,
        });
      }
    });
    return list;
  }, [truck, contact]);
  useLayoutEffect(() => {
    for (const [m, base] of surfaces) {
      const transparent = reveal > 0 || base.transparent;
      if (m.transparent !== transparent) {
        m.transparent = transparent;
        m.needsUpdate = true;
      }
      m.depthWrite = reveal === 0 && base.depthWrite;
      m.opacity = base.opacity * (1 - reveal * (1 - base.floor));
    }
    invalidate();
  }, [reveal, surfaces, invalidate]);
  const target = useMemo(
    () => vehicleModel(carFile.scene, cfg.targetSize[2]),
    [carFile],
  );
  const ghost = useMemo(() => makeXray(target), [target]);
  useLayoutEffect(() => () => ghost.userData.release(), [ghost]);
  const parked = useMemo(() => {
    const g = new T.Group();
    for (const [x, z, shade] of [
      [-12.4, -97, "#777f7c"],
      [5.65, -102, "#9f9a8c"],
    ] as const) {
      const car = vehicleModel(carFile.scene, cfg.targetSize[2]);
      car.position.set(x, 0, z);
      if (x < 0) car.rotation.y = Math.PI;
      car.traverse((n) => {
        if (n instanceof T.Mesh) {
          if (/Paint/.test(n.material.name)) {
            const m = n.material.clone();
            m.color.set(shade);
            m.metalness = 0.61;
            m.roughness = 0.3;
            n.material = m;
            m.userData.parked = true;
          }
        }
      });
      g.add(car);
    }
    return g;
  }, [carFile]);
  const egoBody = useMemo(
    () => vehicleModel(carFile.scene, cfg.targetSize[2]),
    [carFile],
  );
  const consoleScreen = useMemo(centerDisplay, []);
  useLayoutEffect(() => {
    cabin.add(consoleScreen.panel);
    return () => {
      cabin.remove(consoleScreen.panel);
      disposeLocal(new T.Group().add(consoleScreen.panel));
    };
  }, [consoleScreen]);
  const cabin = useMemo(() => makeCockpit(Math.round(cfg.egoSpeed * 3.6)), []);
  const sun = useMemo(() => {
    const l = new T.DirectionalLight("#fff0d8", 2.25);
    l.castShadow = true;
    l.shadow.mapSize.set(2048, 2048);
    Object.assign(l.shadow.camera, {
      left: -55,
      right: 55,
      top: 55,
      bottom: -55,
      near: 1,
      far: 240,
    });
    l.shadow.bias = -0.00035;
    l.shadow.normalBias = 0.035;
    return l;
  }, []);
  useLayoutEffect(() => {
    if (
      import.meta.env.DEV &&
      new URLSearchParams(location.search).has("auditVehicles")
    ) {
      gl.domElement.dataset.vehicles = JSON.stringify({
        truck: visibleDimensions(truck, contact),
        chassis: visibleDimensions(truck.children[0]),
        target: visibleDimensions(target),
        ego: visibleDimensions(egoBody),
        parked: parked.children.map((car) => visibleDimensions(car)),
        xray: visibleDimensions(ghost),
      });
    }
    ready();
    return () => {
      sun.shadow.dispose();
      disposeLocal(cabin);
      disposeLocal(coach);
      truck.traverse((n) => {
        if (n instanceof T.Mesh && n.material.userData.localChassis)
          n.material.dispose();
      });
      trim.userData.release();
      contact.userData.release();
      parked.traverse((n) => {
        if (n instanceof T.Mesh && n.material.userData.parked)
          n.material.dispose();
      });
      city.traverse((n) => {
        if (n instanceof T.InstancedMesh) n.dispose();
      });
      city.userData.release?.();
    };
  }, [city, sun, ready, trim, contact, parked]);
  useLayoutEffect(() => {
    const n = s.ego.position.north;
    truck.position.set(s.truth.truck.east, 0, -s.truth.truck.north);
    target.position.set(s.truth.target.east, 0, -s.truth.target.north);
    target.rotation.y = -s.targetHeading;
    truck.visible = s.scenario !== "cross";
    ghost.userData.setIntensity(xrayAmount);
    ghost.visible =
      hud &&
      !inspect &&
      reveal === 0 &&
      s.decision.mode === "world" &&
      s.decision.occlusion === "truck" &&
      !!s.track;
    if (s.track) {
      ghost.position.set(
        s.track.position.east,
        s.track.position.up - cfg.targetSize[1] / 2,
        -s.track.position.north,
      );
      ghost.rotation.y = -Math.atan2(
        s.track.velocity.east,
        s.track.velocity.north,
      );
    }
    city.userData.wet(s.fog);
    cabin.userData.updateSpeed(Math.round(s.ego.velocity.north * 3.6));
    cabin.userData.section(study);
    consoleScreen.update(s, futureConsole);
    cabin.visible = !inspect && cabinOn;
    egoBody.position.set(0, 0, -n + 0.42);
    egoBody.visible = inspect || exterior;
    sun.position.set(-56, 46, -n + 32);
    sun.target.position.set(0, 0, -n - 42);
    invalidate();
  }, [
    s,
    inspect,
    cabinOn,
    hud,
    ghost,
    reveal,
    exterior,
    truck,
    target,
    cabin,
    egoBody,
    sun,
    invalidate,
    study,
    futureConsole,
    consoleScreen,
    xrayAmount,
  ]);
  return (
    <>
      <fogExp2
        attach="fog"
        args={[
          s.weather === "fog" ? "#b4c1c3" : "#c6d8e3",
          0.0023 + s.fog * 0.048,
        ]}
      />
      <Environment
        files={assetUrl("noon.hdr")}
        background="only"
        backgroundIntensity={0.88 - s.fog * 0.42}
        backgroundRotation={[0, 1.2, 0]}
        environmentRotation={[0, 1.2, 0]}
        environmentIntensity={0.65}
      />
      <Environment
        files={assetUrl("reflection.hdr")}
        environmentIntensity={0.82 - s.fog * 0.32}
      />
      <hemisphereLight args={["#c6dffa", "#90877a", 0.87]} />
      <primitive object={sun} />
      <primitive object={sun.target} />
      <primitive object={city} />
      {s.weather === "fog" && <Weather s={s} />}
      {import.meta.env.DEV &&
        new URLSearchParams(location.search).has("verifyProjection") &&
        s.track && (
          <mesh
            position={[
              s.track.position.east,
              s.track.position.up,
              -s.track.position.north,
            ]}
            renderOrder={99}
          >
            <sphereGeometry args={[0.13, 20, 12]} />
            <meshBasicMaterial
              color="#ff00ff"
              transparent
              depthTest={false}
              toneMapped={false}
            />
          </mesh>
        )}
      <primitive object={parked} />
      <primitive object={truck} />
      <primitive object={ghost} />
      <primitive
        object={target}
        visible={
          !(
            import.meta.env.DEV &&
            new URLSearchParams(location.search).has("omitTarget")
          )
        }
      />
      {createPortal(
        <>
          <hemisphereLight args={["#c6dffa", "#90877a", 0.87]} />
          <directionalLight
            position={[-56, 46, 74]}
            color="#fff0d8"
            intensity={2.25}
          />
          <primitive object={cabin} />
        </>,
        cockpitLayer,
      )}
      <primitive object={egoBody} />
    </>
  );
}
