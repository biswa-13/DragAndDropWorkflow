// Properties Panel Management
class PropertiesManager {
    constructor() {
        this.currentNode = null;
        this.propertiesContainer = $('#properties-content');
        this.toolDefinitions = new Map();
        
        this.init();
    }
    
    init() {
        this.loadToolDefinitions();
        this.setupEventHandlers();
    }
    
    loadToolDefinitions() {
        // Load tool definitions from the server
        $.get('/api/tools')
            .done((tools) => {
                tools.forEach(tool => {
                    this.toolDefinitions.set(tool.id, tool);
                });
            })
            .fail((error) => {
                console.error('Failed to load tool definitions:', error);
            });
    }
    
    setupEventHandlers() {
        // Property form submission
        $(document).on('submit', '#node-properties-form', (e) => {
            e.preventDefault();
            this.saveNodeProperties();
        });
        
        // Real-time property updates
        $(document).on('input change', '.property-input', (e) => {
            this.updateNodeProperty($(e.target));
        });
        
        // Property validation
        $(document).on('blur', '.property-input', (e) => {
            this.validateProperty($(e.target));
        });
    }
    
    showNodeProperties(node) {
        this.currentNode = node;
        const toolDef = this.toolDefinitions.get(node.type);
        
        if (!toolDef) {
            this.showError('Tool definition not found');
            return;
        }
        
        const propertiesHtml = this.generatePropertiesForm(node, toolDef);
        this.propertiesContainer.html(propertiesHtml);
        
        // Initialize form components
        this.initializeFormComponents();
    }
    
    hideNodeProperties() {
        this.currentNode = null;
        this.propertiesContainer.html(`
            <div class="no-selection">
                <div class="text-center text-muted">
                    <i class="fas fa-mouse-pointer fa-3x mb-3"></i>
                    <h6>No Node Selected</h6>
                    <p>Select a node from the canvas to configure its properties</p>
                </div>
            </div>
        `);
    }
    
    generatePropertiesForm(node, toolDef) {
        const basicInfoSection = this.generateBasicInfoSection(node, toolDef);
        const propertiesSection = this.generatePropertiesSection(node, toolDef);
        const actionsSection = this.generateActionsSection(node);
        
        return `
            <div class="node-properties active">
                <form id="node-properties-form">
                    ${basicInfoSection}
                    ${propertiesSection}
                    ${actionsSection}
                </form>
            </div>
        `;
    }
    
    generateBasicInfoSection(node, toolDef) {
        return `
            <div class="property-section">
                <h6><i class="fas fa-info-circle me-2"></i>Node Information</h6>
                
                <div class="property-field">
                    <label for="node-name">Node Name</label>
                    <input type="text" id="node-name" class="form-control property-input" 
                           data-property="name" value="${this.escapeHtml(node.name)}">
                </div>
                
                <div class="property-field">
                    <label for="node-description">Description</label>
                    <textarea id="node-description" class="form-control property-input" 
                              data-property="description" rows="2">${this.escapeHtml(node.description)}</textarea>
                </div>
                
                <div class="property-field">
                    <label>Node Type</label>
                    <div class="d-flex align-items-center">
                        <div class="tool-icon me-2" style="width: 24px; height: 24px;">
                            <i class="fas fa-${toolDef.icon}"></i>
                        </div>
                        <span class="text-muted">${toolDef.name}</span>
                    </div>
                </div>
                
                <div class="property-field">
                    <label>Node ID</label>
                    <input type="text" class="form-control" value="${node.id}" readonly>
                </div>
            </div>
        `;
    }
    
    generatePropertiesSection(node, toolDef) {
        if (!toolDef.properties || Object.keys(toolDef.properties).length === 0) {
            return `
                <div class="property-section">
                    <h6><i class="fas fa-cog me-2"></i>Configuration</h6>
                    <div class="text-muted">
                        <small>This node has no configurable properties.</small>
                    </div>
                </div>
            `;
        }
        
        const propertiesHtml = Object.entries(toolDef.properties)
            .map(([key, propDef]) => {
                return this.generatePropertyField(key, propDef, node.properties[key]);
            })
            .join('');
        
        return `
            <div class="property-section">
                <h6><i class="fas fa-cog me-2"></i>Configuration</h6>
                ${propertiesHtml}
            </div>
        `;
    }
    
