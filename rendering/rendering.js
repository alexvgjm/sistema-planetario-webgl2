import vertexShaderSrc from './shaders/p5_vertex.glsl.js'
import fragmentShaderSrc from './shaders/p5_fragment.frag.js'
import { mat4, vec3 } from 'gl-matrix'

export const VERTICES_POR_CIRCULO = 60
export let VERTICES_ESFERA = 10
/**
 * Compile a shader
 * @param {WebGL2RenderingContext} gl Context
 * @param {number} type Shader type (VERTEX_SHADER, FRAGMENT_SHADER...)
 * @param {string} src Shader source code string
 * @returns {WebGLShader | undefined} shader or undefined if can't compile
 */
function createShader(gl, type, src) {
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
function createAndLinkProgram(gl, vs, fs) {
    const program = gl.createProgram()
    gl.attachShader(program, vs)
    gl.attachShader(program, fs)
    gl.linkProgram(program)

    const success = gl.getProgramParameter(program, gl.LINK_STATUS)
    if (success) { return program }

    console.log(gl.getProgramInfoLog(program))
    gl.deleteProgram(program)
}

function initTransformBufferAttribs(gl, transformsBuffer, transformLoc, colorLoc) {
    gl.bindBuffer(gl.ARRAY_BUFFER, transformsBuffer)

    /**
     * Descubrimiento: resulta que cuando quieres transferir matrices 4x4 por
     * atributos, ocupan 4 locations que hay que definir y habilitar. De locos.
     */
    for (let i = 0; i < 4; i++) {
        gl.vertexAttribPointer(transformLoc + i, 4, gl.FLOAT, false, 76, i * 16)
        gl.enableVertexAttribArray(transformLoc + i)
        gl.vertexAttribDivisor(transformLoc + i, 1)
    }
    gl.vertexAttribPointer(colorLoc, 3, gl.FLOAT, false, 76, 64)
    gl.enableVertexAttribArray(colorLoc)
    gl.vertexAttribDivisor(colorLoc, 1)
}

export function initClearAndDepthTest(gl) {
    gl.clearColor(0.2, 0.2, 0.2, 1.0)
    gl.enable(gl.DEPTH_TEST);
    const canvas = gl.canvas
    gl.viewport(0, 0, canvas.width, canvas.height)
}

function createProgram(gl) {
    const vs = createShader(gl, gl.VERTEX_SHADER, vertexShaderSrc)
    const fs = createShader(gl, gl.FRAGMENT_SHADER, fragmentShaderSrc)
    return createAndLinkProgram(gl, vs, fs)
}


/**
 * @param {WebGL2RenderingContext} gl
 */
export function createRenderObjects(gl) {
    initClearAndDepthTest(gl)
    const program = createProgram(gl)
    gl.useProgram(program)

    const viewLoc = gl.getUniformLocation(program, 'uView')
    const transformLoc = gl.getAttribLocation(program, 'aTransform')
    const colorLoc = gl.getAttribLocation(program, 'aColor')
    const coordLoc = gl.getAttribLocation(program, 'aCoords')

    // ============         VERTEX DE LAS ÓRBITAS          ====================
    // Usando instanciación como en la anterior entrega.
    const orbitaVAO = gl.createVertexArray()
    gl.bindVertexArray(orbitaVAO)
    const orbitaVertexBuffer = gl.createBuffer()
    let vertices = []
    for (let i = 0; i < VERTICES_POR_CIRCULO; i++) {
        const angulo = (i / VERTICES_POR_CIRCULO) * 2 * Math.PI
        vertices.push(Math.cos(angulo), 0, Math.sin(angulo))
    }
    gl.bindBuffer(gl.ARRAY_BUFFER, orbitaVertexBuffer)
    gl.enableVertexAttribArray(coordLoc)
    gl.vertexAttribPointer(coordLoc, 3, gl.FLOAT, false, 12, 0)
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW)

    // =============   BUFFER DE TRANSFORMACIONES Y COLORES =================
    const transformsBuffer = gl.createBuffer()
    // Como se usa el mismo buffer también para transform/colores de planetas
    // hay que definir los mismos atributos en dos ocasiones. Por eso un método.
    initTransformBufferAttribs(gl, transformsBuffer, transformLoc, colorLoc)
    gl.bindVertexArray(null)

    const cuerpoVAO = gl.createVertexArray()
    gl.bindVertexArray(cuerpoVAO)
    const planetaVertexBuffer = gl.createBuffer()
    gl.bindBuffer(gl.ARRAY_BUFFER, planetaVertexBuffer)
    gl.enableVertexAttribArray(coordLoc)
    gl.vertexAttribPointer(coordLoc, 3, gl.FLOAT, false, 12, 0)

    const verticesEsfera = []
    const n = 10
    const step = Math.PI / n
    verticesEsfera.push(0, -1, 0) // Vértice del polo sur
    for(let i = 1; i < n; i++) {
        const fi = i*step - Math.PI/2

        for(let j = 0; j < 2*n; j++) {
            const theta = j*step
            verticesEsfera.push(
                Math.cos(theta) * Math.cos(fi), 
                Math.sin(fi),
                Math.sin(theta) * Math.cos(fi),
            )
        }
    }
    verticesEsfera.push(0, 1, 0) // Vértice del polo norte

    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(verticesEsfera), gl.STATIC_DRAW)

    
    const cuerpoIndexBuffer = gl.createBuffer()
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, cuerpoIndexBuffer)
    const indices = []

    // polo sur
    for(let j = 0; j < 2*n; j++) { indices.push(j+1, 0)}
    indices.push(1)

    for(let i = 0; i < n-2; i++) {
        for(let j = 1; j < 2*n+1; j++) {
            indices.push(2*n*(i+1) + j,     2*n*i + j)
        }
        indices.push(2*n*(i+1)+1,   2*n*i+1)
    }

    // polo norte
    const vn = verticesEsfera.length/3-1 // El último de los vértices
    for(let j = vn - 2*n; j < vn; j++) { indices.push(j, vn) }
    indices.push(vn-2*n)

    /*indices[0] = 0
    indices[1] = 20
    indices[2] = 1
    indices[3] = 21
    indices[4] = 2
    indices[5] = 22*/
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(indices), gl.STATIC_DRAW)

    VERTICES_ESFERA = indices.length / 3

    initTransformBufferAttribs(gl, transformsBuffer, transformLoc, colorLoc)
    gl.bindVertexArray(null)

    return {
        program, 
        vaos: { cuerpoVAO, orbitaVAO },
        locations: { coordLoc, colorLoc, transformLoc, viewLoc }
    }
}

