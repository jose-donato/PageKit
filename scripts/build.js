const fs = require('fs');
const path = require('path');

const SRC = path.join(__dirname, '../src');
const DIST_CHROME = path.join(__dirname, '../dist/chrome');
const DIST_FIREFOX = path.join(__dirname, '../dist/firefox');

// Simple recursive copy function
function copyDir(src, dest) {
  if (!fs.existsSync(dest)) {
    fs.mkdirSync(dest, { recursive: true });
  }

  const entries = fs.readdirSync(src, { withFileTypes: true });

  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);

    if (entry.isDirectory()) {
      copyDir(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

// Clean directory
function cleanDir(dir) {
  if (fs.existsSync(dir)) {
    fs.rmSync(dir, { recursive: true });
  }
  fs.mkdirSync(dir, { recursive: true });
}

async function build() {
  console.log('Building Readtils extension...\n');

  // Clean dist directories
  console.log('Cleaning dist directories...');
  cleanDir(DIST_CHROME);
  cleanDir(DIST_FIREFOX);

  // Copy source to both
  console.log('Copying source files...');
  copyDir(SRC, DIST_CHROME);
  copyDir(SRC, DIST_FIREFOX);

  // Modify Chrome manifest - remove scripts array from background
  console.log('Configuring Chrome manifest...');
  const chromeManifestPath = path.join(DIST_CHROME, 'manifest.json');
  const chromeManifest = JSON.parse(fs.readFileSync(chromeManifestPath, 'utf8'));
  delete chromeManifest.background.scripts;
  fs.writeFileSync(chromeManifestPath, JSON.stringify(chromeManifest, null, 2));

  // Modify Firefox manifest
  console.log('Configuring Firefox manifest...');
  const firefoxManifestPath = path.join(DIST_FIREFOX, 'manifest.json');
  const firefoxManifest = JSON.parse(fs.readFileSync(firefoxManifestPath, 'utf8'));

  // Remove service_worker for Firefox
  delete firefoxManifest.background.service_worker;

  // Add Firefox-specific settings
  firefoxManifest.browser_specific_settings = {
    gecko: {
      id: "readtils@example.com",
      strict_min_version: "109.0"
    }
  };

  fs.writeFileSync(firefoxManifestPath, JSON.stringify(firefoxManifest, null, 2));

  console.log('\nBuild complete!');
  console.log(`  Chrome:  ${DIST_CHROME}`);
  console.log(`  Firefox: ${DIST_FIREFOX}`);
  console.log('\nTo load:');
  console.log('  Chrome:  chrome://extensions → Load unpacked → select dist/chrome');
  console.log('  Firefox: about:debugging → This Firefox → Load Temporary Add-on → select dist/firefox/manifest.json');
}

build().catch(err => {
  console.error('Build failed:', err);
  process.exit(1);
});
