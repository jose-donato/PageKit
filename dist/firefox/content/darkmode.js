// darkmode.js - Smart dark mode injection
const DarkMode = (function() {
  'use strict';

  let isActive = false;
  let styleElement = null;

  const DARK_MODE_CSS = `
    html {
      filter: invert(93%) hue-rotate(180deg);
      background: #111 !important;
    }

    /* Re-invert media to preserve original appearance */
    img,
    video,
    picture,
    canvas,
    iframe,
    svg image,
    [style*="background-image"] {
      filter: invert(100%) hue-rotate(180deg) !important;
    }

    /* Slightly darken re-inverted images */
    img,
    video {
      opacity: 0.9;
    }

    /* Preserve specific elements that shouldn't be inverted */
    .preserve-colors,
    [data-preserve-colors] {
      filter: invert(100%) hue-rotate(180deg) !important;
    }
  `;

  const STORAGE_KEY = 'readtils_darkmode';

  // Use chrome or browser depending on availability
  const api = typeof browser !== 'undefined' ? browser : chrome;

  async function loadState() {
    try {
      const result = await api.storage.local.get(STORAGE_KEY);
      return result[STORAGE_KEY] || {};
    } catch (e) {
      return {};
    }
  }

  async function saveState(hostname, enabled) {
    try {
      const state = await loadState();
      if (enabled) {
        state[hostname] = true;
      } else {
        delete state[hostname];
      }
      await api.storage.local.set({ [STORAGE_KEY]: state });
    } catch (e) {
      console.warn('Readtils: Could not save dark mode state');
    }
  }

  function enable() {
    if (styleElement) return;

    styleElement = document.createElement('style');
    styleElement.id = 'readtils-darkmode';
    styleElement.textContent = DARK_MODE_CSS;
    document.documentElement.appendChild(styleElement);
    isActive = true;

    saveState(window.location.hostname, true);
  }

  function disable() {
    if (styleElement && styleElement.parentNode) {
      styleElement.parentNode.removeChild(styleElement);
      styleElement = null;
    }
    isActive = false;

    saveState(window.location.hostname, false);
  }

  function toggle() {
    if (isActive) {
      disable();
    } else {
      enable();
    }
    return isActive;
  }

  async function init() {
    const state = await loadState();
    const hostname = window.location.hostname;
    if (state[hostname]) {
      enable();
    }
    return isActive;
  }

  return {
    toggle,
    enable,
    disable,
    isActive: () => isActive,
    init
  };
})();

window.DarkMode = DarkMode;
