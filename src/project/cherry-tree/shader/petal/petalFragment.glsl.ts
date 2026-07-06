const petalFragmentShader = `
uniform float opacity;
varying vec2 vUv;

void main() {
  // 기준 색상: #df9fc0 - 중간 핑크
  vec3 finalColor = vec3(0.875, 0.624, 0.753);
  
  gl_FragColor = vec4(finalColor, opacity);
}
`;

export default petalFragmentShader;
