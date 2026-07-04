import { useEffect, useRef } from 'react';
import { Scene, Clock, Color, Vector3 } from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { createPerspectiveCamera } from '../project/cherry-tree/utils/camera';
import createRenderer from '../project/cherry-tree/utils/renderer';
import { setupLights } from '../project/cherry-tree/utils/light';
import { setupGround } from '../project/cherry-tree/utils/ground';
import { createModelManager } from '../project/cherry-tree/model';

export default function CherryTree3D() {
  const containerRef = useRef<HTMLDivElement>(null);
  const animationFrameRef = useRef<number | null>(null);
  const clockRef = useRef<Clock | null>(null);
  const sceneRef = useRef<Scene | null>(null);
  const rendererRef = useRef<any>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const modelManagerRef = useRef<any>(null);
  const petalsRef = useRef<any[]>([]);
  const petalSpeedsRef = useRef<any[]>([]);

  useEffect(() => {
    if (!containerRef.current) return;

    const container = containerRef.current;

    // 씬 초기화
    const scene = new Scene();
    scene.background = new Color('#ffffff');
    sceneRef.current = scene;

    // 카메라 초기화
    const camera = createPerspectiveCamera();

    // 렌더러 초기화
    const canvas = document.createElement('canvas');
    canvas.style.width = '100%';
    canvas.style.height = '100%';
    container.appendChild(canvas);
    const renderer = createRenderer(canvas);
    rendererRef.current = renderer;

    // 컨트롤 초기화
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.target.set(0, 3, 0);
    controls.enableDamping = true;
    controls.dampingFactor = 0.25;
    controls.enableZoom = true;
    controls.enablePan = true;
    controls.enableRotate = true;
    controls.update();
    controlsRef.current = controls;

    // 지면과 조명 설정
    setupGround(scene);
    setupLights(scene);

    // 클락 초기화
    const clock = new Clock();
    clockRef.current = clock;

    // 모델 매니저 생성
    const modelManager = createModelManager(scene);
    modelManagerRef.current = modelManager;

    // 꽃잎 설정
    const petalCenter = new Vector3(0, 2, 0);
    const petalSpread = { x: 2, y: 1, z: 2 };

    // 모델 로드
    const loadModels = async () => {
      try {
        // 벚꽃 나무 로드
        await modelManager.loadTree();
        console.log('✓ 벚꽃 나무가 씬에 추가되었습니다.');

        // 꽃잎 로드
        const petalData = await modelManager.loadPetals({
          modelUrl: '/project-cherry-tree/assets/blossom/petal1.glb',
          count: 200,
          centerPosition: petalCenter,
          spreadRange: petalSpread,
          scale: 0.1,
          speedRange: 0.01,
        });
        petalsRef.current = petalData.models;
        petalSpeedsRef.current = petalData.speeds;
        console.log('✓ 꽃잎이 씬에 추가되었습니다.');
      } catch (error) {
        console.error('모델 로드 실패:', error);
      }
    };

    loadModels();

    // 리사이즈 핸들러
    const handleResize = () => {
      if (!containerRef.current) return;
      const width = containerRef.current.clientWidth;
      const height = containerRef.current.clientHeight;
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height);
    };

    window.addEventListener('resize', handleResize);
    handleResize(); // 초기 사이즈 설정

    // 애니메이션 루프
    const animate = () => {
      animationFrameRef.current = requestAnimationFrame(animate);

      if (!clockRef.current || !modelManagerRef.current) return;

      const deltaTime = clockRef.current.getDelta();
      const elapsedTime = clockRef.current.getElapsedTime();

      controls.update();

      // 애니메이션 업데이트
      modelManagerRef.current.updateAnimations(deltaTime);

      // 바람 애니메이션 업데이트
      modelManagerRef.current.updateTreeWind(elapsedTime);

      // 꽃잎 애니메이션 업데이트
      if (petalsRef.current.length > 0) {
        modelManagerRef.current.updatePetals(
          petalsRef.current,
          petalSpeedsRef.current,
          elapsedTime,
          {
            min: new Vector3(
              petalCenter.x - petalSpread.x,
              0,
              petalCenter.z - petalSpread.z
            ),
            max: new Vector3(
              petalCenter.x + petalSpread.x,
              petalCenter.y + petalSpread.y + 2,
              petalCenter.z + petalSpread.z
            ),
          }
        );
      }

      renderer.render(scene, camera);
    };

    animate();

    // 정리 함수
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      window.removeEventListener('resize', handleResize);
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
    />
  );
}


