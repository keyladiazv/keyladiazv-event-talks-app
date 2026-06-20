// Global Application State
let appState = {
    releases: [],
    filteredReleases: [],
    selectedIds: new Set(),
    activeFilter: 'all',
    searchQuery: '',
    sortOrder: 'desc',
    lastUpdated: ''
};

// DOM Elements Cache
const DOM = {
    btnRefresh: document.getElementById('btnRefresh'),
    refreshIcon: document.getElementById('refreshIcon'),
    syncStatus: document.getElementById('syncStatus'),
    statusDot: document.querySelector('.status-dot'),
    statusText: document.querySelector('.status-text'),
    
    btnThemeToggle: document.getElementById('btnThemeToggle'),
    themeIcon: document.getElementById('themeIcon'),
    btnExportCSV: document.getElementById('btnExportCSV'),
    
    searchInput: document.getElementById('searchInput'),
    btnClearSearch: document.getElementById('btnClearSearch'),
    typeFilters: document.getElementById('typeFilters'),
    sortSelect: document.getElementById('sortSelect'),
    
    selectionStatusBar: document.getElementById('selectionStatusBar'),
    selectionCount: document.getElementById('selectionCount'),
    btnSelectAll: document.getElementById('btnSelectAll'),
    btnClearSelection: document.getElementById('btnClearSelection'),
    
    loadingState: document.getElementById('loadingState'),
    errorState: document.getElementById('errorState'),
    errorMessage: document.getElementById('errorMessage'),
    btnRetry: document.getElementById('btnRetry'),
    emptyState: document.getElementById('emptyState'),
    
    releasesGrid: document.getElementById('releasesGrid'),
    
    floatingPanel: document.getElementById('floatingPanel'),
    floatingPanelText: document.getElementById('floatingPanelText'),
    btnCancelFloat: document.getElementById('btnCancelFloat'),
    btnTweetFloat: document.getElementById('btnTweetFloat'),
    
    tweetModal: document.getElementById('tweetModal'),
    modalTitle: document.getElementById('modalTitle'),
    tweetContent: document.getElementById('tweetContent'),
    charCount: document.getElementById('charCount'),
    charWarning: document.getElementById('charWarning'),
    btnModalClose: document.getElementById('btnModalClose'),
    btnModalCancel: document.getElementById('btnModalCancel'),
    btnModalSend: document.getElementById('btnModalSend')
};

// Initialize Application
document.addEventListener('DOMContentLoaded', () => {
    initTheme();
    setupEventListeners();
    fetchReleases();
});

// Event Listeners Configuration
function setupEventListeners() {
    // Theme toggle
    DOM.btnThemeToggle.addEventListener('click', toggleTheme);
    
    // CSV Export
    DOM.btnExportCSV.addEventListener('click', exportToCSV);
    
    // Refresh buttons
    DOM.btnRefresh.addEventListener('click', () => fetchReleases(true));
    DOM.btnRetry.addEventListener('click', () => fetchReleases(true));
    
    // Search input
    DOM.searchInput.addEventListener('input', handleSearch);
    DOM.btnClearSearch.addEventListener('click', clearSearch);
    
    // Type Filters
    DOM.typeFilters.addEventListener('click', handleFilterClick);
    
    // Sort dropdown
    DOM.sortSelect.addEventListener('change', handleSortChange);
    
    // Selection operations
    DOM.btnSelectAll.addEventListener('click', selectAllVisible);
    DOM.btnClearSelection.addEventListener('click', clearSelection);
    DOM.btnCancelFloat.addEventListener('click', clearSelection);
    DOM.btnTweetFloat.addEventListener('click', openComposerForSelected);
    
    // Modal controls
    DOM.btnModalClose.addEventListener('click', closeTweetComposer);
    DOM.btnModalCancel.addEventListener('click', closeTweetComposer);
    DOM.btnModalSend.addEventListener('click', publishTweet);
    DOM.tweetContent.addEventListener('input', updateCharCount);
    
    // Close modal on click outside
    DOM.tweetModal.addEventListener('click', (e) => {
        if (e.target === DOM.tweetModal) {
            closeTweetComposer();
        }
    });
}

