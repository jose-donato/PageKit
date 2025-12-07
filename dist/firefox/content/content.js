// content.js - Main entry point
(function() {
  'use strict';

  // Avoid running in iframes or if already initialized
  if (window.self !== window.top) return;
  if (window.__readtilsInitialized) return;
  window.__readtilsInitialized = true;

  // Use chrome or browser depending on availability
  const api = typeof browser !== 'undefined' ? browser : chrome;

  let widget = null;

  // Initialize widget and modules
  async function init() {
    // Initialize dark mode (restores per-site state)
    const darkModeActive = await DarkMode.init();

    // Create the widget (hidden by default)
    widget = new ReadtilsWidget({
      onDarkModeToggle: () => DarkMode.toggle(),
      onConvertMarkdown: () => MarkdownConverter.convert(),
      onPickColor: () => ColorPicker.pick()
    });
    widget.render();

    // Update dark mode button if it was restored
    if (darkModeActive) {
      widget.updateDarkModeButton(true);
    }
  }

  // Listen for messages from background script
  api.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === 'toggleWidget') {
      if (widget) {
        widget.toggle();
        sendResponse({ success: true, visible: widget.isVisible });
      } else {
        sendResponse({ success: false, error: 'Widget not initialized' });
      }
    }
    return true;
  });

  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
