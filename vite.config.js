import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa' 



export default defineConfig({
  plugins: [react(), tailwindcss(), VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'masked-icon.svg'],
      manifest: {
        name: 'Calculadora de Ganancias',
        short_name: 'Mis Ganancias',
        description: 'Control de ganancias diarias y semanales',
        theme_color: '#0f172a', // El color de fondo oscuro que usamos (slate-900)
        background_color: '#0f172a',
        display: 'standalone', // Esto hace que parezca una app nativa (sin barra de URL)
        orientation: 'portrait', // Bloquea la app en vertical
        icons: [
          {
            src: 'pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png'
          }
        ]
      }
    })],
})
