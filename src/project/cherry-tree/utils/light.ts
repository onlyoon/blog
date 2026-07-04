import { Scene, AmbientLight, DirectionalLight } from 'three';

/**
 * 씬에 기본 조명을 설정합니다
 * - 주변광(AmbientLight): 전체적인 밝기 제공
 * - 방향광(DirectionalLight): 그림자와 입체감 제공
 */
export function setupLights(scene: Scene): void {
  // 주변광 추가
  const ambientLight = new AmbientLight(0xffffff, 0.6);
  scene.add(ambientLight);

  // 방향광 추가
  const directionalLight = new DirectionalLight(0xffffff, 0.8);
  directionalLight.position.set(5, 10, 5);
  directionalLight.castShadow = true;
  directionalLight.shadow.mapSize.width = 2048;
  directionalLight.shadow.mapSize.height = 2048;
  scene.add(directionalLight);

  console.log('✓ 조명이 씬에 추가되었습니다.');
}
