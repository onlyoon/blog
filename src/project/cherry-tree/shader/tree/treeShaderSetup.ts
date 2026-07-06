import {
  MeshBasicMaterial,
  ShaderMaterial,
  TextureLoader,
  Vector3,
  Color,
  Texture,
  type Object3D,
  type Mesh,
} from 'three';

import treeVertexShader from './treeVertex.glsl.ts';
import treeFragmentShader from './treeFragment.glsl.ts';

// Public 폴더의 assets을 URL로 참조
const foliageAlphaMap = '/project-cherry-tree/assets/tree/foliage_alpha3.png';
const trunkTexture = '/project-cherry-tree/assets/tree/dddwdwd.png';

const loadTexture = (url: string): Promise<Texture> => {
  return new Promise((resolve, reject) => {
    new TextureLoader().load(url, resolve, undefined, reject);
  });
};

async function treeShaderSetup(modelScene: Object3D, foliageMesh: Mesh): Promise<Mesh | null> {
  console.log('🌳 Tree Shader Setup 시작');
  console.log(
    '모델의 자식 오브젝트들:',
    modelScene.children.map(child => child.name),
  );

  const trunkMesh = modelScene.getObjectByName('trunk');
  foliageMesh = modelScene.getObjectByName('foliage') as Mesh;

  console.log('Trunk 찾음:', !!trunkMesh);
  console.log('Foliage 찾음:', !!foliageMesh);

  // 텍스처를 병렬로 로드합니다.
  const [trunkTex, alphaTex] = await Promise.all([
    trunkMesh
      ? loadTexture(trunkTexture).catch(err => {
          console.error('❌ Trunk 텍스처 로드 실패:', err);
          return null;
        })
      : Promise.resolve(null),
    foliageMesh
      ? loadTexture(foliageAlphaMap).catch(err => {
          console.error('❌ Foliage 텍스처 로드 실패:', err);
          return null;
        })
      : Promise.resolve(null)
  ]);

  if (trunkMesh) {
    const trunkMaterial = new MeshBasicMaterial({
      map: trunkTex || undefined,
      color: trunkTex ? 0x333333 : 'black',
      transparent: true,
      opacity: 0.0,
    });
    (trunkMesh as Mesh).material = trunkMaterial;
    trunkMesh.castShadow = true;
    trunkMesh.receiveShadow = true;
    console.log('✓ Trunk 셰이더 적용 완료');
  } else {
    console.warn('⚠️ Trunk 메시를 찾을 수 없습니다.');
  }

  if (foliageMesh) {
    const foliageMaterial = new ShaderMaterial({
      uniforms: {
        alphaMap: { value: alphaTex },
        u_effectBlend: { value: 1.0 },
        u_inflate: { value: 0.1 },
        u_scale: { value: 1.0 },
        u_windSpeed: { value: 1.0 },
        u_windTime: { value: 0.0 },
        u_lightPosition: { value: new Vector3(1.0, 2.0, 3.0) },
        u_lightColor: { value: new Color(1.0, 1.0, 1.0) },
        u_ambientStrength: { value: 0.2 },
        opacity: { value: 0.0 },
      },
      vertexShader: treeVertexShader,
      fragmentShader: treeFragmentShader,
      transparent: true,
    });
    foliageMesh.material = foliageMaterial;
    foliageMesh.castShadow = true;
    foliageMesh.receiveShadow = true;
    console.log('✓ Foliage 셰이더 적용 완료');
  } else {
    console.warn('⚠️ Foliage 메시를 찾을 수 없습니다.');
  }

  return foliageMesh;
}

export default treeShaderSetup;
