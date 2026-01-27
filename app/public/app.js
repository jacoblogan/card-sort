class DataViewer {
    constructor() {
        this.currentPage = 1;
        this.pageSize = 50;
        this.sortBy = '';
        this.sortOrder = 'asc';
        this.search = '';
        this.filters = {
            set: '',
            condition: '',
            priceMin: null,
            priceMax: null
        };
        this.totalPages = 1;
        this.totalItems = 0;
        this.quantities = {}; // Store quantities by TCGplayer Id
        
        this.init();
    }

    async init() {
        await this.loadFilters();
        this.setupEventListeners();
        await this.loadData();
    }

    async loadFilters() {
        try {
            const response = await fetch('/api/filters');
            const data = await response.json();
            
            const setSelect = document.getElementById('filterSet');
            const conditionSelect = document.getElementById('filterCondition');
            
            data.sets.forEach(set => {
                const option = document.createElement('option');
                option.value = set;
                option.textContent = set;
                setSelect.appendChild(option);
            });
            
            data.conditions.forEach(condition => {
                const option = document.createElement('option');
                option.value = condition;
                option.textContent = condition;
                conditionSelect.appendChild(option);
            });
        } catch (error) {
            console.error('Error loading filters:', error);
        }
    }

    setupEventListeners() {
        // Search input
        const searchInput = document.getElementById('searchInput');
        let searchTimeout;
        searchInput.addEventListener('input', (e) => {
            clearTimeout(searchTimeout);
            searchTimeout = setTimeout(() => {
                this.search = e.target.value;
                this.currentPage = 1;
                this.loadData();
            }, 300);
        });

        // Filter inputs
        document.getElementById('filterSet').addEventListener('change', (e) => {
            this.filters.set = e.target.value;
            this.currentPage = 1;
            this.loadData();
        });

        document.getElementById('filterCondition').addEventListener('change', (e) => {
            this.filters.condition = e.target.value;
            this.currentPage = 1;
            this.loadData();
        });

        document.getElementById('filterPriceMin').addEventListener('input', (e) => {
            this.filters.priceMin = e.target.value ? parseFloat(e.target.value) : null;
            this.currentPage = 1;
            this.loadData();
        });

        document.getElementById('filterPriceMax').addEventListener('input', (e) => {
            this.filters.priceMax = e.target.value ? parseFloat(e.target.value) : null;
            this.currentPage = 1;
            this.loadData();
        });

        // Clear filters button
        document.getElementById('clearFilters').addEventListener('click', () => {
            this.search = '';
            this.filters = {
                set: '',
                condition: '',
                priceMin: null,
                priceMax: null
            };
            this.currentPage = 1;
            this.sortBy = '';
            this.sortOrder = 'asc';
            // Note: We don't clear quantities here as user might want to keep them
            
            document.getElementById('searchInput').value = '';
            document.getElementById('filterSet').value = '';
            document.getElementById('filterCondition').value = '';
            document.getElementById('filterPriceMin').value = '';
            document.getElementById('filterPriceMax').value = '';
            
            this.updateSortIndicators();
            this.loadData();
        });

        // Sortable columns
        document.querySelectorAll('.sortable').forEach(th => {
            th.addEventListener('click', () => {
                const column = th.getAttribute('data-sort');
                if (this.sortBy === column) {
                    this.sortOrder = this.sortOrder === 'asc' ? 'desc' : 'asc';
                } else {
                    this.sortBy = column;
                    this.sortOrder = 'asc';
                }
                this.updateSortIndicators();
                this.loadData();
            });
        });

        // Pagination buttons
        document.getElementById('prevPage').addEventListener('click', () => {
            if (this.currentPage > 1) {
                this.currentPage--;
                this.loadData();
            }
        });

        document.getElementById('nextPage').addEventListener('click', () => {
            if (this.currentPage < this.totalPages) {
                this.currentPage++;
                this.loadData();
            }
        });

        // Update Inventory button
        document.getElementById('updateInventory').addEventListener('click', () => {
            this.updateInventory();
        });
    }

    updateSortIndicators() {
        document.querySelectorAll('.sortable').forEach(th => {
            th.classList.remove('active', 'asc', 'desc');
            if (th.getAttribute('data-sort') === this.sortBy) {
                th.classList.add('active', this.sortOrder);
            }
        });
    }

    async loadData() {
        const tbody = document.getElementById('tableBody');
        // Save current quantities before clearing
        this.saveQuantities();
        tbody.innerHTML = '<tr><td colspan="5" class="loading">Loading data...</td></tr>';

        try {
            const params = new URLSearchParams({
                page: this.currentPage,
                pageSize: this.pageSize,
                search: this.search,
                sortBy: this.sortBy,
                sortOrder: this.sortOrder,
                filterSet: this.filters.set,
                filterCondition: this.filters.condition
            });

            if (this.filters.priceMin !== null) {
                params.append('filterPriceMin', this.filters.priceMin);
            }
            if (this.filters.priceMax !== null) {
                params.append('filterPriceMax', this.filters.priceMax);
            }

            const response = await fetch(`/api/data?${params}`);
            const result = await response.json();

            this.totalPages = result.pagination.totalPages;
            this.totalItems = result.pagination.total;

            this.renderTable(result.data);
            this.renderPagination();
        } catch (error) {
            console.error('Error loading data:', error);
            tbody.innerHTML = '<tr><td colspan="5" class="loading">Error loading data. Please try again.</td></tr>';
        }
    }

    saveQuantities() {
        // Save quantities from all visible inputs
        const inputs = document.querySelectorAll('.quantity-input');
        inputs.forEach(input => {
            const id = input.getAttribute('data-id');
            const value = parseInt(input.value) || 0;
            if (value > 0) {
                this.quantities[id] = value;
            } else {
                delete this.quantities[id];
            }
        });
    }

    renderTable(data) {
        const tbody = document.getElementById('tableBody');
        
        if (data.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" class="loading">No data found matching your criteria.</td></tr>';
            return;
        }

        tbody.innerHTML = data.map(row => {
            const id = row['TCGplayer Id'];
            const quantity = this.quantities[id] || '';
            return `
            <tr>
                <td>${this.escapeHtml(row['Set Name'])}</td>
                <td>${this.escapeHtml(row['Product Name'])}</td>
                <td>${this.escapeHtml(row['Condition'])}</td>
                <td>${this.formatPrice(row['TCG Market Price'])}</td>
                <td>
                    <input type="number" 
                           class="quantity-input" 
                           data-id="${id}" 
                           value="${quantity}" 
                           min="0" 
                           step="1"
                           placeholder="0" />
                </td>
            </tr>
        `;
        }).join('');

        // Add event listeners to quantity inputs to save on change
        tbody.querySelectorAll('.quantity-input').forEach(input => {
            input.addEventListener('change', () => {
                const id = input.getAttribute('data-id');
                const value = parseInt(input.value) || 0;
                if (value > 0) {
                    this.quantities[id] = value;
                } else {
                    delete this.quantities[id];
                }
            });
        });
    }

    async updateInventory() {
        // Save any pending quantities
        this.saveQuantities();

        // Filter out quantities that are 0 or less
        const validQuantities = {};
        Object.keys(this.quantities).forEach(id => {
            if (this.quantities[id] > 0) {
                validQuantities[id] = this.quantities[id];
            }
        });

        if (Object.keys(validQuantities).length === 0) {
            this.showStatus('No quantities entered. Please enter at least one quantity > 0.', 'error');
            return;
        }

        const button = document.getElementById('updateInventory');
        const originalText = button.textContent;
        button.disabled = true;
        button.textContent = 'Generating...';
        this.showStatus('Generating inventory CSV...', 'info');

        try {
            const response = await fetch('/api/generate-inventory', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ quantities: validQuantities })
            });

            const result = await response.json();

            if (response.ok) {
                this.showStatus(`Success! Generated ${result.filename} with ${result.rowsExported} rows.`, 'success');
            } else {
                this.showStatus(`Error: ${result.error}`, 'error');
            }
        } catch (error) {
            console.error('Error updating inventory:', error);
            this.showStatus('Error generating inventory CSV. Please try again.', 'error');
        } finally {
            button.disabled = false;
            button.textContent = originalText;
        }
    }

    showStatus(message, type) {
        const statusEl = document.getElementById('updateStatus');
        statusEl.textContent = message;
        statusEl.className = `update-status ${type}`;
        
        if (type === 'success' || type === 'error') {
            setTimeout(() => {
                statusEl.textContent = '';
                statusEl.className = 'update-status';
            }, 5000);
        }
    }

    renderPagination() {
        const info = document.getElementById('paginationInfo');
        const start = (this.currentPage - 1) * this.pageSize + 1;
        const end = Math.min(this.currentPage * this.pageSize, this.totalItems);
        info.textContent = `Showing ${start}-${end} of ${this.totalItems} items`;

        // Previous/Next buttons
        document.getElementById('prevPage').disabled = this.currentPage === 1;
        document.getElementById('nextPage').disabled = this.currentPage === this.totalPages;

        // Page numbers
        const pageNumbers = document.getElementById('pageNumbers');
        pageNumbers.innerHTML = '';

        const maxPagesToShow = 7;
        let startPage = Math.max(1, this.currentPage - Math.floor(maxPagesToShow / 2));
        let endPage = Math.min(this.totalPages, startPage + maxPagesToShow - 1);

        if (endPage - startPage < maxPagesToShow - 1) {
            startPage = Math.max(1, endPage - maxPagesToShow + 1);
        }

        if (startPage > 1) {
            const firstPage = document.createElement('span');
            firstPage.className = 'page-number';
            firstPage.textContent = '1';
            firstPage.addEventListener('click', () => {
                this.currentPage = 1;
                this.loadData();
            });
            pageNumbers.appendChild(firstPage);
            if (startPage > 2) {
                const ellipsis = document.createElement('span');
                ellipsis.textContent = '...';
                ellipsis.style.padding = '8px 4px';
                pageNumbers.appendChild(ellipsis);
            }
        }

        for (let i = startPage; i <= endPage; i++) {
            const pageNum = document.createElement('span');
            pageNum.className = 'page-number';
            if (i === this.currentPage) {
                pageNum.classList.add('active');
            }
            pageNum.textContent = i;
            pageNum.addEventListener('click', () => {
                this.currentPage = i;
                this.loadData();
            });
            pageNumbers.appendChild(pageNum);
        }

        if (endPage < this.totalPages) {
            if (endPage < this.totalPages - 1) {
                const ellipsis = document.createElement('span');
                ellipsis.textContent = '...';
                ellipsis.style.padding = '8px 4px';
                pageNumbers.appendChild(ellipsis);
            }
            const lastPage = document.createElement('span');
            lastPage.className = 'page-number';
            lastPage.textContent = this.totalPages;
            lastPage.addEventListener('click', () => {
                this.currentPage = this.totalPages;
                this.loadData();
            });
            pageNumbers.appendChild(lastPage);
        }
    }

    formatPrice(price) {
        if (!price || price === '') return '-';
        const numPrice = parseFloat(price);
        if (isNaN(numPrice)) return price;
        return '$' + numPrice.toFixed(2);
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

// Initialize the app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    new DataViewer();
});