// Fetch Release Notes
async function fetchReleases(force = false) {
    showState('loading');
    DOM.btnRefresh.disabled = true;
    DOM.refreshIcon.classList.add('spin');
    
    DOM.statusDot.className = 'status-dot syncing';
    DOM.statusText.textContent = 'Sincronizando...';
    
    try {
        const response = await fetch(`/api/releases?force=${force}`);
        if (!response.ok) {
            throw new Error(`HTTP Error! Status: ${response.status}`);
        }
        
        const data = await response.json();
        if (data.success) {
            appState.releases = data.releases;
            appState.lastUpdated = data.last_updated;
            
            // Clear selection when feed is refreshed
            appState.selectedIds.clear();
            
            // Update Header Status Indicator
            DOM.statusDot.className = 'status-dot';
            DOM.statusText.textContent = `Actualizado: ${appState.lastUpdated}`;
            
            applyFiltersAndRender();
        } else {
            throw new Error(data.error || 'Failed to fetch release notes.');
        }
    } catch (error) {
        console.error("Error fetching release notes:", error);
        DOM.statusDot.className = 'status-dot error';
        DOM.statusText.textContent = 'Error de conexión';
        
        DOM.errorMessage.textContent = `No se pudieron cargar las notas de la versión: ${error.message}`;
        showState('error');
    } finally {
        DOM.btnRefresh.disabled = false;
        DOM.refreshIcon.classList.remove('spin');
    }
}

// Show specific layout state (loading, error, empty, or content)
function showState(state) {
    DOM.loadingState.style.display = state === 'loading' ? 'flex' : 'none';
    DOM.errorState.style.display = state === 'error' ? 'block' : 'none';
    DOM.emptyState.style.display = state === 'empty' ? 'block' : 'none';
    DOM.releasesGrid.style.display = state === 'content' ? 'grid' : 'none';
}

// Filter and Sort Handler
function applyFiltersAndRender() {
    let filtered = [...appState.releases];
    
    // 1. Filter by Type
    if (appState.activeFilter !== 'all') {
        filtered = filtered.filter(item => item.type.toLowerCase() === appState.activeFilter.toLowerCase());
    }
    
    // 2. Filter by Search Query
    if (appState.searchQuery) {
        const query = appState.searchQuery.toLowerCase();
        filtered = filtered.filter(item => {
            return item.plain_text.toLowerCase().includes(query) || 
                   item.type.toLowerCase().includes(query) || 
                   item.date.toLowerCase().includes(query);
        });
    }
    
    // 3. Sort items
    filtered.sort((a, b) => {
        const dateA = new Date(a.updated || a.date);
        const dateB = new Date(b.updated || b.date);
        
        if (appState.sortOrder === 'desc') {
            return dateB - dateA;
        } else {
            return dateA - dateB;
        }
    });
    
    appState.filteredReleases = filtered;
    
    // Update selection states (remove items that are no longer present)
    const activeIds = new Set(filtered.map(item => item.id));
    // (We keep selected items in memory even if filtered out, in case they clear filter,
    // but for "select all visible" we only act on active ones).
    
    if (filtered.length === 0) {
        showState('empty');
    } else {
        showState('content');
        renderGrid();
    }
    
    updateSelectionUI();
}

