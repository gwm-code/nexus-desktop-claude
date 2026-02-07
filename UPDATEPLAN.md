# Nexus Desktop + CLI - Update Plan
**Version:** Next Major Release
**Date:** 2026-02-07
**Status:** Planning Phase

---

## 🎯 Overview

This document outlines the complete feature set for the next major update of Nexus Desktop and CLI. The focus is on OAuth integration, model hierarchy system, improved UX, and production readiness.

---

## 📋 Priority 1: OAuth Implementation

### Status: Backend Ready, CLI + UI Missing

### What Exists:
- ✅ Google (Gemini) OAuth backend - fully implemented
- ✅ Claude (Anthropic) OAuth backend - fully implemented
- ❌ OpenAI OAuth - needs implementation

### What Needs to Be Done:

#### 1.1 OpenAI OAuth Support
**New File:** `/root/clawd/projects/nexus/src/providers/openai.rs`

**Implementation:**
- OAuth endpoints:
  - Auth URL: `https://auth.openai.com/authorize`
  - Token URL: `https://auth.openai.com/oauth/token`
  - Scopes: `openid profile email model.read model.request`
- Implement `generate_auth_url()` and `exchange_code()` methods
- Token refresh logic
- Follow same pattern as Google/Claude providers

**Files to Create/Modify:**
- `/root/clawd/projects/nexus/src/providers/openai.rs` (new)
- `/root/clawd/projects/nexus/src/providers/mod.rs` (register OpenAI provider)
- `/root/clawd/projects/nexus/Cargo.toml` (ensure oauth2 dependencies)

---

#### 1.2 CLI OAuth Commands
**File:** `/root/clawd/projects/nexus/src/main.rs`

**New Subcommands:**
```bash
# Store OAuth credentials
nexus config set-oauth <provider> <client_id> <client_secret>

# Start OAuth authorization flow
nexus config oauth-authorize <provider>
# → Opens browser
# → Starts localhost:8080 callback server
# → Exchanges code for tokens
# → Stores tokens in keyring

# Check OAuth status
nexus config oauth-status <provider>
# → Shows if OAuth configured, token expiry, etc.

# Refresh OAuth token
nexus config oauth-refresh <provider>
```

**Implementation Details:**
- Add `ConfigAction::SetOAuth { provider, client_id, client_secret }`
- Add `ConfigAction::OAuthAuthorize { provider }`
- Add `ConfigAction::OAuthStatus { provider }`
- Store OAuth credentials in OS keyring (use existing keyring integration)
- Localhost callback server on port 8080 (handle redirect from OAuth provider)
- PKCE support for security

**Files to Modify:**
- `/root/clawd/projects/nexus/src/main.rs` - Add ConfigAction variants
- `/root/clawd/projects/nexus/src/config.rs` - OAuth credential storage
- `/root/clawd/projects/nexus/src/secret_store.rs` - OAuth token management

---

#### 1.3 Tauri OAuth Commands
**File:** `/root/clawd/projects/nexus-desktop/src-tauri/src/main.rs`

**New Tauri Commands:**
```rust
#[tauri::command]
async fn set_oauth_credentials(
    provider: String,
    client_id: String,
    client_secret: String,
    state: State<'_, NexusState>
) -> Result<(), String>

#[tauri::command]
async fn oauth_authorize(
    provider: String,
    state: State<'_, NexusState>
) -> Result<String, String> // Returns auth URL

#[tauri::command]
async fn oauth_check_status(
    provider: String,
    state: State<'_, NexusState>
) -> Result<OAuthStatus, String>
```

**OAuth Flow:**
1. User enters Client ID + Secret in Settings
2. Desktop calls `set_oauth_credentials` → stores via CLI
3. User clicks "Authorize with Google/Claude/OpenAI"
4. Desktop calls `oauth_authorize` → CLI returns auth URL
5. Desktop opens URL in external browser (Tauri shell plugin)
6. User authorizes → redirected to localhost:8080
7. CLI catches redirect, exchanges code for tokens
8. Desktop polls `oauth_check_status` until complete
9. Success toast displayed

**Files to Modify:**
- `/root/clawd/projects/nexus-desktop/src-tauri/src/main.rs` - Add commands
- Register in `tauri::generate_handler![]`

---

#### 1.4 Desktop OAuth UI
**File:** `/root/clawd/projects/nexus-desktop/src/components/SettingsModal.tsx`

**Provider Tab Updates:**

```typescript
// Detect if provider supports OAuth
const supportsOAuth = ['google', 'claude', 'openai'].includes(activeProvider);

// OAuth UI (shown when provider supports it)
{supportsOAuth && (
  <>
    <div className="bg-blue-600/10 border border-blue-500/20 rounded-lg p-3">
      <h4>OAuth Authentication (Recommended)</h4>

      <label>OAuth Client ID</label>
      <input
        value={oauthClientId}
        onChange={(e) => setOauthClientId(e.target.value)}
        placeholder="xxxxx.apps.googleusercontent.com"
      />

      <label>OAuth Client Secret</label>
      <input
        type="password"
        value={oauthClientSecret}
        onChange={(e) => setOauthClientSecret(e.target.value)}
      />

      <button onClick={handleOAuthAuthorize} disabled={authorizingOAuth}>
        {authorizingOAuth ? 'Authorizing...' : `Authorize with ${activeProvider}`}
      </button>

      {oauthStatus && (
        <div className="text-sm text-green-400">
          ✓ Authorized • Expires: {oauthStatus.expiresAt}
        </div>
      )}
    </div>

    <div className="border-t my-4" />
    <p className="text-xs text-zinc-500">Or use API Key:</p>
  </>
)}

// API Key input (always shown as fallback)
<input type="password" placeholder="API Key" />
```

**State Management:**
```typescript
// In ProviderTab component
const [oauthClientId, setOauthClientId] = useState('');
const [oauthClientSecret, setOauthClientSecret] = useState('');
const [authorizingOAuth, setAuthorizingOAuth] = useState(false);
const [oauthStatus, setOauthStatus] = useState<OAuthStatus | null>(null);

const handleOAuthAuthorize = async () => {
  setAuthorizingOAuth(true);
  try {
    // 1. Store credentials
    await invoke('set_oauth_credentials', {
      provider: activeProvider,
      clientId: oauthClientId,
      clientSecret: oauthClientSecret,
    });

    // 2. Get auth URL
    const authUrl: string = await invoke('oauth_authorize', {
      provider: activeProvider,
    });

    // 3. Open browser
    await open(authUrl); // Tauri shell plugin

    // 4. Poll for completion (check every 2s for 60s)
    for (let i = 0; i < 30; i++) {
      await new Promise(resolve => setTimeout(resolve, 2000));
      const status: OAuthStatus = await invoke('oauth_check_status', {
        provider: activeProvider,
      });
      if (status.authorized) {
        setOauthStatus(status);
        addToast({ type: 'success', title: 'OAuth Authorized!' });
        break;
      }
    }
  } catch (e) {
    addToast({ type: 'error', title: 'OAuth failed', message: String(e) });
  } finally {
    setAuthorizingOAuth(false);
  }
};
```

**Files to Modify:**
- `/root/clawd/projects/nexus-desktop/src/components/SettingsModal.tsx`
- `/root/clawd/projects/nexus-desktop/src/types/index.ts` (add OAuthStatus type)
- Add dependency: `@tauri-apps/plugin-shell` for opening browser

