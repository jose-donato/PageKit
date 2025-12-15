// transcript.js - YouTube transcript extraction
const TranscriptExtractor = (function() {
  'use strict';

  let modalHost = null;

  function isYouTubePage() {
    return window.location.hostname.includes('youtube.com') &&
           window.location.pathname === '/watch';
  }

  function getVideoId() {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get('v');
  }

  function getVideoTitle() {
    const titleEl = document.querySelector('h1.ytd-video-primary-info-renderer yt-formatted-string, h1.ytd-watch-metadata yt-formatted-string');
    return titleEl?.textContent?.trim() || document.title.replace(' - YouTube', '').trim();
  }

  function parseYtInitialDataFromText(text) {
    const match = text.match(/ytInitialData\s*=\s*(\{)/);
    if (!match) return null;

    const startIndex = match.index + match[0].length - 1;
    let braceCount = 0;
    let endIndex = startIndex;

    for (let i = startIndex; i < text.length; i++) {
      if (text[i] === '{') braceCount++;
      else if (text[i] === '}') {
        braceCount--;
        if (braceCount === 0) {
          endIndex = i + 1;
          break;
        }
      }
    }

    try {
      return JSON.parse(text.substring(startIndex, endIndex));
    } catch (e) {
      return null;
    }
  }

  function extractYtInitialDataFromDOM() {
    const scripts = document.querySelectorAll('script');

    for (const script of scripts) {
      const text = script.textContent || '';
      if (text.includes('var ytInitialData =') || text.includes('ytInitialData =')) {
        const data = parseYtInitialDataFromText(text);
        if (data) return data;
      }
    }
    return null;
  }

  async function fetchFreshYtInitialData() {
    try {
      const url = new URL(window.location.href);
      url.searchParams.set('_cb', Date.now()); // Cache buster
      const response = await fetch(url.toString(), {
        credentials: 'include',
        cache: 'no-store',
        headers: { 'Cache-Control': 'no-cache' }
      });
      if (!response.ok) return null;
      const html = await response.text();
      return parseYtInitialDataFromText(html);
    } catch (e) {
      return null;
    }
  }

  function extractParamsFromYtInitialData(ytInitialData) {
    if (!ytInitialData) return null;

    const panels = ytInitialData.engagementPanels;
    if (!panels) return null;

    const transcriptPanel = panels.find(p =>
      p.engagementPanelSectionListRenderer?.panelIdentifier?.includes('transcript')
    );

    return transcriptPanel?.engagementPanelSectionListRenderer
      ?.content?.continuationItemRenderer?.continuationEndpoint
      ?.getTranscriptEndpoint?.params || null;
  }

  async function getTranscriptParams() {
    // Always fetch fresh data first (handles SPA navigation reliably)
    let ytInitialData = await fetchFreshYtInitialData();
    let params = extractParamsFromYtInitialData(ytInitialData);
    if (params) return params;

    // Fallback to DOM if fresh fetch failed
    ytInitialData = extractYtInitialDataFromDOM();
    return extractParamsFromYtInitialData(ytInitialData);
  }

  async function fetchTranscriptData() {
    const videoId = getVideoId();
    if (!videoId) {
      throw new Error('Could not find video ID');
    }

    const params = await getTranscriptParams();
    if (!params) {
      throw new Error('No transcript available for this video');
    }

    const response = await fetch('https://www.youtube.com/youtubei/v1/get_transcript?prettyPrint=false', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        context: {
          client: {
            clientName: 'WEB',
            clientVersion: '2.20251212.01.00'
          }
        },
        params: params
      })
    });

    if (!response.ok) {
      throw new Error('Failed to fetch transcript. Try refreshing the page.');
    }

    const data = await response.json();
    return parseTranscriptResponse(data);
  }

  function parseTranscriptResponse(data) {
    const segmentList = data?.actions?.[0]?.updateEngagementPanelAction
      ?.content?.transcriptRenderer?.content?.transcriptSearchPanelRenderer
      ?.body?.transcriptSegmentListRenderer?.initialSegments;

    if (!segmentList || segmentList.length === 0) {
      return [];
    }

    return segmentList
      .filter(seg => seg.transcriptSegmentRenderer)
      .map(seg => {
        const renderer = seg.transcriptSegmentRenderer;
        const text = renderer.snippet?.runs?.map(r => r.text).join('') || '';
        const startMs = parseInt(renderer.startMs, 10) || 0;
        return {
          start: startMs / 1000,
          text: text.trim()
        };
      });
  }

  function formatTimestamp(seconds) {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);

    if (hrs > 0) {
      return `[${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}]`;
    }
    return `[${mins}:${secs.toString().padStart(2, '0')}]`;
  }

  function formatTranscript(segments, includeTimestamps) {
    const title = getVideoTitle();
    const url = window.location.href;
    const date = new Date().toISOString().split('T')[0];

    let content = segments
      .map(seg => includeTimestamps ? `${formatTimestamp(seg.start)} ${seg.text}` : seg.text)
      .join('\n');

    return `# ${title}

> Source: ${url}
> Captured: ${date}

---

${content}
`;
  }

  async function copyToClipboard(text) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch (err) {
      const textarea = document.createElement('textarea');
      textarea.value = text;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      textarea.style.pointerEvents = 'none';
      document.body.appendChild(textarea);
      textarea.select();
      try {
        document.execCommand('copy');
        document.body.removeChild(textarea);
        return true;
      } catch (e) {
        document.body.removeChild(textarea);
        return false;
      }
    }
  }

  function downloadFile(content, filename) {
    const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  function showExportModal(segments) {
    closeModal();

    modalHost = document.createElement('div');
    modalHost.id = 'readtils-transcript-modal-host';
    const shadow = modalHost.attachShadow({ mode: 'closed' });

    shadow.innerHTML = `
      <style>
        :host {
          all: initial;
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          z-index: 2147483647;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
        }

        * {
          box-sizing: border-box;
        }

        .overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.6);
          backdrop-filter: blur(4px);
          -webkit-backdrop-filter: blur(4px);
          display: flex;
          align-items: center;
          justify-content: center;
          opacity: 0;
          transition: opacity 0.2s ease;
        }

        .overlay.visible {
          opacity: 1;
        }

        .modal {
          background: rgba(24, 24, 27, 0.98);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 12px;
          padding: 20px;
          min-width: 320px;
          max-width: 90vw;
          transform: scale(0.95) translateY(10px);
          transition: transform 0.2s cubic-bezier(0.16, 1, 0.3, 1);
        }

        .overlay.visible .modal {
          transform: scale(1) translateY(0);
        }

        .modal-title {
          color: #e4e4e7;
          font-size: 16px;
          font-weight: 600;
          margin: 0 0 16px 0;
        }

        .option-row {
          display: flex;
          align-items: center;
          gap: 10px;
          margin-bottom: 20px;
        }

        .checkbox-wrapper {
          display: flex;
          align-items: center;
          gap: 8px;
          cursor: pointer;
        }

        .checkbox-wrapper input[type="checkbox"] {
          width: 16px;
          height: 16px;
          accent-color: #6366f1;
          cursor: pointer;
        }

        .checkbox-label {
          color: #a1a1aa;
          font-size: 14px;
          user-select: none;
        }

        .buttons {
          display: flex;
          gap: 8px;
          justify-content: flex-end;
        }

        .btn {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 8px 14px;
          border: none;
          border-radius: 6px;
          font-size: 13px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.15s ease;
        }

        .btn svg {
          width: 14px;
          height: 14px;
        }

        .btn-secondary {
          background: rgba(255, 255, 255, 0.06);
          color: #a1a1aa;
        }

        .btn-secondary:hover {
          background: rgba(255, 255, 255, 0.1);
          color: #e4e4e7;
        }

        .btn-primary {
          background: #6366f1;
          color: #fff;
        }

        .btn-primary:hover {
          background: #4f46e5;
        }

        .btn-cancel {
          background: transparent;
          color: #71717a;
        }

        .btn-cancel:hover {
          color: #a1a1aa;
        }
      </style>

      <div class="overlay">
        <div class="modal">
          <h3 class="modal-title">Export Transcript</h3>
          <div class="option-row">
            <label class="checkbox-wrapper">
              <input type="checkbox" id="include-timestamps" checked>
              <span class="checkbox-label">Include timestamps</span>
            </label>
          </div>
          <div class="buttons">
            <button class="btn btn-cancel" id="cancel-btn">Cancel</button>
            <button class="btn btn-secondary" id="download-btn">
              <svg viewBox="0 0 24 24" fill="currentColor">
                <path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z"/>
              </svg>
              Download
            </button>
            <button class="btn btn-primary" id="copy-btn">
              <svg viewBox="0 0 24 24" fill="currentColor">
                <path d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z"/>
              </svg>
              Copy
            </button>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(modalHost);

    const overlay = shadow.querySelector('.overlay');
    const modal = shadow.querySelector('.modal');
    const timestampCheckbox = shadow.getElementById('include-timestamps');
    const cancelBtn = shadow.getElementById('cancel-btn');
    const downloadBtn = shadow.getElementById('download-btn');
    const copyBtn = shadow.getElementById('copy-btn');

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        overlay.classList.add('visible');
      });
    });

    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) {
        closeModal();
      }
    });

    cancelBtn.addEventListener('click', closeModal);

    copyBtn.addEventListener('click', async () => {
      const includeTimestamps = timestampCheckbox.checked;
      const content = formatTranscript(segments, includeTimestamps);
      const success = await copyToClipboard(content);
      closeModal();
      if (success) {
        Toast.success('Transcript copied to clipboard');
      } else {
        Toast.error('Failed to copy transcript');
      }
    });

    downloadBtn.addEventListener('click', () => {
      const includeTimestamps = timestampCheckbox.checked;
      const content = formatTranscript(segments, includeTimestamps);
      const title = getVideoTitle().replace(/[^a-z0-9]/gi, '_').substring(0, 50);
      const filename = `${title}_transcript.md`;
      downloadFile(content, filename);
      closeModal();
      Toast.success('Transcript downloaded');
    });

    document.addEventListener('keydown', handleEscKey);
  }

  function handleEscKey(e) {
    if (e.key === 'Escape') {
      closeModal();
    }
  }

  function closeModal() {
    document.removeEventListener('keydown', handleEscKey);
    if (modalHost) {
      const shadow = modalHost.shadowRoot;
      if (shadow) {
        const overlay = shadow.querySelector('.overlay');
        if (overlay) {
          overlay.classList.remove('visible');
          setTimeout(() => {
            if (modalHost && modalHost.parentNode) {
              modalHost.remove();
            }
            modalHost = null;
          }, 200);
          return;
        }
      }
      modalHost.remove();
      modalHost = null;
    }
  }

  async function extract() {
    if (!isYouTubePage()) {
      Toast.error('This feature only works on YouTube videos');
      return;
    }

    try {
      const segments = await fetchTranscriptData();
      if (segments.length === 0) {
        Toast.error('Transcript is empty');
        return;
      }
      showExportModal(segments);
    } catch (err) {
      Toast.error(err.message || 'Could not extract transcript');
    }
  }

  return {
    isYouTubePage,
    extract
  };
})();

window.TranscriptExtractor = TranscriptExtractor;
