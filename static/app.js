/**
 * BigQuery Release Notes — app.js
 * Handles feed loading, rendering, filtering, and tweet modal.
 */

/* ── State ──────────────────────────────────────────────── */
const state = {
  entries: [],
  typeColours: {},
  activeTypes: new Set(),  // empty = "all"
  searchQuery: '',
};

/* ── DOM refs ────────────────────────────────────────────── */
const $ = id => document.getElementById(id);

const refreshBtn        = $('refresh-btn');
const refreshIcon       = $('refresh-icon');
const lastFetched       = $('last-fetched');
const loadingState      = $('loading-state');
const errorState        = $('error-state');
const emptyState        = $('empty-state');
const entriesContainer  = $('entries-container');
const errorMessage      = $('error-message');
const searchInput       = $('search-input');
const typeFilters       = $('type-filters');
const modalOverlay      = $('tweet-modal-overlay');
const tweetTextarea     = $('tweet-textarea');
const charsUsed         = $('chars-used');
const charCount         = $('char-count');
const modalEntryDate    = $('modal-entry-date');
const tweetBtn          = $('tweet-btn');
const modalCloseBtn     = $('modal-close-btn');
const modalCancelBtn    = $('modal-cancel-btn');
const toast             = $('toast');

/* ── Utilities ───────────────────────────────────────────── */

function showOnly(el) {
  [loadingState, errorState, emptyState, entriesContainer].forEach(e => e.classList.add('hidden'));
  el.classList.remove('hidden');
}

function setRefreshing(active) {
  refreshBtn.disabled = active;
  if (active) {
    refreshIcon.classList.add('spinning');
  } else {
    refreshIcon.classList.remove('spinning');
  }
}