**Getting OAuth Credentials (Help Text):**
- **Google:** https://console.cloud.google.com/apis/credentials
- **Claude:** https://console.anthropic.com/settings/oauth
- **OpenAI:** https://platform.openai.com/settings/organization/oauth

---

### Estimated Time: 2 days
**Priority:** High
**Dependencies:** None

---

## 📋 Priority 2: OpenRouter Free Provider

### 2.1 Add "auto" Model Support
**File:** `/root/clawd/projects/nexus/src/providers/openrouter.rs`

**Current State:**
- OpenRouter provider exists
- Supports API key authentication
- No "auto" model selection yet

**Changes Needed:**
```rust
impl OpenRouterProvider {
    pub fn static_info() -> ProviderInfo {
        ProviderInfo {
            name: "openrouter".to_string(),
            display_name: "OpenRouter".to_string(),
            supports_oauth: false,
            default_model: "auto".to_string(), // NEW: default to auto
            available_models: vec![
                "auto".to_string(),                    // NEW: auto-select best free
                "openrouter/auto:free".to_string(),    // NEW: auto-select free only
                "anthropic/claude-3.5-sonnet".to_string(),
                "google/gemini-pro-1.5".to_string(),
                // ... existing models
            ],
        }
    }
}
```

**How "auto" Works:**
- When model is set to `"auto"` or `"openrouter/auto:free"`, OpenRouter API selects best available model
- OpenRouter considers: model availability, current load, cost, quality
- Response includes which model was actually used
- Perfect for budget-conscious users

**API Request:**
```json
{
  "model": "openrouter/auto:free",
  "messages": [...]
}
```

**Response includes actual model used:**
```json
{
  "model": "google/gemini-2.0-flash-001:free",
  "choices": [...]
}
```

**Files to Modify:**
- `/root/clawd/projects/nexus/src/providers/openrouter.rs`

---

### 2.2 Desktop UI Updates
**File:** `/root/clawd/projects/nexus-desktop/src/components/SettingsModal.tsx`

**Model Dropdown:**
```typescript
// When provider is 'openrouter'
{activeProvider === 'openrouter' && (
  <div className="bg-green-600/10 border border-green-500/20 rounded-lg p-2 text-xs">
    💡 Tip: Select "auto" or "auto:free" to let OpenRouter pick the best available model
  </div>
)}
```

**Files to Modify:**
- `/root/clawd/projects/nexus-desktop/src/components/SettingsModal.tsx`

---

### Estimated Time: 0.5 days
**Priority:** Medium
**Dependencies:** None

---

## 📋 Priority 3: Settings Logs Tab

### 3.1 Log Collection System

**Goal:** Capture all errors, warnings, and info logs in one place for debugging

**Log Sources:**
1. Frontend console errors
2. Tauri backend logs
3. Nexus CLI command outputs
4. System errors (SSH failures, network issues)

---

### 3.2 Frontend Log Capture
**New File:** `/root/clawd/projects/nexus-desktop/src/utils/logger.ts`

```typescript
export interface LogEntry {
  timestamp: string;
  level: 'debug' | 'info' | 'warn' | 'error';
  source: 'frontend' | 'backend' | 'cli';
  message: string;
  details?: string;
}

const logs: LogEntry[] = [];
const MAX_LOGS = 1000;

export const logger = {
  debug: (message: string, details?: string) => {
    addLog('debug', 'frontend', message, details);
  },
  info: (message: string, details?: string) => {
    addLog('info', 'frontend', message, details);
  },
  warn: (message: string, details?: string) => {
    addLog('warn', 'frontend', message, details);
    console.warn(message, details);
  },
  error: (message: string, details?: string) => {
    addLog('error', 'frontend', message, details);
    console.error(message, details);
  },
  getLogs: () => [...logs],
  clearLogs: () => {
    logs.length = 0;
  },
  exportLogs: () => {
    const blob = new Blob([JSON.stringify(logs, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `nexus-logs-${new Date().toISOString()}.json`;
    a.click();
  },
};

function addLog(
  level: LogEntry['level'],
  source: LogEntry['source'],
  message: string,
  details?: string
) {
  logs.push({
    timestamp: new Date().toISOString(),
    level,
    source,
    message,
    details,
  });

  // Keep only last 1000 logs
  if (logs.length > MAX_LOGS) {
    logs.shift();
  }
}

// Capture global errors
window.addEventListener('error', (event) => {
  logger.error('Uncaught error', event.error?.stack || event.message);
});

window.addEventListener('unhandledrejection', (event) => {
  logger.error('Unhandled promise rejection', String(event.reason));
});
```

**Files to Create:**
- `/root/clawd/projects/nexus-desktop/src/utils/logger.ts`

---

### 3.3 Store Integration
**File:** `/root/clawd/projects/nexus-desktop/src/store/useNexusStore.ts`

```typescript
// Add to store
interface NexusStore {
  // ... existing state
  logs: LogEntry[];
  addLog: (level: LogEntry['level'], source: LogEntry['source'], message: string, details?: string) => void;
  clearLogs: () => void;
}

// Implementation
const useNexusStore = create<NexusStore>((set, get) => ({
  logs: [],

  addLog: (level, source, message, details) => {
    set((state) => ({
      logs: [...state.logs.slice(-999), {
        timestamp: new Date().toISOString(),
        level,
        source,
        message,
        details,
      }],
    }));
  },

  clearLogs: () => set({ logs: [] }),

  // Update existing methods to log errors
  checkNexusStatus: async () => {
    try {
      // ... existing code
    } catch (e) {
      get().addLog('error', 'backend', 'Status check failed', String(e));
      // ... existing error handling
    }
  },
}));
```

**Files to Modify:**
- `/root/clawd/projects/nexus-desktop/src/store/useNexusStore.ts`

---

### 3.4 Settings Logs Tab UI
**File:** `/root/clawd/projects/nexus-desktop/src/components/SettingsModal.tsx`

