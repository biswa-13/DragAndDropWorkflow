from flask_sqlalchemy import SQLAlchemy
from datetime import datetime
import json

db = SQLAlchemy()

class Workflow(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False, default='Untitled Workflow')
    description = db.Column(db.Text)
    workflow_data = db.Column(db.Text)  # JSON string of nodes and connections
    is_template = db.Column(db.Boolean, default=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'description': self.description,
            'workflow_data': json.loads(self.workflow_data) if self.workflow_data else {},
            'is_template': self.is_template,
            'created_at': self.created_at.isoformat(),
            'updated_at': self.updated_at.isoformat()
        }


class UserLayout(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    session_id = db.Column(db.String(100), nullable=False)
    panel_state = db.Column(db.Text)  # JSON string of panel positions and sizes
    canvas_state = db.Column(db.Text)  # JSON string of canvas zoom and position
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    def to_dict(self):
        return {
            'panel_state': json.loads(self.panel_state) if self.panel_state else {},
            'canvas_state': json.loads(self.canvas_state) if self.canvas_state else {}
        }