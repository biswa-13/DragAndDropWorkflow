// Workflow Management System
class WorkflowManager {
    constructor() {
        this.nodes = new Map();
        this.connections = [];
        this.selectedNode = null;
        this.nextNodeId = 1;
        this.isConnecting = false;
        this.connectionStart = null;
        this.canvasOffset = { x: 0, y: 0 };
        this.canvasScale = 1;
        
        this.init();
    }
    
    init() {
        this.initializeCanvas();
        this.initializeDragDrop();
        this.initializeEventHandlers();
        this.initializeTemplateButtons();
        this.loadLayoutFromServer();
        this.loadFromStorage();
    }
    
    initializeCanvas() {
        const canvas = $('#workflow-canvas');
        const svg = $('#connections-svg');
        
        // Add arrow marker definition to SVG
        const defs = $(document.createElementNS('http://www.w3.org/2000/svg', 'defs'));
        const marker = $(document.createElementNS('http://www.w3.org/2000/svg', 'marker'))
            .attr({
                id: 'arrowhead',
                markerWidth: 10,
                markerHeight: 7,
                refX: 9,
                refY: 3.5,
                orient: 'auto'
            });
        const polygon = $(document.createElementNS('http://www.w3.org/2000/svg', 'polygon'))
            .attr({
                points: '0 0, 10 3.5, 0 7',
                fill: '#ff8c00'
            });
        
        marker.append(polygon);
        defs.append(marker);
        svg.append(defs);
        
        // Canvas event handlers
        canvas.on('click', (e) => {
            if (e.target === canvas[0]) {
                this.deselectAllNodes();
            }
        });
    }
    
    initializeDragDrop() {
        const self = this;
        
        // Make tool items draggable
        $('.tool-item').draggable({
            helper: 'clone',
            cursor: 'move',
            zIndex: 1000,
            start: function(event, ui) {
                $(this).addClass('ui-draggable-dragging');
            },
            stop: function(event, ui) {
                $(this).removeClass('ui-draggable-dragging');
            }
        });
        
        // Make canvas droppable
        $('#workflow-canvas').droppable({
            accept: '.tool-item',
            drop: function(event, ui) {
                try {
                    const toolDataStr = ui.draggable.attr('data-tool-data');
                    console.log('Tool data string:', toolDataStr);
                    
                    const toolData = JSON.parse(toolDataStr);
                    const canvasOffset = $('#workflow-canvas').offset();
                    const position = {
                        x: ui.offset.left - canvasOffset.left - 90, // Center the node
                        y: ui.offset.top - canvasOffset.top - 40
                    };
                    
                    console.log('Creating node with data:', toolData, 'at position:', position);
                    self.createNode(toolData, position);
                    self.hideCanvasGuide();
                } catch (error) {
                    console.error('Error creating node:', error);
                }
            }
        });
    }
    
    initializeEventHandlers() {
        // Zoom controls
        $('#zoomIn').on('click', () => this.zoomCanvas(1.2));
        $('#zoomOut').on('click', () => this.zoomCanvas(0.8));
        $('#resetZoom').on('click', () => this.resetZoom());
        
        // Workflow actions
        $('#saveWorkflow').on('click', () => this.saveWorkflow());
        $('#loadWorkflow').on('click', () => this.loadWorkflow());
        $('#executeWorkflow').on('click', () => this.executeWorkflow());
        
        // Connection modal
        $('#confirmConnection').on('click', () => this.confirmConnection());
        
        // Keyboard shortcuts
        $(document).on('keydown', (e) => {
            if (e.key === 'Delete' && this.selectedNode) {
                this.deleteNode(this.selectedNode);
            }
        });
    }
    
    createNode(toolData, position) {
        const nodeId = `node_${this.nextNodeId++}`;
        const node = {
            id: nodeId,
            type: toolData.id,
            name: toolData.name,
            icon: toolData.icon,
            description: toolData.description,
            properties: this.initializeProperties(toolData.properties),
            position: position,
            status: 'idle'
        };
        
        this.nodes.set(nodeId, node);
        this.renderNode(node);
        this.saveToStorage();
        
        return nodeId;
    }
    
