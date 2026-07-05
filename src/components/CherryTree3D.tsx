import { useEffect, useRef, useState } from 'react';
import { Scene, Clock, Color, Vector3, Mesh, ShaderMaterial, InstancedMesh, DynamicDrawUsage, InstancedBufferAttribute, Matrix4, Quaternion, Euler } from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { createPerspectiveCamera } from '../project/cherry-tree/utils/camera';
import createRenderer from '../project/cherry-tree/utils/renderer';
import { setupLights } from '../project/cherry-tree/utils/light';
import { setupGround } from '../project/cherry-tree/utils/ground';
import { createModelManager } from '../project/cherry-tree/model';
import gsap from 'gsap';

interface ScreenPetalState {
  position: Vector3;
  initialPos: Vector3;
  speed: { x: number; y: number; z: number };
  rotSpeed: { x: number; y: number; z: number };
  rotation: { x: number; y: number; z: number };
  scale: number;
  isStuck: boolean;
  stuckTime: number;
  slideSpeed: number;
  randomValue: number;
  isBlown: boolean;
  blownSpeed: { x: number; y: number; z: number };
  invDurationZ: number;
  needsMatrixUpdate: boolean;
  isActive: boolean;
  targetX: number;
  targetY: number;
}

// Local vertex shader supporting GPU Instancing for screen petals
const instancedPetalVertexShader = `
uniform float u_time;
attribute vec2 a_stuckInfo; // x = randomValue, y = isStuck (1.0 = stuck, 0.0 = flying)
varying vec2 vUv;
varying vec3 vNormal;
varying float vRandomValue;

void main() {
  vUv = uv;
  vRandomValue = a_stuckInfo.x;
  vNormal = normalize(normalMatrix * (mat3(instanceMatrix) * normal));
  
  vec3 pos = position;
  if (a_stuckInfo.y > 0.5) {
    // Flutter wiggling inside local space (GPU-accelerated) with intermittent pulses (shiver -> calm -> shiver)
    // Using (1.0 - cos) ensures the shiver starts going positive first and never dips below the resting position
    float shiver = (1.0 - cos(u_time * 50.0 + a_stuckInfo.x * 10.0)) * 0.04;
    float pulse = sin(u_time * 0.3 + a_stuckInfo.x * 40.0);
    float modulator = pow(max(0.0, pulse), 250.0); // High exponent for extremely short 0.5s twitch bursts
    float flutter = shiver * modulator;

    float c = cos(flutter);
    float s = sin(flutter);
    mat2 r = mat2(c, -s, s, c);
    pos.xy = r * pos.xy;
  }
  vec4 worldPosition = modelMatrix * instanceMatrix * vec4(pos, 1.0);
  gl_Position = projectionMatrix * viewMatrix * worldPosition;
}
`;

// Local fragment shader supporting 2-tone Ghibli cel-shading with warm colors
const instancedPetalFragmentShader = `
varying vec2 vUv;
varying vec3 vNormal;
varying float vRandomValue;

void main() {
  // Select base color based on user specified percentages:
  // #e6aec8 (20%), #eebed1 (65%), #e0a2c1 (15%)
  vec3 baseColor;
  if (vRandomValue < 0.20) {
    baseColor = vec3(0.902, 0.682, 0.784); // #e6aec8
  } else if (vRandomValue < 0.85) {
    baseColor = vec3(0.933, 0.745, 0.820); // #eebed1
  } else {
    baseColor = vec3(0.878, 0.635, 0.757); // #e0a2c1
  }

  // 1. Two-tone Ghibli-style colors
  vec3 brightColor = baseColor;
  vec3 shadowColor = baseColor * vec3(0.95, 0.91, 0.95); // darker shade for shadows

  // Stylized Ghibli outlines and translucent tip colors
  vec3 outlineColor = vec3(0.56, 0.28, 0.39);   // Warm dark maroon outline (#8f4763)
  vec3 translucentTip = vec3(1.0, 0.94, 0.96);  // Bright milky pink translucent edge (#fff0f5)

  // 2. Light vector (front-top-right)
  vec3 lightDir = normalize(vec3(0.3, 0.8, 0.6));
  vec3 normalVec = normalize(vNormal);
  
  if (!gl_FrontFacing) {
    normalVec = -normalVec;
  }

  // 3. Hard-cut toon shading — step() gives pixel-sharp cel animation boundary (no gradient)
  float intensity = dot(normalVec, lightDir);
  
  // Perfect binary cut at 0.25
  float toonFactor = step(0.25, intensity);
  
  vec3 finalColor = mix(shadowColor, brightColor, toonFactor);
  
  gl_FragColor = vec4(finalColor, 1.0);
}
`;

