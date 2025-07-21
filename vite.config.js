import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import fs from 'fs';

export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0', // Asegura que sea accesible desde cualquier IP
    port: process.env.PORT || 10000, // Establece el puerto de Render o uno por defecto
    https: false, // Desactiva HTTPS si ya está gestionado por Render
  },
  preview: {
    allowedHosts: ['appvending.onrender.com'], // Permitir el acceso desde Render
  },
});