// Render release grid
function renderGrid() {
    DOM.releasesGrid.innerHTML = '';
    
    appState.filteredReleases.forEach(item => {
        const isSelected = appState.selectedIds.has(item.id);
        
        // CSS type class map
        let badgeClass = 'badge-other';
        const typeLower = item.type.toLowerCase();
        if (typeLower.includes('feature')) badgeClass = 'badge-feature';
        else if (typeLower.includes('announcement')) badgeClass = 'badge-announcement';
        else if (typeLower.includes('issue')) badgeClass = 'badge-issue';
        else if (typeLower.includes('deprecat')) badgeClass = 'badge-deprecated';
        
        const card = document.createElement('article');
        card.className = `release-card ${isSelected ? 'selected' : ''}`;
        card.setAttribute('data-id', item.id);
        card.setAttribute('role', 'listitem');
        
        card.innerHTML = `
            <div class="card-header">
                <div class="card-meta">
                    <span class="release-date">${item.date}</span>
                    <span class="badge ${badgeClass}">${item.type}</span>
                </div>
                <div class="card-select-area" title="Seleccionar para publicar">
                    <input type="checkbox" class="card-checkbox" ${isSelected ? 'checked' : ''} aria-label="Seleccionar actualización del ${item.date}">
                </div>
            </div>
            <div class="card-body">
                ${item.body}
            </div>
            <div class="card-actions">
                <a href="${item.link}" target="_blank" rel="noopener noreferrer" class="card-link" title="Ver documentación oficial">
                    <i class="fa-solid fa-arrow-up-right-from-square"></i>
                    <span>Ver original</span>
                </a>
                <div class="share-buttons">
                    <button class="share-btn share-btn-copy" title="Copiar nota al portapapeles">
                        <i class="fa-regular fa-copy"></i>
                    </button>
                    <button class="share-btn share-btn-twitter" title="Compartir esta nota en Twitter">
                        <i class="fa-brands fa-x-twitter"></i>
                    </button>
                </div>
            </div>
        `;
        
        // Card Selection Event Listener (whole card header selection/checkbox)
        const selectArea = card.querySelector('.card-select-area');
        const checkbox = card.querySelector('.card-checkbox');
        
        // Toggle selection on checkbox change
        checkbox.addEventListener('change', (e) => {
            e.stopPropagation();
            toggleSelectCard(item.id);
        });
        
        // Let clicking on the select area toggle the checkbox
        selectArea.addEventListener('click', (e) => {
            e.stopPropagation();
            if (e.target !== checkbox) {
                checkbox.checked = !checkbox.checked;
                toggleSelectCard(item.id);
            }
        });
        
        // Quick copy share button
        const copyBtn = card.querySelector('.share-btn-copy');
        copyBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            navigator.clipboard.writeText(item.plain_text).then(() => {
                const icon = copyBtn.querySelector('i');
                copyBtn.classList.add('copied');
                icon.className = 'fa-solid fa-check';
                copyBtn.title = '¡Copiado!';
                
                setTimeout(() => {
                    copyBtn.classList.remove('copied');
                    icon.className = 'fa-regular fa-copy';
                    copyBtn.title = 'Copiar nota al portapapeles';
                }, 2000);
            }).catch(err => {
                console.error('Failed to copy text: ', err);
            });
        });
        
        // Quick tweet share button
        const tweetBtn = card.querySelector('.share-btn-twitter');
        tweetBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            openComposerForSingle(item);
        });
        
        // Handle clicking card itself (toggles select unless clicking a link)
        card.addEventListener('click', (e) => {
            if (e.target.tagName !== 'A' && !e.target.closest('a') && 
                e.target.tagName !== 'BUTTON' && !e.target.closest('button') &&
                !e.target.closest('.card-select-area')) {
                checkbox.checked = !checkbox.checked;
                toggleSelectCard(item.id);
            }
        });
        
        DOM.releasesGrid.appendChild(card);
    });
}

// Search operations
function handleSearch(e) {
    appState.searchQuery = e.target.value;
    if (appState.searchQuery) {
        DOM.btnClearSearch.style.display = 'block';
    } else {
        DOM.btnClearSearch.style.display = 'none';
    }
    applyFiltersAndRender();
}

function clearSearch() {
    DOM.searchInput.value = '';
    appState.searchQuery = '';
    DOM.btnClearSearch.style.display = 'none';
    applyFiltersAndRender();
}

// Filter operations
function handleFilterClick(e) {
    const filterBtn = e.target.closest('.filter-tag');
    if (!filterBtn) return;
    
    // Toggle active classes
    const siblings = DOM.typeFilters.querySelectorAll('.filter-tag');
    siblings.forEach(btn => btn.classList.remove('active'));
    filterBtn.classList.add('active');
    
    appState.activeFilter = filterBtn.dataset.type;
    applyFiltersAndRender();
}

// Sort operations
function handleSortChange(e) {
    appState.sortOrder = e.target.value;
    applyFiltersAndRender();
}

// Card Selection operations
function toggleSelectCard(id) {
    if (appState.selectedIds.has(id)) {
        appState.selectedIds.delete(id);
        const card = DOM.releasesGrid.querySelector(`[data-id="${id}"]`);
        if (card) card.classList.remove('selected');
    } else {
        appState.selectedIds.add(id);
        const card = DOM.releasesGrid.querySelector(`[data-id="${id}"]`);
        if (card) card.classList.add('selected');
    }
    updateSelectionUI();
}