export default function CherryTree3D() {
  const canvasContainerRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const animationFrameRef = useRef<number | null>(null);
  const clockRef = useRef<Clock | null>(null);
  const sceneRef = useRef<Scene | null>(null);
  const rendererRef = useRef<any>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const modelManagerRef = useRef<any>(null);
  const petalsRef = useRef<any[]>([]);
  const petalSpeedsRef = useRef<any[]>([]);

  // Refs for Screen Petals (stretching on camera)
  const screenPetalsArrayRef = useRef<ScreenPetalState[]>([]);
  const screenInstancedMeshRef = useRef<InstancedMesh | null>(null);
  const screenMaterialRef = useRef<ShaderMaterial | null>(null);
  const screenStuckInfoArrayRef = useRef<Float32Array | null>(null);
  const screenStuckInfoAttributeRef = useRef<InstancedBufferAttribute | null>(null);
  const requestResetRef = useRef<boolean>(false);

  const mouseRef = useRef<{ x: number; y: number }>({ x: 999, y: 999 });
  const isMouseDownRef = useRef<boolean>(false);
  const limitXRef = useRef<number>(2.4);
  const limitYRef = useRef<number>(2.4);

  const glassZ = -3.5; // Sticking plane in front of the camera (distance = 3.5 along local -Z)
  const screenPetalCount = 1000;

  // Spawns screen petals at top-right only (random spawn radius widened 10x to create a loose cloud)
  const getSpawnX = (lx: number, randX: number) => lx * 8.5 + randX * 20.0;
  const getSpawnY = (ly: number, randY: number) => ly * 1.0 + randY * 10.0;

  const handleReset = () => {
    requestResetRef.current = true;
  };

  useEffect(() => {
    if (!canvasContainerRef.current) return;

    const container = canvasContainerRef.current;

    // 1. Initialize Scenes (scene for 3D world, overlayScene for screen-attached HUD)
    const scene = new Scene();
    scene.background = new Color('#ffffff');
    sceneRef.current = scene;

    const overlayScene = new Scene();

    // 2. Initialize Camera & Add to overlayScene (Required since camera has child nodes)
    const camera = createPerspectiveCamera();
    camera.far = 100;
    camera.updateProjectionMatrix();
    overlayScene.add(camera);

    // 3. Initialize Renderer
    const canvas = document.createElement('canvas');
    canvas.style.width = '100%';
    canvas.style.height = '100%';
    container.appendChild(canvas);
    const renderer = createRenderer(canvas);
    renderer.autoClear = false; // Disable automatic clearing to manually layer scenes
    rendererRef.current = renderer;

    // 4. Initialize OrbitControls pointing at default target
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.target.set(0, 3, 0); // Default target (tree center)
    controls.enableDamping = true;
    controls.dampingFactor = 0.25;
    controls.enableZoom = true;
    controls.enablePan = true;
    controls.enableRotate = true;
    controls.update();
    controlsRef.current = controls;

    // 5. Setup Ground and Lights
    setupGround(scene);
    setupLights(scene);

    const clock = new Clock();
    clockRef.current = clock;

    // 6. Setup Model Manager
    const modelManager = createModelManager(scene);
    modelManagerRef.current = modelManager;

    const petalCenter = new Vector3(0, 2, 0);
    const petalSpread = { x: 2, y: 1, z: 2 };

    // 7. Boundaries & Resize Handler
    let limitY = 2.4;
    let limitX = limitY * (container.clientWidth / container.clientHeight);
    limitXRef.current = limitX;
    limitYRef.current = limitY;

    const handleResize = () => {
      if (!canvasContainerRef.current) return;
      const width = canvasContainerRef.current.clientWidth;
      const height = canvasContainerRef.current.clientHeight;
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height);

      limitX = limitY * (width / height);
      limitXRef.current = limitX;
    };

    window.addEventListener('resize', handleResize);
    handleResize();

    // 8. Mouse Listeners
    const handleMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      const nx = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      const ny = -(((e.clientY - rect.top) / rect.height) * 2 - 1);
      mouseRef.current.x = nx * limitXRef.current;
      mouseRef.current.y = ny * limitYRef.current;
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (e.touches.length === 0) return;
      const t = e.touches[0];
      const rect = canvas.getBoundingClientRect();
      const nx = ((t.clientX - rect.left) / rect.width) * 2 - 1;
      const ny = -(((t.clientY - rect.top) / rect.height) * 2 - 1);
      mouseRef.current.x = nx * limitXRef.current;
      mouseRef.current.y = ny * limitYRef.current;
    };

    const handleMouseDown = () => { isMouseDownRef.current = true; };
    const handleMouseUp = () => { isMouseDownRef.current = false; };
    const handleMouseLeave = () => {
      mouseRef.current = { x: 999, y: 999 };
      isMouseDownRef.current = false;
    };

    canvas.addEventListener('mousemove', handleMouseMove);
    canvas.addEventListener('mousedown', handleMouseDown);
    canvas.addEventListener('mouseup', handleMouseUp);
    canvas.addEventListener('mouseleave', handleMouseLeave);
    canvas.addEventListener('touchmove', handleTouchMove);
    canvas.addEventListener('touchstart', handleMouseDown);
    canvas.addEventListener('touchend', handleMouseUp);
    canvas.addEventListener('touchcancel', handleMouseLeave);

    // 9. Load Screen Petals Geometry and Start
    let screenMeshLoaded = false;
    const gltfLoader = new GLTFLoader();
    gltfLoader.load(
      '/project-cherry-tree/assets/blossom/petal1.glb',
      (gltf) => {
        let baseMesh: Mesh | null = null;
        gltf.scene.traverse(obj => {
          if ((obj as Mesh).isMesh) {
            baseMesh = obj as Mesh;
          }
        });

        if (!baseMesh) return;

        const geometry = baseMesh.geometry.clone();
        const material = new ShaderMaterial({
          uniforms: {
            u_time: { value: 0.0 },
          },
          vertexShader: instancedPetalVertexShader,
          fragmentShader: instancedPetalFragmentShader,
          side: 2, // DoubleSide
        });
        screenMaterialRef.current = material;

        const cols = 40;
        const rows = 25;
        const colWidth = (2 * limitX) / cols;
        const rowHeight = (2 * limitY) / rows;
        const petals: ScreenPetalState[] = [];

        for (let i = 0; i < screenPetalCount; i++) {
          const randomValue = Math.random();
          const col = i % cols;
          const row = Math.floor(i / cols);
          const gridX = -limitX + col * colWidth + colWidth / 2;
          const gridY = -limitY + row * rowHeight + rowHeight / 2;

          // Warp grid points towards the center to increase density in the middle
          const d = Math.sqrt(gridX * gridX + gridY * gridY);
          const warpFactor = 0.35 * Math.exp(-d * 0.8);
          const finalGridX = gridX * (1.0 - warpFactor);
          const finalGridY = gridY * (1.0 - warpFactor);

          // Boost scale near the center gently (max 1.3x base scale)
          const centerFactor = Math.exp(-d * 0.6);
          const petalScale = 0.45 * (1.0 + centerFactor * 0.3);

          // Spawn far in the background (local -Z)
          const spawnZ = -15 - Math.random() * 2;
          const spawnX = getSpawnX(limitX, Math.random() - 0.5);
          const spawnY = getSpawnY(limitY, Math.random() - 0.5);
          const spawnPos = new Vector3(spawnX, spawnY, spawnZ);

          const speedZ = 0.04 + Math.random() * 0.03;
          const duration = (glassZ - spawnZ) / speedZ;
          const speedX = (finalGridX - spawnX) / duration;
          const speedY = (finalGridY - spawnY) / duration;
          const invDurationZ = 1.0 / (glassZ - spawnZ);

          petals.push({
            position: spawnPos.clone(),
            initialPos: spawnPos.clone(),
            speed: { x: speedX, y: speedY, z: speedZ },
            rotSpeed: {
              x: (Math.random() - 0.5) * 0.03,
              y: (Math.random() - 0.5) * 0.03,
              z: (Math.random() - 0.5) * 0.03,
            },
            rotation: {
              x: Math.random() * Math.PI,
              y: Math.random() * Math.PI,
              z: Math.random() * Math.PI,
            },
            scale: petalScale,
            isStuck: false,
            stuckTime: 0,
            slideSpeed: 0.003 + Math.random() * 0.005,
            randomValue,
            isBlown: false,
            blownSpeed: { x: 0, y: 0, z: 0 },
            invDurationZ,
            needsMatrixUpdate: true,
            isActive: true,
            targetX: finalGridX,
            targetY: finalGridY,
          });
        }

        screenPetalsArrayRef.current = petals;

        const stuckInfoArray = new Float32Array(screenPetalCount * 2);
        const stuckInfoAttribute = new InstancedBufferAttribute(stuckInfoArray, 2);
        stuckInfoAttribute.setUsage(DynamicDrawUsage);
        geometry.setAttribute('a_stuckInfo', stuckInfoAttribute);
        screenStuckInfoArrayRef.current = stuckInfoArray;
        screenStuckInfoAttributeRef.current = stuckInfoAttribute;

        const instancedMesh = new InstancedMesh(geometry, material, screenPetalCount);
        instancedMesh.instanceMatrix.setUsage(DynamicDrawUsage);
        instancedMesh.castShadow = true;
        instancedMesh.receiveShadow = true;
        instancedMesh.frustumCulled = false;

        // Add as child of camera so it moves/rotates seamlessly with camera controls!
        camera.add(instancedMesh);
        screenInstancedMeshRef.current = instancedMesh;
        screenMeshLoaded = true;

        console.log('✓ Screen petals loaded and added to camera.');

        // Trigger loading the background scene 2.5 seconds after screen petals spawn
        setTimeout(() => {
          loadBackgroundScene();
        }, 2500);
      }
    );

    // 10. Load Tree and Falling Petals (Deferred)
    const loadBackgroundScene = async () => {
      try {
        // 벚꽃 나무 로드
        const tree = await modelManager.loadTree();
        // Scale to 0.001 initially to animate it scaling up beautifully
        tree.scale.set(0.001, 0.001, 0.001);
        scene.add(tree);
        gsap.to(tree.scale, { x: 1, y: 1, z: 1, duration: 2.0, ease: 'power2.out' });
        console.log('✓ 벚꽃 나무 로드 완료 및 스케일 업 애니메이션 시작');

        // falling petals 로드 (1000 count)
        const petalData = await modelManager.loadPetals({
          modelUrl: '/project-cherry-tree/assets/blossom/petal1.glb',
          count: 1000,
          centerPosition: petalCenter,
          spreadRange: petalSpread,
          scale: 0.1,
          speedRange: 0.01,
        });

        petalsRef.current = petalData.models;
        petalSpeedsRef.current = petalData.speeds;

        if (petalData.models.length > 0) {
          const fallingMesh = petalData.models[0] as InstancedMesh;
          fallingMesh.scale.set(0.001, 0.001, 0.001);
          gsap.to(fallingMesh.scale, { x: 1, y: 1, z: 1, duration: 2.0, ease: 'power2.out' });
        }
        console.log('✓ 1000개의 벚꽃 잎 로드 완료 및 스케일 업 애니메이션 시작');
      } catch (error) {
        console.error('배경 모델 로드 실패:', error);
      }
    };

    // Matrix structures for update calculations
    const transformMatrix = new Matrix4();
    const positionVec = new Vector3();
    const rotationQuat = new Quaternion();
    const scaleVec = new Vector3();
    const rotationEuler = new Euler();

    // 11. Main Animation Loop
    const animate = () => {
      animationFrameRef.current = requestAnimationFrame(animate);

      if (!clockRef.current) return;

      const deltaTime = clock.getDelta();
      const elapsedTime = clock.getElapsedTime();

      controls.update();

      // Update background tree wind & animations
      if (modelManagerRef.current) {
        modelManagerRef.current.updateAnimations(deltaTime);
        modelManagerRef.current.updateTreeWind(elapsedTime);

        // Update falling petals
        if (petalsRef.current.length > 0) {
          modelManagerRef.current.updatePetals(
            petalsRef.current,
            petalSpeedsRef.current,
            elapsedTime,
            {
              min: new Vector3(petalCenter.x - petalSpread.x, 0, petalCenter.z - petalSpread.z),
              max: new Vector3(petalCenter.x + petalSpread.x, petalCenter.y + petalSpread.y + 0.5, petalCenter.z + petalSpread.z),
            }
          );
        }
      }

      // Update Screen Petals (linked to camera)
      if (screenMeshLoaded && screenInstancedMeshRef.current && screenPetalsArrayRef.current.length > 0) {
        const instancedMesh = screenInstancedMeshRef.current;
        const material = screenMaterialRef.current;
        if (material) {
          material.uniforms.u_time.value = elapsedTime;
        }

        let attributeChanged = false;
        const stuckInfoArray = screenStuckInfoArrayRef.current;
        const stuckInfoAttribute = screenStuckInfoAttributeRef.current;
        const mx = mouseRef.current.x;
        const my = mouseRef.current.y;
        const isMouseDown = isMouseDownRef.current;

        // UI Reset request handler
        if (requestResetRef.current) {
          requestResetRef.current = false;
          screenPetalsArrayRef.current.forEach((p, idx) => {
            // Keep existing stuck petals in place, only refilling empty/blown away spots!
            if (p.isActive && p.isStuck && !p.isBlown) {
              return;
            }

            p.isActive = true;
            p.isStuck = false;
            p.isBlown = false;
            p.needsMatrixUpdate = true;

            const cols = 40;
            const col = idx % cols;
            const row = Math.floor(idx / cols);
            const colWidth = (2 * limitX) / cols;
            const rowHeight = (2 * limitY) / 25;
            const gridX = -limitX + col * colWidth + colWidth / 2;
            const gridY = -limitY + row * rowHeight + rowHeight / 2;
            const d = Math.sqrt(gridX * gridX + gridY * gridY);
            const warpFactor = 0.35 * Math.exp(-d * 0.8);
            const finalGridX = gridX * (1.0 - warpFactor);
            const finalGridY = gridY * (1.0 - warpFactor);

            const centerFactor = Math.exp(-d * 0.6);
            const petalScale = 0.45 * (1.0 + centerFactor * 0.3);

            p.scale = petalScale;
            p.targetX = finalGridX;
            p.targetY = finalGridY;

            const spawnZ = -15 - Math.random() * 2;
            const spawnX = getSpawnX(limitX, Math.random() - 0.5);
            const spawnY = getSpawnY(limitY, Math.random() - 0.5);

            p.position.set(spawnX, spawnY, spawnZ);
            p.initialPos.set(spawnX, spawnY, spawnZ);

            const speedZ = 0.04 + Math.random() * 0.03;
            const duration = (glassZ - spawnZ) / speedZ;

            p.speed.x = (finalGridX - spawnX) / duration;
            p.speed.y = (finalGridY - spawnY) / duration;
            p.speed.z = speedZ;
            p.invDurationZ = 1.0 / (glassZ - spawnZ);

            p.rotation.x = Math.random() * Math.PI;
            p.rotation.y = Math.random() * Math.PI;
            p.rotation.z = Math.random() * Math.PI;

            if (stuckInfoArray) {
              stuckInfoArray[idx * 2] = p.randomValue;
              stuckInfoArray[idx * 2 + 1] = 0.0;
              attributeChanged = true;
            }
          });
        }

        const screenLen = screenPetalsArrayRef.current.length;
        const checkMouse = mx < 100.0; // mx is 999 when mouse is out of screen
        for (let idx = 0; idx < screenLen; idx++) {
          const p = screenPetalsArrayRef.current[idx];

          if (!p.isActive) {
            if (p.needsMatrixUpdate) {
              positionVec.set(0, 0, -999);
              scaleVec.setScalar(0.0);
              transformMatrix.compose(positionVec, rotationQuat, scaleVec);
              instancedMesh.setMatrixAt(idx, transformMatrix);
              p.needsMatrixUpdate = false;
            }
            continue;
          }

          if (p.isBlown) {
            p.position.x += p.blownSpeed.x * deltaTime;
            p.position.y += p.blownSpeed.y * deltaTime;
            p.position.z += p.blownSpeed.z * deltaTime;

            p.rotation.x += p.rotSpeed.x * 2.0;
            p.rotation.y += p.rotSpeed.y * 2.0;
            p.rotation.z += p.rotSpeed.z * 2.0;

            p.needsMatrixUpdate = true;

            // Depth ratios relative to Z=0 camera and Z=-3.5 glass
            const depthRatio = (0.0 - p.position.z) / 3.5;
            const currentLimitX = limitX * depthRatio;
            const currentLimitY = limitY * depthRatio;

            if (p.position.x < -currentLimitX - 1.5 || p.position.z < -30.0 || p.position.y < -currentLimitY - 1.5) {
              p.isBlown = false;
              p.isStuck = false;
              p.isActive = false; // Disable respawning
              p.needsMatrixUpdate = true;
              p.position.set(0, 0, -999);

              if (stuckInfoArray) {
                stuckInfoArray[idx * 2] = p.randomValue;
                stuckInfoArray[idx * 2 + 1] = 0.0;
                attributeChanged = true;
              }
            }
          } else if (p.isStuck) {
            p.position.z = glassZ + p.randomValue * 0.05;

            // Only calculate mouse hover if the mouse is actively inside the canvas viewport
            if (checkMouse) {
              const dx = p.position.x - mx;
              const dy = p.position.y - my;
              const distSq = dx * dx + dy * dy;

              const forceRadius = isMouseDown ? 1.4 : 0.85;
              const radiusSq = forceRadius * forceRadius;

              if (distSq < radiusSq) {
                p.isBlown = true;
                p.isStuck = false;
                p.needsMatrixUpdate = true;

                const dist = Math.sqrt(distSq);
                const force = (forceRadius - dist) / forceRadius;

                // Blow away leftwards (camera negative local X)
                p.blownSpeed.x = -24 - force * 30 - Math.random() * 10;
                p.blownSpeed.y = (dy * 6.0) + (Math.random() - 0.5) * 5.0;
                p.blownSpeed.z = -15 - force * 15;

                if (stuckInfoArray) {
                  stuckInfoArray[idx * 2 + 1] = 0.0;
                  attributeChanged = true;
                }
              }
            }
          } else {
            // Free flight from deep background (-15.0) towards glass plane (-3.5)
            const t = Math.min(1.0, Math.max(0.0, (p.position.z - p.initialPos.z) * p.invDurationZ));

            p.position.z += p.speed.z;
            p.position.x += p.speed.x;
            p.position.y += p.speed.y;

            p.rotation.x += p.rotSpeed.x * (1 - t);
            p.rotation.y += p.rotSpeed.y * (1 - t);
            p.rotation.z += p.rotSpeed.z * (1 - t * 0.8);

            p.needsMatrixUpdate = true;

            // Stick to screen
            if (p.position.z >= glassZ) {
              const cols = 40;
              const col = idx % cols;
              const row = Math.floor(idx / cols);
              const colWidth = (2 * limitX) / cols;
              const rowHeight = (2 * limitY) / 25;
              const gridX = -limitX + col * colWidth + colWidth / 2;
              const gridY = -limitY + row * rowHeight + rowHeight / 2;

              p.position.z = glassZ + p.randomValue * 0.05;
              p.position.x = p.targetX;
              p.position.y = p.targetY;
              p.initialPos.copy(p.position);
              p.rotation.x = 0;
              p.rotation.y = Math.PI / 2;
              p.rotation.z = (Math.random() > 0.5 ? 0 : Math.PI) + Math.PI / 2 + (Math.random() - 0.5) * 0.4;
              p.isStuck = true;
              p.stuckTime = elapsedTime;

              if (stuckInfoArray) {
                stuckInfoArray[idx * 2] = p.randomValue;
                stuckInfoArray[idx * 2 + 1] = 1.0;
                attributeChanged = true;
              }
            }
          }

          if (p.needsMatrixUpdate) {
            positionVec.copy(p.position);

            let rx = p.rotation.x;
            let ry = p.rotation.y;
            let rz = p.rotation.z;

            if (!p.isBlown && !p.isStuck) {
              const t = Math.min(1.0, Math.max(0.0, (p.position.z - p.initialPos.z) * p.invDurationZ));
              rx = p.rotation.x * (1 - t);
              ry = p.rotation.y * (1 - t) + (Math.PI / 2) * t;

              const swayFreq = 12.0 + p.randomValue * 8.0;
              const swayAmp = 0.5 * (1.0 - t);
              positionVec.x += Math.sin(elapsedTime * swayFreq) * swayAmp;
              positionVec.y += Math.cos(elapsedTime * swayFreq * 0.7) * (swayAmp * 0.6);
            }

            rotationEuler.set(rx, ry, rz, 'XYZ');
            rotationQuat.setFromEuler(rotationEuler);
            scaleVec.setScalar(p.scale);
            transformMatrix.compose(positionVec, rotationQuat, scaleVec);

            instancedMesh.setMatrixAt(idx, transformMatrix);

            if (p.isStuck) {
              p.needsMatrixUpdate = false;
            }
          }
        }

        if (attributeChanged && stuckInfoAttribute) {
          stuckInfoAttribute.needsUpdate = true;
        }
        instancedMesh.instanceMatrix.needsUpdate = true;
      }

      renderer.clear();
      renderer.render(scene, camera); // Render the 3D world in the background
      renderer.clearDepth();          // Clear depth buffer to force overlay scene on top
      renderer.render(overlayScene, camera); // Render screen-space overlay petals last
    };

    animate();

    // 12. Cleanup
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      window.removeEventListener('resize', handleResize);
      canvas.removeEventListener('mousemove', handleMouseMove);
      canvas.removeEventListener('mousedown', handleMouseDown);
      canvas.removeEventListener('mouseup', handleMouseUp);
      canvas.removeEventListener('mouseleave', handleMouseLeave);
      canvas.removeEventListener('touchmove', handleTouchMove);
      canvas.removeEventListener('touchstart', handleMouseDown);
      canvas.removeEventListener('touchend', handleMouseUp);
      canvas.removeEventListener('touchcancel', handleMouseLeave);

      if (controlsRef.current) {
        controlsRef.current.dispose();
      }
      if (rendererRef.current) {
        rendererRef.current.dispose();
      }
      if (container.contains(canvas)) {
        container.removeChild(canvas);
      }
    };
  }, []);

  return (
    <div
      ref={containerRef}
      style={{
        width: '100%',
        height: '600px',
        position: 'relative',
      }}
    >
      <div ref={canvasContainerRef} style={{ width: '100%', height: '100%' }} />
      {/* Refill Button Overlay */}
      <button
        onClick={handleReset}
        className="absolute bottom-4 right-4 z-50 px-4 py-2 bg-white/80 dark:bg-slate-900/80 hover:bg-white dark:hover:bg-slate-900 text-slate-800 dark:text-slate-100 text-xs font-semibold rounded-lg shadow border border-slate-200/50 dark:border-slate-800/50 backdrop-blur-sm cursor-pointer transition active:scale-95 select-none"
      >
        🌸 Refill Screen Petals
      </button>
    </div>
  );
}