    initializeProperties(propertyDefs) {
        const properties = {};
        for (const [key, def] of Object.entries(propertyDefs)) {
            properties[key] = def.default || '';
        }
        return properties;
    }
    
    renderNode(node) {
        const nodeElement = $(`
            <div class="workflow-node" data-node-id="${node.id}" style="left: ${node.position.x}px; top: ${node.position.y}px;">
                <div class="node-header">
                    <div class="node-icon">
                        <i class="fas fa-${node.icon}"></i>
                    </div>
                    <div class="node-title">${node.name}</div>
                    <div class="node-actions">
                        <button class="node-action" data-action="delete" title="Delete Node">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>
                <div class="node-content">
                    ${node.description}
                </div>
                <div class="connection-point input" title="Input"></div>
                <div class="connection-point output" title="Output"></div>
                <div class="status-indicator ${node.status}"></div>
            </div>
        `);
        
        // Make node draggable
        nodeElement.draggable({
            handle: '.node-header',
            containment: '#workflow-canvas',
            drag: (event, ui) => {
                this.updateNodePosition(node.id, ui.position);
                this.updateConnections();
            },
            stop: (event, ui) => {
                this.saveToStorage();
            }
        });
        
        // Node event handlers
        nodeElement.on('click', (e) => {
            e.stopPropagation();
            this.selectNode(node.id);
        });
        
        // Node action handlers
        nodeElement.find('.node-action').on('click', (e) => {
            e.stopPropagation();
            const action = $(e.currentTarget).data('action');
            if (action === 'delete') {
                this.deleteNode(node.id);
            }
        });
        
        // Connection point handlers
        nodeElement.find('.connection-point').on('click', (e) => {
            e.stopPropagation();
            this.handleConnectionClick(node.id, $(e.currentTarget).hasClass('output'));
        });
        
        $('#nodes-container').append(nodeElement);
    }
    
    selectNode(nodeId) {
        this.deselectAllNodes();
        this.selectedNode = nodeId;
        $(`.workflow-node[data-node-id="${nodeId}"]`).addClass('selected');
        
        // Update properties panel and switch to properties tab
        const node = this.nodes.get(nodeId);
        if (window.propertiesManager && node) {
            window.propertiesManager.showNodeProperties(node);
            // Automatically switch to properties tab
            $('#properties-tab').tab('show');
        } else {
            console.error('Properties manager not available or node not found:', nodeId);
        }
    }
    
    deselectAllNodes() {
        $('.workflow-node').removeClass('selected');
        this.selectedNode = null;
        if (window.propertiesManager) {
            window.propertiesManager.hideNodeProperties();
        }
    }
    
    updateNodePosition(nodeId, position) {
        const node = this.nodes.get(nodeId);
        if (node) {
            node.position = position;
        }
    }
    
    deleteNode(nodeId) {
        if (confirm('Are you sure you want to delete this node?')) {
            // Remove connections
            this.connections = this.connections.filter(conn => 
                conn.source !== nodeId && conn.target !== nodeId
            );
            
            // Remove node element
            $(`.workflow-node[data-node-id="${nodeId}"]`).remove();
            
            // Remove from nodes map
            this.nodes.delete(nodeId);
            
            // Update UI
            this.updateConnections();
            this.saveToStorage();
            
            if (this.selectedNode === nodeId) {
                this.deselectAllNodes();
            }
            
            if (this.nodes.size === 0) {
                this.showCanvasGuide();
            }
        }
    }
    
