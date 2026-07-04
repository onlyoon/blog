import { Object3D, Mesh, Material, Texture, type Scene } from 'three';
import { GLTFLoader, type GLTF } from 'three/addons/loaders/GLTFLoader.js';
import type { AnimationHandler } from '../utils/AnimationHandler';

export interface ModelConfig {
  name: string;
  url: string;
  position?: { x: number; y: number; z: number };
  scale?: number;
  rotation?: { x: number; y: number; z: number };
  animations?: string[];
  onSetup?: (modelScene: Object3D) => void;
}

export class GLTFModelLoader {
  private loader: GLTFLoader;
  private scene: Scene;
  private animationHandler: AnimationHandler;
  private loadedModels = 0;
  private totalModels = 0;

  constructor(scene: Scene, animationHandler: AnimationHandler) {
    this.loader = new GLTFLoader();
    this.scene = scene;
    this.animationHandler = animationHandler;
  }

  async load(config: ModelConfig): Promise<Object3D> {
    this.totalModels++;

    return new Promise((resolve, reject) => {
      this.loader.load(
        config.url,
        (gltf: GLTF) => {
          const modelScene = gltf.scene;
          modelScene.name = config.name;

          // 그림자 및 재질 설정
          this.setupMaterials(modelScene);

          // 위치, 스케일, 회전 설정
          if (config.position) {
            modelScene.position.set(config.position.x, config.position.y, config.position.z);
          }
          if (config.scale) {
            modelScene.scale.setScalar(config.scale);
          }
          if (config.rotation) {
            modelScene.rotation.set(config.rotation.x, config.rotation.y, config.rotation.z);
          }

          // 커스텀 설정 콜백
          if (config.onSetup) {
            config.onSetup(modelScene);
          }

          // 씬에 추가
          this.scene.add(modelScene);
          console.log(`✓ ${config.name} 모델 로드 완료`);

          // 애니메이션 설정
          if (gltf.animations && gltf.animations.length > 0 && config.animations) {
            this.animationHandler.addAnimation(gltf, modelScene, config.name, config.animations);
          }

          this.loadedModels++;
          resolve(modelScene);
        },
        xhr => {
          const progress = ((xhr.loaded / xhr.total) * 100).toFixed(2);
          console.log(`${config.name} 로딩 중: ${progress}%`);
        },
        error => {
          console.error(`${config.name} 로드 실패:`, error);
          reject(error);
        },
      );
    });
  }

  private setupMaterials(model: Object3D): void {
    model.traverse(obj => {
      if ((obj as Mesh).isMesh) {
        const mesh = obj as Mesh;
        mesh.castShadow = true;
        mesh.receiveShadow = true;

        const material = mesh.material;
        if (material) {
          const materials = Array.isArray(material) ? material : [material];
          materials.forEach((mat: Material) => {
            if ('map' in mat && mat.map && mat.map instanceof Texture) {
              mat.map.anisotropy = 16;
            }
          });
        }
      }
    });
  }

  isAllModelsLoaded(): boolean {
    return this.loadedModels === this.totalModels;
  }

  getTotalModels(): number {
    return this.totalModels;
  }

  getLoadedModels(): number {
    return this.loadedModels;
  }
}
