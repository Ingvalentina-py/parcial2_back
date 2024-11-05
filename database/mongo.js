const { MongoClient, ServerApiVersion } = require('mongodb');
require('dotenv').config();

const uri = process.env.MONGO_URI; // Asegúrate de que esta línea esté primero
const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});

let db; // Variable para almacenar la referencia de la base de datos

// Función para conectar a la base de datos
const connectDb = async () => {
    if (!db) { // Solo intenta conectarse si no hay una conexión existente
        try {
            await client.connect();
            db = client.db('test'); // Cambia 'margarita' por el nombre de tu base de datos
            console.log('Se conectó a MongoDB');
        } catch (error) {
            console.error('Error al conectar a MongoDB:', error);
            throw error; // Lanza el error para manejarlo donde se llame
        }
    }
    return db; // Devuelve la referencia de la base de datos
};

// Función para obtener la referencia de la base de datos
const getDb = () => {
    if (!db) {
        throw new Error('La base de datos no ha sido inicializada. Asegúrate de llamar a connectDb primero.');
    }
    return db; // Devuelve la referencia de la base de datos
};

// Exporta las funciones connectDb y getDb
module.exports = { connectDb, getDb, client };
