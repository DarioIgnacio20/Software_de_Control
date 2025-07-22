import React, { useState, useEffect, useRef } from "react";
import { createPaymentLink } from "./services/mercadoPagoService";
import { QRCodeCanvas } from "qrcode.react";
import { Html5Qrcode } from "html5-qrcode";
import mqtt from "mqtt";
import "bootstrap/dist/css/bootstrap.min.css";
import "./styles.css";

const PaymentLinkGenerator = () => {
  // ─── Estados de formulario pago ───────────────────────────────────────────
  const [title, setTitle] = useState("");
  const [quantity] = useState(1);
  const [price, setPrice] = useState("");
  const [description, setDescription] = useState("");
  const [external_ref, setExternalRef] = useState("");
  const [NumeroMotor, setNumeroMotor] = useState("");
  const [NumeroVending, setNumeroVending] = useState("");
  const [CantidadCargada, setCantidadCargada] = useState("");
  const [Lotecargado, setLotecargado] = useState("");
  const [Precio_Compra_IV, setPrecio_Compra_IV] = useState("");
  const [paymentLink, setPaymentLink] = useState("");

  // ─── Estados de formulario inventario ──────────────────────────────────────
  const [Idproductoinventario, setIdproductoinventario] = useState("");
  const [nombreProducto, setNombreProducto] = useState("");
  const [cantidadinventario, setCantidadinventario] = useState(0);
  const [Preciocomprainventario, setPreciocomprainventario] = useState(0);
  const [Precioventainventario, setPrecioventainventario] = useState(0);
  const [fechaCompra, setFechaCompra] = useState("");
  const [ubicacion, setUbicacion] = useState("");
  const [descripcionInventario, setDescripcionInventario] = useState("");
  const [loteId, setLoteId] = useState("0001");
  const [lotes, setLotes] = useState({});
  const [qrInventario, setQrInventario] = useState("");

  // ─── Estados de escaneo QR ─────────────────────────────────────────────────
  const [scanningLote, setScanningLote] = useState(false);
  const [scanningMotor, setScanningMotor] = useState(false);
  const [scanningVending, setScanningVending] = useState(false);
  const [scanningInventory, setScanningInventory] = useState(false);
  const [scanningPayment, setScanningPayment] = useState(false);

  // ─── Refs para los escáneres y MQTT ────────────────────────────────────────
  const scannerLoteRef = useRef(null);
  const scannerMotorRef = useRef(null);
  const scannerVendingRef = useRef(null);
  const scannerInventoryRef = useRef(null);
  const scannerPaymentRef = useRef(null);
  const clientRef = useRef(null);

  // ─── Conexión MQTT ──────────────────────────────────────────────────────────
  useEffect(() => {
    clientRef.current = mqtt.connect("wss://test.mosquitto.org:8081/mqtt", {
      clientId: `web_${Math.random().toString(16).substr(2, 8)}`,
      reconnectPeriod: 1000,
    });
    clientRef.current.on("connect", () => console.log("Conectado a MQTT"));
    clientRef.current.on("error", (err) => console.error("MQTT error:", err));
    return () => clientRef.current && clientRef.current.end();
  }, []);

  // ─── Helpers para lotes e inventario ───────────────────────────────────────
  const getNextLoteId = (productId) => {
    const lastLote = lotes[productId] || 0;
    return (lastLote + 1).toString().padStart(4, "0");
  };

  const fetchProductDataTotal = async (id) => {
    try {
      const res = await fetch(`https://central-api-backend.onrender.com/api/productos/${id}`);
      const { data } = await res.json();
      if (!res.ok) throw new Error("No encontrado");
      setNombreProducto(data.nombre_producto);
      setCantidadinventario(data.cantidad);
      setPreciocomprainventario(data.precio_compra);
      setPrecioventainventario(data.precio_venta);
      setFechaCompra(data.fecha_compra?.split("T")[0] || "");
      setUbicacion(data.ubicacion || "");
      setDescripcionInventario(data.descripcion || "");
      const next = String(Number(data.lote || "0") + 1).padStart((data.lote || "0").length, "0");
      setLoteId(next);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchLoteData = async (lote) => {
    try {
      const res = await fetch(`https://central-api-backend.onrender.com/api/productos/lote/${lote}`);
      if (!res.ok) throw new Error("No lote");
      const { data } = await res.json();
      setTitle(data.nombre_producto);
      setPrice(data.precio_venta);
      setPrecio_Compra_IV(data.precio_compra);
      setDescription(data.descripcion);
      setCantidadCargada(data.cantidad);
      setExternalRef(data.id_producto);
      setCantidadinventario(data.cantidad);
      setLotecargado(lote);
    } catch (e) {
      console.warn(e);
    }
  };

  // ─── Escáner QR genérico ────────────────────────────────────────────────────
  const startScanner = (ref, setter, callback) => {
    if (ref.current) return;
    ref.current = new Html5Qrcode(ref.current?.id);
    ref.current.start(
      { facingMode: "environment" },
      { fps: 10, qrbox: 250 },
      (decoded) => {
        setter(decoded);
        callback(decoded);
        ref.current.stop().then(() => (ref.current = null));
      },
      (err) => console.warn(err)
    );
  };

  // ─── useEffects para cada escáner ─────────────────────────────────────────
  useEffect(() => {
    if (scanningLote) startScanner(scannerLoteRef, setLotecargado, fetchLoteData);
    return () => scannerLoteRef.current && scannerLoteRef.current.stop().then(() => (scannerLoteRef.current = null));
  }, [scanningLote]);

  useEffect(() => {
    if (scanningMotor) startScanner(scannerMotorRef, setNumeroMotor, () => {});
    return () => scannerMotorRef.current && scannerMotorRef.current.stop().then(() => (scannerMotorRef.current = null));
  }, [scanningMotor]);

  useEffect(() => {
    if (scanningVending) startScanner(scannerVendingRef, setNumeroVending, () => {});
    return () => scannerVendingRef.current && scannerVendingRef.current.stop().then(() => (scannerVendingRef.current = null));
  }, [scanningVending]);

  useEffect(() => {
    if (scanningInventory) startScanner(scannerInventoryRef, setIdproductoinventario, fetchProductDataTotal);
    return () => scannerInventoryRef.current && scannerInventoryRef.current.stop().then(() => (scannerInventoryRef.current = null));
  }, [scanningInventory]);

  useEffect(() => {
    if (scanningPayment) startScanner(scannerPaymentRef, setExternalRef, () => {});
    return () => scannerPaymentRef.current && scannerPaymentRef.current.stop().then(() => (scannerPaymentRef.current = null));
  }, [scanningPayment]);

  // ─── Actualizar inventario ─────────────────────────────────────────────────
  const updateInventoryQuantity = async (productId, qty) => {
    try {
      const res = await fetch(`https://central-api-backend.onrender.com/api/productos/${productId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cantidad: Number(cantidadinventario) - Number(qty) }),
      });
      if (!res.ok) throw await res.json();
      console.log("Inventario actualizado");
    } catch (e) {
      console.error("Error actualizando inventario:", e);
    }
  };

  // ─── Guardar evento + MQTT ─────────────────────────────────────────────────
  const handleSaveProduct = async (link) => {
    try {
      const qrLink = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(link)}`;
      const body = {
        ID_Poducto_IV: external_ref,
        Nombre_Producto_IV: title,
        Cantidad_Link_Pago_IV: quantity,
        Precio_Venta_IV: price,
        Descripcion_IV: description,
        Cantidad_Cargada_IV: CantidadCargada,
        Numero_Vending_IV: NumeroVending,
        Numero_Motor_IV: NumeroMotor,
        Link_Pago: link,
        QR_Link_Pago: qrLink,
        timestamp: new Date().toISOString(),
        Lote_Cargado_IV: Lotecargado,
        Precio_Compra_IV
      };
      const res = await fetch("https://central-api-backend.onrender.com/api/eventos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw data;
      console.log("Evento guardado:", data);

      // Publicar MQTT
      const topic = `esp32/control_${NumeroVending}`;
      const payload = JSON.stringify({
        action: "Registra Stock",
        referencia: external_ref,
        Stock: CantidadCargada,
        Iddeproducto: `${external_ref}M${NumeroMotor}E${NumeroVending}`,
      });
      clientRef.current.publish(topic, payload, { qos: 1 }, (err) => {
        if (err) console.error("MQTT publish error:", err);
        else console.log("MQTT enviado:", payload);
      });

      // Actualizar inventario
      await updateInventoryQuantity(Lotecargado, CantidadCargada);
    } catch (e) {
      console.error("Error guardando producto:", e);
      alert("No se pudo guardar el producto.");
    }
  };

  // ─── Generar link de pago ──────────────────────────────────────────────────
  const handleGenerateLink = async () => {
    if (Number(CantidadCargada) > Number(cantidadinventario)) {
      alert("Stock insuficiente. No se puede generar el link.");
      return;
    }
    try {
      const link = await createPaymentLink({ title, quantity, price, description, external_ref });
      setPaymentLink(link);
      await handleSaveProduct(link);
    } catch (e) {
      console.error("Error generando link:", e);
      alert("Error generando link de pago.");
    }
  };

  // ─── Agregar inventario ────────────────────────────────────────────────────
  const handleAddInventory = async () => {
    const next = getNextLoteId(Idproductoinventario);
    const payload = {
      Lote: `Lote: ${loteId} - ID: ${Idproductoinventario}`,
      Id_Producto: Idproductoinventario,
      Nombre_Producto: nombreProducto,
      Cantidad: cantidadinventario,
      Precio_Compra: Preciocomprainventario,
      Precio_Venta: Precioventainventario,
      Fecha_Compra: fechaCompra,
      Ubicacion: ubicacion,
      Descripcion: descripcionInventario,
      timestamp: new Date().toISOString(),
    };
    try {
      const res = await fetch("https://central-api-backend.onrender.com/api/productos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw data;
      setLotes((p) => ({ ...p, [Idproductoinventario]: Number(next) }));
      setQrInventario(`Lote: ${loteId} - ID: ${Idproductoinventario}`);
      alert("Inventario agregado");
    } catch (e) {
      console.error("Error agregando inventario:", e);
      alert("No se pudo agregar inventario.");
    }
  };

  // ─── Impresión QR ─────────────────────────────────────────────────────────
  const handlePrintQR = (id) => {
    setTimeout(() => window.print(), 300);
  };

  return (
    <div className="container mt-4">
      <div className="card p-4 shadow">
        <h2 className="text-center mb-3">Generador de Link de Pago</h2>
        <input className="form-control mb-2" placeholder="Título" value={title} onChange={e => setTitle(e.target.value)} />
        <input className="form-control mb-2" placeholder="Precio" value={price} onChange={e => setPrice(e.target.value)} />
        <input className="form-control mb-2" placeholder="Descripción" value={description} onChange={e => setDescription(e.target.value)} />
        <input className="form-control mb-2" placeholder="ID Producto" value={external_ref} onChange={e => setExternalRef(e.target.value)} />
        <input className="form-control mb-2" placeholder="Cantidad Cargada" value={CantidadCargada} onChange={e => setCantidadCargada(e.target.value)} />
        <input className="form-control mb-2" placeholder="Lote" value={Lotecargado} onChange={e => setLotecargado(e.target.value)} />
        <input className="form-control mb-2" placeholder="Motor" value={NumeroMotor} onChange={e => setNumeroMotor(e.target.value)} />
        <input className="form-control mb-2" placeholder="Vending" value={NumeroVending} onChange={e => setNumeroVending(e.target.value)} />
        <button className="btn btn-primary mb-2" onClick={() => setScanningLote(true)}>Escanear Lote</button>
        <div id="readerLote" />
        <button className="btn btn-primary mb-2" onClick={() => setScanningMotor(true)}>Escanear Motor</button>
        <div id="readerMotor" />
        <button className="btn btn-primary mb-2" onClick={() => setScanningVending(true)}>Escanear Vending</button>
        <div id="readerVending" />
        <button className="btn btn-success" onClick={handleGenerateLink}>Generar Link de Pago</button>

        {paymentLink && (
          <div className="mt-3 text-center" id="qr-container">
            <a href={paymentLink} target="_blank" rel="noopener noreferrer">{paymentLink}</a>
            <QRCodeCanvas value={paymentLink} size={200} />
            <button className="btn btn-secondary mt-2" onClick={() => handlePrintQR("qr-container")}>Imprimir QR</button>
          </div>
        )}

        <hr className="my-4" />

        <h2 className="text-center mb-3">Formulario de Inventario</h2>
        <input className="form-control mb-2" placeholder="ID Producto" value={Idproductoinventario} onChange={e => setIdproductoinventario(e.target.value)} />
        <input className="form-control mb-2" placeholder="Nombre" value={nombreProducto} readOnly />
        <input className="form-control mb-2" placeholder="Cantidad" value={cantidadinventario} readOnly />
        <input className="form-control mb-2" placeholder="Precio Compra" value={Preciocomprainventario} readOnly />
        <input className="form-control mb-2" placeholder="Precio Venta" value={Precioventainventario} readOnly />
        <button className="btn btn-primary mb-2" onClick={() => setScanningInventory(true)}>Escanear Producto</button>
        <div id="readerInventory" />
        <button className="btn btn-success" onClick={handleAddInventory}>Agregar al Inventario</button>

        {qrInventario && (
          <div className="mt-3 text-center" id="qr-container-inventario">
            <p>{qrInventario}</p>
            <QRCodeCanvas value={qrInventario} size={200} />
            <button className="btn btn-secondary mt-2" onClick={() => handlePrintQR("qr-container-inventario")}>Imprimir QR</button>
          </div>
        )}
      </div>
    </div>
  );
};

export default PaymentLinkGenerator;
