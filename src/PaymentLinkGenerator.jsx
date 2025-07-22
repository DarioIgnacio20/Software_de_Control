import { useState, useEffect, useRef } from "react";
import { QRCodeCanvas } from "qrcode.react";
import { Html5Qrcode } from "html5-qrcode";
import mqtt from "mqtt";
import "bootstrap/dist/css/bootstrap.min.css"; 
import "./styles.css";

const PaymentLinkGenerator = () => {
  const [title, setTitle] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [price, setPrice] = useState("");
  const [description, setDescription] = useState("");
  const [external_ref, setExternalRef] = useState("");
  const [NumeroMotor, setNumeroMotor] = useState("");
  const [NumeroVending, setNumeroVending] = useState("");
  const [CantidadCargada, setCantidadCargada] = useState("");
  const [Lotecargado, setLotecargado] = useState("");
  const [Precio_Compra_IV, setPrecio_Compra_IV] = useState("");
  const [paymentLink, setPaymentLink] = useState("");
  const [scanningPayment, setScanningPayment] = useState(false);
  const [scanningInventory, setScanningInventory] = useState(false);
  const [scanningLote, setScanningLote] = useState(false);  // Nuevo estado
  const [scanningMotor, setScanningMotor] = useState(false);  // Nuevo estado
  const [scanningVending, setScanningVending] = useState(false);


  const [Idproductoinventario, setIdproductoinventario] = useState("");
  const [nombreProducto, setNombreProducto] = useState("");
  const [cantidadinventario, setCantidadinventario] = useState("");
  const [Preciocomprainventario, setPreciocomprainventario] = useState("");
  const [Precioventainventario, setPrecioventainventario] = useState("");
  const [fechaCompra, setFechaCompra] = useState("");
  const [ubicacion, setUbicacion] = useState("");
  const [descripcionInventario, setDescripcionInventario] = useState("");
  const [loteId, setLoteId] = useState("0001");
  const [lotes, setLotes] = useState({});
  const [qrInventario, setQrInventario] = useState("");


  const scannerPaymentRef = useRef(null); 
  const scannerInventoryRef = useRef(null);
  const scannerLoteRef = useRef(null); // Referencia para escanear Lote-Producto
  const scannerMotorRef = useRef(null); // Referencia para escanear Motor
  const scannerVendingRef = useRef(null); // Referencia para escanear Vending


  const clientRef = useRef(null); // Cliente MQTT

  useEffect(() => {
    // Conectar al broker MQTT una sola vez
    clientRef.current = mqtt.connect("wss://test.mosquitto.org:8081/mqtt", {
      clientId: `web_${Math.random().toString(16).substr(2, 8)}`,
      reconnectPeriod: 1000,
    });

    clientRef.current.on("connect", () => {
      console.log("Conectado a MQTT");
    });

    clientRef.current.on("error", (err) => {
      console.error("Error en MQTT:", err);
    });

    return () => {
      if (clientRef.current) {
        clientRef.current.end();
      }
    };
  }, []);



  const getNextLoteId = (productId) => {
    const lastLote = lotes[productId] || 0;
    const nextLote = (lastLote + 1).toString().padStart(4, "0");
    return nextLote;
  };

// Función para obtener los datos del producto más reciente desde el backend
const fetchProductDataTotal = async (id) => {
  try {
    const response = await fetch(`https://central-api-backend.onrender.com/api/productos/${id}`);
    const data = await response.json();
    console.log('Datos obtenidos de la API:', data); // Verifica los datos de la API

    if (response.ok) {
      // Asignamos los datos a los estados correspondientes
      setNombreProducto(data.data.nombre_producto);
      setCantidadinventario(data.data.cantidad);
      setPreciocomprainventario(data.data.precio_compra);
      setPrecioventainventario(data.data.precio_venta);
      setFechaCompra(data.data.fecha_compra ? data.data.fecha_compra.split('T')[0] : ''); // Si hay fecha, formatear
      setUbicacion(data.data.ubicacion || '');
      setDescripcionInventario(data.data.descripcion || '');

      // Incrementar el lote en 1 manteniendo el formato
      const loteActual = data.data.lote || '00000'; // Asegurar que hay un valor base
      const nuevoLote = String(Number(loteActual) + 1).padStart(loteActual.length, '0');
      setLoteId(nuevoLote);
    } else {
      console.error("Producto no encontrado.");
    }
  } catch (error) {
    console.error("Error al obtener el producto:", error);
  }
};



// Función para obtener los datos del producto más reciente desde el backend de Lote
const fetchLoteData = async (lote) => {
  try {
    const response = await fetch(`https://central-api-backend.onrender.com/api/productos/lote/${lote}`);
    if (!response.ok) throw new Error("No se pudo obtener los datos del lote.");

    const data = await response.json();
    console.log("Datos del lote recibidos:", data);

    const loteData = data.data ?? {};
    if (!loteData || Object.keys(loteData).length === 0) {
      console.warn("Lote no encontrado.");
      return;
    }

    // Actualiza los estados
    setTitle(loteData.nombre_producto ?? "");
    setPrice(loteData.precio_venta ?? 0);
    setPrecio_Compra_IV(loteData.precio_compra ?? 0);
    setDescription(loteData.descripcion ?? "");
    setCantidadCargada(loteData.cantidad ?? 0);
    setExternalRef(loteData.id_producto ?? "");
    setCantidadinventario(loteData.cantidad ?? 0); // <- AHORA SÍ asignamos la cantidad correcta
    console.log("Cantidad de inventario asignada:", loteData.cantidad);

  } catch (error) {
    console.error("Error al obtener los datos del lote:", error);
  }
};


// Llamar a la función cuando se escanea un código QR con el lote
const onScanSuccess = (qrData) => {
    console.log("Código QR escaneado:", qrData);  // Verificar valor de qrData

    const lote = qrData.trim();
    console.log("Lote extraído:", lote);  // Verificar valor de lote
    
    if (lote) {
        console.log("Llamando a la API con el lote:", lote);
        fetchLoteData(lote);  // Verificar si esta función se ejecuta
    } else {
        console.warn("Código QR inválido.");
    }
};



  // Función para iniciar el escaneo de Lote-Producto
  useEffect(() => {
    if (scanningLote && !scannerLoteRef.current) {
      const readerElement = document.getElementById("readerLote");
      if (readerElement) {
        scannerLoteRef.current = new Html5Qrcode("readerLote");

scannerLoteRef.current.start(
  { facingMode: "environment" },
  { fps: 10, qrbox: { width: 250, height: 250 } },
  (decodedText) => {
    console.log("QR Detectado (Lote-Producto):", decodedText);
    setLotecargado(decodedText); // Guarda el lote en el estado

    fetchLoteData(decodedText); // Llama a la función para completar los otros datos del formulario

    setScanningLote(false);
    if (scannerLoteRef.current) {
      scannerLoteRef.current.stop().catch((err) =>
        console.warn("No se pudo detener el escáner (Lote):", err)
      );
      scannerLoteRef.current = null;
    }
  },
  (errorMessage) => {
    console.warn("Error al escanear (Lote-Producto):", errorMessage);
  }
);

      } else {
        console.error("El elemento con id 'readerLote' no se encontró.");
        setScanningLote(false);
      }
    }

    return () => {
      if (scannerLoteRef.current) {
        scannerLoteRef.current.stop().catch((err) => console.warn("No se pudo detener el escáner (Lote):", err));
        scannerLoteRef.current = null;
      }
    };
  }, [scanningLote]);

  // Función para iniciar el escaneo de Motor
  useEffect(() => {
    if (scanningMotor && !scannerMotorRef.current) {
      const readerElement = document.getElementById("readerMotor");
      if (readerElement) {
        scannerMotorRef.current = new Html5Qrcode("readerMotor");

        scannerMotorRef.current.start(
          { facingMode: "environment" },
          { fps: 10, qrbox: { width: 250, height: 250 } },
          (decodedText) => {
            console.log("QR Detectado (Motor):", decodedText);
            setNumeroMotor(decodedText);  // Completar el campo Motor
            setScanningMotor(false);
            if (scannerMotorRef.current) {
              scannerMotorRef.current.stop().catch((err) => console.warn("No se pudo detener el escáner (Motor):", err));
              scannerMotorRef.current = null;
            }
          },
          (errorMessage) => {
            console.warn("Error al escanear (Motor):", errorMessage);
          }
        );
      } else {
        console.error("El elemento con id 'readerMotor' no se encontró.");
        setScanningMotor(false);
      }
    }

    return () => {
      if (scannerMotorRef.current) {
        scannerMotorRef.current.stop().catch((err) => console.warn("No se pudo detener el escáner (Motor):", err));
        scannerMotorRef.current = null;
      }
    };
  }, [scanningMotor]);

  // Función para iniciar el escaneo de Vending
  useEffect(() => {
    if (scanningVending && !scannerVendingRef.current) {
      const readerElement = document.getElementById("readerVending");
      if (readerElement) {
        scannerVendingRef.current = new Html5Qrcode("readerVending");

        scannerVendingRef.current.start(
          { facingMode: "environment" },
          { fps: 10, qrbox: { width: 250, height: 250 } },
          (decodedText) => {
            console.log("QR Detectado (Vending):", decodedText);
            setNumeroVending(decodedText);  // Completar el campo Vending
            setScanningVending(false);
            if (scannerVendingRef.current) {
              scannerVendingRef.current.stop().catch((err) => console.warn("No se pudo detener el escáner (Vending):", err));
              scannerVendingRef.current = null;
            }
          },
          (errorMessage) => {
            console.warn("Error al escanear (Vending):", errorMessage);
          }
        );
      } else {
        console.error("El elemento con id 'readerVending' no se encontró.");
        setScanningVending(false);
      }
    }

    return () => {
      if (scannerVendingRef.current) {
        scannerVendingRef.current.stop().catch((err) => console.warn("No se pudo detener el escáner (Vending):", err));
        scannerVendingRef.current = null;
      }
    };
  }, [scanningVending]);

  const handleStartScanLote = () => {
    if (scanningLote) return;
    setScanningLote(true);
  };

  const handleStartScanMotor = () => {
    if (scanningMotor) return;
    setScanningMotor(true);
  };

  const handleStartScanVending = () => {
    if (scanningVending) return;
    setScanningVending(true);
  };








  useEffect(() => {
    if (scanningPayment && !scannerPaymentRef.current) {
      const readerElement = document.getElementById("readerPayment");
      if (readerElement) {
        scannerPaymentRef.current = new Html5Qrcode("readerPayment");

        scannerPaymentRef.current.start(
          { facingMode: "environment" },
          { fps: 10, qrbox: { width: 250, height: 250 } },
          (decodedText) => {
            console.log("QR Detectado (Pago):", decodedText);
            setExternalRef(decodedText);
            setScanningPayment(false);
            if (scannerPaymentRef.current) {
              scannerPaymentRef.current.stop().catch((err) => console.warn("No se pudo detener el escáner (Pago):", err));
              scannerPaymentRef.current = null;
            }
          },
          (errorMessage) => {
            console.warn("Error al escanear (Pago):", errorMessage);
          }
        );
      } else {
        console.error("El elemento con id 'readerPayment' no se encontró.");
        setScanningPayment(false);
      }
    }

    return () => {
      if (scannerPaymentRef.current) {
        scannerPaymentRef.current.stop().catch((err) => console.warn("No se pudo detener el escáner (Pago):", err));
        scannerPaymentRef.current = null;
      }
    };
  }, [scanningPayment]);








  useEffect(() => {
    if (scanningInventory && !scannerInventoryRef.current) {
      const readerElement = document.getElementById("readerInventory");
      if (readerElement) {
        scannerInventoryRef.current = new Html5Qrcode("readerInventory");

        scannerInventoryRef.current.start(
          { facingMode: "environment" },
          { fps: 10, qrbox: { width: 1000, height: 1000 }
},
          
(decodedText) => {
            console.log("QR Detectado (Inventario):", decodedText);
            setIdproductoinventario(decodedText);
            fetchProductDataTotal(decodedText); // Llamamos a la función para obtener los datos del producto
            setScanningInventory(false);
            if (scannerInventoryRef.current) {
              scannerInventoryRef.current.stop().catch((err) => console.warn("No se pudo detener el escáner (Inventario):", err));
              scannerInventoryRef.current = null;
            }
          },
          (errorMessage) => {
            console.warn("Error al escanear (Inventario):", errorMessage);
          }
        );
      } else {
        console.error("El elemento con id 'readerInventory' no se encontró.");
        setScanningInventory(false);
      }
    }

    return () => {
      if (scannerInventoryRef.current) {
        scannerInventoryRef.current.stop().catch((err) => console.warn("No se pudo detener el escáner (Inventario):", err));
        scannerInventoryRef.current = null;
      }
    };
  }, [scanningInventory]);

  const handleStartScanPayment = () => {
    if (scanningPayment) return;
    setScanningPayment(true);
  };

  const handleStartScanInventory = () => {
    if (scanningInventory) return;
    setScanningInventory(true);
  };

const handleSaveProduct = async (paymentLink) => {
  try {
    const qrLink = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(paymentLink)}`;
    const cantidadActual = Number(cantidadinventario);
    const cantidadRestar = Number(CantidadCargada);

    // Validar si hay suficiente stock antes de guardar el producto
    if (cantidadRestar > cantidadActual) {
      alert("Stock insuficiente. No se puede generar el link de pago.");
      console.warn("Stock insuficiente, no se guarda el producto.");
      return; // No continúa si no hay suficiente stock
    }

    // Guardar el producto en inventario_vending
    const response = await fetch("https://central-api-backend.onrender.com/api/eventos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ID_Poducto_IV: external_ref,
        Nombre_Producto_IV: title,
        Cantidad_Link_Pago_IV: quantity,
        Precio_Venta_IV: price,
        Descripcion_IV: description,
        Cantidad_Cargada_IV: CantidadCargada,
        Numero_Vending_IV: NumeroVending,
        Numero_Motor_IV: NumeroMotor,
        Link_Pago: paymentLink,
        QR_Link_Pago: qrLink,
        timestamp: new Date().toISOString(),
        Lote_Cargado_IV: Lotecargado,
        Precio_Compra_IV    
      }),
    });

    const data = await response.json();
    if (!response.ok) {
      console.error("Error al guardar producto:", data.error);
      alert("Error al guardar el producto: " + data.error);
      return;
    }

    console.log("Producto guardado:", data);

    // Actualizar inventario solo si el producto se guarda correctamente
    await updateInventoryQuantity(Lotecargado, CantidadCargada);

  } catch (error) {
    console.error("Error guardando producto:", error);
  }
};



const updateInventoryQuantity = async (productId, quantityToDeduct) => {
  try {
    console.log("Producto ID:", productId);
    console.log("Cantidad actual en inventario:", cantidadinventario);
    console.log("Cantidad a restar:", quantityToDeduct);

    const cantidadActual = Number(cantidadinventario);
    const cantidadRestar = Number(quantityToDeduct);

    if (isNaN(cantidadActual) || isNaN(cantidadRestar)) {
      console.error("Error: Las cantidades no son números válidos.");
      return;
    }

    if (cantidadRestar > cantidadActual) {
      console.warn("No hay suficiente stock para completar esta operación.");
      alert("Stock insuficiente.");
      return;
    }

    const newQuantity = Math.max(cantidadActual - cantidadRestar, 0);
    console.log("Nueva cantidad a actualizar:", newQuantity);

    const response = await fetch(`https://central-api-backend.onrender.com/api/productos/${productId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ cantidad: newQuantity }),
    });

    if (response.ok) {
      const data = await response.json();
      console.log("Inventario actualizado:", data);
    } else {
      const errorData = await response.json();
      console.error("Error al actualizar el inventario:", errorData);
    }
  } catch (error) {
    console.error("Error al actualizar el inventario:", error);
  }
};


