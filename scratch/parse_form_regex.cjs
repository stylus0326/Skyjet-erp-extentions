const fs = require('fs');
const path = require('path');

const html = fs.readFileSync(path.join(__dirname, 'flightvn_result_page.html'), 'utf8');

const startIdx = html.indexOf('<form action="/Booking/ImportBooking/?airlineId=VNA" enctype="multipart/form-data" id="form-search-booking" method="post">');
if (startIdx !== -1) {
  const endIdx = html.indexOf('</form>', startIdx);
  console.log('Form block content:');
  console.log(html.substring(startIdx, endIdx + 7));
} else {
  console.log('Form start tag not found');
}
