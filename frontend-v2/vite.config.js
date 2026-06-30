import { defineConfig } from 'vite';
import fs from 'fs';
import path from 'path';

// Versione software (allineata con backend)
const SW_VERSION = 'v3.15';

const BUILD_COUNTER_FILE = path.resolve(__dirname, '.build-counter.json');

function getBuildCounter() {
  try {
    if (fs.existsSync(BUILD_COUNTER_FILE)) {
      const data = JSON.parse(fs.readFileSync(BUILD_COUNTER_FILE, 'utf8'));
      if (data.version === SW_VERSION) {
        return data.counter;
      }
    }
  } catch {}
  return 0;
}

function saveBuildCounter(counter) {
  fs.writeFileSync(BUILD_COUNTER_FILE, JSON.stringify({
    version: SW_VERSION,
    counter: counter,
    updatedAt: new Date().toISOString()
  }, null, 2));
}

function generateBuildInfo() {
  const currentCounter = getBuildCounter();
  const newCounter = currentCounter + 1;
  saveBuildCounter(newCounter);

  const buildId = `${SW_VERSION}.${newCounter}`;
  const now = new Date();
  const buildInfo = `// Auto-generated build info
// SW Version: ${SW_VERSION}
// Build Number: ${newCounter}
// Build ID: ${buildId}
// Date: ${now.toLocaleString('it-IT')}
export const BUILD_INFO = {
  id: '${buildId}',
  version: '${SW_VERSION}',
  buildNumber: ${newCounter},
  date: '${now.toISOString()}',
  buildDate: '${now.toLocaleString('it-IT')}'
};
export const SW_VERSION = '${SW_VERSION}';
`;
  const filePath = path.resolve(__dirname, 'src/build-info.js');
  fs.writeFileSync(filePath, buildInfo);
  console.log(`Build ID: ${buildId}`);
}

export default defineConfig({
  plugins: [
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
