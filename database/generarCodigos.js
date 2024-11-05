const { MongoClient } = require('mongodb');

// Configuración de la conexión a la base de datos
const uri = "mongodb+srv://<db_username>:<db_password>@cluster0.xvndt.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0";
const client = new MongoClient(uri);

async function generarCodigos() {
    try {
        // Conectar al cliente
        await client.connect();
        console.log("Conectado a MongoDB");

        // Seleccionar la base de datos y la colección
        const db = client.db('margarita');
        const collection = db.collection('codigos');

        // Arreglos para almacenar los códigos generados
        const codigos = [];

        // Función para generar un código único
        const generarCodigoUnico = (codigoExistente) => {
            let codigo;
            do {
                codigo = String(Math.floor(Math.random() * 1000)).padStart(3, '0'); // Generar un código entre 000 y 999
            } while (codigoExistente.includes(codigo));
            return codigo;
        };

        const codigosExistentes = await collection.find({}).toArray();
        const codigosUsados = codigosExistentes.map(c => c.codigo);

        // Generar códigos de 1,000,000
        for (let i = 0; i < 50; i++) {
            const codigo = generarCodigoUnico(codigosUsados);
            codigos.push({
                id: i + 1,
                codigo: codigo,
                monto: 1000000,
                estado: "por reclamar",
                fecha: new Date().toLocaleString('es-CO', { timeZone: 'America/Bogota' }),
            });
            codigosUsados.push(codigo); // Agregar el código a los usados
        }

        // Generar códigos de 50,000
        for (let i = 50; i < 200; i++) {
            const codigo = generarCodigoUnico(codigosUsados);
            codigos.push({
                id: i + 1,
                codigo: codigo,
                monto: 50000,
                estado: "por reclamar",
                fecha: new Date().toLocaleString('es-CO', { timeZone: 'America/Bogota' }),
            });
            codigosUsados.push(codigo); // Agregar el código a los usados
        }

        // Generar códigos de 10,000
        for (let i = 200; i < 400; i++) {
            const codigo = generarCodigoUnico(codigosUsados);
            codigos.push({
                id: i + 1,
                codigo: codigo,
                monto: 10000,
                estado: "por reclamar",
                fecha: new Date().toLocaleString('es-CO', { timeZone: 'America/Bogota' }),
            });
            codigosUsados.push(codigo); // Agregar el código a los usados
        }

        // Insertar los códigos en la colección
        const resultado = await collection.insertMany(codigos);
        console.log(`Se han insertado ${resultado.insertedCount} códigos.`);

    } catch (error) {
        console.error("Error al generar códigos:", error);
    } finally {
        // Cerrar la conexión
        await client.close();
    }
}

generarCodigos().catch(console.error);
