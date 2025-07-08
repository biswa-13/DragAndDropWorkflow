// Panel Management System
class PanelManager {
    constructor() {
        this.isDragging = false;
        this.currentPanel = null;
        this.startX = 0;
        this.startWidth = 0;
        
        this.init();
    }
    
    init() {
        this.setupResizeHandles();
        this.setupDockUndock();
        this.setupSearch();
        this.setupCanvasControls();
    }
    
    setupResizeHandles() {
        // Add resize handles to canvas panel
        $('.resize-handle').on('mousedown', (e) => {
            this.startResize(e);
        });
        
        $(document).on('mousemove', (e) => {
            if (this.isDragging) {
                this.doResize(e);
            }
        });
        
        $(document).on('mouseup', () => {
            this.stopResize();
        });
    }
    
    startResize(e) {
        this.isDragging = true;
        this.currentPanel = $(e.target).hasClass('resize-handle-left') ? 'left' : 'right';
        this.startX = e.clientX;
        
        const canvasPanel = $('#canvas-panel');
        this.startWidth = canvasPanel.width();
        
        $('body').css('cursor', 'col-resize');
        e.preventDefault();
    }
    
    doResize(e) {
        if (!this.isDragging) return;
        
        const deltaX = e.clientX - this.startX;
        const leftPanel = $('#left-panel');
        const container = $('.container-fluid');
        const containerWidth = container.width();
        
        // Calculate new left panel width
        const currentLeftWidth = leftPanel.outerWidth();
        const newLeftWidth = Math.max(280, Math.min(500, currentLeftWidth + deltaX));
        
        // Calculate percentages for Bootstrap columns
        const leftPercent = (newLeftWidth / containerWidth) * 100;
        const canvasPercent = 100 - leftPercent;
        
        // Update Bootstrap column classes dynamically
        leftPanel.removeClass().addClass(`col panel left-panel`).css('flex', `0 0 ${leftPercent}%`);
        $('#canvas-panel').removeClass().addClass(`col canvas-panel`).css('flex', `0 0 ${canvasPercent}%`);
        
        // Save layout state
        if (window.workflowManager) {
            window.workflowManager.saveLayoutToServer();
        }
        
        // Update canvas size
        setTimeout(() => {
            if (window.canvasManager) {
                window.canvasManager.updateCanvasSize();
                window.canvasManager.applyTransform();
            }
        }, 10);
    }
    
    stopResize() {
        this.isDragging = false;
        this.currentPanel = null;
        $('body').css('cursor', '');
    }
    
    setupDockUndock() {
        // Panel toggle functionality removed - panels are now always visible
        console.log('Panel management initialized');
    }
    

    
    setupSearch() {
        // Tool search functionality
        $('#toolSearch').on('input', (e) => {
            this.filterTools(e.target.value);
        });
        
        $('#clearToolSearch').on('click', () => {
            $('#toolSearch').val('');
            this.filterTools('');
        });
        
        // Property search functionality
        $('#propertySearch').on('input', (e) => {
            this.filterProperties(e.target.value);
        });
        
        $('#clearPropertySearch').on('click', () => {
            $('#propertySearch').val('');
            this.filterProperties('');
        });
    }
    
    filterTools(searchTerm) {
        const term = searchTerm.toLowerCase().trim();
        
        // Remove any existing no-results message
        $('.tool-categories .no-results-message').remove();
        
        if (term === '') {
            // Show all tools and categories when search is empty
            $('.tool-item').show();
            $('.tool-category').show();
            return;
        }
        
        $('.tool-item').each(function() {
            const toolName = $(this).find('.tool-name').text().toLowerCase();
            const toolDescription = $(this).find('.tool-description').text().toLowerCase();
            const toolData = JSON.parse($(this).attr('data-tool-data'));
            const category = toolData.category.toLowerCase();
            
            const matches = toolName.includes(term) || 
                          toolDescription.includes(term) || 
                          category.includes(term);
            
            $(this).toggle(matches);
        });
        
        // Hide empty categories
        $('.tool-category').each(function() {
            const visibleTools = $(this).find('.tool-item:visible').length;
            $(this).toggle(visibleTools > 0);
        });
        
        // Show "no results" message if needed
        this.toggleNoResultsMessage('.tool-categories', $('.tool-item:visible').length === 0);
    }
    
    filterProperties(searchTerm) {
        const term = searchTerm.toLowerCase().trim();
        
        // Remove any existing no-results message
        $('#properties-content .no-results-message').remove();
        
        if (term === '') {
            // Show all property fields when search is empty
            $('.property-field').show();
            $('.property-section').show();
            return;
        }
        
        $('.property-field').each(function() {
            const label = $(this).find('label').text().toLowerCase();
            const input = $(this).find('input, select, textarea');
            const placeholder = input.attr('placeholder') || '';
            
            const matches = label.includes(term) || 
                          placeholder.toLowerCase().includes(term);
            
            $(this).toggle(matches);
        });
        
        // Hide empty sections
        $('.property-section').each(function() {
            const visibleFields = $(this).find('.property-field:visible').length;
            $(this).toggle(visibleFields > 0);
        });
        
        // Show "no results" message if needed
        this.toggleNoResultsMessage('#properties-content', $('.property-field:visible').length === 0);
    }
    
    toggleNoResultsMessage(container, show) {
        const existingMessage = $(container).find('.no-results-message');
        
        if (show && existingMessage.length === 0) {
            const message = $(`
                <div class="no-results-message text-center text-muted p-4">
                    <i class="fas fa-search fa-2x mb-3"></i>
                    <h6>No Results Found</h6>
                    <p>Try adjusting your search terms</p>
                </div>
            `);
            $(container).append(message);
        } else if (!show) {
            existingMessage.remove();
        }
    }
    
    setupCanvasControls() {
        $('#fitContent').on('click', () => {
            if (window.canvasManager) {
                window.canvasManager.fitToContent();
            }
        });
    }
}

// PanelManager class - initialized externally