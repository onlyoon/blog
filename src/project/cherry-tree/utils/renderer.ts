import { WebGLRenderer, ReinhardToneMapping } from 'three';

function createRenderer(canvas: HTMLCanvasElement) {
  const renderer = new WebGLRenderer({ antialias: true, canvas });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.toneMapping = ReinhardToneMapping;
  renderer.toneMappingExposure = 3;
  renderer.shadowMap.enabled = true;
  return renderer;
}

export default createRenderer;
