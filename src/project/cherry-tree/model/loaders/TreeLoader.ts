import { Vector3, Object3D, Mesh, type Scene } from 'three';
import { GLTFModelLoader, type ModelConfig } from './GLTFModelLoader';
import treeShaderSetup from '../../shader/tree/treeShaderSetup';
import type { AnimationHandler } from '../utils/AnimationHandler';

export class TreeLoader {
  private gltfLoader: GLTFModelLoader;
  public foliageMesh: Mesh | null = null;

  constructor(scene: Scene, animationHandler: AnimationHandler) {
    this.gltfLoader = new GLTFModelLoader(scene, animationHandler);
  }

  async loadTree(position: Vector3 = new Vector3(0, 0, 0), scale: number = 1): Promise<Object3D> {
    const config: ModelConfig = {
      name: 'tree',
      url: '/project-cherry-tree/assets/tree/newtree.glb',
      position: { x: position.x, y: position.y, z: position.z },
      scale,
      onSetup: async modelScene => {
        await this.setupTreeShader(modelScene);
      },
    };

    return this.gltfLoader.load(config);
  }

  private async setupTreeShader(modelScene: Object3D): Promise<void> {
    // 트리 셰이더 설정 적용 및 foliageMesh 저장
    this.foliageMesh = await treeShaderSetup(modelScene as Object3D, null as unknown as Mesh);
  }

  updateWind(time: number): void {
    if (this.foliageMesh && this.foliageMesh.material && 'uniforms' in this.foliageMesh.material) {
      const material = this.foliageMesh.material as any;
      if (material.uniforms.u_windTime) {
        material.uniforms.u_windTime.value = time;
      }
    }
  }
}
