// widget.js - Floating widget with Shadow DOM isolation
class ReadtilsWidget {
  constructor(options) {
    this.options = options;
    this.isExpanded = false;
    this.isVisible = false;
    this.container = null;
    this.shadowRoot = null;
  }

  render() {
    // Create host element
    this.container = document.createElement('div');
    this.container.id = 'readtils-widget-host';

    // Attach Shadow DOM for style isolation
    this.shadowRoot = this.container.attachShadow({ mode: 'closed' });

    // Inject styles and HTML into shadow root
    this.shadowRoot.innerHTML = `
      <style>
        :host {
          all: initial;
          position: fixed;
          bottom: 20px;
          right: 20px;
          z-index: 2147483647;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        }

        .widget-container {
          display: none;
          flex-direction: column;
          align-items: flex-end;
          gap: 8px;
        }

        .widget-container.visible {
          display: flex;
        }

        .widget-fab {
          width: 48px;
          height: 48px;
          border-radius: 50%;
          background: #2563eb;
          border: none;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 4px 12px rgba(0,0,0,0.15);
          transition: transform 0.2s, box-shadow 0.2s, background 0.2s;
        }

        .widget-fab:hover {
          transform: scale(1.05);
          box-shadow: 0 6px 16px rgba(0,0,0,0.2);
        }

        .widget-fab.expanded {
          background: #1d4ed8;
        }

        .widget-fab svg {
          width: 24px;
          height: 24px;
          fill: white;
          transition: transform 0.2s;
        }

        .widget-fab.expanded svg {
          transform: rotate(45deg);
        }

        .widget-menu {
          display: none;
          flex-direction: column;
          gap: 6px;
          padding: 8px;
          background: white;
          border-radius: 12px;
          box-shadow: 0 4px 20px rgba(0,0,0,0.15);
          opacity: 0;
          transform: translateY(10px);
          transition: opacity 0.2s, transform 0.2s;
        }

        .widget-menu.expanded {
          display: flex;
          opacity: 1;
          transform: translateY(0);
        }

        .menu-button {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 10px 14px;
          border: none;
          background: #f3f4f6;
          border-radius: 8px;
          cursor: pointer;
          font-size: 13px;
          font-weight: 500;
          color: #374151;
          transition: background 0.15s;
          white-space: nowrap;
        }

        .menu-button:hover {
          background: #e5e7eb;
        }

        .menu-button:active {
          background: #d1d5db;
        }

        .menu-button svg {
          width: 18px;
          height: 18px;
          flex-shrink: 0;
        }

        .menu-button.active {
          background: #dbeafe;
          color: #1d4ed8;
        }

        .menu-button.active:hover {
          background: #bfdbfe;
        }
      </style>

      <div class="widget-container">
        <div class="widget-menu">
          <button class="menu-button" id="dark-mode-btn">
            <svg viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 3a9 9 0 109 9c0-.46-.04-.92-.1-1.36a5.389 5.389 0 01-4.4 2.26 5.403 5.403 0 01-3.14-9.8c-.44-.06-.9-.1-1.36-.1z"/>
            </svg>
            <span>Dark Mode</span>
          </button>
          <button class="menu-button" id="markdown-btn">
            <svg viewBox="0 0 24 24" fill="currentColor">
              <path d="M20.56 18H3.44C2.65 18 2 17.37 2 16.59V7.41C2 6.63 2.65 6 3.44 6h17.12c.79 0 1.44.63 1.44 1.41v9.18c0 .78-.65 1.41-1.44 1.41M6.81 15.19v-3.66l1.92 2.35 1.92-2.35v3.66h1.93V8.81h-1.93l-1.92 2.35-1.92-2.35H4.89v6.38h1.92M19.69 12h-1.92V8.81h-1.92V12h-1.93l2.89 3.28L19.69 12z"/>
            </svg>
            <span>To Markdown</span>
          </button>
        </div>
        <button class="widget-fab" id="fab-btn">
          <svg viewBox="0 0 24 24">
            <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/>
          </svg>
        </button>
      </div>
    `;

    // Add event listeners
    this.setupEventListeners();

    // Append to body
    document.body.appendChild(this.container);
  }

  setupEventListeners() {
    const fabBtn = this.shadowRoot.getElementById('fab-btn');
    const menu = this.shadowRoot.querySelector('.widget-menu');
    const darkModeBtn = this.shadowRoot.getElementById('dark-mode-btn');
    const markdownBtn = this.shadowRoot.getElementById('markdown-btn');

    fabBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      this.isExpanded = !this.isExpanded;
      menu.classList.toggle('expanded', this.isExpanded);
      fabBtn.classList.toggle('expanded', this.isExpanded);
    });

    darkModeBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const isActive = this.options.onDarkModeToggle();
      darkModeBtn.classList.toggle('active', isActive);
    });

    markdownBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      this.options.onConvertMarkdown();
    });

    // Close menu when clicking outside
    document.addEventListener('click', (e) => {
      if (this.isExpanded && !this.container.contains(e.target)) {
        this.isExpanded = false;
        menu.classList.remove('expanded');
        fabBtn.classList.remove('expanded');
      }
    });
  }

  show() {
    this.isVisible = true;
    const container = this.shadowRoot.querySelector('.widget-container');
    container.classList.add('visible');
  }

  hide() {
    this.isVisible = false;
    this.isExpanded = false;
    const container = this.shadowRoot.querySelector('.widget-container');
    const menu = this.shadowRoot.querySelector('.widget-menu');
    const fabBtn = this.shadowRoot.getElementById('fab-btn');
    container.classList.remove('visible');
    menu.classList.remove('expanded');
    fabBtn.classList.remove('expanded');
  }

  toggle() {
    if (this.isVisible) {
      this.hide();
    } else {
      this.show();
    }
  }

  updateDarkModeButton(isActive) {
    const darkModeBtn = this.shadowRoot.getElementById('dark-mode-btn');
    darkModeBtn.classList.toggle('active', isActive);
  }

  destroy() {
    if (this.container && this.container.parentNode) {
      this.container.parentNode.removeChild(this.container);
    }
  }
}

// Export for use in content.js
window.ReadtilsWidget = ReadtilsWidget;
