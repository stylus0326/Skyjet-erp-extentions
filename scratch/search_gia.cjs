const fs = require('fs');
const path = require('path');

const file1 = path.join(__dirname, 'flightvn_result_page.html');
if (fs.existsSync(file1)) {
  const html = fs.readFileSync(file1, 'utf8');
  
  // Let's find all occurrences of the word 'Giá' or 'giá' or 'Gia' or 'gia'
  const regex = /.{0,50}[Gg]iá.{0,50}/g;
  let match;
  console.log('--- Occurrences of "giá" in flightvn_result_page.html ---');
  while ((match = regex.exec(html)) !== null) {
    console.log(match[0].trim());
  }
}
