"use client";

import { useEffect, useRef, useState } from "react";
import { parseKicadPcb, type PcbModel, type PcbPad, type PcbTrack } from "./kicadPcb";

export type CadViewerProps = { url: string; name: string; onError?: (message: string) => void };

type ThreeRuntime = typeof import("three");

function extensionOf(name: string) {
  const value = name.toLowerCase().split(/[?#]/)[0];
  return value.endsWith(".kicad_pcb") ? "kicad_pcb" : value.split(".").pop() || "";
}

function disposeObject(object: any) {
  object.traverse?.((child: any) => {
    child.geometry?.dispose?.();
    if (Array.isArray(child.material)) child.material.forEach((material: any) => material.dispose?.());
    else child.material?.dispose?.();
  });
}

function createMeshFromOcct(THREE: ThreeRuntime, mesh: any) {
  const geometry = new THREE.BufferGeometry();
  const positions = mesh.attributes?.position?.array || [];
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  if (mesh.attributes?.normal?.array) geometry.setAttribute("normal", new THREE.Float32BufferAttribute(mesh.attributes.normal.array, 3));
  if (mesh.index?.array) geometry.setIndex(Array.from(mesh.index.array));
  else geometry.computeVertexNormals();
  geometry.computeBoundingBox();
  const color = mesh.color ? new THREE.Color(mesh.color[0], mesh.color[1], mesh.color[2]) : new THREE.Color("#9bb7c2");
  return new THREE.Mesh(geometry, new THREE.MeshStandardMaterial({ color, metalness: .22, roughness: .4, side: THREE.DoubleSide }));
}

function addExtrudedPolygon(THREE: ThreeRuntime, group: any, points: { x: number; y: number }[], depth: number, color: string, z = 0) {
  if (points.length < 3) return;
  const shape = new THREE.Shape();
  points.forEach((point, index) => {
    const x = point.x;
    const y = -point.y;
    if (index === 0) shape.moveTo(x, y);
    else shape.lineTo(x, y);
  });
  shape.closePath();
  const geometry = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: false });
  const mesh = new THREE.Mesh(geometry, new THREE.MeshStandardMaterial({ color, roughness: .58, metalness: .08 }));
  mesh.position.z = z;
  group.add(mesh);
}

function addPcbPad(THREE: ThreeRuntime, group: any, pad: PcbPad, center: { x: number; y: number }, thickness: number) {
  const isRound = pad.shape === "circle" || pad.w === pad.h;
  const height = Math.max(.04, thickness * .16);
  const z = pad.sides.includes("bottom") && !pad.sides.includes("top") ? -.08 : thickness + .03;
  let mesh: any;
  if (isRound) {
    mesh = new THREE.Mesh(new THREE.CylinderGeometry(pad.w / 2, pad.w / 2, height, 32), new THREE.MeshStandardMaterial({ color: "#d6a53b", metalness: .72, roughness: .3 }));
    mesh.rotation.x = Math.PI / 2;
  } else {
    mesh = new THREE.Mesh(new THREE.BoxGeometry(pad.w, pad.h, height), new THREE.MeshStandardMaterial({ color: "#d6a53b", metalness: .72, roughness: .3 }));
    mesh.rotation.z = (pad.rot * Math.PI) / 180;
  }
  mesh.position.set(pad.x - center.x, -(pad.y - center.y), z + height / 2);
  group.add(mesh);

  if (pad.drill > 0) {
    const hole = new THREE.Mesh(new THREE.CylinderGeometry(pad.drill / 2, pad.drill / 2, thickness + .2, 20), new THREE.MeshStandardMaterial({ color: "#172027", roughness: .8 }));
    hole.rotation.x = Math.PI / 2;
    hole.position.set(pad.x - center.x, -(pad.y - center.y), thickness / 2);
    group.add(hole);
  }
}

function addPcbTrack(THREE: ThreeRuntime, group: any, track: PcbTrack, center: { x: number; y: number }, thickness: number) {
  const dx = track.x2 - track.x1;
  const dy = track.y2 - track.y1;
  const length = Math.hypot(dx, dy);
  if (!length) return;
  const height = Math.max(.035, thickness * .1);
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(length, track.width, height), new THREE.MeshStandardMaterial({ color: track.side === "top" ? "#d29b2e" : "#b87536", metalness: .55, roughness: .34 }));
  mesh.position.set((track.x1 + track.x2) / 2 - center.x, -((track.y1 + track.y2) / 2 - center.y), track.side === "top" ? thickness + .02 : -.02);
  mesh.rotation.z = -Math.atan2(dy, dx);
  group.add(mesh);
}