```typescript
// Add 'logs' to tab list
type Tab = 'connection' | 'provider' | 'appearance' | 'editor' | 'advanced' | 'logs';

const tabs = [
  // ... existing tabs
  { id: 'logs', label: 'Logs', icon: FileText },
];

// Logs Tab Component
const LogsTab: React.FC = () => {
  const { logs, clearLogs } = useNexusStore();
  const [filterLevel, setFilterLevel] = useState<'all' | 'error' | 'warn' | 'info' | 'debug'>('all');
  const [autoScroll, setAutoScroll] = useState(true);
  const logsEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (autoScroll && logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs, autoScroll]);

  const filteredLogs = logs.filter(log =>
    filterLevel === 'all' || log.level === filterLevel
  );

  const getLevelColor = (level: string) => {
    switch (level) {
      case 'error': return 'text-red-400 bg-red-500/10';
      case 'warn': return 'text-yellow-400 bg-yellow-500/10';
      case 'info': return 'text-blue-400 bg-blue-500/10';
      case 'debug': return 'text-zinc-400 bg-zinc-500/10';
      default: return 'text-zinc-300';
    }
  };

  const getSourceIcon = (source: string) => {
    switch (source) {
      case 'frontend': return '🖥️';
      case 'backend': return '⚙️';
      case 'cli': return '💻';
      default: return '📄';
    }
  };

  return (
    <div className="space-y-4">
      {/* Header Controls */}
      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          <select
            value={filterLevel}
            onChange={(e) => setFilterLevel(e.target.value as any)}
            className="px-3 py-1.5 bg-zinc-800 rounded text-xs"
          >
            <option value="all">All Levels</option>
            <option value="error">Errors Only</option>
            <option value="warn">Warnings Only</option>
            <option value="info">Info Only</option>
            <option value="debug">Debug Only</option>
          </select>

          <label className="flex items-center gap-2 text-xs">
            <input
              type="checkbox"
              checked={autoScroll}
              onChange={(e) => setAutoScroll(e.target.checked)}
            />
            Auto-scroll
          </label>
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => logger.exportLogs()}
            className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 rounded text-xs"
          >
            📥 Export
          </button>
          <button
            onClick={clearLogs}
            className="px-3 py-1.5 bg-red-600/20 hover:bg-red-600/30 text-red-400 rounded text-xs"
          >
            🗑️ Clear
          </button>
        </div>
      </div>

      {/* Logs Display */}
      <div className="bg-zinc-900 rounded-lg border border-zinc-800 h-96 overflow-y-auto font-mono text-xs">
        {filteredLogs.length === 0 ? (
          <div className="flex items-center justify-center h-full text-zinc-600">
            No logs to display
          </div>
        ) : (
          <div className="p-2 space-y-1">
            {filteredLogs.map((log, idx) => (
              <div
                key={idx}
                className={`p-2 rounded ${getLevelColor(log.level)}`}
              >
                <div className="flex items-start gap-2">
                  <span className="opacity-60">
                    {new Date(log.timestamp).toLocaleTimeString()}
                  </span>
                  <span>{getSourceIcon(log.source)}</span>
                  <span className="uppercase font-bold">{log.level}</span>
                  <span className="flex-1">{log.message}</span>
                </div>
                {log.details && (
                  <div className="mt-1 pl-20 text-zinc-500 text-[10px]">
                    {log.details}
                  </div>
                )}
              </div>
            ))}
            <div ref={logsEndRef} />
          </div>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-2 text-xs">
        <div className="bg-zinc-800 rounded p-2 text-center">
          <div className="text-zinc-500">Total</div>
          <div className="text-lg font-bold">{logs.length}</div>
        </div>
        <div className="bg-red-500/10 rounded p-2 text-center">
          <div className="text-red-400">Errors</div>
          <div className="text-lg font-bold text-red-400">
            {logs.filter(l => l.level === 'error').length}
          </div>
        </div>
        <div className="bg-yellow-500/10 rounded p-2 text-center">
          <div className="text-yellow-400">Warnings</div>
          <div className="text-lg font-bold text-yellow-400">
            {logs.filter(l => l.level === 'warn').length}
          </div>
        </div>
        <div className="bg-blue-500/10 rounded p-2 text-center">
          <div className="text-blue-400">Info</div>
          <div className="text-lg font-bold text-blue-400">
            {logs.filter(l => l.level === 'info').length}
          </div>
        </div>
      </div>
    </div>
  );
};
```

**Files to Modify:**
- `/root/clawd/projects/nexus-desktop/src/components/SettingsModal.tsx`

**Icons to Import:**
```typescript
import { FileText } from 'lucide-react';
```

---

### Estimated Time: 1 day
**Priority:** Medium
**Dependencies:** None

---

## 📋 Priority 4: Proactive Agent Heartbeat

### 4.1 Heartbeat Configuration

**Goal:** Agent wakes up periodically (0-24h interval) to check for proactive tasks

**Proactive Tasks Examples:**
- Memory consolidation
- Check for build errors
- Scan for TODO/FIXME comments
- Auto-fix linting issues
- Health checks (disk space, dependencies)
- Security vulnerability scans

---

### 4.2 CLI Daemon Mode
**File:** `/root/clawd/projects/nexus/src/main.rs`

**New Subcommand:**
```bash
# Start daemon with heartbeat
nexus daemon start --heartbeat 1h

# Check daemon status
nexus daemon status

# Stop daemon
nexus daemon stop
```

**Implementation:**
```rust
Commands::Daemon { action } => {
    match action {
        DaemonAction::Start { heartbeat } => {
            let interval = parse_duration(&heartbeat)?; // "1h" -> 3600s

            // Fork to background
            daemon::run_daemon(interval).await?;

            println!("Nexus daemon started with {} heartbeat", heartbeat);
        }
        DaemonAction::Status => {
            // Check if daemon is running (PID file)
            let status = daemon::get_status()?;
            println!("Daemon: {}", if status.running { "Running" } else { "Stopped" });
            if status.running {
                println!("Next heartbeat: {}", status.next_heartbeat);
            }
        }
        DaemonAction::Stop => {
            daemon::stop()?;
            println!("Daemon stopped");
        }
    }
}
```

**Daemon Logic:**
```rust
// File: /root/clawd/projects/nexus/src/daemon.rs

pub async fn run_daemon(heartbeat_interval: Duration) -> Result<()> {
    // Write PID file
    write_pid_file()?;

    loop {
        // Sleep until next heartbeat
        tokio::time::sleep(heartbeat_interval).await;

        // Run proactive tasks
        run_heartbeat_tasks().await?;
    }
}

async fn run_heartbeat_tasks() -> Result<()> {
    info!("Heartbeat: Running proactive tasks");

    // Task 1: Memory consolidation
    if should_consolidate_memory()? {
        info!("Running memory consolidation");
        run_memory_consolidation().await?;
    }

    // Task 2: Health checks
    check_system_health()?;

    // Task 3: TODO scan
    scan_for_todos()?;

    // Task 4: Dependency updates
    check_outdated_dependencies()?;

    Ok(())
}
```

**Files to Create:**
- `/root/clawd/projects/nexus/src/daemon.rs` (new)

**Files to Modify:**
- `/root/clawd/projects/nexus/src/main.rs` - Add Daemon subcommand

---

### 4.3 Desktop Heartbeat Settings
**File:** `/root/clawd/projects/nexus-desktop/src/components/SettingsModal.tsx`

**Advanced Tab - Add Heartbeat Section:**

```typescript
const AdvancedTab: React.FC = () => {
  const [heartbeatEnabled, setHeartbeatEnabled] = useState(false);
  const [heartbeatInterval, setHeartbeatInterval] = useState(6); // hours

  const handleHeartbeatToggle = async () => {
    if (heartbeatEnabled) {
      // Stop daemon
      await invoke('execute_nexus_bridge', {
        args: ['daemon', 'stop'],
      });
      setHeartbeatEnabled(false);
    } else {
      // Start daemon
      await invoke('execute_nexus_bridge', {
        args: ['daemon', 'start', '--heartbeat', `${heartbeatInterval}h`],
      });
      setHeartbeatEnabled(true);
    }
  };

  return (
    <div className="space-y-6">
      {/* ... existing advanced settings */}

      {/* Proactive Agent Heartbeat */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium">Proactive Agent Heartbeat</label>
          <Toggle checked={heartbeatEnabled} onChange={handleHeartbeatToggle} />
        </div>

        {heartbeatEnabled && (
          <>
            <div className="space-y-2">
              <label className="text-xs text-zinc-400">
                Check interval: Every {heartbeatInterval} hour{heartbeatInterval !== 1 ? 's' : ''}
              </label>
              <input
                type="range"
                min="0"
                max="24"
                step="1"
                value={heartbeatInterval}
                onChange={(e) => setHeartbeatInterval(parseInt(e.target.value))}
                className="w-full"
              />
              <div className="flex justify-between text-[10px] text-zinc-600">
                <span>Disabled</span>
                <span>1h</span>
                <span>6h</span>
                <span>12h</span>
                <span>24h</span>
              </div>
            </div>

            <div className="bg-blue-600/10 border border-blue-500/20 rounded p-3 text-xs space-y-2">
              <p className="text-blue-300">What happens during heartbeat:</p>
              <ul className="list-disc list-inside text-blue-400/80 space-y-1">
                <li>Memory consolidation</li>
                <li>System health checks</li>
                <li>TODO/FIXME scanning</li>
                <li>Dependency update checks</li>
                <li>Build error detection</li>
              </ul>
            </div>

            <button
              onClick={async () => {
                // Trigger manual heartbeat
                await invoke('execute_nexus_bridge', {
                  args: ['daemon', 'heartbeat-now'],
                });
              }}
              className="px-3 py-2 bg-zinc-800 hover:bg-zinc-700 rounded text-xs"
            >
              ▶️ Run Heartbeat Now
            </button>
          </>
        )}
      </div>
    </div>
  );
};
```

