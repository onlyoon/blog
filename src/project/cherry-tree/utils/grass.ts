import {
  Scene,
  PlaneGeometry,
  MeshBasicMaterial,
  DoubleSide,
  InstancedMesh,
  Matrix4,
  Vector3,
  Euler,
  Quaternion
} from 'three';

/**
 * 씬에 격자 기반의 최적화된 잔디밭(InstancedMesh)을 추가합니다.
 * @param scene Three.js 씬 객체
 * @param count 배치할 잔디 개수 (기본값: 22,500개)
 */
export function setupGrass(scene: Scene, count: number = 22500): InstancedMesh {
  // 1. 개별 잔디 모델(지오메트리) 정의: 가로 길이는 0.05로 고정
  const width = 0.05;
  const height = 0.70;

  // PlaneGeometry를 세로 6분할하여 생성
  const grassGeometry = new PlaneGeometry(width, height, 1, 6);
  // 피벗이 잔디 밑동(Y=0)이 되도록 기하학 정점들을 위로 0.35만큼 평행 이동
  grassGeometry.translate(0, height / 2, 0);

  // [CPU 단 형상 조각]: 6분할 구조를 유지하면서 상위 30% 영역을 삼각형 팁(▲)으로 모양 변경
  const posAttr = grassGeometry.attributes.position;
  for (let i = 0; i < posAttr.count; i++) {
    let x = posAttr.getX(i);
    let y = posAttr.getY(i);
    const z = posAttr.getZ(i);

    const heightFactor = y / height;
    if (heightFactor > 0.70) {
      // 상위 30% 구역에 대해서만 가로 폭을 삼각형 꼭지점으로 오므라들게 테이퍼링
      const t = (1.0 - heightFactor) / 0.30;
      x *= t;
      posAttr.setXYZ(i, x, y, z);
    }
  }
  posAttr.needsUpdate = true;
  grassGeometry.computeBoundingBox();
  grassGeometry.computeBoundingSphere();

  // 2. 단색 카툰 스타일 기본 재질 정의 (양면 렌더링 활성화 + 바람 셰이더 적용)
  const uniforms = {
    uTime: { value: 0.0 }
  };

  const grassMaterial = new MeshBasicMaterial({
    color: 0xffffff, // 셰이더에서 커스텀 색상(dark/bright)을 100% 온전히 출력하기 위해 흰색 설정
    side: DoubleSide,
  });
  // Three.js의 셰이더 캐싱으로 인해 타 MeshBasicMaterial의 컴파일 코드가 재사용되어 
  // onBeforeCompile이 무시되는 현상을 방지하기 위해 유니크 캐시 키 설정
  grassMaterial.customProgramCacheKey = () => 'grass';

  // onBeforeCompile을 사용하여 WebGL 컴파일 전에 셰이더 코드 수정
  grassMaterial.onBeforeCompile = (shader) => {
    // 1) 셰이더 유니폼 객체에 uTime 바인딩
    shader.uniforms.uTime = uniforms.uTime;

    // 2) 버텍스 셰이더의 헤더부에 uTime uniform, vWave 및 vHeight varying 선언, 2D 밸류 노이즈 추가
    shader.vertexShader = `
      uniform float uTime;
      varying float vWave;
      varying float vHeight;
      
      // 2D 해시 함수
      float hash2d(vec2 p) {
          return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
      }
      
      // 2D 밸류 노이즈 (격자 기반의 부드러운 빌리니어 보간 노이즈)
      float noise2d(vec2 p) {
          vec2 i = floor(p);
          vec2 f = fract(p);
          
          // Quintic smoothstep 보간 곡선
          vec2 u = f * f * (3.0 - 2.0 * f);
          
          // 4개의 격자 모서리 랜덤값 보간
          float a = hash2d(i + vec2(0.0, 0.0));
          float b = hash2d(i + vec2(1.0, 0.0));
          float c = hash2d(i + vec2(0.0, 1.0));
          float d = hash2d(i + vec2(1.0, 1.0));
          
          return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
      }
    ` + shader.vertexShader;

    // 3) 버텍스 셰이더 본문에 밸류 노이즈를 활용한 동적 격자 흔들림 및 varying 전달 주입
    shader.vertexShader = shader.vertexShader.replace(
      '#include <begin_vertex>',
      `
      #include <begin_vertex>
      
      // 버텍스의 로컬 높이 비율 계산 (Y=0 바닥은 0, Y=0.70 꼭대기는 1)
      float heightFactor = position.y / 0.70;
      
      // 4구간 분할 리깅 가중치 계산 (0번째/바닥은 30% 가중치 시작, Y=0.5 지점에서 50%, Y=1 꼭대기에서 100%)
      float curveFactor = 0.3 + clamp(heightFactor * 0.4, 0.0, 0.2) + clamp((heightFactor - 0.5) * 1.0, 0.0, 0.5);
      
      // 인스턴스의 월드 위치 좌표 (인스턴스 행렬의 4번째 열)
      vec3 worldPos = vec3(instanceMatrix[3][0], instanceMatrix[3][1], instanceMatrix[3][2]);
      
      // 1. 시간에 따라 흘러가는 격자 노이즈 좌표 계산 (속도를 1.5에서 20% 감축한 1.2로 조율)
      vec2 largeCoord = worldPos.xz / 4.0 - vec2(0.0, uTime * 1.2);
      
      // 2. 대형 격자 노이즈 1회만 호출하여 연산 절반 절감 (hash2d 및 sin 호출 4회 대폭 절약)
      float largeWave = noise2d(largeCoord);
      
      // 중형 바람은 샘플링 노이즈 값을 삼각 왜곡(sin)해 높은 주파수의 파형으로 수학적 재구축
      float midWave = sin(largeWave * 6.2831) * 0.4;
      
      // 3. 개별 풀들의 독립적인 고주파 미세 잔떨림 추가 (속도를 20% 감축: 8.0->6.4, 6.5->5.2)
      float localWave = sin(worldPos.x * 2.0 - uTime * 6.4) * cos(worldPos.z * 2.0 - uTime * 5.2) * 0.12;
      
      // 바람 노이즈 최종 합산
      float windNoise = largeWave + midWave + localWave;
      // windNoise 가용 범위 [0.15, 0.75]를 [0.0, 1.0]으로 선형 확장(Contrast Stretch)하여 
      // 바람 음영 색감의 대비를 뚜렷하게 살리고 흔들림 변위각을 온전히 활용
      float waveNormalized = clamp((windNoise - 0.15) / 0.6, 0.0, 1.0);
      
      // 3. 회전 각도 계산 (Vector Rotate)
      // 바람 세기(각도)를 추가로 20% 더 감축하여 자연스러운 세기 조율 (-0.22 ~ 0.80 라디안)
      float minAngle = -0.22;
      float maxAngle = 0.80;
      float angle = mix(minAngle, maxAngle, waveNormalized) * curveFactor;
      
      // 4. 회전 피벗을 밑동 Y=0 아래로 30% 만큼 오프셋하여 뿌리 부분도 자연스럽게 휨/이동하도록 조절
      float pivotOffset = 0.21; // height(0.70) * 0.30
      float yRel = position.y + pivotOffset;
      
      float cosA = cos(angle);
      float sinA = sin(angle);
      
      transformed.y = yRel * cosA - pivotOffset;
      
      // 5. 인스턴스별 Y축 회전각을 감지하여 바람이 항상 글로벌 Z축 방향으로 불도록 투영 보정
      vec2 windDir = vec2(instanceMatrix[0][2], instanceMatrix[2][2]);
      float len = length(windDir);
      vec2 localWindDir = len > 0.0 ? windDir / len : vec2(0.0, 1.0);
      
      float windDisplacement = yRel * sinA;
      transformed.x = position.x + windDisplacement * localWindDir.x;
      transformed.z = position.z + windDisplacement * localWindDir.y;
      
      // X축 방향 미세 난류 스웨이 (진폭 20% 추가 감축)
      float xSway = (largeWave * 0.115 + midWave * 0.051) * curveFactor;
      transformed.x += xSway;
      
      // 6. 프래그먼트 셰이더로 데이터 전달 (바람의 세기 및 버텍스 높이)
      vWave = waveNormalized;
      vHeight = heightFactor;
      `
    );

    // 4) 프레그먼트 셰이더 헤더부에 vWave 및 vHeight varying, 그리고 srgbToLinear 헬퍼 함수 선언 추가
    shader.fragmentShader = `
      varying float vWave;
      varying float vHeight;
      
      vec3 srgbToLinear(vec3 c) {
          return pow(c, vec3(2.2));
      }
    ` + shader.fragmentShader;

    // 5) 프레그먼트 셰이더 출력부에 블렌더 노드 그래프 이식 및 컬러 스페이스 감마 보정 추가
    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <opaque_fragment>',
      `
      #include <opaque_fragment>
      
      // 1. 잔디 자체의 색상은 가장 밝은 올리브/연두 계열로만 구성 (뿌리 #859345 -> 꼭대기 #8e984c, 어두운 색 제외)
      vec3 brightBody = srgbToLinear(vec3(0.5216, 0.5765, 0.2706)); // #859345 (올리브 미드톤)
      vec3 brightTip  = srgbToLinear(vec3(0.5569, 0.5961, 0.2980)); // #8e984c (가장 밝은 연두색)
      vec3 baseColor  = mix(brightBody, brightTip, vHeight);
      
      // 2. 바람에 의해 뭉칠 때 표현될 어두운 그림자 계열 정의 (뿌리 #163830 -> 꼭대기 #28563f)
      vec3 darkRoot = srgbToLinear(vec3(0.0863, 0.2196, 0.1882));  // #163830 (가장 어두운 이끼색)
      vec3 darkTip  = srgbToLinear(vec3(0.1569, 0.3373, 0.2471));  // #28563f (어두운 소나무색)
      vec3 windShadowColor = mix(darkRoot, darkTip, vHeight);
      
      // 3. 바람의 강도(vWave - wind shading)에 연동하여 바람이 부는/뭉치는 부분만 점진적으로 어두운 색상으로 변경 (최대 어두워짐 비율 0.70 제한)
      vec3 finalColor = mix(baseColor, windShadowColor, vWave * 0.70);
      
      gl_FragColor.rgb = finalColor;
      `
    );
  };

  // 3. 인스턴싱 메쉬 생성 및 userData 설정
  const instancedMesh = new InstancedMesh(grassGeometry, grassMaterial, count);
  instancedMesh.userData = { uniforms };
  instancedMesh.castShadow = true;
  instancedMesh.receiveShadow = true;
  instancedMesh.frustumCulled = false;

  // 4. 격자 기반 배치 로직
  const areaSize = 20; // 20x20 평면 기준
  const gridSide = Math.floor(Math.sqrt(count)); // 격자의 한 변 크기
  const spacing = areaSize / gridSide; // 격자 간격

  const matrix = new Matrix4();
  const position = new Vector3();
  const rotation = new Euler();
  const quaternion = new Quaternion();
  const scale = new Vector3();

  for (let i = 0; i < gridSide; i++) {
    for (let j = 0; j < gridSide; j++) {
      const idx = i * gridSide + j;
      if (idx >= count) break;

      // 1) 기본 바둑판식 격자 좌표 설정
      const x = (i - gridSide / 2) * spacing;
      const z = (j - gridSide / 2) * spacing;

      // 2) 격자 티가 나지 않도록 사방 랜덤 오프셋(Jitter) 부여
      const jitterX = (Math.random() - 0.5) * spacing * 0.9;
      const jitterZ = (Math.random() - 0.5) * spacing * 0.9;

      position.set(x + jitterX, 0, z + jitterZ);

      // 3) 개별 잔디 인스턴스의 3D 방향(회전) 및 임의 크기 조절
      rotation.set(
        (Math.random() - 0.5) * 0.1, // 바람 받기 전 약간의 X축 흐트러짐
        Math.random() * Math.PI,    // Y축 제각각 회전 (바라보는 평면 각도 다각화)
        (Math.random() - 0.5) * 0.1  // Z축 약간의 흐트러짐
      );
      quaternion.setFromEuler(rotation);

      // 4) 자연스러운 성장을 위한 개별 풀들의 스케일 무작위성 (0.85배 ~ 1.25배)
      const randomScale = 0.85 + Math.random() * 0.40;
      scale.set(randomScale, randomScale, randomScale);

      matrix.compose(position, quaternion, scale);
      instancedMesh.setMatrixAt(idx, matrix);
    }
  }

  scene.add(instancedMesh);
  return instancedMesh;
}
