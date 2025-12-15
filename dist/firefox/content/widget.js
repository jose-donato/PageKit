// widget.js - Draggable minimal toolbar with dock-to-edge
class ReadtilsWidget {
  constructor(options) {
    this.options = options;
    this.isVisible = false;
    this.isDocked = false;
    this.container = null;
    this.shadowRoot = null;

    // Position state
    this.position = { x: 0, y: 0 };
    this.isDragging = false;
    this.dragOffset = { x: 0, y: 0 };
    this.velocity = { x: 0, y: 0 };
    this.lastMousePos = { x: 0, y: 0 };
    this.lastMoveTime = 0;

    // Edge detection
    this.DOCK_THRESHOLD = 60;
    this.EDGE_MARGIN = 16;
    this.TOOLBAR_WIDTH = 196;
    
    // Storage key
    this.STORAGE_KEY = 'readtils_widget_state';
    this.api = typeof browser !== 'undefined' ? browser : chrome;
  }

  async loadState() {
    try {
      const result = await this.api.storage.local.get(this.STORAGE_KEY);
      return result[this.STORAGE_KEY] || {};
    } catch (e) {
      return {};
    }
  }

  async saveState() {
    try {
      await this.api.storage.local.set({
        [this.STORAGE_KEY]: {
          position: this.position,
          isDocked: this.isDocked,
          isVisible: this.isVisible
        }
      });
    } catch (e) {}
  }

