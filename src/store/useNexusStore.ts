// Nexus Desktop Store - Aligned with CLI state management

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { 
  NexusStatus, SwarmTask, ChatMessage, Agent, 
  MemoryStats, WatcherStatus, UserSettings,
  ConnectionStatus
} from '../types';

interface NexusState {
  // Connection & Status
  backend: {
    status: ConnectionStatus;
    error: string | null;
  };
  nexusStatus: NexusStatus | null;
  isConnected: boolean;
  
  // Projects
  currentProjectPath: string | null;
  currentProject: any;
  
  // UI State
  ui: {
    isChatLoading: boolean;
    isSwarmLoading: boolean;
    isMemoryLoading: boolean;
    isLoading: boolean;
  };
  
  // Agents & Swarms
  agents: Agent[];
  swarmTasks: SwarmTask[];
  currentSwarmTask: SwarmTask | null;
  
  // Chat
  messages: ChatMessage[];
  chatHistory: ChatMessage[];
  isStreaming: boolean;
  
  // Memory & Monitoring
  memoryStats: MemoryStats | null;
  watcherStatus: WatcherStatus | null;
  terminalHistory: any[];
  
  // Settings
  settings: UserSettings;
  
  // Actions
  setBackendStatus: (status: ConnectionStatus, error?: string | null) => void;
  setNexusStatus: (status: NexusStatus) => void;
  setCurrentProject: (path: string | null) => void;
  setProjectFromPath: (path: string) => void;
  setAgents: (agents: Agent[]) => void;
  setSwarmTasks: (tasks: SwarmTask[]) => void;
  addMessage: (message: any) => void;
  addChatMessage: (message: ChatMessage) => void;
  updateChatStream: (messageId: string, chunk: string) => void;
  completeChatStream: (messageId: string) => void;
  clearChat: () => void;
  clearChatHistory: () => void;
  setMemoryStats: (stats: MemoryStats) => void;
  setWatcherStatus: (status: WatcherStatus) => void;
  setSettings: (settings: Partial<UserSettings>) => void;
  updateSetting: <K extends keyof UserSettings>(key: K, value: UserSettings[K]) => void;
  resetSettings: () => void;
  
  // Business Logic Methods (Stubs used by UI)
  initializeTauriListeners: () => void;
  loadChatHistory: () => Promise<void>;
  loadSwarmTasks: () => Promise<void>;
  loadMemoryStats: () => Promise<void>;
  loadWatcherStatus: () => Promise<void>;
  checkNexusStatus: () => Promise<void>;
  startSwarmTask: (description: string) => Promise<void>;
  executeCommand: (command: string, dir?: string) => Promise<string>;
  addTerminalOutput: (output: any) => void;
  initMemory: () => Promise<void>;
  consolidateMemory: () => Promise<void>;
  toggleNode: (id: string) => void;
  scanCurrentProject: (path?: string) => Promise<void>;
}

const defaultSettings: UserSettings = {
  theme: 'dark',
  fontSize: 13,
  fontFamily: 'JetBrains Mono',
  sidebarVisible: true,
  terminalVisible: true,
  autoSave: true,
  autoSaveInterval: 30,
  enableNotifications: true,
  soundEffects: false,
  telemetryEnabled: false,
  preferredModel: 'kimi-k2.5',
  sshSettings: {
    host: '89.167.14.222',
    port: 22,
    username: 'root',
    password: '',
    privateKey: '',
    publicKey: ''
  },
  editorSettings: {
    tabSize: 2,
    useSpaces: true,
    wordWrap: true,
    minimap: false,
    lineNumbers: true,
  },
};

