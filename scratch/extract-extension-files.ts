import * as fs from 'fs';
// We read src/data.ts directly and parse it dynamically to avoid importing TypeScript issues in plain node.
// Or we can compile it with ts-node. Let's just write a ts script that we can run with npx ts-node.
import { extensionFiles } from '../src/data';

fs.mkdirSync('scratch/extracted', { recursive: true });

for (const file of extensionFiles) {
  const outputPath = `scratch/extracted/${file.name}`;
  fs.writeFileSync(outputPath, file.content, 'utf8');
  console.log(`Extracted ${file.name} to ${outputPath} (${file.content.length} characters)`);
}
