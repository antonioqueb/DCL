import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';

// Sitio estático de una sola página: Astro empaqueta, minimiza y pone huella a los recursos.
// Sin scripts ni estilos en línea, para respetar la política de seguridad de contenido del servidor.
export default defineConfig({
  output: 'static',
  build: { inlineStylesheets: 'never', assets: '_astro' },
  devToolbar: { enabled: false },
  vite: {
    plugins: [tailwindcss()],
    build: { assetsInlineLimit: 0, cssCodeSplit: false, chunkSizeWarningLimit: 1200 },
    server: { proxy: { '/api': 'http://127.0.0.1:4310', '/vendor': 'http://127.0.0.1:4310' } },
  },
});
