require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');

const app = express();
app.use(express.json());
app.use(cors());

// Configurar PostgreSQL (modifica con tus datos)
const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
  ssl: { rejectUnauthorized: false }  // Agregar SSL para Render
});

// Crear la tabla productos si no existe
async function createTable() {
  const client = await pool.connect();
  try {
    const createTableQuery = `
      CREATE TABLE IF NOT EXISTS productos (
        id SERIAL PRIMARY KEY,
        title VARCHAR(255),
        quantity INTEGER,
        price DECIMAL,
        description TEXT,
        external_ref VARCHAR(255),
        payment_link TEXT,
        qr_link TEXT
      );
    `;
    await client.query(createTableQuery);
    console.log('Tabla productos creada o ya existe.');
  } catch (error) {
    console.error('Error creando la tabla:', error);
  } finally {
    client.release();
  }
}

// Ejecutar la creación de la tabla al inicio
createTable();

// Ruta para guardar productos
app.post("/api/productos", async (req, res) => {
  try {
    const { title, quantity, price, description, external_ref, paymentLink, qrLink } = req.body;
    
    const result = await pool.query(
      "INSERT INTO productos (title, quantity, price, description, external_ref, payment_link, qr_link) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *",
      [title, quantity, price, description, external_ref, paymentLink, qrLink]
    );

    res.json({ message: "Producto guardado", data: result.rows[0] });
  } catch (error) {
    console.error("Error al guardar el producto:", error);
    res.status(500).json({ error: "Error en el servidor" });
  }
});






// Crear la tabla productos si no existe
async function createTable() {
  const client = await pool.connect();
  try {
    const createTableQuery = `
      CREATE TABLE IF NOT EXISTS inventario_general (
  id SERIAL PRIMARY KEY,
  nombre_producto VARCHAR(255),
  cantidad INT,
  fecha_ingreso DATE,
  ubicacion VARCHAR(255),
  descripcion TEXT
      );
    `;
    await client.query(createTableQuery);
    console.log('Tabla productos creada o ya existe.');
  } catch (error) {
    console.error('Error creando la tabla:', error);
  } finally {
    client.release();
  }
}

// Ejecutar la creación de la tabla al inicio
createTable();









// Ruta para guardar inventario general
app.post("/api/inventario-general", async (req, res) => {
  try {
    const { nombre_producto, cantidad, fecha_ingreso, ubicacion, descripcion } = req.body;

    const result = await pool.query(
      "INSERT INTO inventario_general (nombre_producto, cantidad, fecha_ingreso, ubicacion, descripcion) VALUES ($1, $2, $3, $4, $5) RETURNING *",
      [nombre_producto, cantidad, fecha_ingreso, ubicacion, descripcion]
    );

    res.json({ message: "Inventario agregado", data: result.rows[0] });
  } catch (error) {
    console.error("Error al agregar inventario:", error);
    res.status(500).json({ error: "Error en el servidor" });
  }
});













// Iniciar servidor
const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`Servidor corriendo en el puerto ${PORT}`));