    handleConnectionClick(nodeId, isOutput) {
        if (!this.isConnecting) {
            // Start connection
            this.isConnecting = true;
            this.connectionStart = { nodeId, isOutput };
            
            // Visual feedback
            $(`.workflow-node[data-node-id="${nodeId}"] .connection-point.${isOutput ? 'output' : 'input'}`)
                .addClass('connecting');
            
            $('body').css('cursor', 'crosshair');
            
            // Show connection guide
            this.showConnectionGuide();
        } else {
            // Complete connection
            const connectionEnd = { nodeId, isOutput };
            
            if (this.canCreateConnection(this.connectionStart, connectionEnd)) {
                this.createConnection(this.connectionStart, connectionEnd);
                this.showNotification('Connection created successfully!', 'success');
            } else {
                this.showNotification('Cannot create this connection', 'error');
            }
            
            this.cancelConnection();
        }
    }
    
    canCreateConnection(start, end) {
        // Can't connect to self
        if (start.nodeId === end.nodeId) return false;
        
        // Must connect output to input
        if (start.isOutput === end.isOutput) return false;
        
        // Check if connection already exists
        const sourceId = start.isOutput ? start.nodeId : end.nodeId;
        const targetId = start.isOutput ? end.nodeId : start.nodeId;
        
        return !this.connections.some(conn => 
            conn.source === sourceId && conn.target === targetId
        );
    }
    
    createConnection(start, end) {
        const sourceId = start.isOutput ? start.nodeId : end.nodeId;
        const targetId = start.isOutput ? end.nodeId : start.nodeId;
        
        const connection = {
            id: `conn_${Date.now()}`,
            source: sourceId,
            target: targetId
        };
        
        this.connections.push(connection);
        this.updateConnections();
        this.saveToStorage();
    }
    
    cancelConnection() {
        this.isConnecting = false;
        this.connectionStart = null;
        $('.connection-point').removeClass('connecting');
        $('body').css('cursor', '');
        this.hideConnectionGuide();
    }
    
    showConnectionGuide() {
        // Highlight all valid connection points
        $('.connection-point').not('.connecting').addClass('connection-target');
    }
    
    hideConnectionGuide() {
        $('.connection-point').removeClass('connection-target');
    }
    
    confirmConnection() {
        $('#connectionModal').modal('hide');
        // Connection already created in handleConnectionClick
    }
    
    updateConnections() {
        const svg = $('#connections-svg');
        svg.find('.connection-line').remove();
        
        this.connections.forEach(connection => {
            this.renderConnection(connection);
        });
    }
    
    renderConnection(connection) {
        const sourceNode = $(`.workflow-node[data-node-id="${connection.source}"]`);
        const targetNode = $(`.workflow-node[data-node-id="${connection.target}"]`);
        
        if (sourceNode.length === 0 || targetNode.length === 0) return;
        
        const sourcePos = this.getConnectionPoint(sourceNode, true);
        const targetPos = this.getConnectionPoint(targetNode, false);
        
        const path = this.createConnectionPath(sourcePos, targetPos);
        
        const pathElement = $(document.createElementNS('http://www.w3.org/2000/svg', 'path'))
            .attr({
                d: path,
                class: 'connection-line',
                'data-connection-id': connection.id
            })
            .on('click', () => {
                if (confirm('Delete this connection?')) {
                    this.deleteConnection(connection.id);
                }
            });
        
        $('#connections-svg').append(pathElement);
    }
    
    getConnectionPoint(nodeElement, isOutput) {
        const nodePosition = nodeElement.position();
        const nodeWidth = nodeElement.outerWidth();
        const nodeHeight = nodeElement.outerHeight();
        
        return {
            x: nodePosition.left + (isOutput ? nodeWidth : 0),
            y: nodePosition.top + nodeHeight / 2
        };
    }
    
    createConnectionPath(start, end) {
        const controlPointOffset = Math.abs(end.x - start.x) * 0.5;
        
        return `M ${start.x} ${start.y} 
                C ${start.x + controlPointOffset} ${start.y}, 
                  ${end.x - controlPointOffset} ${end.y}, 
                  ${end.x} ${end.y}`;
    }
    
    deleteConnection(connectionId) {
        this.connections = this.connections.filter(conn => conn.id !== connectionId);
        this.updateConnections();
        this.saveToStorage();
    }
    
