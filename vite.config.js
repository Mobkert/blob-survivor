import { defineConfig } from 'vite';

export default defineConfig({
  base: './',
  server: {
    port: 3000,
    open: true,
    watch: {
      // Publishing rebuilds docs/ and can lock files; don't watch that folder.
      ignored: ['**/docs/**'],
    },
  },
});