function buildPcb(THREE: ThreeRuntime, model: PcbModel) {
  const group = new THREE.Group();
  const points = model.outline;
  const xs = points.map((point) => point.x);
  const ys = points.map((point) => point.y);
  const center = { x: (Math.min(...xs) + Math.max(...xs)) / 2, y: (Math.min(...ys) + Math.max(...ys)) / 2 };
  const outline = points.map((point) => ({ x: point.x - center.x, y: point.y - center.y }));
  addExtrudedPolygon(THREE, group, outline, model.thickness, "#1f805a", 0);

  // The outline coordinates are now centered; component coordinates stay in board space.
  model.pads.forEach((pad) => addPcbPad(THREE, group, pad, center, model.thickness));
  model.tracks.forEach((track) => addPcbTrack(THREE, group, track, center, model.thickness));
  model.vias.forEach((via) => {
    const mesh = new THREE.Mesh(new THREE.CylinderGeometry(via.size / 2, via.size / 2, Math.max(.04, model.thickness * .12), 20), new THREE.MeshStandardMaterial({ color: "#d6a53b", metalness: .72, roughness: .3 }));
    mesh.rotation.x = Math.PI / 2;
    mesh.position.set(via.x - center.x, -(via.y - center.y), model.thickness + .05);
    group.add(mesh);
  });
  model.bodies.forEach((body) => {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(body.w, body.h, body.height), new THREE.MeshStandardMaterial({ color: body.side === "top" ? "#1d252a" : "#343a3d", roughness: .38, metalness: .15 }));
    mesh.position.set(body.cx - center.x, -(body.cy - center.y), body.side === "top" ? model.thickness + body.height / 2 : -body.height / 2);
    mesh.rotation.z = (body.rot * Math.PI) / 180;
    group.add(mesh);
  });
  return group;
}

