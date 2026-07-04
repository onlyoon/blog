import { AnimationMixer, AnimationClip, AnimationAction, Object3D } from 'three';
import type { GLTF } from 'three/addons/loaders/GLTFLoader.js';

export class AnimationHandler {
  private mixers: AnimationMixer[] = [];
  private animationActions: Record<string, AnimationAction[]> = {};

  addAnimation(gltf: GLTF, model: Object3D, modelName: string, animationNames: string[]): void {
    const mixer = new AnimationMixer(model);
    const root = mixer.getRoot();
    if ('name' in root) {
      (root as Object3D).name = modelName;
    }

    animationNames.forEach(animationName => {
      const clip = AnimationClip.findByName(gltf.animations, animationName);
      if (clip) {
        const action = mixer.clipAction(clip);
        if (!this.animationActions[modelName]) {
          this.animationActions[modelName] = [];
        }
        this.animationActions[modelName].push(action);
      } else {
        console.warn(`애니메이션 '${animationName}'을 '${modelName}'에서 찾을 수 없습니다.`);
      }
    });

    this.mixers.push(mixer);
  }

  update(deltaTime: number): void {
    this.mixers.forEach(mixer => mixer.update(deltaTime));
  }

  getMixers(): AnimationMixer[] {
    return this.mixers;
  }

  getAnimationAction(modelName: string): AnimationAction[] | undefined {
    return this.animationActions[modelName];
  }

  getAllAnimationActions(): Record<string, AnimationAction[]> {
    return this.animationActions;
  }
}
