import fs from 'fs';
import path from 'path';

const extensionManifestPath = path.resolve('src/extension/manifest.json');
const dataManifestPath = path.resolve('src/data/manifest.ts');
const packageFilePath = path.resolve('package.json');

try {
  // 1. Đọc phiên bản từ src/extension/manifest.json (đây là file nguồn gốc)
  if (!fs.existsSync(extensionManifestPath)) {
    throw new Error(`Không tìm thấy file manifest nguồn: ${extensionManifestPath}`);
  }
  
  const manifest = JSON.parse(fs.readFileSync(extensionManifestPath, 'utf8'));
  const versionRegex = /^(\d+)\.(\d+)\.(\d+)$/;
  const match = manifest.version.match(versionRegex);

  const now = new Date();
  const yy = parseInt(String(now.getFullYear()).substring(2), 10);
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  const mmddVal = parseInt(`${mm}${dd}`, 10);

  let newVersion = '';
  if (match) {
    const major = parseInt(match[1], 10);
    const minor = parseInt(match[2], 10);
    const patch = parseInt(match[3], 10);

    if (major === yy && minor === mmddVal) {
      newVersion = `${yy}.${mmddVal}.${patch + 1}`;
    } else {
      newVersion = `${yy}.${mmddVal}.1`;
    }
  } else {
    newVersion = `${yy}.${mmddVal}.1`;
  }
  
  // Cập nhật src/extension/manifest.json
  manifest.version = newVersion;
  fs.writeFileSync(extensionManifestPath, JSON.stringify(manifest, null, 2) + '\n', 'utf8');
  console.log(`[Version Updater] src/extension/manifest.json version updated to: ${newVersion}`);

  // Cập nhật src/data/manifest.ts (file sinh ra để Vite build ngay lập tức nhận version mới)
  if (fs.existsSync(dataManifestPath)) {
    let dataManifestContent = fs.readFileSync(dataManifestPath, 'utf8');
    const manifestVersionRegex = /"version":\s*"[^"]*"/;
    dataManifestContent = dataManifestContent.replace(
      manifestVersionRegex,
      `"version": "${newVersion}"`
    );
    fs.writeFileSync(dataManifestPath, dataManifestContent, 'utf8');
    console.log(`[Version Updater] src/data/manifest.ts version updated to: ${newVersion}`);
  }

  // 2. Cập nhật package.json để đồng bộ phiên bản
  if (fs.existsSync(packageFilePath)) {
    const pkg = JSON.parse(fs.readFileSync(packageFilePath, 'utf8'));
    pkg.version = newVersion;
    fs.writeFileSync(packageFilePath, JSON.stringify(pkg, null, 2) + '\n', 'utf8');
    console.log(`[Version Updater] package.json version updated to: ${newVersion}`);
  }
} catch (error) {
  console.error('[Version Updater] Error auto-incrementing version:', error);
}

