# Workflow Automation Tool

## Overview

This is a visual workflow automation builder application built with Flask and JavaScript. It provides a drag-and-drop interface for creating automated workflows using various tools like HTTP requests, email sending, and data filtering. The application features a canvas-based visual editor where users can connect different workflow nodes to create complex automation pipelines.

## System Architecture

### Frontend Architecture
- **Technology Stack**: HTML5, CSS3, JavaScript (jQuery), Bootstrap 5, Font Awesome
- **Architecture Pattern**: Component-based client-side architecture with separate modules for different concerns
- **UI Framework**: Bootstrap 5 for responsive design with custom orange/white theme
- **Canvas System**: SVG-based visual workflow editor with drag-and-drop functionality

### Backend Architecture
- **Framework**: Flask (Python web framework)
- **Architecture Pattern**: Simple MVC pattern with Flask routes handling API endpoints
- **Session Management**: Flask sessions with configurable secret key
- **API Structure**: RESTful endpoints for workflow operations

## Key Components

### Frontend Components

1. **Canvas Manager** (`canvas.js`)
   - Handles visual workflow canvas interactions
   - Manages pan, zoom, and viewport operations
   - Supports keyboard shortcuts and mouse interactions
   - Provides scalable SVG-based connection visualization

2. **Properties Manager** (`properties.js`)
   - Manages node property editing interface
   - Handles form validation and real-time updates
   - Loads tool definitions from server
   - Provides dynamic property forms based on node types

3. **Workflow Manager** (`workflow.js`)
   - Core workflow logic and state management
   - Handles node creation, connection, and deletion
   - Manages drag-and-drop functionality
   - Provides workflow serialization and persistence
   - Enhanced connection system with visual feedback

4. **Panel Manager** (`panels.js`)
   - Manages resizable panel layout and interactions
   - Provides search functionality for tools and properties
   - Handles dock/undock operations for side panels
   - Responsive canvas controls and layout adjustments

### Backend Components

1. **Flask Application** (`app.py`)
   - Main application factory and configuration
   - Defines available workflow tools and their properties
   - Handles session management and security

2. **Tool Definitions**
   - HTTP Request tool for API interactions
   - Email sending tool for notifications
   - Data filtering tool for data transformation
   - Extensible architecture for adding new tools

## Data Flow

1. **Tool Loading**: Client loads available tools from server on initialization
2. **Node Creation**: Users drag tools from toolbox to canvas, creating workflow nodes
3. **Property Configuration**: Users configure node properties through dynamic forms
4. **Connection Management**: Users create connections between nodes to define execution flow
5. **Workflow Execution**: Workflows can be saved, loaded, and executed
6. **State Persistence**: Workflow state is managed client-side with server API support

## External Dependencies

### Frontend Dependencies
- **Bootstrap 5.3.0**: UI framework for responsive design
- **Font Awesome 6.4.0**: Icon library for interface elements
- **jQuery 3.x**: DOM manipulation and AJAX operations
- **jQuery UI 1.13.2**: Enhanced UI interactions and widgets

### Backend Dependencies
- **Flask**: Python web framework for server-side logic
- **Standard Library**: Uses built-in Python modules (os, json)

## Deployment Strategy

- **Development**: Flask development server with debug mode enabled
- **Host Configuration**: Configured to run on all interfaces (0.0.0.0:5000)
- **Environment Variables**: Uses environment variables for sensitive configuration
- **Static Assets**: Served directly by Flask for development
- **Session Security**: Configurable secret key with development fallback

## User Preferences

Preferred communication style: Simple, everyday language.

## Recent Changes

- June 28, 2025: Enhanced workflow builder with smaller nodes, improved connection system, resizable panels with search functionality, and dock/undock capabilities for side panels

## Changelog

Changelog:
- June 28, 2025. Initial setup
- June 28, 2025. Added resizable panels, search functionality, improved node connections, and enhanced UI controls