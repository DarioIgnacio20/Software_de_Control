import API_BASE_URL from "../config/api";
const ACCESS_TOKEN = "APP_USR-4433500001571538-010514-a7106c1ae5e0ec393c792dee7417edb3-120330132";

export const createPaymentLink = async ({ title, quantity, price, description,external_ref, picture_url, external_reference: formattedId }) => {
    try {
        const response = await fetch("https://api.mercadopago.com/checkout/preferences", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${ACCESS_TOKEN}`,
            },
            body: JSON.stringify({
                items: [
                    {
                        title,
                        quantity: Number(quantity),
                        currency_id: "CLP",
                        unit_price: Number(price),
                        description,
                        external_ref,
                        picture_url: "https://www.mercadopago.com/org-img/MP3/home/logomp3.gif",
                        
                    }
                ],
                notification_url: "https://central-api-backend.onrender.com/api/webhook",
                external_reference: formattedId,
            }),
        });

        if (!response.ok) {
            throw new Error(`Error en MercadoPago: ${response.statusText}`);
        }

        const data = await response.json();
        return data.init_point; // URL del pago
    } catch (error) {
        console.error("Error al generar link de pago:", error);
        throw error;
    }
};
