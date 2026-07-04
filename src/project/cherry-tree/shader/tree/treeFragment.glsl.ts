const shader = `
uniform sampler2D alphaMap;
uniform vec3 u_lightPosition;
uniform vec3 u_lightColor;
uniform float u_ambientStrength;
uniform float u_blurAmount;

varying vec2 vUv;
varying vec3 vNormal;
varying vec3 vFragPos;

// Gaussian Blur 함수
vec4 gaussianBlur(sampler2D tex, vec2 uv, float blurSize) {
  vec4 color = vec4(0.0);
  float total = 0.0;
  
  // Gaussian weights (5x5 kernel)
  float weights[25];
  weights[0] = 0.003765; weights[1] = 0.015019; weights[2] = 0.023792; weights[3] = 0.015019; weights[4] = 0.003765;
  weights[5] = 0.015019; weights[6] = 0.059912; weights[7] = 0.094907; weights[8] = 0.059912; weights[9] = 0.015019;
  weights[10] = 0.023792; weights[11] = 0.094907; weights[12] = 0.150342; weights[13] = 0.094907; weights[14] = 0.023792;
  weights[15] = 0.015019; weights[16] = 0.059912; weights[17] = 0.094907; weights[18] = 0.059912; weights[19] = 0.015019;
  weights[20] = 0.003765; weights[21] = 0.015019; weights[22] = 0.023792; weights[23] = 0.015019; weights[24] = 0.003765;
  
  int index = 0;
  for (int x = -2; x <= 2; x++) {
    for (int y = -2; y <= 2; y++) {
      vec2 offset = vec2(float(x), float(y)) * blurSize * 0.002;
      color += texture2D(tex, uv + offset) * weights[index];
      total += weights[index];
      index++;
    }
  }
  
  return color / total;
}

void main() {
  // Blur 적용된 텍스처 샘플링
  vec4 texColor = gaussianBlur(alphaMap, vUv, u_blurAmount);
  
  if (texColor.r < 0.5) discard;

  // 벚꽃 4단계 색상 팔레트
  vec3 color1 = vec3(0.961, 0.886, 0.882); // #f5e2e1 - 가장 밝은 크림 핑크
  vec3 color2 = vec3(0.961, 0.796, 0.847); // #f5cbd8 - 밝은 핑크
  vec3 color3 = vec3(0.875, 0.624, 0.753); // #df9fc0 - 중간 핑크
  vec3 color4 = vec3(0.455, 0.388, 0.616); // #74639d - 어두운 보라

  // 분산광 계산
  vec3 norm = normalize(vNormal);
  vec3 lightDir = normalize(u_lightPosition - vFragPos);
  float diff = max(dot(norm, lightDir), 0.0);

  // 분산광 강도에 따른 색상 블렌딩
  // diff가 높을수록 (빛을 많이 받을수록) 밝은 색상
  // diff가 낮을수록 (그림자) 어두운 색상
  vec3 cherryBlossomColor;
  
  if (diff > 0.7) {
    // 매우 밝은 부분: color1과 color2 사이
    float t = (diff - 0.7) / 0.3; // 0.7~1.0을 0~1로 매핑
    cherryBlossomColor = mix(color2, color1, t);
  } else if (diff > 0.4) {
    // 중간 밝기: color2와 color3 사이
    float t = (diff - 0.4) / 0.3; // 0.4~0.7을 0~1로 매핑
    cherryBlossomColor = mix(color3, color2, t);
  } else {
    // 어두운 부분: color3과 color4 사이
    float t = diff / 0.4; // 0.0~0.4를 0~1로 매핑
    cherryBlossomColor = mix(color4, color3, t);
  }

  // 최종 색상 계산 (환경광 없이 순수한 색상만)
  vec3 result = cherryBlossomColor;
  
  // 약간의 glow 효과 추가
  float glow = 1.0 + (u_blurAmount * 0.4);
  result *= glow;

  gl_FragColor = vec4(result, texColor.a * 0.95);
}
`;

export default shader;
