import { Vector3, MathUtils, Scene } from 'three';
import { Sky } from 'three/addons/objects/Sky.js';

function addSky(scene: Scene): Scene {
  const sky = new Sky();
  sky.scale.setScalar(1000000);

  const sunPosition = new Vector3();
  const phi = MathUtils.degToRad(85);
  const theta = MathUtils.degToRad(90);
  sunPosition.setFromSphericalCoords(1, phi, theta);

  const uniforms = sky.material.uniforms;
  uniforms['sunPosition'].value.copy(sunPosition);
  uniforms['turbidity'].value = 2;
  uniforms['rayleigh'].value = 1;
  uniforms['mieCoefficient'].value = 0.005;
  uniforms['mieDirectionalG'].value = 0.5;

  scene.add(sky);

  return scene;
}

export default addSky;
