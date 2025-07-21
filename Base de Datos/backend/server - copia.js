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

// Iniciar servidor
const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`Servidor corriendo en el puerto ${PORT}`));
