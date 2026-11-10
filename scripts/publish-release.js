const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const rootDir = path.resolve(__dirname, '..');
const pkgPath = path.join(rootDir, 'package.json');
const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));

// Allow passing custom tag e.g. "npm run release -- 2.1.4" or default to package.json version
const customTag = process.argv[2];
const version = customTag || pkg.version;
const tag = version;

console.log(`\n📦 Preparing release for GrocyLite version: ${tag}`);

// 1. Verify gh CLI is available
try {
  execSync('gh --version', { stdio: 'ignore' });
} catch (e) {
  console.error('\n❌ GitHub CLI (gh) tidak ditemukan!');
  console.error('Silakan install GitHub CLI terlebih dahulu: https://cli.github.com/\n');
  process.exit(1);
}

// 2. Locate APK files
const apkDir = path.join(rootDir, 'android', 'app', 'build', 'outputs', 'apk', 'release');
if (!fs.existsSync(apkDir)) {
  console.error(`\n❌ Direktori APK release tidak ditemukan:\n   ${apkDir}`);
  console.error('Jalankan build release terlebih dahulu (e.g. ./gradlew assembleRelease).\n');
  process.exit(1);
}

const apkFiles = fs
  .readdirSync(apkDir)
  .filter((f) => f.endsWith('.apk'))
  .map((f) => path.join(apkDir, f));

if (apkFiles.length === 0) {
  console.error(`\n❌ Tidak ada file .apk ditemukan di:\n   ${apkDir}\n`);
  process.exit(1);
}

console.log(`\nFound ${apkFiles.length} APK files:`);
apkFiles.forEach((f) => console.log(`  - ${path.basename(f)}`));

// 3. Push latest git commits
console.log('\n📤 Pushing latest git commits to origin...');
try {
  execSync('git push origin HEAD', { stdio: 'inherit', cwd: rootDir });
} catch (e) {
  console.warn('⚠️  Peringatan saat push git (mungkin sudah up-to-date atau perlu login). Melanjutkan...');
}

// 4. Create or update GitHub release
console.log(`\n🚀 Publishing release ${tag} to GitHub...`);
const quotedApks = apkFiles.map((f) => `"${f}"`).join(' ');

try {
  const cmd = `gh release create ${tag} ${quotedApks} --title "GrocyLite ${tag}" --notes "Release version ${tag}" --latest`;
  execSync(cmd, { stdio: 'inherit', cwd: rootDir });
  console.log(`\n✅ Berhasil! Release ${tag} telah dipublikasikan sebagai Latest Release.\n`);
} catch (e) {
  // If release already exists, upload/clobber assets
  console.log(`\n⚠️  Release ${tag} mungkin sudah ada. Mencoba upload aset ke release yang sudah ada...`);
  try {
    const uploadCmd = `gh release upload ${tag} ${quotedApks} --clobber`;
    execSync(uploadCmd, { stdio: 'inherit', cwd: rootDir });
    console.log(`\n✅ Aset APK berhasil di-upload ke release ${tag}.\n`);
  } catch (uploadError) {
    console.error('\n❌ Gagal membuat/mengupdate release:', uploadError.message);
    process.exit(1);
  }
}
