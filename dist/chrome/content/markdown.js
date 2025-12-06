// markdown.js - Page to Markdown conversion
const MarkdownConverter = (function() {
  'use strict';

  // Configure Turndown service
  function createTurndownService() {
    const service = new TurndownService({
      headingStyle: 'atx',
      codeBlockStyle: 'fenced',
      bulletListMarker: '-',
      emDelimiter: '_'
    });

    // Add custom rules for common elements
    service.addRule('strikethrough', {
      filter: ['del', 's', 'strike'],
      replacement: function(content) {
        return '~~' + content + '~~';
      }
    });

    // Remove script, style, and other non-content elements
    service.remove(['script', 'style', 'noscript', 'nav', 'footer', 'aside']);

    return service;
  }

  function getMainContent() {
    // Try to find the main content area using common selectors
    const selectors = [
      'article',
      '[role="main"]',
      'main',
      '.post-content',
      '.article-content',
      '.entry-content',
      '.content',
      '#content',
      '.post',
      '.article'
    ];

    for (const selector of selectors) {
      const element = document.querySelector(selector);
      if (element && element.textContent.trim().length > 100) {
        return element;
      }
    }

    // Fallback to body
    return document.body;
  }

  function convert() {
    const turndownService = createTurndownService();
    const content = getMainContent();

    // Clone the content to avoid modifying the page
    const clone = content.cloneNode(true);

    // Remove elements that shouldn't be in markdown
    const removeSelectors = [
      'script', 'style', 'noscript', 'iframe',
      '.advertisement', '.ads', '.social-share',
      '.comments', '.comment', '.sidebar',
      '[aria-hidden="true"]',
      '#readtils-widget-host'
    ];

    removeSelectors.forEach(selector => {
      clone.querySelectorAll(selector).forEach(el => el.remove());
    });

    // Convert to markdown
    const markdown = turndownService.turndown(clone);

    // Add page metadata
    const title = document.title || 'Untitled';
    const url = window.location.href;
    const date = new Date().toISOString().split('T')[0];

    const fullMarkdown = `# ${title}

> Source: ${url}
> Captured: ${date}

---

${markdown}
`;

    // Copy to clipboard and show notification
    copyToClipboard(fullMarkdown);
    showNotification('Markdown copied to clipboard!');

    return fullMarkdown;
  }

  async function copyToClipboard(text) {
    try {
      await navigator.clipboard.writeText(text);
    } catch (err) {
      // Fallback for older browsers or restricted contexts
      const textarea = document.createElement('textarea');
      textarea.value = text;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      textarea.style.pointerEvents = 'none';
      document.body.appendChild(textarea);
      textarea.select();
      try {
        document.execCommand('copy');
      } catch (e) {
        console.warn('Readtils: Could not copy to clipboard');
      }
      document.body.removeChild(textarea);
    }
  }

  function showNotification(message) {
    // Create a simple notification in the page
    const notification = document.createElement('div');
    notification.id = 'readtils-notification';
    notification.style.cssText = `
      position: fixed;
      bottom: 80px;
      right: 20px;
      padding: 12px 20px;
      background: #10b981;
      color: white;
      border-radius: 8px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      font-size: 14px;
      font-weight: 500;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      z-index: 2147483647;
      opacity: 0;
      transform: translateX(20px);
      transition: opacity 0.2s, transform 0.2s;
    `;
    notification.textContent = message;

    document.body.appendChild(notification);

    // Trigger animation
    requestAnimationFrame(() => {
      notification.style.opacity = '1';
      notification.style.transform = 'translateX(0)';
    });

    // Remove after delay
    setTimeout(() => {
      notification.style.opacity = '0';
      notification.style.transform = 'translateX(20px)';
      setTimeout(() => {
        if (notification.parentNode) {
          notification.remove();
        }
      }, 200);
    }, 2000);
  }

  return {
    convert,
    getMainContent
  };
})();

window.MarkdownConverter = MarkdownConverter;
