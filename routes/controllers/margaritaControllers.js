const fs = require('fs/promises'); // Importa el módulo de archivos (opcional, dependiendo de tu lógica)
const path = require('path'); // Importa el módulo de rutas (opcional, dependiendo de tu lógica)
const CryptoJS = require('crypto-js');
const pool = require('../../database/mongo'); // Asegúrate de que la conexión a la base de datos está bien
const moment = require('moment-timezone'); // Importa moment-timezone una sola vez
const { ObjectId } = require('mongodb');
const { connectDb, getDb } = require('../../database/mongo'); 


const login = async (req, res) => {
    const datos = req.body; 
    console.log("Datos recibidos:", datos); 

    const hashedPassword = CryptoJS.SHA256(datos.password, process.env.CODE_SECRET_DATA).toString();
    console.log("SIN ENCRIPTAR: ", datos.password);
    console.log("HACKEO: ", hashedPassword);

    try {
        await connectDb(); // Conectar a la base de datos
        const db = getDb(); // Obtener la referencia a la base de datos
        const login = await db.collection('users').findOne({
            correo: datos.email, // Cambiado de email a correo
            password: hashedPassword
        });

        if (login) {
            res.json({ status: "Bienvenido", userId: login._id, role: login.role });
        } else {
            res.json({ status: "ErrorCredenciales" });
        }
    } catch (error) {
        console.error('Error al iniciar sesión:', error);
        res.status(500).json({ status: "Error", message: "Internal Server Error" });
    }
};

// Lógica de registro
const register = async (req, res) => {
  const { nombre, fecha, cedula, correo, celular, ciudad, contraseña } = req.body;

  const hashedPassword = CryptoJS.SHA256(contraseña, process.env.CODE_SECRET_DATA).toString();

  try {
      await connectDb(); // Conectar a la base de datos
      const db = getDb(); // Obtener la referencia a la base de datos

      const existingUser = await db.collection('users').findOne({ correo });
      if (existingUser) {
          return res.status(400).json({ status: "Error", message: "El correo ya está en uso" });
      }

      const newUser = {
          nombre,
          fecha,
          cedula,
          correo,
          celular,
          ciudad,
          password: hashedPassword,
          role: 'user'
      };

      await db.collection('users').insertOne(newUser);
      res.status(201).json({ status: "Éxito", message: "Usuario registrado correctamente" });
  } catch (error) {
      console.error('Error al registrar el usuario:', error);
      res.status(500).json({ status: "Error", message: "Internal Server Error" });
  }
};

// Lógica para reclamar código
const reclamarCodigo = async (req, res) => {
    const { userId, codigo } = req.body;
    console.log("Datos recibidos para reclamar código:", req.body);

    try {
        await connectDb(); // Conectar a la base de datos
        const db = getDb(); // Obtener la referencia a la base de datos
        const codigosCollection = db.collection('codigos');
        const usersCollection = db.collection('users');
        const reclamosCollection = db.collection('reclamos');

        // Convertir userId a ObjectId
        const userObjectId = new ObjectId(userId); 

        // Verificar si el usuario existe
        const usuario = await usersCollection.findOne({ _id: userObjectId });
        if (!usuario) {
            await reclamosCollection.insertOne({
                userId: usuario ? usuario._id : userObjectId,
                codigo,
                montoGanado: 0,
                fechaReclamo: moment().tz("America/Bogota").format("YYYY-MM-DD HH:mm:ss"),
                estado: "Error: El usuario no existe."
            });
            return res.status(400).json({ status: "Error", message: "El usuario no existe." });
        }

        // Verificar el código
        const codigoReclamado = await codigosCollection.findOne({ codigo });
        if (!codigoReclamado) {
            await reclamosCollection.insertOne({
                userId: usuario._id,
                codigo,
                montoGanado: 0,
                fechaReclamo: moment().tz("America/Bogota").format("YYYY-MM-DD HH:mm:ss"),
                estado: "Error: Código no válido."
            });
            return res.status(400).json({ status: "Error", message: "Código no válido." });
        }
        if (codigoReclamado.estado !== "por reclamar") {
            await reclamosCollection.insertOne({
                userId: usuario._id,
                codigo,
                montoGanado: 0,
                fechaReclamo: moment().tz("America/Bogota").format("YYYY-MM-DD HH:mm:ss"),
                estado: "Error: Este código ya fue reclamado."
            });
            return res.status(400).json({ status: "Error", message: "Este código ya fue reclamado." });
        }

        const montoGanado = codigoReclamado.monto; 
        const nuevaFecha = moment().tz("America/Bogota").format("YYYY-MM-DD HH:mm:ss");

        await codigosCollection.updateOne(
            { codigo },
            {
                $set: {
                    estado: `reclamado por ${userId}`, 
                    fechaReclamo: nuevaFecha 
                }
            }
        );

        await reclamosCollection.insertOne({
            userId: usuario._id,
            codigo,
            montoGanado,
            fechaReclamo: nuevaFecha,
            estado: "reclamado"
        });

        res.status(201).json({
            status: "Éxito",
            message: `¡Ganaste! Monto: $${montoGanado}`,
            userId: usuario._id
        });
    } catch (error) {
        console.error('Error al reclamar código:', error);
        res.status(500).json({ status: "Error", message: "Error en el servidor" });
    }
};

