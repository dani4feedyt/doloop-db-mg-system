export async function refreshStatusHistory(userId) {
  try {
    const res = await fetch(`/job/${userId}/status-history-json`);
    if (!res.ok) throw new Error('Failed to load updated status history');
    const history = await res.json();

    history.sort((a, b) => new Date(a.changed_at) - new Date(b.changed_at));

    const historyList = document.getElementById('statusHistoryList');
    if (!historyList) return;

    historyList.innerHTML = '';
    history.forEach(entry => {
      const li = document.createElement('li');
      li.className = 'status-history-item';
      li.dataset.status = entry.status;
      li.dataset.date = entry.changed_at.split('T')[0];
      li.innerHTML = `<span>${entry.status} → ${li.dataset.date}</span>`;
      historyList.appendChild(li);
    });
  } catch (err) {
    console.error(err);
  }
}