const handleGenerateLink = async () => {
  try {
    const payload = {
      title,
      quantity,
      price,
      description,
      external_reference: external_ref,
    };

    const link = `https://landing-pago-sin-app.onrender.com/?data=${encodeURIComponent(JSON.stringify(payload))}`;
    setPaymentLink(link);

    const jsonData = {
      action: "Registra Stock",
      referencia: external_ref,
      Stock: CantidadCargada,
      Iddeproducto: `${external_ref}M${NumeroMotor}E${NumeroVending}`,
    };

    const topic = `esp32/control_${NumeroVending}`;

    if (clientRef.current && clientRef.current.connected) {
      clientRef.current.publish(topic, JSON.stringify(jsonData), { qos: 1 }, (error) => {
        if (error) {
          console.error("Error enviando mensaje MQTT:", error);
        } else {
          console.log("Mensaje MQTT enviado con éxito:", jsonData);
        }
      });
    } else {
      console.error("No se pudo enviar MQTT: Cliente no conectado");
    }

    await handleSaveProduct(link);

  } catch (error) {
    console.error("Error generando link de pago:", error);
  }
};


  const handleAddInventory = async () => {
    // Obtener el siguiente lote usando la función getNextLoteId
    const nextLote = getNextLoteId(Idproductoinventario);

    const inventoryData = {
      Lote: `Lote: ${loteId} - ID: ${Idproductoinventario}`,
      Id_Producto: Idproductoinventario,
      Nombre_Producto: nombreProducto,
      Cantidad: cantidadinventario,
      Precio_Compra: Preciocomprainventario,
      Precio_Venta: Precioventainventario,
      Fecha_Compra: fechaCompra,
      Ubicacion: ubicacion,
      Descripcion: descripcionInventario,
      timestamp: new Date().toISOString()
    };

    try {
      const response = await fetch("https://central-api-backend.onrender.com/api/productos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(inventoryData)
      });

      const result = await response.json();
      if (response.ok) {
        setLotes((prev) => ({ ...prev, [Idproductoinventario]: Number(nextLote) }));

   const qrData = `Lote: ${loteId} - ID: ${Idproductoinventario}`;
  setQrInventario(qrData);


        alert("Inventario agregado correctamente");
      } else {
        alert("Hubo un problema al agregar el inventario.");
      }
    } catch (error) {
      console.error("Error al agregar inventario:", error);
      alert("Hubo un problema al agregar inventario.");
    }
  };

  const handlePrintQR = () => {
    const qrContainer = document.getElementById("qr-container");
    if (qrContainer) {
      setTimeout(() => {
        window.print();
      }, 500); // Retardo para asegurarse de que el QR se haya renderizado antes de imprimir
    }
  };

