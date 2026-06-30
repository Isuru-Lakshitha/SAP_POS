const fs = require('fs');
const path = require('path');

const dir = 'frontend/src/components';
let changedFiles = 0;

fs.readdirSync(dir).forEach(file => {
  if(file.endsWith('.tsx')) {
    const p = path.join(dir, file);
    let content = fs.readFileSync(p, 'utf8');
    
    // Replace standard string matches 'http://localhost:5000/api...'
    content = content.replace(/'http:\/\/localhost:5000\/api/g, "`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}` + '");
    
    // Replace template string matches `http://localhost:5000/api...`
    content = content.replace(/`http:\/\/localhost:5000\/api/g, "`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}");
    
    fs.writeFileSync(p, content);
    changedFiles++;
  }
});
console.log(`Updated ${changedFiles} files in components.`);