    generatePropertyField(key, propDef, currentValue) {
        const value = currentValue !== undefined ? currentValue : (propDef.default || '');
        const fieldId = `prop-${key}`;
        
        let inputHtml = '';
        
        switch (propDef.type) {
            case 'text':
                inputHtml = `
                    <input type="text" id="${fieldId}" class="form-control property-input" 
                           data-property="${key}" value="${this.escapeHtml(value)}" 
                           placeholder="${propDef.placeholder || ''}"
                           ${propDef.readonly ? 'readonly' : ''}>
                `;
                break;
                
            case 'textarea':
                inputHtml = `
                    <textarea id="${fieldId}" class="form-control property-input" 
                              data-property="${key}" rows="3" 
                              placeholder="${propDef.placeholder || ''}"
                              ${propDef.readonly ? 'readonly' : ''}>${this.escapeHtml(value)}</textarea>
                `;
                break;
                
            case 'number':
                inputHtml = `
                    <input type="number" id="${fieldId}" class="form-control property-input" 
                           data-property="${key}" value="${value}" 
                           placeholder="${propDef.placeholder || ''}"
                           ${propDef.min !== undefined ? `min="${propDef.min}"` : ''}
                           ${propDef.max !== undefined ? `max="${propDef.max}"` : ''}
                           ${propDef.step !== undefined ? `step="${propDef.step}"` : ''}
                           ${propDef.readonly ? 'readonly' : ''}>
                `;
                break;
                
            case 'select':
                const options = (propDef.options || [])
                    .map(option => `
                        <option value="${option}" ${option === value ? 'selected' : ''}>${option}</option>
                    `)
                    .join('');
                    
                inputHtml = `
                    <select id="${fieldId}" class="form-select property-input" 
                            data-property="${key}" ${propDef.readonly ? 'disabled' : ''}>
                        ${options}
                    </select>
                `;
                break;
                
            case 'checkbox':
                inputHtml = `
                    <div class="form-check">
                        <input type="checkbox" id="${fieldId}" class="form-check-input property-input" 
                               data-property="${key}" ${value ? 'checked' : ''} 
                               ${propDef.readonly ? 'disabled' : ''}>
                        <label class="form-check-label" for="${fieldId}">
                            ${propDef.label || 'Enable'}
                        </label>
                    </div>
                `;
                break;
                
            case 'password':
                inputHtml = `
                    <input type="password" id="${fieldId}" class="form-control property-input" 
                           data-property="${key}" value="${this.escapeHtml(value)}" 
                           placeholder="${propDef.placeholder || ''}"
                           ${propDef.readonly ? 'readonly' : ''}>
                `;
                break;
                
            default:
                inputHtml = `
                    <input type="text" id="${fieldId}" class="form-control property-input" 
                           data-property="${key}" value="${this.escapeHtml(value)}" 
                           placeholder="${propDef.placeholder || ''}"
                           ${propDef.readonly ? 'readonly' : ''}>
                `;
        }
        
        const label = this.formatPropertyLabel(key);
        const description = propDef.description ? `<small class="form-text text-muted">${propDef.description}</small>` : '';
        const required = propDef.required ? '<span class="text-danger">*</span>' : '';
        
        return `
            <div class="property-field">
                <label for="${fieldId}">${label} ${required}</label>
                ${inputHtml}
                ${description}
                <div class="invalid-feedback"></div>
            </div>
        `;
    }
    
    generateActionsSection(node) {
        return `
            <div class="property-actions">
                <button type="button" class="btn btn-primary" id="testNode">
                    <i class="fas fa-play me-1"></i>Test Node
                </button>
                
                <button type="button" class="btn btn-outline-secondary" id="duplicateNode">
                    <i class="fas fa-copy me-1"></i>Duplicate
                </button>
                
                <button type="button" class="btn btn-outline-danger" id="deleteNode">
                    <i class="fas fa-trash me-1"></i>Delete Node
                </button>
            </div>
        `;
    }
    
    initializeFormComponents() {
        // Node actions
        $('#testNode').on('click', () => this.testNode());
        $('#duplicateNode').on('click', () => this.duplicateNode());
        $('#deleteNode').on('click', () => this.deleteCurrentNode());
        
        // Dynamic property updates for specific fields
        this.setupDynamicProperties();
        
        // Property validation setup
        this.setupPropertyValidation();
    }
    
