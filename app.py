import os
import json
from flask import Flask, render_template, request, jsonify, session
from datetime import datetime
import uuid

# create the app
app = Flask(__name__)
app.secret_key = os.environ.get("SESSION_SECRET", "dev-secret-key-change-in-production")

# Simple in-memory storage for now to focus on UI improvements
workflow_storage = {}
layout_storage = {}
template_storage = {}
# Initialize default templates
template_storage = {
    "template1": {
        "id": "template1",
        "name": "Simple API Workflow",
        "description": "Basic HTTP request and email notification",
        "workflow_data": {
            "nodes": [
                {"id": "node1", "type": "http_request", "position": {"x": 100, "y": 100}, "properties": {"method": "GET", "url": "https://jsonplaceholder.typicode.com/posts/1"}},
                {"id": "node2", "type": "email_send", "position": {"x": 400, "y": 100}, "properties": {"to": "user@example.com", "subject": "API Response"}}
            ],
            "connections": [{"id": "conn1", "from": "node1", "to": "node2"}]
        }
    },
    "template2": {
        "id": "template2",
        "name": "Data Processing Pipeline",
        "description": "Webhook trigger with data filtering and database storage",
        "workflow_data": {
            "nodes": [
                {"id": "node1", "type": "webhook", "position": {"x": 100, "y": 100}, "properties": {"method": "POST"}},
                {"id": "node2", "type": "data_filter", "position": {"x": 300, "y": 100}, "properties": {"filter_condition": "status == 'active'"}},
                {"id": "node3", "type": "database_query", "position": {"x": 500, "y": 100}, "properties": {"query": "INSERT INTO processed_data (data) VALUES (?)"}}
            ],
            "connections": [{"id": "conn1", "from": "node1", "to": "node2"}, {"id": "conn2", "from": "node2", "to": "node3"}]
        }
    },
    "template3": {
        "id": "template3",
        "name": "File Processing Workflow",
        "description": "Process files with conditional logic and notifications",
        "workflow_data": {
            "nodes": [
                {"id": "node1", "type": "file_processor", "position": {"x": 100, "y": 100}, "properties": {"operation": "read"}},
                {"id": "node2", "type": "condition", "position": {"x": 300, "y": 100}, "properties": {"condition": "file_size > 1000"}},
                {"id": "node3", "type": "email_send", "position": {"x": 500, "y": 50}, "properties": {"subject": "Large file processed"}},
                {"id": "node4", "type": "delay", "position": {"x": 500, "y": 150}, "properties": {"duration": 5}}
            ],
            "connections": [{"id": "conn1", "from": "node1", "to": "node2"}, {"id": "conn2", "from": "node2", "to": "node3"}, {"id": "conn3", "from": "node2", "to": "node4"}]
        }
    }
}

# Available workflow tools/nodes
WORKFLOW_TOOLS = [
    {
        "id": "http_request",
        "name": "HTTP Request",
        "icon": "globe",
        "category": "Web",
        "description": "Make HTTP requests to external APIs",
        "properties": {
            "method": {"type": "select", "options": ["GET", "POST", "PUT", "DELETE"], "default": "GET"},
            "url": {"type": "text", "placeholder": "https://api.example.com/data"},
            "headers": {"type": "textarea", "placeholder": "Content-Type: application/json"},
            "body": {"type": "textarea", "placeholder": "Request body (JSON)"}
        }
    },
    {
        "id": "email_send",
        "name": "Send Email",
        "icon": "envelope",
        "category": "Communication",
        "description": "Send email notifications",
        "properties": {
            "to": {"type": "text", "placeholder": "recipient@example.com"},
            "subject": {"type": "text", "placeholder": "Email subject"},
            "body": {"type": "textarea", "placeholder": "Email body"},
            "smtp_server": {"type": "text", "placeholder": "smtp.gmail.com"},
            "smtp_port": {"type": "number", "default": 587}
        }
    },
    {
        "id": "data_filter",
        "name": "Filter Data",
        "icon": "filter",
        "category": "Data",
        "description": "Filter and transform data",
        "properties": {
            "filter_condition": {"type": "text", "placeholder": "field > 100"},
            "fields_to_keep": {"type": "text", "placeholder": "name, email, id"},
            "sort_by": {"type": "text", "placeholder": "created_date"},
            "limit": {"type": "number", "default": 100}
        }
    },
    {
        "id": "webhook",
        "name": "Webhook",
        "icon": "link",
        "category": "Triggers",
        "description": "Trigger workflow via webhook",
        "properties": {
            "webhook_url": {"type": "text", "readonly": True, "default": "/webhook/{{node_id}}"},
            "method": {"type": "select", "options": ["GET", "POST", "PUT"], "default": "POST"},
            "authentication": {"type": "select", "options": ["None", "API Key", "Basic Auth"], "default": "None"}
        }
    },
    {
        "id": "delay",
        "name": "Delay",
        "icon": "clock",
        "category": "Control",
        "description": "Add delay between actions",
        "properties": {
            "duration": {"type": "number", "default": 5},
            "unit": {"type": "select", "options": ["seconds", "minutes", "hours"], "default": "seconds"}
        }
    },
    {
        "id": "condition",
        "name": "Condition",
        "icon": "code-branch",
        "category": "Control",
        "description": "Branch workflow based on conditions",
        "properties": {
            "condition": {"type": "text", "placeholder": "data.status == 'success'"},
            "true_path": {"type": "text", "placeholder": "Path when condition is true"},
            "false_path": {"type": "text", "placeholder": "Path when condition is false"}
        }
    },
    {
        "id": "database_query",
        "name": "Database Query",
        "icon": "database",
        "category": "Data",
        "description": "Execute database queries",
        "properties": {
            "connection_string": {"type": "text", "placeholder": "postgresql://user:pass@host:port/db"},
            "query": {"type": "textarea", "placeholder": "SELECT * FROM users WHERE active = true"},
            "parameters": {"type": "textarea", "placeholder": "JSON parameters"}
        }
    },
    {
        "id": "file_processor",
        "name": "File Processor",
        "icon": "file-text",
        "category": "Files",
        "description": "Process and manipulate files",
        "properties": {
            "operation": {"type": "select", "options": ["read", "write", "append", "delete"], "default": "read"},
            "file_path": {"type": "text", "placeholder": "/path/to/file.txt"},
            "content": {"type": "textarea", "placeholder": "File content"},
            "encoding": {"type": "select", "options": ["utf-8", "ascii", "latin-1"], "default": "utf-8"}
        }
    }
]

