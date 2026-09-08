import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  define: {
    __APP_VERSION__: JSON.stringify('test'),
  },
  plugins: [react()],
  test: {
    environment: 'happy-dom',
    pool: 'threads',
    maxWorkers: 1,
  },
});