import { InputSystem, Cuerpo } from './models.js';
import { VERTICES_ESFERA, VERTICES_POR_CIRCULO, createRenderObjects, cuerposAFloat32, orbitasAFloat32 } from './rendering/rendering.js';



/** @type {WebGL2RenderingContext} */
const gl = document.querySelector('#p5-canvas').getContext('webgl2')

const renderObjects          = createRenderObjects(gl)
const {orbitaVAO, cuerpoVAO} = renderObjects.vaos
const {viewLoc}              = renderObjects.locations

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
    const now = Date.now()
    const delta = Math.min(33, now - lastTimestamp)
    lastTimestamp = now
    //////////////////////////////////////////////////////////////////////
    star.update(delta)

    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT)
    gl.uniformMatrix4fv(viewLoc, false, inputSystem.viewMatrix)

    gl.bindVertexArray(orbitaVAO)
    gl.bufferData(gl.ARRAY_BUFFER, orbitasAFloat32([star]), gl.STATIC_DRAW)
    const totalCuerpos = star.calcularTotalCuerposRecursivo()
    gl.drawArraysInstanced(gl.LINE_LOOP, 0, VERTICES_POR_CIRCULO, totalCuerpos)

    gl.bindVertexArray(cuerpoVAO)
    gl.bufferData(gl.ARRAY_BUFFER, cuerposAFloat32([star]), gl.STATIC_DRAW)
    //gl.drawArraysInstanced(gl.POINTS, 0, VERTICES_ESFERA, totalCuerpos)
    /*gl.drawElementsInstanced(
        gl.POINTS, VERTICES_ESFERA*3, 
        gl.UNSIGNED_SHORT, 0, totalCuerpos)*/

    gl.drawElementsInstanced(
        gl.TRIANGLE_STRIP, VERTICES_ESFERA*3, 
        gl.UNSIGNED_SHORT, 0, totalCuerpos)
    ////////////////////////////////////////////////////////////////////////////

    requestAnimationFrame(updateAndRender)
}

updateAndRender()