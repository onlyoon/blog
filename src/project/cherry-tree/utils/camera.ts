import { OrthographicCamera, PerspectiveCamera } from 'three';

export function createPerspectiveCamera() {
  const camera = new PerspectiveCamera(65, window.innerWidth / window.innerHeight, 0.1, 25);
  camera.position.set(3.5, 1.5, 5.0); // Raised camera height (Y) from 0.1 to 1.5 for a natural eye-level view
  camera.lookAt(0, 0, 0);
  return camera;
}

export function createOrthographicCamera() {
  const camera = new OrthographicCamera(
    -window.innerWidth / 2,
    window.innerWidth / 2,
    window.innerHeight / 2,
    -window.innerHeight / 2,
    0.1,
    100,
  );
  camera.position.set(0, 0, 100);
  camera.lookAt(0, 0, 0);
  return camera;
}
