const fs = require('fs');
const path = require('path');

const buildId = Date.now().toString(36).toUpperCase();
const buildInfo = `// Auto-generated build info
export const BUILD_INFO = {
  id: '${buildId}',
  date: '${new Date().toISOString()}'
};
`;

fs.writeFileSync(path.join(__dirname, 'src/build-info.js'), buildInfo);
console.log(`Build ID: ${buildId}`);
