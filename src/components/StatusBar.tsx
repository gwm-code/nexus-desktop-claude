import React, { useState, useEffect } from 'react';
import {
  Wifi,
  WifiOff,
  Cpu,
  Zap,
  Clock,
  GitBranch,
  Folder,
  CheckCircle2,
  RefreshCw,
  Settings,
  ChevronUp,
  ChevronDown,
  Activity,
  HardDrive,
  Bot,
} from 'lucide-react';
import { useNexusStore, useNexusStatus, useWatcherStatus, useCurrentProject } from '../store/useNexusStore';
import type { ConnectionStatus } from '../types';

const PulsingDot: React.FC<{ color: string }> = ({ color }) => (
  <span className="relative flex h-2 w-2">
    <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${color} opacity-75`} />
    <span className={`relative inline-flex rounded-full h-2 w-2 ${color.replace('/75', '')}`} />
  </span>
);

const StatusIndicator: React.FC<{ status: ConnectionStatus }> = ({ status }) => {
  switch (status) {
    case 'connected':
      return (
        <div className="flex items-center gap-2">
          <PulsingDot color="bg-green-500" />
          <Wifi className="w-3.5 h-3.5 text-green-400" />
          <span className="text-xs text-green-400">Connected</span>
        </div>
      );
    case 'connecting':
      return (
        <div className="flex items-center gap-2">
          <RefreshCw className="w-3.5 h-3.5 text-yellow-400 animate-spin" />
          <span className="text-xs text-yellow-400">Connecting...</span>
        </div>
      );
    case 'error':
      return (
        <div className="flex items-center gap-2">
          <WifiOff className="w-3.5 h-3.5 text-red-400" />
          <span className="text-xs text-red-400">Error</span>
        </div>
      );
    default:
      return (
        <div className="flex items-center gap-2">
          <WifiOff className="w-3.5 h-3.5 text-zinc-500" />
          <span className="text-xs text-zinc-500">Disconnected</span>
        </div>
      );
  }
};

const ProgressBar: React.FC<{ value: number; max?: number; color?: string }> = ({
  value,
  max = 100,
  color = 'bg-blue-500',
}) => {
  const percentage = Math.min((value / max) * 100, 100);
  return (
    <div className="w-16 h-1 bg-zinc-800 rounded-full overflow-hidden">
      <div className={`h-full rounded-full transition-all duration-300 ${color}`} style={{ width: `${percentage}%` }} />
    </div>
  );
};

interface StatusBarProps {
  onOpenSettings: () => void;
}

export const StatusBar: React.FC<StatusBarProps> = ({ onOpenSettings }) => {
  const [showExpanded, setShowExpanded] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());

  const backend = useNexusStore((state) => state.backend);
  const nexusStatus = useNexusStatus();
  const watcherStatus = useWatcherStatus();
  const currentProject = useCurrentProject();
  const { agents, swarmTasks, checkNexusStatus, memoryStats } = useNexusStore();

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };

  const formatBytes = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const activeAgents = agents.filter((a) => a.status === 'working');
  const runningSwarms = swarmTasks.filter((t) => t.status === 'in_progress');
  const completedTasks = agents.filter((a) => a.lastCompletedTask).length;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50">
      {/* Expanded Panel */}
      {showExpanded && (
        <div className="bg-zinc-900/95 backdrop-blur-sm border-t border-zinc-800 px-4 py-3">
          <div className="grid grid-cols-4 gap-4">
            {/* Connection Details */}
            <div className="space-y-2">
              <h4 className="text-[10px] font-medium text-zinc-500 uppercase tracking-wider">Connection</h4>
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-zinc-400">Status</span>
                  <StatusIndicator status={backend.status} />
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-zinc-400">CLI</span>
                  <span className={nexusStatus?.nexusInstalled ? 'text-green-400' : 'text-red-400'}>
                    {nexusStatus?.nexusInstalled ? 'Installed' : 'Not Found'}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-zinc-400">Version</span>
                  <span className="text-zinc-300">{nexusStatus?.version || 'Unknown'}</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-zinc-400">Provider</span>
                  <span className="text-zinc-300">{nexusStatus?.provider || 'None'}</span>
                </div>
              </div>
            </div>

            {/* Project Details */}
            <div className="space-y-2">
              <h4 className="text-[10px] font-medium text-zinc-500 uppercase tracking-wider">Project</h4>
              <div className="space-y-1.5">
                <div className="flex items-center gap-2 text-xs">
                  <Folder className="w-3.5 h-3.5 text-zinc-500" />
                  <span className="text-zinc-400 truncate max-w-[150px]">
                    {currentProject?.path || 'No project selected'}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <GitBranch className="w-3.5 h-3.5 text-purple-400" />
                  <span className="text-zinc-300">{currentProject?.name || '-'}</span>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <CheckCircle2 className="w-3.5 h-3.5 text-green-400" />
                  <span className="text-zinc-400">
                    {agents.length} agents available
                  </span>
                </div>
              </div>
            </div>

            {/* Swarm Status */}
            <div className="space-y-2">
              <h4 className="text-[10px] font-medium text-zinc-500 uppercase tracking-wider">Swarm</h4>
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-zinc-400">Active Agents</span>
                  <div className="flex items-center gap-2">
                    <Activity className="w-3 h-3 text-blue-400" />
                    <span className="text-zinc-300">{activeAgents.length}</span>
                  </div>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-zinc-400">Running Tasks</span>
                  <div className="flex items-center gap-2">
                    <Bot className="w-3 h-3 text-yellow-400" />
                    <span className="text-zinc-300">{runningSwarms.length}</span>
                  </div>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-zinc-400">Completed Today</span>
                  <span className="text-green-400">{completedTasks}</span>
                </div>
              </div>
            </div>

            {/* System Resources */}
            <div className="space-y-2">
              <h4 className="text-[10px] font-medium text-zinc-500 uppercase tracking-wider">Resources</h4>
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-zinc-400">Memory</span>
                  <div className="flex items-center gap-2">
                    <span className="text-zinc-500">
                      {memoryStats ? formatBytes(memoryStats.sizeBytes) : '-'}
                    </span>
                    <ProgressBar 
                      value={memoryStats?.totalMemories || 0} 
                      max={1000} 
                      color="bg-purple-500" 
                    />
                  </div>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-zinc-400">Watcher</span>
                  <div className="flex items-center gap-2">
                    <span className={watcherStatus?.isRunning ? 'text-green-400' : 'text-zinc-500'}>
                      {watcherStatus?.isRunning ? 'Active' : 'Stopped'}
                    </span>
                  </div>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-zinc-400">Errors Fixed</span>
                  <span className="text-green-500">{watcherStatus?.errorsFixed || 0}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Status Bar */}
      <div className="bg-zinc-950/95 backdrop-blur-sm border-t border-zinc-800 px-4 py-2 flex items-center justify-between">
        {/* Left Section */}
        <div className="flex items-center gap-6">
          {/* Connection */}
          <StatusIndicator status={backend.status} />

          {/* Provider/Model */}
          <div className="flex items-center gap-2">
            <Cpu className="w-3.5 h-3.5 text-zinc-500" />
            <span className="text-xs text-zinc-400">
              {nexusStatus?.model || 'Nexus'}
            </span>
          </div>

          {/* Project */}
          {currentProject && (
            <div className="flex items-center gap-2">
              <Folder className="w-3.5 h-3.5 text-zinc-500" />
              <span className="text-xs text-zinc-400 truncate max-w-[150px]">
                {currentProject.name}
              </span>
            </div>
          )}
        </div>

        {/* Right Section */}
        <div className="flex items-center gap-6">
          {/* Swarm Summary */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 text-blue-400" />
              <span className="text-xs text-zinc-400">
                {activeAgents.length} active
              </span>
            </div>
            {runningSwarms.length > 0 && (
              <div className="flex items-center gap-1.5">
                <Bot className="w-3.5 h-3.5 text-yellow-400" />
                <span className="text-xs text-yellow-400">{runningSwarms.length} swarm</span>
              </div>
            )}
          </div>

          {/* Resources Mini */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5">
              <HardDrive className="w-3 h-3 text-zinc-500" />
              <span className="text-xs text-zinc-500">
                {memoryStats ? formatBytes(memoryStats.sizeBytes) : '-'}
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <Clock className="w-3 h-3 text-zinc-500" />
              <span className="text-xs text-zinc-500">{formatTime(currentTime)}</span>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 border-l border-zinc-800 pl-4">
            <button
              onClick={() => checkNexusStatus()}
              className="p-1 hover:bg-zinc-800 rounded transition-colors"
              title="Refresh connection"
            >
              <RefreshCw className="w-3.5 h-3.5 text-zinc-500" />
            </button>
            <button
              onClick={() => setShowExpanded(!showExpanded)}
              className="flex items-center gap-1 p-1 hover:bg-zinc-800 rounded transition-colors"
              title={showExpanded ? 'Collapse' : 'Expand'}
            >
              {showExpanded ? (
                <ChevronDown className="w-3.5 h-3.5 text-zinc-500" />
              ) : (
                <ChevronUp className="w-3.5 h-3.5 text-zinc-500" />
              )}
            </button>
            <button 
              onClick={onOpenSettings}
              className="p-1 hover:bg-zinc-800 rounded transition-colors" 
              title="Settings"
            >
              <Settings className="w-3.5 h-3.5 text-zinc-500" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StatusBar;
