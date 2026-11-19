import * as T from "three";

// Only freight pixels carry stencil reference 1. A local vehicle prepass retains
// self-occlusion among the wheels, glazing and panels at the estimated pose.
export function makeXray(source: T.Group) {
  const ghost = source.clone(true),
    materials: T.Material[] = [];
  const vertexShader = `varying vec3 nView,pView;
  void main(){
    vec4 mv=modelViewMatrix*vec4(position,1.);
    nView=normalize(normalMatrix*normal);pView=mv.xyz;
    gl_Position=projectionMatrix*mv;
    gl_Position.z=(-.985+min(-mv.z,300.)*.001)*gl_Position.w;
  }`;
  const depth = new T.ShaderMaterial({
    vertexShader,
    fragmentShader: "void main(){gl_FragColor=vec4(0.);}",
    colorWrite: false,
    transparent: true,
    depthWrite: true,
    stencilWrite: true,
    stencilRef: 1,
    stencilFunc: T.EqualStencilFunc,
    stencilWriteMask: 0,
  });
  materials.push(depth);
  const mats = new Map<string, T.ShaderMaterial>();
  const meshes: T.Mesh[] = [];
  ghost.traverse((n) => {
    if (n instanceof T.Mesh) meshes.push(n);
  });
  for (const mesh of meshes) {
    mesh.castShadow = mesh.receiveShadow = false;
    const name =
      (Array.isArray(mesh.material) ? mesh.material[0] : mesh.material).name ||
      mesh.name;
    if (/interior|seat|floormat|brakedisc/i.test(name)) {
      mesh.visible = false;
      continue;
    }
    const kind = /glass|window/i.test(name)
      ? "glass"
      : /light|license|signal/i.test(name)
        ? "lamp"
        : /wheel|tire|rubber|rim|mechanical|hardware/i.test(name)
          ? "dark"
          : "body";
    let mat = mats.get(kind);
    if (!mat) {
      mat = new T.ShaderMaterial({
        vertexShader,
        transparent: true,
        depthWrite: false,
        depthFunc: T.EqualDepth,
        stencilWrite: true,
        stencilRef: 1,
        stencilFunc: T.EqualStencilFunc,
        stencilWriteMask: 0,
        uniforms: {
          intensity: { value: 1 },
          base: {
            value: new T.Color(
              kind === "glass"
                ? "#19404a"
                : kind === "dark"
                  ? "#233c3c"
                  : kind === "lamp"
                    ? "#e1f1d5"
                    : "#79bcae",
            ),
          },
        },
        fragmentShader: `varying vec3 nView,pView;uniform vec3 base; uniform float intensity;
        void main(){vec3 n=normalize(nView);float rim=pow(1.-abs(dot(n,normalize(-pView))),2.);
        float light=.20+.80*max(0.,dot(n,normalize(vec3(-.5,.8,.55))));
        gl_FragColor=vec4(base*light+vec3(.32,.56,.49)*rim,(.86+.13*rim)*intensity);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
        }`,
      });
      mats.set(kind, mat);
      materials.push(mat);
    }
    const shell = mesh.clone(false);
    shell.material = depth;
    shell.renderOrder = 10;
    mesh.parent!.add(shell);
    mesh.material = mat;
    mesh.renderOrder = 11;
  }
  ghost.userData.setIntensity = (a: number) =>
    mats.forEach((m) => (m.uniforms.intensity.value = a));
  ghost.userData.release = () => materials.forEach((m) => m.dispose());
  return ghost;
}
