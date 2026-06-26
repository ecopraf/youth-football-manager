import { defineConfig } from 'vite';
import tailwindcss from '@tailwindcss/vite';
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

function generateBuildInfo() {
  const buildId = Date.now().toString(36).toUpperCase();
  const buildInfo = `// Auto-generated build info\nexport const BUILD_INFO = {\n  id: '${buildId}',\n  date: '${new Date().toISOString()}'\n};\n`;
  const filePath = path.resolve(__dirname, 'src/build-info.js');
  fs.writeFileSync(filePath, buildInfo);
  console.log(`Build ID: ${buildId}`);
}

export default defineConfig({
  plugins: [
    tailwindcss(),
    {
      name: 'build-info',
      buildStart() {
        generateBuildInfo();
      }
    }
  ],
  build: {
    outDir: 'dist',
    rollupOptions: {
      input: {
        main: 'index.html'
      }
    }
  },
  server: {
    port: 8080
  }
});
