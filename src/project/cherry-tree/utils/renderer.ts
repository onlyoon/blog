import { WebGLRenderer, ReinhardToneMapping, PCFSoftShadowMap } from 'three';

function createRenderer(canvas: HTMLCanvasElement) {
  const renderer = new WebGLRenderer({ antialias: true, canvas });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.toneMapping = ReinhardToneMapping;
  renderer.toneMappingExposure = 3;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = PCFSoftShadowMap; // Softer painterly shadows & highly optimized
  return renderer;
}

export default createRenderer;