  render() {
    this.container = document.createElement('div');
    this.container.id = 'readtils-widget-host';
    this.shadowRoot = this.container.attachShadow({ mode: 'closed' });

    this.shadowRoot.innerHTML = `
      <style>
        :host {
          all: initial;
          position: fixed;
          z-index: 2147483647;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
        }

        * {
          box-sizing: border-box;
        }

        .toolbar {
          display: none;
          position: fixed;
          user-select: none;
          touch-action: none;
        }

        .toolbar.visible {
          display: flex;
        }

        .toolbar-inner {
          display: flex;
          align-items: center;
          gap: 1px;
          padding: 3px;
          background: rgba(24, 24, 27, 0.95);
          backdrop-filter: blur(8px);
          -webkit-backdrop-filter: blur(8px);
          border: 1px solid rgba(255, 255, 255, 0.06);
          border-radius: 8px;
          transition: transform 0.2s cubic-bezier(0.16, 1, 0.3, 1),
                      border-radius 0.2s cubic-bezier(0.16, 1, 0.3, 1),
                      border-color 0.2s ease;
        }

        .toolbar.dragging .toolbar-inner {
          transform: scale(1.02);
          border-color: rgba(255, 255, 255, 0.1);
        }

        /* Docked state */
        .toolbar.docked .toolbar-inner {
          border-radius: 8px 0 0 8px;
          border-right-color: transparent;
        }

        /* Actions container - fixed width, clip when docked */
        .actions {
          display: flex;
          align-items: center;
          gap: 1px;
          overflow: hidden;
          transition: width 0.25s cubic-bezier(0.16, 1, 0.3, 1),
                      opacity 0.2s ease;
        }

        .actions-inner {
          display: flex;
          align-items: center;
          gap: 1px;
          flex-shrink: 0;
        }

        /* Docked: collapse actions */
        .toolbar.docked .actions {
          width: 0;
          opacity: 0;
        }

        /* Hover expand when docked */
        .toolbar.docked:hover .actions {
          width: 152px;
          opacity: 1;
        }

        .toolbar.docked:hover .toolbar-inner {
          border-radius: 8px;
          border-right-color: rgba(255, 255, 255, 0.06);
        }

        .grip {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 14px;
          height: 24px;
          cursor: grab;
          border-radius: 4px;
          transition: background 0.15s ease;
          flex-shrink: 0;
        }

        .grip:hover {
          background: rgba(255, 255, 255, 0.06);
        }

        .grip:active {
          cursor: grabbing;
        }

        .grip-dots {
          display: flex;
          flex-direction: column;
          gap: 2px;
          opacity: 0.4;
        }

        .grip-dots span {
          width: 3px;
          height: 3px;
          background: currentColor;
          border-radius: 50%;
          color: #a1a1aa;
        }

        .divider {
          width: 1px;
          height: 16px;
          background: rgba(255, 255, 255, 0.08);
          flex-shrink: 0;
        }

        .action-btn {
          position: relative;
          display: flex;
          align-items: center;
          justify-content: center;
          width: 28px;
          height: 24px;
          padding: 0;
          border: none;
          background: transparent;
          border-radius: 4px;
          cursor: pointer;
          flex-shrink: 0;
          transition: background 0.15s ease,
                      transform 0.12s ease;
        }

        .action-btn:hover {
          background: rgba(255, 255, 255, 0.08);
        }

        .action-btn:active {
          transform: scale(0.94);
        }

        .action-btn svg {
          width: 14px;
          height: 14px;
          fill: #a1a1aa;
          transition: fill 0.15s ease;
        }

        .action-btn:hover svg {
          fill: #e4e4e7;
        }

        .action-btn.active {
          background: rgba(99, 102, 241, 0.15);
        }

        .action-btn.active svg {
          fill: #a5b4fc;
        }

        .action-btn.active:hover {
          background: rgba(99, 102, 241, 0.25);
        }

        .action-btn.active:hover svg {
          fill: #c7d2fe;
        }

        /* Tooltip */
        .action-btn[data-tooltip]::after {
          content: attr(data-tooltip);
          position: absolute;
          bottom: calc(100% + 6px);
          left: 50%;
          transform: translateX(-50%) translateY(4px);
          padding: 4px 8px;
          background: rgba(9, 9, 11, 0.95);
          color: #e4e4e7;
          font-size: 11px;
          font-weight: 500;
          white-space: nowrap;
          border-radius: 4px;
          border: 1px solid rgba(255, 255, 255, 0.06);
          opacity: 0;
          pointer-events: none;
          transition: all 0.15s cubic-bezier(0.16, 1, 0.3, 1);
        }

        .action-btn:hover[data-tooltip]::after {
          opacity: 1;
          transform: translateX(-50%) translateY(0);
        }

        /* Success flash */
        .action-btn.success svg {
          fill: #4ade80;
        }

        /* Disabled state */
        .action-btn:disabled {
          cursor: not-allowed;
          opacity: 0.35;
        }

        .action-btn:disabled:hover {
          background: transparent;
        }

        .action-btn:disabled svg {
          fill: #71717a;
        }
      </style>

      <div class="toolbar">
        <div class="toolbar-inner">
          <div class="grip">
            <div class="grip-dots">
              <span></span>
              <span></span>
              <span></span>
            </div>
          </div>
          <div class="actions">
            <div class="actions-inner">
              <div class="divider"></div>
              <button class="action-btn" id="dark-mode-btn" data-tooltip="Dark Mode">
                <svg viewBox="0 0 24 24">
                  <path d="M12 3a9 9 0 109 9c0-.46-.04-.92-.1-1.36a5.389 5.389 0 01-4.4 2.26 5.403 5.403 0 01-3.14-9.8c-.44-.06-.9-.1-1.36-.1z"/>
                </svg>
              </button>
              <button class="action-btn" id="markdown-btn" data-tooltip="Copy Markdown">
                <svg viewBox="0 0 24 24">
                  <path d="m16 15l3-3l-1.05-1.075l-1.2 1.2V9h-1.5v3.125l-1.2-1.2L13 12zM4 20q-.825 0-1.412-.587T2 18V6q0-.825.588-1.412T4 4h16q.825 0 1.413.588T22 6v12q0 .825-.587 1.413T20 20zm1.5-5H7v-4.5h1v3h1.5v-3h1V15H12v-5q0-.425-.288-.712T11 9H6.5q-.425 0-.712.288T5.5 10z"/>
                </svg>
              </button>
              <button class="action-btn" id="colorpicker-btn" data-tooltip="Pick Color">
                <svg viewBox="0 0 24 24">
                  <path d="M20.71 5.63l-2.34-2.34a1 1 0 00-1.41 0l-3.12 3.12-1.42-1.42-1.41 1.42 1.41 1.41-7.78 7.78a2 2 0 00-.59 1.42v2.34a1 1 0 001 1h2.34a2 2 0 001.42-.59l7.78-7.78 1.41 1.41 1.42-1.41-1.42-1.42 3.12-3.12a1 1 0 00.09-1.32zM6.41 19H5v-1.41l7.78-7.78 1.41 1.41L6.41 19z"/>
                </svg>
              </button>
              <button class="action-btn" id="metadata-btn" data-tooltip="Page Info">
                <svg viewBox="0 0 24 24">
                  <path d="M14 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V8l-6-6zm4 18H6V4h7v5h5v11zm-3-7H9v-2h6v2zm0 4H9v-2h6v2z"/>
                </svg>
              </button>
              <button class="action-btn" id="transcript-btn" data-tooltip="YouTube Transcript" disabled>
                <svg viewBox="0 0 24 24">
                  <path d="M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 14H4V6h16v12zM6 10h2v2H6v-2zm0 4h8v2H6v-2zm10 0h2v2h-2v-2zm-6-4h8v2h-8v-2z"/>
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>
    `;

    this.setupEventListeners();
    document.body.appendChild(this.container);
    
    this.initPosition();
  }

