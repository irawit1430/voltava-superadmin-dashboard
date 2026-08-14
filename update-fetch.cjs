const fs = require('fs');
const path = require('path');

function processDir(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      processDir(fullPath);
    } else if (fullPath.endsWith('.tsx') || fullPath.endsWith('.ts')) {
      let content = fs.readFileSync(fullPath, 'utf8');
      let changed = false;
      
      if (content.includes("fetch('/api/")) {
        content = content.replace(/fetch\('\/api\//g, "fetch((import.meta.env.VITE_API_URL || '') + '/api/");
        changed = true;
      }
      if (content.includes("fetch(`/api/")) {
        content = content.replace(/fetch\(`\/api\//g, "fetch((import.meta.env.VITE_API_URL || '') + `/api/");
        changed = true;
      }
      if (fullPath.endsWith('Dashboard.tsx') && content.includes("const socket = io({")) {
        content = content.replace("const socket = io({", "const socket = io(import.meta.env.VITE_API_URL || '', {");
        changed = true;
      }
      
      if (changed) {
        fs.writeFileSync(fullPath, content);
        console.log('Updated ' + fullPath);
      }
    }
  }
}

processDir(path.join(process.cwd(), 'src'));
