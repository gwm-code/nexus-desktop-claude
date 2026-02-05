# Nexus Desktop

**The ultimate AI coding agent interface** - A Tauri-based desktop app for the Nexus CLI.

## Features

### 🐝 Swarm Visualization (Left Panel)
Watch parallel AI agents working in real-time:
- **Architect Agent**: Decomposes tasks and coordinates workers
- **Frontend Worker**: Handles UI components and styling
- **Backend Worker**: Manages APIs and business logic  
- **QA Worker**: Tests and validates changes

Live status indicators, progress bars, and execution history.

### 💬 Chat Interface (Center)
- Full chat history with markdown rendering
- Code syntax highlighting and copy buttons
- File attachments and suggestions
- Streaming response support
- Auto-resizing input

### 📁 Context Panel (Right)
- **File Tree**: Project structure navigation
- **Recent Files**: Quick access to edited files
- **Memory Stats**: Visual memory usage bars
- **Tool History**: Track all executed commands
- **Git Status**: Branch and changes overview

### 🖥️ Integrated Terminal (Bottom)
- Live xterm.js terminal
- Command history
- Quick action buttons
- Execution output streaming

### 📊 Status Bar
Expandable status panel showing:
- Backend connection status
- Current model and latency
- Git branch and changes
- Swarm statistics
- System resources

## Architecture

**Frontend**: React 18 + TypeScript + Tailwind CSS v4
**Backend**: Tauri (Rust)
**State**: Zustand with persistence
**Terminal**: xterm.js
**Build**: Vite

## Layout

```
┌─────────────────────────────────────────────────────────┐
│ Swarm    │              Chat                  │ Context│
│ Panel    │                                    │ Panel  │
│          │                                    │        │
│ 🏗️ Arch  │   User: Create auth system         │ 📁 src │
│ ⚛️ Front │                                    │ 📄 ... │
│ 🔧 Back  │   Agent: Working on it...        │        │
│ 🧪 QA    │   [Progress: ████████░░]         │ Memory │
│          │                                    │ Stats  │
│          │   [Code block with syntax]         │        │
├─────────────────────────────────────────────────────────┤
│ Terminal                                                │
│ nexus> _                                                │
└─────────────────────────────────────────────────────────┘
```

## Development

```bash
# Install dependencies
npm install

# Run in development mode (with hot reload)
npm run tauri dev

# Build for production
npm run tauri build
```

## Nexus CLI Integration

The desktop app connects to the Nexus CLI daemon:
- Commands are sent via Tauri's invoke API
- Real-time updates via WebSocket
- Shared memory system for context

## Roadmap

- [x] Three-panel resizable layout
- [x] Swarm visualization
- [x] Chat with markdown support
- [x] Integrated terminal
- [x] Context panel with file tree
- [x] Status bar with metrics
- [ ] Live code editor (Monaco)
- [ ] Diff viewer
- [ ] Settings panel
- [ ] Multiple conversation tabs
- [ ] Plugin system

## License

MIT