    setupDynamicProperties() {
        // Handle webhook URL generation
        $(document).on('change', '[data-property="webhook_url"]', (e) => {
            if (this.currentNode) {
                const webhookUrl = `/webhook/${this.currentNode.id}`;
                $(e.target).val(webhookUrl);
                this.updateNodeProperty($(e.target));
            }
        });
        
        // Handle connection string validation
        $(document).on('blur', '[data-property="connection_string"]', (e) => {
            this.validateConnectionString($(e.target));
        });
        
        // Handle URL validation
        $(document).on('blur', '[data-property="url"]', (e) => {
            this.validateUrl($(e.target));
        });
        
        // Handle email validation
        $(document).on('blur', '[data-property*="email"], [data-property="to"]', (e) => {
            this.validateEmail($(e.target));
        });
    }
    
    setupPropertyValidation() {
        // Add real-time validation for required fields
        $(document).on('input', '.property-input[required]', (e) => {
            this.validateRequiredField($(e.target));
        });
    }
    
    updateNodeProperty(input) {
        if (!this.currentNode) return;
        
        const property = input.data('property');
        let value = input.val();
        
        // Handle checkbox inputs
        if (input.is(':checkbox')) {
            value = input.is(':checked');
        }
        
        // Update node properties
        if (property === 'name' || property === 'description') {
            this.currentNode[property] = value;
            
            // Update node display
            if (property === 'name') {
                $(`.workflow-node[data-node-id="${this.currentNode.id}"] .node-title`).text(value);
            }
        } else {
            this.currentNode.properties[property] = value;
        }
        
        // Notify workflow manager
        if (window.workflowManager) {
            window.workflowManager.saveToStorage();
        }
        
        // Clear validation state
        input.removeClass('is-invalid is-valid');
        input.siblings('.invalid-feedback').text('');
    }
    
    saveNodeProperties() {
        if (!this.currentNode) return;
        
        // Validate all properties
        let isValid = true;
        $('.property-input').each((index, element) => {
            if (!this.validateProperty($(element))) {
                isValid = false;
            }
        });
        
        if (isValid) {
            // Show success feedback
            this.showPropertyFeedback('Properties saved successfully!', 'success');
            
            // Update workflow manager
            if (window.workflowManager) {
                window.workflowManager.saveToStorage();
            }
        } else {
            this.showPropertyFeedback('Please fix validation errors before saving.', 'error');
        }
    }
    
    validateProperty(input) {
        const property = input.data('property');
        const value = input.val();
        
        // Clear previous validation state
        input.removeClass('is-invalid is-valid');
        input.siblings('.invalid-feedback').text('');
        
        // Required field validation
        if (input.prop('required') && !value.trim()) {
            this.setValidationError(input, 'This field is required');
            return false;
        }
        
        // Type-specific validation
        switch (property) {
            case 'url':
                return this.validateUrl(input);
            case 'email':
            case 'to':
                if (value && value.includes('@')) {
                    return this.validateEmail(input);
                }
                break;
            case 'connection_string':
                return this.validateConnectionString(input);
        }
        
        // Mark as valid if no errors
        if (value.trim()) {
            input.addClass('is-valid');
        }
        
        return true;
    }
    
    validateUrl(input) {
        const value = input.val().trim();
        if (!value) return true; // Allow empty for optional fields
        
        try {
            new URL(value);
            input.addClass('is-valid');
            return true;
        } catch {
            this.setValidationError(input, 'Please enter a valid URL');
            return false;
        }
    }
    
    validateEmail(input) {
        const value = input.val().trim();
        if (!value) return true; // Allow empty for optional fields
        
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (emailRegex.test(value)) {
            input.addClass('is-valid');
            return true;
        } else {
            this.setValidationError(input, 'Please enter a valid email address');
            return false;
        }
    }
    
    validateConnectionString(input) {
        const value = input.val().trim();
        if (!value) return true; // Allow empty for optional fields
        
        // Basic connection string validation
        if (value.includes('://') && value.includes('@')) {
            input.addClass('is-valid');
            return true;
        } else {
            this.setValidationError(input, 'Please enter a valid connection string');
            return false;
        }
    }
    
