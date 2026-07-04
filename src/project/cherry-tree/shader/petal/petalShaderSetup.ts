import { ShaderMaterial, BufferAttribute, type Mesh } from 'three';
import petalVertexShader from './petalVertex.glsl.ts';
import petalFragmentShader from './petalFragment.glsl.ts';

export function applyPetalShader(petal: Mesh, randomValue: number): ShaderMaterial {
  // geometry에 random attribute 추가
  const geometry = petal.geometry;
  const count = geometry.attributes.position.count;
  const randomValues = new Float32Array(count);

  for (let i = 0; i < count; i++) {
    randomValues[i] = randomValue;
  }

  geometry.setAttribute('randomValue', new BufferAttribute(randomValues, 1));

  // 셰이더 재질 생성
  const material = new ShaderMaterial({
    uniforms: {
      u_time: { value: 0.0 },
      u_windStrength: { value: 0.5 },
    },
    vertexShader: petalVertexShader,
    fragmentShader: petalFragmentShader,
    transparent: false,
  });

  petal.material = material;

  return material;
}

export function updatePetalShader(material: ShaderMaterial, time: number): void {
  material.uniforms.u_time.value = time;
}
