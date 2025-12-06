# Readtils

A minimalistic browser extension for Chrome and Firefox with reading utilities: dark mode toggle and page-to-markdown conversion.

## Features

- **Dark Mode** - Toggle any webpage to dark mode using smart CSS inversion. Preserves images and videos. Remembers your preference per-site.
- **Page to Markdown** - Convert the current page content to Markdown and copy to clipboard. Useful for saving articles, documentation, or any web content.

## Installation

### Chrome

1. Download or clone this repository
2. Run `npm run build` (or just use the pre-built `dist/chrome` folder)
3. Open `chrome://extensions`
4. Enable "Developer mode" (top right)
5. Click "Load unpacked"
6. Select the `dist/chrome` folder

### Firefox

1. Download or clone this repository
2. Run `npm run build` (or just use the pre-built `dist/firefox` folder)
3. Open `about:debugging`
4. Click "This Firefox"
5. Click "Load Temporary Add-on"
6. Select `dist/firefox/manifest.json`

## Usage

1. Click the Readtils icon in your browser toolbar
2. A floating button appears in the bottom-right corner
3. Click the button to expand the menu
4. Choose an action:
   - **Dark Mode** - Toggle dark mode on/off for the current site
   - **To Markdown** - Convert page to Markdown (copied to clipboard)

## Building

```bash
# Install dependencies (only needed for build script)
npm install

# Build for both browsers
npm run build

# Package as .zip files
npm run package:chrome
npm run package:firefox
```

## Project Structure

```
readtils-extension/
├── src/
│   ├── manifest.json           # Extension manifest (unified)
│   ├── background/
│   │   └── background.js       # Handles toolbar icon clicks
│   ├── content/
│   │   ├── content.js          # Main entry point
│   │   ├── widget.js           # Floating UI (Shadow DOM)
│   │   ├── darkmode.js         # Dark mode logic
│   │   └── markdown.js         # Markdown conversion
│   ├── lib/
│   │   ├── browser-polyfill.min.js
│   │   └── turndown.min.js
│   └── icons/
├── dist/
│   ├── chrome/                 # Chrome build
│   └── firefox/                # Firefox build
├── scripts/
│   └── build.js                # Build script
└── package.json
```

## How It Works

### Dark Mode

Uses CSS filter inversion with hue rotation to create a dark theme:

```css
html {
  filter: invert(93%) hue-rotate(180deg);
}
```

Images and videos are re-inverted to preserve their original appearance. Per-site preferences are stored using the browser's storage API.

### Markdown Conversion

Uses [Turndown](https://github.com/mixmark-io/turndown) to convert HTML to Markdown. The extension:

1. Finds the main content area (article, main, or body)
2. Removes non-content elements (scripts, nav, ads, etc.)
3. Converts to Markdown with metadata (title, URL, date)
4. Copies to clipboard

## Technical Details

- **Manifest V3** - Uses the latest extension manifest format
- **Shadow DOM** - Widget styles are isolated from page CSS
- **Cross-browser** - Single codebase works on Chrome and Firefox
- **No build tools** - Plain JavaScript, no webpack/bundler required

## Dependencies

- [webextension-polyfill](https://github.com/nickreese/webextension-polyfill) - Cross-browser API compatibility
- [Turndown](https://github.com/mixmark-io/turndown) - HTML to Markdown conversion

## License

MIT
