import { useState, useEffect } from 'react';
import {
  X, Server, Shield, Key, Terminal, Check, AlertCircle,
  Palette, Code2, Settings2, Cpu, Zap, Eye, EyeOff,
  RotateCcw, Database, Activity
} from 'lucide-react';
import { useNexusStore } from '../store/useNexusStore';
import { invoke } from '@tauri-apps/api/core';

type Tab = 'connection' | 'provider' | 'appearance' | 'editor' | 'advanced';

const tabs: { id: Tab; label: string; icon: React.ElementType }[] = [
  { id: 'connection', label: 'Connection', icon: Server },
  { id: 'provider', label: 'Provider & Model', icon: Cpu },
  { id: 'appearance', label: 'Appearance', icon: Palette },
  { id: 'editor', label: 'Editor', icon: Code2 },
  { id: 'advanced', label: 'Advanced', icon: Settings2 },
];

// Shared input styling
const inputClass = 'w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-200 focus:outline-none focus:ring-1 focus:ring-blue-500';
const labelClass = 'text-[11px] font-medium text-zinc-400 ml-1';
const sectionTitleClass = 'flex items-center gap-2 text-xs font-bold text-zinc-500 uppercase tracking-widest';

// ============================================================================
// Toggle Component
// ============================================================================

const Toggle: React.FC<{ enabled: boolean; onChange: (v: boolean) => void; label: string; description?: string }> = ({
  enabled, onChange, label, description,
}) => (
  <div className="flex items-center justify-between py-2">
    <div>
      <p className="text-sm text-zinc-300">{label}</p>
      {description && <p className="text-[11px] text-zinc-600 mt-0.5">{description}</p>}
    </div>
    <button
      onClick={() => onChange(!enabled)}
      className={`relative w-10 h-5 rounded-full transition-colors ${enabled ? 'bg-blue-600' : 'bg-zinc-700'}`}
    >
      <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform ${enabled ? 'left-5' : 'left-0.5'}`} />
    </button>
  </div>
);

// ============================================================================
// Connection Tab (existing SSH settings)
// ============================================================================

const ConnectionTab: React.FC = () => {
  const { settings, updateSetting, setBackendStatus, addToast } = useNexusStore();
  const [host, setHost] = useState(settings.sshSettings?.host || '89.167.14.222');
  const [port, setPort] = useState(settings.sshSettings?.port || 22);
  const [username, setUsername] = useState(settings.sshSettings?.username || 'root');
  const [password, setPassword] = useState(settings.sshSettings?.password || '');
  const [privateKey, setPrivateKey] = useState(settings.sshSettings?.privateKey || '');
  const [publicKey, setPublicKey] = useState(settings.sshSettings?.publicKey || '');
  const [authMode, setAuthMode] = useState<'password' | 'key'>(privateKey ? 'key' : 'password');
  const [status, setStatus] = useState<'idle' | 'connecting' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleConnect = async () => {
    setStatus('connecting');
    setErrorMessage(null);
    try {
      await invoke('connect_remote', {
        host, port, username,
        password: authMode === 'password' ? (password || null) : null,
        privateKey: authMode === 'key' ? (privateKey || null) : null,
        publicKey: authMode === 'key' ? (publicKey || null) : null,
      });
      updateSetting('sshSettings', {
        host, port, username,
        password: authMode === 'password' ? password : '',
        privateKey: authMode === 'key' ? privateKey : '',
        publicKey: authMode === 'key' ? publicKey : '',
      });
      setBackendStatus('connected');
      setStatus('success');
      addToast({ type: 'success', title: 'Connected', message: `SSH to ${host}:${port}` });
    } catch (err: any) {
      setStatus('error');
      setBackendStatus('error', err.toString());
      setErrorMessage(err.toString());
    }
  };

  return (
    <div className="space-y-6">
      <div className={sectionTitleClass}>
        <Shield className="w-3.5 h-3.5" />
        <span>Remote SSH</span>
        <div className="flex bg-zinc-950 rounded-lg p-0.5 border border-zinc-800 ml-auto">
          <button
            onClick={() => setAuthMode('password')}
            className={`px-2 py-1 rounded-md text-[10px] transition-all ${authMode === 'password' ? 'bg-zinc-800 text-zinc-200' : 'text-zinc-500 hover:text-zinc-400'}`}
          >Password</button>
          <button
            onClick={() => setAuthMode('key')}
            className={`px-2 py-1 rounded-md text-[10px] transition-all ${authMode === 'key' ? 'bg-zinc-800 text-zinc-200' : 'text-zinc-500 hover:text-zinc-400'}`}
          >Key</button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <label className={labelClass}>Host Address</label>
          <input value={host} onChange={(e) => setHost(e.target.value)} className={inputClass} />
        </div>
        <div className="space-y-1.5">
          <label className={labelClass}>SSH Port</label>
          <input type="number" value={port} onChange={(e) => setPort(parseInt(e.target.value))} className={inputClass} />
        </div>
      </div>

      <div className="space-y-1.5">
        <label className={labelClass}>Username</label>
        <input value={username} onChange={(e) => setUsername(e.target.value)} className={inputClass} />
      </div>

      {authMode === 'password' ? (
        <div className="space-y-1.5">
          <label className={labelClass}>Password</label>
          <div className="relative">
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className={`${inputClass} pr-10`} />
            <Key className="absolute right-3 top-2.5 w-4 h-4 text-zinc-600" />
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="space-y-1.5">
            <label className={labelClass}>Private Key Content</label>
            <textarea value={privateKey} onChange={(e) => setPrivateKey(e.target.value)} rows={4} className={`${inputClass} text-[10px] font-mono resize-none`} placeholder="-----BEGIN OPENSSH PRIVATE KEY-----" />
          </div>
          <div className="space-y-1.5">
            <label className={labelClass}>Public Key Content (Optional for RSA, Required for ED25519)</label>
            <textarea value={publicKey} onChange={(e) => setPublicKey(e.target.value)} rows={2} className={`${inputClass} text-[10px] font-mono resize-none`} placeholder="ssh-ed25519 AAAA..." />
          </div>
        </div>
      )}

      {errorMessage && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 flex items-start gap-3">
          <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
          <p className="text-xs text-red-400 leading-relaxed">{errorMessage}</p>
        </div>
      )}
      {status === 'success' && (
        <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-3 flex items-center gap-3">
          <Check className="w-4 h-4 text-emerald-500 shrink-0" />
          <p className="text-xs text-emerald-400 font-medium">Connected to Nexus brain</p>
        </div>
      )}

      <button onClick={handleConnect} disabled={status === 'connecting'} className={`flex items-center gap-2 px-5 py-2 rounded-lg text-xs font-bold transition-all w-full justify-center ${status === 'connecting' ? 'bg-blue-600/50 text-white cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-600/20'}`}>
        {status === 'connecting' ? (
          <div className="flex items-center gap-2">
            <div className="animate-spin h-3.5 w-3.5 border-2 border-white/30 border-t-white rounded-full" />
            <span>Connecting...</span>
          </div>
        ) : (
          <><Terminal className="w-3.5 h-3.5" /><span>Establish Connection</span></>
        )}
      </button>
    </div>
  );
};

// ============================================================================
// Provider & Model Tab
// ============================================================================

const ProviderTab: React.FC = () => {
  const {
    availableProviders, availableModels, activeProvider, activeModel,
    setProvider, setModel, setApiKey, loadAvailableModels, testProviderConnection, loadProviders,
  } = useNexusStore();

  const [apiKeyInput, setApiKeyInput] = useState('');
  const [baseUrlInput, setBaseUrlInput] = useState('');
  const [showApiKey, setShowApiKey] = useState(false);
  const [testStatus, setTestStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');
  const [savingKey, setSavingKey] = useState(false);

  const knownProviders = ['opencode', 'openrouter', 'google', 'claude', 'custom'];
  const providerList = availableProviders.length > 0
    ? [...new Set([...availableProviders, ...knownProviders])]
    : knownProviders;

  useEffect(() => {
    loadProviders();
  }, [loadProviders]);

  useEffect(() => {
    if (activeProvider) {
      loadAvailableModels(activeProvider);
    }
  }, [activeProvider, loadAvailableModels]);

  const handleSaveApiKey = async () => {
    if (!apiKeyInput.trim() || !activeProvider) return;
    setSavingKey(true);
    try {
      await setApiKey(activeProvider, apiKeyInput.trim());
      setApiKeyInput('');
    } finally {
      setSavingKey(false);
    }
  };

  const handleTestConnection = async () => {
    if (!activeProvider) return;
    setTestStatus('testing');
    try {
      await testProviderConnection(activeProvider);
      setTestStatus('success');
      setTimeout(() => setTestStatus('idle'), 3000);
    } catch {
      setTestStatus('error');
      setTimeout(() => setTestStatus('idle'), 3000);
    }
  };

  return (
    <div className="space-y-6">
      <div className={sectionTitleClass}>
        <Cpu className="w-3.5 h-3.5" />
        <span>AI Provider</span>
      </div>

      <div className="space-y-1.5">
        <label className={labelClass}>Provider</label>
        <select
          value={activeProvider}
          onChange={(e) => setProvider(e.target.value)}
          className={inputClass}
        >
          <option value="">Select provider...</option>
          {providerList.map((p) => (
            <option key={p} value={p}>{p}</option>
          ))}
        </select>
      </div>

      <div className="space-y-1.5">
        <label className={labelClass}>Model</label>
        <select
          value={activeModel}
          onChange={(e) => setModel(e.target.value)}
          className={inputClass}
          disabled={!activeProvider}
        >
          <option value="">Select model...</option>
          {availableModels.map((m) => (
            <option key={m} value={m}>{m}</option>
          ))}
        </select>
        {availableModels.length === 0 && activeProvider && (
          <p className="text-[10px] text-zinc-600 mt-1">No models loaded. Save an API key and test connection first.</p>
        )}
      </div>

      <div className={sectionTitleClass}>
        <Key className="w-3.5 h-3.5" />
        <span>Authentication</span>
      </div>

      <div className="space-y-1.5">
        <label className={labelClass}>API Key {activeProvider ? `(${activeProvider})` : ''}</label>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <input
              type={showApiKey ? 'text' : 'password'}
              value={apiKeyInput}
              onChange={(e) => setApiKeyInput(e.target.value)}
              className={`${inputClass} pr-10`}
              placeholder="sk-..."
              disabled={!activeProvider}
            />
            <button
              onClick={() => setShowApiKey(!showApiKey)}
              className="absolute right-3 top-2.5 text-zinc-600 hover:text-zinc-400"
            >
              {showApiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          <button
            onClick={handleSaveApiKey}
            disabled={!apiKeyInput.trim() || !activeProvider || savingKey}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:bg-zinc-800 disabled:text-zinc-600 text-white text-xs font-bold rounded-lg transition-colors"
          >
            {savingKey ? '...' : 'Save'}
          </button>
        </div>
      </div>

      {activeProvider === 'custom' && (
        <div className="space-y-1.5">
          <label className={labelClass}>Base URL</label>
          <input
            value={baseUrlInput}
            onChange={(e) => setBaseUrlInput(e.target.value)}
            className={inputClass}
            placeholder="https://api.example.com/v1"
          />
        </div>
      )}

      <button
        onClick={handleTestConnection}
        disabled={!activeProvider || testStatus === 'testing'}
        className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all w-full justify-center ${
          testStatus === 'testing' ? 'bg-zinc-800 text-zinc-400 cursor-not-allowed' :
          testStatus === 'success' ? 'bg-emerald-600/20 border border-emerald-500/30 text-emerald-400' :
          testStatus === 'error' ? 'bg-red-600/20 border border-red-500/30 text-red-400' :
          'bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border border-zinc-700'
        }`}
      >
        {testStatus === 'testing' ? (
          <><div className="animate-spin h-3.5 w-3.5 border-2 border-zinc-500/30 border-t-zinc-300 rounded-full" /><span>Testing...</span></>
        ) : testStatus === 'success' ? (
          <><Check className="w-3.5 h-3.5" /><span>Connection Verified</span></>
        ) : testStatus === 'error' ? (
          <><AlertCircle className="w-3.5 h-3.5" /><span>Connection Failed</span></>
        ) : (
          <><Zap className="w-3.5 h-3.5" /><span>Test Connection</span></>
        )}
      </button>
    </div>
  );
};

