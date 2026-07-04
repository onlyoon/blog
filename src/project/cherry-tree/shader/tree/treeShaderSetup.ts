import {
  MeshBasicMaterial,
  ShaderMaterial,
  TextureLoader,
  Vector3,
  Color,
  type Object3D,
  type Mesh,
} from 'three';

import treeVertexShader from './treeVertex.glsl.ts';
import treeFragmentShader from './treeFragment.glsl.ts';

// Public 폴더의 assets을 URL로 참조
// const foliageAlphaMap = '/project-cherry-tree/assets/tree/foliage_alpha4.png';
const foliageAlphaMap = '/project-cherry-tree/assets/tree/foliage_alpha3.png';
// const foliageAlphaMap = '/project-cherry-tree/assets/tree/foliage_alpha2.png';
// const foliageAlphaMap = '/project-cherry-tree/assets/tree/foliage_alpha1.png';
// const foliageAlphaMap = '/project-cherry-tree/assets/tree/foliage_alpha.png';
const trunkTexture = '/project-cherry-tree/assets/tree/dddwdwd.png';

function treeShaderSetup(modelScene: Object3D, foliageMesh: Mesh): Mesh | null {
  console.log('🌳 Tree Shader Setup 시작');
  console.log(
    '모델의 자식 오브젝트들:',
    modelScene.children.map(child => child.name),
  );

  const trunkMesh = modelScene.getObjectByName('trunk');
  foliageMesh = modelScene.getObjectByName('foliage') as Mesh;

  console.log('Trunk 찾음:', !!trunkMesh);
  console.log('Foliage 찾음:', !!foliageMesh);

  if (trunkMesh) {
    const textureLoader = new TextureLoader();
    console.log('Trunk 텍스처 로딩 시작:', trunkTexture);

    textureLoader.load(
      trunkTexture,
      texture => {
        console.log('✓ Trunk 텍스처 로드 성공');
        (trunkMesh as Mesh).material = new MeshBasicMaterial({
          map: texture,
          color: 0x333333, // 텍스처 밝기를 40% 정도로 줄임
        });
        trunkMesh.castShadow = true;
        trunkMesh.receiveShadow = true;
        console.log('✓ Trunk 셰이더 적용 완료');
      },
      undefined,
      error => {
        console.error('❌ Trunk 텍스처 로드 실패:', error);
        // 텍스처 로드 실패 시 검은색으로 fallback
        (trunkMesh as Mesh).material = new MeshBasicMaterial({ color: 'black' });
      },
    );
    trunkMesh.castShadow = true;
    trunkMesh.receiveShadow = true;
  } else {
    console.warn('⚠️ Trunk 메시를 찾을 수 없습니다.');
  }

  if (foliageMesh) {
    const textureLoader = new TextureLoader();
    console.log('텍스처 로딩 시작:', foliageAlphaMap);

    textureLoader.load(
      foliageAlphaMap,
      alphaMap => {
        console.log('✓ 텍스처 로드 성공');
        foliageMesh.material = new ShaderMaterial({
          uniforms: {
            alphaMap: { value: alphaMap },
            u_effectBlend: { value: 1.0 },
            u_inflate: { value: 0.1 },
            u_scale: { value: 1.0 },
            u_windSpeed: { value: 1.0 },
            u_windTime: { value: 0.0 },
            u_lightPosition: { value: new Vector3(1.0, 2.0, 3.0) },
            u_lightColor: { value: new Color(1.0, 1.0, 1.0) },
            u_ambientStrength: { value: 0.2 },
          },
          vertexShader: treeVertexShader,
          fragmentShader: treeFragmentShader,
          transparent: true,
        });

        foliageMesh.material.needsUpdate = true;
        foliageMesh.castShadow = true;
        foliageMesh.receiveShadow = true;
        console.log('✓ Foliage 셰이더 적용 완료');
      },
      undefined,
      error => {
        console.error('❌ 텍스처 로드 실패:', error);
      },
    );
  } else {
    console.warn('⚠️ Foliage 메시를 찾을 수 없습니다.');
  }

  return foliageMesh;
}

export default treeShaderSetup;