function formatDateTime(isoStr) {
  if (!isoStr) return '';
  try {
    const d = new Date(isoStr);
    return d.toLocaleString(undefined, {
      year: 'numeric', month: 'short', day: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  } catch {
    return isoStr;
  }
}

function showToast(msg, durationMs = 2800) {
  toast.textContent = msg;
  toast.classList.remove('hidden');
  clearTimeout(toast._timer);
  toast._timer = setTimeout(() => toast.classList.add('hidden'), durationMs);
}

/* ── Feed loading ────────────────────────────────────────── */

async function loadFeed() {
  setRefreshing(true);
  showOnly(loadingState);

  try {
    const res = await fetch('/api/feed');
    const json = await res.json();

    if (!json.ok) throw new Error(json.error || 'Unknown error');

    const { entries, type_colours, fetched_at } = json.data;
    state.entries = entries;
    state.typeColours = type_colours;

    lastFetched.textContent = `Fetched ${formatDateTime(fetched_at)}`;

    buildTypeFilters(entries, type_colours);
    renderEntries();
  } catch (err) {
    console.error(err);
    errorMessage.textContent = err.message;
    showOnly(errorState);
  } finally {
    setRefreshing(false);
  }
}

/* ── Type filter chips ───────────────────────────────────── */

function buildTypeFilters(entries, colours) {
  // Collect all unique types across all entries
  const allTypes = new Set();
  entries.forEach(e => (e.types || []).forEach(t => allTypes.add(t.toLowerCase())));

  typeFilters.innerHTML = '';

  allTypes.forEach(type => {
    const colour = colours[type] || '#8892a4';
    const chip = document.createElement('button');
    chip.className = 'type-chip';
    chip.dataset.type = type;
    chip.setAttribute('aria-pressed', 'false');
    chip.setAttribute('role', 'checkbox');
    chip.innerHTML = `<span class="dot" style="background:${colour}"></span>${capitalise(type)}`;
    chip.addEventListener('click', () => toggleTypeFilter(type, chip, colour));
    typeFilters.appendChild(chip);
  });
}

function toggleTypeFilter(type, chip, colour) {
  if (state.activeTypes.has(type)) {
    state.activeTypes.delete(type);
    chip.classList.remove('active');
    chip.style.background = '';
    chip.style.color = '';
    chip.setAttribute('aria-pressed', 'false');
  } else {
    state.activeTypes.add(type);
    chip.classList.add('active');
    chip.style.background = colour;
    chip.style.color = '#fff';
    chip.setAttribute('aria-pressed', 'true');
  }
  renderEntries();
}

/* ── Render entries ──────────────────────────────────────── */

function getFilteredEntries() {
  let filtered = state.entries;

  // Type filter
  if (state.activeTypes.size > 0) {
    filtered = filtered.filter(e =>
      (e.types || []).some(t => state.activeTypes.has(t.toLowerCase()))
    );
  }

  // Search filter
  const q = state.searchQuery.trim().toLowerCase();
  if (q) {
    filtered = filtered.filter(e =>
      e.title.toLowerCase().includes(q) ||
      e.plain_text.toLowerCase().includes(q)
    );
  }

  return filtered;
}

function renderEntries() {
  const filtered = getFilteredEntries();

  if (filtered.length === 0) {
    if (state.entries.length === 0) {
      showOnly(loadingState);
    } else {
      showOnly(emptyState);
    }
    return;
  }

  showOnly(entriesContainer);
  entriesContainer.innerHTML = filtered.map(entry => buildCardHTML(entry)).join('');

  // Wire up events on newly created cards
  entriesContainer.querySelectorAll('.entry-card').forEach(card => {
    const entryId = card.dataset.entryId;
    const entry = state.entries.find(e => e.id === entryId);

    // Toggle expand on card click (but not on button clicks)
    card.addEventListener('click', e => {
      if (e.target.closest('.btn-card-tweet, a')) return;
      toggleExpand(card);
    });

    card.addEventListener('keydown', e => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        if (!e.target.closest('.btn-card-tweet, a')) toggleExpand(card);
      }
    });

    // Tweet button
    const tweetBtnCard = card.querySelector('.btn-card-tweet');
    if (tweetBtnCard) {
      tweetBtnCard.addEventListener('click', e => {
        e.stopPropagation();
        openTweetModal(entry);
      });
    }

    // Toggle expand button
    const toggleBtn = card.querySelector('.card-toggle');
    if (toggleBtn) {
      toggleBtn.addEventListener('click', e => {
        e.stopPropagation();
        toggleExpand(card);
      });
    }
  });
}

function buildCardHTML(entry) {
  const types = (entry.types || []);
  const typeBadges = types.map(t => {
    const colour = state.typeColours[t.toLowerCase()] || '#8892a4';
    return `<span class="type-badge" style="background:${colour}22;color:${colour};border:1px solid ${colour}44">${t}</span>`;
  }).join('');

  // Truncate plain text for preview
  const preview = entry.plain_text.length > 200
    ? entry.plain_text.slice(0, 200) + '…'
    : entry.plain_text;

  return `
    <article
      class="entry-card"
      data-entry-id="${escapeAttr(entry.id)}"
      tabindex="0"
      role="article"
      aria-label="Release note: ${escapeAttr(entry.title)}"
    >
      <div class="card-header">
        <div class="card-meta">
          <span class="card-date">${escapeHTML(entry.title)}</span>
          ${types.length > 0 ? `<div class="card-types">${typeBadges}</div>` : ''}
        </div>
        <div class="card-actions">
          <button class="btn-card-tweet" aria-label="Tweet about ${escapeAttr(entry.title)}">
            <svg class="x-logo-xs" viewBox="0 0 1200 1227" fill="currentColor" aria-hidden="true">
              <path d="M714.163 519.284L1160.89 0H1055.03L667.137 450.887L357.328 0H0L468.492 681.821L0 1226.37H105.866L515.491 750.218L842.672 1226.37H1200L714.163 519.284ZM569.165 687.828L521.697 619.934L144.011 79.6944H306.615L611.412 515.685L658.88 583.579L1055.08 1150.3H892.476L569.165 687.828Z"/>
            </svg>
            Share
          </button>
        </div>
      </div>

      <div class="card-body">${escapeHTML(preview)}</div>

      <div class="card-content-html" data-expanded="false">
        ${entry.content_html}
      </div>

      <div class="card-footer">
        <button class="card-toggle" aria-expanded="false" aria-label="Show full details">
          Show more <span class="toggle-arrow">▲</span>
        </button>
        <a class="card-link" href="${escapeAttr(entry.link)}" target="_blank" rel="noopener noreferrer" aria-label="View on Google Cloud docs">
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" aria-hidden="true">
            <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6M15 3h6v6M10 14L21 3"/>
          </svg>
          View on Google Cloud
        </a>
      </div>
    </article>`;
}

