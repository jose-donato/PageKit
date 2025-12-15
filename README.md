# PageKit

A minimal browser extension for Chrome and Firefox with essential web utilities: dark mode, page-to-markdown conversion, color picker, metadata viewer, and YouTube transcript extraction.

## Features

- **Dark Mode** - Toggle any webpage to dark mode using smart CSS inversion. Preserves images and videos. Remembers your preference per-site.
- **Page to Markdown** - Convert the current page content to Markdown and copy to clipboard. Great for saving articles, documentation, or any web content.
- **Color Picker** - Pick any color from the page and copy the hex code to clipboard. Uses native EyeDropper API on Chrome, canvas fallback on Firefox.
- **Page Info** - View comprehensive page metadata including Open Graph tags, Twitter Cards, and JSON-LD schema data.
- **YouTube Transcript** - Extract transcripts from YouTube videos with optional timestamps. Copy to clipboard or download as Markdown.

## Installation

### Chrome

1. Download or clone this repository
2. Run `pnpm run build` (or just use the pre-built `dist/chrome` folder)
3. Open `chrome://extensions`
4. Enable "Developer mode" (top right)
5. Click "Load unpacked"
6. Select the `dist/chrome` folder

### Firefox

1. Download or clone this repository
2. Run `pnpm run build` (or just use the pre-built `dist/firefox` folder)
3. Open `about:debugging`
4. Click "This Firefox"
5. Click "Load Temporary Add-on"
6. Select `dist/firefox/manifest.json`

## Usage

1. Click the PageKit icon in your browser toolbar
2. A minimal toolbar appears - drag to reposition, throw to the right edge to dock
3. Click any tool:
   - **Dark Mode** - Toggle dark mode on/off for the current site
   - **Markdown** - Convert page to Markdown (copied to clipboard)
   - **Color Picker** - Pick any color from the page
   - **Page Info** - View page metadata in a panel
   - **YouTube Transcript** - Extract video transcript (only on YouTube)

## Building

```bash
# Install dependencies
pnpm install

# Build for both browsers
pnpm run build

# Package as .zip files
pnpm run package:chrome
pnpm run package:firefox
```

## Project Structure

```
pagekit/
├── src/
│   ├── manifest.json           # Extension manifest
│   ├── background/
│   │   └── background.js       # Handles toolbar icon clicks, tab capture
│   ├── content/
│   │   ├── content.js          # Main entry point
│   │   ├── widget.js           # Draggable toolbar (Shadow DOM)
│   │   ├── toast.js            # Toast notifications
│   │   ├── darkmode.js         # Dark mode logic
│   │   ├── markdown.js         # Markdown conversion
│   │   └── colorpicker.js      # Color picker (EyeDropper + canvas fallback)
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

### Toolbar

The toolbar is a minimal, draggable widget that:
- Appears when you click the extension icon
- Can be dragged to any position on the page
- Docks to the right edge when thrown there (hover to expand)
- Persists position across page loads

### Dark Mode

Uses CSS filter inversion with hue rotation:

```css
html {
  filter: invert(93%) hue-rotate(180deg);
}
```

Images and videos are re-inverted to preserve their original appearance. Per-site preferences are stored using the browser's storage API.

### Markdown Conversion

Uses [Turndown](https://github.com/mixmark-io/turndown) to convert HTML to Markdown:

1. Finds the main content area (article, main, or body)
2. Removes non-content elements (scripts, nav, ads, etc.)
3. Converts to Markdown with metadata (title, URL, date)
4. Copies to clipboard

### Color Picker

- **Chrome/Edge**: Uses native EyeDropper API for seamless color picking
- **Firefox**: Falls back to canvas-based picking with a magnifier overlay

## Technical Details

- **Manifest V3** - Uses the latest extension manifest format
- **Shadow DOM** - Widget and toast styles are isolated from page CSS
- **Cross-browser** - Single codebase works on Chrome and Firefox
- **No build tools** - Plain JavaScript, no webpack/bundler required

## Dependencies

- [webextension-polyfill](https://github.com/nickreese/webextension-polyfill) - Cross-browser API compatibility
- [Turndown](https://github.com/mixmark-io/turndown) - HTML to Markdown conversion

## License

MIT
