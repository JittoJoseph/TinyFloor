# SpatialMeet

A lightweight, top-down 2D virtual office experience for real-time presence and communication.

## Project Structure

This is a monorepo containing:

- `/apps/frontend-nextjs`: Next.js frontend with Phaser for 2D rendering
- `/apps/backend-springboot`: Spring Boot backend for WebSocket handling
- `/docs`: Project documentation

## Environment Variables

### Backend (.env)

Create a `.env` file in `apps/backend-springboot/` based on `.env.example`:

```bash
# Server Configuration
PORT=8080

# Database Configuration
MONGODB_URI=mongodb://localhost:27017/spatialmeet

# Security Configuration
JWT_SECRET=your-256-bit-secret-key-here-make-it-long-enough-for-hs256
ADMIN_PASSWORD=admin123

# CORS Configuration
CORS_ORIGINS=http://localhost:3000,http://localhost:3001
```

### Frontend (.env.local)

Create a `.env.local` file in `apps/frontend-nextjs/` based on `.env.example`:

```bash
# Backend API Configuration
NEXT_PUBLIC_BACKEND_URL=http://localhost:8080

# WebSocket Configuration
NEXT_PUBLIC_WS_URL=ws://localhost:8080

# Application Configuration
NEXT_PUBLIC_APP_NAME=SpatialMeet
NEXT_PUBLIC_APP_VERSION=1.0.0

# Feature Flags
NEXT_PUBLIC_ENABLE_DEBUG=false
NEXT_PUBLIC_ENABLE_ANALYTICS=false
```

## Getting Started

### Prerequisites

- Node.js 18+
- Java 17+
- Maven 3.6+
- MongoDB (local or cloud instance)

### Setup

1. Clone the repository
2. **Configure environment variables:**
   - Backend: `cd apps/backend-springboot && ./setup-env.ps1` (Windows) or `./setup-env.sh` (Linux/Mac)
   - Frontend: `cd apps/frontend-nextjs && ./setup-env.ps1` (Windows) or `./setup-env.sh` (Linux/Mac)
3. Install frontend dependencies: `cd apps/frontend-nextjs && npm install`
4. Run the backend: `cd apps/backend-springboot && mvn spring-boot:run`
5. Run the frontend: `cd apps/frontend-nextjs && npm run dev`

## Deployment

### Frontend (Vercel)

1. Connect your GitHub repo to Vercel
2. Set environment variables:
   - `NEXT_PUBLIC_BACKEND_URL`: Your Railway backend URL (e.g., `https://your-app.railway.app`)
   - `NEXT_PUBLIC_WS_URL`: Your Railway WebSocket URL (e.g., `wss://your-app.railway.app`)
   - `NEXT_PUBLIC_APP_NAME`: Your app name
   - `NEXT_PUBLIC_APP_VERSION`: Your app version
3. Deploy

### Backend (Railway)

1. Connect your GitHub repo to Railway
2. Set the root directory to `apps/backend-springboot`
3. Railway will auto-detect Java and deploy
4. Set environment variables:
   - `PORT`: (Railway sets this automatically)
   - `MONGODB_URI`: Your MongoDB connection string
   - `JWT_SECRET`: A secure random string (256-bit)
   - `ADMIN_PASSWORD`: Admin password for basic auth
   - `CORS_ORIGINS`: Comma-separated list of allowed origins
5. Update CORS in `RoomController.java` to allow your Vercel domain

## Features

- Real-time multiplayer presence
- Voice chat proximity system
- Pixel art aesthetic
- Room-based collaboration spaces