const obtenerHistorial = async (req, res) => {
    const { userId } = req.params; // Asumiendo que userId se pasa como parámetro de la URL
    console.log("Obteniendo historial para el usuario:", userId);

    try {
        await connectDb(); // Conectar a la base de datos
        const db = getDb(); // Obtener la referencia a la base de datos
        const reclamosCollection = db.collection('reclamos');

        // Convertir userId a ObjectId para la búsqueda
        const historial = await reclamosCollection.find({ userId: new ObjectId(userId) }).toArray();

        if (historial.length === 0) {
            return res.status(404).json({ status: "Error", message: "No hay historial de reclamos para este usuario." });
        }

        // Formatear el historial para una respuesta más clara
        const respuestaHistorial = historial.map(reclamo => ({
            codigo: reclamo.codigo,
            montoGanado: reclamo.montoGanado,
            estado: reclamo.estado,
            fechaReclamo: reclamo.fechaReclamo
        }));

        res.status(200).json({ status: "Éxito", historial: respuestaHistorial });
    } catch (error) {
        console.error('Error al obtener historial de reclamos:', error);
        res.status(500).json({ status: "Error", message: "Error en el servidor" });
    }
};
const registerAdmin = async (req, res) => {
    const { username, password } = req.body; // Cambiado a username

    const hashedPassword = CryptoJS.SHA256(password, process.env.CODE_SECRET_DATA).toString();

    try {
        await connectDb(); // Conectar a la base de datos
        const db = getDb(); // Obtener la referencia a la base de datos

        const existingAdmin = await db.collection('admins').findOne({ username }); // Busca en la colección de admins
        if (existingAdmin) {
            return res.status(400).json({ status: "Error", message: "El nombre de usuario ya está en uso" });
        }

        const newAdmin = {
            username,
            password: hashedPassword,
            role: 'admin'
        };

        await db.collection('admins').insertOne(newAdmin);
        res.status(201).json({ status: "Éxito", message: "Administrador registrado correctamente" });
    } catch (error) {
        console.error('Error al registrar el administrador:', error);
        res.status(500).json({ status: "Error", message: "Internal Server Error" });
    }
};
const loginAdmin = async (req, res) => {
    const { username, password } = req.body; // Cambiado a username
    console.log("Datos recibidos:", { username, password }); 

    const hashedPassword = CryptoJS.SHA256(password, process.env.CODE_SECRET_DATA).toString();
    console.log("SIN ENCRIPTAR: ", password);
    console.log("HACKEO: ", hashedPassword);

    try {
        await connectDb(); // Conectar a la base de datos
        const db = getDb(); // Obtener la referencia a la base de datos
        const login = await db.collection('admins').findOne({ // Busca en la colección de admins
            username,
            password: hashedPassword
        });

        if (login) {
            res.json({ status: "Bienvenido", userId: login._id, role: login.role });
        } else {
            res.json({ status: "ErrorCredenciales" });
        }
    } catch (error) {
        console.error('Error al iniciar sesión:', error);
        res.status(500).json({ status: "Error", message: "Internal Server Error" });
    }
};

const obtenerGanadores = async (req, res) => {
    try {
        await connectDb(); // Conectar a la base de datos
        const db = getDb(); // Obtener la referencia a la base de datos
        const reclamosCollection = db.collection('reclamos');
        const ganadoresCollection = db.collection('ganadores'); // Asegúrate de que existe esta colección

        // Buscar todos los reclamos con estado "reclamado"
        const ganadores = await reclamosCollection.find({ estado: "reclamado" }).toArray();

        if (ganadores.length === 0) {
            return res.status(404).json({ status: "Error", message: "No hay ganadores registrados." });
        }

        // Formatear los ganadores para una respuesta más clara
        const respuestaGanadores = ganadores.map(ganador => ({
            userId: ganador.userId, // ID del usuario
            codigo: ganador.codigo,
            monto: ganador.montoGanado,
            fecha: ganador.fechaReclamo
        }));

        // Insertar o actualizar en la colección de ganadores
        for (const ganador of respuestaGanadores) {
            await ganadoresCollection.updateOne(
                { userId: ganador.userId, codigo: ganador.codigo }, // Condición para evitar duplicados
                { $set: ganador },
                { upsert: true } // Si no existe, lo crea
            );
        }

        res.status(200).json({ status: "Éxito", ganadores: respuestaGanadores });
    } catch (error) {
        console.error('Error al obtener ganadores:', error);
        res.status(500).json({ status: "Error", message: "Error en el servidor" });
    }
};

    
// Exporta las funciones
module.exports = {
    login,
    register,
    reclamarCodigo,
    obtenerHistorial,
    registerAdmin,
    loginAdmin,
    obtenerGanadores
};