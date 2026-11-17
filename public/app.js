(() => {
  const STORE_KEY = 'daybook-v1';
  const LABEL_COLORS = { Ideas: '#6B33F7', Personal: '#066DE8', Work: '#EC6809', Journal: '#C933F7' };
  const defaultLabels = ['Personal', 'Work', 'Ideas'];
  let data = loadData();
  let currentView = 'notes';
  let selectedLabel = 'all';
  let selectedTaskFilter = 'all';
  let layout = 'grid';
  let sortOrder = 'recent';
  let activeNoteId = null;
  let saveTimer = null;
  let toastTimer = null;

  const $ = (id) => document.getElementById(id);
  const notesGrid = $('notesGrid');
  const noteModal = $('noteModal');
  const editorTitle = $('editorTitle');
  const editorBody = $('editorBody');

  function loadData() {
    try {
      const parsed = JSON.parse(localStorage.getItem(STORE_KEY) || '{}');
      return {
        notes: Array.isArray(parsed.notes) ? parsed.notes : [],
        tasks: Array.isArray(parsed.tasks) ? parsed.tasks : [],
        labels: Array.isArray(parsed.labels) && parsed.labels.length ? parsed.labels : [...defaultLabels],
        dark: Boolean(parsed.dark),
      };
    } catch { return { notes: [], tasks: [], labels: [...defaultLabels], dark: false }; }
  }

  function persist() {
    try { localStorage.setItem(STORE_KEY, JSON.stringify(data)); }
    catch { showToast('Could not save. Your browser storage may be full.'); }
  }

  function uid() { return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`; }
  function safe(text) { return String(text).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }
  function relativeDate(value) {
    const date = new Date(value); const now = new Date();
    if (Number.isNaN(date.getTime())) return 'Just now';
    const day = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
    const days = Math.round((day(now) - day(date)) / 86400000);
    if (days === 0) return `Today, ${date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}`;
    if (days === 1) return 'Yesterday';
    if (days > 1 && days < 7) return date.toLocaleDateString([], { weekday: 'long' });
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  }
  function showToast(message) {
    const toast = $('toast'); toast.textContent = message; toast.classList.add('show');
    clearTimeout(toastTimer); toastTimer = setTimeout(() => toast.classList.remove('show'), 2100);
  }
  function setToday() { $('todayDate').textContent = new Date().toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' }); }
  function labelColor(label) { return LABEL_COLORS[label] || '#c99670'; }

  function renderLabels() {
    $('labelList').innerHTML = data.labels.map((label) => `<button class="label-item ${selectedLabel === label ? 'selected' : ''}" data-label="${safe(label)}"><span class="label-color" style="background:${labelColor(label)}"></span>${safe(label)}</button>`).join('');
    $('labelList').querySelectorAll('.label-item').forEach((button) => button.addEventListener('click', () => {
      selectedLabel = selectedLabel === button.dataset.label ? 'all' : button.dataset.label;
      currentView = 'notes'; updateView(); renderNotes(); renderLabels();
    }));
    $('notesCount').textContent = data.notes.length;
    $('tasksCount').textContent = data.tasks.filter((task) => !task.done).length;
    $('filterLabel').textContent = selectedLabel === 'all' ? 'All labels' : selectedLabel;
  }

  function noteMatches(note, query) {
    const text = `${note.title || ''} ${note.body || ''} ${note.label || ''}`.toLowerCase();
    return (!query || text.includes(query.toLowerCase())) && (selectedLabel === 'all' || note.label === selectedLabel) && (currentView !== 'pinned' || note.pinned);
  }

  function renderNotes() {
    const query = $('searchInput').value.trim();
    const filtered = data.notes.filter((note) => noteMatches(note, query)).sort((a, b) => Number(b.pinned) - Number(a.pinned) || (sortOrder === 'recent' ? new Date(b.updatedAt) - new Date(a.updatedAt) : new Date(a.updatedAt) - new Date(b.updatedAt)));
    $('shownCount').textContent = filtered.length ? `(${filtered.length})` : '';
    $('notesSectionTitle').textContent = currentView === 'pinned' ? 'PINNED NOTES' : selectedLabel !== 'all' ? `${selectedLabel.toUpperCase()} NOTES` : 'RECENT NOTES';
    notesGrid.classList.toggle('list-layout', layout === 'list');
    notesGrid.innerHTML = filtered.map((note) => {
      const title = note.title.trim() || 'Untitled note';
      const preview = (note.body || '').trim() || 'A little space for a thought...';
      const label = note.label ? `<span class="note-label" data-label="${safe(note.label)}" style="--note-color:${labelColor(note.label)}"><span class="label-dot" style="background:${labelColor(note.label)}"></span>${safe(note.label)}</span>` : '';
      return `<article class="note-card" data-id="${safe(note.id)}" tabindex="0" aria-label="Open ${safe(title)}"><div class="note-card-top">${label}<span class="pin-indicator">${note.pinned ? '⌁' : ''}</span></div><h3>${safe(title)}</h3><p class="note-preview">${safe(preview)}</p><div class="note-card-bottom"><span class="note-date">${relativeDate(note.updatedAt)}</span><button class="note-dots" data-menu-id="${safe(note.id)}" aria-label="Note options">···</button></div></article>`;
    }).join('');
    notesGrid.querySelectorAll('.note-card').forEach((card) => {
      card.addEventListener('click', (event) => { if (!event.target.closest('.note-dots')) openNote(card.dataset.id); });
      card.addEventListener('keydown', (event) => { if ((event.key === 'Enter' || event.key === ' ') && !event.target.closest('.note-dots')) { event.preventDefault(); openNote(card.dataset.id); } });
    });
    notesGrid.querySelectorAll('.note-dots').forEach((button) => button.addEventListener('click', (event) => { event.stopPropagation(); showNoteMenu(button, button.dataset.menuId); }));
    const empty = filtered.length === 0;
    $('notesEmpty').hidden = !empty;
    if (empty) {
      const searching = Boolean(query || selectedLabel !== 'all' || currentView === 'pinned');
      $('emptyTitle').textContent = searching ? 'Nothing here just yet.' : 'A fresh page, just for you.';
      $('emptyText').textContent = searching ? 'Try another search or create a new note.' : 'Start with a thought, an idea, or anything you’d like to remember.';
      $('emptyCreateBtn').textContent = searching ? '＋ Create a note' : '＋ Create your first note';
    }
  }

  function showNoteMenu(anchor, noteId) {
    closePopover();
    const note = data.notes.find((item) => item.id === noteId); if (!note) return;
    const menu = document.createElement('div'); menu.className = 'note-popover';
    menu.innerHTML = `<button data-action="pin">${note.pinned ? 'Unpin note' : 'Pin note'}</button><button data-action="edit">Edit note</button><button data-action="delete" class="danger">Delete note</button>`;
    document.body.append(menu); positionPopover(menu, anchor);
    menu.addEventListener('click', (event) => {
      const action = event.target.closest('button')?.dataset.action; if (!action) return;
      if (action === 'pin') { note.pinned = !note.pinned; note.updatedAt = new Date().toISOString(); persist(); renderNotes(); showToast(note.pinned ? 'Note pinned' : 'Note unpinned'); }
      if (action === 'edit') openNote(noteId);
      if (action === 'delete') deleteNote(noteId);
      closePopover();
    });
    window.setTimeout(() => document.addEventListener('click', outsidePopover, { once: true }), 0);
  }
  function positionPopover(menu, anchor) {
    const rect = anchor.getBoundingClientRect(); menu.style.position = 'fixed'; menu.style.zIndex = '25'; menu.style.top = `${Math.min(rect.bottom + 5, innerHeight - 120)}px`; menu.style.left = `${Math.min(rect.right - 145, innerWidth - 155)}px`;
  }
  function closePopover() { document.querySelector('.note-popover')?.remove(); document.querySelector('.label-popover')?.remove(); }
  function outsidePopover(event) { if (!event.target.closest('.note-popover,.label-popover')) closePopover(); }

  function createNote() {
    const now = new Date().toISOString();
    const note = { id: uid(), title: '', body: '', label: '', pinned: false, createdAt: now, updatedAt: now };
    data.notes.unshift(note); persist(); renderLabels(); renderNotes(); openNote(note.id);
  }
  function openNote(id) {
    const note = data.notes.find((item) => item.id === id); if (!note) return;
    activeNoteId = id; editorTitle.value = note.title; editorBody.value = note.body;
    $('editorDate').textContent = `Edited ${relativeDate(note.updatedAt)}`;
    $('saveStatus').textContent = 'Saved'; $('pinNoteBtn').classList.toggle('pinned', note.pinned);
    $('editorLabelText').textContent = note.label || 'Add label';
    $('editorLabelBtn').querySelector('.label-dot').style.background = note.label ? labelColor(note.label) : '#c1c8bf';
    updateWordCount(); noteModal.hidden = false; document.body.style.overflow = 'hidden';
    window.setTimeout(() => editorTitle.focus(), 30);
  }
  function saveEditor() {
    const note = data.notes.find((item) => item.id === activeNoteId); if (!note) return;
    note.title = editorTitle.value; note.body = editorBody.value; note.updatedAt = new Date().toISOString();
    $('saveStatus').textContent = 'Saving…'; persist();
    clearTimeout(saveTimer); saveTimer = setTimeout(() => { $('saveStatus').textContent = 'Saved'; $('editorDate').textContent = `Edited ${relativeDate(note.updatedAt)}`; renderNotes(); renderLabels(); }, 320);
  }
  function closeEditor() {
    if (!activeNoteId) { noteModal.hidden = true; document.body.style.overflow = ''; return; }
    const note = data.notes.find((item) => item.id === activeNoteId);
    if (note && !note.title.trim() && !note.body.trim()) data.notes = data.notes.filter((item) => item.id !== note.id);
    activeNoteId = null; noteModal.hidden = true; document.body.style.overflow = ''; persist(); renderNotes(); renderLabels();
  }
  function deleteNote(id) {
    const note = data.notes.find((item) => item.id === id); if (!note) return;
    if (!window.confirm(`Delete “${note.title.trim() || 'Untitled note'}”? This cannot be undone.`)) return;
    data.notes = data.notes.filter((item) => item.id !== id); if (activeNoteId === id) closeEditor();
    persist(); renderNotes(); renderLabels(); showToast('Note deleted');
  }
  function updateWordCount() {
    const count = editorBody.value.trim() ? editorBody.value.trim().split(/\s+/).length : 0;
    $('wordCount').textContent = `${count} ${count === 1 ? 'word' : 'words'}`;
  }
  function togglePin() {
    const note = data.notes.find((item) => item.id === activeNoteId); if (!note) return;
    note.pinned = !note.pinned; $('pinNoteBtn').classList.toggle('pinned', note.pinned); persist(); renderNotes();
    showToast(note.pinned ? 'Note pinned' : 'Note unpinned');
  }
  function showLabelMenu(anchor, editor = false) {
    closePopover(); const menu = document.createElement('div'); menu.className = 'label-popover';
    menu.innerHTML = `<button data-label="">No label</button>${data.labels.map((label) => `<button data-label="${safe(label)}"><span class="label-color" style="background:${labelColor(label)}"></span>${safe(label)}</button>`).join('')}<button data-label="__new" class="add-label-option">＋ New label</button>`;
    document.body.append(menu); positionPopover(menu, anchor);
    menu.addEventListener('click', (event) => {
      const button = event.target.closest('button'); if (!button) return;
      let label = button.dataset.label;
      if (label === '__new') { label = prompt('Name your label'); if (!label || !label.trim()) { closePopover(); return; } label = label.trim(); if (!data.labels.includes(label)) data.labels.push(label); }
      if (editor) {
        const note = data.notes.find((item) => item.id === activeNoteId); if (note) { note.label = label; note.updatedAt = new Date().toISOString(); persist(); $('editorLabelText').textContent = label || 'Add label'; $('editorLabelBtn').querySelector('.label-dot').style.background = label ? labelColor(label) : '#c1c8bf'; renderNotes(); renderLabels(); }
      } else { selectedLabel = label || 'all'; $('filterLabel').textContent = selectedLabel === 'all' ? 'All labels' : selectedLabel; renderLabels(); renderNotes(); }
      closePopover();
    });
    window.setTimeout(() => document.addEventListener('click', outsidePopover, { once: true }), 0);
  }

  function updateView() {
    const isTasks = currentView === 'tasks';
    $('notesView').hidden = isTasks; $('tasksView').hidden = !isTasks; $('notesToolbar').hidden = isTasks;
    const titles = { notes: ['Your notes', 'Thoughts, plans, and everything in between.', 'All notes'], pinned: ['Your pinned notes', 'The things you want to keep close.', 'Pinned'], tasks: ['Your to-do list', 'One thing at a time. You’ve got this.', 'To-do list'] };
    $('pageTitle').innerHTML = `${titles[currentView][0]}<span class="heading-period">.</span>`;
    $('pageSubtitle').textContent = titles[currentView][1]; $('breadcrumbTitle').textContent = titles[currentView][2];
    $('pageEyebrow').textContent = currentView === 'tasks' ? 'A GENTLER WAY TO GET THINGS DONE' : 'A LITTLE SPACE FOR YOURSELF';
    document.querySelectorAll('.nav-item').forEach((item) => item.classList.toggle('active', item.dataset.view === currentView));
    $('newNoteBtnTop').hidden = isTasks;
    if (isTasks) renderTasks(); else renderNotes();
  }

  function addTask(event) {
    event.preventDefault(); const input = $('taskInput'); const title = input.value.trim(); if (!title) return;
    data.tasks.unshift({ id: uid(), title, priority: $('taskPriority').value, done: false, createdAt: new Date().toISOString() });
    input.value = ''; $('taskPriority').value = 'normal'; persist(); renderTasks(); renderLabels(); input.focus();
  }
  function renderTasks() {
    const total = data.tasks.length, done = data.tasks.filter((task) => task.done).length, active = total - done;
    $('taskProgress').textContent = `${done} of ${total} done`; $('progressPercent').textContent = `${total ? Math.round(done / total * 100) : 0}%`;
    $('progressBar').style.width = `${total ? done / total * 100 : 0}%`;
    $('allTaskCount').textContent = total; $('activeTaskCount').textContent = active;
    document.querySelectorAll('.task-filter').forEach((button) => button.classList.toggle('active', button.dataset.taskFilter === selectedTaskFilter));
    $('clearCompleted').hidden = done === 0;
    const tasks = data.tasks.filter((task) => selectedTaskFilter === 'all' || (selectedTaskFilter === 'active' && !task.done) || (selectedTaskFilter === 'completed' && task.done));
    $('taskList').innerHTML = tasks.map((task) => `<div class="task-row ${task.done ? 'done' : ''}" data-id="${safe(task.id)}"><button class="task-check" aria-label="${task.done ? 'Mark as to do' : 'Mark complete'}">${task.done ? '<svg viewBox="0 0 12 12"><path d="m2 6 2.5 2.5L10 3"/></svg>' : ''}</button><span class="task-title">${safe(task.title)}</span><span class="priority-pill ${task.priority}">${task.priority === 'high' ? 'High priority' : task.priority === 'low' ? 'Low' : 'Normal'}</span><span class="task-date">${relativeDate(task.createdAt)}</span><button class="task-delete" aria-label="Delete task">×</button></div>`).join('');
    $('tasksEmpty').hidden = tasks.length > 0;
    $('taskList').querySelectorAll('.task-row').forEach((row) => {
      const task = data.tasks.find((item) => item.id === row.dataset.id);
      row.querySelector('.task-check').addEventListener('click', () => { task.done = !task.done; persist(); renderTasks(); renderLabels(); });
      row.querySelector('.task-delete').addEventListener('click', () => { data.tasks = data.tasks.filter((item) => item.id !== task.id); persist(); renderTasks(); renderLabels(); showToast('Task deleted'); });
    });
  }

  function addLabel() {
    const label = prompt('Name your label'); if (!label || !label.trim()) return;
    const clean = label.trim(); if (data.labels.some((item) => item.toLowerCase() === clean.toLowerCase())) { showToast('That label already exists'); return; }
    data.labels.push(clean); persist(); renderLabels(); showToast('Label added');
  }

  document.querySelectorAll('.nav-item').forEach((item) => item.addEventListener('click', () => { currentView = item.dataset.view; if (currentView !== 'pinned') selectedLabel = 'all'; updateView(); if (innerWidth <= 700) $('sidebar').classList.remove('open'); }));
  $('newNoteBtn').addEventListener('click', createNote); $('newNoteBtnTop').addEventListener('click', createNote); $('emptyCreateBtn').addEventListener('click', createNote);
  $('searchInput').addEventListener('input', renderNotes);
  $('sortBtn').addEventListener('click', () => { sortOrder = sortOrder === 'recent' ? 'oldest' : 'recent'; $('sortBtn').innerHTML = `${sortOrder === 'recent' ? 'Recently edited' : 'Least recently edited'} <span>⌄</span>`; renderNotes(); });
  $('labelFilterBtn').addEventListener('click', () => showLabelMenu($('labelFilterBtn')));
  $('editorLabelBtn').addEventListener('click', () => showLabelMenu($('editorLabelBtn'), true));
  $('addLabelBtn').addEventListener('click', addLabel);
  document.querySelectorAll('.view-button').forEach((button) => button.addEventListener('click', () => { layout = button.dataset.layout; document.querySelectorAll('.view-button').forEach((item) => item.classList.toggle('selected', item === button)); renderNotes(); }));
  editorTitle.addEventListener('input', saveEditor); editorBody.addEventListener('input', () => { updateWordCount(); saveEditor(); });
  $('closeEditorBtn').addEventListener('click', closeEditor); $('pinNoteBtn').addEventListener('click', togglePin);
  $('deleteNoteBtn').addEventListener('click', () => { if (activeNoteId) deleteNote(activeNoteId); });
  noteModal.addEventListener('click', (event) => { if (event.target === noteModal) closeEditor(); });
  $('taskForm').addEventListener('submit', addTask);
  document.querySelectorAll('.task-filter').forEach((button) => button.addEventListener('click', () => { selectedTaskFilter = button.dataset.taskFilter; renderTasks(); }));
  $('clearCompleted').addEventListener('click', () => { data.tasks = data.tasks.filter((task) => !task.done); persist(); renderTasks(); renderLabels(); showToast('Completed tasks cleared'); });
  $('themeBtn').addEventListener('click', () => {
    data.dark = !data.dark;
    document.body.classList.toggle('dark', data.dark);
    document.querySelector('meta[name="theme-color"]').content = data.dark ? '#080C15' : '#066DE8';
    persist();
  });
  $('menuBtn').addEventListener('click', () => {
    const isOpen = $('sidebar').classList.toggle('open');
    $('menuBtn').setAttribute('aria-expanded', String(isOpen));
    $('menuBtn').setAttribute('aria-label', isOpen ? 'Close navigation' : 'Open navigation');
  });
  document.addEventListener('keydown', (event) => {
    if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') { event.preventDefault(); $('searchInput').focus(); }
    if (!event.metaKey && !event.ctrlKey && event.key.toLowerCase() === 'n' && !['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName) && noteModal.hidden) { event.preventDefault(); createNote(); }
    if (event.key === 'Escape') { closePopover(); if (!noteModal.hidden) closeEditor(); $('sidebar').classList.remove('open'); }
    if ((event.metaKey || event.ctrlKey) && event.key === 'Enter' && !noteModal.hidden) closeEditor();
  });

  document.body.classList.toggle('dark', data.dark); setToday(); renderLabels(); updateView();
})();
