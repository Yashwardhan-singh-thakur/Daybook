(() => {
  const STORE_KEY = 'daybook-v1';
  const PRESET_LABEL_COLORS = [
    '#D1FF00', // Neon Lime (Signature)
    '#00E5FF', // Electric Cyan
    '#FF3366', // Hyper Coral
    '#FFB800', // Amber Gold
    '#A855F7', // Neon Violet
    '#00E676', // Bright Emerald
    '#FF6D00', // Hyper Orange
    '#38BDF8', // Sky Blue
    '#F43F5E', // Vivid Rose
    '#10B981', // Mint Teal
    '#E040FB', // Neon Magenta
    '#F59E0B', // Golden Orange
    '#6366F1', // Cobalt Indigo
    '#EC4899', // Hot Pink
  ];
  const defaultLabelColors = {
    Personal: '#00E5FF',
    Work: '#FFB800',
    Ideas: '#D1FF00',
    Journal: '#A855F7',
  };
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
      const loadedLabelColors = (typeof parsed.labelColors === 'object' && parsed.labelColors !== null)
        ? { ...defaultLabelColors, ...parsed.labelColors }
        : { ...defaultLabelColors };
      return {
        notes: Array.isArray(parsed.notes) ? parsed.notes : [],
        tasks: Array.isArray(parsed.tasks) ? parsed.tasks : [],
        labels: Array.isArray(parsed.labels) && parsed.labels.length ? parsed.labels : [...defaultLabels],
        labelColors: loadedLabelColors,
        dark: Boolean(parsed.dark),
      };
    } catch { return { notes: [], tasks: [], labels: [...defaultLabels], labelColors: { ...defaultLabelColors }, dark: false }; }
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
  
  function labelColor(label) {
    if (!label) return '#D1FF00';
    if (!data.labelColors) data.labelColors = { ...defaultLabelColors };
    if (data.labelColors[label]) return data.labelColors[label];
    let hash = 0;
    for (let i = 0; i < label.length; i++) hash = (hash * 31 + label.charCodeAt(i)) >>> 0;
    const color = PRESET_LABEL_COLORS[hash % PRESET_LABEL_COLORS.length];
    data.labelColors[label] = color;
    return color;
  }

  function setLabelColor(label, newColor) {
    if (!label || !newColor) return;
    if (!data.labelColors) data.labelColors = {};
    data.labelColors[label] = newColor;
    persist();
    renderLabels();
    renderNotes();
    if (activeNoteId) {
      const note = data.notes.find((item) => item.id === activeNoteId);
      if (note && note.label === label) {
        const dot = $('editorLabelBtn')?.querySelector('.label-dot');
        if (dot) dot.style.background = newColor;
      }
    }
  }

  function renderLabels() {
    $('labelList').innerHTML = data.labels.map((label) => `
      <div class="label-item-wrap">
        <button class="label-item ${selectedLabel === label ? 'selected' : ''}" data-label="${safe(label)}">
          <span class="label-color" style="background:${labelColor(label)}; box-shadow: 0 0 6px ${labelColor(label)}" title="Click to customize color"></span>
          <span class="label-name">${safe(label)}</span>
        </button>
        <button class="label-customize-btn" data-label="${safe(label)}" title="Customize color for ${safe(label)}" aria-label="Customize color for ${safe(label)}">
          <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="9"/>
            <path d="M12 3a9 9 0 0 1 9 9c0 2.2-1.8 4-4 4h-2a2 2 0 0 0-2 2c0 1.1-.9 2-2 2a9 9 0 0 1-1-17Z"/>
            <circle cx="7.5" cy="10.5" r="1" fill="currentColor"/>
            <circle cx="12" cy="7.5" r="1" fill="currentColor"/>
            <circle cx="16.5" cy="10.5" r="1" fill="currentColor"/>
          </svg>
        </button>
      </div>
    `).join('');

    $('labelList').querySelectorAll('.label-item').forEach((button) => {
      button.addEventListener('click', (e) => {
        if (e.target.closest('.label-color')) {
          e.stopPropagation();
          showColorPicker(button.querySelector('.label-color'), button.dataset.label);
          return;
        }
        selectedLabel = selectedLabel === button.dataset.label ? 'all' : button.dataset.label;
        currentView = 'notes'; updateView(); renderNotes(); renderLabels();
      });
    });

    $('labelList').querySelectorAll('.label-customize-btn').forEach((button) => {
      button.addEventListener('click', (e) => {
        e.stopPropagation();
        showColorPicker(button, button.dataset.label);
      });
    });

    $('notesCount').textContent = data.notes.length;
    $('tasksCount').textContent = data.tasks.filter((task) => !task.done).length;
    $('filterLabel').textContent = selectedLabel === 'all' ? 'All labels' : selectedLabel;
  }

  function noteMatches(note, query) {
    const text = `${note.title || ''} ${note.body || ''} ${note.label || ''}`.toLowerCase();
    return (!query || text.includes(query.toLowerCase())) && (selectedLabel === 'all' || note.label === selectedLabel) && (currentView !== 'pinned' || note.pinned);
  }

  let isPreviewMode = false;

  function cleanUrl(raw) {
    let url = String(raw || '').replace(/^\(+/, '');
    while (/[.,!?:;)]$/.test(url)) url = url.slice(0, -1);
    return url;
  }

  function extractUrls(text) {
    if (!text) return [];
    const results = [];
    const seen = new Set();
    const mdRegex = /\[([^\]]+)\]\((https?:\/\/[^\s\)]+|www\.[^\s\)]+)\)/g;
    let m;
    while ((m = mdRegex.exec(text)) !== null) {
      const raw = cleanUrl(m[2]);
      const href = raw.startsWith('http') ? raw : `https://${raw}`;
      if (!seen.has(href)) {
        seen.add(href);
        results.push({ title: m[1], href, raw });
      }
    }
    const urlRegex = /(https?:\/\/[^\s<>'\"()]+|www\.[^\s<>'\"()]+)/g;
    while ((m = urlRegex.exec(text)) !== null) {
      const raw = cleanUrl(m[1]);
      const href = raw.startsWith('http') ? raw : `https://${raw}`;
      if (!seen.has(href)) {
        seen.add(href);
        const displayTitle = raw.replace(/^https?:\/\//i, '').replace(/\/$/, '');
        results.push({ title: displayTitle, href, raw });
      }
    }
    return results;
  }

  function linkifyText(text) {
    if (!text) return '';
    const mdMap = {};
    let str = safe(text);
    str = str.replace(/\[([^\]]+)\]\((https?:\/\/[^\s\)]+|www\.[^\s\)]+)\)/g, (match, title, rawUrl) => {
      const key = `__MD_${Object.keys(mdMap).length}__`;
      const clean = cleanUrl(rawUrl);
      const href = clean.startsWith('http') ? clean : `https://${clean}`;
      mdMap[key] = `<a href="${href}" target="_blank" rel="noopener noreferrer" class="note-inline-link" onclick="event.stopPropagation()">${title} <span class="link-arrow">↗</span></a>`;
      return key;
    });
    const urlRegex = /(https?:\/\/[^\s<>'\"()]+|www\.[^\s<>'\"()]+)/g;
    str = str.replace(urlRegex, (rawUrl) => {
      const clean = cleanUrl(rawUrl);
      const href = clean.startsWith('http') ? clean : `https://${clean}`;
      return `<a href="${href}" target="_blank" rel="noopener noreferrer" class="note-inline-link" onclick="event.stopPropagation()">${clean} <span class="link-arrow">↗</span></a>`;
    });
    for (const [key, val] of Object.entries(mdMap)) {
      str = str.replace(key, val);
    }
    return str;
  }

  function getUrlAtPosition(text, pos) {
    let start = pos;
    while (start > 0 && !/\s/.test(text[start - 1])) start--;
    let end = pos;
    while (end < text.length && !/\s/.test(text[end])) end++;
    const word = text.slice(start, end);
    const urlMatch = word.match(/(https?:\/\/[^\s<>'\"()]+|www\.[^\s<>'\"()]+)/);
    if (urlMatch) {
      const raw = cleanUrl(urlMatch[0]);
      const href = raw.startsWith('http') ? raw : `https://${raw}`;
      return { raw, href };
    }
    return null;
  }

  function updateEditorLinks() {
    const text = `${editorTitle.value} ${editorBody.value}`;
    const links = extractUrls(text);
    const strip = $('editorLinksStrip');
    if (!strip) return;
    if (links.length === 0) {
      strip.hidden = true;
      strip.innerHTML = '';
    } else {
      strip.hidden = false;
      strip.innerHTML = `
        <span class="editor-links-label">
          <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
            <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
          </svg>
          LINKS (${links.length}):
        </span>
        ${links.map((l) => `
          <a href="${safe(l.href)}" target="_blank" rel="noopener noreferrer" class="editor-link-pill" title="Open ${safe(l.href)} in new tab">
            <span>${safe(l.title)}</span>
            <span class="link-arrow">↗</span>
          </a>
        `).join('')}
      `;
    }
  }

  function toggleEditorPreview() {
    isPreviewMode = !isPreviewMode;
    const btn = $('previewNoteBtn');
    if (btn) {
      btn.classList.toggle('active', isPreviewMode);
      btn.setAttribute('title', isPreviewMode ? 'Edit note' : 'Preview note (with clickable links)');
      btn.setAttribute('aria-label', isPreviewMode ? 'Edit note' : 'Preview note');
    }
    const previewEl = $('editorPreview');
    if (isPreviewMode) {
      editorBody.hidden = true;
      previewEl.hidden = false;
      const bodyContent = editorBody.value.trim();
      if (!bodyContent) {
        previewEl.innerHTML = '<p class="preview-empty">Nothing written yet. Switch back to edit.</p>';
      } else {
        const paragraphs = bodyContent.split(/\n\s*\n/);
        previewEl.innerHTML = paragraphs.map((p) => {
          const lines = p.split('\n').map((line) => linkifyText(line)).join('<br/>');
          return `<p>${lines}</p>`;
        }).join('');
      }
    } else {
      editorBody.hidden = false;
      previewEl.hidden = true;
      editorBody.focus();
    }
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
      const previewHtml = linkifyText(preview);
      return `<article class="note-card" data-id="${safe(note.id)}" tabindex="0" aria-label="Open ${safe(title)}"><div class="note-card-top">${label}<span class="pin-indicator">${note.pinned ? '⌁' : ''}</span></div><h3>${safe(title)}</h3><p class="note-preview">${previewHtml}</p><div class="note-card-bottom"><span class="note-date">${relativeDate(note.updatedAt)}</span><button class="note-dots" data-menu-id="${safe(note.id)}" aria-label="Note options">···</button></div></article>`;
    }).join('');
    notesGrid.querySelectorAll('.note-card').forEach((card) => {
      card.addEventListener('click', (event) => {
        if (!event.target.closest('.note-dots') && !event.target.closest('.note-inline-link')) {
          openNote(card.dataset.id);
        }
      });
      card.addEventListener('keydown', (event) => {
        if ((event.key === 'Enter' || event.key === ' ') && !event.target.closest('.note-dots') && !event.target.closest('.note-inline-link')) {
          event.preventDefault();
          openNote(card.dataset.id);
        }
      });
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

  function showColorPicker(anchor, label) {
    closePopover();
    let currentColor = labelColor(label);
    const popover = document.createElement('div');
    popover.className = 'color-popover';
    popover.innerHTML = `
      <div class="color-popover-header">
        <span class="color-preview-badge" id="colorPreviewBadge" style="--badge-color:${currentColor}">
          <span class="color-preview-dot" id="colorPreviewDot" style="background:${currentColor}"></span>
          <span class="color-preview-label">${safe(label)}</span>
        </span>
        <button class="color-popover-close" id="colorPickerCloseBtn" aria-label="Close">×</button>
      </div>
      <div class="color-popover-subtitle">PRESET PALETTE</div>
      <div class="color-swatches-grid">
        ${PRESET_LABEL_COLORS.map((c) => `
          <button class="color-swatch-btn ${c.toLowerCase() === currentColor.toLowerCase() ? 'active' : ''}" data-color="${c}" style="background:${c}" title="${c}"></button>
        `).join('')}
      </div>
      <div class="color-popover-subtitle" style="margin-top:12px;">CUSTOM COLOR</div>
      <div class="color-custom-row">
        <input type="color" class="color-native-input" id="customColorInput" value="${currentColor}" title="Pick custom color" />
        <input type="text" class="color-hex-input" id="customHexInput" value="${currentColor}" maxlength="7" spellcheck="false" placeholder="#HEX" />
        <button class="color-apply-btn" id="customApplyBtn">Save</button>
      </div>
    `;
    document.body.append(popover);
    positionPopover(popover, anchor);

    const updatePreview = (hex) => {
      currentColor = hex;
      const badge = popover.querySelector('#colorPreviewBadge');
      const dot = popover.querySelector('#colorPreviewDot');
      const nativeInp = popover.querySelector('#customColorInput');
      const hexInp = popover.querySelector('#customHexInput');
      if (badge) badge.style.setProperty('--badge-color', hex);
      if (dot) dot.style.background = hex;
      if (nativeInp && nativeInp.value !== hex) nativeInp.value = hex;
      if (hexInp && hexInp.value !== hex) hexInp.value = hex;
      popover.querySelectorAll('.color-swatch-btn').forEach((b) => {
        b.classList.toggle('active', b.dataset.color.toLowerCase() === hex.toLowerCase());
      });
      setLabelColor(label, hex);
    };

    popover.querySelectorAll('.color-swatch-btn').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        updatePreview(btn.dataset.color);
        showToast(`Color updated for "${label}"`);
      });
    });

    const nativeInput = popover.querySelector('#customColorInput');
    nativeInput.addEventListener('input', (e) => {
      updatePreview(e.target.value);
    });
    nativeInput.addEventListener('change', (e) => {
      updatePreview(e.target.value);
      showToast(`Color updated for "${label}"`);
    });

    const hexInput = popover.querySelector('#customHexInput');
    const applyBtn = popover.querySelector('#customApplyBtn');

    const applyHex = () => {
      let val = hexInput.value.trim();
      if (!val.startsWith('#')) val = `#${val}`;
      if (/^#[0-9A-Fa-f]{6}$/.test(val)) {
        updatePreview(val);
        showToast(`Color updated for "${label}"`);
      } else {
        showToast('Please enter a valid 6-character hex color (e.g. #FF3366)');
      }
    };

    applyBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      applyHex();
    });

    hexInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        applyHex();
      }
    });

    popover.querySelector('#colorPickerCloseBtn').addEventListener('click', (e) => {
      e.stopPropagation();
      closePopover();
    });

    window.setTimeout(() => document.addEventListener('click', outsidePopover, { once: true }), 0);
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
    const rect = anchor.getBoundingClientRect();
    menu.style.position = 'fixed';
    menu.style.zIndex = '130';
    const menuWidth = 250;
    const menuHeight = 230;
    let top = rect.bottom + 6;
    let left = rect.left;
    if (top + menuHeight > window.innerHeight) {
      top = Math.max(10, rect.top - menuHeight - 6);
    }
    if (left + menuWidth > window.innerWidth) {
      left = Math.max(10, window.innerWidth - menuWidth - 16);
    }
    menu.style.top = `${top}px`;
    menu.style.left = `${left}px`;
  }
  function closePopover() {
    document.querySelectorAll('.note-popover, .label-popover, .color-popover').forEach((p) => p.remove());
  }
  function outsidePopover(event) {
    if (!event.target.closest('.note-popover, .label-popover, .color-popover')) closePopover();
  }

  function createNote() {
    const now = new Date().toISOString();
    const note = { id: uid(), title: '', body: '', label: '', pinned: false, createdAt: now, updatedAt: now };
    data.notes.unshift(note); persist(); renderLabels(); renderNotes(); openNote(note.id);
  }
  function openNote(id) {
    const note = data.notes.find((item) => item.id === id); if (!note) return;
    activeNoteId = id; editorTitle.value = note.title; editorBody.value = note.body;
    $('editorDate').textContent = `Edited ${relativeDate(note.updatedAt)}`;
    $('saveStatus').textContent = 'Saved';
    $('pinNoteBtn').classList.toggle('pinned', note.pinned);
    $('pinNoteBtn').setAttribute('title', note.pinned ? 'Unpin note' : 'Pin note');
    $('pinNoteBtn').setAttribute('aria-label', note.pinned ? 'Unpin note' : 'Pin note');
    $('editorLabelText').textContent = note.label || 'Add label';
    $('editorLabelBtn').querySelector('.label-dot').style.background = note.label ? labelColor(note.label) : '#c1c8bf';
    isPreviewMode = false;
    $('previewNoteBtn')?.classList.remove('active');
    $('previewNoteBtn')?.setAttribute('title', 'Preview note (with clickable links)');
    $('previewNoteBtn')?.setAttribute('aria-label', 'Preview note');
    editorBody.hidden = false;
    $('editorPreview').hidden = true;
    updateEditorLinks();
    updateWordCount(); noteModal.hidden = false; document.body.style.overflow = 'hidden';
    window.setTimeout(() => editorTitle.focus(), 30);
  }
  function saveEditor() {
    const note = data.notes.find((item) => item.id === activeNoteId); if (!note) return;
    note.title = editorTitle.value; note.body = editorBody.value; note.updatedAt = new Date().toISOString();
    $('saveStatus').textContent = 'Saving…'; persist();
    updateEditorLinks();
    clearTimeout(saveTimer); saveTimer = setTimeout(() => { $('saveStatus').textContent = 'Saved'; $('editorDate').textContent = `Edited ${relativeDate(note.updatedAt)}`; renderNotes(); renderLabels(); }, 320);
  }
  function closeEditor() {
    if (!activeNoteId) { noteModal.hidden = true; document.body.style.overflow = ''; return; }
    const note = data.notes.find((item) => item.id === activeNoteId);
    if (note && !note.title.trim() && !note.body.trim()) data.notes = data.notes.filter((item) => item.id !== note.id);
    activeNoteId = null; isPreviewMode = false; noteModal.hidden = true; document.body.style.overflow = ''; persist(); renderNotes(); renderLabels();
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
    note.pinned = !note.pinned;
    $('pinNoteBtn').classList.toggle('pinned', note.pinned);
    $('pinNoteBtn').setAttribute('title', note.pinned ? 'Unpin note' : 'Pin note');
    $('pinNoteBtn').setAttribute('aria-label', note.pinned ? 'Unpin note' : 'Pin note');
    persist(); renderNotes();
    showToast(note.pinned ? 'Note pinned' : 'Note unpinned');
  }
  function showLabelMenu(anchor, editor = false) {
    closePopover();
    const menu = document.createElement('div');
    menu.className = 'label-popover';
    menu.innerHTML = `
      <button data-label="" class="popover-no-label">No label</button>
      ${data.labels.map((label) => `
        <div class="popover-label-row">
          <button data-label="${safe(label)}" class="popover-label-choice">
            <span class="label-color" style="background:${labelColor(label)}; box-shadow: 0 0 6px ${labelColor(label)}"></span>
            <span>${safe(label)}</span>
          </button>
          <button class="popover-color-btn" data-customize-label="${safe(label)}" title="Customize color for ${safe(label)}" aria-label="Customize color for ${safe(label)}">
            <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="12" cy="12" r="9"/>
              <path d="M12 3a9 9 0 0 1 9 9c0 2.2-1.8 4-4 4h-2a2 2 0 0 0-2 2c0 1.1-.9 2-2 2a9 9 0 0 1-1-17Z"/>
              <circle cx="7.5" cy="10.5" r="1" fill="currentColor"/>
              <circle cx="12" cy="7.5" r="1" fill="currentColor"/>
              <circle cx="16.5" cy="10.5" r="1" fill="currentColor"/>
            </svg>
          </button>
        </div>
      `).join('')}
      <button data-label="__new" class="add-label-option">＋ New label</button>
    `;
    document.body.append(menu);
    positionPopover(menu, anchor);

    menu.addEventListener('click', (event) => {
      const custBtn = event.target.closest('[data-customize-label]');
      if (custBtn) {
        event.stopPropagation();
        showColorPicker(custBtn, custBtn.dataset.customizeLabel);
        return;
      }
      const button = event.target.closest('button[data-label]');
      if (!button) return;
      let label = button.dataset.label;
      if (label === '__new') {
        label = prompt('Name your label');
        if (!label || !label.trim()) { closePopover(); return; }
        label = label.trim();
        if (!data.labels.includes(label)) {
          data.labels.push(label);
          labelColor(label);
          persist();
        }
      }
      if (editor) {
        const note = data.notes.find((item) => item.id === activeNoteId);
        if (note) {
          note.label = label;
          note.updatedAt = new Date().toISOString();
          persist();
          $('editorLabelText').textContent = label || 'Add label';
          $('editorLabelBtn').querySelector('.label-dot').style.background = label ? labelColor(label) : '#c1c8bf';
          renderNotes();
          renderLabels();
        }
      } else {
        selectedLabel = label || 'all';
        $('filterLabel').textContent = selectedLabel === 'all' ? 'All labels' : selectedLabel;
        renderLabels();
        renderNotes();
      }
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
    if ($('topbarNewNoteBtn')) $('topbarNewNoteBtn').hidden = isTasks;
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
    data.labels.push(clean);
    labelColor(clean);
    persist();
    renderLabels();
    showToast(`Label "${clean}" added`);
    const btn = document.querySelector(`.label-customize-btn[data-label="${clean}"]`);
    if (btn) showColorPicker(btn, clean);
  }

  document.querySelectorAll('.nav-item').forEach((item) => item.addEventListener('click', () => { currentView = item.dataset.view; if (currentView !== 'pinned') selectedLabel = 'all'; updateView(); if (innerWidth <= 700) $('sidebar').classList.remove('open'); }));
  $('newNoteBtn').addEventListener('click', createNote); $('newNoteBtnTop').addEventListener('click', createNote); $('emptyCreateBtn').addEventListener('click', createNote);
  if ($('topbarNewNoteBtn')) $('topbarNewNoteBtn').addEventListener('click', createNote);
  $('searchInput').addEventListener('input', renderNotes);
  $('sortBtn').addEventListener('click', () => { sortOrder = sortOrder === 'recent' ? 'oldest' : 'recent'; $('sortBtn').innerHTML = `${sortOrder === 'recent' ? 'Recently edited' : 'Least recently edited'} <span>⌄</span>`; renderNotes(); });
  $('labelFilterBtn').addEventListener('click', () => showLabelMenu($('labelFilterBtn')));
  $('editorLabelBtn').addEventListener('click', () => showLabelMenu($('editorLabelBtn'), true));
  $('addLabelBtn').addEventListener('click', addLabel);
  document.querySelectorAll('.view-button').forEach((button) => button.addEventListener('click', () => { layout = button.dataset.layout; document.querySelectorAll('.view-button').forEach((item) => item.classList.toggle('selected', item === button)); renderNotes(); }));
  editorTitle.addEventListener('input', saveEditor); editorBody.addEventListener('input', () => { updateWordCount(); saveEditor(); });
  $('closeEditorBtn').addEventListener('click', closeEditor); $('pinNoteBtn').addEventListener('click', togglePin);
  $('previewNoteBtn')?.addEventListener('click', toggleEditorPreview);
  editorBody.addEventListener('click', (event) => {
    if (event.metaKey || event.ctrlKey) {
      const pos = editorBody.selectionStart;
      const text = editorBody.value;
      const match = getUrlAtPosition(text, pos);
      if (match) {
        window.open(match.href, '_blank', 'noopener,noreferrer');
        showToast(`Opening ${match.raw} in new tab ↗`);
      }
    }
  });
  $('deleteNoteBtn').addEventListener('click', () => { if (activeNoteId) deleteNote(activeNoteId); });
  noteModal.addEventListener('click', (event) => { if (event.target === noteModal) closeEditor(); });
  $('taskForm').addEventListener('submit', addTask);
  document.querySelectorAll('.task-filter').forEach((button) => button.addEventListener('click', () => { selectedTaskFilter = button.dataset.taskFilter; renderTasks(); }));
  $('clearCompleted').addEventListener('click', () => { data.tasks = data.tasks.filter((task) => !task.done); persist(); renderTasks(); renderLabels(); showToast('Completed tasks cleared'); });
  $('themeBtn').addEventListener('click', () => {
    data.dark = !data.dark;
    document.body.classList.toggle('dark', data.dark);
    document.querySelector('meta[name="theme-color"]').content = data.dark ? '#111111' : '#F5F5F0';
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
