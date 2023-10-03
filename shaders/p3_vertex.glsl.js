const src = /*glsl*/`#version 300 es

uniform mat4 uView; // Matriz de vista (la "cámara").
                    // Ya incluye la relación de aspecto.

in vec3 aCoords;    // Coordenada del vértice
in mat4 aTransform; // Define escala, traslación y rotación a aplicar al vértice

in vec3 aColor;     // Color del planeta y su órbita. Se pasará al fragment.
flat out vec3 flatColor;

void main(void) {    
    vec4 finalPos = uView * aTransform * vec4(aCoords, 1);

    // Extraigo la escala en X (da igual el eje), para tamaño del punto.
    float xScale = length(
        vec3(aTransform[0][0], aTransform[1][0],  aTransform[2][0])
    );

    gl_Position = finalPos;
    gl_PointSize = 100.0 / finalPos.z * xScale;
    flatColor = aColor;
}`

export default src