/**
 * Algoritmo recursivo. Transforma un cuerpo y sus satélites, 
 * subsatélites, ..., a un array de float32. Cada cuerpo ocupa 19 floats
 * (16 para matrix de transformación y 3 para el color).
 * @param {Cuerpo[]} cuerpos Los cuerpos a convertir
 * @param {mat4} pm (parent matrix). Las transformaciones acumuladas del
 * padre, excluyendo escala. Por defecto (en raíz) es la matrix identidad.
 */
export function cuerposAFloat32(cuerpos, pm = mat4.create()) {
    const f32 = []

    cuerpos.forEach((p) => {
        let m = mat4.create()
        mat4.rotateX(m, pm, p.inclinacion)
        mat4.rotateY(m, m, p.fase)


        mat4.translate(m, m, vec3.fromValues(p.dist, 0, 0))
        mat4.rotateY(m, m, -p.fase)

        // Esta escala se usa para el tamaño del planeta, aunque
        // con un punto en 0,0,0 no afecta, sí se usa para calcular
        // el tamaño del punto. También funciona con otras geometrías
        // como una futura esfera. NOTA: escala no se transmite a sus hijos.

        let escalada = mat4.scale(
            mat4.create(), m, vec3.fromValues(p.tam/10, p.tam/10, p.tam/10))


        f32.push(...escalada, ...p.color)
        f32.push(...cuerposAFloat32(p.satelites, m))
    })

    return new Float32Array(f32)
}

/**
 * Algoritmo recursivo. Obtiene la matriz de transformación de cuerpos y la
 * y la de sus satélites, subsatélites, ..., a un array de float32. Cada cuerpo
 * ocupa 19 floats (16 para matrix de transformación y 3 para el color).
 * @param {Cuerpo[]} cuerpos Los cuerpos a convertir
 * @param {mat4} pm (parent matrix). Las transformaciones acumuladas del
 * padre, excluyendo escala. Por defecto (en raíz) es la matrix identidad.
 */
export function orbitasAFloat32(cuerpos, pm = mat4.create()) {
    const f32 = []

    cuerpos.forEach((p) => {
        let m = mat4.create()
        mat4.rotateX(m, pm, p.inclinacion)
        mat4.rotateY(m, m, p.fase)

        // Nota: la escala no se transmite a sus hijos.
        let escalada = mat4.scale(
            mat4.create(), m, vec3.fromValues(p.dist, p.dist, p.dist))

        mat4.translate(m, m, vec3.fromValues(p.dist, 0, 0))
        mat4.rotateY(m, m, -p.fase)

        f32.push(...escalada, ...p.color)
        f32.push(...orbitasAFloat32(p.satelites, m))
    })

    return new Float32Array(f32)
}