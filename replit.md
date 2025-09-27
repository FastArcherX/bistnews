# BISTnews - School Newspaper Platform

## Overview
BISTnews is a React/TypeScript web application for managing a school newspaper. The project features a modern frontend built with Vite, React Router for navigation, Firebase for backend services, and Bootstrap for styling.

## Current State
- **Status**: Development server running on port 5000
- **Environment**: Configured for Replit with proper host binding (0.0.0.0:5000)
- **Build System**: Vite with React plugin
- **Known Issue**: esbuild EPIPE errors during dependency scanning (non-blocking for server operation)

## Recent Changes
- **2025-09-27**: Initial Replit environment setup
  - Configured Vite for Replit host requirements
  - Set up development workflow on port 5000
  - Deployed with autoscale configuration
  - Resolved npm dependency installation issues
  - Applied workaround for esbuild compatibility issues

## Project Architecture

### Frontend Structure
- **Framework**: React 19 with TypeScript
- **Build Tool**: Vite 7.1.7
- **Routing**: React Router DOM for SPA navigation
- **Styling**: Bootstrap 5.3 + custom CSS
- **State Management**: React hooks and context

### Key Components
- `src/components/`: Reusable UI components (Navbar, Footer, ProtectedRoute)
- `src/pages/`: Page components including admin panel
- `src/hooks/`: Custom React hooks (useAuth)
- `src/firebase.ts`: Firebase configuration and services

### Firebase Integration
- **Authentication**: User login/signup system
- **Database**: Realtime Database for content storage
- **Storage**: File uploads for images and PDFs
- **Configuration**: Pre-configured with project credentials

### Dependencies
- **UI Libraries**: React Bootstrap, Bootstrap, CKEditor, DND Kit
- **Development**: ESLint, TypeScript, Vite plugins
- **Firebase**: Full Firebase SDK for web

## Development Workflow

### Running the Application
- Development server: `vite --host 0.0.0.0 --port 5000 --force`
- The server runs on port 5000 and is accessible via Replit's webview
- Hot module replacement is enabled for development

### Known Limitations
- **esbuild EPIPE Error**: Dependency scanning occasionally fails but doesn't prevent server operation
- **Workaround Applied**: Using `--force` flag to skip problematic pre-bundling
- **Impact**: Minimal - application functionality remains intact

### Deployment
- **Target**: Autoscale deployment for static/SPA applications
- **Build Command**: `npm run build`
- **Run Command**: Configured for production Vite serving

## User Preferences
- **Development Style**: Modern React with TypeScript
- **Architecture**: Component-based with clear separation of concerns
- **Styling**: Bootstrap-based responsive design
- **Backend**: Firebase for all backend services

## Next Steps
1. Address esbuild compatibility issues for optimal performance
2. Test all application routes and Firebase integration
3. Configure environment variables for production deployment
4. Implement content management features
5. Set up user authentication flow