const express = require('express');
const { urlencoded, json } = require('express');
const cors = require('cors');
const router = require('./routes/userRoutes');
const { connectDb } = require('./config/db'); // Importa connectDb
require('dotenv').config();

const app = express();

// Configuración de CORS
const corsOptions = {
    origin: 'https://parcial-front-jade.vercel.app', // Cambia a tu URL de frontend en Vercel
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true
};

app.use(cors(corsOptions)); // Aplica el middleware de CORS una vez

// Middleware para procesar JSON y URL-encoded
app.use(express.json());
app.use(urlencoded({ extended: true }));

// Ruta raíz
app.get('/', (req, res) => {
    res.send("API en funcionamiento");
});

// Rutas de usuario
app.use('/api/users', router);

// Conectar a la base de datos y iniciar el servidor
connectDb().then(() => {
    const port = process.env.PORT || 4000;
    app.listen(port, () => {
        console.log(`Servidor corriendo en el puerto ${port}`);
    });
}).catch((error) => {
    console.error("Error al iniciar el servidor:", error);
});