const fs = require('fs');
const path = require('path');

const file1 = path.join(__dirname, 'flightvn_result_page.html');
if (fs.existsSync(file1)) {
  const html = fs.readFileSync(file1, 'utf8');
  
  // Let's print all div class="row form-group" contents in the HTML.
  const regex = /<div[^>]*class="row form-group"[^>]*>([\s\S]*?)<\/div>\s*<\/div>/gi;
  let match;
  console.log('--- Form Groups in flightvn_result_page.html ---');
  while ((match = regex.exec(html)) !== null) {
    console.log(match[0].replace(/\s+/g, ' ').substring(0, 300));
  }
}