function toggleExpand(card) {
  const content = card.querySelector('.card-content-html');
  const toggle  = card.querySelector('.card-toggle');
  const arrow   = card.querySelector('.toggle-arrow');
  const isOpen  = content.classList.contains('expanded');

  if (isOpen) {
    content.classList.remove('expanded');
    toggle.setAttribute('aria-expanded', 'false');
    toggle.innerHTML = `Show more <span class="toggle-arrow">▲</span>`;
  } else {
    content.classList.add('expanded');
    toggle.setAttribute('aria-expanded', 'true');
    toggle.innerHTML = `Show less <span class="toggle-arrow open">▲</span>`;
  }
}

/* ── Tweet modal ─────────────────────────────────────────── */

let currentTweetURL = '';

function openTweetModal(entry) {
  currentTweetURL = entry.link || '';

  // Build initial tweet text (≤ 260 chars, URL appended later by Twitter)
  const maxSnippet = 240 - entry.title.length - 5; // room for " | BQ: "
  const snippet = entry.plain_text.slice(0, maxSnippet) + (entry.plain_text.length > maxSnippet ? '…' : '');
  const draft = `📢 BigQuery Update — ${entry.title}\n\n${snippet}\n\n#BigQuery #GoogleCloud`;

  modalEntryDate.textContent = entry.title;
  tweetTextarea.value = draft;
  updateCharCount();

  modalOverlay.classList.remove('hidden');
  tweetTextarea.focus();
  tweetTextarea.select();
  document.body.style.overflow = 'hidden';
}

function closeTweetModal() {
  modalOverlay.classList.add('hidden');
  document.body.style.overflow = '';
}

function updateCharCount() {
  const len = tweetTextarea.value.length;
  charsUsed.textContent = len;
  charCount.classList.toggle('warn', len >= 230 && len < 280);
  charCount.classList.toggle('over', len >= 280);
}

tweetBtn.addEventListener('click', () => {
  const text = tweetTextarea.value.trim();
  const params = new URLSearchParams({ text, url: currentTweetURL });
  const twitterURL = `https://x.com/intent/tweet?${params.toString()}`;
  window.open(twitterURL, '_blank', 'noopener,noreferrer,width=580,height=560');
  closeTweetModal();
  showToast('✈️ Opening X/Twitter…');
});

modalCloseBtn.addEventListener('click', closeTweetModal);
modalCancelBtn.addEventListener('click', closeTweetModal);

modalOverlay.addEventListener('click', e => {
  if (e.target === modalOverlay) closeTweetModal();
});

document.addEventListener('keydown', e => {
  if (e.key === 'Escape' && !modalOverlay.classList.contains('hidden')) closeTweetModal();
});

tweetTextarea.addEventListener('input', updateCharCount);

/* ── Refresh & search ────────────────────────────────────── */

refreshBtn.addEventListener('click', loadFeed);

searchInput.addEventListener('input', () => {
  state.searchQuery = searchInput.value;
  renderEntries();
});

/* ── String helpers ──────────────────────────────────────── */

function escapeHTML(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function escapeAttr(str) {
  return String(str || '').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function capitalise(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

/* ── Boot ────────────────────────────────────────────────── */
loadFeed();
