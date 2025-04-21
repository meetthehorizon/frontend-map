// vite.config.js
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  // Ensure that YAML files are served correctly
  assetsInclude: ['**/*.yaml'],
  server: {
    // Show config.yaml from the public directory
    watch: {
      usePolling: true,
    },
  },
});