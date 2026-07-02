const fs = require('fs');
const path = require('path');

const file1 = path.join(__dirname, 'flightvn_result_page.html');
if (fs.existsSync(file1)) {
  const html = fs.readFileSync(file1, 'utf8');
  const panelPriceIndex = html.indexOf('id="panel-price"');
  if (panelPriceIndex !== -1) {
    console.log(html.substring(panelPriceIndex - 100, panelPriceIndex + 2000));
  }
}
