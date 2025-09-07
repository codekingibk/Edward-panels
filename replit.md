# Edward Panels - Node.js Hosting Platform

## Overview

Edward Panels is a Node.js hosting platform that provides users with project management capabilities, terminal access, and administrative features. The application is built as a full-stack web platform with a React frontend and Express.js backend, featuring user authentication through Replit's OAuth system, project lifecycle management, and a coin-based system for resource allocation.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript using Vite as the build tool
- **UI Components**: Radix UI primitives with shadcn/ui component library
- **Styling**: Tailwind CSS with CSS custom properties for theming (light/dark mode support)
- **State Management**: TanStack Query (React Query) for server state management
- **Routing**: Wouter for client-side routing
- **Forms**: React Hook Form with Zod validation through Hookform resolvers

### Backend Architecture
- **Runtime**: Node.js with Express.js server framework
- **Language**: TypeScript with ES modules
- **API Design**: RESTful API with JSON responses
- **Authentication**: Replit OAuth integration using OpenID Connect with Passport.js
- **Session Management**: Express sessions with PostgreSQL storage via connect-pg-simple
- **File Operations**: Built-in Node.js fs/promises for project folder management
- **Process Management**: Child process spawning for project execution

### Data Storage Solutions
- **Database**: PostgreSQL with Drizzle ORM for type-safe database operations
- **Database Provider**: Neon Database (@neondatabase/serverless)
- **Schema Management**: Drizzle Kit for migrations and schema changes
- **Tables**: Users, projects, activities, system settings, and session storage
- **Session Storage**: PostgreSQL-backed session store for authentication persistence

### Authentication and Authorization
- **Provider**: Replit OAuth using OpenID Connect protocol
- **Strategy**: Passport.js with custom OpenID Connect strategy
- **Session Security**: HTTP-only cookies with secure flag and configurable TTL
- **Access Control**: Role-based access with admin privileges for system management
- **User Management**: Automatic user creation/updates on authentication

### Project Management System
- **Project Lifecycle**: Create, start, stop, delete operations
- **File System**: Dedicated folder structure per project with configurable templates
- **Resource Management**: Coin-based system for project creation costs
- **Status Tracking**: Real-time project status monitoring (running, stopped, error)
- **Activity Logging**: Comprehensive activity tracking for user actions

### Development and Production Setup
- **Development**: Vite dev server with HMR, Replit integration plugins
- **Production**: Static file serving with Express, esbuild for server bundling
- **Environment**: Separate development and production configurations
- **Build Process**: Client-side Vite build, server-side esbuild compilation

## External Dependencies

### Core Database Integration
- **Neon Database**: Serverless PostgreSQL provider for data persistence
- **Drizzle ORM**: Type-safe database queries and schema management
- **Connection**: Environment variable-based database URL configuration

### Authentication Services
- **Replit OAuth**: Primary authentication provider using OpenID Connect
- **Discovery Endpoint**: Automatic OIDC configuration discovery
- **Token Management**: JWT token handling with refresh capabilities

### UI and Component Libraries
- **Radix UI**: Primitive components for accessible UI elements
- **shadcn/ui**: Pre-built component system built on Radix UI
- **Lucide React**: Icon library for consistent iconography
- **Tailwind CSS**: Utility-first CSS framework for styling

### Development Tools
- **Vite**: Frontend build tool with React plugin support
- **TypeScript**: Static typing for both frontend and backend
- **esbuild**: Fast bundler for production server builds
- **Replit Plugins**: Development environment integration tools

### Runtime Dependencies
- **Express.js**: Web server framework with middleware support
- **Passport.js**: Authentication middleware with OpenID Connect strategy
- **TanStack Query**: Server state management and caching
- **React Router**: Client-side routing with Wouter library
- **Form Handling**: React Hook Form with Zod schema validation