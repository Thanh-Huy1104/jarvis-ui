// vite.config.ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';
import fs from 'fs';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],        // ← top-level, comma after this block
  server: {
    host: '0.0.0.0',
    port: 5173,
    https: {
      key: fs.readFileSync('certs/192.168.5.215-key.pem'),
      cert: fs.readFileSync('certs/192.168.5.215.pem'),
    },
  },
});

