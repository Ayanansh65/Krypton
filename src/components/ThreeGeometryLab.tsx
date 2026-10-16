import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { Box, Layers, RotateCw, Eye, Sparkles, CheckCircle2, Sliders, Maximize2 } from 'lucide-react';
import { verifyEulerCharacteristic } from '../utils/selfChecking.ts';
import { holoAudio } from '../utils/audioFeedback.ts';

type ShapeType = 'CUBE' | 'TETRAHEDRON' | 'OCTAHEDRON' | 'ICOSAHEDRON' | 'DODECAHEDRON' | 'CYLINDER' | 'SPHERE' | 'TORUS';

interface ShapeTopology {
  name: string;
  vertices: number;
  edges: number;
  faces: number;
  formulaVolume: string;
  formulaSurface: string;
  description: string;
}

const TOPOLOGY_MAP: Record<ShapeType, ShapeTopology> = {
  CUBE: {
    name: 'Regular Hexahedron (Cube)',
    vertices: 8,
    edges: 12,
    faces: 6,
    formulaVolume: 'V = s³',
    formulaSurface: 'A = 6s²',
    description: 'Platonic solid with square faces and orthogonal coordinate frame.',
  },
  TETRAHEDRON: {
    name: 'Regular Tetrahedron',
    vertices: 4,
    edges: 6,
    faces: 4,
    formulaVolume: 'V = s³ / (6√2)',
    formulaSurface: 'A = √3 s²',
    description: 'Minimal 3D simplex bounded by 4 equilateral triangles.',
  },
  OCTAHEDRON: {
    name: 'Regular Octahedron',
    vertices: 6,
    edges: 12,
    faces: 8,
    formulaVolume: 'V = (√2 / 3) s³',
    formulaSurface: 'A = 2√3 s²',
    description: 'Dual of the cube, bounded by 8 equilateral triangles.',
  },
  ICOSAHEDRON: {
    name: 'Regular Icosahedron',
    vertices: 12,
    edges: 30,
    faces: 20,
    formulaVolume: 'V = (5/12)(3 + √5) s³',
    formulaSurface: 'A = 5√3 s²',
    description: 'Platonic solid with 20 triangular faces possessing icosahedral symmetry.',
  },
  DODECAHEDRON: {
    name: 'Regular Dodecahedron',
    vertices: 20,
    edges: 30,
    faces: 12,
    formulaVolume: 'V = (15 + 7√5)/4 s³',
    formulaSurface: 'A = 3√(25 + 10√5) s²',
    description: 'Platonic solid with 12 regular pentagonal faces.',
  },
  CYLINDER: {
    name: 'Right Circular Cylinder',
    vertices: 0,
    edges: 2,
    faces: 3,
    formulaVolume: 'V = π r² h',
    formulaSurface: 'A = 2πr(r + h)',
    description: 'Ruled quadric surface with flat circular bases.',
  },
  SPHERE: {
    name: 'Spherical Manifold',
    vertices: 0,
    edges: 0,
    faces: 1,
    formulaVolume: 'V = (4/3) π r³',
    formulaSurface: 'A = 4 π r²',
    description: 'Constant positive Gaussian curvature manifold.',
  },
  TORUS: {
    name: 'Toroidal Surface (Genus 1)',
    vertices: 0,
    edges: 0,
    faces: 1,
    formulaVolume: 'V = 2π² R r²',
    formulaSurface: 'A = 4π² R r',
    description: 'Genus-1 manifold with Euler characteristic χ = 0.',
  },
};

