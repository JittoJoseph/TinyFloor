# SpatialMeet

[![Live Demo](https://img.shields.io/badge/Live_Demo-spatialmeet--app.vercel.app-007acc)](https://spatialmeet-app.vercel.app/)

[![Backend Build](https://img.shields.io/github/checks-status/JittoJoseph/SpacialMeet/master?label=backend)](https://github.com/JittoJoseph/SpacialMeet/deployments)
[![Frontend Build](https://img.shields.io/github/checks-status/JittoJoseph/SpacialMeet/master?label=frontend)](https://github.com/JittoJoseph/SpacialMeet/deployments)
[![Health Check](https://img.shields.io/website?url=https://spatialmeet-app.vercel.app&label=health)](https://spatialmeet-app.vercel.app)

A lightweight, top-down 2D virtual office experience for real-time presence and communication.

## Overview

SpatialMeet creates immersive virtual office environments where team members can interact naturally through proximity-based communication. Walk around pixel-art office spaces, engage in real-time conversations when near colleagues, and collaborate in shared digital rooms with persistent user profiles and customizable avatars.

## Features

- **Real-time Multiplayer Presence**: See colleagues moving around shared office maps in real-time with smooth animations
- **Proximity-Based Communication**: Voice, video, and text chat automatically activate when users are nearby, with automatic call termination when moving apart
- **Multiple Rooms**: Create public or private rooms with customizable settings, passwords, and media permissions
- **Avatar Customization**: Choose from various character appearances, outfits, and accessories for personalized presence
- **User Authentication**: Secure login system with persistent user profiles stored in MongoDB
- **Pixel Art Aesthetic**: Nostalgic 2D graphics inspired by classic office environments with tile-based movement
- **Cross-Platform Support**: Works on desktop and mobile browsers with WebRTC support for peer-to-peer communication

## Project Structure

This monorepo contains:

- `apps/frontend-nextjs/`: Next.js frontend with Phaser.js for 2D game rendering, real-time interactions, and WebRTC handling
- `apps/backend-springboot/`: Spring Boot backend handling WebSocket connections, user authentication, room management, and MongoDB persistence

## Tech Stack

- **Frontend**: Next.js, React, TypeScript, Phaser.js, Tailwind CSS
- **Backend**: Spring Boot, Java, WebSocket, MongoDB
- **Real-time Communication**: WebRTC for peer-to-peer audio/video, WebSocket for signaling and game state
- **Database**: MongoDB for user profiles, room metadata, and persistent data
- **Deployment**: Vercel (frontend), Railway (backend)

## Getting Started

SpatialMeet requires Node.js 18+, Java 17+, Maven 3.6+, and MongoDB. The application consists of a Next.js frontend and Spring Boot backend that communicate via WebSocket and REST APIs for real-time multiplayer functionality.
