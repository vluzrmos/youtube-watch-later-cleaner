/**
 * YouTube Watch Later Cleaner - Content Script
 * Automates the removal of videos from YouTube's Watch Later playlist
 */

(() => {
  let isRunning = false;
  let removedCount = 0;
  let delay = 1000;
  let stopRequested = false;

  const REMOVE_TERMS = [
    'remover de assistir mais tarde',
    'remover dos vídeos marcados como assistir mais tarde',
    'remove from watch later',
    'quitar de ver más tarde',
    'eliminar de ver más tarde',
    'supprimer de à regarder plus tard',
    'aus \'später ansehen\' entfernen',
    'rimuovi da guarda mais tardi',
    'remover de ver mais tarde',
    'usuń z do obejrzenia',
    'verwijderen uit later bekijken',
    'удалить из плейлиста «смотреть позже»',
    '后看',
    '後で見る'
  ];

  function isWatchLaterPage() {
    const url = window.location.href;
    return url.includes('youtube.com/playlist') && url.includes('list=WL');
  }

  function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /* --- In-Page Toast Notification & UI --- */

  function getOrCreateToast() {
    let toast = document.getElementById('yt-wl-cleaner-toast');
    if (!toast) {
      toast = document.createElement('div');
      toast.id = 'yt-wl-cleaner-toast';
      toast.innerHTML = `
        <div class="yt-wl-badge">
          <svg class="yt-wl-spinner" viewBox="0 0 24 24">
            <path d="M12 4V1L8 5l4 4V6c3.31 0 6 2.69 6 6 0 1.01-.25 1.97-.7 2.8l1.46 1.46A7.93 7.93 0 0020 12c0-4.42-3.58-8-8-8zm0 14c-3.31 0-6-2.69-6-6 0-1.01.25-1.97.7-2.8L5.24 7.74A7.93 7.93 0 004 12c0 4.42 3.58 8 8 8v3l4-4-4-4v3z"/>
          </svg>
        </div>
        <div class="yt-wl-content">
          <div class="yt-wl-title">Limpador Assistir Mais Tarde</div>
          <div class="yt-wl-desc" id="yt-wl-status-text">Iniciando...</div>
        </div>
        <button class="yt-wl-btn-stop" id="yt-wl-btn-stop-toast">Parar</button>
      `;
      document.body.appendChild(toast);

      const stopBtn = toast.querySelector('#yt-wl-btn-stop-toast');
      if (stopBtn) {
        stopBtn.addEventListener('click', () => {
          stopCleaning();
        });
      }
    }
    return toast;
  }

  function updateToast(message, isDone = false) {
    const toast = getOrCreateToast();
    const statusText = toast.querySelector('#yt-wl-status-text');
    const badge = toast.querySelector('.yt-wl-badge');
    const stopBtn = toast.querySelector('#yt-wl-btn-stop-toast');

    if (statusText) {
      statusText.innerHTML = message;
    }

    if (isDone) {
      if (stopBtn) stopBtn.style.display = 'none';
      if (badge) {
        badge.innerHTML = `
          <svg viewBox="0 0 24 24">
            <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
          </svg>
        `;
      }
      setTimeout(() => {
        toast.classList.remove('yt-wl-visible');
      }, 5000);
    } else {
      if (stopBtn) stopBtn.style.display = 'block';
      if (badge) {
        badge.innerHTML = `
          <svg class="yt-wl-spinner" viewBox="0 0 24 24">
            <path d="M12 4V1L8 5l4 4V6c3.31 0 6 2.69 6 6 0 1.01-.25 1.97-.7 2.8l1.46 1.46A7.93 7.93 0 0020 12c0-4.42-3.58-8-8-8zm0 14c-3.31 0-6-2.69-6-6 0-1.01.25-1.97.7-2.8L5.24 7.74A7.93 7.93 0 004 12c0 4.42 3.58 8 8 8v3l4-4-4-4v3z"/>
          </svg>
        `;
      }
      toast.classList.add('yt-wl-visible');
    }
  }

  function hideToast() {
    const toast = document.getElementById('yt-wl-cleaner-toast');
    if (toast) {
      toast.classList.remove('yt-wl-visible');
    }
  }

  /* --- Injected Button in YouTube Playlist Page --- */

  function injectHeaderButton() {
    if (!isWatchLaterPage()) return;
    if (document.getElementById('yt-wl-injected-header-btn')) return;

    // Look for playlist action buttons containers
    const targetContainers = [
      'ytd-playlist-header-renderer #actions',
      'ytd-playlist-header-renderer .metadata-actions-wrapper',
      'ytd-playlist-header-renderer #top-level-buttons-computed',
      'ytd-playlist-header-renderer',
      '#page-header'
    ];

    let targetEl = null;
    for (const sel of targetContainers) {
      const el = document.querySelector(sel);
      if (el) {
        targetEl = el;
        break;
      }
    }

    if (!targetEl) return;

    const btn = document.createElement('button');
    btn.id = 'yt-wl-injected-header-btn';
    btn.className = 'yt-wl-injected-btn';
    btn.innerHTML = `
      <svg viewBox="0 0 24 24">
        <path d="M15 4V3H9v1H4v2h1v13c0 1.1.9 2 2 2h10c1.1 0 2-.9 2-2V6h1V4h-5zm2 15H7V6h10v13zM9 8h2v9H9zm4 0h2v9h-2z"/>
      </svg>
      <span>Limpar Assistir Mais Tarde</span>
    `;

    btn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (isRunning) {
        stopCleaning();
      } else {
        startCleaning();
      }
    });

    targetEl.appendChild(btn);
  }

  /* --- Core Cleaner Logic --- */

  function syncState(extra = {}) {
    const state = {
      isRunning,
      removedCount,
      delay,
      isWatchLater: isWatchLaterPage(),
      ...extra
    };
    try {
      chrome.storage.local.set({ cleanerState: state });
      chrome.runtime.sendMessage({ action: 'STATE_UPDATED', state }).catch(() => {});
    } catch (e) {
      // Chrome runtime might be unavailable during quick refreshes
    }
  }

  function getWatchLaterVideos() {
    // Check multiple playlist video item selectors in YouTube
    const selectors = [
      'ytd-playlist-video-renderer',
      'ytd-playlist-video-list-renderer ytd-playlist-video-renderer',
      'ytd-rich-item-renderer:has(ytd-playlist-video-renderer)',
      'ytd-playlist-video-list-renderer yt-lockup-view-model'
    ];

    for (const sel of selectors) {
      const items = Array.from(document.querySelectorAll(sel));
      if (items.length > 0) {
        return items;
      }
    }
    return [];
  }

  function findActionMenuButton(videoElement) {
    // Look for the 3-dots button inside the video row
    const selectors = [
      'button[aria-label="Action menu"]',
      'button[aria-label*="Action"]',
      'button[aria-label*="Mais ações"]',
      'button[aria-label*="More actions"]',
      'button[aria-label*="Opções"]',
      'button[aria-label*="Menu"]',
      'ytd-menu-renderer yt-icon-button#button',
      'ytd-menu-renderer button',
      '#menu yt-icon-button#button',
      '#menu button',
      'yt-icon-button[aria-label]'
    ];

    for (const sel of selectors) {
      const btn = videoElement.querySelector(sel);
      if (btn && btn.offsetParent !== null) { // is visible
        return btn;
      }
    }

    // Fallback: search any button inside ytd-menu-renderer
    const menuRenderer = videoElement.querySelector('ytd-menu-renderer');
    if (menuRenderer) {
      const btn = menuRenderer.querySelector('button') || menuRenderer.querySelector('yt-icon-button');
      if (btn) return btn;
    }

    return null;
  }

  async function findAndClickRemoveOption() {
    // Wait for the popup menu to be rendered into the DOM
    const maxRetries = 15;
    for (let i = 0; i < maxRetries; i++) {
      await sleep(100);

      // Look in popup containers
      const popupContainers = [
        'ytd-popup-container ytd-menu-service-item-renderer',
        'ytd-popup-container tp-yt-paper-item',
        'ytd-popup-container ytd-menu-popup-renderer tp-yt-paper-item',
        'tp-yt-paper-dialog ytd-menu-service-item-renderer',
        'ytd-menu-popup-renderer ytd-menu-service-item-renderer',
        'ytd-popup-container yt-list-item-view-model',
        'tp-yt-paper-listbox ytd-menu-service-item-renderer',
        'tp-yt-paper-listbox tp-yt-paper-item'
      ];

      for (const sel of popupContainers) {
        const menuItems = Array.from(document.querySelectorAll(sel));
        for (const item of menuItems) {
          const text = (item.textContent || '').trim().toLowerCase();
          
          // Check by text match
          const matchesText = REMOVE_TERMS.some(term => text.includes(term));
          
          // Check by SVG trash / delete icon
          const hasTrashIcon = !!item.querySelector('yt-icon[icon="delete"], yt-icon[icon="trash"], svg path[d*="15 4V3"], svg path[d*="M11 17"], svg path[d*="M6 19"]');

          if (matchesText || hasTrashIcon) {
            item.click();
            return true;
          }
        }
      }
    }

    return false;
  }

  async function startCleaning(customDelay = null) {
    if (isRunning) return;
    if (!isWatchLaterPage()) {
      alert('Por favor, abra a playlist "Assistir mais tarde" do YouTube (https://www.youtube.com/playlist?list=WL)');
      return;
    }

    if (customDelay) {
      delay = customDelay;
    } else {
      const stored = await chrome.storage.local.get(['delay']);
      if (stored.delay) delay = Number(stored.delay);
    }

    isRunning = true;
    stopRequested = false;
    removedCount = 0;
    syncState({ status: 'running' });

    updateToast(`Iniciando limpeza... <br>Removidos: <span class="yt-wl-counter">0</span>`);

    let emptyRetries = 0;
    const maxEmptyRetries = 3;

    try {
      while (isRunning && !stopRequested) {
        const videos = getWatchLaterVideos();

        if (videos.length === 0) {
          emptyRetries++;
          updateToast(`Carregando mais vídeos (tentativa ${emptyRetries}/${maxEmptyRetries})... <br>Removidos: <span class="yt-wl-counter">${removedCount}</span>`);
          window.scrollTo(0, document.documentElement.scrollHeight);
          await sleep(1500);

          if (emptyRetries >= maxEmptyRetries) {
            // No more videos found
            break;
          }
          continue;
        }

        emptyRetries = 0;
        const currentVideo = videos[0];

        // Bring video into view
        currentVideo.scrollIntoView({ behavior: 'smooth', block: 'center' });
        await sleep(300);

        if (stopRequested) break;

        const actionBtn = findActionMenuButton(currentVideo);
        if (!actionBtn) {
          // If action button is not found, try hovering the video or scroll
          currentVideo.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }));
          await sleep(200);
        }

        const retryActionBtn = findActionMenuButton(currentVideo);
        if (retryActionBtn) {
          retryActionBtn.click();
          await sleep(250);

          const clicked = await findAndClickRemoveOption();
          if (clicked) {
            removedCount++;
            updateToast(`Removendo vídeos... <br>Removidos: <span class="yt-wl-counter">${removedCount}</span>`);
            syncState({ status: 'running' });
          } else {
            // Close popup by clicking outside
            document.body.click();
          }
        } else {
          // Could not find button for this item, wait and scroll
          window.scrollBy(0, 100);
        }

        // Wait configured delay between items
        await sleep(delay);
      }
    } catch (err) {
      console.error('[YT Watch Later Cleaner] Erro durante a execução:', err);
      updateToast(`Erro: ${err.message || 'Falha na execução'}`, true);
    } finally {
      const finalCount = removedCount;
      isRunning = false;
      const finalStatus = stopRequested ? 'stopped' : 'completed';
      syncState({ status: finalStatus, isRunning: false });

      if (stopRequested) {
        updateToast(`Limpeza interrompida.<br>Total removido: <span class="yt-wl-counter">${finalCount}</span> vídeos.`, true);
      } else {
        updateToast(`Concluído com sucesso! 🎉<br>Total de <span class="yt-wl-counter">${finalCount}</span> vídeos removidos.`, true);
      }
    }
  }

  function stopCleaning() {
    stopRequested = true;
    isRunning = false;
    syncState({ status: 'stopped', isRunning: false });
    updateToast(`Parando limpeza... Aguarde.`);
  }

  /* --- Message Listener from Popup --- */

  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === 'GET_STATUS') {
      sendResponse({
        isRunning,
        removedCount,
        delay,
        isWatchLater: isWatchLaterPage()
      });
      return true;
    }

    if (message.action === 'START_CLEANING') {
      if (!isRunning) {
        startCleaning(message.delay);
        sendResponse({ success: true, isRunning: true });
      } else {
        sendResponse({ success: false, message: 'Já está em execução' });
      }
      return true;
    }

    if (message.action === 'STOP_CLEANING') {
      stopCleaning();
      sendResponse({ success: true, isRunning: false });
      return true;
    }
  });

  /* --- Page Observer & Navigation Handling --- */

  // YouTube is a Single Page Application (SPA), listen to navigation events
  window.addEventListener('yt-navigate-finish', () => {
    syncState();
    setTimeout(injectHeaderButton, 1000);
  });

  // Periodic check for button injection
  setInterval(() => {
    if (isWatchLaterPage() && !document.getElementById('yt-wl-injected-header-btn')) {
      injectHeaderButton();
    }
  }, 2000);

  // Initial setup
  if (isWatchLaterPage()) {
    setTimeout(injectHeaderButton, 1500);
  }
})();
