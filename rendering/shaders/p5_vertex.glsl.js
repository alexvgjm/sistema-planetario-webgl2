const src = /*glsl*/`#version 300 es

uniform mat4 uView; // Matriz de vista (en este caso cámara + proyección)
uniform vec3 uAmbientLight; // Luz ambiente 

in vec3 aCoords;    // Coordenada del vértice
in mat4 aTransform; // Define escala, traslación y rotación a aplicar al vértice

in vec3 aColor;     // Color del planeta y su órbita. Se pasará al fragment.
in vec3 aNormal;    // Normal del vértice
out vec4 vColor;

void main(void) {
    vec4 posBeforeView = aTransform * vec4(aCoords, 1);
    gl_Position = uView * posBeforeView;

    vec4 light = vec4(0, 0, 0, 1);
    vec3 L = normalize(light.xyz - posBeforeView.xyz);
    vec3 N = normalize(vec3(aTransform * vec4(aNormal, 0.0)));

    float diffuse = max(dot(N, L), 0.0);
    vec4 Idif = vec4(aColor*0.2 + diffuse*aColor*0.8, 1);

    
    vColor = Idif;
}`

export default src