**Store Integration:**
```typescript
// In useNexusStore
interface NexusStore {
  heartbeatEnabled: boolean;
  heartbeatInterval: number; // hours
  setHeartbeatEnabled: (enabled: boolean) => void;
  setHeartbeatInterval: (hours: number) => void;
}
```

**Files to Modify:**
- `/root/clawd/projects/nexus-desktop/src/components/SettingsModal.tsx`
- `/root/clawd/projects/nexus-desktop/src/store/useNexusStore.ts`

---

### Estimated Time: 1.5 days
**Priority:** Medium
**Dependencies:** None

---

## 📋 Priority 5: Model Hierarchy System ⭐ (MAJOR FEATURE)

### 5.1 Overview

**Goal:** User-configurable model hierarchy with automatic escalation

**Features:**
- ✅ Custom hierarchy (any model in any slot)
- ✅ Smart presets (Budget, Balanced, Premium, Speed, Claude-Only)
- ✅ Auto-escalation on failure
- ✅ Cost tracking & budget limits
- ✅ Task categorization (Heartbeat, Daily, Planning, Coding, Review)
- ✅ Real-time model rankings database

---

### 5.2 Model Capabilities Database

**New File:** `/root/clawd/projects/nexus/src/providers/model_capabilities.rs`

```rust
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ModelCapabilities {
    pub id: String,                    // "claude-opus-4-6"
    pub provider: String,              // "claude"
    pub display_name: String,          // "Claude Opus 4.6"
    pub speed_score: u8,               // 1-10 (10 = fastest)
    pub reasoning_score: u8,           // 1-10 (10 = best reasoning)
    pub coding_score: u8,              // 1-10 (10 = best at code)
    pub cost_per_1m_tokens: f64,       // Estimated cost in USD
    pub context_window: u32,           // Max tokens
    pub supports_streaming: bool,
    pub supports_tools: bool,
    pub release_date: String,          // "2024-12-01"
}

impl ModelCapabilities {
    pub fn get_all() -> &'static [ModelCapabilities] {
        MODEL_RANKINGS
    }

    pub fn get_by_id(id: &str) -> Option<&'static ModelCapabilities> {
        MODEL_RANKINGS.iter().find(|m| m.id == id)
    }

    pub fn filter_by_provider(provider: &str) -> Vec<&'static ModelCapabilities> {
        MODEL_RANKINGS.iter().filter(|m| m.provider == provider).collect()
    }

    // Ranking algorithms for preset generation
    pub fn rank_for_heartbeat(models: &[String]) -> Vec<String> {
        // Sort by: speed (high), cost (low)
        rank_by_score(models, |cap| {
            cap.speed_score as f64 - (cap.cost_per_1m_tokens * 10.0)
        })
    }

    pub fn rank_for_planning(models: &[String]) -> Vec<String> {
        // Sort by: reasoning (high), cost (medium)
        rank_by_score(models, |cap| {
            cap.reasoning_score as f64 - (cap.cost_per_1m_tokens * 2.0)
        })
    }

    pub fn rank_for_coding(models: &[String]) -> Vec<String> {
        // Sort by: coding score (high), reasoning (high)
        rank_by_score(models, |cap| {
            (cap.coding_score + cap.reasoning_score) as f64
        })
    }
}

fn rank_by_score<F>(models: &[String], score_fn: F) -> Vec<String>
where
    F: Fn(&ModelCapabilities) -> f64,
{
    let mut ranked: Vec<_> = models
        .iter()
        .filter_map(|id| {
            ModelCapabilities::get_by_id(id).map(|cap| (id.clone(), score_fn(cap)))
        })
        .collect();

    ranked.sort_by(|a, b| b.1.partial_cmp(&a.1).unwrap());
    ranked.into_iter().map(|(id, _)| id).collect()
}

// Static model rankings database
static MODEL_RANKINGS: &[ModelCapabilities] = &[
    ModelCapabilities {
        id: "claude-opus-4-6".into(),
        provider: "claude".into(),
        display_name: "Claude Opus 4.6".into(),
        speed_score: 4,
        reasoning_score: 10,
        coding_score: 10,
        cost_per_1m_tokens: 15.0,
        context_window: 200_000,
        supports_streaming: true,
        supports_tools: true,
        release_date: "2024-12-01".into(),
    },
    ModelCapabilities {
        id: "claude-sonnet-4-5".into(),
        provider: "claude".into(),
        display_name: "Claude Sonnet 4.5".into(),
        speed_score: 7,
        reasoning_score: 9,
        coding_score: 9,
        cost_per_1m_tokens: 3.0,
        context_window: 200_000,
        supports_streaming: true,
        supports_tools: true,
        release_date: "2024-10-22".into(),
    },
    ModelCapabilities {
        id: "claude-haiku-3-5".into(),
        provider: "claude".into(),
        display_name: "Claude Haiku 3.5".into(),
        speed_score: 10,
        reasoning_score: 7,
        coding_score: 7,
        cost_per_1m_tokens: 0.25,
        context_window: 200_000,
        supports_streaming: true,
        supports_tools: true,
        release_date: "2024-08-01".into(),
    },
    ModelCapabilities {
        id: "gemini-2.0-flash-exp".into(),
        provider: "google".into(),
        display_name: "Gemini 2.0 Flash (Experimental)".into(),
        speed_score: 10,
        reasoning_score: 8,
        coding_score: 8,
        cost_per_1m_tokens: 0.0, // Free during preview
        context_window: 1_000_000,
        supports_streaming: true,
        supports_tools: true,
        release_date: "2024-12-11".into(),
    },
    ModelCapabilities {
        id: "gemini-1.5-pro".into(),
        provider: "google".into(),
        display_name: "Gemini 1.5 Pro".into(),
        speed_score: 8,
        reasoning_score: 8,
        coding_score: 7,
        cost_per_1m_tokens: 1.25,
        context_window: 2_000_000,
        supports_streaming: true,
        supports_tools: true,
        release_date: "2024-05-14".into(),
    },
    ModelCapabilities {
        id: "gemini-1.5-flash".into(),
        provider: "google".into(),
        display_name: "Gemini 1.5 Flash".into(),
        speed_score: 10,
        reasoning_score: 6,
        coding_score: 6,
        cost_per_1m_tokens: 0.075,
        context_window: 1_000_000,
        supports_streaming: true,
        supports_tools: true,
        release_date: "2024-05-14".into(),
    },
    ModelCapabilities {
        id: "gpt-4o".into(),
        provider: "openai".into(),
        display_name: "GPT-4o".into(),
        speed_score: 8,
        reasoning_score: 9,
        coding_score: 8,
        cost_per_1m_tokens: 2.5,
        context_window: 128_000,
        supports_streaming: true,
        supports_tools: true,
        release_date: "2024-05-13".into(),
    },
    ModelCapabilities {
        id: "gpt-4o-mini".into(),
        provider: "openai".into(),
        display_name: "GPT-4o Mini".into(),
        speed_score: 10,
        reasoning_score: 7,
        coding_score: 7,
        cost_per_1m_tokens: 0.15,
        context_window: 128_000,
        supports_streaming: true,
        supports_tools: true,
        release_date: "2024-07-18".into(),
    },
    ModelCapabilities {
        id: "o1".into(),
        provider: "openai".into(),
        display_name: "OpenAI o1".into(),
        speed_score: 2,
        reasoning_score: 10,
        coding_score: 9,
        cost_per_1m_tokens: 15.0,
        context_window: 200_000,
        supports_streaming: false,
        supports_tools: false,
        release_date: "2024-12-17".into(),
    },
    ModelCapabilities {
        id: "o1-mini".into(),
        provider: "openai".into(),
        display_name: "OpenAI o1-mini".into(),
        speed_score: 5,
        reasoning_score: 9,
        coding_score: 8,
        cost_per_1m_tokens: 3.0,
        context_window: 128_000,
        supports_streaming: false,
        supports_tools: false,
        release_date: "2024-09-12".into(),
    },
    ModelCapabilities {
        id: "grok-beta".into(),
        provider: "xai".into(),
        display_name: "Grok Beta".into(),
        speed_score: 7,
        reasoning_score: 8,
        coding_score: 7,
        cost_per_1m_tokens: 5.0,
        context_window: 131_072,
        supports_streaming: true,
        supports_tools: true,
        release_date: "2024-11-04".into(),
    },
    ModelCapabilities {
        id: "openrouter/auto:free".into(),
        provider: "openrouter".into(),
        display_name: "OpenRouter Auto (Free)".into(),
        speed_score: 8,
        reasoning_score: 6,
        coding_score: 6,
        cost_per_1m_tokens: 0.0,
        context_window: 128_000,
        supports_streaming: true,
        supports_tools: false,
        release_date: "2024-01-01".into(),
    },
    ModelCapabilities {
        id: "deepseek-chat".into(),
        provider: "deepseek".into(),
        display_name: "DeepSeek Chat".into(),
        speed_score: 9,
        reasoning_score: 8,
        coding_score: 9,
        cost_per_1m_tokens: 0.14,
        context_window: 64_000,
        supports_streaming: true,
        supports_tools: true,
        release_date: "2024-01-01".into(),
    },
    // TODO: Add more models as they release
    // - Grok 4.1 Fast
    // - Minimax 2.1
    // - Meta Llama models
    // - Mistral models
    // - Cohere models
];
```

