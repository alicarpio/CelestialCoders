import * as THREE from 'three';
import Trajectory from '../components/Trajectory.ts';

// Crear un grupo para los asteroides
const asteroids = new THREE.Group();
let asteroidLabels: Trajectory[] = []; // Aquí guardamos las trayectorias

// Función para cargar asteroides desde la API y crear las órbitas
async function fetchAsteroids(scene: THREE.Scene) {
    try {
        const response = await fetch("https://data.nasa.gov/resource/b67r-rgxc.json");
        const data = await response.json();
        const trajectories: Trajectory[] = [];

        data.slice(0, 15).forEach((item: any) => {
            const name = item.object;
            const smA = (parseFloat(item.q_au_1) + parseFloat(item.q_au_2)) / 2;
            const oI = parseFloat(item.i_deg);
            const aP = parseFloat(item.w_deg);
            const oE = parseFloat(item.e);
            const aN = parseFloat(item.node_deg);
            const period = parseFloat(item.p_yr);

            const epoch_tdb = parseFloat(item.epoch_tdb);
            const tp_tdb = parseFloat(item.tp_tdb);
            const mAe = calculateMeanAnomaly(epoch_tdb, tp_tdb, period);

            const trajectory = new Trajectory(name, smA, oI, aP, oE, aN, mAe);
            trajectories.push(trajectory);
        });

        asteroidLabels = trajectories; // Guardar las trayectorias en la lista global

        // Dibujar órbitas de los asteroides
        asteroidLabels.forEach((asteroid) => {
            const points = [];
            const segments = 100; // Cantidad de segmentos para la órbita

            for (let i = 0; i <= segments; i++) {
                const angle = (i / segments) * Math.PI * 2;
                const position = asteroid.propagate(angle);
                points.push(new THREE.Vector3(position[0] * 100, position[1] * 100, position[2] * 100)); // Escalado
            }

            const geometry = new THREE.BufferGeometry().setFromPoints(points);
            const material = new THREE.LineBasicMaterial({ color: 0x888888 });
            const orbitLine = new THREE.Line(geometry, material);
            scene.add(orbitLine); // Añadir la órbita de cada asteroide
        });

        // Añadir el grupo de asteroides a la escena después de cargar los datos
        return asteroids; // Retorna el grupo de asteroides
    } catch (error) {
        console.error("Error al obtener los datos de asteroides:", error);
    }
}

// Función para actualizar la posición de los asteroides
function updateAsteroids(timeDelta: number) {
    // Limpiar los asteroides anteriores
    while (asteroids.children.length) {
        asteroids.remove(asteroids.children[0]);
    }

    // Añadir los asteroides con nuevas posiciones
    asteroidLabels.forEach((asteroid) => {
        const [x, y, z] = asteroid.propagate(timeDelta); // Propagar las posiciones en función del timeDelta
        const mesh = createAsteroidMesh();

        // Ajustar la escala para alejar los asteroides del Sol
        mesh.position.set(x * 100, y * 100, z * 100); // Escalar para mantener proporciones
        asteroids.add(mesh); // Añadir la malla del asteroide al grupo
    });
}

// Crear la malla de un asteroide
function createAsteroidMesh(): THREE.Mesh {
    const geometry = new THREE.SphereGeometry(1.6, 32, 32); // Tamaño pequeño
    const material = new THREE.MeshPhongMaterial({
        color: 0x888888,  // Color gris
        shininess: 50,    // Hace que el asteroide brille más
        specular: 0xaaaaaa,  // Añade un poco de brillo especular (reflejo)
    });
    return new THREE.Mesh(geometry, material);
}

// Función auxiliar para calcular la anomalía media
function calculateMeanAnomaly(epoch_tdb: number, tp_tdb: number, p_yr: number): number {
    const days_per_year = 365.25;
    const P_days = p_yr * days_per_year;
    const delta_t = epoch_tdb - tp_tdb;
    let M = ((2 * Math.PI) / P_days) * delta_t;
    M = M % (2 * Math.PI);
    if (M < 0) M += 2 * Math.PI;
    return M;
}

export function useAsteroids() {
    return {
        asteroids, // Grupo de asteroides que se añade a la escena
        fetchAsteroids, // Cargar asteroides desde la API
        updateAsteroids, // Actualizar asteroides en cada frame
    };
}