export const ThreeGeometryLab: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [selectedShape, setSelectedShape] = useState<ShapeType>('CUBE');
  const [isRotating, setIsRotating] = useState(true);
  const [wireframeGlow, setWireframeGlow] = useState(true);
  const [sliceZ, setSliceZ] = useState(0);
  const [sliceActive, setSliceActive] = useState(false);
  const [scale, setScale] = useState(1);

  // Mesh and scene refs
  const sceneRef = useRef<THREE.Scene | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const meshGroupRef = useRef<THREE.Group | null>(null);
  const slicePlaneRef = useRef<THREE.Mesh | null>(null);
  const animFrameId = useRef<number | null>(null);

  const topology = TOPOLOGY_MAP[selectedShape];
  const eulerCheck = verifyEulerCharacteristic(topology.vertices, topology.edges, topology.faces);

  useEffect(() => {
    if (!containerRef.current) return;
    const width = containerRef.current.clientWidth || 500;
    const height = containerRef.current.clientHeight || 400;

    // Detect headless software rendering
    const isHeadless =
      typeof navigator !== 'undefined' &&
      (navigator.webdriver || /HeadlessChrome/i.test(navigator.userAgent));

    const scene = new THREE.Scene();
    sceneRef.current = scene;
    scene.background = new THREE.Color(0x030712);

    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
    camera.position.set(0, 2, 5);
    camera.lookAt(0, 0, 0);

    const renderer = new THREE.WebGLRenderer({ antialias: !isHeadless, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(isHeadless ? 1 : Math.min(window.devicePixelRatio, 1.5));
    rendererRef.current = renderer;

    containerRef.current.replaceChildren(renderer.domElement);

    // Holographic Grid Ground
    const grid = new THREE.GridHelper(8, 16, 0x00f3ff, 0x0f293a);
    grid.position.y = -1.5;
    scene.add(grid);

    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
    scene.add(ambientLight);

    const cyanPointLight = new THREE.PointLight(0x00f3ff, 2.5, 15);
    cyanPointLight.position.set(3, 4, 3);
    scene.add(cyanPointLight);

    const magentaPointLight = new THREE.PointLight(0xff0080, 1.8, 15);
    magentaPointLight.position.set(-3, -2, -3);
    scene.add(magentaPointLight);

    // Group for shape
    const group = new THREE.Group();
    meshGroupRef.current = group;
    scene.add(group);

    // Slicing Plane visualizer
    const planeGeo = new THREE.PlaneGeometry(3.5, 3.5);
    const planeMat = new THREE.MeshBasicMaterial({
      color: 0x00ff9d,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.25,
      wireframe: false,
    });
    const slicePlane = new THREE.Mesh(planeGeo, planeMat);
    slicePlane.rotation.x = Math.PI / 2;
    slicePlane.position.y = sliceZ;
    slicePlane.visible = sliceActive;
    slicePlaneRef.current = slicePlane;
    scene.add(slicePlane);

    // Render loop
    let lastTime = 0;
    const targetFps = isHeadless ? 15 : 60;
    const frameInterval = 1000 / targetFps;

    const animate = (currentTime: number) => {
      animFrameId.current = requestAnimationFrame(animate);

      const delta = currentTime - lastTime;
      if (delta < frameInterval) return;
      lastTime = currentTime - (delta % frameInterval);

      if (group && isRotating) {
        group.rotation.y += 0.008;
        group.rotation.x += 0.004;
      }

      renderer.render(scene, camera);
    };

    animFrameId.current = requestAnimationFrame(animate);

    const handleResize = () => {
      if (!containerRef.current || !renderer) return;
      const w = containerRef.current.clientWidth;
      const h = containerRef.current.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      if (animFrameId.current) cancelAnimationFrame(animFrameId.current);
      renderer.dispose();
    };
  }, []);

  // Update Geometry when selectedShape or wireframe change
  useEffect(() => {
    if (!meshGroupRef.current) return;
    const group = meshGroupRef.current;

    // Clear old children
    while (group.children.length > 0) {
      const obj = group.children[0];
      group.remove(obj);
      if ((obj as any).geometry) (obj as any).geometry.dispose();
      if ((obj as any).material) {
        if (Array.isArray((obj as any).material)) {
          (obj as any).material.forEach((m: any) => m.dispose());
        } else {
          (obj as any).material.dispose();
        }
      }
    }

    let geometry: THREE.BufferGeometry;
    switch (selectedShape) {
      case 'TETRAHEDRON':
        geometry = new THREE.TetrahedronGeometry(1.4);
        break;
      case 'OCTAHEDRON':
        geometry = new THREE.OctahedronGeometry(1.4);
        break;
      case 'ICOSAHEDRON':
        geometry = new THREE.IcosahedronGeometry(1.4);
        break;
      case 'DODECAHEDRON':
        geometry = new THREE.DodecahedronGeometry(1.4);
        break;
      case 'CYLINDER':
        geometry = new THREE.CylinderGeometry(0.9, 0.9, 2, 24);
        break;
      case 'SPHERE':
        geometry = new THREE.SphereGeometry(1.2, 24, 24);
        break;
      case 'TORUS':
        geometry = new THREE.TorusGeometry(1.1, 0.35, 16, 32);
        break;
      case 'CUBE':
      default:
        geometry = new THREE.BoxGeometry(1.8, 1.8, 1.8);
        break;
    }

    // Holographic Translucent Solid
    const faceMaterial = new THREE.MeshPhongMaterial({
      color: 0x00f3ff,
      transparent: true,
      opacity: 0.35,
      shininess: 90,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    const solidMesh = new THREE.Mesh(geometry, faceMaterial);
    group.add(solidMesh);

    // Glowing Neon Wireframe
    if (wireframeGlow) {
      const wireframeGeo = new THREE.WireframeGeometry(geometry);
      const wireframeMat = new THREE.LineBasicMaterial({
        color: 0x00ffff,
        linewidth: 2,
        transparent: true,
        opacity: 0.85,
      });
      const wireframeLines = new THREE.LineSegments(wireframeGeo, wireframeMat);
      group.add(wireframeLines);
    }

    group.scale.set(scale, scale, scale);
  }, [selectedShape, wireframeGlow, scale]);

  // Update slicing plane
  useEffect(() => {
    if (slicePlaneRef.current) {
      slicePlaneRef.current.visible = sliceActive;
      slicePlaneRef.current.position.y = sliceZ;
    }
  }, [sliceActive, sliceZ]);

  return (
    <div className="flex h-full flex-col lg:flex-row gap-4 bg-slate-950/70 p-4 rounded-xl border border-cyan-500/30 backdrop-blur-md">
      {/* 3D WebGL Canvas Viewport */}
      <div className="relative flex-1 rounded-xl border border-cyan-500/40 bg-slate-950 overflow-hidden min-h-[380px] flex items-center justify-center">
        <div ref={containerRef} className="w-full h-full" />

        {/* Viewport Floating HUD Badges */}
        <div className="absolute top-3 left-3 flex flex-col gap-1 pointer-events-none">
          <div className="flex items-center gap-2 rounded bg-slate-950/80 px-2.5 py-1 text-xs font-hud text-cyan-300 border border-cyan-500/30 backdrop-blur-md">
            <Box className="h-3.5 w-3.5 text-cyan-400" />
            <span>3D GEOMETRY LAB // {topology.name}</span>
          </div>
          <div className="rounded bg-slate-950/80 px-2 py-0.5 text-[10px] font-mono text-emerald-400 border border-emerald-500/30 backdrop-blur-md">
            GPU/WEBGL RENDERER · ACTIVE
          </div>
        </div>

        {/* Floating Quick Action Buttons */}
        <div className="absolute bottom-3 right-3 flex items-center gap-2">
          <button
            onClick={() => {
              holoAudio.playHoloClick();
              setIsRotating((r) => !r);
            }}
            className={`holo-depth-btn rounded-lg px-2.5 py-1.5 text-xs font-hud font-bold border flex items-center gap-1.5 backdrop-blur-md transition-all ${
              isRotating
                ? 'bg-cyan-500/20 border-cyan-400 text-cyan-300'
                : 'bg-slate-900/80 border-slate-700 text-slate-400'
            }`}
          >
            <RotateCw className={`h-3.5 w-3.5 ${isRotating ? 'animate-spin' : ''}`} />
            {isRotating ? 'Auto Orbit' : 'Paused'}
          </button>

          <button
            onClick={() => {
              holoAudio.playHoloClick();
              setWireframeGlow((g) => !g);
            }}
            className={`holo-depth-btn rounded-lg px-2.5 py-1.5 text-xs font-hud font-bold border flex items-center gap-1.5 backdrop-blur-md transition-all ${
              wireframeGlow
                ? 'bg-cyan-500/20 border-cyan-400 text-cyan-300'
                : 'bg-slate-900/80 border-slate-700 text-slate-400'
            }`}
          >
            <Sparkles className="h-3.5 w-3.5" />
            Neon Edges
          </button>
        </div>
      </div>

      {/* Inspector & Self-Checking Panel */}
      <div className="w-full lg:w-80 flex flex-col gap-3">
        {/* Shape Selector */}
        <div className="rounded-xl border border-cyan-500/30 bg-slate-900/80 p-3">
          <label className="text-xs font-hud font-bold text-cyan-300 mb-2 block flex items-center justify-between">
            <span>SELECT POLYHEDRON / SOLID</span>
            <span className="text-[10px] text-slate-400">8 Standards</span>
          </label>
          <div className="grid grid-cols-2 gap-1.5">
            {(Object.keys(TOPOLOGY_MAP) as ShapeType[]).map((shape) => (
              <button
                key={shape}
                onClick={() => {
                  holoAudio.playHoloClick();
                  setSelectedShape(shape);
                }}
                className={`holo-depth-btn py-1.5 px-2 rounded-lg text-left text-xs font-hud font-semibold transition-all border ${
                  selectedShape === shape
                    ? 'bg-cyan-500 text-slate-950 font-bold border-cyan-400 shadow-[0_0_10px_rgba(0,243,255,0.4)]'
                    : 'bg-slate-950/60 border-slate-800 text-slate-300 hover:border-cyan-500/30'
                }`}
              >
                {shape}
              </button>
            ))}
          </div>
        </div>

        {/* Topological Invariants & Euler Check */}
        <div className="rounded-xl border border-cyan-500/30 bg-slate-900/80 p-3">
          <div className="flex items-center justify-between border-b border-cyan-500/20 pb-2 mb-2">
            <span className="text-xs font-hud font-bold text-cyan-300">TOPOLOGICAL METRICS</span>
            {eulerCheck.passed && (
              <span className="flex items-center gap-1 text-[10px] font-mono text-emerald-400 bg-emerald-950/50 px-2 py-0.5 rounded border border-emerald-500/30">
                <CheckCircle2 className="h-3 w-3" /> EULER INVARIANT OK
              </span>
            )}
          </div>

          <div className="grid grid-cols-3 gap-2 text-center mb-3">
            <div className="rounded bg-slate-950/60 p-1.5 border border-cyan-500/20">
              <span className="text-[10px] text-slate-400 block">VERTICES (V)</span>
              <span className="text-base font-hud font-bold text-cyan-300">{topology.vertices}</span>
            </div>
            <div className="rounded bg-slate-950/60 p-1.5 border border-cyan-500/20">
              <span className="text-[10px] text-slate-400 block">EDGES (E)</span>
              <span className="text-base font-hud font-bold text-cyan-300">{topology.edges}</span>
            </div>
            <div className="rounded bg-slate-950/60 p-1.5 border border-cyan-500/20">
              <span className="text-[10px] text-slate-400 block">FACES (F)</span>
              <span className="text-base font-hud font-bold text-cyan-300">{topology.faces}</span>
            </div>
          </div>

          {topology.vertices > 0 && (
            <div className="rounded-lg bg-slate-950/80 p-2 border border-cyan-500/20 font-mono text-xs text-slate-300 mb-2">
              <div className="flex justify-between">
                <span>Euler Characteristic:</span>
                <span className="text-cyan-400 font-bold">V - E + F = 2</span>
              </div>
              <div className="text-[11px] text-slate-400 mt-0.5">
                {topology.vertices} - {topology.edges} + {topology.faces} = {topology.vertices - topology.edges + topology.faces}
              </div>
            </div>
          )}

          <div className="space-y-1 text-xs font-mono text-slate-300">
            <div className="flex justify-between">
              <span className="text-slate-400">Volume Formula:</span>
              <span className="text-emerald-400 font-bold">{topology.formulaVolume}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Surface Formula:</span>
              <span className="text-emerald-400 font-bold">{topology.formulaSurface}</span>
            </div>
          </div>
        </div>

        {/* Interactive Slicing Plane Tool */}
        <div className="rounded-xl border border-cyan-500/30 bg-slate-900/80 p-3">
          <div className="flex items-center justify-between mb-2">
            <label className="text-xs font-hud font-bold text-cyan-300 flex items-center gap-1.5">
              <Layers className="h-3.5 w-3.5 text-cyan-400" />
              CROSS-SECTION SLICING PLANE
            </label>
            <input
              type="checkbox"
              checked={sliceActive}
              onChange={(e) => {
                holoAudio.playHoloClick();
                setSliceActive(e.target.checked);
              }}
              className="rounded accent-cyan-400 cursor-pointer"
            />
          </div>

          {sliceActive && (
            <div className="space-y-2 mt-2">
              <div className="flex justify-between text-xs font-mono text-slate-400">
                <span>Z-Offset:</span>
                <span className="text-cyan-400">{sliceZ.toFixed(2)} units</span>
              </div>
              <input
                type="range"
                min="-1.5"
                max="1.5"
                step="0.05"
                value={sliceZ}
                onChange={(e) => setSliceZ(parseFloat(e.target.value))}
                className="w-full accent-cyan-400"
              />
            </div>
          )}
        </div>

        {/* Scale Slider */}
        <div className="rounded-xl border border-cyan-500/30 bg-slate-900/80 p-3">
          <div className="flex justify-between text-xs font-hud text-cyan-300 mb-1">
            <span>HOLOGRAM SCALE</span>
            <span className="font-mono">{scale.toFixed(1)}x</span>
          </div>
          <input
            type="range"
            min="0.5"
            max="1.8"
            step="0.1"
            value={scale}
            onChange={(e) => setScale(parseFloat(e.target.value))}
            className="w-full accent-cyan-400"
          />
        </div>
      </div>
    </div>
  );
};
