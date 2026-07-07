import { Scene, Clock, Color, Vector3 } from 'three';
import './style.css';
import { createPerspectiveCamera } from './utils/camera';
import createRenderer from './utils/renderer';
import { setupLights } from './utils/light';
import { setupGround } from './utils/ground';
// import addSky from './utils/sky';
import { createModelManager } from './model';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

document.querySelector<HTMLDivElement>('#app')!.innerHTML = `
  <div id="container">
    <canvas id="three-canvas"></canvas>
  </div>
`;

export async function main() {
  const canvas = document.querySelector<HTMLCanvasElement>('#three-canvas')!;
  const scene = new Scene();
  scene.background = new Color('#ffffff'); // 헥스코드도 가능

  const camera = createPerspectiveCamera();
  // const camera = createOrthographicCamera();
  const renderer = createRenderer(canvas);

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.target.set(0, 2.612, 0); // 카메라가 바라볼 지점 설정 (벚꽃 나무 중심)
  controls.enableZoom = true;
  controls.enablePan = true;
  controls.enableRotate = true;
  controls.update(); // target 변경 적용

  // addSky(scene);

  setupGround(scene);

  setupLights(scene);

  // 윈도우 리사이즈 처리
  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });

  // 모델 매니저 생성
  const modelManager = createModelManager(scene);
  const clock = new Clock();

  // 벚꽃 나무 추가
  try {
    const tree = await modelManager.loadTree();
    tree.position.set(0.993, 0, 0); // Shift by +0.993 in X to center the foliage at X=0
    console.log('✓ 벚꽃 나무가 씬에 추가되었습니다.');
  } catch (error) {
    console.error('모델 로드 실패:', error);
  }

  // 꽃잎 추가
  let petals: any[] = [];
  let petalSpeeds: any[] = [];
  const petalCenter = new Vector3(0, 2.612, 0);
  const petalSpread = { x: 2, y: 1, z: 2 };
  const fallingPetalBounds = {
    min: new Vector3(petalCenter.x - petalSpread.x, 0, petalCenter.z - petalSpread.z),
    max: new Vector3(petalCenter.x + petalSpread.x, petalCenter.y + petalSpread.y + 0.5, petalCenter.z + petalSpread.z),
  };
  try {
    const petalData = await modelManager.loadPetals({
      modelUrl: '/project-cherry-tree/assets/blossom/petal1.glb',
      count: 2000,
      centerPosition: petalCenter,
      spreadRange: petalSpread,
      scale: 0.1,
      speedRange: 0.01,
    });
    petals = petalData.models;
    petalSpeeds = petalData.speeds;
    console.log('✓ 꽃잎이 씬에 추가되었습니다.');
  } catch (error) {
    console.error('꽃잎 로드 실패:', error);
  }

  function animate() {
    const deltaTime = clock.getDelta();
    const elapsedTime = clock.getElapsedTime();

    controls.update();

    // 애니메이션 업데이트
    modelManager.updateAnimations(deltaTime);

    // 바람 애니메이션 업데이트
    modelManager.updateTreeWind(elapsedTime);

    if (petals.length > 0) {
      modelManager.updatePetals(petals, petalSpeeds, elapsedTime, fallingPetalBounds);
    }

    renderer.render(scene, camera);
    requestAnimationFrame(animate);
  }

  animate();
}

main();
