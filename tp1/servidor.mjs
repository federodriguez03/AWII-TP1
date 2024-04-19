import http from 'http';
import os from 'os';
import fsp from 'fs/promises';
import path from 'path';

// Puerto
const PUERTO = 3000;
// Nombre del directorio
const directorio = 'reportes';
// Constante para la duración de una semana en milisegundos
const unaSemana = 7 * 24 * 60 * 60 * 1000;

// Función para crear el directorio si no existe
const crearDirectorio = async (nombre) => {
    try {
        await fsp.mkdir(nombre);
    } catch (error) {
        if (error.code !== 'EEXIST') {
            throw error;
        }
    }
};

// Función para abrir el archivo y devolver el manejador
const abrirArchivo = async (ruta) => {
    try {
        return await fsp.open(ruta, 'a');
    } catch (error) {
        throw error;
    }
};

// Función para escribir el reporte en el archivo
const escribirReporte = async (manejador, contenido) => {
    try {
        await manejador.write(contenido);
        await manejador.close();
    } catch (error) {
        throw error;
    }
};

// Función para crear un nuevo archivo de log con el nombre correspondiente
const crearNuevoArchivo = async () => {
    const fechaActual = new Date();
    const diaSemana = fechaActual.getDay(); // Devuelve el día de la semana 
    const fechaInicioSemana = new Date(fechaActual);
    fechaInicioSemana.setDate(fechaActual.getDate() - diaSemana); // Obtener el inicio de la semana actual
    const fechaArchivo = fechaInicioSemana.toISOString().split('T')[0]; // Formatear la fecha 
    const nombreArchivo = `log-${fechaArchivo}.txt`;
    const rutaArchivo = path.join(directorio, nombreArchivo);

    await abrirArchivo(rutaArchivo); // Crear el archivo si no existe

    return rutaArchivo;
};

// Función para generar el reporte y escribirlo en el archivo correspondiente
const generarReporte = async () => {
    const rutaArchivo = await crearNuevoArchivo();
    const manejador = await abrirArchivo(rutaArchivo);

    const fechaActual = new Date();
    const inicioActividad = new Date(fechaActual - os.uptime() * 1000);
    const cpus = JSON.stringify(os.cpus());
    const memoriaTotal = os.totalmem() / 1024 / 1024;
    const memoriaLibre = os.freemem() / 1024 / 1024;
    const memoriaEnUso = memoriaTotal - memoriaLibre;
    const interfacesDeRed = JSON.stringify(os.networkInterfaces());

    const contenidoLog = `---------------------------------\n` +
        `Fecha: ${fechaActual}\n` +
        `Inicio de actividad: ${inicioActividad}\n` +
        `Tiempo de actividad: ${os.uptime()} segundos\n` +
        `Estado de los CPU: \n${cpus}\n` +
        `Memoria RAM total: ${memoriaTotal} Mb\n` +
        `Memoria RAM utilizada: ${memoriaEnUso} Mb\n` +
        `Interfaces de red: \n${interfacesDeRed}\n`;

    await escribirReporte(manejador, contenidoLog);
};

// Crear el servidor
const servidor = http.createServer(async (peticion, respuesta) => {
    if (peticion.url === '/log' && peticion.method === 'POST') {
        try {
            await generarReporte();
            respuesta.statusCode = 201;
            respuesta.end();
        } catch (error) {
            console.error(error);
            respuesta.statusCode = 500;
            respuesta.end();
        }
    } else {
        respuesta.statusCode = 404;
        respuesta.end();
    }
});

// Iniciar el servidor
servidor.listen(PUERTO, async () => {
    console.log(`Servidor escuchando en el puerto ${PUERTO}`);
    await crearDirectorio(directorio);
});