import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  assetsInclude: ['**/*.glb', '**/*.fbx', '**/*.gltf'],
  server: {
    port: 3000,
    open: '/Showroom.html',
  },
  build: {
    target: 'esnext',
    outDir: 'dist',
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'Showroom.html'),
      },
    },
  },
});
