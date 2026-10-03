# Axis

Axis is a Windows desktop software for creating cinematic motion-graphics videos directly from code, powered by Remotion.

## Features
- **Live Preview**: See your edits instantly.
- **Dynamic Templates**: Built-in responsive templates for beautiful motion graphics.
- **Draft & Final Renders**: Fast draft renders for quick feedback, and high-quality final renders for production.
- **Multiple Aspect Ratios**: Support for 16:9, 9:16 (Reels/Shorts), 1:1 (Square), and 4:5.
- **High-Quality Output**: Choose from 720p, 1080p, and 4K resolutions.
- **Smooth FPS**: Supports 24, 30, and 60 fps for cinematic or buttery smooth videos.
- **WYSIWYG Guarantee**: What you see in the preview is exactly what you get in the final render.

## Tech Stack
- **Frontend**: React + Vite + TypeScript
- **Desktop (Phase 2)**: Electron
- **Backend & Rendering Engine**: Express + Remotion

## Quick Start

1. Clone the repository
2. Install all dependencies:
   ```bash
   npm run install:all
   ```
3. Run the development servers (React + Node):
   ```bash
   npm run dev:all
   ```
4. Start the Electron app (in a new terminal):
   ```bash
   npm run start:electron
   ```
   *Note: This command concurrently starts the Vite dev server for the client and the Express backend for Remotion rendering.*

## Project Structure
- `client/`: Contains the React (Vite) frontend for the visual editor and preview.
- `server/`: Contains the Express backend that interfaces with Remotion for headless rendering.
- `templates/`: Contains bundled templates and assets (like fonts) that are shared across the project.
- `main.js` & `preload.js`: Electron initialization scripts (Phase 2).

---
**Note:** Please check the license terms for commercial use of Remotion at [remotion.dev/license](https://remotion.dev/license).

---
&copy; 2026 Faheem ul Hassan. All rights reserved.
