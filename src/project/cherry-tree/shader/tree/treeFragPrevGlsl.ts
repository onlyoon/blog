const shader = `
uniform sampler2D alphaMap;
uniform vec3 u_lightPosition;
uniform vec3 u_lightColor;
uniform float u_ambientStrength;

varying vec2 vUv;
varying vec3 vNormal;
varying vec3 vFragPos;

void main() {
  vec4 texColor = texture2D(alphaMap, vUv);
  vec4 alphaTexColor = texture2D(alphaMap, vUv);

  if (texColor.r < 0.5) discard;

  // 잎 색상 (#3f6d21 = vec3(0.247, 0.427, 0.129))
  vec3 leafColor = vec3(0.247, 0.427, 0.129);

  // 벚꽃 색상 - 일본 애니메이션 스타일 (밝고 파스텔톤)
  // #FFE5EC = vec3(1.0, 0.898, 0.925) - 매우 연하고 밝은 파스텔 핑크
  vec3 cherryBlossomColor = vec3(1.0, 0.898, 0.925);

  // 환경광 계산
  vec3 ambient = u_ambientStrength * u_lightColor;

  // 분산광 계산
  vec3 norm = normalize(vNormal);
  vec3 lightDir = normalize(u_lightPosition - vFragPos);
  float diff = max(dot(norm, lightDir), 0.0);
  vec3 diffuse = diff * u_lightColor;

  // 최종 색상 계산
  vec3 result = (ambient + diffuse) * cherryBlossomColor;

  gl_FragColor = vec4(result, texColor.a);
}
`;

export default shader;
