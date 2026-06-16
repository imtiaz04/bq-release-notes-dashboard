/**
 * BigQuery Release Notes Dashboard - Frontend Controller
 */

document.addEventListener('DOMContentLoaded', () => {
    // ==========================================================================
    // STATE MANAGEMENT
    // ==========================================================================
    let releaseNotes = [];
    const filters = {
        search: '',
        type: 'all',
        sort: 'newest'
    };

    // ==========================================================================
    // DOM ELEMENTS
    // ==========================================================================
    const themeToggleBtn = document.getElementById('theme-toggle');
    const refreshBtn = document.getElementById('btn-refresh');
    const spinner = document.getElementById('spinner');
    const searchInput = document.getElementById('search-input');
    const clearSearchBtn = document.getElementById('clear-search');
    const typeFiltersContainer = document.getElementById('type-filters');
    const sortSelect = document.getElementById('sort-select');
    const cardsGrid = document.getElementById('cards-grid');
    const loadingState = document.getElementById('loading-state');
    const emptyState = document.getElementById('empty-state');
    const resetFiltersBtn = document.getElementById('btn-reset-filters');
    
    // Modal Elements
    const shareModal = document.getElementById('share-modal');
    const closeModalBtn = document.getElementById('close-modal');
    const previewBadge = document.getElementById('preview-badge');
    const previewDate = document.getElementById('preview-date');
    const previewContent = document.getElementById('preview-content');
    const shareTextarea = document.getElementById('share-text');
    const charCounter = document.getElementById('char-counter');
    const charWarning = document.getElementById('char-warning');
    const copyShareBtn = document.getElementById('btn-copy-share');
    const postXBtn = document.getElementById('btn-post-x');
    const toastContainer = document.getElementById('toast-container');

    // ==========================================================================
    // INITIALIZATION & THEME HANDLER
    // ==========================================================================
    function init() {
        // Initialize Theme Settings
        const savedTheme = localStorage.getItem('theme') || 'dark';
        if (savedTheme === 'dark') {
            document.body.classList.add('dark-theme');
        } else {
            document.body.classList.remove('dark-theme');
        }

        // Setup Event Listeners
        themeToggleBtn.addEventListener('click', toggleTheme);
        refreshBtn.addEventListener('click', () => fetchReleaseNotes(true));
        searchInput.addEventListener('input', handleSearchInput);
        clearSearchBtn.addEventListener('click', clearSearch);
        typeFiltersContainer.addEventListener('click', handleTypeFilter);
        sortSelect.addEventListener('change', handleSortChange);
        resetFiltersBtn.addEventListener('click', resetAllFilters);
        
        // Modal Events
        closeModalBtn.addEventListener('click', closeShareModal);
        shareModal.addEventListener('click', (e) => {
            if (e.target === shareModal) closeShareModal();
        });
        shareTextarea.addEventListener('input', updateCharCount);
        copyShareBtn.addEventListener('click', copyShareText);
        postXBtn.addEventListener('click', handlePostXClick);

        // Fetch Release Notes
        fetchReleaseNotes();
    }

    // Toggle between light and dark themes
    function toggleTheme() {
        const isDark = document.body.classList.toggle('dark-theme');
        localStorage.setItem('theme', isDark ? 'dark' : 'light');
    }

    // ==========================================================================
    // DATA FETCHING (API INTERACTION)
    // ==========================================================================
    async function fetchReleaseNotes(forceRefresh = false) {
        // Update loading visual states
        spinner.classList.add('spinning');
        refreshBtn.disabled = true;
        
        if (releaseNotes.length === 0) {
            loadingState.classList.remove('hidden');
            cardsGrid.classList.add('hidden');
        }
        emptyState.classList.add('hidden');

        try {
            const url = `/api/release-notes${forceRefresh ? '?refresh=true' : ''}`;
            const response = await fetch(url);
            if (!response.ok) {
                throw new Error('Failed to retrieve release notes data.');
            }
            
            const result = await response.json();
            releaseNotes = result.notes || [];
            
            if (forceRefresh) {
                showToast('Release notes updated successfully!');
            }
        } catch (error) {
            console.error('Error fetching release notes:', error);
            showToast('Error: Could not retrieve release notes.');
        } finally {
            spinner.classList.remove('spinning');
            refreshBtn.disabled = false;
            loadingState.classList.add('hidden');
            cardsGrid.classList.remove('hidden');
            
            // Re-render based on current filter states
            applyFiltersAndRender();
        }
    }

    // ==========================================================================
    // SEARCH & FILTER SYSTEM
    // ==========================================================================
    function handleSearchInput(e) {
        filters.search = e.target.value.trim().toLowerCase();
        
        // Toggle visibility of clear search "x" button
        if (filters.search.length > 0) {
            clearSearchBtn.classList.add('visible');
        } else {
            clearSearchBtn.classList.remove('visible');
        }
        
        applyFiltersAndRender();
    }

    function clearSearch() {
        searchInput.value = '';
        filters.search = '';
        clearSearchBtn.classList.remove('visible');
        applyFiltersAndRender();
    }

    function handleTypeFilter(e) {
        const clickedPill = e.target.closest('.pill');
        if (!clickedPill) return;

        // Toggle active style
        typeFiltersContainer.querySelectorAll('.pill').forEach(pill => {
            pill.classList.remove('active');
        });
        clickedPill.classList.add('active');

        // Apply setting
        filters.type = clickedPill.dataset.type;
        applyFiltersAndRender();
    }

    function handleSortChange(e) {
        filters.sort = e.target.value;
        applyFiltersAndRender();
    }

    function resetAllFilters() {
        searchInput.value = '';
        filters.search = '';
        clearSearchBtn.classList.remove('visible');
        
        typeFiltersContainer.querySelectorAll('.pill').forEach(pill => {
            pill.classList.remove('active');
            if (pill.dataset.type === 'all') {
                pill.classList.add('active');
            }
        });
        filters.type = 'all';
        
        sortSelect.value = 'newest';
        filters.sort = 'newest';
        
        applyFiltersAndRender();
    }

    // Filters and sorts the array locally, then calls the renderer
    function applyFiltersAndRender() {
        let filtered = [...releaseNotes];

        // 1. Filter by Update Type
        if (filters.type !== 'all') {
            filtered = filtered.filter(item => {
                return item.type.toLowerCase() === filters.type;
            });
        }

        // 2. Filter by Search Query
        if (filters.search) {
            filtered = filtered.filter(item => {
                const plainContent = stripHTML(item.content).toLowerCase();
                const typeText = item.type.toLowerCase();
                const dateText = item.date.toLowerCase();
                
                return plainContent.includes(filters.search) || 
                       typeText.includes(filters.search) || 
                       dateText.includes(filters.search);
            });
        }

        // 3. Sort by Date
        filtered.sort((a, b) => {
            const dateA = a.updated ? new Date(a.updated) : new Date(0);
            const dateB = b.updated ? new Date(b.updated) : new Date(0);
            
            if (filters.sort === 'newest') {
                return dateB - dateA;
            } else {
                return dateA - dateB;
            }
        });

        // 4. Render Grid
        renderGrid(filtered);
    }

    // ==========================================================================
    // UI RENDERERS
    // ==========================================================================
    function renderGrid(items) {
        cardsGrid.innerHTML = '';
        
        if (items.length === 0) {
            emptyState.classList.remove('hidden');
            cardsGrid.classList.add('hidden');
            return;
        }

        emptyState.classList.add('hidden');
        cardsGrid.classList.remove('hidden');

        items.forEach((item, index) => {
            const cardEl = createCardElement(item, index);
            cardsGrid.appendChild(cardEl);
        });
    }

    function createCardElement(item, index) {
        const card = document.createElement('article');
        card.className = 'card';
        
        const typeClass = item.type.toLowerCase();
        const safeContent = item.content;

        card.innerHTML = `
            <div class="card-header">
                <span class="badge ${typeClass}">${item.type}</span>
                <span class="date-text">${item.date}</span>
            </div>
            <div class="card-body">
                ${safeContent}
            </div>
            <div class="card-footer">
                ${item.link ? `
                    <a href="${item.link}" target="_blank" class="btn-text-link" rel="noopener noreferrer">
                        <span>Official Docs</span>
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                            <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6M15 3h6v6M10 14L21 3"/>
                        </svg>
                    </a>
                ` : '<span></span>'}
                <button class="btn-share" aria-label="Share this update" title="Generate Share Text">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/>
                        <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>
                    </svg>
                </button>
            </div>
        `;

        // Attach listener for the share button
        const shareBtn = card.querySelector('.btn-share');
        shareBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            openShareModal(item);
        });

        return card;
    }

    // ==========================================================================
    // SHARE MODAL & TWITTER GENERATOR
    // ==========================================================================
    function openShareModal(item) {
        // Setup classes and badges
        previewBadge.className = `preview-badge ${item.type.toLowerCase()}`;
        previewBadge.textContent = item.type;
        previewDate.textContent = item.date;
        
        const plainTextContent = stripHTML(item.content);
        previewContent.textContent = plainTextContent;

        // Auto-generate Twitter/X post text
        // Keep descriptions reasonably short to fit X limit
        let truncatedContent = plainTextContent;
        const maxTextLen = 150;
        if (truncatedContent.length > maxTextLen) {
            truncatedContent = truncatedContent.substring(0, maxTextLen).trim() + '...';
        }

        const tag = item.type === 'Feature' ? '#Feature' : (item.type === 'Issue' ? '#Issue' : '#BigQuery');
        const shareMessage = `📢 BigQuery Update (${item.date})\n\n[${item.type}] ${truncatedContent}\n\nRead more: ${item.link || 'https://cloud.google.com/bigquery'}\n\n#GoogleCloud ${tag}`;
        
        shareTextarea.value = shareMessage;
        
        // Show modal and update states
        shareModal.classList.remove('hidden');
        document.body.style.overflow = 'hidden'; // Lock screen scroll
        updateCharCount();
    }

    function closeShareModal() {
        shareModal.classList.add('hidden');
        document.body.style.overflow = ''; // Unlock screen scroll
    }

    function updateCharCount() {
        const textLen = shareTextarea.value.length;
        charCounter.textContent = `${textLen} / 280`;

        if (textLen > 280) {
            charCounter.style.color = '#ef4444';
            charWarning.classList.remove('hidden');
            postXBtn.classList.add('disabled');
        } else {
            charCounter.style.color = '';
            charWarning.classList.add('hidden');
            postXBtn.classList.remove('disabled');
        }
    }

    async function copyShareText() {
        try {
            await navigator.clipboard.writeText(shareTextarea.value);
            showToast('Text copied to clipboard!');
        } catch (error) {
            console.error('Failed to copy to clipboard:', error);
            showToast('Could not auto-copy. Please select and copy manually.');
        }
    }

    function handlePostXClick(e) {
        const text = shareTextarea.value;
        if (text.length > 280) {
            // Prevent opening X if over character limit
            e.preventDefault();
            showToast('Please shorten your post to under 280 characters.');
            return;
        }

        postXBtn.href = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`;
    }

    // ==========================================================================
    // UTILITIES & HELPER FUNCTIONS
    // ==========================================================================
    // Helper to strip HTML tags for plain text formatting
    function stripHTML(htmlString) {
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = htmlString;
        // Clean up internal links or codes slightly before returning text
        return tempDiv.textContent || tempDiv.innerText || '';
    }

    // Show a temporary toast message
    function showToast(message) {
        const toast = document.createElement('div');
        toast.className = 'toast';
        toast.textContent = message;
        
        toastContainer.appendChild(toast);

        // Slide out and remove toast after 3 seconds
        setTimeout(() => {
            toast.classList.add('fade-out');
            toast.addEventListener('animationend', () => {
                toast.remove();
            });
        }, 3000);
    }

    // Initialize application logic
    init();
});
