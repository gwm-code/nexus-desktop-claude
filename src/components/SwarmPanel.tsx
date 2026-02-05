import React, { useState, useCallback } from 'react';
import {
  Bot,
  CheckCircle2,
  XCircle,
  Loader2,
  Circle,
  ChevronLeft,
  Sparkles,
  Clock,
  Terminal,
  Code2,
  Search,
  Layout,
  Server,
  Play,
  Plus,
} from 'lucide-react';
import { useNexusStore, useAgents, useSwarmTasks, useIsConnected } from '../store/useNexusStore';
import type { Agent, AgentStatus, AgentType, SwarmTask } from '../types';

const agentTypeConfig: Record<
  AgentType,
  { icon: React.ReactNode; label: string; color: string }
> = {
  architect: {
    icon: <Layout className="w-4 h-4" />,
    label: 'Architect',
    color: 'text-purple-400',
  },
  frontend: {
    icon: <Code2 className="w-4 h-4" />,
    label: 'Frontend',
    color: 'text-blue-400',
  },
  backend: {
    icon: <Server className="w-4 h-4" />,
    label: 'Backend',
    color: 'text-green-400',
  },
  qa: {
    icon: <Search className="w-4 h-4" />,
    label: 'QA',
    color: 'text-orange-400',
  },
  devops: {
    icon: <Terminal className="w-4 h-4" />,
    label: 'DevOps',
    color: 'text-cyan-400',
  },
  security: {
    icon: <CheckCircle2 className="w-4 h-4" />,
    label: 'Security',
    color: 'text-red-400',
  },
};

const StatusIndicator: React.FC<{ status: AgentStatus }> = ({ status }) => {
  switch (status) {
    case 'working':
      return (
        <div className="flex items-center gap-2">
          <Loader2 className="w-4 h-4 text-blue-400 animate-spin" />
          <span className="text-xs text-blue-400 font-medium">Working</span>
        </div>
      );
    case 'completed':
      return (
        <div className="flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-green-400" />
          <span className="text-xs text-green-400 font-medium">Completed</span>
        </div>
      );
    case 'error':
      return (
        <div className="flex items-center gap-2">
          <XCircle className="w-4 h-4 text-red-400" />
          <span className="text-xs text-red-400 font-medium">Error</span>
        </div>
      );
    case 'paused':
      return (
        <div className="flex items-center gap-2">
          <Circle className="w-4 h-4 text-yellow-400" />
          <span className="text-xs text-yellow-400 font-medium">Paused</span>
        </div>
      );
    default:
      return (
        <div className="flex items-center gap-2">
          <Circle className="w-4 h-4 text-zinc-500" />
          <span className="text-xs text-zinc-500 font-medium">Idle</span>
        </div>
      );
  }
};

const AgentCard: React.FC<{ agent: Agent }> = ({ agent }) => {
  const config = agentTypeConfig[agent.type] || agentTypeConfig['backend'];
  const isWorking = agent.status === 'working';

  return (
    <div
      className={`p-3 rounded-lg border transition-all duration-300 ${
        isWorking
          ? 'bg-zinc-800/80 border-blue-500/30 shadow-lg shadow-blue-500/5'
          : 'bg-zinc-900/50 border-zinc-800 hover:border-zinc-700'
      }`}
    >
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2">
          <div className={`p-1.5 rounded-md bg-zinc-800 ${config.color}`}>{config.icon}</div>
          <div>
            <div className="text-sm font-medium text-zinc-200">{agent.name}</div>
            <div className="text-xs text-zinc-500">{config.label}</div>
          </div>
        </div>
        <StatusIndicator status={agent.status} />
      </div>

      {agent.currentTask && (
        <div className="mt-2 space-y-2">
          <div className="flex items-start gap-2">
            <Terminal className="w-3 h-3 text-zinc-500 mt-0.5 flex-shrink-0" />
            <span className="text-xs text-zinc-400 line-clamp-2">{agent.currentTask}</span>
          </div>

          {isWorking && agent.progress !== undefined && (
            <div className="space-y-1">
              <div className="flex justify-between text-xs">
                <span className="text-zinc-500">Progress</span>
                <span className="text-blue-400">{agent.progress}%</span>
              </div>
              <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-blue-500 to-blue-400 rounded-full transition-all duration-500"
                  style={{ width: `${agent.progress}%` }}
                />
              </div>
            </div>
          )}
        </div>
      )}

      {agent.lastCompletedTask && agent.status === 'completed' && (
        <div className="mt-2 pt-2 border-t border-zinc-800">
          <div className="flex items-center gap-2 text-xs text-zinc-500">
            <CheckCircle2 className="w-3 h-3 text-green-500" />
            <span className="line-clamp-1">{agent.lastCompletedTask}</span>
          </div>
        </div>
      )}
    </div>
  );
};

