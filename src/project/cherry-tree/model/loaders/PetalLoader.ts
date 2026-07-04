import { Vector3, Object3D, Mesh, ShaderMaterial, type Scene } from 'three';
import { GLTFLoader, type GLTF } from 'three/addons/loaders/GLTFLoader.js';
import { applyPetalShader, updatePetalShader } from '../../shader/petal/petalShaderSetup';

export interface PetalSpeed {
  x: number;
  y: number;
  z: number;
}

export interface RotationSpeed {
  x: number;
  y: number;
  z: number;
}

export interface PetalConfig {
  modelUrl: string;
  count?: number;
  centerPosition?: Vector3;
  spreadRange?: { x: number; y: number; z: number };
  scale?: number;
  speedRange?: number;
}

export class PetalLoader {
  private scene: Scene;
  private loader: GLTFLoader;
  private rotationSpeeds: RotationSpeed[] = [];
  private initialPositions: Vector3[] = [];
  private petalMaterials: ShaderMaterial[] = [];
  private isGrounded: boolean[] = []; // 바닥에 착지했는지 추적
  private groundedTime: number[] = []; // 착지한 시간 기록

  constructor(scene: Scene) {
    this.scene = scene;
    this.loader = new GLTFLoader();
  }

  async loadPetals(config: PetalConfig): Promise<{ models: Object3D[]; speeds: PetalSpeed[] }> {
    const {
      modelUrl,
      count = 25,
      centerPosition = new Vector3(-2, 3, -3),
      spreadRange = { x: 1, y: 2, z: 1 },
      scale = 0.1,
      speedRange = 0.05,
    } = config;

    return new Promise((resolve, reject) => {
      this.loader.load(
        modelUrl,
        (gltf: GLTF) => {
          const basePetal = gltf.scene.children[0];
          const petals: Object3D[] = [];
          const speeds: PetalSpeed[] = [];

          for (let i = 0; i < count; i++) {
            const petal = basePetal.clone();

            // 랜덤 위치 설정
            const initialPos = new Vector3(
              centerPosition.x + (Math.random() * 2 - 1) * spreadRange.x,
              centerPosition.y + Math.random() * spreadRange.y,
              centerPosition.z + (Math.random() * 2 - 1) * spreadRange.z,
            );
            petal.position.copy(initialPos);

            petal.scale.setScalar(scale);

            // 랜덤 값 생성 (색상 선택용)
            const randomValue = Math.random();

            // 셰이더 적용
            petal.traverse(obj => {
              if ((obj as Mesh).isMesh) {
                const mesh = obj as Mesh;
                mesh.castShadow = true;

                // GLSL 셰이더 재질 적용
                const material = applyPetalShader(mesh, randomValue);
                this.petalMaterials.push(material);
              }
            });

            this.scene.add(petal);
            petals.push(petal);

            // 초기 위치 저장
            this.initialPositions.push(initialPos.clone());

            // 랜덤 속도 생성 (y는 항상 아래로)
            speeds.push({
              x: (Math.random() - 0.5) * speedRange,
              y: -Math.random() * speedRange * 0.5, // 항상 아래로
              z: (Math.random() - 0.5) * speedRange,
            });

            // 랜덤 회전 속도 생성
            this.rotationSpeeds.push({
              x: (Math.random() - 0.5) * 0.02,
              y: (Math.random() - 0.5) * 0.02,
              z: (Math.random() - 0.5) * 0.02,
            });

            // 착지 상태 초기화
            this.isGrounded.push(false);
            this.groundedTime.push(0);
          }

          console.log(`✓ ${count}개의 꽃잎 생성 완료`);
          resolve({ models: petals, speeds });
        },
        undefined,
        reject,
      );
    });
  }

  updatePetals(
    petals: Object3D[],
    speeds: PetalSpeed[],
    time: number,
    bounds?: {
      min: Vector3;
      max: Vector3;
    },
  ): void {
    // 모든 셰이더의 시간 업데이트
    this.petalMaterials.forEach(material => {
      updatePetalShader(material, time);
    });

    petals.forEach((petal, index) => {
      // 바닥에 착지한 꽃잎 체크
      if (this.isGrounded[index]) {
        // 착지 후 2초가 지났는지 확인
        if (time - this.groundedTime[index] >= 2.0) {
          // 2초 지나면 다시 리셋
          if (bounds) {
            const newInitialPos = new Vector3(
              bounds.min.x + Math.random() * (bounds.max.x - bounds.min.x),
              bounds.max.y,
              bounds.min.z + Math.random() * (bounds.max.z - bounds.min.z),
            );
            petal.position.copy(newInitialPos);
            this.initialPositions[index].copy(newInitialPos);
            this.isGrounded[index] = false; // 다시 떨어지는 상태로
            this.groundedTime[index] = 0;
          }
        }
        return; // 착지한 상태면 움직임 멈춤
      }

      const speed = speeds[index];
      const rotSpeed = this.rotationSpeeds[index];
      const initialPos = this.initialPositions[index];

      // 시간 기반 좌우 흔들림 (사인파)
      petal.position.x = initialPos.x + Math.sin(time * 0.5 + index) * speed.x * 30;

      // 아래로 떨어지면서 약간의 상하 흔들림
      petal.position.y += Math.cos(time * 0.3 + index) * 0.005 + speed.y;

      // 앞뒤 흔들림
      petal.position.z += (Math.sin((time + index) * 0.4) + 1) * Math.abs(speed.z) * 0.5;

      // 자연스러운 회전 (시간에 따라 변화)
      petal.rotation.x += rotSpeed.x * Math.sin(time * 0.5) + (Math.random() * 0.01 - 0.005);
      petal.rotation.y += rotSpeed.y * Math.cos(time * 0.3) + (Math.random() * 0.01 - 0.005);
      petal.rotation.z += rotSpeed.z * Math.sin(time * 0.7) + (Math.random() * 0.01 - 0.005);

      // 가끔 회전 방향 전환 (0.1% 확률)
      if (Math.random() < 0.001) {
        this.rotationSpeeds[index].x *= -1;
        this.rotationSpeeds[index].y *= -1;
        this.rotationSpeeds[index].z *= -1;
      }

      // 바닥 범위 벗어남 체크 (20x20 ground 기준: x, z 범위 -10~10)
      const groundXRange = 10;
      const groundZRange = 10;

      if (
        petal.position.x < -groundXRange ||
        petal.position.x > groundXRange ||
        petal.position.z < -groundZRange ||
        petal.position.z > groundZRange
      ) {
        // 범위를 벗어나면 즉시 리셋
        if (bounds) {
          const newInitialPos = new Vector3(
            bounds.min.x + Math.random() * (bounds.max.x - bounds.min.x),
            bounds.max.y,
            bounds.min.z + Math.random() * (bounds.max.z - bounds.min.z),
          );
          petal.position.copy(newInitialPos);
          this.initialPositions[index].copy(newInitialPos);
        }
        return;
      }

      // 바닥 충돌 체크
      if (bounds) {
        if (petal.position.y <= bounds.min.y) {
          // 바닥에 착지
          petal.position.y = bounds.min.y + 0.01; // 바닥 위에 살짝 띄움
          this.isGrounded[index] = true; // 착지 상태로 변경
          this.groundedTime[index] = time; // 착지 시간 기록

          // 착지 시 회전을 자연스럽게 고정
          // 현재 회전 상태 유지
        }
      }
    });
  }
}
