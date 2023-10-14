import { GUI } from "dat.gui"
import { mat4, vec3 } from "gl-matrix"


const CUERPO_DEFAULTS = {
    nombre: 'Sin nombre',
    tam: 1,
    fase: 0,
    inclinacion: 0,
    color: [1, 0, 1],
    distancia: 0,
    velocidad: 1,
    autoiluminado: false
}

/**
 * Representa un cuerpo de órbita completamente circular y color sólido que
 * puede tener satélites.
 */
export class Cuerpo {
    /**
     * @param {object} opciones
     * @param {string} opciones.nombre Nombre del cuerpo.
     * @param {number} opciones.distancia Distancia al cuerpo que orbita.
     * @param {number} opciones.inclinacion grado de inclinación (-pi/2 a pi/2)
     * @param {[number, number, number]} opciones.color 
     * @param {number} opciones.tam Tamaño del cuerpo
     * @param {number} opciones.velocidad Velocidad en vueltas completas por segundo.
     * @param {number} opciones.fase En qué momento de su órbita está (0 a 2*pi).
     * @param {boolean} opciones.autoiluminado En qué momento de su órbita está (0 a 2*pi).
     */
    constructor(opciones) {
        opciones = {...CUERPO_DEFAULTS, ...opciones}
        this.nombre      = opciones.nombre
        this.dist        = opciones.distancia
        this.inclinacion = opciones.inclinacion
        this.color       = opciones.color
        this.velocidad   = opciones.velocidad
        this.fase        = opciones.fase
        this.tam         = opciones.tam
        this.autoiluminado = opciones.autoiluminado

        /**  @type {Cuerpo[]} */
        this.satelites = []
    }

    /**
     * @param {number} delta Tiempo en ms desde el último frame
     */
    update(delta) {
        const inc = this.velocidad * delta / 1000 * 2*Math.PI
        this.fase = (this.fase + inc) % (2 * Math.PI)
        this.satelites.forEach(s => s.update(delta))
    }

    addSatelite(...satelites) {
        this.satelites.push(...satelites)
    }

    /**
     * Devuelve la cuenta de cuerpos (contando este) que orbitan a este o a
     * sus satélites, subsatélites, etc...
     * @returns número de cuerpos en este sistema (contado este)
     */
    calcularTotalCuerposRecursivo() {
        return this.satelites.reduce((p, c)=>p+c.calcularTotalCuerposRecursivo(), 1)
    }
}


/**
 * Gestiona toda la interacción. También la cámara y GUI.
 * ¿Principio de responsabilidad única? xd...
 */
export class InputSystem {
    /**
     * @param {WebGL2RenderingContext} gl
     * @param {Cuerpo} estrella Cuerpo central, que contiene a todos los otros.
     *                          como satélites.
     */
    constructor(gl, estrella) {
        this.gl = gl
        this.canvas = gl.canvas

        this.camara = {
            rotacionX: 0,
            rotacionY: 1.65,
            rotacionZ: 0,
            x: 0,
            y: 0,
            z: -2.42
        }

        this._setupListeners()
        const gui = this._setupGUI()
        this._addCuerpoAGUI(gui, estrella)
        this.onResize()
    }

    get viewMatrix() {
        const aspect = this.canvas.width / this.canvas.height;
        const near = 0.1;
        const far = 100;
        
        const matrizProyeccion = mat4.perspective(mat4.create(), Math.PI/3, aspect, near, far);
        const matrizCamara = mat4.fromTranslation(mat4.create(), 
            vec3.fromValues(this.camara.x, this.camara.y, this.camara.z))

        mat4.rotateX(matrizCamara, matrizCamara, this.camara.rotacionX)
        mat4.rotateY(matrizCamara, matrizCamara, this.camara.rotacionY)
        mat4.rotateZ(matrizCamara, matrizCamara, this.camara.rotacionZ)

        return mat4.mul(matrizCamara, matrizProyeccion, matrizCamara)
    }

    update() { }

    onResize() {
        this.canvas.width = window.innerWidth
        this.canvas.height = window.innerHeight
        this.gl.viewport(0, 0, this.canvas.width, this.canvas.height)
    }

    _setupGUI() {
        const gui = new GUI()
        gui.domElement.style.opacity = 0.8
        const cameraFolder = gui.addFolder('Cámara')
        const controlX = cameraFolder.add(this.camara, 'rotacionX', 0, Math.PI, 0.05)
        const controlZ = cameraFolder.add(this.camara, 'rotacionY', 0, Math.PI, 0.05)
        controlX.name('Rotación X')
        controlZ.name('Rotación Y')
        const controlZoom = cameraFolder.add(this.camara, 'z', -50, -1, 0.01)
        controlZoom.name('Zoom');
        cameraFolder.open()

        const cuerposGUI = new GUI({autoPlace: false})
        document.body.appendChild(cuerposGUI.domElement)
        cuerposGUI.domElement.classList.add('gui-cuerpos')
        return cuerposGUI
    }

    /**
     * @param {GUI} folder
     * @param {Cuerpo} cuerpo 
     */
    _addCuerpoAGUI(folder, cuerpo) {
        const cuerpoF = folder.addFolder(cuerpo.nombre)
        
        this._addControladorColor(cuerpoF, cuerpo)

        cuerpoF.add(cuerpo, 'tam', 0.5, 10, 0.1).name('Tamaño')
        if (cuerpo.dist > 0) {
            cuerpoF.add(cuerpo, 'dist', 0.1, 10, 0.1).name('Distancia')
            cuerpoF.add(cuerpo, 'inclinacion', 0, Math.PI, 0.01)
            cuerpoF.add(cuerpo, 'velocidad', -1, 1, 0.05).name('Vueltas/s')
        } else {
            cuerpoF.open()
        }

        folder.domElement.parentNode.querySelectorAll(':scope .cr').forEach((c)=>{
            c.style.borderLeft = 'none'
        })

        cuerpo.satelites.forEach((s)=>{
            this._addCuerpoAGUI(cuerpoF, s)
        })
    }

    /**
     * @param {GUI} folder 
     * @param {Cuerpo} cuerpo
     */
    _addControladorColor(folder, cuerpo) {
        const colorStr = `rgb(${cuerpo.color.map(c => c*255).join(',')})`
        folder.domElement.style.borderTop = `0.2rem solid ${colorStr}`
    
        const colorControl = folder.addColor({Color: colorStr}, 'Color')
        colorControl.onChange((v) => {
            const comps = v.substring(4, v.indexOf(')')).split(',')
            cuerpo.color = comps.map(c => c / 255)
            folder.domElement.style.borderTop = `0.2rem solid ${v}`
        })
    }

    _setupListeners() {
        window.addEventListener('resize', this.onResize.bind(this))
    }
}
