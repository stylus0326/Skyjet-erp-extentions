import * as fs from 'fs';

const filePath = 'src/data.ts';
let content = fs.readFileSync(filePath, 'utf8');

// Replace the un-escaped parts back to escaped template literal strings
const replacements = [
  {
    target: "const departureDateTime = `${year}-${monthNum}-${day}T${hour}:${min}:00`;",
    replace: "const departureDateTime = `\\${year}-\\${monthNum}-\\${day}T\\${hour}:\\${min}:00`;"
  },
  {
    target: "const firstName = paxMatch[2].toUpperCase().trim().replace(/\\s+/g, ' ');",
    replace: "const firstName = paxMatch[2].toUpperCase().trim().replace(/\\\\s+/g, ' ');"
  },
  {
    target: "const fullName = `${lastName} ${firstName}`;",
    replace: "const fullName = `\\${lastName} \\${firstName}`;"
  },
  {
    target: "const cleanName = rawName.replace(/\\//g, ' ').replace(/\\s+/g, ' ');",
    replace: "const cleanName = rawName.replace(/\\\\//g, ' ').replace(/\\\\s+/g, ' ');"
  }
];

let ok = true;
replacements.forEach(r => {
  if (!content.includes(r.target)) {
    console.error('Target not found:', r.target);
    ok = false;
  }
});

if (ok) {
  replacements.forEach(r => {
    content = content.replace(r.target, r.replace);
  });
  fs.writeFileSync(filePath, content, 'utf8');
  console.log('Successfully escaped target lines in src/data.ts!');
} else {
  console.log('Skipping replacements because some targets were not found.');
}
