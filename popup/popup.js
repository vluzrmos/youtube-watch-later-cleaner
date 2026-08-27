/**
 * YouTube Watch Later Cleaner - Popup Controller
 */

document.addEventListener('DOMContentLoaded', async () => {
  const statusBadge = document.getElementById('status-badge');
  const wrongPageCard = document.getElementById('wrong-page-card');
  const btnOpenWL = document.getElementById('btn-open-wl');
  const counterEl = document.getElementById('counter');
  const delayLabel = document.getElementById('delay-label');
  const delaySlider = document.getElementById('delay-slider');
  const presetBtns = document.querySelectorAll('.preset-btn');
  const btnStart = document.getElementById('btn-start');
  const btnStartText = document.getElementById('btn-start-text');
  const btnStop = document.getElementById('btn-stop');
  const statusMessage = document.getElementById('status-message');

  let currentTab = null;
  let isWatchLaterTab = false;
  let currentDelay = 1000;
  let isRunning = false;

  // 1. Get current active tab
  const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
  if (tabs && tabs[0]) {
    currentTab = tabs[0];
    const url = currentTab.url || '';
    isWatchLaterTab = url.includes('youtube.com/playlist') && url.includes('list=WL');
  }

  // Update UI for valid / invalid page
  function updatePageValidationUI() {
    if (isWatchLaterTab) {
      wrongPageCard.classList.add('hidden');
      btnStart.removeAttribute('disabled');
    } else {
      wrongPageCard.classList.remove('hidden');
      btnStart.setAttribute('disabled', 'true');
      statusMessage.textContent = 'Abra a lista Assistir mais tarde para começar.';
    }
  }

  updatePageValidationUI();

  // 2. Load stored preferences & state
  const stored = await chrome.storage.local.get(['delay', 'cleanerState']);
  if (stored.delay) {
    currentDelay = Number(stored.delay);
    delaySlider.value = currentDelay;
    updateDelayDisplay(currentDelay);
  }

  if (stored.cleanerState) {
    applyState(stored.cleanerState);
  }

  // Request fresh state from content script if on YouTube
  if (currentTab && isWatchLaterTab) {
    chrome.tabs.sendMessage(currentTab.id, { action: 'GET_STATUS' }, (res) => {
      if (chrome.runtime.lastError) {
        // Content script might not be injected yet
        return;
      }
      if (res) {
        applyState(res);
      }
    });
  }

  // 3. Delay & Preset Controls
  function updateDelayDisplay(val) {
    currentDelay = val;
    delayLabel.textContent = `${(val / 1000).toFixed(1)}s / vídeo`;
    chrome.storage.local.set({ delay: val });

    presetBtns.forEach(btn => {
      if (Number(btn.dataset.delay) === val) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });
  }

  delaySlider.addEventListener('input', (e) => {
    updateDelayDisplay(Number(e.target.value));
  });

  presetBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const val = Number(btn.dataset.delay);
      delaySlider.value = val;
      updateDelayDisplay(val);
    });
  });

  // 4. Action Handlers
  const githubLink = document.getElementById('github-link');
  if (githubLink) {
    githubLink.addEventListener('click', (e) => {
      e.preventDefault();
      chrome.tabs.create({ url: 'https://github.com/vluzrmos/youtube-watch-later-cleaner' });
    });
  }

  btnOpenWL.addEventListener('click', () => {
    chrome.tabs.create({ url: 'https://www.youtube.com/playlist?list=WL' });
    window.close();
  });

  btnStart.addEventListener('click', async () => {
    if (!isWatchLaterTab || !currentTab) return;

    btnStart.classList.add('hidden');
    btnStop.classList.remove('hidden');
    setRunningState(true);
    statusMessage.textContent = 'Iniciando limpeza da playlist...';

    chrome.tabs.sendMessage(currentTab.id, {
      action: 'START_CLEANING',
      delay: currentDelay
    }, (res) => {
      if (chrome.runtime.lastError) {
        statusMessage.textContent = 'Recarregue a página do YouTube e tente novamente.';
        setRunningState(false);
      }
    });
  });

  btnStop.addEventListener('click', () => {
    if (!currentTab) return;

    statusMessage.textContent = 'Interrompendo...';
    chrome.tabs.sendMessage(currentTab.id, { action: 'STOP_CLEANING' }, () => {
      setRunningState(false);
    });
  });

  // 5. State Management
  function setRunningState(running) {
    isRunning = running;
    if (running) {
      statusBadge.textContent = 'Limpando';
      statusBadge.className = 'badge badge-running';
      btnStart.classList.add('hidden');
      btnStop.classList.remove('hidden');
    } else {
      btnStart.classList.remove('hidden');
      btnStop.classList.add('hidden');
    }
  }

  function applyState(state) {
    if (!state) return;
    if (state.removedCount !== undefined) {
      counterEl.textContent = state.removedCount;
    }

    if (state.isRunning) {
      setRunningState(true);
      statusMessage.textContent = `Removendo vídeos (${state.removedCount || 0} até agora)...`;
    } else {
      setRunningState(false);
      if (state.status === 'completed') {
        statusBadge.textContent = 'Concluído';
        statusBadge.className = 'badge badge-completed';
        statusMessage.textContent = `Limpeza concluída! ${state.removedCount || 0} vídeos removidos.`;
      } else if (state.status === 'stopped') {
        statusBadge.textContent = 'Parado';
        statusBadge.className = 'badge badge-idle';
        statusMessage.textContent = `Limpeza pausada. ${state.removedCount || 0} vídeos removidos.`;
      } else {
        statusBadge.textContent = 'Pronto';
        statusBadge.className = 'badge badge-idle';
      }
    }
  }

  // 6. Listen for state updates from content script
  chrome.runtime.onMessage.addListener((message) => {
    if (message.action === 'STATE_UPDATED' && message.state) {
      applyState(message.state);
    }
  });
});
