# Model 모듈

3D 모델 로딩 및 관리를 위한 모듈화된 시스템입니다.

## 📁 구조

```
model/
├── index.ts                      # 메인 엔트리포인트
├── core/
│   └── ModelManager.ts           # 모델 관리 및 통합 인터페이스
├── loaders/
│   ├── GLTFModelLoader.ts        # 기본 GLTF 모델 로더
│   ├── TreeLoader.ts             # 트리 특화 로더
│   └── PetalLoader.ts            # 꽃잎 생성 및 애니메이션 로더
└── utils/
    └── AnimationHandler.ts       # 애니메이션 관리 헬퍼
```

## 🚀 사용법

### 기본 설정

```typescript
import { createModelManager } from './model';
import { Scene } from 'three';

const scene = new Scene();
const modelManager = createModelManager(scene);
```

### 벚꽃 나무 로드

```typescript
// 기본 위치와 스케일로 로드
await modelManager.loadCherryTree();

// 커스텀 위치와 스케일
import { Vector3 } from 'three';
await modelManager.loadCherryTree(
  new Vector3(0, 0, 0), // 위치
  1.5, // 스케일
);
```

### 일반 모델 로드

```typescript
await modelManager.loadModel({
  name: 'my-model',
  url: '/assets/models/model.glb',
  position: { x: 0, y: 0, z: 0 },
  scale: 1,
  rotation: { x: 0, y: Math.PI / 2, z: 0 },
  animations: ['Walk', 'Run'],
  onSetup: modelScene => {
    // 커스텀 설정
  },
});
```

### 꽃잎 생성

```typescript
const { models: petals, speeds } = await modelManager.loadPetals({
  modelUrl: '/assets/tree/petal.glb',
  count: 50,
  centerPosition: new Vector3(-2, 3, -3),
  spreadRange: { x: 2, y: 3, z: 2 },
  scale: 0.1,
  speedRange: 0.05,
});

// 애니메이션 루프에서 업데이트
function animate() {
  modelManager.updatePetals(petals, speeds, {
    min: new Vector3(-10, 0, -10),
    max: new Vector3(10, 10, 10),
  });

  requestAnimationFrame(animate);
}
```

### 애니메이션 관리

```typescript
import { Clock } from 'three';

const clock = new Clock();

function animate() {
  const deltaTime = clock.getDelta();

  // 모든 애니메이션 업데이트
  modelManager.updateAnimations(deltaTime);

  requestAnimationFrame(animate);
}

// 특정 모델의 애니메이션 제어
const actions = modelManager.getAnimationAction('my-model');
if (actions) {
  actions[0].play();
}
```

### 로딩 진행 상태

```typescript
const progress = modelManager.getLoadingProgress();
console.log(`로딩 중: ${progress.percentage.toFixed(2)}%`);
console.log(`${progress.loaded} / ${progress.total} 모델 로드 완료`);

if (modelManager.isAllModelsLoaded()) {
  console.log('모든 모델 로드 완료!');
}
```

## 🎯 주요 클래스

### ModelManager

모든 모델 로딩 및 관리를 위한 통합 인터페이스

**메서드:**

- `loadModel(config)` - 일반 모델 로드
- `loadCherryTree(position?, scale?)` - 벚꽃 나무 로드
- `loadTree(url, name, position?, scale?)` - 커스텀 트리 로드
- `loadPetals(config)` - 꽃잎 생성
- `updatePetals(petals, speeds, bounds?)` - 꽃잎 애니메이션 업데이트
- `updateAnimations(deltaTime)` - 모든 애니메이션 업데이트
- `getAnimationAction(modelName)` - 특정 모델의 애니메이션 액션
- `isAllModelsLoaded()` - 모든 모델 로드 완료 여부
- `getLoadingProgress()` - 로딩 진행 상태

### GLTFModelLoader

기본 GLTF 모델 로딩 기능 제공

### TreeLoader

나무 모델 특화 로더 (셰이더 적용 포함)

### PetalLoader

꽃잎 파티클 시스템 생성 및 애니메이션

### AnimationHandler

Three.js 애니메이션 믹서 및 액션 관리

## 📝 타입 정의

```typescript
interface ModelConfig {
  name: string;
  url: string;
  position?: { x: number; y: number; z: number };
  scale?: number;
  rotation?: { x: number; y: number; z: number };
  animations?: string[];
  onSetup?: (modelScene: Object3D) => void;
}

interface PetalConfig {
  modelUrl: string;
  count?: number;
  centerPosition?: Vector3;
  spreadRange?: { x: number; y: number; z: number };
  scale?: number;
  speedRange?: number;
}

interface PetalSpeed {
  x: number;
  y: number;
  z: number;
}
```

## 🔧 확장하기

새로운 특화 로더를 추가하려면:

1. `loaders/` 디렉토리에 새 로더 클래스 생성
2. `ModelManager`에 메서드 추가
3. `index.ts`에서 export

```typescript
// loaders/CharacterLoader.ts
export class CharacterLoader {
  constructor(scene: Scene, animationHandler: AnimationHandler) {
    // ...
  }

  async loadCharacter(config: CharacterConfig) {
    // ...
  }
}

// core/ModelManager.ts
import { CharacterLoader } from '../loaders/CharacterLoader';

export class ModelManager {
  private characterLoader: CharacterLoader;

  constructor(scene: Scene) {
    // ...
    this.characterLoader = new CharacterLoader(scene, this.animationHandler);
  }

  async loadCharacter(config: CharacterConfig) {
    return this.characterLoader.loadCharacter(config);
  }
}
```

## 💡 팁

- 모든 모델은 자동으로 그림자 캐스팅/수신 설정됨
- 텍스처 anisotropy는 자동으로 16으로 설정됨
- 애니메이션은 자동으로 AnimationHandler에 등록됨
- 로딩 진행 상태는 콘솔에 자동으로 출력됨
