// Nexus Desktop Types - Aligned with CLI data structures

// ============================================================================
// Core Types
// ============================================================================

export type AgentType = 'architect' | 'frontend' | 'backend' | 'qa' | 'devops' | 'security';
export type AgentStatus = 'idle' | 'working' | 'completed' | 'error' | 'paused';
export type TaskStatus = 'pending' | 'in_progress' | 'completed' | 'failed' | 'cancelled';
export type MessageRole = 'user' | 'assistant' | 'system';

// ============================================================================
// Agent Types
// ============================================================================

export interface Agent {
  id: string;
  name: string;
  type: AgentType;
  status: AgentStatus;
  currentTask?: string;
  progress?: number;
  lastCompletedTask?: string;
  completedAt?: string;
  metadata?: Record<string, unknown>;
  capabilities?: string[];
  cost?: number;
  tokensUsed?: number;
}

export interface WorkerInfo {
  workerType: AgentType;
  name: string;
  status: AgentStatus;
  currentTask?: string;
  progress: number;
  lastResult?: string;
}

// ============================================================================
// Swarm Types
// ============================================================================

export interface SwarmTask {
  id: string;
  description: string;
  status: TaskStatus;
  subtasks: Subtask[];
  progress: number;
  createdAt: string;
  startedAt?: string;
  completedAt?: string;
}

export interface Subtask {
  id: string;
  description: string;
  agentType: AgentType;
  status: TaskStatus;
  dependencies: string[];
  output?: string;
  filesModified?: string[];
  executionTimeMs?: number;
}

export interface SwarmConfig {
  maxConcurrentWorkers: number;
  maxRetries: number;
  taskTimeoutSecs: number;
  autoMerge: boolean;
}

export interface SwarmResult {
  taskId: string;
  success: boolean;
  subtaskResults: SubtaskResult[];
  mergedFiles: string[];
  conflicts: MergeConflict[];
  executionTimeMs: number;
}

export interface SubtaskResult {
  taskId: string;
  workerType: AgentType;
  success: boolean;
  output: string;
  filesModified: string[];
  executionTimeMs: number;
}

export interface MergeConflict {
  filePath: string;
  workerA: string;
  workerB: string;
  resolution: 'auto_merged' | 'manual_required' | 'skipped';
}

// ============================================================================
// Chat Types
// ============================================================================

export interface ChatMessage {
  id: string;
  role: MessageRole;
  content: string;
  timestamp: string;
  isStreaming?: boolean;
  agentId?: string;
  attachments?: FileAttachment[];
  metadata?: {
    model?: string;
    tokens?: number;
    latency?: number;
  };
}

export interface FileAttachment {
  id: string;
  name: string;
  type: string;
  size: number;
  path?: string;
  content?: string;
}

export interface StreamingChunk {
  messageId: string;
  chunk: string;
}

// ============================================================================
// File System Types
// ============================================================================

export interface FileNode {
  id: string;
  name: string;
  type: 'file' | 'directory';
  path: string;
  children?: FileNode[];
  size?: number;
  lastModified?: string;
  isExpanded?: boolean;
  isSelected?: boolean;
}

// Extended file tree node with UI properties
export interface FileTreeNode extends FileNode {
  metadata?: {
    size?: number;
    modifiedAt?: string;
    language?: string;
    isModified?: boolean;
    isIgnored?: boolean;
  };
}

export interface ProjectContext {
  path: string;
  name: string;
  filesScanned: number;
  totalSize: number;
  fileTree: FileNode[];
  gitBranch?: string;
  gitStatus?: GitStatus;
}

export interface GitStatus {
  branch: string;
  ahead: number;
  behind: number;
  modified: string[];
  staged: string[];
  untracked: string[];
  conflicted: string[];
}

// ============================================================================
// Memory Types
// ============================================================================

export interface MemoryStats {
  totalMemories: number;
  eventsCount: number;
  graphEntities: number;
  vectorDocuments: number;
  sizeBytes: number;
  lastUpdated: string;
}

export interface GraphStats {
  entities: number;
  relationships: number;
  connectedComponents: number;
}

export interface MemoryResult {
  type: 'semantic' | 'episodic' | 'procedural';
  content?: string;
  score?: number;
  entity?: string;
  entityType?: string;
  properties?: Record<string, string>;
  timestamp?: string;
}

// ============================================================================
// MCP Types
// ============================================================================

export interface McpServer {
  name: string;
  connected: boolean;
  tools: McpTool[];
  resources?: McpResource[];
}

export interface McpTool {
  name: string;
  description: string;
  inputSchema?: Record<string, unknown>;
}

export interface McpResource {
  uri: string;
  name: string;
  mimeType?: string;
}

export interface McpCallResult {
  content: Array<{
    type: string;
    text?: string;
    data?: unknown;
  }>;
  isError?: boolean;
}

// ============================================================================
// Watcher Types
// ============================================================================

