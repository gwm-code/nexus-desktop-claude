import React, { useState, useEffect } from 'react';
import { SwarmPanel } from './SwarmPanel';
import { ChatPanel } from './ChatPanel';
import { ContextPanel } from './ContextPanel';
import { TerminalPanel } from './TerminalPanel';
import { StatusBar } from './StatusBar';
import { SettingsModal } from './SettingsModal';
import { useNexusStore } from '../store/useNexusStore';

export const MainLayout: React.FC = () => {
  const [swarmWidth, setSwarmWidth] = useState(300);
  const [contextWidth, setContextWidth] = useState(400);
  const [terminalHeight, setTerminalHeight] = useState(250);
  const [isDraggingSwarm, setIsDraggingSwarm] = useState(false);
  const [isDraggingContext, setIsDraggingContext] = useState(false);
  const [isDraggingTerminal, setIsDraggingTerminal] = useState(false);
  const [showTerminal, setShowTerminal] = useState(true);
  const [showSwarm, setShowSwarm] = useState(true);
  const [showContext, setShowContext] = useState(true);
  const [showSettings, setShowSettings] = useState(false);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isDraggingSwarm) {
        e.preventDefault();
        const newWidth = Math.max(250, Math.min(500, e.clientX));
        setSwarmWidth(newWidth);
      }
      if (isDraggingContext) {
        e.preventDefault();
        const newWidth = Math.max(300, Math.min(600, window.innerWidth - e.clientX));
        setContextWidth(newWidth);
      }
      if (isDraggingTerminal) {
        e.preventDefault();
        const newHeight = Math.max(150, Math.min(500, window.innerHeight - e.clientY));
        setTerminalHeight(newHeight);
      }
    };

    const handleMouseUp = () => {
      setIsDraggingSwarm(false);
      setIsDraggingContext(false);
      setIsDraggingTerminal(false);
    };

    if (isDraggingSwarm || isDraggingContext || isDraggingTerminal) {
      window.addEventListener('mousemove', handleMouseMove, { passive: false });
      window.addEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = isDraggingTerminal ? 'ns-resize' : 'ew-resize';
      document.body.style.userSelect = 'none';
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, [isDraggingSwarm, isDraggingContext, isDraggingTerminal]);

  // Load chat history on mount
  useEffect(() => {
    const { loadChatHistory, loadSwarmTasks, loadMemoryStats, loadWatcherStatus } = useNexusStore.getState();
    
    // Load initial data
    loadChatHistory();
    loadSwarmTasks();
    loadMemoryStats();
    loadWatcherStatus();
  }, []);

  return (
    <div className="flex h-screen w-full overflow-hidden relative">
      {/* Swarm Panel (Left) */}
      {showSwarm && (
        <>
          <div style={{ width: swarmWidth }} className="flex-shrink-0 h-full">
            <SwarmPanel onToggle={() => setShowSwarm(false)} />
          </div>
          <div
            className="w-1 bg-transparent hover:bg-blue-500/50 cursor-ew-resize transition-colors"
            onMouseDown={() => setIsDraggingSwarm(true)}
          />
        </>
      )}

      {/* Main Content (Center) */}
      <div className="flex-1 flex flex-col min-w-0 h-full">
        {/* Chat Area */}
        <div className="flex-1 min-h-0 overflow-hidden">
          <ChatPanel />
        </div>

        {/* Terminal */}
        {showTerminal && (
          <>
            <div
              className="h-1 bg-transparent hover:bg-blue-500/50 cursor-ns-resize transition-colors"
              onMouseDown={() => setIsDraggingTerminal(true)}
            />
            <div style={{ height: terminalHeight }} className="flex-shrink-0">
              <TerminalPanel onClose={() => setShowTerminal(false)} />
            </div>
          </>
        )}
      </div>

      {/* Context Panel (Right) */}
      {showContext && (
        <>
          <div
            className="w-1 bg-transparent hover:bg-blue-500/50 cursor-ew-resize transition-colors"
            onMouseDown={() => setIsDraggingContext(true)}
          />
          <div style={{ width: contextWidth }} className="flex-shrink-0 h-full">
            <ContextPanel onClose={() => setShowContext(false)} />
          </div>
        </>
      )}

      {/* Toggle Buttons (when panels are hidden) */}
      <div className="fixed bottom-16 left-4 flex gap-2 z-50">
        {!showSwarm && (
          <button
            onClick={() => setShowSwarm(true)}
            className="p-2 bg-zinc-800 border border-zinc-700 rounded-lg hover:bg-zinc-700 transition-colors"
            title="Show Swarm Panel"
          >
            <span className="text-xs font-medium">Agents</span>
          </button>
        )}
        {!showContext && (
          <button
            onClick={() => setShowContext(true)}
            className="p-2 bg-zinc-800 border border-zinc-700 rounded-lg hover:bg-zinc-700 transition-colors"
            title="Show Context Panel"
          >
            <span className="text-xs font-medium">Context</span>
          </button>
        )}
        {!showTerminal && (
          <button
            onClick={() => setShowTerminal(true)}
            className="p-2 bg-zinc-800 border border-zinc-700 rounded-lg hover:bg-zinc-700 transition-colors"
            title="Show Terminal"
          >
            <span className="text-xs font-medium">Terminal</span>
          </button>
        )}
      </div>

      {/* Settings Modal Overlay */}
      {showSettings && (
        <SettingsModal onClose={() => setShowSettings(false)} />
      )}

      {/* Status Bar */}
      <StatusBar onOpenSettings={() => setShowSettings(true)} />
    </div>
  );
};

export default MainLayout;
