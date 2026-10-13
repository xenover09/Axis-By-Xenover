# Axis Video Studio

Axis is a Windows desktop application for creating cinematic motion-graphics videos directly from code, powered by Remotion and Electron.

Code-driven video creation, rendered locally on your PC.

## Download and Installation

For users who want to use the software directly:

1. Download the latest installer (`Axis Setup 1.0.0.exe`) from the GitHub Releases page:
   https://github.com/xenover09/Axis-By-Xenover/releases
2. Run `Axis Setup 1.0.0.exe`.
3. If Windows SmartScreen displays a warning, click "More info" and then "Run anyway" (the installer is an unsigned release).
4. Follow the installer instructions to complete the setup and launch Axis Video Studio from your Start menu or desktop.

## Features

- Code-Driven Motion Graphics: Create video compositions programmatically using React and TypeScript.
- Real-Time Live Preview: Live playback and scrubbing powered by Remotion Player with instant compilation.
- Local Video Rendering: High-performance draft and final MP4 video exports rendered locally using Remotion and FFmpeg.
- Multiple Aspect Ratios: Built-in support for 16:9 (Landscape), 9:16 (Vertical Reels/Shorts), 1:1 (Square), and custom dimensions.
- Resolution and Framerate Controls: Export videos in 720p, 1080p, or 4K with framerate options of 24, 30, or 60 FPS.
- Built-in Monaco Editor: Full code editor with TypeScript syntax highlighting, error checking, and code formatting.
- File and Project Management: Create blank projects, manage multiple files and folders, and import existing project directories.
- Dark Themed Desktop Interface: Native frameless window controls, clean dark theme, and custom dialogs.

## Tech Stack

- Desktop Runtime: Electron
- Frontend Editor: React, Vite, TypeScript, Monaco Editor
- Video Engine: Remotion, Remotion Player
- Headless Render Backend: Node.js, Express, FFmpeg
- Bundler: Vite, esbuild, Rolldown

## Getting Started for Developers

To run or build Axis from source:

### Prerequisites

- Windows 10 or 11 (64-bit)
- Node.js 18 or higher
- npm 9 or higher

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/xenover09/Axis-By-Xenover.git
   cd Axis-By-Xenover
   ```

2. Install all dependencies across root, client, and server:
   ```bash
   npm run install:all
   ```

### Development Mode

Run the desktop application in development mode:
```bash
npm run start:electron
```

Or run frontend and backend dev servers concurrently:
```bash
npm run dev:all
```

### Building the Production Installer

To compile and package the standalone Windows installer:
```bash
npm run dist
```
The generated installer will be located in the `dist/` directory as `Axis Setup 1.0.0.exe`.

## Project Structure

- `client/`: React frontend containing the Monaco code editor, preview canvas, and project management UI.
- `server/`: Express backend coordinating Remotion rendering pipelines, composition packaging, and export jobs.
- `templates/`: Bundled motion graphic template components and styles.
- `main.js`: Electron main process controlling application lifecycle, native menus, and IPC bridges.
- `preload.js`: Secure IPC bridge connecting renderer process with Electron runtime.

## System Requirements

- Operating System: Windows 10 or Windows 11 (64-bit)
- Memory: Minimum 4 GB RAM (8 GB or more recommended for 4K rendering)
- Storage: 1 GB free disk space

## Credits and License

- Built with Electron, Remotion, and FFmpeg.
- Free for personal and commercial use.
- Remotion is subject to its license terms at [remotion.dev/license](https://remotion.dev/license).
- Copyright (c) 2026 Xenover Tools. All rights reserved.

