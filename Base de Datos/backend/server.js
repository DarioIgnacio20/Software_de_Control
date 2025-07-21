require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');

const app = express();
app.use(express.json());
app.use(cors());

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
  ssl: { rejectUnauthorized: false }
});

async function createTables() {
  const client = await pool.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS inventario_vending (
        ID_Poducto_IV VARCHAR(255),
        Nombre_Producto_IV VARCHAR(255),
        Cantidad_Link_Pago_IV INT,
        Precio_Venta_IV INT,
        Descripcion_IV TEXT,
        Cantidad_Cargada_IV INT,
        Numero_Vending_IV INT,
        Numero_Motor_IV INT,
        Link_Pago TEXT,
        QR_Link_Pago TEXT,
        timestamp TIMESTAMP,
        Lote_Cargado_IV,
        Precio_Compra_IV
      );

      CREATE TABLE IF NOT EXISTS inventario_total (
        Id_Producto VARCHAR(255),
        Nombre_Producto VARCHAR(255),
        Cantidad INT,
        Precio_Compra INT,
        Precio_Venta INT,
        Fecha_Compra DATE,
        Ubicacion VARCHAR(255),
        Descripcion TEXT,
        timestamp TIMESTAMP,
        Lote TEXT
      );
    `);
    console.log('Tablas creadas o ya existen.');
  } catch (error) {
    console.error('Error creando las tablas:', error);
  } finally {
    client.release();
  }
}

createTables();

app.post("/api/inventario-vending", async (req, res) => {
  const {ID_Poducto_IV, Nombre_Producto_IV, Cantidad_Link_Pago_IV, Precio_Venta_IV, Descripcion_IV, Cantidad_Cargada_IV, Numero_Vending_IV, Numero_Motor_IV, Link_Pago, QR_Link_Pago, timestamp, Lote_Cargado_IV,
        Precio_Compra_IV } = req.body;

  if (!Nombre_Producto_IV || !Cantidad_Link_Pago_IV || !Precio_Venta_IV || !Descripcion_IV) {
    return res.status(400).json({ error: "Todos los campos son obligatorios." });
  }

  try {
    const result = await pool.query(
      `INSERT INTO inventario_vending (ID_Poducto_IV, Nombre_Producto_IV, Cantidad_Link_Pago_IV, Precio_Venta_IV, Descripcion_IV, Cantidad_Cargada_IV, Numero_Vending_IV, Numero_Motor_IV,  Link_Pago, QR_Link_Pago, timestamp, Lote_Cargado_IV,
        Precio_Compra_IV) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13 ) RETURNING *`,
      [ID_Poducto_IV, Nombre_Producto_IV, Cantidad_Link_Pago_IV, Precio_Venta_IV, Descripcion_IV, Cantidad_Cargada_IV, Numero_Vending_IV, Numero_Motor_IV, Link_Pago, QR_Link_Pago, timestamp, Lote_Cargado_IV,
        Precio_Compra_IV]
    );

    res.json({ message: "Producto guardado", data: result.rows[0] });
  } catch (error) {
    console.error("Error al guardar el producto:", error);
    res.status(500).json({ error: "Error en el servidor" });
  }
});

app.post("/api/inventario-total", async (req, res) => {
  const {
    Id_Producto, Nombre_Producto, Cantidad,
    Precio_Compra, Precio_Venta, Fecha_Compra,
    Ubicacion, Descripcion, timestamp,Lote
  } = req.body;

  if (!Id_Producto || !Nombre_Producto || !Cantidad) {
    return res.status(400).json({ error: "Id_Producto, Nombre_Producto y Cantidad son obligatorios." });
  }

  try {
    const result = await pool.query(
      `INSERT INTO inventario_total 
      (Id_Producto, Nombre_Producto, Cantidad, Precio_Compra, Precio_Venta, Fecha_Compra, Ubicacion, Descripcion, timestamp, Lote) 
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *`,
      [Id_Producto, Nombre_Producto, Cantidad, Precio_Compra, Precio_Venta, Fecha_Compra, Ubicacion, Descripcion, timestamp, Lote]
    );

    res.json({ message: "Inventario agregado", data: result.rows[0] });
  } catch (error) {
    console.error("Error al agregar inventario:", error);
    res.status(500).json({ error: "Error en el servidor" });
  }
});



// Ruta para obtener el producto más reciente de inventario_total por Id_Producto
app.get("/api/inventario-total/:id", async (req, res) => {
  const { id } = req.params;  // Obtener el ID del producto desde la URL

  try {
    // Consultar el producto más reciente con el ID proporcionado
    const result = await pool.query(
      `SELECT * FROM inventario_total 
       WHERE Id_Producto = $1
       ORDER BY timestamp DESC 
       LIMIT 1`, [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Producto no encontrado" });
    }

    res.json({ message: "Producto encontrado", data: result.rows[0] });
  } catch (error) {
    console.error("Error al obtener el producto:", error);
    res.status(500).json({ error: "Error en el servidor" });
  }
});




// Ruta para obtener el producto más reciente de inventario_total por número de lote
app.get("/api/inventario-total/lote/:lote", async (req, res) => {
  const { lote } = req.params; // Obtener el número de lote desde la URL

  try {
    // Consultar el producto más reciente con el número de lote proporcionado
    const result = await pool.query(
      `SELECT * FROM inventario_total 
       WHERE lote = $1
       ORDER BY timestamp DESC 
       LIMIT 1`, [lote]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Producto no encontrado" });
    }

    res.json({ message: "Producto encontrado", data: result.rows[0] });
  } catch (error) {
    console.error("Error al obtener el producto por lote:", error);
    res.status(500).json({ error: "Error en el servidor" });
  }
});


// Ruta para obtener el PATCH
app.patch("/api/inventario-total/:id", async (req, res) => {
  const { id } = req.params;
  const { cantidad } = req.body;

  try {
    const result = await pool.query(
      `UPDATE inventario_total 
       SET Cantidad = $1
       WHERE Lote = $2
       RETURNING *`,
      [cantidad, id]  // <--- Verifica que estos valores sean correctos
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: "Producto no encontrado" });
    }

    res.json({ message: "Inventario actualizado", data: result.rows[0] });
  } catch (error) {
    console.error("Error al actualizar inventario:", error);
    res.status(500).json({ error: "Error en el servidor" });
  }
});





const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`Servidor corriendo en el puerto ${PORT}`));