@app.route('/')
def index():
    return render_template('index.html', workflow_tools=WORKFLOW_TOOLS)

@app.route('/api/tools')
def get_tools():
    return jsonify(WORKFLOW_TOOLS)

@app.route('/api/workflow/save', methods=['POST'])
def save_workflow():
    try:
        data = request.json or {}
        workflow_name = data.get('name', f'Workflow {len(workflow_storage) + 1}')
        
        # Create workflows directory if it doesn't exist
        workflows_dir = 'workflows'
        if not os.path.exists(workflows_dir):
            os.makedirs(workflows_dir)
        
        # Sanitize filename
        safe_filename = "".join(c for c in workflow_name if c.isalnum() or c in (' ', '-', '_')).rstrip()
        safe_filename = safe_filename.replace(' ', '_')
        if not safe_filename:
            safe_filename = f'Workflow_{datetime.now().strftime("%Y%m%d_%H%M%S")}'
        
        # Save as JSON file
        file_path = os.path.join(workflows_dir, f"{safe_filename}.json")
        
        # Add metadata
        workflow_data = {
            'name': workflow_name,
            'nodes': data.get('nodes', []),
            'connections': data.get('connections', []),
            'meta': data.get('meta', {}),
            'saved_at': datetime.now().isoformat(),
            'file_path': file_path
        }
        
        with open(file_path, 'w') as f:
            json.dump(workflow_data, f, indent=2)
        
        return jsonify({
            "status": "success", 
            "message": f"Workflow saved as {safe_filename}.json",
            "file_path": file_path,
            "filename": f"{safe_filename}.json"
        })
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500

@app.route('/api/workflow/load/<workflow_id>')
def load_workflow(workflow_id):
    try:
        if workflow_id in workflow_storage:
            return jsonify(workflow_storage[workflow_id])
        elif workflow_id in template_storage:
            return jsonify(template_storage[workflow_id])
        else:
            return jsonify({"status": "error", "message": "Workflow not found"}), 404
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 404

@app.route('/api/workflow/templates')
def get_templates():
    try:
        return jsonify(list(template_storage.values()))
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500

@app.route('/api/layout/save', methods=['POST'])
def save_layout():
    try:
        if 'session_id' not in session:
            session['session_id'] = str(uuid.uuid4())
        
        data = request.json or {}
        session_id = session['session_id']
        
        if session_id not in layout_storage:
            layout_storage[session_id] = {}
        
        if 'panel_state' in data:
            layout_storage[session_id]['panel_state'] = data['panel_state']
        if 'canvas_state' in data:
            layout_storage[session_id]['canvas_state'] = data['canvas_state']
        
        return jsonify({"status": "success", "message": "Layout saved successfully"})
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500

@app.route('/api/layout/load')
def load_layout():
    try:
        if 'session_id' not in session:
            return jsonify({"status": "success", "data": {}})
        
        session_id = session['session_id']
        layout = layout_storage.get(session_id, {})
        
        return jsonify({"status": "success", "data": layout})
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500

@app.route('/api/workflow/delete', methods=['POST'])
def delete_workflow():
    try:
        data = request.json or {}
        workflow_name = data.get('name', '')
        
        # Sanitize filename
        safe_filename = "".join(c for c in workflow_name if c.isalnum() or c in (' ', '-', '_')).rstrip()
        safe_filename = safe_filename.replace(' ', '_')
        
        if not safe_filename:
            return jsonify({"status": "error", "message": "Invalid workflow name"}), 400
        
        # Check if workflows directory exists
        workflows_dir = 'workflows'
        file_path = os.path.join(workflows_dir, f"{safe_filename}.json")
        
        if os.path.exists(file_path):
            os.remove(file_path)
            return jsonify({
                "status": "success", 
                "message": f"Workflow '{workflow_name}' deleted successfully",
                "deleted_file": f"{safe_filename}.json"
            })
        else:
            return jsonify({"status": "error", "message": "Workflow file not found"}), 404
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500

@app.route('/api/workflow/execute', methods=['POST'])
def execute_workflow():
    workflow_data = request.json
    # In a real application, you would execute the workflow
    # For now, just return a success message
    return jsonify({"status": "success", "message": "Workflow execution started"})

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)
