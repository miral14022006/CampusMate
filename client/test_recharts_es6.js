const fs = require('fs');
const files = fs.readdirSync('./node_modules/recharts/es6');
console.log('recharts/es6 has', files.length, 'files');
