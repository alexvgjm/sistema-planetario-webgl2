const src = /*glsl*/`#version 300 es
precision mediump float;

flat in vec3 flatColor;

out vec4 fragColor;

void main(void) {
    fragColor = vec4(flatColor, 1);
}`

export default src