const handlePrintQRinventario = () => {
  const qrContainerInventario = document.getElementById("qr-container-inventario");
  if (qrContainerInventario) {
    console.log("QR Container Inventario:", qrContainerInventario);  // Verifica que el contenedor tenga el QR generado
    setTimeout(() => {
      window.print();
    }, 500);
  } else {
    console.log("Contenedor del QR del inventario no encontrado");
  }
};

  return (
    <div className="container mt-4">
      <div className="card shadow p-4">
        {/* Formulario de pago */}



        <h2 className="text-center mb-3">Generador de Link de Pago</h2>
        <input type="text" className="form-control mb-2" placeholder="Título" value={title} onChange={(e) => setTitle(e.target.value)} />
        <input type="number" className="form-control mb-2" placeholder="Cantidad" value={quantity} onChange={(e) => setQuantity(e.target.value)} disabled />
        <input type="text" className="form-control mb-2" placeholder="Precio" value={price} onChange={(e) => setPrice(e.target.value)} />
        <input type="text" className="form-control mb-2" placeholder="Descripción" value={description} onChange={(e) => setDescription(e.target.value)} />
        <input type="text" className="form-control mb-2" placeholder="Id del Producto" value={external_ref} onChange={(e) => setExternalRef(e.target.value)} />
        <input type="text" className="form-control mb-2" placeholder="Número Motor" value={NumeroMotor} onChange={(e) => setNumeroMotor(e.target.value)} />
        <input type="text" className="form-control mb-2" placeholder="Número Vending" value={NumeroVending} onChange={(e) => setNumeroVending(e.target.value)} />
        <input type="text" className="form-control mb-2" placeholder="Cantidad Cargada" value={CantidadCargada} onChange={(e) => setCantidadCargada(e.target.value)} />
        <input type="text" className="form-control mb-2" placeholder="Lote Cargado" value={Lotecargado} onChange={(e) => setLotecargado(e.target.value)} />
        <input type="text" className="form-control mb-2" placeholder="Precio Compra" value={Precio_Compra_IV} onChange={(e) => setPrecio_Compra_IV(e.target.value)} />
        <button onClick={handleGenerateLink} className="btn btn-success mt-3">Generar Link de Pago</button>


        {/* Botones para escanear Lote, Motor y Vending */}
        <button onClick={handleStartScanLote} className="btn btn-primary mb-2">Escanear Lote-Producto</button>
        <div id="readerLote" className="mt-3"></div>

        <button onClick={handleStartScanMotor} className="btn btn-primary mb-2">Escanear Motor</button>
        <div id="readerMotor" className="mt-3"></div>

        <button onClick={handleStartScanVending} className="btn btn-primary mb-2">Escanear Vending</button>
        <div id="readerVending" className="mt-3"></div>




        {paymentLink && (
          <div>
            <p className="text-center">Link de pago generado:</p>
            <a href={paymentLink} target="_blank" rel="noopener noreferrer">Ir al Link de Pago</a>
            <div id="qr-container" className="text-center mt-3">
              <QRCodeCanvas value={paymentLink} size={256} />
              <button onClick={handlePrintQR} className="btn btn-secondary mt-2">Imprimir QR</button>
            </div>
          </div>
        )}

        {/* Formulario de inventario */}
        <h2 className="text-center mt-4 mb-3">Formulario de Inventario</h2>

        <div className="form-group mt-3">
          <input type="text" className="form-control" value={Idproductoinventario} placeholder="ID Producto" onChange={(e) => setIdproductoinventario(e.target.value)} />
          <input type="text" className="form-control mt-2" value={nombreProducto} placeholder="Nombre Producto" onChange={(e) => setNombreProducto(e.target.value)} />
          <input type="number" className="form-control mt-2" value={cantidadinventario} placeholder="Cantidad" onChange={(e) => setCantidadinventario(e.target.value)} />
          <input type="number" className="form-control mt-2" value={Preciocomprainventario} placeholder="Precio de Compra" onChange={(e) => setPreciocomprainventario(e.target.value)} />
          <input type="number" className="form-control mt-2" value={Precioventainventario} placeholder="Precio de Venta" onChange={(e) => setPrecioventainventario(e.target.value)} />
          <input type="text" className="form-control mt-2" value={fechaCompra} placeholder="Fecha de Compra" onChange={(e) => setFechaCompra(e.target.value)} />
          <input type="text" className="form-control mt-2" value={ubicacion} placeholder="Ubicación" onChange={(e) => setUbicacion(e.target.value)} />
          <textarea className="form-control mt-2" value={descripcionInventario} placeholder="Descripción" onChange={(e) => setDescripcionInventario(e.target.value)}></textarea>
          <input type="text" className="form-control mt-2" value={loteId} placeholder="LoteId" disabled />
        </div>


        <button onClick={handleStartScanInventory} className="btn btn-primary mb-2">Escanear Código QR del Producto</button>
        <div id="readerInventory" className="mt-3"></div>


        <button onClick={handleAddInventory} className="btn btn-success mt-3">Agregar al Inventario</button>

{qrInventario && (
  <div className="text-center mt-3" id="qr-container-inventario">
    <p>Código QR del Inventario</p>
    <QRCodeCanvas value={qrInventario} size={256} />
    <p>{qrInventario}</p>  {/* Aquí agregas el texto debajo del QR */}
    <button onClick={handlePrintQRinventario} className="btn btn-secondary mt-2">Imprimir QR</button>
  </div>
)}

      </div>
    </div>
  );
};

export default PaymentLinkGenerator;