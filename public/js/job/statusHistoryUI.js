export function initStatusHistoryUI() {
  const wrapper = document.getElementById('statusHistoryWrapper');
  const historyList = document.getElementById('statusHistoryList');
  const addButton = document.getElementById('add-status-entry');
  const collapsedMsg = document.getElementById('collapsedMessage');

  if (!wrapper || !historyList || !addButton || !collapsedMsg) return;

  const updateUI = () => {
    const totalItems = historyList.children.length;
    if (wrapper.classList.contains('collapsed')) {
     if (totalItems > 0){
        collapsedMsg.textContent = `${totalItems} record${totalItems !== 1 ? 's' : ''} in the list, click to expand`;
        collapsedMsg.classList.add('visible');
        addButton.classList.add('hidden');
        historyList.classList.add('collapsed');
        }
    } else {
      collapsedMsg.textContent = '';
      collapsedMsg.classList.remove('visible');
      addButton.classList.remove('hidden');
      historyList.classList.remove('collapsed');
    }
  };

    if (historyList.children.length > 0) {
        wrapper.classList.add('collapsed');
        wrapper.classList.remove('expanded');
        updateUI();
    }
    
    wrapper.addEventListener('focus', () => {
        wrapper.classList.remove('collapsed');
        wrapper.classList.add('expanded');
        updateUI();
    });

    wrapper.addEventListener('click', () => {
        wrapper.classList.remove('collapsed');
        wrapper.classList.add('expanded');
        wrapper.focus();
        updateUI();
    });

    wrapper.addEventListener('blur', () => {
        setTimeout(() => {
        if (!wrapper.contains(document.activeElement)) {
            wrapper.classList.remove('expanded');
            wrapper.classList.add('collapsed');
            updateUI();
        }
        }, 100);
    });
    }