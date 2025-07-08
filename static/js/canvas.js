// Canvas Management and Visualization
class CanvasManager {
    constructor() {
        this.canvas = $('#workflow-canvas');
        this.svg = $('#connections-svg');
        this.nodesContainer = $('#nodes-container');
        this.isDragging = false;
        this.dragStart = { x: 0, y: 0 };
        this.canvasOffset = { x: 0, y: 0 };
        this.scale = 1;
        this.minScale = 0.3;
        this.maxScale = 3;
        
        this.init();
    }
    
    init() {
        this.setupCanvasInteractions();
        this.setupZoomControls();
        this.setupKeyboardShortcuts();
        this.updateCanvasSize();
        
        // Listen for window resize
        $(window).on('resize', () => {
            this.updateCanvasSize();
        });
    }
    
    setupCanvasInteractions() {
        // Pan with middle mouse button or right click
        this.canvas.on('mousedown', (e) => {
            if (e.button === 1 || (e.button === 2 && e.ctrlKey)) { // Middle button or Ctrl+Right click
                e.preventDefault();
                this.startPanning(e);
            }
        });
        
        // Prevent context menu on canvas when Ctrl is held
        this.canvas.on('contextmenu', (e) => {
            if (e.ctrlKey) {
                e.preventDefault();
            }
        });
        
        // Mouse wheel zoom
        this.canvas.on('wheel', (e) => {
            e.preventDefault();
            const delta = e.originalEvent.deltaY;
            const zoomFactor = delta > 0 ? 0.9 : 1.1;
            this.zoomAtPoint(e.offsetX, e.offsetY, zoomFactor);
        });
        
        // Double click to center and fit
        this.canvas.on('dblclick', (e) => {
            if (e.target === this.canvas[0]) {
                this.fitToContent();
            }
        });
    }
    
    startPanning(e) {
        this.isDragging = true;
        this.dragStart = { x: e.clientX, y: e.clientY };
        this.canvas.css('cursor', 'grabbing');
        
        $(document).on('mousemove.panning', (e) => {
            if (this.isDragging) {
                this.updatePanning(e);
            }
        });
        
        $(document).on('mouseup.panning', () => {
            this.stopPanning();
        });
    }
    
    updatePanning(e) {
        const deltaX = e.clientX - this.dragStart.x;
        const deltaY = e.clientY - this.dragStart.y;
        
        this.canvasOffset.x += deltaX;
        this.canvasOffset.y += deltaY;
        
        this.applyTransform();
        
        this.dragStart = { x: e.clientX, y: e.clientY };
    }
    
    stopPanning() {
        this.isDragging = false;
        this.canvas.css('cursor', '');
        $(document).off('mousemove.panning mouseup.panning');
    }
    
    setupZoomControls() {
        $('#zoomIn').on('click', () => {
            this.zoomAtCenter(1.2);
        });
        
        $('#zoomOut').on('click', () => {
            this.zoomAtCenter(0.8);
        });
        
        $('#resetZoom').on('click', () => {
            this.resetView();
        });
    }
    
    setupKeyboardShortcuts() {
        $(document).on('keydown', (e) => {
            if (e.target.tagName.toLowerCase() === 'input' || 
                e.target.tagName.toLowerCase() === 'textarea') {
                return; // Don't interfere with form inputs
            }
            
            // Zoom shortcuts
            if (e.ctrlKey || e.metaKey) {
                switch(e.key) {
                    case '+':
                    case '=':
                        e.preventDefault();
                        this.zoomAtCenter(1.2);
                        break;
                    case '-':
                        e.preventDefault();
                        this.zoomAtCenter(0.8);
                        break;
                    case '0':
                        e.preventDefault();
                        this.resetView();
                        break;
                    case '1':
                        e.preventDefault();
                        this.fitToContent();
                        break;
                }
            }
            
            // Arrow keys for panning
            if (!e.ctrlKey && !e.metaKey) {
                let panDistance = 50;
                switch(e.key) {
                    case 'ArrowUp':
                        e.preventDefault();
                        this.pan(0, panDistance);
                        break;
                    case 'ArrowDown':
                        e.preventDefault();
                        this.pan(0, -panDistance);
                        break;
                    case 'ArrowLeft':
                        e.preventDefault();
                        this.pan(panDistance, 0);
                        break;
                    case 'ArrowRight':
                        e.preventDefault();
                        this.pan(-panDistance, 0);
                        break;
                }
            }
        });
    }
    
