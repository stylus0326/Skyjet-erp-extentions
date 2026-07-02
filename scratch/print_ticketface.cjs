const fs = require('fs');
const path = require('path');

const file1 = path.join(__dirname, 'flightvn_result_page.html');
if (fs.existsSync(file1)) {
  const html = fs.readFileSync(file1, 'utf8');
  const ticketFaceMatch = html.match(/<textarea[^>]*id="TicketFace"[^>]*>([\s\S]*?)<\/textarea>/i);
  if (ticketFaceMatch) {
    console.log('--- TicketFace in flightvn_result_page.html ---');
    console.log(ticketFaceMatch[1]);
  } else {
    console.log('--- No TicketFace in flightvn_result_page.html ---');
  }
}

const file2 = path.join(__dirname, 'flightvn_spa_result.html');
if (fs.existsSync(file2)) {
  const html = fs.readFileSync(file2, 'utf8');
  const ticketFaceMatch = html.match(/<textarea[^>]*id="TicketFace"[^>]*>([\s\S]*?)<\/textarea>/i);
  if (ticketFaceMatch) {
    console.log('--- TicketFace in flightvn_spa_result.html ---');
    console.log(ticketFaceMatch[1]);
  } else {
    console.log('--- No TicketFace in flightvn_spa_result.html ---');
  }
}
