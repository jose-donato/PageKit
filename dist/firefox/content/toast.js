// toast.js - Minimal toast notifications
const Toast = (function() {
  'use strict';

  let currentToast = null;
  let hideTimeout = null;

  function show(message, options = {}) {
    const { duration = 2000, type = 'success' } = options;
    
    // Remove existing toast
    if (currentToast && currentToast.parentNode) {
      currentToast.remove();
    }
    if (hideTimeout) {
      clearTimeout(hideTimeout);
    }

    // Create toast container with Shadow DOM for isolation
    const host = document.createElement('div');
    host.id = 'readtils-toast-host';
    const shadow = host.attachShadow({ mode: 'closed' });

    const iconSvg = type === 'success' 
      ? `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>`
      : `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/></svg>`;

    shadow.innerHTML = `
      <style>
        :host {
          all: initial;
          position: fixed;
          bottom: 20px;
          right: 20px;
          z-index: 2147483647;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
          pointer-events: none;
        }

        .toast {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 10px 14px;
          background: rgba(24, 24, 27, 0.95);
          backdrop-filter: blur(8px);
          -webkit-backdrop-filter: blur(8px);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 8px;
          color: #e4e4e7;
          font-size: 13px;
          font-weight: 500;
          opacity: 0;
          transform: translateY(8px);
          transition: opacity 0.2s cubic-bezier(0.16, 1, 0.3, 1),
                      transform 0.2s cubic-bezier(0.16, 1, 0.3, 1);
        }

        .toast.visible {
          opacity: 1;
          transform: translateY(0);
        }

        .toast.hiding {
          opacity: 0;
          transform: translateY(8px);
        }

        .icon {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 16px;
          height: 16px;
          flex-shrink: 0;
        }

        .icon svg {
          width: 14px;
          height: 14px;
        }

        .icon.success {
          color: #4ade80;
        }

        .icon.error {
          color: #f87171;
        }

        .message {
          color: #a1a1aa;
        }

        .highlight {
          color: #e4e4e7;
          font-family: ui-monospace, 'SF Mono', monospace;
        }
      </style>

      <div class="toast">
        <span class="icon ${type}">${iconSvg}</span>
        <span class="message">${message}</span>
      </div>
    `;

    document.body.appendChild(host);
    currentToast = host;

    const toast = shadow.querySelector('.toast');

    // Show animation (next frame to trigger transition)
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        toast.classList.add('visible');
      });
    });

    // Hide after duration
    hideTimeout = setTimeout(() => {
      toast.classList.remove('visible');
      toast.classList.add('hiding');
      
      setTimeout(() => {
        if (host.parentNode) {
          host.remove();
        }
        if (currentToast === host) {
          currentToast = null;
        }
      }, 200);
    }, duration);
  }

  function success(message, duration = 2000) {
    show(message, { duration, type: 'success' });
  }

  function error(message, duration = 2500) {
    show(message, { duration, type: 'error' });
  }

  return {
    show,
    success,
    error
  };
})();

window.Toast = Toast;
