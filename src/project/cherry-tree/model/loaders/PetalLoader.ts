import { Vector3, Object3D, Mesh, ShaderMaterial, InstancedMesh, DynamicDrawUsage, InstancedBufferAttribute, Matrix4, Quaternion, Euler, type Scene } from 'three';
import { GLTFLoader, type GLTF } from 'three/addons/loaders/GLTFLoader.js';
import petalFragmentShader from '../../shader/petal/petalFragment.glsl.ts';

export interface PetalSpeed {
  x: number;
  y: number;
  z: number;
}

export interface RotationSpeed {
  x: number;
  y: number;
  z: number;
}

export interface PetalConfig {
  modelUrl: string;
  count?: number;
  centerPosition?: Vector3;
  spreadRange?: { x: number; y: number; z: number };
  scale?: number;
  speedRange?: number;
}

interface PetalState {
  position: Vector3;
  initialPos: Vector3;
  speed: PetalSpeed;
  rotSpeed: RotationSpeed;
  rotation: { x: number; y: number; z: number };
  scale: number;
  isGrounded: boolean;
  groundedTime: number;
  randomValue: number;
}

// Local vertex shader supporting GPU Instancing
const instancedPetalVertexShader = `
uniform float u_time;
uniform float u_windStrength;
varying vec2 vUv;
attribute float randomValue;

void main() {
  vUv = uv;
  vec3 pos = position;
  float windEffect = sin(u_time * 0.5 + randomValue * 10.0) * u_windStrength;
  pos.x += windEffect * 0.1;
  pos.z += cos(u_time * 0.3 + randomValue * 5.0) * u_windStrength * 0.05;
  
  // Multiply by instanceMatrix for GPU Instancing
  vec4 worldPosition = modelMatrix * instanceMatrix * vec4(pos, 1.0);
  gl_Position = projectionMatrix * viewMatrix * worldPosition;
}
`;

export class PetalLoader {
  private scene: Scene;
  private loader: GLTFLoader;
  private petalsArray: PetalState[] = [];
  private instancedMesh1: InstancedMesh | null = null;
  private instancedMesh2: InstancedMesh | null = null;
  private material: ShaderMaterial | null = null;

  // Reusable math objects to eliminate garbage collection (GC) pressure in the animation loop
  private _transformMatrix = new Matrix4();
  private _positionVec = new Vector3();
  private _rotationQuat = new Quaternion();
  private _scaleVec = new Vector3();
  private _rotationEuler = new Euler();

  constructor(scene: Scene) {
    this.scene = scene;
    this.loader = new GLTFLoader();
  }

  async loadPetals(config: PetalConfig): Promise<{ models: Object3D[]; speeds: PetalSpeed[] }> {
    const {
      modelUrl,
      count = 1000,
      centerPosition = new Vector3(0, 2, 0),
      spreadRange = { x: 2, y: 1, z: 2 },
      scale = 0.1,
      speedRange = 0.01,
    } = config;

    return new Promise((resolve, reject) => {
      this.loader.load(
        modelUrl,
        (gltf: GLTF) => {
          let baseMesh: Mesh | null = null;
          gltf.scene.traverse(obj => {
            if ((obj as Mesh).isMesh) {
              baseMesh = obj as Mesh;
            }
          });

          if (!baseMesh) {
            reject(new Error("No mesh found in GLTF"));
            return;
          }

          const geometry = (baseMesh as Mesh).geometry.clone();
          const randomValues = new Float32Array(count);
          this.petalsArray = [];

          for (let i = 0; i < count; i++) {
            const randomValue = Math.random();
            randomValues[i] = randomValue;

            const initialPos = new Vector3(
              centerPosition.x + (Math.random() * 2 - 1) * spreadRange.x,
              Math.random() * 12.0, // Stagger initial Y coordinates from 0 to 12 to seed the scene with higher initial density (approx. 400 petals visible)
              centerPosition.z + (Math.random() * 2 - 1) * spreadRange.z
            );

            this.petalsArray.push({
              position: initialPos.clone(),
              initialPos,
              speed: {
                x: (Math.random() - 0.5) * speedRange * 2.0,
                y: -(0.005 + Math.random() * speedRange * 1.5), // always falling down
                z: (Math.random() - 0.5) * speedRange * 2.0,
              },
              rotSpeed: {
                x: (Math.random() - 0.5) * 0.02,
                y: (Math.random() - 0.5) * 0.02,
                z: (Math.random() - 0.5) * 0.02,
              },
              rotation: {
                x: Math.random() * Math.PI,
                y: Math.random() * Math.PI,
                z: Math.random() * Math.PI,
              },
              scale: scale * (0.8 + Math.random() * 0.4),
              isGrounded: false,
              groundedTime: 0,
              randomValue,
            });
          }

          geometry.setAttribute('randomValue', new InstancedBufferAttribute(randomValues, 1));

          this.material = new ShaderMaterial({
            uniforms: {
              u_time: { value: 0.0 },
              u_windStrength: { value: 3.0 }, // sway/turbulence is 3.0
              opacity: { value: 0.0 },
            },
            vertexShader: instancedPetalVertexShader,
            fragmentShader: petalFragmentShader,
            transparent: true,
          });

          const shadowCount = Math.min(100, count);
          const restCount = count - shadowCount;

          this.instancedMesh1 = new InstancedMesh(geometry, this.material, shadowCount);
          this.instancedMesh1.instanceMatrix.setUsage(DynamicDrawUsage);
          this.instancedMesh1.castShadow = true;
          this.instancedMesh1.receiveShadow = true;
          this.instancedMesh1.frustumCulled = false;

          this.instancedMesh2 = new InstancedMesh(geometry, this.material, restCount);
          this.instancedMesh2.instanceMatrix.setUsage(DynamicDrawUsage);
          this.instancedMesh2.castShadow = false;
          this.instancedMesh2.receiveShadow = false;
          this.instancedMesh2.frustumCulled = false;

          this.scene.add(this.instancedMesh1);
          this.scene.add(this.instancedMesh2);

          // Return both InstancedMeshes so CherryTree3D can manage visibility/animations on both
          resolve({ models: [this.instancedMesh1, this.instancedMesh2], speeds: [] });
        },
        undefined,
        reject
      );
    });
  }