  async initPosition() {
    const state = await this.loadState();
    const toolbar = this.shadowRoot.querySelector('.toolbar');

    if (state.position) {
      this.position = state.position;
      this.isDocked = state.isDocked || false;
    } else {
      this.position = {
        x: window.innerWidth - this.TOOLBAR_WIDTH - this.EDGE_MARGIN,
        y: window.innerHeight - 60
      };
    }

    this.clampPosition();
    this.updateToolbarPosition();

    if (this.isDocked) {
      toolbar.classList.add('docked');
    }

    if (state.isVisible) {
      this.isVisible = true;
      toolbar.classList.add('visible');
    }
  }

  clampPosition() {
    const height = 32;
    const width = this.isDocked ? 24 : this.TOOLBAR_WIDTH;
    
    this.position.x = Math.max(this.EDGE_MARGIN, 
      Math.min(window.innerWidth - width - this.EDGE_MARGIN, this.position.x));
    this.position.y = Math.max(this.EDGE_MARGIN, 
      Math.min(window.innerHeight - height - this.EDGE_MARGIN, this.position.y));
  }

  updateToolbarPosition() {
    const toolbar = this.shadowRoot.querySelector('.toolbar');
    if (!toolbar) return;
    
    if (this.isDocked) {
      toolbar.style.right = '0';
      toolbar.style.left = 'auto';
      toolbar.style.top = `${this.position.y}px`;
    } else {
      toolbar.style.left = `${this.position.x}px`;
      toolbar.style.top = `${this.position.y}px`;
      toolbar.style.right = 'auto';
    }
  }