    zoomCanvas(factor) {
        this.canvasScale *= factor;
        this.canvasScale = Math.max(0.5, Math.min(2, this.canvasScale));
        
        $('#nodes-container').css('transform', `scale(${this.canvasScale})`);
        $('#connections-svg').css('transform', `scale(${this.canvasScale})`);
    }
    
    resetZoom() {
        this.canvasScale = 1;
        $('#nodes-container').css('transform', 'scale(1)');
        $('#connections-svg').css('transform', 'scale(1)');
    }
    
    hideCanvasGuide() {
        $('.canvas-guide').addClass('hidden');
    }
    
    showCanvasGuide() {
        $('.canvas-guide').removeClass('hidden');
    }
    
    saveWorkflow() {
        const workflowName = $('#workflowName').val() || 'Untitled Workflow';
        
        if (this.nodes.size === 0) {
            this.showNotification('Cannot save empty workflow. Add some nodes first.', 'warning');
            return;
        }
        
        const workflowData = {
            name: workflowName,
            nodes: Array.from(this.nodes.values()),
            connections: this.connections,
            meta: {
                created: new Date().toISOString(),
                version: '1.0'
            }
        };
        
        // Show saving indicator
        const saveBtn = $('#saveWorkflow');
        const originalHtml = saveBtn.html();
        saveBtn.html('<i class="fas fa-spinner fa-spin me-1"></i>Saving...').prop('disabled', true);
        
        // Print the complete workflow JSON to console for manual copying
        console.log('='.repeat(80));
        console.log(`WORKFLOW JSON - ${workflowName}`);
        console.log('='.repeat(80));
        console.log('Copy the JSON below to save manually:');
        console.log(JSON.stringify(workflowData, null, 2));
        console.log('='.repeat(80));
        console.log('End of workflow JSON');
        console.log('='.repeat(80));
        
        $.ajax({
            url: '/api/workflow/save',
            method: 'POST',
            contentType: 'application/json',
            data: JSON.stringify(workflowData),
            success: (response) => {
                const message = response.message || `Workflow "${workflowName}" saved successfully!`;
                this.showNotification(message + ' (JSON also printed to console)', 'success');
                this.saveToStorage();
            },
            error: (xhr) => {
                const errorResponse = xhr.responseJSON || {};
                const errorMessage = errorResponse.message || 'Failed to save workflow';
                this.showNotification(errorMessage, 'error');
            },
            complete: () => {
                // Restore button state
                saveBtn.html(originalHtml).prop('disabled', false);
            }
        });
    }
    
