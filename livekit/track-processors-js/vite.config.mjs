import { defineConfig } from 'vite';

export default defineConfig({
  server: {
    port: 8080,
    open: true,
    fs: {
      strict: false,
    },
  },
});
