import { Scene, PlaneGeometry, MeshStandardMaterial, Mesh } from 'three';

/**
 * 씬에 바닥을 추가합니다
 * - 중심이 (0, 0, 0)인 20x20 크기의 평면
 * - 그림자를 받을 수 있도록 설정
 */
export function setupGround(scene: Scene): void {
  const groundGeometry = new PlaneGeometry(20, 20);
  const groundMaterial = new MeshStandardMaterial({
    color: 0x8a7157,  // 모래빛 황토색 (#8a7157)
    roughness: 0.9,
    metalness: 0.0,
  });
  const ground = new Mesh(groundGeometry, groundMaterial);
  ground.rotation.x = -Math.PI / 2; // 바닥이 수평이 되도록 회전
  ground.position.set(0, 0, 0); // 중심을 (0, 0, 0)에 배치
  ground.receiveShadow = true;
  scene.add(ground);
  console.log('✓ 바닥이 씬에 추가되었습니다.');
}
