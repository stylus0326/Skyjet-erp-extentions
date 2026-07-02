const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');

const html = fs.readFileSync(path.join(__dirname, 'flightvn_page.html'), 'utf8');
const dom = new JSDOM(html);
const document = dom.window.document;

console.log('Forms:');
const forms = Array.from(document.querySelectorAll('form')).map(f => {
  return {
    id: f.id,
    action: f.getAttribute('action'),
    method: f.getAttribute('method'),
    inputs: Array.from(f.querySelectorAll('input, select, textarea, button')).map(el => ({
      tagName: el.tagName,
      id: el.id,
      name: el.getAttribute('name'),
      type: el.getAttribute('type'),
      value: el.value
    }))
  };
});
console.log(JSON.stringify(forms, null, 2));

console.log('Search inputs:');
const searchInputs = Array.from(document.querySelectorAll('#record-location, #btn-search-booking, input[name="RecordLocation"]')).map(el => ({
  tagName: el.tagName,
  id: el.id,
  name: el.getAttribute('name'),
  type: el.getAttribute('type'),
  value: el.value
}));
console.log(searchInputs);