// ============================================================================
// Appearance Tab
// ============================================================================

const AppearanceTab: React.FC = () => {
  const { settings, updateSetting } = useNexusStore();

  return (
    <div className="space-y-6">
      <div className={sectionTitleClass}>
        <Palette className="w-3.5 h-3.5" />
        <span>Theme & Display</span>
      </div>

      <div className="space-y-1.5">
        <label className={labelClass}>Theme</label>
        <div className="flex gap-2">
          {(['dark', 'light', 'system'] as const).map((t) => (
            <button
              key={t}
              onClick={() => updateSetting('theme', t)}
              className={`flex-1 px-3 py-2 rounded-lg text-xs font-medium transition-all border ${
                settings.theme === t
                  ? 'bg-blue-600/20 border-blue-500/30 text-blue-400'
                  : 'bg-zinc-950 border-zinc-800 text-zinc-500 hover:text-zinc-300 hover:border-zinc-700'
              }`}
            >
              {t.charAt(0).toUpperCase() + t.slice(1)}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-1.5">
        <label className={labelClass}>Font Size ({settings.fontSize}px)</label>
        <input
          type="range" min={10} max={20} step={1}
          value={settings.fontSize}
          onChange={(e) => updateSetting('fontSize', parseInt(e.target.value))}
          className="w-full accent-blue-500"
        />
        <div className="flex justify-between text-[10px] text-zinc-600">
          <span>10px</span><span>20px</span>
        </div>
      </div>

      <div className="space-y-1.5">
        <label className={labelClass}>Font Family</label>
        <select
          value={settings.fontFamily}
          onChange={(e) => updateSetting('fontFamily', e.target.value)}
          className={inputClass}
        >
          {['JetBrains Mono', 'Fira Code', 'Source Code Pro', 'IBM Plex Mono', 'Cascadia Code', 'Menlo', 'Monaco', 'Consolas'].map((f) => (
            <option key={f} value={f}>{f}</option>
          ))}
        </select>
      </div>

      <div className={sectionTitleClass}>
        <Settings2 className="w-3.5 h-3.5" />
        <span>Panels</span>
      </div>

      <Toggle
        label="Sidebar Visible"
        description="Show the left sidebar on startup"
        enabled={settings.sidebarVisible}
        onChange={(v) => updateSetting('sidebarVisible', v)}
      />
      <Toggle
        label="Terminal Visible"
        description="Show the terminal panel on startup"
        enabled={settings.terminalVisible}
        onChange={(v) => updateSetting('terminalVisible', v)}
      />
    </div>
  );
};

// ============================================================================
// Editor Tab
// ============================================================================

const EditorTab: React.FC = () => {
  const { settings, updateSetting } = useNexusStore();
  const editor = settings.editorSettings || { tabSize: 2, useSpaces: true, wordWrap: true, minimap: false, lineNumbers: true };

  const updateEditor = (key: string, value: any) => {
    updateSetting('editorSettings', { ...editor, [key]: value });
  };

  return (
    <div className="space-y-6">
      <div className={sectionTitleClass}>
        <Code2 className="w-3.5 h-3.5" />
        <span>Code Editor</span>
      </div>

      <div className="space-y-1.5">
        <label className={labelClass}>Tab Size</label>
        <div className="flex gap-2">
          {[2, 4, 8].map((size) => (
            <button
              key={size}
              onClick={() => updateEditor('tabSize', size)}
              className={`flex-1 px-3 py-2 rounded-lg text-xs font-medium transition-all border ${
                editor.tabSize === size
                  ? 'bg-blue-600/20 border-blue-500/30 text-blue-400'
                  : 'bg-zinc-950 border-zinc-800 text-zinc-500 hover:text-zinc-300 hover:border-zinc-700'
              }`}
            >
              {size} spaces
            </button>
          ))}
        </div>
      </div>

      <Toggle
        label="Use Spaces"
        description="Insert spaces instead of tab characters"
        enabled={editor.useSpaces}
        onChange={(v) => updateEditor('useSpaces', v)}
      />
      <Toggle
        label="Word Wrap"
        description="Wrap long lines to fit the editor width"
        enabled={editor.wordWrap}
        onChange={(v) => updateEditor('wordWrap', v)}
      />
      <Toggle
        label="Minimap"
        description="Show code minimap on the right side"
        enabled={editor.minimap}
        onChange={(v) => updateEditor('minimap', v)}
      />
      <Toggle
        label="Line Numbers"
        description="Show line numbers in the gutter"
        enabled={editor.lineNumbers}
        onChange={(v) => updateEditor('lineNumbers', v)}
      />
    </div>
  );
};

// ============================================================================
// Advanced Tab
// ============================================================================

const AdvancedTab: React.FC = () => {
  const { settings, updateSetting, consolidateMemory, addToast } = useNexusStore();
  const [consolidating, setConsolidating] = useState(false);

  const handleConsolidate = async () => {
    setConsolidating(true);
    try {
      await consolidateMemory();
      addToast({ type: 'success', title: 'Memory consolidated' });
    } catch {
      addToast({ type: 'error', title: 'Consolidation failed' });
    } finally {
      setConsolidating(false);
    }
  };

  const handleWatcherAction = async (action: 'start' | 'stop') => {
    try {
      await invoke(action === 'start' ? 'watch_start' : 'watch_stop');
      addToast({ type: 'success', title: `Watcher ${action}ed` });
    } catch (e) {
      addToast({ type: 'error', title: `Failed to ${action} watcher`, message: String(e) });
    }
  };

  return (
    <div className="space-y-6">
      <div className={sectionTitleClass}>
        <Settings2 className="w-3.5 h-3.5" />
        <span>Auto-Save</span>
      </div>

      <Toggle
        label="Auto-Save"
        description="Automatically save changes"
        enabled={settings.autoSave}
        onChange={(v) => updateSetting('autoSave', v)}
      />

      {settings.autoSave && (
        <div className="space-y-1.5">
          <label className={labelClass}>Save Interval ({settings.autoSaveInterval}s)</label>
          <input
            type="range" min={5} max={120} step={5}
            value={settings.autoSaveInterval}
            onChange={(e) => updateSetting('autoSaveInterval', parseInt(e.target.value))}
            className="w-full accent-blue-500"
          />
          <div className="flex justify-between text-[10px] text-zinc-600">
            <span>5s</span><span>120s</span>
          </div>
        </div>
      )}

      <div className={sectionTitleClass}>
        <Activity className="w-3.5 h-3.5" />
        <span>Notifications & Privacy</span>
      </div>

      <Toggle
        label="Notifications"
        description="Show desktop notifications for events"
        enabled={settings.enableNotifications}
        onChange={(v) => updateSetting('enableNotifications', v)}
      />
      <Toggle
        label="Sound Effects"
        description="Play sounds for certain events"
        enabled={settings.soundEffects}
        onChange={(v) => updateSetting('soundEffects', v)}
      />
      <Toggle
        label="Telemetry"
        description="Send anonymous usage data to improve Nexus"
        enabled={settings.telemetryEnabled}
        onChange={(v) => updateSetting('telemetryEnabled', v)}
      />

      <div className={sectionTitleClass}>
        <Database className="w-3.5 h-3.5" />
        <span>Memory & Watcher</span>
      </div>

      <div className="flex gap-2">
        <button
          onClick={handleConsolidate}
          disabled={consolidating}
          className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 disabled:opacity-50 border border-zinc-700 rounded-lg text-xs font-medium text-zinc-300 transition-colors"
        >
          {consolidating ? (
            <><div className="animate-spin h-3.5 w-3.5 border-2 border-zinc-500/30 border-t-zinc-300 rounded-full" /><span>Consolidating...</span></>
          ) : (
            <><Database className="w-3.5 h-3.5" /><span>Consolidate Memory</span></>
          )}
        </button>
      </div>

      <div className="flex gap-2">
        <button
          onClick={() => handleWatcherAction('start')}
          className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/30 rounded-lg text-xs font-medium text-emerald-400 transition-colors"
        >
          <Activity className="w-3.5 h-3.5" />
          <span>Start Watcher</span>
        </button>
        <button
          onClick={() => handleWatcherAction('stop')}
          className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-red-600/20 hover:bg-red-600/30 border border-red-500/30 rounded-lg text-xs font-medium text-red-400 transition-colors"
        >
          <Activity className="w-3.5 h-3.5" />
          <span>Stop Watcher</span>
        </button>
      </div>

      <div className={sectionTitleClass}>
        <RotateCcw className="w-3.5 h-3.5" />
        <span>Reset</span>
      </div>

      <button
        onClick={() => {
          useNexusStore.getState().resetSettings();
          addToast({ type: 'info', title: 'Settings reset to defaults' });
        }}
        className="flex items-center justify-center gap-2 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 rounded-lg text-xs font-medium text-zinc-400 hover:text-zinc-300 transition-colors w-full"
      >
        <RotateCcw className="w-3.5 h-3.5" />
        <span>Reset All Settings</span>
      </button>
    </div>
  );
};

// ============================================================================
// Main Settings Modal
// ============================================================================

export const SettingsModal: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const [activeTab, setActiveTab] = useState<Tab>('connection');

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="w-[680px] max-h-[85vh] bg-zinc-900 border border-zinc-800 rounded-xl shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-zinc-800 flex items-center justify-between bg-zinc-900/50">
          <div className="flex items-center gap-2">
            <Settings2 className="w-5 h-5 text-blue-500" />
            <h2 className="text-lg font-semibold text-zinc-100">Settings</h2>
          </div>
          <button onClick={onClose} className="p-1 text-zinc-500 hover:text-white transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="flex flex-1 min-h-0">
          {/* Tab Sidebar */}
          <div className="w-48 border-r border-zinc-800 bg-zinc-950/50 py-2 flex-shrink-0">
            {tabs.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setActiveTab(id)}
                className={`w-full flex items-center gap-2.5 px-4 py-2.5 text-xs font-medium transition-colors ${
                  activeTab === id
                    ? 'bg-zinc-800/80 text-zinc-100 border-r-2 border-blue-500'
                    : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/40'
                }`}
              >
                <Icon className="w-4 h-4" />
                {label}
              </button>
            ))}
          </div>

          {/* Tab Content */}
          <div className="flex-1 p-6 overflow-y-auto">
            {activeTab === 'connection' && <ConnectionTab />}
            {activeTab === 'provider' && <ProviderTab />}
            {activeTab === 'appearance' && <AppearanceTab />}
            {activeTab === 'editor' && <EditorTab />}
            {activeTab === 'advanced' && <AdvancedTab />}
          </div>
        </div>
      </div>
    </div>
  );
};