    validateRequiredField(input) {
        const value = input.val().trim();
        if (!value) {
            this.setValidationError(input, 'This field is required');
            return false;
        }
        
        input.removeClass('is-invalid').addClass('is-valid');
        input.siblings('.invalid-feedback').text('');
        return true;
    }
    
    setValidationError(input, message) {
        input.removeClass('is-valid').addClass('is-invalid');
        input.siblings('.invalid-feedback').text(message);
    }
    
    testNode() {
        if (!this.currentNode) return;
        
        // Simulate node testing
        this.showPropertyFeedback('Testing node...', 'info');
        
        setTimeout(() => {
            // Simulate test result
            const success = Math.random() > 0.3; // 70% success rate
            if (success) {
                this.showPropertyFeedback('Node test successful!', 'success');
                $(`.workflow-node[data-node-id="${this.currentNode.id}"] .status-indicator`)
                    .removeClass('idle running error').addClass('success');
            } else {
                this.showPropertyFeedback('Node test failed. Check configuration.', 'error');
                $(`.workflow-node[data-node-id="${this.currentNode.id}"] .status-indicator`)
                    .removeClass('idle running success').addClass('error');
            }
        }, 1500);
    }
    
    duplicateNode() {
        if (!this.currentNode && window.workflowManager) {
            // Create a copy of the current node
            const toolDef = this.toolDefinitions.get(this.currentNode.type);
            if (toolDef) {
                const newPosition = {
                    x: this.currentNode.position.x + 200,
                    y: this.currentNode.position.y + 50
                };
                
                const newNodeId = window.workflowManager.createNode(toolDef, newPosition);
                const newNode = window.workflowManager.nodes.get(newNodeId);
                
                // Copy properties
                newNode.properties = { ...this.currentNode.properties };
                newNode.name = this.currentNode.name + ' (Copy)';
                
                // Update display
                $(`.workflow-node[data-node-id="${newNodeId}"] .node-title`).text(newNode.name);
                
                // Select the new node
                window.workflowManager.selectNode(newNodeId);
                
                this.showPropertyFeedback('Node duplicated successfully!', 'success');
            }
        }
    }
    
    deleteCurrentNode() {
        if (this.currentNode && window.workflowManager) {
            window.workflowManager.deleteNode(this.currentNode.id);
        }
    }
    
    showPropertyFeedback(message, type) {
        const alertClass = type === 'success' ? 'alert-success' : 
                          type === 'error' ? 'alert-danger' : 'alert-info';
        
        // Remove existing feedback
        $('.property-feedback').remove();
        
        const feedback = $(`
            <div class="alert ${alertClass} alert-dismissible fade show property-feedback mt-3">
                ${message}
                <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
            </div>
        `);
        
        $('.property-actions').before(feedback);
        
        // Auto-remove after 3 seconds
        setTimeout(() => {
            feedback.alert('close');
        }, 3000);
    }
    
    showError(message) {
        this.propertiesContainer.html(`
            <div class="alert alert-danger">
                <i class="fas fa-exclamation-triangle me-2"></i>
                ${message}
            </div>
        `);
    }
    
    formatPropertyLabel(key) {
        return key.replace(/_/g, ' ')
                 .replace(/\b\w/g, l => l.toUpperCase());
    }
    
    escapeHtml(text) {
        if (typeof text !== 'string') return text;
        
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
    
    // Export node configuration
    exportNodeConfig() {
        if (!this.currentNode) return null;
        
        return {
            type: this.currentNode.type,
            name: this.currentNode.name,
            description: this.currentNode.description,
            properties: { ...this.currentNode.properties }
        };
    }
    
    // Import node configuration
    importNodeConfig(config) {
        if (!this.currentNode || !config) return;
        
        this.currentNode.name = config.name || this.currentNode.name;
        this.currentNode.description = config.description || this.currentNode.description;
        this.currentNode.properties = { ...config.properties };
        
        // Refresh the properties panel
        this.showNodeProperties(this.currentNode);
        
        // Update node display
        $(`.workflow-node[data-node-id="${this.currentNode.id}"] .node-title`).text(this.currentNode.name);
        
        this.showPropertyFeedback('Configuration imported successfully!', 'success');
    }
}

// PropertiesManager class - initialized externally