export default function CadViewer({ url, name, onError }: CadViewerProps) {
  const mountRef = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState("Loading 3D model…");
  const [wireframe, setWireframe] = useState(false);
  const modelRef = useRef<any>(null);
  const resetRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    modelRef.current?.traverse?.((child: any) => {
      const materials = Array.isArray(child.material) ? child.material : child.material ? [child.material] : [];
      materials.forEach((material: any) => { material.wireframe = wireframe; });
    });
  }, [wireframe]);

  useEffect(() => {
    let cancelled = false;
    let renderer: any;
    let scene: any;
    let frame = 0;
    let modelGroup: any;
    let controls: any;
    const mount = mountRef.current;
    if (!mount) return;

    const load = async () => {
      try {
        const THREE = await import("three");
        const { OrbitControls } = await import("three/examples/jsm/controls/OrbitControls.js");
        const ext = extensionOf(name);
        const response = await fetch(url);
        if (!response.ok) throw new Error(`Unable to load model (${response.status})`);
        const buffer = await response.arrayBuffer();
        if (cancelled) return;

        renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        renderer.setSize(mount.clientWidth || 800, mount.clientHeight || 600);
        renderer.outputColorSpace = THREE.SRGBColorSpace;
        mount.appendChild(renderer.domElement);
        scene = new THREE.Scene();
        scene.background = new THREE.Color("#0d1417");
        scene.add(new THREE.HemisphereLight("#ffffff", "#30434c", 2.5));
        const key = new THREE.DirectionalLight("#ffffff", 3.2);
        key.position.set(80, 120, 160);
        scene.add(key);
        const fill = new THREE.DirectionalLight("#74d3e8", 1.6);
        fill.position.set(-100, 40, -80);
        scene.add(fill);
        modelGroup = new THREE.Group();
        scene.add(modelGroup);

        if (ext === "kicad_pcb") {
          const model = parseKicadPcb(new TextDecoder().decode(buffer));
          modelGroup.add(buildPcb(THREE, model));
          setStatus(`${model.pads.length} pads · ${model.tracks.length} tracks · orbit to inspect`);
        } else if (ext === "stl") {
          const { STLLoader } = await import("three/examples/jsm/loaders/STLLoader.js");
          const geometry = new STLLoader().parse(buffer);
          geometry.computeVertexNormals();
          modelGroup.add(new THREE.Mesh(geometry, new THREE.MeshStandardMaterial({ color: "#8fb9c8", metalness: .28, roughness: .34 })));
          setStatus("STL model · orbit to inspect");
        } else if (["step", "stp"].includes(ext)) {
          const occtModule: any = await import("occt-import-js");
          const factory = occtModule.default || occtModule;
          const occt = await factory({ locateFile: (file: string) => `/occt/${file}` });
          const result = occt.ReadStepFile(new Uint8Array(buffer), null);
          if (!result.success) throw new Error("Could not tessellate this STEP file.");
          result.meshes?.forEach((mesh: any) => modelGroup.add(createMeshFromOcct(THREE, mesh)));
          setStatus(`${result.meshes?.length || 0} STEP solids · orbit to inspect`);
        } else {
          throw new Error("This 3D format is not supported yet. Use STL, STEP, or KiCad PCB.");
        }

        if (cancelled) return;
        const box = new THREE.Box3().setFromObject(modelGroup);
        const center = box.getCenter(new THREE.Vector3());
        const size = box.getSize(new THREE.Vector3());
        const maxSize = Math.max(size.x, size.y, size.z) || 1;
        modelGroup.position.sub(center);
        // CAD and KiCad data are Z-up; put a reference grid just under the part.
        const grid = new THREE.GridHelper(maxSize * 3, 24, "#2c4952", "#17282d");
        grid.rotation.x = Math.PI / 2;
        grid.position.z = -size.z / 2 - maxSize * .02;
        scene.add(grid);
        const camera = new THREE.PerspectiveCamera(42, mount.clientWidth / mount.clientHeight, maxSize / 1000, maxSize * 100);
        camera.up.set(0, 0, 1);
        camera.position.set(maxSize * 1.2, -maxSize * 1.5, maxSize * 1.1);
        controls = new OrbitControls(camera, renderer.domElement);
        controls.enableDamping = true;
        controls.target.set(0, 0, 0);
        controls.minDistance = maxSize * .35;
        controls.maxDistance = maxSize * 12;
        controls.update();
        modelRef.current = modelGroup;
        const home = camera.position.clone();
        resetRef.current = () => {
          camera.position.copy(home);
          controls.target.set(0, 0, 0);
          controls.update();
        };
        const resize = () => {
          if (!renderer || !mount) return;
          const width = mount.clientWidth || 800;
          const height = mount.clientHeight || 600;
          renderer.setSize(width, height, false);
          camera.aspect = width / height;
          camera.updateProjectionMatrix();
        };
        const observer = new ResizeObserver(resize);
        observer.observe(mount);
        const animate = () => {
          if (cancelled) return;
          controls?.update();
          renderer.render(scene, camera);
          frame = requestAnimationFrame(animate);
        };
        animate();
        return () => observer.disconnect();
      } catch (reason) {
        const message = reason instanceof Error ? reason.message : "Unable to render this 3D attachment.";
        if (!cancelled) { setStatus(message); onError?.(message); }
      }
    };
    let cleanup: (() => void) | undefined;
    load().then((result) => {
      if (cancelled) result?.();
      else cleanup = result;
    });
    return () => {
      cancelled = true;
      cancelAnimationFrame(frame);
      cleanup?.();
      modelRef.current = null;
      resetRef.current = null;
      controls?.dispose?.();
      disposeObject(modelGroup);
      renderer?.dispose?.();
      renderer?.domElement?.remove();
    };
  }, [url, name, onError]);

  return (
    <div className="dl-cad-viewer">
      <div className="dl-cad-stage" ref={mountRef} />
      <div className="dl-cad-status">{status}</div>
      <div className="dl-cad-help"><span>Drag to orbit</span><span>Scroll to zoom</span><button type="button" onClick={() => resetRef.current?.()}>Reset</button><button type="button" onClick={() => setWireframe((value) => !value)}>{wireframe ? "Solid" : "Wireframe"}</button></div>
    </div>
  );
}