    zoomAtPoint(x, y, factor) {
        const newScale = Math.max(this.minScale, Math.min(this.maxScale, this.scale * factor));
        
        if (newScale !== this.scale) {
            // Adjust offset to zoom towards the point
            const scaleRatio = newScale / this.scale;
            this.canvasOffset.x = x - (x - this.canvasOffset.x) * scaleRatio;
            this.canvasOffset.y = y - (y - this.canvasOffset.y) * scaleRatio;
            
            this.scale = newScale;
            this.applyTransform();
            this.updateZoomIndicator();
        }
    }
    
    zoomAtCenter(factor) {
        const centerX = this.canvas.width() / 2;
        const centerY = this.canvas.height() / 2;
        this.zoomAtPoint(centerX, centerY, factor);
    }
    
    pan(deltaX, deltaY) {
        this.canvasOffset.x += deltaX;
        this.canvasOffset.y += deltaY;
        this.applyTransform();
    }
    
    resetView() {
        this.scale = 1;
        this.canvasOffset = { x: 0, y: 0 };
        this.applyTransform();
        this.updateZoomIndicator();
    }
    
    fitToContent() {
        const nodes = $('.workflow-node');
        if (nodes.length === 0) {
            this.resetView();
            return;
        }
        
        // Calculate bounding box of all nodes
        let minX = Infinity, minY = Infinity;
        let maxX = -Infinity, maxY = -Infinity;
        
        nodes.each((index, node) => {
            const $node = $(node);
            const pos = $node.position();
            const width = $node.outerWidth();
            const height = $node.outerHeight();
            
            minX = Math.min(minX, pos.left);
            minY = Math.min(minY, pos.top);
            maxX = Math.max(maxX, pos.left + width);
            maxY = Math.max(maxY, pos.top + height);
        });
        
        // Add padding
        const padding = 50;
        minX -= padding;
        minY -= padding;
        maxX += padding;
        maxY += padding;
        
        // Calculate scale to fit content
        const contentWidth = maxX - minX;
        const contentHeight = maxY - minY;
        const canvasWidth = this.canvas.width();
        const canvasHeight = this.canvas.height();
        
        const scaleX = canvasWidth / contentWidth;
        const scaleY = canvasHeight / contentHeight;
        this.scale = Math.min(scaleX, scaleY, this.maxScale);
        
        // Center the content
        const scaledContentWidth = contentWidth * this.scale;
        const scaledContentHeight = contentHeight * this.scale;
        
        this.canvasOffset.x = (canvasWidth - scaledContentWidth) / 2 - minX * this.scale;
        this.canvasOffset.y = (canvasHeight - scaledContentHeight) / 2 - minY * this.scale;
        
        this.applyTransform();
        this.updateZoomIndicator();
    }
    
    applyTransform() {
        const transform = `translate(${this.canvasOffset.x}px, ${this.canvasOffset.y}px) scale(${this.scale})`;
        this.nodesContainer.css('transform', transform);
        this.svg.css('transform', transform);
        
        // Update connection positions with a slight delay to ensure proper rendering
        if (window.workflowManager) {
            setTimeout(() => {
                window.workflowManager.updateConnections();
            }, 10);
        }
    }
    
    updateZoomIndicator() {
        const percentage = Math.round(this.scale * 100);
        
        // Show zoom percentage temporarily
        let indicator = $('#zoom-indicator');
        if (indicator.length === 0) {
            indicator = $(`
                <div id="zoom-indicator" class="position-fixed bg-dark text-white px-2 py-1 rounded" 
                     style="bottom: 20px; right: 20px; z-index: 1000; font-size: 0.8rem;">
                </div>
            `);
            $('body').append(indicator);
        }
        
        indicator.text(`${percentage}%`).show();
        
        clearTimeout(this.zoomIndicatorTimeout);
        this.zoomIndicatorTimeout = setTimeout(() => {
            indicator.fadeOut();
        }, 1500);
    }
    