const SwarmTaskCard: React.FC<{ task: SwarmTask }> = ({ task }) => {
  const isRunning = task.status === 'in_progress';

  return (
    <div
      className={`p-3 rounded-lg border transition-all duration-300 ${
        isRunning
          ? 'bg-zinc-800/80 border-blue-500/30 shadow-lg shadow-blue-500/5'
          : 'bg-zinc-900/50 border-zinc-800 hover:border-zinc-700'
      }`}
    >
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2">
          <div className={`p-1.5 rounded-md bg-zinc-800 ${isRunning ? 'text-blue-400' : 'text-green-400'}`}>
            {isRunning ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
          </div>
          <div>
            <div className="text-sm font-medium text-zinc-200 line-clamp-1">{task.description}</div>
            <div className="text-xs text-zinc-500">{task.subtasks.length} subtasks</div>
          </div>
        </div>
        <span className="text-xs text-zinc-500">{task.progress}%</span>
      </div>

      <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden mt-2">
        <div
          className={`h-full rounded-full transition-all duration-500 ${
            isRunning ? 'bg-gradient-to-r from-blue-500 to-blue-400' : 'bg-green-500'
          }`}
          style={{ width: `${task.progress}%` }}
        />
      </div>

      {task.subtasks.length > 0 && (
        <div className="mt-2 space-y-1">
          {task.subtasks.slice(0, 3).map((subtask) => (
            <div key={subtask.id} className="flex items-center gap-2 text-xs">
              {subtask.status === 'completed' ? (
                <CheckCircle2 className="w-3 h-3 text-green-500" />
              ) : subtask.status === 'in_progress' ? (
                <Loader2 className="w-3 h-3 text-blue-400 animate-spin" />
              ) : (
                <Circle className="w-3 h-3 text-zinc-600" />
              )}
              <span className={subtask.status === 'completed' ? 'text-zinc-500' : 'text-zinc-400'}>
                {subtask.description}
              </span>
            </div>
          ))}
          {task.subtasks.length > 3 && (
            <p className="text-xs text-zinc-600 pl-5">+{task.subtasks.length - 3} more</p>
          )}
        </div>
      )}
    </div>
  );
};

const PulsingDot: React.FC = () => (
  <span className="relative flex h-2.5 w-2.5">
    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-blue-500"></span>
  </span>
);

interface SwarmPanelProps {
  onToggle: () => void;
}

export const SwarmPanel: React.FC<SwarmPanelProps> = ({ onToggle }) => {
  const [showNewTaskModal, setShowNewTaskModal] = useState(false);
  const [newTaskDescription, setNewTaskDescription] = useState('');
  const [activeTab, setActiveTab] = useState<'agents' | 'tasks'>('agents');
  
  const agents = useAgents();
  const swarmTasks = useSwarmTasks();
  const { startSwarmTask, currentSwarmTask, ui } = useNexusStore();
  const isConnected = useIsConnected();

  const activeAgents = agents.filter((a) => a.status === 'working');
  const completedTasks = agents.filter((a) => a.lastCompletedTask).length;
  const errorCount = agents.filter((a) => a.status === 'error').length;
  const runningSwarms = swarmTasks.filter((t) => t.status === 'in_progress');

  const handleStartSwarm = useCallback(async () => {
    if (!newTaskDescription.trim()) return;
    
    try {
      await startSwarmTask(newTaskDescription);
      setNewTaskDescription('');
      setShowNewTaskModal(false);
    } catch (error) {
      console.error('Failed to start swarm task:', error);
    }
  }, [newTaskDescription, startSwarmTask]);

  return (
    <div className="h-full flex flex-col bg-zinc-950 border-r border-zinc-800">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-zinc-800">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="p-2 bg-gradient-to-br from-blue-500/20 to-purple-500/20 rounded-lg border border-blue-500/30">
              <Bot className="w-5 h-5 text-blue-400" />
            </div>
            {activeAgents.length > 0 && (
              <div className="absolute -top-0.5 -right-0.5">
                <PulsingDot />
              </div>
            )}
          </div>
          <div>
            <h2 className="text-sm font-semibold text-zinc-100">Swarm</h2>
            <div className="flex items-center gap-2 text-xs">
              <span className="text-zinc-500">{activeAgents.length} active</span>
              {errorCount > 0 && <span className="text-red-400">• {errorCount} error</span>}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {isConnected && (
            <button
              onClick={() => setShowNewTaskModal(true)}
              className="p-1.5 bg-blue-500/20 hover:bg-blue-500/30 rounded-md transition-colors"
              title="Start New Swarm Task"
            >
              <Plus className="w-4 h-4 text-blue-400" />
            </button>
          )}
          <button
            onClick={onToggle}
            className="p-1.5 hover:bg-zinc-800 rounded-md transition-colors group"
            title="Hide Panel"
          >
            <ChevronLeft className="w-4 h-4 text-zinc-500 group-hover:text-zinc-300" />
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-zinc-800">
        {[
          { id: 'agents', label: 'Agents' },
          { id: 'tasks', label: `Tasks (${swarmTasks.length})` },
        ].map(({ id, label }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id as typeof activeTab)}
            className={`flex-1 py-2 text-xs font-medium transition-colors border-b-2 ${
              activeTab === id
                ? 'text-zinc-200 border-blue-500'
                : 'text-zinc-500 border-transparent hover:text-zinc-300'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Current Task */}
      {currentSwarmTask && (
        <div className="px-4 py-3 bg-zinc-900/50 border-b border-zinc-800">
          <div className="flex items-center gap-2 mb-1">
            <Sparkles className="w-3.5 h-3.5 text-yellow-400" />
            <span className="text-xs font-medium text-zinc-400 uppercase tracking-wide">
              Current Task
            </span>
          </div>
          <p className="text-sm text-zinc-200 font-medium leading-relaxed line-clamp-2">
            {currentSwarmTask.description}
          </p>
          {currentSwarmTask.progress > 0 && (
            <div className="mt-2">
              <div className="h-1 bg-zinc-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-blue-500 rounded-full transition-all duration-500"
                  style={{ width: `${currentSwarmTask.progress}%` }}
                />
              </div>
              <div className="flex justify-between text-xs mt-1">
                <span className="text-zinc-500">{currentSwarmTask.progress}% complete</span>
                <span className="text-blue-400">{currentSwarmTask.status}</span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Stats Overview */}
      <div className="grid grid-cols-3 gap-2 p-3 border-b border-zinc-800">
        <div className="text-center p-2 bg-zinc-900/50 rounded-md">
          <div className="text-lg font-semibold text-blue-400">{activeAgents.length}</div>
          <div className="text-xs text-zinc-500">Active</div>
        </div>
        <div className="text-center p-2 bg-zinc-900/50 rounded-md">
          <div className="text-lg font-semibold text-green-400">{completedTasks}</div>
          <div className="text-xs text-zinc-500">Done</div>
        </div>
        <div className="text-center p-2 bg-zinc-900/50 rounded-md">
          <div className="text-lg font-semibold text-zinc-400">{agents.length}</div>
          <div className="text-xs text-zinc-500">Total</div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {activeTab === 'agents' && (
          <div className="p-3 space-y-2">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-zinc-500 uppercase tracking-wide">
                Agents
              </span>
              <div className="flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
                <span className="text-xs text-zinc-500">Online</span>
              </div>
            </div>

            {agents.length === 0 ? (
              <div className="text-center py-8 text-zinc-500">
                <Bot className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No agents active</p>
                <p className="text-xs mt-1 opacity-70">Start a task to see agents</p>
              </div>
            ) : (
              agents.map((agent) => <AgentCard key={agent.id} agent={agent} />)
            )}

            {/* Recent Activity */}
            {completedTasks > 0 && (
              <div className="mt-4 pt-4 border-t border-zinc-800">
                <div className="flex items-center gap-2 mb-3">
                  <Clock className="w-3.5 h-3.5 text-zinc-500" />
                  <span className="text-xs font-medium text-zinc-500 uppercase tracking-wide">
                    Recent
                  </span>
                </div>
                <div className="space-y-2">
                  {agents
                    .filter((a) => a.lastCompletedTask)
                    .slice(0, 3)
                    .map((agent) => (
                      <div key={agent.id} className="flex items-start gap-2 text-xs">
                        <CheckCircle2 className="w-3 h-3 text-green-500 mt-0.5 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-zinc-400 line-clamp-1">{agent.lastCompletedTask}</p>
                          <p className="text-zinc-600 mt-0.5">{agent.name}</p>
                        </div>
                        {agent.completedAt && (
                          <span className="text-zinc-600 flex-shrink-0">
                            {new Date(agent.completedAt).toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                        )}
                      </div>
                    ))}
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'tasks' && (
          <div className="p-3 space-y-2">
            {swarmTasks.length === 0 ? (
              <div className="text-center py-8 text-zinc-500">
                <Play className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No swarm tasks yet</p>
                <p className="text-xs mt-1 opacity-70">Start a task to begin</p>
                {isConnected && (
                  <button
                    onClick={() => setShowNewTaskModal(true)}
                    className="mt-3 px-3 py-1.5 bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 rounded text-xs transition-colors"
                  >
                    Start First Task
                  </button>
                )}
              </div>
            ) : (
              swarmTasks.map((task) => <SwarmTaskCard key={task.id} task={task} />)
            )}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="p-3 border-t border-zinc-800 bg-zinc-900/30">
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <div className="flex -space-x-1">
              {agents.slice(0, 3).map((agent, i) => (
                <div
                  key={agent.id}
                  className={`w-5 h-5 rounded-full border-2 border-zinc-950 flex items-center justify-center ${
                    agent.status === 'working' ? 'bg-blue-500/20' : 'bg-zinc-800'
                  }`}
                  style={{ zIndex: 3 - i }}
                >
                  <span className="text-[8px] font-medium text-zinc-400">
                    {agent.name.charAt(0).toUpperCase()}
                  </span>
                </div>
              ))}
              {agents.length > 3 && (
                <div className="w-5 h-5 rounded-full border-2 border-zinc-950 bg-zinc-800 flex items-center justify-center">
                  <span className="text-[8px] font-medium text-zinc-400">
                    +{agents.length - 3}
                  </span>
                </div>
              )}
            </div>
            <span className="text-zinc-500">
              {agents.length} agent{agents.length !== 1 ? 's' : ''}
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            <div
              className={`w-1.5 h-1.5 rounded-full ${
                runningSwarms.length > 0 ? 'bg-blue-500 animate-pulse' : 'bg-zinc-600'
              }`}
            />
            <span className="text-zinc-400">
              {runningSwarms.length > 0 ? 'Swarm Active' : 'Idle'}
            </span>
          </div>
        </div>
      </div>

      {/* New Task Modal */}
      {showNewTaskModal && (
        <div className="absolute inset-0 bg-zinc-950/80 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 w-96 shadow-2xl">
            <h3 className="text-sm font-semibold text-zinc-200 mb-3">Start New Swarm Task</h3>
            <textarea
              value={newTaskDescription}
              onChange={(e) => setNewTaskDescription(e.target.value)}
              placeholder="Describe the task you want the swarm to execute..."
              className="w-full h-24 bg-zinc-950 border border-zinc-800 rounded-lg p-3 text-sm text-zinc-300 placeholder:text-zinc-600 focus:outline-none focus:border-blue-500 resize-none"
            />
            <div className="flex justify-end gap-2 mt-3">
              <button
                onClick={() => {
                  setShowNewTaskModal(false);
                  setNewTaskDescription('');
                }}
                className="px-3 py-1.5 text-xs text-zinc-400 hover:text-zinc-300 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleStartSwarm}
                disabled={!newTaskDescription.trim() || ui.isLoading}
                className="px-3 py-1.5 bg-blue-500 hover:bg-blue-600 disabled:bg-zinc-800 disabled:text-zinc-600 text-white rounded text-xs font-medium transition-colors flex items-center gap-1"
              >
                {ui.isLoading ? (
                  <>
                    <Loader2 className="w-3 h-3 animate-spin" />
                    Starting...
                  </>
                ) : (
                  <>
                    <Play className="w-3 h-3" />
                    Start Task
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SwarmPanel;