function updateSelectionUI() {
    const selectedCount = appState.selectedIds.size;
    
    // Update toolbar bar
    if (selectedCount > 0) {
        DOM.selectionStatusBar.classList.add('active');
        DOM.selectionCount.textContent = `${selectedCount} nota${selectedCount > 1 ? 's' : ''} seleccionada${selectedCount > 1 ? 's' : ''}`;
        
        DOM.floatingPanel.classList.add('visible');
        DOM.floatingPanelText.textContent = `${selectedCount} actualización${selectedCount > 1 ? 'es' : ''} seleccionada${selectedCount > 1 ? 's' : ''}`;
    } else {
        DOM.selectionStatusBar.classList.remove('active');
        DOM.floatingPanel.classList.remove('visible');
    }
}

function selectAllVisible() {
    appState.filteredReleases.forEach(item => {
        appState.selectedIds.add(item.id);
        const card = DOM.releasesGrid.querySelector(`[data-id="${item.id}"]`);
        if (card) {
            card.classList.add('selected');
            const checkbox = card.querySelector('.card-checkbox');
            if (checkbox) checkbox.checked = true;
        }
    });
    updateSelectionUI();
}

function clearSelection() {
    appState.selectedIds.clear();
    const cards = DOM.releasesGrid.querySelectorAll('.release-card');
    cards.forEach(card => {
        card.classList.remove('selected');
        const checkbox = card.querySelector('.card-checkbox');
        if (checkbox) checkbox.checked = false;
    });
    updateSelectionUI();
}

// Tweet formatting utilities
function cleanTextForTweet(text) {
    // Trim extra spaces and newlines
    let cleaned = text.replace(/\s+/g, ' ').trim();
    // Shorten long backticks e.g. `CREATE OR REPLACE TABLE` -> CREATE OR REPLACE TABLE
    cleaned = cleaned.replace(/`([^`]+)`/g, '$1');
    return cleaned;
}

function generateSingleTweet(item) {
    const emojiMap = {
        'feature': '📢',
        'announcement': '💡',
        'issue': '⚠️',
        'deprecated': '🛑'
    };
    
    const typeLower = item.type.toLowerCase();
    let emoji = '📢';
    for (const [key, em] of Object.entries(emojiMap)) {
        if (typeLower.includes(key)) {
            emoji = em;
            break;
        }
    }
    
    const title = `${emoji} BigQuery Update (${item.date})\n🏷️ ${item.type}\n\n`;
    const hashtags = `\n\n#BigQuery #GoogleCloud`;
    const docLink = `\n🔗 docs: ${item.link}`;
    
    // Calculate space for description
    const metadataLength = title.length + hashtags.length + docLink.length;
    const availableLength = 280 - metadataLength;
    
    let description = cleanTextForTweet(item.plain_text);
    if (description.length > availableLength) {
        description = description.substring(0, availableLength - 3) + '...';
    }
    
    return `${title}${description}${docLink}${hashtags}`;
}

function generateMultiTweet(selectedItems) {
    const header = `📢 Google Cloud BigQuery Updates Summary:\n\n`;
    const footer = `\n🔗 Read details: https://docs.cloud.google.com/bigquery/docs/release-notes\n#BigQuery #GoogleCloud`;
    
    let listContent = '';
    selectedItems.forEach(item => {
        const emojiMap = {
            'feature': '🟢',
            'announcement': '🔵',
            'issue': '🔴',
            'deprecated': '🟡'
        };
        const typeLower = item.type.toLowerCase();
        let emoji = '🔹';
        for (const [key, em] of Object.entries(emojiMap)) {
            if (typeLower.includes(key)) {
                emoji = em;
                break;
            }
        }
        
        // Basic clean item text
        let cleanBody = cleanTextForTweet(item.plain_text);
        if (cleanBody.length > 50) {
            cleanBody = cleanBody.substring(0, 47) + '...';
        }
        
        listContent += `${emoji} ${item.date} [${item.type}]: ${cleanBody}\n`;
    });
    
    const fullTweet = `${header}${listContent}${footer}`;
    return fullTweet;
}

// Modal handling
function openTweetComposer(initialText) {
    DOM.tweetContent.value = initialText;
    DOM.tweetModal.classList.add('open');
    updateCharCount();
}

function closeTweetComposer() {
    DOM.tweetModal.classList.remove('open');
}

