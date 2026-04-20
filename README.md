# Countdown Timer Widget

A minimal, always-on-top desktop countdown timer built with React and Electron. Set a time, click to start, and watch the animated progress ring change from green to red as it counts down.

## Features

- **Frameless Glassmorphic Design** – Modern transparent panel with blur effect
- **Always On Top** – Stays visible above other windows
- **Draggable Widget** – Move freely around your screen, snap to any corner
- **Editable Time** – Set minutes and seconds with keyboard input
- **State Machine UI** – Three phases: setup → running → finished
- **Auto-Restart on Hover** – Hover over the clock after time expires to restart
- **No Console Window** – Lightweight executable, clean system integration

## Quick Start

### Development

Install dependencies once:

```bash
npm install
```

Start the dev widget:

```bash
npm run widget
```

The widget launches as a 260×260px frameless window with minimize/close controls.

### Build & Package for Windows

Generate an executable:

```bash
npm run package:win
```

The packaged app is generated at `release/win-unpacked/Countdown Widget.exe`. Create a desktop shortcut to launch it without a console window.

## Project Structure

```
├── src/
│   ├── App.jsx                 # Widget shell with window controls
│   ├── App.css                 # Glassmorphic styling, drag regions
│   ├── components/
│   │   ├── CountdownTimer.jsx  # Timer logic & SVG clock
│   │   └── CountdownTimer.css  # Clock animations
│   └── index.css               # Base dark theme
├── electron/
│   ├── main.js                 # Electron main process
│   └── preload.js              # IPC bridge for window controls
├── vite.config.js              # Vite bundler config
├── eslint.config.js            # Linting rules
└── package.json                # Build scripts & dependencies
```

## Available Scripts

```bash
npm run widget        # Launch dev widget
npm run build         # Bundle with Vite
npm run lint          # Run ESLint
npm run package:win   # Build Windows executable
```

## Technologies

- **React 19** – Component framework
- **Vite 8** – Fast bundler
- **Electron 37** – Desktop runtime
- **electron-builder 26** – Windows packaging

## License

MIT