    updateCanvasSize() {
        const canvasWidth = this.canvas.width();
        const canvasHeight = this.canvas.height();
        
        this.svg.attr({
            width: canvasWidth,
            height: canvasHeight
        });
    }
    
    // Convert screen coordinates to canvas coordinates
    screenToCanvas(screenX, screenY) {
        const canvasRect = this.canvas[0].getBoundingClientRect();
        const canvasX = (screenX - canvasRect.left - this.canvasOffset.x) / this.scale;
        const canvasY = (screenY - canvasRect.top - this.canvasOffset.y) / this.scale;
        
        return { x: canvasX, y: canvasY };
    }
    
    // Convert canvas coordinates to screen coordinates
    canvasToScreen(canvasX, canvasY) {
        const canvasRect = this.canvas[0].getBoundingClientRect();
        const screenX = canvasX * this.scale + this.canvasOffset.x + canvasRect.left;
        const screenY = canvasY * this.scale + this.canvasOffset.y + canvasRect.top;
        
        return { x: screenX, y: screenY };
    }
    
    // Get the current viewport bounds in canvas coordinates
    getViewportBounds() {
        const canvasWidth = this.canvas.width();
        const canvasHeight = this.canvas.height();
        
        const topLeft = this.screenToCanvas(0, 0);
        const bottomRight = this.screenToCanvas(canvasWidth, canvasHeight);
        
        return {
            left: topLeft.x,
            top: topLeft.y,
            right: bottomRight.x,
            bottom: bottomRight.y,
            width: bottomRight.x - topLeft.x,
            height: bottomRight.y - topLeft.y
        };
    }
    
    // Check if a point is visible in the current viewport
    isPointVisible(x, y) {
        const bounds = this.getViewportBounds();
        return x >= bounds.left && x <= bounds.right && 
               y >= bounds.top && y <= bounds.bottom;
    }
    
    // Animate to a specific position and scale
    animateTo(targetOffset, targetScale, duration = 500) {
        const startOffset = { ...this.canvasOffset };
        const startScale = this.scale;
        const startTime = Date.now();
        
        const animate = () => {
            const elapsed = Date.now() - startTime;
            const progress = Math.min(elapsed / duration, 1);
            
            // Easing function (ease-out)
            const eased = 1 - Math.pow(1 - progress, 3);
            
            // Interpolate values
            this.canvasOffset.x = startOffset.x + (targetOffset.x - startOffset.x) * eased;
            this.canvasOffset.y = startOffset.y + (targetOffset.y - startOffset.y) * eased;
            this.scale = startScale + (targetScale - startScale) * eased;
            
            this.applyTransform();
            this.updateZoomIndicator();
            
            if (progress < 1) {
                requestAnimationFrame(animate);
            }
        };
        
        animate();
    }
    
    // Focus on a specific node
    focusOnNode(nodeId) {
        const nodeElement = $(`.workflow-node[data-node-id="${nodeId}"]`);
        if (nodeElement.length === 0) return;
        
        const nodePos = nodeElement.position();
        const nodeWidth = nodeElement.outerWidth();
        const nodeHeight = nodeElement.outerHeight();
        
        // Calculate position to center the node
        const canvasWidth = this.canvas.width();
        const canvasHeight = this.canvas.height();
        
        const targetScale = Math.min(1.5, this.maxScale); // Zoom in a bit
        const targetOffset = {
            x: (canvasWidth / 2) - (nodePos.left + nodeWidth / 2) * targetScale,
            y: (canvasHeight / 2) - (nodePos.top + nodeHeight / 2) * targetScale
        };
        
        this.animateTo(targetOffset, targetScale);
    }
}

// CanvasManager class - initialized externally
