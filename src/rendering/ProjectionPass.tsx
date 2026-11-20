import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo } from "react";
import * as T from "three";
import cfg from "../data/corridor.json";
import { NX, NY, type Field } from "../domain/researchProjection";
// The enlarged off-axis frustum renders extra street geometry at the unchanged eye.
// In COMPARE both strips sample one exposure and one depth-tested scene render.
export function ProjectionPass({
  strength,
  field,
  opticalView,
  compare,
  cockpitLayer,
  cabinOn,
  cockpitFov,
  study = 0,
  wipe = 1,
  opening = -1,
  cabinOpacity = 1,
}: {
  strength: number;
  field: Field | null;
  opticalView: {
    eyeX: number;
    eyeY: number;
    orbit: number;
    section: number;
    virtual: number;
    vid: number;
    console: number;
    film: boolean;
    bench: ReturnType<typeof import("../domain/opticalRayTracer").opticalBench>;
  };
  compare: number;
  cockpitLayer: T.Scene;
  cabinOn: boolean;
  cockpitFov: number;
  opening?: number;
  study?: number;
  wipe?: number;
  cabinOpacity?: number;
}) {
  const pass = useMemo(() => {
    const target = new T.WebGLRenderTarget(1, 1, {
      type: T.HalfFloatType,
      depthBuffer: true,
      stencilBuffer: true,
      samples: 2,
    });
    const cabinTarget = target.clone();
    cabinTarget.stencilBuffer = false;
    const lattice = new T.DataTexture(
      new Float32Array(NX * NY * 2),
      NX,
      NY,
      T.RGFormat,
      T.FloatType,
    );
    lattice.magFilter = lattice.minFilter = T.LinearFilter;
    lattice.needsUpdate = true;
    const uniforms = {
      lattice: { value: lattice },
      cabin: { value: cabinTarget.texture },
      hasCabin: { value: 0 },
      studio: { value: 0 },
      opening: { value: -1 },
      wipe: { value: 1 },
      hTan: { value: 1 },
      isolate: {
        value: +(
          import.meta.env.DEV &&
          new URLSearchParams(location.search).has("isolateCockpit")
        ),
      },
      source: { value: target.texture },
      edges: { value: new T.Vector2() },
      power: { value: 0 },
      compare: { value: 0 },
    };
    const mat = new T.ShaderMaterial({
      uniforms,
      depthTest: false,
      depthWrite: false,
      vertexShader:
        "varying vec2 v; void main(){v=uv;gl_Position=vec4(position.xy,0.,1.);}",
      fragmentShader: `varying vec2 v; uniform sampler2D source,cabin,lattice; uniform float isolate,hasCabin,hTan,studio,wipe,opening; uniform vec2 edges; uniform float power,compare;
      vec4 sampleScene(float x,float y,float a){
        vec2 cabinUV=vec2(.5+.5*x,y);
        vec2 grid=texture2D(lattice,(cabinUV*vec2(128.,64.)+.5)/vec2(129.,65.)).rg;
        float raw=a==0.?x:grid.x;
        y=a==0.?y:.5+.5*grid.y;
        vec3 world=texture2D(source,vec2((raw-edges.x)/(edges.y-edges.x),y)).rgb*(1.-isolate);
        float light=exp(-2.8*length(vec2(x-.28,1.3*(cabinUV.y-.57))));
        world=mix(world,vec3(.012,.022,.021)+vec3(.075,.099,.091)*light,studio);
        if(opening>=0.){
          vec2 center=vec2(.5,.51);
          float distanceToRoad=length((cabinUV-center)*vec2(.85,1.2));
          float radius=mix(-.16,1.,smoothstep(6.4,10.9,opening));
          float ink=smoothstep(radius-.09,radius+.09,distanceToRoad);
          vec3 studioLight=vec3(.008,.011,.010)+vec3(.034,.039,.034)*exp(-3.*distanceToRoad);
          world=mix(world,studioLight,ink);
        }
        vec4 interior=texture2D(cabin,cabinUV)*hasCabin;
        return vec4(world*(1.-interior.a)+interior.rgb,1.);
      }
      void main(){
        float x=v.x*2.-1.;
        gl_FragColor=sampleScene(x,v.y,v.x<=wipe?power:0.);
        if(compare>0.) gl_FragColor=mix(gl_FragColor,sampleScene(x,v.y+(v.y>.5?-.25:.25),v.y>.5?0.:power),compare);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
    });
    const geo = new T.PlaneGeometry(2, 2),
      scene = new T.Scene();
    const quad = new T.Mesh(geo, mat);
    quad.frustumCulled = false;
    scene.add(quad);
    return {
      target,
      cabinTarget,
      cabinCamera: new T.PerspectiveCamera(),
      clearColor: new T.Color(),
      uniforms,
      mat,
      geo,
      scene,
      screen: new T.Camera(),
      camera: new T.PerspectiveCamera(),
      size: new T.Vector2(),
    };
  }, []);
  useEffect(
    () => () => {
      pass.uniforms.lattice.value.dispose();
      pass.target.dispose();
      pass.cabinTarget.dispose();
      pass.mat.dispose();
      pass.geo.dispose();
    },
    [pass],
  );
  useFrame(({ gl, scene, camera }) => {
    const left = field?.left ?? -1,
      right = field?.right ?? 1;
    const texture = pass.uniforms.lattice.value;
    if (field && texture.image.data !== field.data) {
      texture.image.data = field.data;
      texture.needsUpdate = true;
    }
    const c = pass.camera.copy(camera as T.PerspectiveCamera);
    c.matrixAutoUpdate = true;
    const top = c.near * Math.tan(T.MathUtils.degToRad(c.fov / 2)),
      halfWidth = top * c.aspect;
    c.projectionMatrix.makePerspective(
      left * halfWidth,
      right * halfWidth,
      top,
      -top,
      c.near,
      c.far,
    );
    c.projectionMatrixInverse.copy(c.projectionMatrix).invert();
    pass.uniforms.hTan.value = halfWidth / c.near;
    gl.getDrawingBufferSize(pass.size);
    // Fixed capacity avoids reallocating MSAA/color/depth storage during a transition.
    pass.target.setSize(
      Math.min(3200, Math.ceil(pass.size.x * 1.55)),
      pass.size.y,
    );
    pass.uniforms.edges.value.set(left, right);
    pass.uniforms.power.value = strength;
    pass.uniforms.compare.value = +compare;
    gl.setRenderTarget(pass.target);
    gl.render(scene, c);
    pass.uniforms.hasCabin.value = cabinOn ? cabinOpacity : 0;
    pass.uniforms.studio.value = study;
    pass.uniforms.opening.value = opening;
    pass.uniforms.wipe.value = wipe;
    if (cabinOn) {
      // Cockpit is driver-local, independent of world fog, nonlinear rays and reveal zoom.
      const cc = pass.cabinCamera;
      cc.fov = T.MathUtils.radToDeg(cockpitFov);
      cc.aspect = c.aspect;
      cc.near = c.near;
      cc.far = 60;
      cc.position.set(opticalView.eyeX, opticalView.eyeY, 0);
      cc.rotation.set(cfg.pitch, 0, 0);
      const { section, orbit, virtual, vid, console: detail } = opticalView;
      if (section > 0) {
        const b = opticalView.bench;
        const bounds = new T.Box3().setFromPoints([
          b.emitter.center,
          b.mirror1.center,
          b.mirror2.center,
          b.glass.center,
          b.eye.center,
        ]);
        const extent = bounds.getSize(new T.Vector3());
        const halfAngle = T.MathUtils.degToRad(cc.fov / 2);
        const fitted =
          1.23 *
          Math.max(
            (extent.y + 0.25) / (2 * Math.tan(halfAngle)),
            (extent.z + 0.26) / (2 * Math.tan(halfAngle) * cc.aspect),
          );
        const distance = opticalView.film
          ? fitted + 0.52 * virtual
          : 1.15 + virtual * vid * 0.76;
        const target = new T.Vector3(
          0,
          -0.28 + 0.15 * virtual,
          -0.68 - virtual * vid * 0.37,
        );
        if (opticalView.film) {
          bounds.getCenter(target);
          target.z -= virtual * 0.36;
        }
        const position = target
          .clone()
          .add(
            new T.Vector3(
              Math.sin(orbit - (opticalView.film ? virtual * 1.12 : 0)) *
                distance,
              0.23 + virtual * 0.5,
              Math.cos(orbit - (opticalView.film ? virtual * 1.12 : 0)) *
                distance,
            ),
          );
        cc.position.lerp(position, section);
        const forward = new T.Vector3(
          0,
          Math.sin(cfg.pitch),
          -Math.cos(cfg.pitch),
        );
        cc.lookAt(forward.lerp(target, section));
      } else if (detail > 0) {
        cc.position.set(0.14 * detail, -0.05 * detail, -0.12 * detail);
        cc.rotation.set(cfg.pitch - 0.24 * detail, -0.31 * detail, 0, "YXZ");
      }
      cc.updateProjectionMatrix();
      cockpitLayer.environment = scene.environment;
      cockpitLayer.environmentIntensity = 0.82;
      pass.cabinTarget.setSize(pass.size.x, pass.size.y);
      const alpha = gl.getClearAlpha();
      gl.getClearColor(pass.clearColor);
      gl.setClearColor(0, 0);
      gl.setRenderTarget(pass.cabinTarget);
      gl.render(cockpitLayer, cc);
      gl.setClearColor(pass.clearColor, alpha);
    }
    gl.setRenderTarget(null);
    gl.render(pass.scene, pass.screen);
  }, 1);
  return null;
}
