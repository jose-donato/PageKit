// colorpicker.js - Color picker with EyeDropper API + canvas fallback
const ColorPicker = (function() {
  'use strict';

  const api = typeof browser !== 'undefined' ? browser : chrome;

  function hasEyeDropper() {
    return 'EyeDropper' in window;
  }

  async function pickWithEyeDropper() {
    const eyeDropper = new EyeDropper();
    const result = await eyeDropper.open();
    return result.sRGBHex.toUpperCase();
  }

  async function pickWithCanvas() {
    // Request screenshot from background script
    const response = await api.runtime.sendMessage({ action: 'captureTab' });
    
    if (!response.success) {
      throw new Error(response.error || 'Failed to capture tab');
    }

    return new Promise((resolve, reject) => {
      // Load the screenshot into an image
      const img = new Image();
      img.onload = () => {
        // Create overlay for picking
        const overlay = createPickerOverlay(img, (color) => {
          resolve(color);
        }, () => {
          reject(new Error('Cancelled'));
        });
        
        document.body.appendChild(overlay);
      };
      img.onerror = () => reject(new Error('Failed to load screenshot'));
      img.src = response.dataUrl;
    });
  }

  function createPickerOverlay(img, onPick, onCancel) {
    const host = document.createElement('div');
    host.id = 'readtils-colorpicker-host';
    const shadow = host.attachShadow({ mode: 'closed' });

    // Create canvas from screenshot
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    canvas.width = img.width;
    canvas.height = img.height;
    ctx.drawImage(img, 0, 0);

    // Device pixel ratio for accurate picking
    const dpr = window.devicePixelRatio || 1;

    shadow.innerHTML = `
      <style>
        :host {
          all: initial;
          position: fixed;
          top: 0;
          left: 0;
          width: 100vw;
          height: 100vh;
          z-index: 2147483647;
          cursor: crosshair;
        }

        .overlay {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
        }

        .magnifier {
          position: fixed;
          width: 100px;
          height: 100px;
          border-radius: 50%;
          border: 2px solid rgba(255, 255, 255, 0.9);
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.4), inset 0 0 0 1px rgba(0, 0, 0, 0.2);
          pointer-events: none;
          overflow: hidden;
          opacity: 0;
          transform: scale(0.8);
          transition: opacity 0.15s ease, transform 0.15s ease;
        }

        .magnifier.visible {
          opacity: 1;
          transform: scale(1);
        }

        .magnifier-canvas {
          width: 100%;
          height: 100%;
          image-rendering: pixelated;
        }

        .crosshair {
          position: absolute;
          top: 50%;
          left: 50%;
          width: 12px;
          height: 12px;
          margin: -6px 0 0 -6px;
          border: 2px solid rgba(255, 255, 255, 0.9);
          border-radius: 2px;
          box-shadow: 0 0 0 1px rgba(0, 0, 0, 0.3);
        }

        .color-preview {
          position: absolute;
          bottom: -28px;
          left: 50%;
          transform: translateX(-50%);
          padding: 4px 8px;
          background: rgba(24, 24, 27, 0.95);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 4px;
          font-family: ui-monospace, 'SF Mono', monospace;
          font-size: 11px;
          color: #e4e4e7;
          white-space: nowrap;
        }

        .hint {
          position: fixed;
          bottom: 20px;
          left: 50%;
          transform: translateX(-50%);
          padding: 8px 16px;
          background: rgba(24, 24, 27, 0.95);
          backdrop-filter: blur(8px);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 8px;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
          font-size: 13px;
          color: #a1a1aa;
        }

        .hint kbd {
          display: inline-block;
          padding: 2px 6px;
          margin: 0 2px;
          background: rgba(255, 255, 255, 0.1);
          border-radius: 4px;
          font-family: inherit;
          font-size: 12px;
          color: #e4e4e7;
        }
      </style>

      <div class="overlay"></div>
      <div class="magnifier">
        <canvas class="magnifier-canvas" width="100" height="100"></canvas>
        <div class="crosshair"></div>
        <div class="color-preview">#000000</div>
      </div>
      <div class="hint">Click to pick color · Press <kbd>Esc</kbd> to cancel</div>
    `;

    const overlay = shadow.querySelector('.overlay');
    const magnifier = shadow.querySelector('.magnifier');
    const magnifierCanvas = shadow.querySelector('.magnifier-canvas');
    const magnifierCtx = magnifierCanvas.getContext('2d');
    const colorPreview = shadow.querySelector('.color-preview');

    let currentColor = '#000000';

    function getColorAtPoint(x, y) {
      // Account for scroll position and device pixel ratio
      const canvasX = Math.floor(x * dpr);
      const canvasY = Math.floor(y * dpr);
      
      if (canvasX < 0 || canvasY < 0 || canvasX >= canvas.width || canvasY >= canvas.height) {
        return '#000000';
      }

      const pixel = ctx.getImageData(canvasX, canvasY, 1, 1).data;
      return '#' + [pixel[0], pixel[1], pixel[2]]
        .map(c => c.toString(16).padStart(2, '0'))
        .join('')
        .toUpperCase();
    }

    function updateMagnifier(e) {
      const x = e.clientX;
      const y = e.clientY;

      // Position magnifier
      const offsetX = x + 120 > window.innerWidth ? -120 : 20;
      const offsetY = y + 140 > window.innerHeight ? -140 : 20;
      magnifier.style.left = `${x + offsetX}px`;
      magnifier.style.top = `${y + offsetY}px`;

      // Draw zoomed area (5x zoom)
      const zoom = 5;
      const srcX = Math.floor(x * dpr) - 10;
      const srcY = Math.floor(y * dpr) - 10;
      
      magnifierCtx.clearRect(0, 0, 100, 100);
      magnifierCtx.drawImage(
        canvas,
        srcX, srcY, 20, 20,
        0, 0, 100, 100
      );

      // Get color at center
      currentColor = getColorAtPoint(x, y);
      colorPreview.textContent = currentColor;
      colorPreview.style.borderTopColor = currentColor;
    }

    function handleMouseMove(e) {
      magnifier.classList.add('visible');
      updateMagnifier(e);
    }

    function handleClick(e) {
      e.preventDefault();
      e.stopPropagation();
      cleanup();
      onPick(currentColor);
    }

    function handleKeyDown(e) {
      if (e.key === 'Escape') {
        e.preventDefault();
        cleanup();
        onCancel();
      }
    }

    function cleanup() {
      overlay.removeEventListener('mousemove', handleMouseMove);
      overlay.removeEventListener('click', handleClick);
      document.removeEventListener('keydown', handleKeyDown);
      host.remove();
    }

    overlay.addEventListener('mousemove', handleMouseMove);
    overlay.addEventListener('click', handleClick);
    document.addEventListener('keydown', handleKeyDown);

    return host;
  }

  async function pick() {
    try {
      let hex;
      
      if (hasEyeDropper()) {
        hex = await pickWithEyeDropper();
      } else {
        hex = await pickWithCanvas();
      }
      
      // Copy to clipboard
      await navigator.clipboard.writeText(hex);
      Toast.success(`Copied <span class="highlight">${hex}</span>`);
      
      return { success: true, color: hex };
    } catch (e) {
      if (e.name === 'AbortError' || e.message === 'Cancelled') {
        return { success: false, cancelled: true };
      }
      Toast.error('Failed to pick color');
      return { success: false, error: e.message };
    }
  }

  return {
    pick,
    hasEyeDropper
  };
})();

window.ColorPicker = ColorPicker;
