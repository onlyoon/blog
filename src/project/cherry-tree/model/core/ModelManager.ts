import { Vector3, AnimationAction, type Scene } from 'three';
import { AnimationHandler } from '../utils/AnimationHandler';
import { GLTFModelLoader, type ModelConfig } from '../loaders/GLTFModelLoader';
import { TreeLoader } from '../loaders/TreeLoader';
import { PetalLoader, type PetalConfig, type PetalSpeed } from '../loaders/PetalLoader';
import type { Object3D } from 'three';

export class ModelManager {
  private animationHandler: AnimationHandler;
  private gltfLoader: GLTFModelLoader;
  private treeLoader: TreeLoader;
  private petalLoader: PetalLoader;

  constructor(scene: Scene) {
    this.animationHandler = new AnimationHandler();
    this.gltfLoader = new GLTFModelLoader(scene, this.animationHandler);
    this.treeLoader = new TreeLoader(scene, this.animationHandler);
    this.petalLoader = new PetalLoader(scene);
  }

  // 일반 모델 로드
  async loadModel(config: ModelConfig): Promise<Object3D> {
    return this.gltfLoader.load(config);
  }

  // 벚꽃 나무 로드
  async loadTree(position?: Vector3, scale?: number): Promise<Object3D> {
    return this.treeLoader.loadTree(position, scale);
  }

  // 꽃잎 생성
  async loadPetals(config: PetalConfig): Promise<{ models: Object3D[]; speeds: PetalSpeed[] }> {
    return this.petalLoader.loadPetals(config);
  }

  // 꽃잎 애니메이션 업데이트
  updatePetals(
    petals: Object3D[],
    speeds: PetalSpeed[],
    time: number,
    bounds?: { min: Vector3; max: Vector3 },
  ): void {
    this.petalLoader.updatePetals(petals, speeds, time, bounds);
  }

  // 애니메이션 업데이트
  updateAnimations(deltaTime: number): void {
    this.animationHandler.update(deltaTime);
  }

  // 바람 애니메이션 업데이트
  updateTreeWind(time: number): void {
    this.treeLoader.updateWind(time);
  }

  // 특정 모델의 애니메이션 액션 가져오기
  getAnimationAction(modelName: string): AnimationAction[] | undefined {
    return this.animationHandler.getAnimationAction(modelName);
  }

  // 모델 로딩 상태 확인
  isAllModelsLoaded(): boolean {
    return this.gltfLoader.isAllModelsLoaded();
  }

  // 로딩 진행 상태
  getLoadingProgress(): { loaded: number; total: number; percentage: number } {
    const loaded = this.gltfLoader.getLoadedModels();
    const total = this.gltfLoader.getTotalModels();
    const percentage = total > 0 ? (loaded / total) * 100 : 0;

    return { loaded, total, percentage };
  }
}
