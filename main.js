import vertexShaderSrc from './shaders/p3_vertex.glsl.js'
import fragmentShaderSrc from './shaders/p3_fragment.frag.js'
import { createShader, createAndLinkProgram } from './utils.js';
import { InputSystem, Cuerpo } from './models.js';

/** @type {HTMLCanvasElement} */
const canvas = document.querySelector('#p3-canvas')
/** @type {WebGL2RenderingContext} */
let gl = canvas.getContext('webgl2')

let orbitaVAO, cuerpoVAO
let viewLoc
const VERTICES_POR_CIRCULO = 60

/**
 * Razón de este método:
 *  · Resulta que un VAO captura el estado de un buffer de vértices incluyendo
 *    sus atributos definidos en otros buffers, hasta ahí todo ok.
 *  · ¿Qué pasa si quiero reutilizar un mismo buffer de transformaciones o 
 *    atributos para alimentar las instancias de 2 conjuntos de vértices 
 *    distintos?
 * 
 * Respuesta: este método
 *  · Aunque no es necesario duplicar el buffer de transformaciones, sí parece
 *    ser necesario repetir el código para definir sus atributos. Métodos como
 *    este surgen por necesidad de evitar código repetido.
 */
function initTransformBufferAttribs(transformsBuffer, transformLoc, colorLoc) {
    gl.bindBuffer(gl.ARRAY_BUFFER, transformsBuffer)
    
    /**
     * Descubrimiento: resulta que cuando quieres transferir matrices 4x4 por
     * atributos, ocupan 4 locations que hay que definir y habilitar. De locos.
     */
    for(let i = 0; i < 4; i++) {
        gl.vertexAttribPointer(transformLoc+i, 4, gl.FLOAT, false, 76, i*16)
        gl.enableVertexAttribArray(transformLoc+i)
        gl.vertexAttribDivisor(transformLoc+i, 1)
    }
    gl.vertexAttribPointer(colorLoc, 3, gl.FLOAT, false, 76, 64)
    gl.enableVertexAttribArray(colorLoc)
    gl.vertexAttribDivisor(colorLoc, 1)
}

function renderInit() {
    gl.clearColor(0.2, 0.2, 0.2, 1.0)
    gl.viewport(0, 0, canvas.width, canvas.height)
    gl.enable(gl.DEPTH_TEST);

    const vs = createShader(gl, gl.VERTEX_SHADER, vertexShaderSrc)
    const fs = createShader(gl, gl.FRAGMENT_SHADER, fragmentShaderSrc)
    const program = createAndLinkProgram(gl, vs, fs)
    gl.useProgram(program)

    viewLoc = gl.getUniformLocation(program, 'uView')
    const transformLoc = gl.getAttribLocation(program, 'aTransform')
    const colorLoc  = gl.getAttribLocation(program, 'aColor')
    const coordLoc = gl.getAttribLocation(program, 'aCoords')

    // ============         VERTEX DE LAS ÓRBITAS          ====================
    // Usando instanciación como en la anterior entrega.
    orbitaVAO = gl.createVertexArray()
    gl.bindVertexArray(orbitaVAO)
    const orbitaVertexBuffer = gl.createBuffer()
    let vertices = []
    for(let i = 0; i < VERTICES_POR_CIRCULO; i++) {
        const angulo = (i / VERTICES_POR_CIRCULO) * 2 * Math.PI
        vertices.push(Math.cos(angulo), Math.sin(angulo), 0)
    }
    gl.bindBuffer(gl.ARRAY_BUFFER, orbitaVertexBuffer)
    gl.enableVertexAttribArray(coordLoc)
    gl.vertexAttribPointer(coordLoc, 3, gl.FLOAT, false, 12, 0)
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW)

    // =============   BUFFER DE TRANSFORMACIONES Y COLORES =================
    const transformsBuffer = gl.createBuffer()
    // Como se usa el mismo buffer también para transform/colores de planetas
    // hay que definir los mismos atributos en dos ocasiones. Por eso un método.
    initTransformBufferAttribs(transformsBuffer, transformLoc, colorLoc)
    gl.bindVertexArray(null)

    cuerpoVAO = gl.createVertexArray()
    gl.bindVertexArray(cuerpoVAO)
    const planetaVertexBuffer = gl.createBuffer()
    gl.bindBuffer(gl.ARRAY_BUFFER, planetaVertexBuffer)
    gl.enableVertexAttribArray(coordLoc)
    gl.vertexAttribPointer(coordLoc, 3, gl.FLOAT, false, 12, 0)
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([0,0,0]), gl.STATIC_DRAW)
    initTransformBufferAttribs(transformsBuffer, transformLoc, colorLoc)
    gl.bindVertexArray(null)
    //////////////////////////////////////////////////////////////////////
}


                    //              Dist.  Inclin.         Color    Tam.  Vel.  Fase
const star  = new Cuerpo('Estrella',   0,     0,         [1,  1,  0], 6,       0, 0)
const lila  = new Cuerpo('Planeta 1',  1.25,  0,         [1,0.5,  1], 1.5,   0.2, -Math.PI/2)
const azul  = new Cuerpo('Planeta 2',  2,     0,         [0.4,0.7,1], 2,   -0.15,  Math.PI)
const rojo  = new Cuerpo('Planeta 3',  3,     0,         [1,0.6,0.6], 2.5,   0.1,  Math.PI/3)
const verde = new Cuerpo('Planeta 4',  4,     0,         [0.6,1,0.6], 3.5, -0.05, -Math.PI/2)
const lejos = new Cuerpo('Planeta 5',  5.5,  Math.PI/8,  [0.7,0.7,1], 1,    0.03, -Math.PI/2)

const luna  = new Cuerpo('Luna',        1,-Math.PI/8, [1, 1, 1],     1,  0.1, 0)
const subluna = new Cuerpo('Subluna', 0.5,-Math.PI/4, [1, 0.4, 0.4], 1, -0.2, Math.PI)
star.addSatelite(lila, azul, rojo, verde, lejos)
verde.addSatelite(luna)
luna.addSatelite(subluna)

const inputSystem = new InputSystem(gl, star)

let lastTimestamp = Date.now()
function updateAndRender() {
    // Tiempo en ms transcurrido desde última llamada, acotado a 66ms.
    // Me aseguro que funcione a velocidad similar en todos los equipos.
    const now = Date.now()
    const delta = Math.min(66, now - lastTimestamp)
    lastTimestamp = now
    //////////////////////////////////////////////////////////////////////
    star.update(delta)

    gl.clear(gl.COLOR_BUFFER_BIT)
    gl.uniformMatrix4fv(viewLoc, false, inputSystem.viewMatrix)

    // Estado: vertex de órbitas. Buffer bindeado: el de transforms/colors.
    gl.bindVertexArray(orbitaVAO)
    gl.bufferData(gl.ARRAY_BUFFER, Cuerpo.orbitasAFloat32([star]), gl.STATIC_DRAW)
    const totalCuerpos = star.calcularTotalCuerposRecursivo()
    gl.drawArraysInstanced(gl.LINE_LOOP, 0, VERTICES_POR_CIRCULO, totalCuerpos)

    // Estado: vertex de puntos. Buffer bindeado: el de transforms/colors.
    gl.bindVertexArray(cuerpoVAO)
    gl.bufferData(gl.ARRAY_BUFFER, Cuerpo.cuerposAFloat32([star]), gl.STATIC_DRAW)
    gl.drawArraysInstanced(gl.POINTS, 0, 1, totalCuerpos)
    ////////////////////////////////////////////////////////////////////////////

    requestAnimationFrame(updateAndRender)
}

renderInit()
updateAndRender()