require('dotenv').config();
const express = require('express');
const axios = require('axios');
const cron = require('node-cron');

const app = express();
app.use(express.json());

const TOKEN = process.env.WHATSAPP_TOKEN;
const PHONE_ID = process.env.PHONE_NUMBER_ID;
const VERIFY_TOKEN = process.env.VERIFY_TOKEN || 'mi_token_secreto_123';

async function enviarMensaje(to, texto) {
  try {
    await axios.post(
      `https://graph.facebook.com/v21.0/${PHONE_ID}/messages`,
      {
        messaging_product: 'whatsapp',
        to: to,
        type: 'text',
        text: { body: texto }
      },
      {
        headers: {
          Authorization: `Bearer ${TOKEN}`,
          'Content-Type': 'application/json'
        }
      }
    );
    console.log('Mensaje enviado a', to);
  } catch (error) {
    console.error('Error:', error.response?.data || error.message);
  }
}

// Respuestas automáticas (puedes cambiarlas después)
const respuestas = {
  hola: '¡Hola! 👋 Bienvenido. ¿En qué te puedo ayudar?\n\nEscribe:\n• horario\n• precios\n• ubicacion\n• humano',
  horario: 'Nuestro horario es de Lunes a Viernes de 9:00 a 18:00 hs.',
  precios: 'Tenemos varias opciones. Escribe el servicio que te interesa y te paso el precio.',
  ubicacion: 'Estamos en [pon aquí tu dirección].',
  humano: 'En un momento te conecto con una persona del equipo 👨‍💻'
};

app.get('/webhook', (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode === 'subscribe' && token === VERIFY_TOKEN) {
    console.log('Webhook verificado');
    res.status(200).send(challenge);
  } else {
    res.sendStatus(403);
  }
});

app.post('/webhook', async (req, res) => {
  const body = req.body;

  if (body.object === 'whatsapp_business_account') {
    const message = body.entry?.[0]?.changes?.[0]?.value?.messages?.[0];

    if (message && message.type === 'text') {
      const from = message.from;
      const texto = message.text.body.toLowerCase().trim();

      console.log('Mensaje recibido de', from, ':', texto);

      let respuesta = null;
      for (const key in respuestas) {
        if (texto.includes(key)) {
          respuesta = respuestas[key];
          break;
        }
      }

      if (respuesta) {
        await enviarMensaje(from, respuesta);
      } else {
        await enviarMensaje(from, 'No entendí 😅. Escribe *hola* para ver las opciones.');
      }
    }
  }

  res.sendStatus(200);
});

// Ejemplo de recordatorio (todos los días a las 10:00)
// cron.schedule('0 10 * * *', () => {
//   enviarMensaje('54911XXXXXXXX', '⏰ Recordatorio de prueba');
// });

app.listen(process.env.PORT || 3000, () => {
  console.log('Bot corriendo');
});
