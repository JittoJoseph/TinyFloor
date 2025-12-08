# SpatialMeet

A lightweight, top-down 2D virtual office experience for real-time presence and communication.

## Project Structure

This is a monorepo containing:

- `/apps/frontend-nextjs`: Next.js frontend with Phaser for 2D rendering
- `/apps/backend-springboot`: Spring Boot backend for WebSocket handling
- `/docs`: Project documentation

## Getting Started

### Prerequisites

- Node.js 18+
- Java 17+
- Maven 3.6+

### Setup

1. Clone the repository
2. Install frontend dependencies: `cd apps/frontend-nextjs && npm install`
3. Run the backend: `cd apps/backend-springboot && mvn spring-boot:run`
4. Run the frontend: `cd apps/frontend-nextjs && npm run dev`

## Deployment

### Frontend (Vercel)

1. Connect your GitHub repo to Vercel
2. Set environment variables:
   - `NEXT_PUBLIC_BACKEND_URL`: Your Railway backend URL (e.g., `https://your-app.railway.app`)
   - `NEXT_PUBLIC_WS_URL`: Your Railway WebSocket URL (e.g., `wss://your-app.railway.app`)
3. Deploy

### Backend (Railway)

1. Connect your GitHub repo to Railway
2. Set the root directory to `apps/backend-springboot`
3. Railway will auto-detect Java and deploy
4. Set environment variable: `PORT` (Railway sets this automatically)
5. Update CORS in `RoomController.java` to allow your Vercel domain

## Features

- Real-time multiplayer presence
- Voice chat proximity system
- Pixel art aesthetic
- Room-based collaboration spaces
