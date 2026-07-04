const petalVertexShader = `
uniform float u_time;
uniform float u_windStrength;

varying vec2 vUv;

attribute float randomValue;

void main() {
  vUv = uv;
  
  vec3 pos = position;
  
  // 바람에 의한 흔들림 (사인파 기반)
  float windEffect = sin(u_time * 0.5 + randomValue * 10.0) * u_windStrength;
  pos.x += windEffect * 0.1;
  pos.z += cos(u_time * 0.3 + randomValue * 5.0) * u_windStrength * 0.05;
  
  vec4 worldPosition = modelMatrix * vec4(pos, 1.0);
  
  gl_Position = projectionMatrix * viewMatrix * worldPosition;
}
`;

export default petalVertexShader;
