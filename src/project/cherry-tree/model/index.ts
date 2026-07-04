import { ModelManager } from './core/ModelManager';
import type { Scene } from 'three';

// 메인 팩토리 함수
export function createModelManager(scene: Scene): ModelManager {
  return new ModelManager(scene);
}

// 타입 및 인터페이스 재export
export type { ModelConfig } from './loaders/GLTFModelLoader';
export type { PetalConfig, PetalSpeed } from './loaders/PetalLoader';
export { ModelManager } from './core/ModelManager';
export { AnimationHandler } from './utils/AnimationHandler';
export { GLTFModelLoader } from './loaders/GLTFModelLoader';
export { TreeLoader } from './loaders/TreeLoader';
export { PetalLoader } from './loaders/PetalLoader';

export default createModelManager;