export const useNexusStore = create<NexusState>()(
  persist(
    (set, get) => ({
      // Initial State
      backend: {
        status: 'disconnected',
        error: null,
      },
      isConnected: false,
      nexusStatus: null,
      currentProjectPath: null,
      currentProject: null,
      ui: {
        isChatLoading: false,
        isSwarmLoading: false,
        isMemoryLoading: false,
        isLoading: false
      },
      agents: [],
      swarmTasks: [],
      currentSwarmTask: null,
      messages: [],
      chatHistory: [],
      isStreaming: false,
      memoryStats: null,
      watcherStatus: null,
      terminalHistory: [],
      settings: defaultSettings,

      // Setters
      setBackendStatus: (status, error = null) => 
        set((state) => ({ 
          backend: { ...state.backend, status, error },
          isConnected: status === 'connected'
        })),
      
      setNexusStatus: (nexusStatus) => set({ nexusStatus }),
      
      setCurrentProject: (path) => set({ 
        currentProjectPath: path,
        currentProject: path ? { 
          name: path.split('/').pop() || 'Unknown', 
          path, 
          fileTree: [], 
          recentFiles: [], 
          gitStatus: null 
        } : null
      }),

      setProjectFromPath: (path) => get().setCurrentProject(path),
      
      setAgents: (agents) => set({ agents }),
      
      setSwarmTasks: (swarmTasks) => set({ swarmTasks }),
      
      addMessage: (message) => 
        set((state) => ({ 
          messages: [...state.messages, message],
          chatHistory: [...state.chatHistory, message] 
        })),

      addChatMessage: (message) => get().addMessage(message),
      
      updateChatStream: (messageId, chunk) => 
        set((state) => ({
          isStreaming: true,
          messages: state.messages.map(msg => 
            msg.id === messageId ? { ...msg, content: msg.content + chunk } : msg
          )
        })),
        
      completeChatStream: (messageId) =>
        set((state) => ({
          isStreaming: false,
          messages: state.messages.map(msg => 
            msg.id === messageId ? { ...msg, isStreaming: false } : msg
          )
        })),
        
      clearChat: () => set({ messages: [], chatHistory: [] }),
      clearChatHistory: () => get().clearChat(),
      
      setMemoryStats: (memoryStats) => set({ memoryStats }),
      
      setWatcherStatus: (status) => set({ watcherStatus: status }),
      
      setSettings: (newSettings) => 
        set((state) => ({ settings: { ...state.settings, ...newSettings } })),
        
      updateSetting: (key, value) =>
        set((state) => ({ settings: { ...state.settings, [key]: value } })),
        
      resetSettings: () => set({ settings: defaultSettings }),

      addTerminalOutput: (output) => set((state) => ({ terminalHistory: [...state.terminalHistory, output] })),

      // Stubs for build compatibility
      initializeTauriListeners: () => {},
      loadChatHistory: async () => {},
      loadSwarmTasks: async () => {},
      loadMemoryStats: async () => {},
      loadWatcherStatus: async () => {},
      checkNexusStatus: async () => {},
      startSwarmTask: async (_description: string) => {},
      executeCommand: async (_command: string, _dir?: string) => { return ""; },
      initMemory: async () => {},
      consolidateMemory: async () => {},
      toggleNode: (_id: string) => {},
      scanCurrentProject: async (_path?: string) => {},
    }),
    {
      name: 'nexus-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ settings: state.settings }), // Only persist settings
    }
  )
);

// Selection hooks for performance/compatibility
export const useNexusStatus = () => useNexusStore((state) => state.nexusStatus);
export const useWatcherStatus = () => useNexusStore((state) => state.watcherStatus);
export const useCurrentProject = () => useNexusStore((state) => state.currentProject);
export const useAgents = () => useNexusStore((state) => state.agents);
export const useSwarmTasks = () => useNexusStore((state) => state.swarmTasks);
export const useIsConnected = () => useNexusStore((state) => state.isConnected);
export const useMemoryStats = () => useNexusStore((state) => state.memoryStats);
export const useContext = () => useNexusStore((state) => state.currentProject);
export const useTerminalHistory = () => useNexusStore((state) => state.terminalHistory);
export const useSettings = () => useNexusStore((state) => state.settings);
export const useIsStreaming = () => useNexusStore((state) => state.isStreaming);