**Files to Create:**
- `/root/clawd/projects/nexus/src/providers/model_capabilities.rs`

**Files to Modify:**
- `/root/clawd/projects/nexus/src/providers/mod.rs` - Export model_capabilities

---

### 5.3 Real-Time Model Rankings (Research Needed)

**Potential Data Sources:**

1. **Artificial Analysis** (https://artificialanalysis.ai/)
   - Provides: Speed, quality, price benchmarks
   - API: Unknown (may need scraping or manual updates)
   - Update frequency: Weekly

2. **LMSys Chatbot Arena** (https://chat.lmsys.org/?leaderboard)
   - Provides: ELO ratings, user preferences
   - API: Public leaderboard data available
   - Update frequency: Daily
   - Best for: Reasoning/quality scores

3. **OpenRouter** (https://openrouter.ai/docs#models)
   - Provides: Real-time pricing, availability
   - API: `/api/v1/models` endpoint
   - Update frequency: Real-time
   - Best for: Cost per token, model availability

4. **OpenAI Pricing Page** (https://openai.com/pricing)
   - Manual scraping or API
   - Official pricing data

5. **Anthropic/Google/xAI Docs**
   - Manual updates from official docs
   - Most accurate for new models

**Recommended Approach:**

```rust
// Hybrid system: Static baseline + dynamic updates

// Option 1: Static baseline (embedded in binary)
// - Fast startup
// - Always works offline
// - Updated with each Nexus release

// Option 2: Remote JSON fetch (optional)
// - Fetch on app start (with cache)
// - Fallback to static if network fails
// - User can disable in settings

pub async fn fetch_latest_rankings() -> Result<Vec<ModelCapabilities>> {
    // Fetch from GitHub (versioned JSON file)
    let url = "https://raw.githubusercontent.com/your-org/nexus/main/model-rankings.json";

    let response = reqwest::get(url).await?;
    let rankings: Vec<ModelCapabilities> = response.json().await?;

    // Cache locally
    save_rankings_cache(&rankings)?;

    Ok(rankings)
}

// CLI command to update rankings
// nexus models update-rankings
```

**Data Sources (Confirmed):**

Based on research in `/root/clawd/projects/nexus/AI-Model-Rankings-Feb-2026.md`:

**Primary Sources:**
1. **OpenLM Arena** (openlm.ai)
   - 6M+ user votes
   - Elo ratings updated real-time
   - API: Unknown (likely needs scraping)

2. **LMSYS Chatbot Arena** (chat.lmsys.org)
   - Weekly updated leaderboard
   - API: Parse from HuggingFace space
   - Best for: Overall quality scores

3. **Epoch Capabilities Index (ECI)**
   - Aggregates 39 benchmarks
   - Source: epoch.ai
   - Best for: Multi-dimensional rankings

4. **Scale SEAL Leaderboards**
   - Expert-driven evaluations
   - Source: scale.com
   - Best for: Enterprise/production rankings

**Implementation Strategy:**
- **Static baseline:** Embed rankings in binary (updated with each Nexus release)
- **Dynamic updates (optional):** Fetch weekly from GitHub JSON (user can disable)
- **Community contributions:** PRs to update `model-rankings.json`

**TODO:**
- [ ] Create scraper for LMSYS leaderboard
- [ ] Parse into `model-rankings.json` format
- [ ] Add CI job to auto-update weekly
- [ ] Implement CLI command: `nexus models update-rankings`

---

### 5.4 Model Discovery

**CLI Command:**
```bash
nexus models list-available --json
```

**Implementation:**
```rust
Commands::Models { action } => {
    match action {
        ModelsAction::ListAvailable => {
            let config = ConfigManager::load()?;
            let mut available = Vec::new();

            // Check each provider
            for provider_name in ["google", "claude", "openai", "openrouter"] {
                if let Some(provider_config) = config.get_provider(provider_name) {
                    // Check if authenticated
                    let is_authed = provider_config.api_key.is_some()
                        || provider_config.oauth_token.is_some();

                    if is_authed {
                        // Get models for this provider
                        let models = ModelCapabilities::filter_by_provider(provider_name);
                        for model in models {
                            available.push(serde_json::json!({
                                "id": model.id,
                                "provider": model.provider,
                                "display_name": model.display_name,
                                "available": true,
                                "reason": "API key or OAuth configured",
                            }));
                        }
                    }
                }
            }

            if json_mode {
                println!("{}", json_output(true, serde_json::json!({
                    "models": available,
                }), None));
            } else {
                println!("Available models:");
                for model in available {
                    println!("  - {}", model["display_name"]);
                }
            }
        }
    }
}
```

---

### 5.5 Model Hierarchy Configuration

**New File:** `/root/clawd/projects/nexus/src/hierarchy.rs`

```rust
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ModelTier {
    pub model_id: String,              // "claude-opus-4-6"
    pub max_tokens: Option<u32>,       // Optional token limit for this tier
    pub max_cost_per_request: Option<f64>, // Budget guard
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ModelHierarchy {
    pub heartbeat: Vec<ModelTier>,     // Tier 1, Tier 2, Tier 3
    pub daily: Vec<ModelTier>,
    pub planning: Vec<ModelTier>,
    pub coding: Vec<ModelTier>,
    pub review: Vec<ModelTier>,
}

impl Default for ModelHierarchy {
    fn default() -> Self {
        Self::balanced_preset()
    }
}

impl ModelHierarchy {
    pub fn balanced_preset() -> Self {
        Self {
            heartbeat: vec![
                ModelTier { model_id: "openrouter/auto:free".into(), max_tokens: None, max_cost_per_request: None },
            ],
            daily: vec![
                ModelTier { model_id: "gemini-1.5-flash".into(), max_tokens: None, max_cost_per_request: None },
            ],
            planning: vec![
                ModelTier { model_id: "gemini-1.5-pro".into(), max_tokens: None, max_cost_per_request: None },
                ModelTier { model_id: "claude-sonnet-4-5".into(), max_tokens: None, max_cost_per_request: None },
            ],
            coding: vec![
                ModelTier { model_id: "claude-sonnet-4-5".into(), max_tokens: None, max_cost_per_request: None },
                ModelTier { model_id: "claude-opus-4-6".into(), max_tokens: None, max_cost_per_request: None },
            ],
            review: vec![
                ModelTier { model_id: "claude-sonnet-4-5".into(), max_tokens: None, max_cost_per_request: None },
            ],
        }
    }

    pub fn budget_preset() -> Self {
        Self {
            heartbeat: vec![
                ModelTier { model_id: "openrouter/auto:free".into(), max_tokens: None, max_cost_per_request: None },
            ],
            daily: vec![
                ModelTier { model_id: "gemini-1.5-flash".into(), max_tokens: None, max_cost_per_request: None },
            ],
            planning: vec![
                ModelTier { model_id: "gemini-1.5-flash".into(), max_tokens: None, max_cost_per_request: None },
                ModelTier { model_id: "gpt-4o-mini".into(), max_tokens: None, max_cost_per_request: None },
            ],
            coding: vec![
                ModelTier { model_id: "gemini-1.5-pro".into(), max_tokens: None, max_cost_per_request: Some(0.5) },
            ],
            review: vec![
                ModelTier { model_id: "gemini-1.5-flash".into(), max_tokens: None, max_cost_per_request: None },
            ],
        }
    }

    pub fn premium_preset() -> Self {
        Self {
            heartbeat: vec![
                ModelTier { model_id: "gemini-1.5-flash".into(), max_tokens: None, max_cost_per_request: None },
            ],
            daily: vec![
                ModelTier { model_id: "gemini-1.5-pro".into(), max_tokens: None, max_cost_per_request: None },
            ],
            planning: vec![
                ModelTier { model_id: "claude-opus-4-6".into(), max_tokens: None, max_cost_per_request: None },
                ModelTier { model_id: "o1".into(), max_tokens: None, max_cost_per_request: None },
            ],
            coding: vec![
                ModelTier { model_id: "claude-opus-4-6".into(), max_tokens: None, max_cost_per_request: None },
            ],
            review: vec![
                ModelTier { model_id: "claude-sonnet-4-5".into(), max_tokens: None, max_cost_per_request: None },
            ],
        }
    }

    pub fn get_tier(&self, category: TaskCategory, tier_index: usize) -> Option<&ModelTier> {
        let tiers = match category {
            TaskCategory::Heartbeat => &self.heartbeat,
            TaskCategory::Daily => &self.daily,
            TaskCategory::Planning => &self.planning,
            TaskCategory::Coding => &self.coding,
            TaskCategory::Review => &self.review,
        };
        tiers.get(tier_index)
    }
}

#[derive(Debug, Clone, Copy, Serialize, Deserialize)]
pub enum TaskCategory {
    Heartbeat,  // Proactive checks, simple automation
    Daily,      // Simple queries, file reads, status
    Planning,   // Architecture, design, reasoning
    Coding,     // Code generation, refactoring
    Review,     // Code review, testing, validation
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EscalationPolicy {
    pub enabled: bool,
    pub max_escalations: usize,           // Default: 3
    pub escalate_on_error: bool,          // API errors
    pub escalate_on_refusal: bool,        // "I can't do that"
    pub escalate_on_test_failure: bool,   // Code fails tests
    pub escalate_on_syntax_error: bool,   // Code doesn't compile
    pub escalate_on_low_confidence: bool, // Confidence < threshold
    pub confidence_threshold: f32,        // Default: 0.8
    pub daily_budget_limit: f64,          // Stop if exceeded
}

impl Default for EscalationPolicy {
    fn default() -> Self {
        Self {
            enabled: true,
            max_escalations: 3,
            escalate_on_error: true,
            escalate_on_refusal: true,
            escalate_on_test_failure: false, // TODO: Implement test runner integration
            escalate_on_syntax_error: true,
            escalate_on_low_confidence: false,
            confidence_threshold: 0.8,
            daily_budget_limit: 20.0,
        }
    }
}
```

**Files to Create:**
- `/root/clawd/projects/nexus/src/hierarchy.rs`

---

### 5.6 Task Classification

**How to Categorize Tasks:**

```rust
pub fn classify_task(input: &str, context: &TaskContext) -> TaskCategory {
    // 1. Explicit override in input
    if input.starts_with("[heartbeat]") {
        return TaskCategory::Heartbeat;
    }
    if input.starts_with("[plan]") || input.contains("/plan") {
        return TaskCategory::Planning;
    }

    // 2. Command-based classification
    if context.is_scheduled {
        return TaskCategory::Heartbeat;
    }
    if context.is_readonly_command {
        return TaskCategory::Daily;
    }

    // 3. Keyword-based heuristics
    let lower = input.to_lowercase();

    if lower.contains("plan") || lower.contains("design") || lower.contains("architect") {
        return TaskCategory::Planning;
    }

    if lower.contains("write") || lower.contains("implement") || lower.contains("refactor") {
        return TaskCategory::Coding;
    }

    if lower.contains("review") || lower.contains("test") || lower.contains("validate") {
        return TaskCategory::Review;
    }

    // 4. Default to Daily for simple queries
    TaskCategory::Daily
}
```

---

### 5.7 Escalation Engine

```rust
pub struct EscalationEngine {
    hierarchy: ModelHierarchy,
    policy: EscalationPolicy,
    current_tier: usize,
    daily_spend: f64,
}

impl EscalationEngine {
    pub fn new(hierarchy: ModelHierarchy, policy: EscalationPolicy) -> Self {
        Self {
            hierarchy,
            policy,
            current_tier: 0,
            daily_spend: 0.0,
        }
    }

    pub async fn execute_with_escalation(
        &mut self,
        category: TaskCategory,
        messages: &[Message],
    ) -> Result<String> {
        for tier_index in 0..self.policy.max_escalations {
            // Get model for current tier
            let tier = self.hierarchy.get_tier(category, tier_index)
                .ok_or_else(|| NexusError::NoModelForTier)?;

            // Check budget
            if self.daily_spend >= self.policy.daily_budget_limit {
                return Err(NexusError::BudgetExceeded);
            }

            // Execute with this model
            let result = self.try_execute(&tier.model_id, messages).await;

            match result {
                Ok(response) => {
                    // Success! Check if we should still escalate
                    if self.should_escalate(&response)? {
                        info!("Auto-escalating from tier {} to tier {}", tier_index, tier_index + 1);
                        continue;
                    }
                    return Ok(response);
                }
                Err(e) if self.is_retryable_error(&e) => {
                    warn!("Tier {} failed: {}, escalating", tier_index, e);
                    continue;
                }
                Err(e) => return Err(e), // Non-retryable error
            }
        }

        Err(NexusError::AllTiersExhausted)
    }

    fn should_escalate(&self, response: &str) -> Result<bool> {
        // Check for refusal patterns
        if self.policy.escalate_on_refusal {
            if response.contains("I cannot") || response.contains("I'm not able to") {
                return Ok(true);
            }
        }

        // Check for syntax errors
        if self.policy.escalate_on_syntax_error {
            if response.contains("SyntaxError") || response.contains("ParseError") {
                return Ok(true);
            }
        }

        // TODO: Check test failures, confidence scores

        Ok(false)
    }

    fn is_retryable_error(&self, error: &NexusError) -> bool {
        if !self.policy.escalate_on_error {
            return false;
        }

        matches!(error,
            NexusError::ApiRequest(_) |
            NexusError::RateLimit |
            NexusError::Timeout
        )
    }
}
```

---

### 5.8 CLI Commands

```bash
# Get current hierarchy
nexus hierarchy get --json

# Set custom tier
nexus hierarchy set coding tier1=claude-sonnet tier2=opus tier3=disabled

# Apply preset
nexus hierarchy preset balanced
nexus hierarchy preset budget
nexus hierarchy preset premium

# Get escalation policy
nexus hierarchy policy get

# Set escalation policy
nexus hierarchy policy set max-escalations=3
nexus hierarchy policy set daily-budget=20.00
nexus hierarchy policy enable auto-escalation
```

---

### 5.9 Desktop UI - Model Hierarchy Tab

**File:** `/root/clawd/projects/nexus-desktop/src/components/SettingsModal.tsx`

**Add new tab:**
```typescript
type Tab = 'connection' | 'provider' | 'appearance' | 'editor' | 'advanced' | 'logs' | 'hierarchy';

const tabs = [
  // ... existing tabs
  { id: 'hierarchy', label: 'Model Hierarchy', icon: Layers },
];
```

**HierarchyTab Component:** (See full UI design in section 5.2 above)

Key features:
- Preset dropdown (Budget, Balanced, Premium, Speed, Claude-Only, Custom)
- 5 category sections (Heartbeat, Daily, Planning, Coding, Review)
- Each section has 3 tier dropdowns
- Cost indicators next to each model
- Auto-escalation settings
- Statistics panel (estimated daily cost, actual spend, escalation rate)

**IMPORTANT: Preset Behavior (User Control)**

Presets **suggest** models but don't restrict choice:

```typescript
// Model dropdown example for Coding Tier 1
<select value={codingTier1} onChange={handleChange}>
  {/* Recommended models appear first with star indicator */}
  <optgroup label="⭐ Recommended for Coding">
    <option value="gemini-3-pro">Gemini-3-Pro 💰 $1.25 (Best overall)</option>
    <option value="gpt-5.1">GPT-5.1 💰 $2.50 (Creative solutions)</option>
    <option value="claude-opus-4-6">Claude Opus 4.6 💰 $15.00 (Clean code)</option>
  </optgroup>

  {/* All other available models */}
  <optgroup label="All Available Models">
    <option value="gemini-3-flash">Gemini-3-Flash 💰 $0.08 (Speed)</option>
    <option value="grok-4.1-thinking">Grok-4.1-Thinking 💰 $5.00 (Reasoning)</option>
    <option value="openrouter/auto:free">OpenRouter Auto 💰 $0.00 (Free)</option>
    {/* ... all other models sorted alphabetically ... */}
  </optgroup>
</select>
```

**Preset Application Logic:**
1. User selects preset (e.g., "Balanced")
2. Preset populates tiers with recommended models
3. Model dropdowns reorder to show recommendations first
4. User can override ANY tier with ANY model
5. Selecting a different model doesn't change preset label (shows "Custom")

**Benefits:**
- ✅ Smart defaults for beginners
- ✅ Full control for advanced users
- ✅ No restrictions - user is always in charge
- ✅ Recommendations visible but optional
- ✅ Easy to experiment with different models

---

### 5.10 Store Integration

**File:** `/root/clawd/projects/nexus-desktop/src/store/useNexusStore.ts`

```typescript
interface ModelHierarchy {
  heartbeat: ModelTier[];
  daily: ModelTier[];
  planning: ModelTier[];
  coding: ModelTier[];
  review: ModelTier[];
}

interface ModelTier {
  modelId: string;
  maxTokens?: number;
  maxCostPerRequest?: number;
}

interface NexusStore {
  // ... existing state

  // Model hierarchy
  hierarchy: ModelHierarchy;
  availableModels: ModelInfo[];
  escalationPolicy: EscalationPolicy;

  // Actions
  loadHierarchy: () => Promise<void>;
  setHierarchyTier: (category: string, tierIndex: number, modelId: string) => Promise<void>;
  applyPreset: (preset: string) => Promise<void>;
  loadAvailableModels: () => Promise<void>;
  setEscalationPolicy: (policy: Partial<EscalationPolicy>) => Promise<void>;
}
```

---

### Estimated Time: 3-4 days
**Priority:** HIGHEST (Killer feature)
**Dependencies:** OAuth (models need authentication)

---

## 📋 Priority 6: Nice-to-Have Improvements

### 6.1 Connection Mode Indicator
- Show "Connected (SSH)" vs "Connected (Local)" in status bar
- Add `connection_mode` field to NexusStatus
- Update status detection logic

### 6.2 Remote CLI Detection Warning
- After SSH connect, check if `nexus` exists on remote
- Toast warning if not found
- Link to installation instructions

### 6.3 Provider/Model Config Sync
- Replace hardcoded "Remote" and "Kimi"
- Read actual provider/model from CLI config
- Update status bar in real-time

### 6.4 Smart Status Polling
- Exponential backoff when idle (5s → 30s → 60s)
- Fast polling when actively using app
- Immediate refresh after major actions

### 6.5 Error Recovery UI
- Actionable error messages
- "Configure Google" button when provider not configured
- "Add API Key" button when key missing

### 6.6 Connection Health Check
- Ping test for SSH latency
- Display in status bar: "Connected (SSH, 45ms)"
- Warning if latency > 500ms

### 6.7 Settings Search
- Search box at top of Settings modal
- Filter tabs/options by keyword
- Highlight matching fields

**Estimated Time:** 2 days total
**Priority:** Low
**Dependencies:** None

---

## 🚀 Build & Release Process

### Pre-Build Checklist

1. ✅ All tests pass
   ```bash
   cd /root/clawd/projects/nexus && cargo test
   cd /root/clawd/projects/nexus-desktop && npx tsc --noEmit
   ```

2. ✅ CLI builds clean
   ```bash
   cd /root/clawd/projects/nexus
   cargo build --release
   ```

3. ✅ CLI installed to PATH
   ```bash
   # Symlink should already exist
   ls -la /usr/local/bin/nexus
   ```

4. ✅ Desktop builds clean
   ```bash
   cd /root/clawd/projects/nexus-desktop
   cargo build --manifest-path src-tauri/Cargo.toml --release
   ```

5. ✅ TypeScript compiles
   ```bash
   npx tsc --noEmit
   ```

6. ✅ Version bumped
   - Update `version` in `/root/clawd/projects/nexus/Cargo.toml`
   - Update `version` in `/root/clawd/projects/nexus-desktop/src-tauri/Cargo.toml`
   - Update `version` in `/root/clawd/projects/nexus-desktop/package.json`

### Build AppImage

```bash
cd /root/clawd/projects/nexus-desktop
npm run tauri build
```

**Output location:**
```
/root/clawd/projects/nexus-desktop/src-tauri/target/release/bundle/appimage/
```

**File naming:**
```
Nexus_<version>_amd64.AppImage
```

---

## 📊 Implementation Timeline

| Priority | Feature | Estimated Time | Dependencies |
|----------|---------|----------------|--------------|
| 1 | OAuth (Google, Claude, OpenAI) | 2 days | None |
| 2 | OpenRouter Free | 0.5 days | None |
| 3 | Settings Logs Tab | 1 day | None |
| 4 | Proactive Heartbeat | 1.5 days | None |
| 5 | Model Hierarchy System | 3-4 days | OAuth |
| 6 | Nice-to-Have Improvements | 2 days | None |

**Total Estimated Time:** 10-12 days

**Recommended Order:**
1. OAuth (days 1-2)
2. OpenRouter Free (day 3 morning)
3. Settings Logs Tab (day 3 afternoon)
4. Proactive Heartbeat (days 4-5)
5. Model Hierarchy System (days 6-9)
6. Nice-to-Have Improvements (days 10-11)
7. Testing & Polish (day 12)

---

## 🔬 Model Rankings Research (TODO)

### Data Sources to Investigate

1. **Artificial Analysis** (https://artificialanalysis.ai/)
   - Benchmarks: Speed, quality, price
   - Update frequency: Weekly
   - Format: Web scraping or manual updates

2. **LMSys Chatbot Arena** (https://chat.lmsys.org/?leaderboard)
   - ELO ratings, head-to-head comparisons
   - API endpoint for leaderboard data
   - Update frequency: Daily
   - Best for: Quality/reasoning scores

3. **OpenRouter Models API** (https://openrouter.ai/api/v1/models)
   - Real-time pricing, availability
   - Official API
   - Update frequency: Real-time
   - Best for: Cost per token, model availability

4. **Community-Maintained Rankings**
   - Create `model-rankings.json` in Nexus repo
   - Community PRs to update rankings
   - Versioned releases

### Models to Add (Based on Feb 2026 Rankings)

**Top Tier (Elo 1460+):**
- ✅ Google: Gemini-3-Pro (1492), Gemini-3-Flash (1470)
- ✅ Anthropic: Claude Opus 4.6 (1490), Claude Opus 4.5 (1462)
- ✅ xAI: Grok-4.1-Thinking (1482), Grok-4.1 (1463)
- ✅ OpenAI: GPT-5.2-high (1465), GPT-5.1-high (1464), GPT-5.2 (1464)

**Mid Tier (Elo 1440-1460):**
- ⚠️ Moonshot: **Kimi-K2.5-Thinking** (1451) - Strong instruction following
- ⚠️ Z.ai: **GLM-4.7** (1445) - Best open-source
- ⚠️ Alibaba: **Qwen3-Max** (1443) - Self-hosting option

**Budget/Free Options:**
- ✅ OpenRouter: openrouter/auto:free (use OpenRouter's auto-selector)
- ⚠️ Community models via OpenRouter (Llama, Mistral, etc.)

**Category-Specific Leaders:**
- **Coding:** Gemini-3-Pro, GPT-5.1, Claude Opus 4.5/4.6
- **Reasoning:** Grok-4.1-Thinking, Claude Opus 4.6, Gemini-3-Pro
- **Vision:** Gemini-3-Pro, Claude Opus 4.5, Grok-4.1
- **Speed:** Gemini-3-Flash, Kimi-K2.5, GLM-4.7

**Scores to Use (from rankings):**
- Gemini-3-Pro: speed=7, reasoning=10, coding=10, cost=$1.25
- Claude Opus 4.6: speed=5, reasoning=10, coding=10, cost=$15.00
- Grok-4.1-Thinking: speed=4, reasoning=10, coding=8, cost=$8.00
- Gemini-3-Flash: speed=10, reasoning=8, coding=8, cost=$0.08
- Kimi-K2.5-Thinking: speed=8, reasoning=9, coding=7, cost=$0.50
- GLM-4.7: speed=9, reasoning=7, coding=7, cost=$0.10 (open-source)
- GPT-5.2: speed=6, reasoning=9, coding=8, cost=$3.00

### TODO
- [ ] Research real-time ranking APIs
- [ ] Decide on update strategy (static vs dynamic)
- [ ] Implement auto-update mechanism (optional)
- [ ] Create community contribution guidelines for model data

---

## ✅ Verification Steps

After implementing all updates:

1. **OAuth Flow:**
   - [ ] Set Google OAuth credentials → Authorize → Success
   - [ ] Set Claude OAuth credentials → Authorize → Success
   - [ ] Set OpenAI OAuth credentials → Authorize → Success
   - [ ] OAuth status shows expiry time

2. **OpenRouter Free:**
   - [ ] Select openrouter provider → "auto:free" model appears
   - [ ] Send chat with auto:free → works

3. **Logs Tab:**
   - [ ] Open Settings → Logs tab → see all logs
   - [ ] Filter by level → works
   - [ ] Export logs → downloads JSON
   - [ ] Clear logs → empties display

4. **Heartbeat:**
   - [ ] Enable heartbeat → daemon starts
   - [ ] Set interval to 1h → daemon respects it
   - [ ] Run manual heartbeat → executes tasks
   - [ ] Check logs → heartbeat tasks logged

5. **Model Hierarchy:**
   - [ ] Apply "Balanced" preset → hierarchy populated
   - [ ] Customize tier → model changes
   - [ ] Send chat → uses correct tier
   - [ ] Trigger escalation → moves to next tier
   - [ ] Check stats → shows cost & escalation rate

6. **Build:**
   - [ ] CLI builds without errors
   - [ ] Desktop builds without errors
   - [ ] TypeScript compiles clean
   - [ ] AppImage runs on laptop
   - [ ] All features work in AppImage

---

## 📝 Notes

- This is a MAJOR update - expect ~2 weeks of development
- Model hierarchy is the biggest feature (3-4 days alone)
- OAuth should be done first (other features may depend on it)
- Testing is critical - allocate 1-2 days for end-to-end testing
- AppImage build should be done LAST (after all features are complete)

---

**Last Updated:** 2026-02-07
**Document Version:** 1.0
