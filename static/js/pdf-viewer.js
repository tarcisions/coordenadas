class PDFViewer {
    constructor(options) {
        this.documentId = options.documentId;
        this.totalPages = options.totalPages;
        this.originalWidth = options.originalWidth;
        this.originalHeight = options.originalHeight;
        
        this.currentPage = 1;
        this.zoomLevel = 1;
        this.currentPageData = null;
        this.coordinates = [];
        this.pendingCoordinate = null;
        
        // Area selection variables
        this.isSelecting = false;
        this.selectionStart = null;
        this.selectionEnd = null;
        this.selectionRect = null;
        
        // DOM elements
        this.canvas = document.getElementById('pdf-canvas');
        this.container = document.getElementById('pdf-container');
        this.ctx = this.canvas.getContext('2d');
        
        // Bind methods
        this.handleCanvasClick = this.handleCanvasClick.bind(this);
        this.handleMouseMove = this.handleMouseMove.bind(this);
        this.handleMouseDown = this.handleMouseDown.bind(this);
        this.handleMouseUp = this.handleMouseUp.bind(this);
    }
    
    async init() {
        this.setupEventListeners();
        await this.loadPage(1);
        await this.loadCoordinates();
    }
    
    setupEventListeners() {
        // Canvas events
        this.canvas.addEventListener('click', this.handleCanvasClick);
        this.canvas.addEventListener('mousemove', this.handleMouseMove);
        this.canvas.addEventListener('mousedown', this.handleMouseDown);
        this.canvas.addEventListener('mouseup', this.handleMouseUp);
        
        // Page navigation
        document.getElementById('prev-page').addEventListener('click', () => {
            if (this.currentPage > 1) {
                this.loadPage(this.currentPage - 1);
            }
        });
        
        document.getElementById('next-page').addEventListener('click', () => {
            if (this.currentPage < this.totalPages) {
                this.loadPage(this.currentPage + 1);
            }
        });
        
        document.getElementById('current-page').addEventListener('change', (e) => {
            const page = parseInt(e.target.value);
            if (page >= 1 && page <= this.totalPages) {
                this.loadPage(page);
            } else {
                e.target.value = this.currentPage;
            }
        });
        
        // Zoom controls
        document.getElementById('zoom-slider').addEventListener('input', (e) => {
            this.setZoom(parseFloat(e.target.value));
        });
        
        document.getElementById('zoom-in').addEventListener('click', () => {
            const newZoom = Math.min(3, this.zoomLevel + 0.25);
            this.setZoom(newZoom);
        });
        
        document.getElementById('zoom-out').addEventListener('click', () => {
            const newZoom = Math.max(0.25, this.zoomLevel - 0.25);
            this.setZoom(newZoom);
        });
        
        // Modal events
        document.getElementById('save-coordinate').addEventListener('click', () => {
            this.saveCurrentCoordinate();
        });
        
        // Clear coordinates
        document.getElementById('clear-coordinates').addEventListener('click', () => {
            if (confirm('Tem certeza que deseja limpar todas as coordenadas desta página?')) {
                this.clearAllCoordinates();
            }
        });
    }
    
    async loadPage(pageNumber) {
        try {
            this.showLoading(true);
            
            const response = await fetch(`/api/pdf/${this.documentId}/page/${pageNumber}`);
            const data = await response.json();
            
            if (data.success) {
                this.currentPage = pageNumber;
                this.currentPageData = data;
                
                // Update page input
                document.getElementById('current-page').value = pageNumber;
                
                // Update calibration info
                document.getElementById('scale-factor').textContent = data.scale_factor.toFixed(2);
                document.getElementById('dpi-info').textContent = data.dpi;
                
                // Load and display image
                await this.displayPDFPage(data.image_url, data.image_width, data.image_height);
                
                // Load coordinates for this page
                await this.loadCoordinates();
                
            } else {
                console.error('Erro ao carregar página:', data.error);
                alert('Erro ao carregar página do PDF');
            }
        } catch (error) {
            console.error('Erro ao carregar página:', error);
            alert('Erro ao carregar página do PDF');
        } finally {
            this.showLoading(false);
        }
    }
    
    async displayPDFPage(imageUrl, imageWidth, imageHeight) {
        return new Promise((resolve) => {
            const img = new Image();
            img.onload = () => {
                // Calculate display dimensions with zoom
                const displayWidth = imageWidth * this.zoomLevel;
                const displayHeight = imageHeight * this.zoomLevel;
                
                // Set canvas size
                this.canvas.width = displayWidth;
                this.canvas.height = displayHeight;
                
                // Clear and draw
                this.ctx.clearRect(0, 0, displayWidth, displayHeight);
                this.ctx.drawImage(img, 0, 0, displayWidth, displayHeight);
                
                // Update container size
                this.container.style.width = displayWidth + 'px';
                this.container.style.height = displayHeight + 'px';
                
                resolve();
            };
            img.src = imageUrl;
        });
    }
    
    setZoom(level) {
        this.zoomLevel = level;
        document.getElementById('zoom-slider').value = level;
        document.getElementById('zoom-display').textContent = Math.round(level * 100) + '%';
        
        if (this.currentPageData) {
            this.displayPDFPage(
                this.currentPageData.image_url,
                this.currentPageData.image_width,
                this.currentPageData.image_height
            ).then(() => {
                this.updateCoordinateMarkers();
            });
        }
    }
    
    handleMouseDown(event) {
        if (!this.currentPageData) return;
        
        const rect = this.canvas.getBoundingClientRect();
        const screenX = event.clientX - rect.left;
        const screenY = event.clientY - rect.top;
        
        this.isSelecting = true;
        this.selectionStart = { x: screenX, y: screenY };
        this.selectionEnd = { x: screenX, y: screenY };
        
        // Prevent default behavior
        event.preventDefault();
    }
    
    handleMouseUp(event) {
        if (!this.currentPageData || !this.isSelecting) return;
        
        const rect = this.canvas.getBoundingClientRect();
        const screenX = event.clientX - rect.left;
        const screenY = event.clientY - rect.top;
        
        this.selectionEnd = { x: screenX, y: screenY };
        this.isSelecting = false;
        
        // Check if it's a click (very small movement) or drag
        const deltaX = Math.abs(this.selectionEnd.x - this.selectionStart.x);
        const deltaY = Math.abs(this.selectionEnd.y - this.selectionStart.y);
        
        if (deltaX < 5 && deltaY < 5) {
            // Single click - capture point
            this.handleSinglePointCapture(screenX, screenY);
        } else {
            // Area selection - capture rectangle
            this.handleAreaCapture();
        }
        
        // Clear selection
        this.clearSelection();
    }
    
    handleCanvasClick(event) {
        // This is now handled by mousedown/mouseup for better control
        // Kept for compatibility but functionality moved to mouseup
    }
    
    handleSinglePointCapture(screenX, screenY) {
        // Convert screen coordinates to PDF coordinates
        const pdfCoords = this.screenToPDFCoordinates(screenX, screenY);
        
        // Store pending coordinate
        this.pendingCoordinate = {
            screen_x: screenX,
            screen_y: screenY,
            x: pdfCoords.x,
            y: pdfCoords.y,
            scale_factor: this.currentPageData.scale_factor * this.zoomLevel,
            type: 'point'
        };
        
        // Show modal for description
        document.getElementById('modal-coordinates').textContent = 
            `Ponto: X: ${pdfCoords.x.toFixed(2)}, Y: ${pdfCoords.y.toFixed(2)}`;
        document.getElementById('coordinate-description').value = '';
        
        const modal = new bootstrap.Modal(document.getElementById('coordinateModal'));
        modal.show();
    }
    
    handleAreaCapture() {
        // Calculate rectangle bounds
        const minX = Math.min(this.selectionStart.x, this.selectionEnd.x);
        const maxX = Math.max(this.selectionStart.x, this.selectionEnd.x);
        const minY = Math.min(this.selectionStart.y, this.selectionEnd.y);
        const maxY = Math.max(this.selectionStart.y, this.selectionEnd.y);
        
        // Convert to PDF coordinates
        const topLeft = this.screenToPDFCoordinates(minX, minY);
        const bottomRight = this.screenToPDFCoordinates(maxX, maxY);
        
        const width = Math.abs(bottomRight.x - topLeft.x);
        const height = Math.abs(bottomRight.y - topLeft.y);
        
        // Store pending area
        this.pendingCoordinate = {
            screen_x: minX,
            screen_y: minY,
            screen_width: maxX - minX,
            screen_height: maxY - minY,
            x: topLeft.x,
            y: topLeft.y,
            width: width,
            height: height,
            scale_factor: this.currentPageData.scale_factor * this.zoomLevel,
            type: 'area'
        };
        
        // Show modal for description
        document.getElementById('modal-coordinates').textContent = 
            `Área: X: ${topLeft.x.toFixed(2)}, Y: ${topLeft.y.toFixed(2)}, Largura: ${width.toFixed(2)}, Altura: ${height.toFixed(2)}`;
        document.getElementById('coordinate-description').value = '';
        
        const modal = new bootstrap.Modal(document.getElementById('coordinateModal'));
        modal.show();
    }
    
    handleMouseMove(event) {
        if (!this.currentPageData) return;
        
        const rect = this.canvas.getBoundingClientRect();
        const screenX = event.clientX - rect.left;
        const screenY = event.clientY - rect.top;
        
        // Update real-time coordinate display
        document.getElementById('mouse-x').textContent = Math.round(screenX);
        document.getElementById('mouse-y').textContent = Math.round(screenY);
        
        const pdfCoords = this.screenToPDFCoordinates(screenX, screenY);
        document.getElementById('pdf-x').textContent = pdfCoords.x.toFixed(2);
        document.getElementById('pdf-y').textContent = pdfCoords.y.toFixed(2);
        
        // Handle area selection
        if (this.isSelecting) {
            this.selectionEnd = { x: screenX, y: screenY };
            this.drawSelection();
        }
    }
    
    drawSelection() {
        if (!this.selectionStart || !this.selectionEnd) return;
        
        // Redraw the PDF page
        if (this.currentPageData) {
            this.displayPDFPage(
                this.currentPageData.image_url,
                this.currentPageData.image_width,
                this.currentPageData.image_height
            ).then(() => {
                // Draw selection rectangle
                const minX = Math.min(this.selectionStart.x, this.selectionEnd.x);
                const maxX = Math.max(this.selectionStart.x, this.selectionEnd.x);
                const minY = Math.min(this.selectionStart.y, this.selectionEnd.y);
                const maxY = Math.max(this.selectionStart.y, this.selectionEnd.y);
                
                this.ctx.strokeStyle = 'rgba(255, 0, 0, 0.8)';
                this.ctx.fillStyle = 'rgba(255, 0, 0, 0.1)';
                this.ctx.lineWidth = 2;
                
                const width = maxX - minX;
                const height = maxY - minY;
                
                this.ctx.fillRect(minX, minY, width, height);
                this.ctx.strokeRect(minX, minY, width, height);
                
                // Redraw coordinate markers
                this.updateCoordinateMarkers();
            });
        }
    }
    
    clearSelection() {
        this.selectionStart = null;
        this.selectionEnd = null;
        this.selectionRect = null;
        
        // Redraw without selection
        if (this.currentPageData) {
            this.displayPDFPage(
                this.currentPageData.image_url,
                this.currentPageData.image_width,
                this.currentPageData.image_height
            ).then(() => {
                this.updateCoordinateMarkers();
            });
        }
    }
    
    screenToPDFCoordinates(screenX, screenY) {
        if (!this.currentPageData) return { x: 0, y: 0 };
        
        // Convert screen coordinates to image coordinates
        const imageX = screenX / this.zoomLevel;
        const imageY = screenY / this.zoomLevel;
        
        // Convert image coordinates to PDF coordinates
        const scaleFromImage = this.currentPageData.scale_factor;
        const pdfX = imageX / scaleFromImage;
        const pdfY = imageY / scaleFromImage;
        
        return { x: pdfX, y: pdfY };
    }
    
    pdfToScreenCoordinates(pdfX, pdfY) {
        if (!this.currentPageData) return { x: 0, y: 0 };
        
        // Convert PDF coordinates to image coordinates
        const scaleToImage = this.currentPageData.scale_factor;
        const imageX = pdfX * scaleToImage;
        const imageY = pdfY * scaleToImage;
        
        // Convert image coordinates to screen coordinates
        const screenX = imageX * this.zoomLevel;
        const screenY = imageY * this.zoomLevel;
        
        return { x: screenX, y: screenY };
    }
    
    async saveCurrentCoordinate() {
        if (!this.pendingCoordinate) return;
        
        try {
            const description = document.getElementById('coordinate-description').value;
            
            const coordinateData = {
                document_id: this.documentId,
                page_number: this.currentPage,
                x: this.pendingCoordinate.x,
                y: this.pendingCoordinate.y,
                screen_x: this.pendingCoordinate.screen_x,
                screen_y: this.pendingCoordinate.screen_y,
                scale_factor: this.pendingCoordinate.scale_factor,
                description: description,
                type: this.pendingCoordinate.type
            };
            
            // Se for uma área, incluir dimensões
            if (this.pendingCoordinate.type === 'area') {
                coordinateData.width = this.pendingCoordinate.width;
                coordinateData.height = this.pendingCoordinate.height;
            }
            
            const response = await fetch('/api/coordinates', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(coordinateData)
            });
            
            const result = await response.json();
            
            if (result.success) {
                // Close modal
                const modal = bootstrap.Modal.getInstance(document.getElementById('coordinateModal'));
                modal.hide();
                
                // Reload coordinates
                await this.loadCoordinates();
                
                this.pendingCoordinate = null;
            } else {
                alert('Erro ao salvar coordenada: ' + result.error);
            }
        } catch (error) {
            console.error('Erro ao salvar coordenada:', error);
            alert('Erro ao salvar coordenada');
        }
    }
    
    async loadCoordinates() {
        try {
            const response = await fetch(`/api/coordinates/${this.documentId}/${this.currentPage}`);
            const coordinates = await response.json();
            
            this.coordinates = coordinates;
            this.updateCoordinatesList();
            this.updateCoordinateMarkers();
            
        } catch (error) {
            console.error('Erro ao carregar coordenadas:', error);
        }
    }
    
    updateCoordinatesList() {
        const listContainer = document.getElementById('coordinates-list');
        
        if (this.coordinates.length === 0) {
            listContainer.innerHTML = `
                <div class="text-center text-muted py-4">
                    <i class="fas fa-mouse-pointer" style="font-size: 2rem;"></i>
                    <p class="mt-2">Clique no PDF para capturar coordenadas</p>
                </div>
            `;
            return;
        }
        
        const coordinatesHTML = this.coordinates.map((coord, index) => {
            const isArea = coord.coordinate_type === 'area';
            const title = isArea ? `Área ${index + 1}` : `Ponto ${index + 1}`;
            const icon = isArea ? 'fas fa-square' : 'fas fa-crosshairs';
            const coords = isArea ? 
                `X: ${coord.x.toFixed(2)}, Y: ${coord.y.toFixed(2)}, L: ${coord.width.toFixed(2)}, A: ${coord.height.toFixed(2)}` :
                `X: ${coord.x.toFixed(2)}, Y: ${coord.y.toFixed(2)}`;
            
            return `
                <div class="coordinate-item border rounded p-3 mb-2" data-coord-id="${coord.id}">
                    <div class="d-flex justify-content-between align-items-start">
                        <div class="flex-grow-1">
                            <div class="fw-bold ${isArea ? 'text-success' : 'text-primary'}">
                                ${title}
                            </div>
                            <div class="small text-muted mb-1">
                                <i class="${icon} me-1"></i>
                                ${coords}
                            </div>
                            ${coord.description ? `
                                <div class="small text-info">
                                    <i class="fas fa-comment me-1"></i>
                                    ${coord.description}
                                </div>
                            ` : ''}
                            <div class="small text-muted">
                                <i class="fas fa-clock me-1"></i>
                                ${new Date(coord.timestamp).toLocaleString('pt-BR')}
                            </div>
                        </div>
                        <button class="btn btn-outline-danger btn-sm" onclick="pdfViewer.deleteCoordinate(${coord.id})">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>
            `;
        }).join('');
        
        listContainer.innerHTML = coordinatesHTML;
    }
    
    updateCoordinateMarkers() {
        // Remove existing markers
        const existingMarkers = this.container.querySelectorAll('.coordinate-marker, .area-marker');
        existingMarkers.forEach(marker => marker.remove());
        
        // Add new markers
        this.coordinates.forEach((coord, index) => {
            if (coord.coordinate_type === 'area') {
                // Create area marker
                const topLeft = this.pdfToScreenCoordinates(coord.x, coord.y);
                const bottomRight = this.pdfToScreenCoordinates(coord.x + coord.width, coord.y + coord.height);
                
                const marker = document.createElement('div');
                marker.className = 'area-marker';
                marker.style.position = 'absolute';
                marker.style.left = topLeft.x + 'px';
                marker.style.top = topLeft.y + 'px';
                marker.style.width = (bottomRight.x - topLeft.x) + 'px';
                marker.style.height = (bottomRight.y - topLeft.y) + 'px';
                marker.style.border = '2px solid rgba(0, 255, 0, 0.8)';
                marker.style.backgroundColor = 'rgba(0, 255, 0, 0.1)';
                marker.style.pointerEvents = 'none';
                marker.style.zIndex = '5';
                marker.title = `Área ${index + 1}: (${coord.x.toFixed(2)}, ${coord.y.toFixed(2)}) ${coord.width.toFixed(2)}x${coord.height.toFixed(2)}`;
                
                this.container.appendChild(marker);
            } else {
                // Create point marker
                const screenCoords = this.pdfToScreenCoordinates(coord.x, coord.y);
                
                const marker = document.createElement('div');
                marker.className = 'coordinate-marker';
                marker.style.left = screenCoords.x + 'px';
                marker.style.top = screenCoords.y + 'px';
                marker.title = `Ponto ${index + 1}: (${coord.x.toFixed(2)}, ${coord.y.toFixed(2)})`;
                
                this.container.appendChild(marker);
            }
        });
    }
    
    async deleteCoordinate(coordinateId) {
        if (!confirm('Tem certeza que deseja excluir esta coordenada?')) return;
        
        try {
            const response = await fetch(`/api/coordinates/${coordinateId}`, {
                method: 'DELETE'
            });
            
            const result = await response.json();
            
            if (result.success) {
                await this.loadCoordinates();
            } else {
                alert('Erro ao excluir coordenada: ' + result.error);
            }
        } catch (error) {
            console.error('Erro ao excluir coordenada:', error);
            alert('Erro ao excluir coordenada');
        }
    }
    
    async clearAllCoordinates() {
        try {
            const deletePromises = this.coordinates.map(coord => 
                fetch(`/api/coordinates/${coord.id}`, { method: 'DELETE' })
            );
            
            await Promise.all(deletePromises);
            await this.loadCoordinates();
            
        } catch (error) {
            console.error('Erro ao limpar coordenadas:', error);
            alert('Erro ao limpar coordenadas');
        }
    }
    
    showLoading(show) {
        const canvas = this.canvas;
        if (show) {
            canvas.classList.add('loading');
        } else {
            canvas.classList.remove('loading');
        }
    }
}

// Make PDFViewer globally available
window.PDFViewer = PDFViewer;