  updatePetals(
    petals: Object3D[],
    speeds: PetalSpeed[],
    time: number,
    bounds?: { min: Vector3; max: Vector3 }
  ): void {
    if (!this.instancedMesh1 || !this.instancedMesh2 || this.petalsArray.length === 0) return;

    if (this.material) {
      this.material.uniforms.u_time.value = time;
    }

    const gravity = 0.5; // gravity is 0.5
    const sway = 3.0;    // sway/turbulence is 3.0

    const len = this.petalsArray.length;
    const shadowCount = Math.min(100, len);
    let mesh1Changed = false;
    let mesh2Changed = false;

    for (let idx = 0; idx < len; idx++) {
      const p = this.petalsArray[idx] as any;
      let needsUpdate = p.needsMatrixUpdate !== false;

      if (p.isGrounded) {
        if (time - p.groundedTime >= 2.0) {
          if (bounds) {
            p.position.set(
              bounds.min.x + Math.random() * (bounds.max.x - bounds.min.x),
              bounds.max.y,
              bounds.min.z + Math.random() * (bounds.max.z - bounds.min.z)
            );
            p.initialPos.copy(p.position);
            p.isGrounded = false;
            p.groundedTime = 0;
            needsUpdate = true;
          }
        }
      } else {
        // Falling physics matching gravity
        p.position.y += p.speed.y * gravity;

        // Gentle Z wind direction (+Z towards camera, but subtle to prevent flying up illusion)
        p.position.z += 0.015;

        // Sway based on sway/turbulence
        p.position.x += Math.sin(time * 0.5 * sway + p.randomValue * 10.0) * p.speed.x * sway * 0.5;
        p.position.z += Math.cos(time * 0.3 * sway + p.randomValue * 5.0) * p.speed.z * sway * 0.5;

        // Rotation
        p.rotation.x += p.rotSpeed.x * sway;
        p.rotation.y += p.rotSpeed.y * sway;
        p.rotation.z += p.rotSpeed.z * sway;

        // Reset check if they go out of the ground boundary or too far forward
        const groundXRange = 10.0;
        const groundZRange = 10.0;
        const outOfX = p.position.x < -groundXRange || p.position.x > groundXRange;
        const outOfZ = p.position.z < -groundZRange || p.position.z > (bounds ? bounds.max.z + 10.0 : groundZRange);

        if (outOfX || outOfZ) {
          if (bounds) {
            p.position.set(
              bounds.min.x + Math.random() * (bounds.max.x - bounds.min.x),
              bounds.max.y,
              bounds.min.z - 2.0 + Math.random() * (bounds.max.z - bounds.min.z) // spawn at the back to drift forward
            );
            p.initialPos.copy(p.position);
            p.isGrounded = false;
            p.groundedTime = 0;
            p.rotation.x = Math.random() * Math.PI;
            p.rotation.y = Math.random() * Math.PI;
            p.rotation.z = Math.random() * Math.PI;
          }
          needsUpdate = true;
        } else if (bounds && p.position.y <= bounds.min.y) {
          // Ground check
          p.position.y = bounds.min.y + 0.01;
          p.isGrounded = true;
          p.groundedTime = time;
          p.rotation.x = 0;
          p.rotation.z = 0;
          needsUpdate = true;
        } else {
          needsUpdate = true;
        }
      }

      if (needsUpdate) {
        // Update instanced transform matrix using reusable fields to avoid GC allocation
        this._positionVec.copy(p.position);
        this._rotationEuler.set(p.rotation.x, p.rotation.y, p.rotation.z);
        this._rotationQuat.setFromEuler(this._rotationEuler);
        this._scaleVec.setScalar(p.scale);
        this._transformMatrix.compose(this._positionVec, this._rotationQuat, this._scaleVec);

        if (idx < shadowCount) {
          this.instancedMesh1.setMatrixAt(idx, this._transformMatrix);
          mesh1Changed = true;
        } else {
          this.instancedMesh2.setMatrixAt(idx - shadowCount, this._transformMatrix);
          mesh2Changed = true;
        }

        if (p.isGrounded) {
          p.needsMatrixUpdate = false;
        } else {
          p.needsMatrixUpdate = true;
        }
      }
    }

    if (mesh1Changed) this.instancedMesh1.instanceMatrix.needsUpdate = true;
    if (mesh2Changed) this.instancedMesh2.instanceMatrix.needsUpdate = true;
  }
}
