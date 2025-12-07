// background.js - Background service worker / script
(function() {
  'use strict';

  // Use chrome or browser depending on availability
  const api = typeof browser !== 'undefined' ? browser : chrome;

  // Handle extension icon click - toggle widget visibility
  api.action.onClicked.addListener(async (tab) => {
    try {
      await api.tabs.sendMessage(tab.id, { action: 'toggleWidget' });
    } catch (err) {
      // Content script not loaded yet, this can happen on restricted pages
      console.log('Readtils: Could not toggle widget -', err.message);
    }
  });

  // Listen for messages from content scripts
  api.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === 'getState') {
      api.storage.local.get('readtils_state').then(result => {
        sendResponse(result.readtils_state || {});
      });
      return true;
    }

    if (message.action === 'setState') {
      api.storage.local.set({ readtils_state: message.state });
      sendResponse({ success: true });
      return true;
    }

    if (message.action === 'captureTab') {
      api.tabs.captureVisibleTab(null, { format: 'png' })
        .then(dataUrl => {
          sendResponse({ success: true, dataUrl });
        })
        .catch(err => {
          sendResponse({ success: false, error: err.message });
        });
      return true;
    }
  });

  // Log installation
  api.runtime.onInstalled.addListener((details) => {
    if (details.reason === 'install') {
      console.log('Readtils extension installed');
    }
  });
})();
