import { useEffect, useRef } from "react";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";

export default function Computer3D() {
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const computerRef = useRef<THREE.Group | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const container = containerRef.current;
    const scene = new THREE.Scene();
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(75, 60 / 60, 0.1, 10000);
    // camera.position.set(0, 4.5, 3);
    camera.position.set(0, 4, 3);
    camera.lookAt(0, 0, -1.5);

    const hemiLight = new THREE.HemisphereLight();
    scene.add(hemiLight);

    const renderer = new THREE.WebGLRenderer();
    renderer.setSize(60, 60);
    renderer.setClearColor(0x000000, 0);
    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    const loader = new GLTFLoader();
    loader.load(
      // "/models/retro-computer/computer.glb",
      "/models/retro-computer/computer.glb",
      (gltf) => {
        computerRef.current = gltf.scene;
        computerRef.current.scale.set(1, 1, 1);
        scene.add(gltf.scene);
      },
      (xhr) => {
        console.log((xhr.loaded / xhr.total) * 100 + "% loaded");
      },
      (error) => {
        console.error("An error happened", error);
      }
    );

    function animate() {
      animationFrameRef.current = requestAnimationFrame(animate);
      if (computerRef.current) {
        computerRef.current.rotation.y += 0.005;
      }
      renderer.render(scene, camera);
    }
    animate();

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (rendererRef.current && container.contains(rendererRef.current.domElement)) {
        container.removeChild(rendererRef.current.domElement);
      }
      rendererRef.current?.dispose();
    };
  }, []);

  return <div ref={containerRef} className="w-15 h-15 pl-2"></div>;
}

