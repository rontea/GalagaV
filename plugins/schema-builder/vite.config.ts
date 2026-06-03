
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  build: {
    lib: {
      entry: './src/index.tsx',
      name: 'GalagaPlugin_SchemaBuilder',
      fileName: () => `index.js`,
      formats: ['umd']
    },
    rollupOptions: {
      external: ['react', 'react-dom', 'lucide-react'],
      output: {
        globals: {
          react: 'React',
          'react-dom': 'ReactDOM',
          'lucide-react': 'Lucide'
        },
        name: 'GalagaPlugin_SchemaBuilder',
        assetFileNames: (assetInfo) => {
          if (assetInfo.name && assetInfo.name.endsWith('.css')) return 'style.css';
          return assetInfo.name || 'assets/[name]-[hash][extname]';
        }
      }
    }
  },
  define: {
    'process.env.NODE_ENV': '"production"'
  }
});
