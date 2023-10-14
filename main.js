import { InputSystem, Cuerpo } from './models.js';
import { VERTICES_ESFERA, VERTICES_POR_CIRCULO, createRenderObjects, cuerposAFloat32, orbitasAFloat32 } from './rendering/rendering.js';



/** @type {WebGL2RenderingContext} */
const gl = document.querySelector('#p5-canvas').getContext('webgl2')

const renderObjects              = createRenderObjects(gl)
const {orbitaVAO, cuerpoVAO}     = renderObjects.vaos
const {viewLoc, ambientLightLoc} = renderObjects.locations


const star = new Cuerpo({
    nombre: 'Estrella', tam: 10, color: [5,5,0], autoiluminado: true
})

const p1 = new Cuerpo({
    nombre: 'Planeta 1',  distancia: 1.25,  color: [1,0.5,1], 
    tam: 1.5,             velocidad: 0.2,    fase: -Math.PI/2})

const p2 = new Cuerpo({
    nombre: 'Planeta 2',  distancia: 2,        color: [0.4,0.7,1], 
    tam: 2,               velocidad: -0.15,    fase: Math.PI/2})

const p3 = new Cuerpo({
    nombre: 'Planeta 3',  distancia: 3,        color: [1,0.6,0.6], 
    tam: 2.5,             velocidad: 0.1,      fase: Math.PI/3})

const p4 = new Cuerpo({
    nombre: 'Planeta 4',  distancia: 4.5,        color: [0.6,1,0.6], 
    tam: 3.5,             velocidad: -0.05,    fase: -Math.PI/2})

const p5 = new Cuerpo({
    nombre: 'Planeta 5',  distancia: 6,        color: [0.7,0.7,1], 
    tam: 1,               velocidad: 0.03,     fase: -Math.PI/4, 
    inclinacion: Math.PI/8})

const luna = new Cuerpo({
    nombre: 'Luna',       distancia: 1,        color: [1,1,1], 
    tam: 1.5,             velocidad: 0.1,     fase: -Math.PI/4, 
    inclinacion: -Math.PI/8
})

const subluna = new Cuerpo({
    nombre: 'Luna',       distancia: 0.5,       color: [1,0.4,0.4], 
    tam: 1,               velocidad: -0.2,      fase: -Math.PI/4, 
    inclinacion: Math.PI/4
})

star.addSatelite(p1, p2, p3, p4, p5)
p4.addSatelite(luna)
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
    gl.uniform3f(ambientLightLoc, 0, 0, 0)

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