  setupEventListeners() {
    const toolbar = this.shadowRoot.querySelector('.toolbar');
    const grip = this.shadowRoot.querySelector('.grip');
    const darkModeBtn = this.shadowRoot.getElementById('dark-mode-btn');
    const markdownBtn = this.shadowRoot.getElementById('markdown-btn');
    const colorpickerBtn = this.shadowRoot.getElementById('colorpicker-btn');
    const metadataBtn = this.shadowRoot.getElementById('metadata-btn');
    const transcriptBtn = this.shadowRoot.getElementById('transcript-btn');

    // Drag handling
    grip.addEventListener('mousedown', this.startDrag.bind(this));
    document.addEventListener('mousemove', this.onDrag.bind(this));
    document.addEventListener('mouseup', this.endDrag.bind(this));

    // Touch support
    grip.addEventListener('touchstart', this.startDrag.bind(this), { passive: false });
    document.addEventListener('touchmove', this.onDrag.bind(this), { passive: false });
    document.addEventListener('touchend', this.endDrag.bind(this));

    // Action buttons
    darkModeBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const isActive = this.options.onDarkModeToggle();
      darkModeBtn.classList.toggle('active', isActive);
    });

    markdownBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      this.options.onConvertMarkdown();
      
      // Visual feedback
      markdownBtn.classList.add('success');
      setTimeout(() => markdownBtn.classList.remove('success'), 500);
    });

    colorpickerBtn.addEventListener('click', async (e) => {
      e.stopPropagation();
      const result = await this.options.onPickColor();

      if (result.success) {
        // Update tooltip temporarily to show picked color
        const originalTooltip = colorpickerBtn.getAttribute('data-tooltip');
        colorpickerBtn.setAttribute('data-tooltip', `Copied ${result.color}`);
        colorpickerBtn.classList.add('success');

        setTimeout(() => {
          colorpickerBtn.classList.remove('success');
          colorpickerBtn.setAttribute('data-tooltip', originalTooltip);
        }, 1500);
      } else if (result.error) {
        colorpickerBtn.setAttribute('data-tooltip', result.error);
        setTimeout(() => {
          colorpickerBtn.setAttribute('data-tooltip', 'Pick Color');
        }, 2000);
      }
    });

    metadataBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      this.options.onViewMetadata();
    });

    transcriptBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      if (transcriptBtn.disabled) return;
      this.options.onExtractTranscript();
    });

    // Window resize
    window.addEventListener('resize', () => {
      this.clampPosition();
      this.updateToolbarPosition();
    });
  }

  startDrag(e) {
    e.preventDefault();
    
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    
    // If docked, undock first and calculate proper position
    if (this.isDocked) {
      const toolbar = this.shadowRoot.querySelector('.toolbar');
      toolbar.classList.remove('docked');
      this.isDocked = false;
      
      // Set position near the right edge where user clicked
      this.position.x = window.innerWidth - this.TOOLBAR_WIDTH - this.EDGE_MARGIN;
      this.position.y = clientY - 16; // Center on cursor
      this.clampPosition();
      this.updateToolbarPosition();
    }
    
    this.isDragging = true;
    
    const toolbar = this.shadowRoot.querySelector('.toolbar');
    toolbar.classList.add('dragging');

    this.dragOffset = {
      x: clientX - this.position.x,
      y: clientY - this.position.y
    };
    
    this.lastMousePos = { x: clientX, y: clientY };
    this.lastMoveTime = Date.now();
    this.velocity = { x: 0, y: 0 };
  }

  onDrag(e) {
    if (!this.isDragging) return;
    e.preventDefault();

    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;

    const now = Date.now();
    const dt = Math.max(1, now - this.lastMoveTime);
    
    this.velocity = {
      x: (clientX - this.lastMousePos.x) / dt * 16,
      y: (clientY - this.lastMousePos.y) / dt * 16
    };

    this.lastMousePos = { x: clientX, y: clientY };
    this.lastMoveTime = now;

    this.position = {
      x: clientX - this.dragOffset.x,
      y: clientY - this.dragOffset.y
    };

    this.clampPosition();
    this.updateToolbarPosition();
  }

  endDrag(e) {
    if (!this.isDragging) return;
    this.isDragging = false;

    const toolbar = this.shadowRoot.querySelector('.toolbar');
    toolbar.classList.remove('dragging');

    const clientX = e.changedTouches ? e.changedTouches[0].clientX : e.clientX;
    
    // Check if thrown to right edge
    const distFromRight = window.innerWidth - clientX;
    const throwingRight = this.velocity.x > 3;
    
    if (distFromRight < this.DOCK_THRESHOLD || throwingRight) {
      this.dock();
    } else {
      this.saveState();
    }
  }

  dock() {
    this.isDocked = true;
    const toolbar = this.shadowRoot.querySelector('.toolbar');
    toolbar.classList.add('docked');
    this.position.x = window.innerWidth;
    this.updateToolbarPosition();
    this.saveState();
  }

  undock() {
    this.isDocked = false;
    const toolbar = this.shadowRoot.querySelector('.toolbar');
    toolbar.classList.remove('docked');
    
    this.position.x = window.innerWidth - this.TOOLBAR_WIDTH - this.EDGE_MARGIN;
    this.clampPosition();
    this.updateToolbarPosition();
    this.saveState();
  }

  show() {
    if (this.isVisible) {
      if (this.isDocked) {
        this.undock();
      }
      return;
    }

    this.isVisible = true;
    const toolbar = this.shadowRoot.querySelector('.toolbar');
    toolbar.classList.add('visible');
    this.saveState();
  }

  hide() {
    this.isVisible = false;
    const toolbar = this.shadowRoot.querySelector('.toolbar');
    toolbar.classList.remove('visible');
    this.saveState();
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

  updateTranscriptButton(isEnabled) {
    const transcriptBtn = this.shadowRoot.getElementById('transcript-btn');
    transcriptBtn.disabled = !isEnabled;
  }

  destroy() {
    if (this.container && this.container.parentNode) {
      this.container.parentNode.removeChild(this.container);
    }
  }
}

window.ReadtilsWidget = ReadtilsWidget;
