// metadata.js - Page Metadata Viewer
const MetadataViewer = (function() {
  'use strict';

  let panelHost = null;

  function extractMetadata() {
    const metadata = {
      basic: {},
      openGraph: {},
      twitter: {},
      schema: [],
      links: {}
    };

    // Basic metadata
    metadata.basic.title = document.title || '';
    metadata.basic.description = getMetaContent('description');
    metadata.basic.keywords = getMetaContent('keywords');
    metadata.basic.author = getMetaContent('author');
    metadata.basic.robots = getMetaContent('robots');
    metadata.basic.viewport = getMetaContent('viewport');
    metadata.basic.charset = document.characterSet || '';
    metadata.basic.language = document.documentElement.lang || '';

    // Open Graph
    metadata.openGraph.title = getMetaContent('og:title');
    metadata.openGraph.description = getMetaContent('og:description');
    metadata.openGraph.image = getMetaContent('og:image');
    metadata.openGraph.url = getMetaContent('og:url');
    metadata.openGraph.type = getMetaContent('og:type');
    metadata.openGraph.siteName = getMetaContent('og:site_name');
    metadata.openGraph.locale = getMetaContent('og:locale');

    // Twitter Card
    metadata.twitter.card = getMetaContent('twitter:card');
    metadata.twitter.title = getMetaContent('twitter:title');
    metadata.twitter.description = getMetaContent('twitter:description');
    metadata.twitter.image = getMetaContent('twitter:image');
    metadata.twitter.site = getMetaContent('twitter:site');
    metadata.twitter.creator = getMetaContent('twitter:creator');

    // Link relations
    metadata.links.canonical = getLinkHref('canonical');
    metadata.links.icon = getLinkHref('icon') || getLinkHref('shortcut icon');
    metadata.links.manifest = getLinkHref('manifest');
    metadata.links.rss = getLinkHref('alternate', 'application/rss+xml');
    metadata.links.atom = getLinkHref('alternate', 'application/atom+xml');

    // JSON-LD structured data
    const scripts = document.querySelectorAll('script[type="application/ld+json"]');
    scripts.forEach(script => {
      try {
        const data = JSON.parse(script.textContent);
        metadata.schema.push(data);
      } catch (e) {
        // Invalid JSON-LD, skip
      }
    });

    return metadata;
  }

  function getMetaContent(name) {
    // Try name attribute first
    let meta = document.querySelector(`meta[name="${name}"]`);
    if (meta) return meta.getAttribute('content') || '';

    // Try property attribute (for Open Graph)
    meta = document.querySelector(`meta[property="${name}"]`);
    if (meta) return meta.getAttribute('content') || '';

    return '';
  }

  function getLinkHref(rel, type = null) {
    let selector = `link[rel="${rel}"]`;
    if (type) {
      selector += `[type="${type}"]`;
    }
    const link = document.querySelector(selector);
    return link ? link.getAttribute('href') || '' : '';
  }

  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  function truncate(str, maxLength = 100) {
    if (!str || str.length <= maxLength) return str;
    return str.substring(0, maxLength) + '...';
  }

  function renderMetadataSection(title, data, icon) {
    const entries = Object.entries(data).filter(([_, v]) => {
      if (Array.isArray(v)) return v.length > 0;
      return v && v.toString().trim() !== '';
    });

    if (entries.length === 0) return '';

    const rows = entries.map(([key, value]) => {
      const displayValue = Array.isArray(value)
        ? `[${value.length} items]`
        : escapeHtml(truncate(value.toString(), 80));
      const fullValue = Array.isArray(value)
        ? JSON.stringify(value, null, 2)
        : value.toString();

      return `
        <div class="meta-row" data-full-value="${escapeHtml(fullValue)}">
          <span class="meta-key">${escapeHtml(key)}</span>
          <span class="meta-value" title="${escapeHtml(fullValue)}">${displayValue}</span>
          <button class="copy-btn" data-value="${escapeHtml(fullValue)}" title="Copy">
            <svg viewBox="0 0 24 24"><path d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z"/></svg>
          </button>
        </div>
      `;
    }).join('');

    return `
      <div class="meta-section">
        <div class="section-header">
          <span class="section-icon">${icon}</span>
          <span class="section-title">${title}</span>
          <span class="section-count">${entries.length}</span>
        </div>
        <div class="section-content">
          ${rows}
        </div>
      </div>
    `;
  }

  function renderSchemaSection(schemaData) {
    if (!schemaData || schemaData.length === 0) return '';

    const items = schemaData.map((item, index) => {
      const type = item['@type'] || 'Unknown';
      const preview = JSON.stringify(item, null, 2);
      return `
        <div class="schema-item">
          <div class="schema-header" data-index="${index}">
            <span class="schema-type">${escapeHtml(Array.isArray(type) ? type.join(', ') : type)}</span>
            <svg class="chevron" viewBox="0 0 24 24"><path d="M7.41 8.59L12 13.17l4.59-4.58L18 10l-6 6-6-6 1.41-1.41z"/></svg>
          </div>
          <pre class="schema-content" data-index="${index}">${escapeHtml(preview)}</pre>
        </div>
      `;
    }).join('');

    return `
      <div class="meta-section">
        <div class="section-header">
          <span class="section-icon">
            <svg viewBox="0 0 24 24"><path d="M9.4 16.6L4.8 12l4.6-4.6L8 6l-6 6 6 6 1.4-1.4zm5.2 0l4.6-4.6-4.6-4.6L16 6l6 6-6 6-1.4-1.4z"/></svg>
          </span>
          <span class="section-title">Structured Data (JSON-LD)</span>
          <span class="section-count">${schemaData.length}</span>
        </div>
        <div class="section-content schema-section">
          ${items}
        </div>
      </div>
    `;
  }

  function show() {
    // Remove existing panel if any
    close();

    const metadata = extractMetadata();

    // Create panel host with Shadow DOM
    panelHost = document.createElement('div');
    panelHost.id = 'readtils-metadata-host';
    const shadow = panelHost.attachShadow({ mode: 'closed' });

    shadow.innerHTML = `
      <style>
        :host {
          all: initial;
          position: fixed;
          top: 0;
          right: 0;
          bottom: 0;
          width: 380px;
          max-width: 100vw;
          z-index: 2147483646;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
        }

        * {
          box-sizing: border-box;
        }

        .panel {
          display: flex;
          flex-direction: column;
          height: 100%;
          background: rgba(17, 17, 19, 0.98);
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          border-left: 1px solid rgba(255, 255, 255, 0.08);
          color: #e4e4e7;
          transform: translateX(100%);
          transition: transform 0.25s cubic-bezier(0.16, 1, 0.3, 1);
        }

        .panel.visible {
          transform: translateX(0);
        }

        .panel-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 14px 16px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.08);
          flex-shrink: 0;
        }

        .panel-title {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 13px;
          font-weight: 600;
          color: #fafafa;
        }

        .panel-title svg {
          width: 16px;
          height: 16px;
          fill: #a1a1aa;
        }

        .close-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 28px;
          height: 28px;
          padding: 0;
          border: none;
          background: transparent;
          border-radius: 6px;
          cursor: pointer;
          transition: background 0.15s ease;
        }

        .close-btn:hover {
          background: rgba(255, 255, 255, 0.08);
        }

        .close-btn svg {
          width: 16px;
          height: 16px;
          fill: #71717a;
        }

        .close-btn:hover svg {
          fill: #a1a1aa;
        }

        .panel-content {
          flex: 1;
          overflow-y: auto;
          padding: 12px;
        }

        .panel-content::-webkit-scrollbar {
          width: 6px;
        }

        .panel-content::-webkit-scrollbar-track {
          background: transparent;
        }

        .panel-content::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.1);
          border-radius: 3px;
        }

        .panel-content::-webkit-scrollbar-thumb:hover {
          background: rgba(255, 255, 255, 0.15);
        }

        .meta-section {
          margin-bottom: 12px;
          background: rgba(255, 255, 255, 0.02);
          border: 1px solid rgba(255, 255, 255, 0.06);
          border-radius: 8px;
          overflow: hidden;
        }

        .section-header {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 10px 12px;
          background: rgba(255, 255, 255, 0.03);
          border-bottom: 1px solid rgba(255, 255, 255, 0.06);
        }

        .section-icon {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 18px;
          height: 18px;
          color: #71717a;
        }

        .section-icon svg {
          width: 14px;
          height: 14px;
          fill: currentColor;
        }

        .section-title {
          flex: 1;
          font-size: 11px;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          color: #a1a1aa;
        }

        .section-count {
          font-size: 10px;
          font-weight: 500;
          padding: 2px 6px;
          background: rgba(99, 102, 241, 0.15);
          color: #a5b4fc;
          border-radius: 4px;
        }

        .section-content {
          padding: 8px;
        }

        .meta-row {
          display: flex;
          align-items: flex-start;
          gap: 8px;
          padding: 6px 8px;
          border-radius: 4px;
          transition: background 0.15s ease;
        }

        .meta-row:hover {
          background: rgba(255, 255, 255, 0.04);
        }

        .meta-key {
          flex-shrink: 0;
          width: 90px;
          font-size: 11px;
          font-weight: 500;
          color: #71717a;
          text-transform: capitalize;
        }

        .meta-value {
          flex: 1;
          font-size: 12px;
          color: #e4e4e7;
          word-break: break-word;
          line-height: 1.4;
        }

        .copy-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 22px;
          height: 22px;
          padding: 0;
          border: none;
          background: transparent;
          border-radius: 4px;
          cursor: pointer;
          opacity: 0;
          transition: opacity 0.15s ease, background 0.15s ease;
          flex-shrink: 0;
        }

        .meta-row:hover .copy-btn {
          opacity: 1;
        }

        .copy-btn:hover {
          background: rgba(255, 255, 255, 0.08);
        }

        .copy-btn svg {
          width: 12px;
          height: 12px;
          fill: #71717a;
        }

        .copy-btn:hover svg {
          fill: #a1a1aa;
        }

        .copy-btn.copied svg {
          fill: #4ade80;
        }

        /* Schema section */
        .schema-section {
          padding: 4px 8px;
        }

        .schema-item {
          margin-bottom: 4px;
        }

        .schema-item:last-child {
          margin-bottom: 0;
        }

        .schema-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 8px 10px;
          background: rgba(255, 255, 255, 0.03);
          border-radius: 4px;
          cursor: pointer;
          transition: background 0.15s ease;
        }

        .schema-header:hover {
          background: rgba(255, 255, 255, 0.06);
        }

        .schema-type {
          font-size: 12px;
          font-weight: 500;
          color: #a5b4fc;
        }

        .chevron {
          width: 16px;
          height: 16px;
          fill: #71717a;
          transition: transform 0.2s ease;
        }

        .schema-header.expanded .chevron {
          transform: rotate(180deg);
        }

        .schema-content {
          display: none;
          margin: 4px 0 0;
          padding: 10px;
          background: rgba(0, 0, 0, 0.3);
          border-radius: 4px;
          font-family: ui-monospace, 'SF Mono', 'Consolas', monospace;
          font-size: 11px;
          line-height: 1.5;
          color: #a1a1aa;
          white-space: pre-wrap;
          word-break: break-word;
          overflow-x: auto;
          max-height: 300px;
          overflow-y: auto;
        }

        .schema-content.expanded {
          display: block;
        }

        .empty-state {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 40px 20px;
          text-align: center;
          color: #71717a;
        }

        .empty-state svg {
          width: 48px;
          height: 48px;
          fill: #3f3f46;
          margin-bottom: 12px;
        }

        .empty-state p {
          margin: 0;
          font-size: 13px;
        }

        .url-bar {
          padding: 8px 12px;
          margin-bottom: 12px;
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid rgba(255, 255, 255, 0.06);
          border-radius: 6px;
          font-size: 11px;
          color: #71717a;
          word-break: break-all;
          line-height: 1.4;
        }

        .url-bar strong {
          color: #a1a1aa;
        }
      </style>

      <div class="panel">
        <div class="panel-header">
          <div class="panel-title">
            <svg viewBox="0 0 24 24"><path d="M14 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V8l-6-6zm4 18H6V4h7v5h5v11zm-3-7H9v-2h6v2zm0 4H9v-2h6v2z"/></svg>
            Page Metadata
          </div>
          <button class="close-btn" id="close-btn" title="Close">
            <svg viewBox="0 0 24 24"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>
          </button>
        </div>
        <div class="panel-content">
          <div class="url-bar">
            <strong>URL:</strong> ${escapeHtml(window.location.href)}
          </div>
          ${renderMetadataSection('Basic', metadata.basic, '<svg viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/></svg>')}
          ${renderMetadataSection('Open Graph', metadata.openGraph, '<svg viewBox="0 0 24 24"><path d="M18 16.08c-.76 0-1.44.3-1.96.77L8.91 12.7c.05-.23.09-.46.09-.7s-.04-.47-.09-.7l7.05-4.11c.54.5 1.25.81 2.04.81 1.66 0 3-1.34 3-3s-1.34-3-3-3-3 1.34-3 3c0 .24.04.47.09.7L8.04 9.81C7.5 9.31 6.79 9 6 9c-1.66 0-3 1.34-3 3s1.34 3 3 3c.79 0 1.5-.31 2.04-.81l7.12 4.16c-.05.21-.08.43-.08.65 0 1.61 1.31 2.92 2.92 2.92s2.92-1.31 2.92-2.92-1.31-2.92-2.92-2.92z"/></svg>')}
          ${renderMetadataSection('Twitter Card', metadata.twitter, '<svg viewBox="0 0 24 24"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>')}
          ${renderMetadataSection('Links', metadata.links, '<svg viewBox="0 0 24 24"><path d="M3.9 12c0-1.71 1.39-3.1 3.1-3.1h4V7H7c-2.76 0-5 2.24-5 5s2.24 5 5 5h4v-1.9H7c-1.71 0-3.1-1.39-3.1-3.1zM8 13h8v-2H8v2zm9-6h-4v1.9h4c1.71 0 3.1 1.39 3.1 3.1s-1.39 3.1-3.1 3.1h-4V17h4c2.76 0 5-2.24 5-5s-2.24-5-5-5z"/></svg>')}
          ${renderSchemaSection(metadata.schema)}
        </div>
      </div>
    `;

    document.body.appendChild(panelHost);

    // Setup event listeners
    const panel = shadow.querySelector('.panel');
    const closeBtn = shadow.getElementById('close-btn');

    // Show animation
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        panel.classList.add('visible');
      });
    });

    // Close button
    closeBtn.addEventListener('click', close);

    // Copy buttons
    shadow.querySelectorAll('.copy-btn').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const value = btn.getAttribute('data-value');
        try {
          await navigator.clipboard.writeText(value);
          btn.classList.add('copied');
          setTimeout(() => btn.classList.remove('copied'), 1000);
        } catch (err) {
          // Fallback
          const textarea = document.createElement('textarea');
          textarea.value = value;
          textarea.style.position = 'fixed';
          textarea.style.opacity = '0';
          document.body.appendChild(textarea);
          textarea.select();
          document.execCommand('copy');
          document.body.removeChild(textarea);
          btn.classList.add('copied');
          setTimeout(() => btn.classList.remove('copied'), 1000);
        }
      });
    });

    // Schema expand/collapse
    shadow.querySelectorAll('.schema-header').forEach(header => {
      header.addEventListener('click', () => {
        const index = header.getAttribute('data-index');
        const content = shadow.querySelector(`.schema-content[data-index="${index}"]`);
        header.classList.toggle('expanded');
        content.classList.toggle('expanded');
      });
    });

    // Close on Escape
    const handleKeydown = (e) => {
      if (e.key === 'Escape') {
        close();
        document.removeEventListener('keydown', handleKeydown);
      }
    };
    document.addEventListener('keydown', handleKeydown);
  }

  function close() {
    if (panelHost) {
      const shadow = panelHost.shadowRoot;
      if (shadow) {
        const panel = shadow.querySelector('.panel');
        if (panel) {
          panel.classList.remove('visible');
          setTimeout(() => {
            if (panelHost && panelHost.parentNode) {
              panelHost.remove();
            }
            panelHost = null;
          }, 250);
        } else {
          if (panelHost.parentNode) {
            panelHost.remove();
          }
          panelHost = null;
        }
      } else {
        if (panelHost.parentNode) {
          panelHost.remove();
        }
        panelHost = null;
      }
    }
  }

  function toggle() {
    if (panelHost) {
      close();
    } else {
      show();
    }
  }

  return {
    show,
    close,
    toggle,
    extractMetadata
  };
})();

window.MetadataViewer = MetadataViewer;
