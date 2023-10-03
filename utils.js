/**
 * Compile a shader
 * @param {WebGL2RenderingContext} gl Context
 * @param {number} type Shader type (VERTEX_SHADER, FRAGMENT_SHADER...)
 * @param {string} src Shader source code string
 * @returns {WebGLShader | undefined} shader or undefined if can't compile
 */
export function createShader(gl, type, src) {
    const shader = gl.createShader(type)
    gl.shaderSource(shader, src.trim())
    gl.compileShader(shader)

    const success = gl.getShaderParameter(shader, gl.COMPILE_STATUS)
    if (success) { return shader }
    
    const typeTxt = ((type == gl.VERTEX_SHADER) ? 'VERTEX' : 'FRAGMENT')
    const error = new Error(
        `=== IN ${typeTxt} SHADER ===\n` +
        gl.getShaderInfoLog(shader))
    gl.deleteShader(shader)
    throw error
}

/**
 * Create and link program
 * @param {WebGL2RenderingContext} gl Context
 * @param {WebGLShader} vs Vertex shader
 * @param {WebGLShader} fs Fragment shader
 * @returns {WebGLProgram | undefined} program or undefined if can't link
 */
export function createAndLinkProgram(gl, vs, fs) {
    const program = gl.createProgram()
    gl.attachShader(program, vs)
    gl.attachShader(program, fs)
    gl.linkProgram(program)

    const success = gl.getProgramParameter(program, gl.LINK_STATUS)
    if (success) { return program }

    console.log(gl.getProgramInfoLog(program))
    gl.deleteProgram(program)
}


export function distance(a, b) {
    return Math.sqrt((a.x - b.x)**2 + (a.y - b.y)**2)
}

export function matrixToStr(mat) {
    mat = new Array(...mat).map(e => e.toFixed(2))
    return `-----------------------------
${mat[0]}\t${mat[1]}\t${mat[2]}\t${mat[3]}
${mat[4]}\t${mat[5]}\t${mat[6]}\t${mat[7]}
${mat[8]}\t${mat[9]}\t${mat[10]}\t${mat[11]}
${mat[12]}\t${mat[13]}\t${mat[14]}\t${mat[15]}
-----------------------------`
}