export interface WatcherStatus {
  isRunning: boolean;
  watchedProjects: number;
  activeLogSources: number;
  errorsDetected: number;
  errorsFixed: number;
  healingSessionsTotal: number;
  healingSessionsActive: number;
  startTime?: string;
}

export interface ErrorEvent {
  id: string;
  error: string;
  source: string;
  timestamp: string;
  fixed?: boolean;
  fixAttempt?: string;
}

// ============================================================================
// Terminal Types
// ============================================================================

export interface TerminalOutput {
  id: string;
  command: string;
  output: string;
  status: 'running' | 'completed' | 'error';
  startTime: string;
  endTime?: string;
}

export interface TerminalSession {
  id: string;
  commands: TerminalOutput[];
  workingDir: string;
  isActive: boolean;
}

// ============================================================================
// Provider Types
// ============================================================================

export interface ProviderConfig {
  name: string;
  providerType: 'opencode' | 'openrouter' | 'google' | 'claude' | 'custom';
  isAuthenticated: boolean;
  defaultModel?: string;
  availableModels: string[];
  apiKey?: string;
  baseUrl?: string;
}

export interface ModelInfo {
  id: string;
  name: string;
  provider: string;
  maxTokens: number;
  supportsStreaming: boolean;
  supportsVision: boolean;
  costPer1kTokens: number;
}

// ============================================================================
// Project Types
// ============================================================================

export interface Project {
  id: string;
  name: string;
  path: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
  tasks: Task[];
  settings?: ProjectSettings;
}

export interface Task {
  id: string;
  title: string;
  description?: string;
  status: TaskStatus;
  priority: 'low' | 'medium' | 'high' | 'critical';
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
  assignedAgents?: string[];
  parentTaskId?: string;
  subtasks?: string[];
  tags?: string[];
  metadata?: Record<string, unknown>;
}

export interface ProjectSettings {
  autoSave: boolean;
  defaultAgentTypes: AgentType[];
  maxConcurrentAgents: number;
  preferredModel?: string;
  customInstructions?: string;
}

// ============================================================================
// Backend Status Types
// ============================================================================

export type ConnectionStatus = 'connected' | 'disconnected' | 'connecting' | 'error';

export interface BackendStatus {
  status: ConnectionStatus;
  lastPing?: string;
  latency?: number;
  version?: string;
  error?: string;
}

export interface NexusStatus {
  daemonRunning: boolean;
  daemonPort?: number;
  version: string;
  platform: string;
  nexusInstalled: boolean;
  currentProject?: string;
  provider?: string;
  model?: string;
}

// ============================================================================
// Tool Execution Types
// ============================================================================

export type ToolStatus = 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';

export interface ToolExecution {
  id: string;
  toolName: string;
  status: ToolStatus;
  input: Record<string, unknown>;
  output?: unknown;
  error?: string;
  startedAt: string;
  completedAt?: string;
  duration?: number;
  agentId?: string;
  metadata?: Record<string, unknown>;
}

// ============================================================================
// Search Types
// ============================================================================

export interface SearchResult {
  filePath: string;
  line: number;
  column: number;
  content: string;
  context?: string[];
}

// ============================================================================
// User Settings Types
// ============================================================================

export interface SSHSettings {
  host: string;
  port: number;
  username: string;
  password?: string;
  privateKey?: string;
  publicKey?: string;
}

export interface UserSettings {
  theme: 'dark' | 'light' | 'system';
  fontSize: number;
  fontFamily: string;
  sidebarVisible: boolean;
  terminalVisible: boolean;
  autoSave: boolean;
  autoSaveInterval: number;
  enableNotifications: boolean;
  soundEffects: boolean;
  telemetryEnabled: boolean;
  preferredModel?: string;
  apiKeys?: Record<string, string>;
  customShortcuts?: Record<string, string>;
  sshSettings?: SSHSettings;
  editorSettings?: {
    tabSize: number;
    useSpaces: boolean;
    wordWrap: boolean;
    minimap: boolean;
    lineNumbers: boolean;
  };
}

// ============================================================================
// Event Types for Tauri Events
// ============================================================================

export interface SwarmProgressEvent {
  taskId: string;
  progress: number;
  status: string;
  currentSubtask?: string;
}

export interface ChatStreamEvent {
  messageId: string;
  chunk: string;
}

export interface TerminalOutputEvent {
  sessionId: string;
  command: string;
  output: string;
  isError: boolean;
}

export interface FileChangeEvent {
  path: string;
  changeType: 'added' | 'modified' | 'deleted';
  timestamp: string;
}

export interface ErrorEventPayload {
  error: string;
  context: string;
  recoverable: boolean;
}

// ============================================================================
// Toast Notification Types
// ============================================================================

export interface Toast {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message?: string;
  duration?: number; // ms, default 5000
}

// ============================================================================
// API Response Types
// ============================================================================

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}