function updateCharCount() {
    const text = DOM.tweetContent.value;
    const count = text.length;
    DOM.charCount.textContent = `${count}/280`;
    
    if (count > 280) {
        DOM.charCount.classList.add('warning');
        DOM.charWarning.style.display = 'block';
    } else {
        DOM.charCount.classList.remove('warning');
        DOM.charWarning.style.display = 'none';
    }
}

// Open modal for a single note
function openComposerForSingle(item) {
    const tweetText = generateSingleTweet(item);
    DOM.modalTitle.innerHTML = `<i class="fa-brands fa-x-twitter"></i> Publicar Actualización del ${item.date}`;
    openTweetComposer(tweetText);
}

// Open modal for selected notes
function openComposerForSelected() {
    const selectedItems = appState.releases.filter(item => appState.selectedIds.has(item.id));
    if (selectedItems.length === 0) return;
    
    let tweetText = '';
    if (selectedItems.length === 1) {
        tweetText = generateSingleTweet(selectedItems[0]);
        DOM.modalTitle.innerHTML = `<i class="fa-brands fa-x-twitter"></i> Publicar Actualización del ${selectedItems[0].date}`;
    } else {
        tweetText = generateMultiTweet(selectedItems);
        DOM.modalTitle.innerHTML = `<i class="fa-brands fa-x-twitter"></i> Publicar ${selectedItems.length} Actualizaciones`;
    }
    
    openTweetComposer(tweetText);
}

// Share via Twitter Web Intent
function publishTweet() {
    const tweetText = DOM.tweetContent.value;
    const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(tweetText)}`;
    
    // Open Twitter Web Intent in a new tab
    window.open(twitterUrl, '_blank', 'noopener,noreferrer,width=600,height=400');
    
    closeTweetComposer();
    
    // If it was a bulk tweet, optionally clear selection
    if (appState.selectedIds.size > 1) {
        clearSelection();
    }
}

// Theme management functions
function initTheme() {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'light') {
        document.body.classList.add('light-theme');
        DOM.themeIcon.className = 'fa-solid fa-sun';
        DOM.btnThemeToggle.title = 'Cambiar a modo oscuro';
    } else {
        document.body.classList.remove('light-theme');
        DOM.themeIcon.className = 'fa-solid fa-moon';
        DOM.btnThemeToggle.title = 'Cambiar a modo claro';
    }
}

function toggleTheme() {
    const isLight = document.body.classList.toggle('light-theme');
    if (isLight) {
        localStorage.setItem('theme', 'light');
        DOM.themeIcon.className = 'fa-solid fa-sun';
        DOM.btnThemeToggle.title = 'Cambiar a modo oscuro';
    } else {
        localStorage.setItem('theme', 'dark');
        DOM.themeIcon.className = 'fa-solid fa-moon';
        DOM.btnThemeToggle.title = 'Cambiar a modo claro';
    }
}

// Export to CSV utility
function exportToCSV() {
    if (appState.filteredReleases.length === 0) {
        alert('No hay notas de versión visibles para exportar.');
        return;
    }
    
    // CSV Header
    const headers = ['ID', 'Fecha', 'Tipo de Nota', 'Actualizado (Timestamp)', 'Enlace Original', 'Cuerpo (Texto Plano)'];
    
    // Helper to escape values for CSV
    const escapeCSV = (val) => {
        if (val === null || val === undefined) return '';
        let str = String(val);
        str = str.replace(/"/g, '""');
        if (str.includes('"') || str.includes(',') || str.includes('\n') || str.includes('\r')) {
            str = `"${str}"`;
        }
        return str;
    };
    
    // Build CSV content
    let csvContent = '\uFEFF'; // Add BOM for UTF-8 compatibility with Excel
    csvContent += headers.map(escapeCSV).join(',') + '\r\n';
    
    appState.filteredReleases.forEach(item => {
        const row = [
            item.id,
            item.date,
            item.type,
            item.updated,
            item.link,
            item.plain_text
        ];
        csvContent += row.map(escapeCSV).join(',') + '\r\n';
    });
    
    // Create blob and trigger download
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    
    // Generate filename based on filters
    const filterText = appState.activeFilter !== 'all' ? `_${appState.activeFilter.toLowerCase()}` : '';
    const dateStr = new Date().toISOString().split('T')[0];
    link.setAttribute('href', url);
    link.setAttribute('download', `bigquery_release_notes${filterText}_${dateStr}.csv`);
    link.style.visibility = 'hidden';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}
