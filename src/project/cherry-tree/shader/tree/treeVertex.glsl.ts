const treeVertexShader = `
uniform float u_effectBlend;
uniform float u_inflate;
uniform float u_scale;
uniform float u_windSpeed;
uniform float u_windTime;

varying vec2 vUv;
varying vec3 vNormal;
varying vec3 vFragPos;

float inverseLerp(float v, float minValue, float maxValue) {
  return (v - minValue) / (maxValue - minValue);
}

float remap(float v, float inMin, float inMax, float outMin, float outMax) {
  float t = inverseLerp(v, inMin, inMax);
  return mix(outMin, outMax, t);
}

mat4 rotateZ(float radians) {
  float c = cos(radians);
  float s = sin(radians);

  return mat4(
    c, -s, 0, 0,
    s, c, 0, 0,
    0, 0, 1, 0,
    0, 0, 0, 1
  );
}

vec4 applyWind(vec4 v) {
  float boundedYNormal = remap(normal.y, -1.0, 1.0, 0.0, 1.0);
  float posXZ = position.x + position.z;
  float power = u_windSpeed / 10.0 * -0.5;

  float topFacing = remap(sin(u_windTime + posXZ), -1.0, 1.0, 0.0, power);
  float bottomFacing = remap(cos(u_windTime + posXZ), -1.0, 1.0, 0.0, 0.05);
  float radians = mix(bottomFacing, topFacing, boundedYNormal);

  return rotateZ(radians) * v;
}

vec2 calcInitialOffsetFromUVs() {
  vec2 offset = vec2(
  remap(uv.x, 0.0, 1.0, -1.0, 1.0),
  remap(uv.y, 0.0, 1.0, -1.0, 1.0)
);

  offset *= vec2(-1.0, 1.0);
  offset = normalize(offset) * u_scale;

  return offset;
}

vec3 inflateOffset(vec3 offset) {
  return offset + normal.xyz * u_inflate;
}

void main() {
  vUv = uv;
  vNormal = normalMatrix * normal;

  vec2 vertexOffset = calcInitialOffsetFromUVs();

  vec3 inflatedVertexOffset = inflateOffset(vec3(vertexOffset, 0.0));

  vec4 worldViewPosition = modelViewMatrix * vec4(position, 1.0);

  worldViewPosition += vec4(mix(vec3(0.0), inflatedVertexOffset, u_effectBlend), 0.0);

  worldViewPosition = applyWind(worldViewPosition);

  gl_Position = projectionMatrix * worldViewPosition;
  vFragPos = vec3(modelMatrix * vec4(position, 1.0));
}
  `;

export default treeVertexShader;