    loadWorkflow() {
        // For demo purposes, show file input
        const input = $('<input type="file" accept=".json">');
        input.on('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = (event) => {
                    try {
                        const workflowData = JSON.parse(event.target.result);
                        this.loadWorkflowData(workflowData);
                        this.showNotification('Workflow loaded successfully!', 'success');
                    } catch (error) {
                        this.showNotification('Failed to load workflow: Invalid file format', 'error');
                    }
                };
                reader.readAsText(file);
            }
        });
        input.click();
    }
    
    loadWorkflowData(data) {
        // Clear current workflow
        this.nodes.clear();
        this.connections = [];
        $('#nodes-container').empty();
        
        // Load nodes
        data.nodes.forEach(nodeData => {
            this.nodes.set(nodeData.id, nodeData);
            this.renderNode(nodeData);
        });
        
        // Load connections
        this.connections = data.connections || [];
        this.updateConnections();
        
        // Update next node ID
        const maxId = Math.max(...Array.from(this.nodes.keys())
            .map(id => parseInt(id.replace('node_', ''))) || [0]);
        this.nextNodeId = maxId + 1;
        
        this.hideCanvasGuide();
        this.saveToStorage();
    }
    
    executeWorkflow() {
        const workflowData = {
            nodes: Array.from(this.nodes.values()),
            connections: this.connections
        };
        
        $.ajax({
            url: '/api/workflow/execute',
            method: 'POST',
            contentType: 'application/json',
            data: JSON.stringify(workflowData),
            success: (response) => {
                this.showNotification('Workflow execution started!', 'success');
                this.updateNodeStatuses('running');
            },
            error: (xhr, status, error) => {
                this.showNotification('Failed to execute workflow: ' + error, 'error');
            }
        });
    }
    
    updateNodeStatuses(status) {
        $('.status-indicator').removeClass('idle running success error').addClass(status);
    }
    
    initializeTemplateButtons() {
        $('#loadTemplate1').on('click', (e) => {
            e.preventDefault();
            this.loadTemplate('template1');
        });
        $('#loadTemplate2').on('click', (e) => {
            e.preventDefault();
            this.loadTemplate('template2');
        });
        $('#loadTemplate3').on('click', (e) => {
            e.preventDefault();
            this.loadTemplate('template3');
        });
        
        $('#loadMoreTemplates').on('click', (e) => {
            e.preventDefault();
            this.showAllTemplates();
        });
        
        $('#clearCanvas').on('click', () => {
            this.confirmClearCanvas();
        });
        
        $('#deleteWorkflow').on('click', () => {
            this.confirmDeleteWorkflow();
        });
        
        $('#loadWorkflow').on('click', () => {
            this.showLoadWorkflowDialog();
        });
        
        // Save workflow name and layout on change
        $('#workflowName').on('input', () => {
            this.saveLayoutToServer();
        });
    }
    
    loadTemplate(templateId) {
        $.ajax({
            url: `/api/workflow/load/${templateId}`,
            method: 'GET',
            success: (response) => {
                if (response.workflow_data) {
                    this.clearCanvas();
                    this.loadWorkflowData(response.workflow_data);
                    $('#workflowName').val(response.name + ' - Copy');
                    this.showNotification(`Template "${response.name}" loaded successfully`, 'success');
                }
            },
            error: (xhr) => {
                console.error('Failed to load template:', xhr);
                this.showNotification('Failed to load template', 'error');
            }
        });
    }
    
    confirmClearCanvas() {
        if (this.nodes.size === 0) {
            this.showNotification('Canvas is already empty', 'info');
            return;
        }
        
        const confirmModal = $(`
            <div class="modal fade" id="clearCanvasModal" tabindex="-1">
                <div class="modal-dialog">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h5 class="modal-title">
                                <i class="fas fa-exclamation-triangle text-warning me-2"></i>
                                Clear Canvas
                            </h5>
                            <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                        </div>
                        <div class="modal-body">
                            <p>Are you sure you want to clear the entire canvas?</p>
                            <p class="text-muted small">This will remove all ${this.nodes.size} nodes and their connections. This action cannot be undone.</p>
                        </div>
                        <div class="modal-footer">
                            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
                            <button type="button" class="btn btn-danger" id="confirmClear">
                                <i class="fas fa-trash-alt me-1"></i>Clear Canvas
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `);
        
        $('body').append(confirmModal);
        const modal = new bootstrap.Modal(document.getElementById('clearCanvasModal'));
        
        $('#confirmClear').on('click', () => {
            this.clearCanvas();
            modal.hide();
            this.showNotification('Canvas cleared successfully', 'success');
        });
        
        $('#clearCanvasModal').on('hidden.bs.modal', function () {
            $(this).remove();
        });
        
        modal.show();
    }
    
    clearCanvas() {
        this.nodes.clear();
        this.connections.clear();
        $('#nodes-container').empty();
        this.updateConnections();
        this.showCanvasGuide();
        this.saveToStorage();
    }
    
    confirmDeleteWorkflow() {
        const workflowName = $('#workflowName').val() || 'Untitled Workflow';
        
        const confirmModal = $(`
            <div class="modal fade" id="deleteWorkflowModal" tabindex="-1">
                <div class="modal-dialog">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h5 class="modal-title">
                                <i class="fas fa-exclamation-triangle text-danger me-2"></i>
                                Delete Workflow
                            </h5>
                            <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                        </div>
                        <div class="modal-body">
                            <p>Are you sure you want to delete the workflow <strong>"${workflowName}"</strong>?</p>
                            <p class="text-muted small">This will permanently remove the workflow and all its data. This action cannot be undone.</p>
                        </div>
                        <div class="modal-footer">
                            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
                            <button type="button" class="btn btn-danger" id="confirmDelete">
                                <i class="fas fa-trash-alt me-1"></i>Delete Workflow
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `);
        
        $('body').append(confirmModal);
        const modal = new bootstrap.Modal(document.getElementById('deleteWorkflowModal'));
        
        $('#confirmDelete').on('click', () => {
            this.deleteWorkflow();
            modal.hide();
        });
        
        $('#deleteWorkflowModal').on('hidden.bs.modal', function () {
            $(this).remove();
        });
        
        modal.show();
    }
    
    deleteWorkflow() {
        const workflowName = $('#workflowName').val() || 'Untitled Workflow';
        
        // Show deleting indicator
        const deleteBtn = $('#deleteWorkflow');
        const originalHtml = deleteBtn.html();
        deleteBtn.html('<i class="fas fa-spinner fa-spin me-1"></i>Deleting...').prop('disabled', true);
        
        $.ajax({
            url: '/api/workflow/delete',
            method: 'POST',
            contentType: 'application/json',
            data: JSON.stringify({ name: workflowName }),
            success: (response) => {
                // Clear the canvas
                this.clearCanvas();
                
                // Reset workflow name to default
                this.generateDefaultWorkflowName();
                
                // Clear local storage
                localStorage.removeItem('workflow_data');
                
                this.showNotification(response.message || 'Workflow deleted successfully', 'success');
            },
            error: (xhr) => {
                const errorResponse = xhr.responseJSON || {};
                const errorMessage = errorResponse.message || 'Failed to delete workflow';
                this.showNotification(errorMessage, 'error');
            },
            complete: () => {
                // Restore button state
                deleteBtn.html(originalHtml).prop('disabled', false);
            }
        });
    }
    
    showAllTemplates() {
        $.ajax({
            url: '/api/workflow/templates',
            method: 'GET',
            success: (templates) => {
                this.displayTemplateModal(templates);
            },
            error: (xhr) => {
                console.error('Failed to load templates:', xhr);
                this.showNotification('Failed to load templates', 'error');
            }
        });
    }
    
    displayTemplateModal(templates) {
        const templateGrid = templates.map(template => `
            <div class="col-md-6 mb-3">
                <div class="card template-card" data-template-id="${template.id}">
                    <div class="card-body">
                        <h6 class="card-title">
                            <i class="fas fa-layer-group me-2"></i>${template.name}
                        </h6>
                        <p class="card-text small text-muted">${template.description}</p>
                        <button class="btn btn-sm btn-outline-primary load-template-btn" data-template-id="${template.id}">
                            <i class="fas fa-download me-1"></i>Load Template
                        </button>
                    </div>
                </div>
            </div>
        `).join('');
        
        const templateModal = $(`
            <div class="modal fade" id="templatesModal" tabindex="-1">
                <div class="modal-dialog modal-lg">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h5 class="modal-title">
                                <i class="fas fa-layer-group me-2"></i>Workflow Templates
                            </h5>
                            <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                        </div>
                        <div class="modal-body">
                            <div class="row">
                                ${templateGrid}
                            </div>
                        </div>
                        <div class="modal-footer">
                            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Close</button>
                        </div>
                    </div>
                </div>
            </div>
        `);
        
        $('body').append(templateModal);
        const modal = new bootstrap.Modal(document.getElementById('templatesModal'));
        
        $('.load-template-btn').on('click', (e) => {
            const templateId = $(e.target).data('template-id');
            this.loadTemplate(templateId);
            modal.hide();
        });
        
        $('#templatesModal').on('hidden.bs.modal', function () {
            $(this).remove();
        });
        
        modal.show();
    }
    
    showLoadWorkflowDialog() {
        const loadModal = $(`
            <div class="modal fade" id="loadWorkflowModal" tabindex="-1">
                <div class="modal-dialog">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h5 class="modal-title">
                                <i class="fas fa-upload me-2"></i>Load Workflow
                            </h5>
                            <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                        </div>
                        <div class="modal-body">
                            <p>Choose how you want to load your workflow:</p>
                            
                            <div class="mb-3">
                                <label class="form-label">Load from JSON file:</label>
                                <input type="file" class="form-control" id="workflowFileInput" accept=".json">
                            </div>
                            
                            <div class="mb-3">
                                <label class="form-label">Or paste JSON directly:</label>
                                <textarea class="form-control" id="workflowJsonInput" rows="6" placeholder="Paste your workflow JSON here..."></textarea>
                            </div>
                        </div>
                        <div class="modal-footer">
                            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
                            <button type="button" class="btn btn-primary" id="loadWorkflowBtn">
                                <i class="fas fa-upload me-1"></i>Load Workflow
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `);
        
        $('body').append(loadModal);
        const modal = new bootstrap.Modal(document.getElementById('loadWorkflowModal'));
        
        // Handle file input
        $('#workflowFileInput').on('change', (e) => {
            const file = e.target.files[0];
            if (file && file.type === 'application/json') {
                const reader = new FileReader();
                reader.onload = (event) => {
                    $('#workflowJsonInput').val(event.target.result);
                };
                reader.readAsText(file);
            }
        });
        
        // Handle load button
        $('#loadWorkflowBtn').on('click', () => {
            this.loadWorkflowFromJson();
            modal.hide();
        });
        
        $('#loadWorkflowModal').on('hidden.bs.modal', function () {
            $(this).remove();
        });
        
        modal.show();
    }
    
    loadWorkflowFromJson() {
        const jsonInput = $('#workflowJsonInput').val().trim();
        
        if (!jsonInput) {
            this.showNotification('Please provide JSON data to load', 'warning');
            return;
        }
        
        try {
            const workflowData = JSON.parse(jsonInput);
            
            // Validate the JSON structure
            if (!workflowData.nodes || !Array.isArray(workflowData.nodes)) {
                throw new Error('Invalid workflow format: missing or invalid nodes');
            }
            
            if (!workflowData.connections || !Array.isArray(workflowData.connections)) {
                throw new Error('Invalid workflow format: missing or invalid connections');
            }
            
            // Clear current workflow
            this.nodes.clear();
            this.connections = [];
            $('#nodes-container').empty();
            
            // Load workflow name
            if (workflowData.name) {
                $('#workflowName').val(workflowData.name);
            }
            
            // Load nodes
            workflowData.nodes.forEach(nodeData => {
                this.nodes.set(nodeData.id, nodeData);
                this.renderNode(nodeData);
            });
            
            // Load connections
            this.connections = workflowData.connections || [];
            this.updateConnections();
            
            // Update next node ID
            const maxId = Math.max(...Array.from(this.nodes.keys())
                .map(id => parseInt(id.replace('node_', ''))) || [0]);
            this.nextNodeId = maxId + 1;
            
            // Hide canvas guide if we have nodes
            if (this.nodes.size > 0) {
                this.hideCanvasGuide();
            } else {
                this.showCanvasGuide();
            }
            
            // Save to local storage
            this.saveToStorage();
            
            console.log('='.repeat(80));
            console.log('WORKFLOW LOADED FROM JSON');
            console.log('='.repeat(80));
            console.log('Loaded workflow data:');
            console.log(JSON.stringify(workflowData, null, 2));
            console.log('='.repeat(80));
            
            this.showNotification(`Workflow "${workflowData.name || 'Untitled'}" loaded successfully!`, 'success');
            
        } catch (error) {
            console.error('Failed to load workflow:', error);
            this.showNotification(`Failed to load workflow: ${error.message}`, 'error');
        }
    }
    
    saveLayoutToServer() {
        const layoutData = {
            panel_state: {
                left_panel_visible: !$('#left-panel').hasClass('hidden'),
                workflow_name: $('#workflowName').val()
            },
            canvas_state: {
                zoom: window.canvasManager ? window.canvasManager.scale : 1,
                offset: window.canvasManager ? window.canvasManager.canvasOffset : {x: 0, y: 0}
            }
        };
        
        $.ajax({
            url: '/api/layout/save',
            method: 'POST',
            contentType: 'application/json',
            data: JSON.stringify(layoutData),
            success: () => {
                // Silent success - no notification needed for auto-save
            },
            error: (xhr) => {
                console.error('Failed to save layout:', xhr);
            }
        });
    }
    
    loadLayoutFromServer() {
        $.ajax({
            url: '/api/layout/load',
            method: 'GET',
            success: (response) => {
                if (response.status === 'success' && response.data) {
                    const layoutData = response.data;
                    
                    // Restore panel state
                    if (layoutData.panel_state) {
                        if (layoutData.panel_state.workflow_name) {
                            $('#workflowName').val(layoutData.panel_state.workflow_name);
                        } else {
                            // Generate default workflow name with number
                            this.generateDefaultWorkflowName();
                        }
                        
                        if (layoutData.panel_state.left_panel_visible === false) {
                            setTimeout(() => {
                                window.panelManager.toggleLeftPanel();
                            }, 100);
                        }
                    } else {
                        this.generateDefaultWorkflowName();
                    }
                    
                    // Restore canvas state
                    if (layoutData.canvas_state && window.canvasManager) {
                        setTimeout(() => {
                            if (layoutData.canvas_state.zoom) {
                                window.canvasManager.scale = layoutData.canvas_state.zoom;
                            }
                            if (layoutData.canvas_state.offset) {
                                window.canvasManager.canvasOffset = layoutData.canvas_state.offset;
                            }
                            window.canvasManager.applyTransform();
                            window.canvasManager.updateZoomIndicator();
                        }, 200);
                    }
                } else {
                    this.generateDefaultWorkflowName();
                }
            },
            error: (xhr) => {
                console.error('Failed to load layout:', xhr);
                this.generateDefaultWorkflowName();
            }
        });
    }
    
    generateDefaultWorkflowName() {
        const existingWorkflows = Object.keys(localStorage).filter(key => 
            key.startsWith('workflow_') || key === 'workflow_data'
        ).length;
        const workflowNumber = existingWorkflows + 1;
        $('#workflowName').val(`Workflow ${workflowNumber}`);
    }

    saveToStorage() {
        const workflowData = {
            nodes: Array.from(this.nodes.values()),
            connections: this.connections
        };
        localStorage.setItem('workflow_data', JSON.stringify(workflowData));
        
        // Also save layout to server
        this.saveLayoutToServer();
    }
    
    loadFromStorage() {
        const savedData = localStorage.getItem('workflow_data');
        if (savedData) {
            try {
                const workflowData = JSON.parse(savedData);
                if (workflowData.nodes && workflowData.nodes.length > 0) {
                    this.loadWorkflowData(workflowData);
                }
            } catch (error) {
                console.warn('Failed to load workflow from storage:', error);
            }
        }
    }
    
    showNotification(message, type = 'info') {
        const alertClass = type === 'success' ? 'alert-success' : 
                          type === 'error' ? 'alert-danger' : 'alert-info';
        
        const notification = $(`
            <div class="alert ${alertClass} alert-dismissible fade show position-fixed" 
                 style="top: 70px; right: 20px; z-index: 9999; min-width: 300px;">
                ${message}
                <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
            </div>
        `);
        
        $('body').append(notification);
        
        setTimeout(() => {
            notification.alert('close');
        }, 5000);
    }
    
    updateNodeProperty(nodeId, property, value) {
        const node = this.nodes.get(nodeId);
        if (node) {
            node.properties[property] = value;
            this.saveToStorage();
        }
    }
    
    getNodeProperty(nodeId, property) {
        const node = this.nodes.get(nodeId);
        return node ? node.properties[property] : undefined;
    }
}

// WorkflowManager class - initialized externally
