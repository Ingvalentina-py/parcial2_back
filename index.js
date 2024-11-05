const express = require('express');
const { urlencoded, json } = require('express');
const pool = require('./database/mongo');
const router = require('./routes/margarita.routes.js');
const cors = require('cors');
require('dotenv').config();


const app = express();

// Middleware para analizar datos codificados y JSON
app.use(urlencoded({ extended: true }));
app.use(json());
app.use(cors());

// Manejador para la ruta raíz
app.get('/', (req, res) => {
    res.send('Bienvenido al backend de Kevin!');
});

// Manejador para la ruta GET que imprime un mensaje
app.get('/v1/signos', (req, res, next) => {
    console.log('Estás en el backend de Kevin');
    next();
});

// Usar el router para las rutas relacionadas con 'margarita'
app.use('/v1/margarita', router);

// Iniciar el servidor
const port = process.env.PORT || 4000;
app.listen(port, () => {
    console.log(`Servidor corriendo en el puerto ${port}`);
});