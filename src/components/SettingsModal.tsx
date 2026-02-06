import React, { useState } from 'react';
import { X, Server, Shield, Key, Terminal, Check, AlertCircle } from 'lucide-react';
import { useNexusStore } from '../store/useNexusStore';
import { invoke } from '@tauri-apps/api/core';

export const SettingsModal: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const { settings, updateSetting, setBackendStatus } = useNexusStore();
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
        host,
        port,
        username,
        password: authMode === 'password' ? (password || null) : null,
        privateKey: authMode === 'key' ? (privateKey || null) : null,
        publicKey: authMode === 'key' ? (publicKey || null) : null,
      });
      
      updateSetting('sshSettings', {
        host,
        port,
        username,
        password: authMode === 'password' ? password : '',
        privateKey: authMode === 'key' ? privateKey : '',
        publicKey: authMode === 'key' ? publicKey : '',
      });
      
      setBackendStatus('connected');
      setStatus('success');
      setTimeout(() => {
        setStatus('idle');
        onClose();
      }, 1500);
    } catch (err: any) {
      setStatus('error');
      setBackendStatus('error', err.toString());
      setErrorMessage(err.toString());
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="w-[550px] bg-zinc-900 border border-zinc-800 rounded-xl shadow-2xl overflow-hidden flex flex-col">
        <div className="px-6 py-4 border-b border-zinc-800 flex items-center justify-between bg-zinc-900/50">
          <div className="flex items-center gap-2">
            <Server className="w-5 h-5 text-blue-500" />
            <h2 className="text-lg font-semibold text-zinc-100">Connection Settings</h2>
          </div>
          <button onClick={onClose} className="p-1 text-zinc-500 hover:text-white transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="p-6 space-y-6 overflow-y-auto max-h-[70vh]">
          <div className="space-y-4">
            <div className="flex items-center justify-between text-xs font-bold text-zinc-500 uppercase tracking-widest">
              <div className="flex items-center gap-2">
                <Shield className="w-3.5 h-3.5" />
                <span>Remote SSH (Helsinki)</span>
              </div>
              <div className="flex bg-zinc-950 rounded-lg p-0.5 border border-zinc-800">
                <button 
                  onClick={() => setAuthMode('password')}
                  className={`px-2 py-1 rounded-md transition-all ${authMode === 'password' ? 'bg-zinc-800 text-zinc-200' : 'text-zinc-500 hover:text-zinc-400'}`}
                >Password</button>
                <button 
                  onClick={() => setAuthMode('key')}
                  className={`px-2 py-1 rounded-md transition-all ${authMode === 'key' ? 'bg-zinc-800 text-zinc-200' : 'text-zinc-500 hover:text-zinc-400'}`}
                >Key</button>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-[11px] font-medium text-zinc-400 ml-1">Host Address</label>
                <input value={host} onChange={(e) => setHost(e.target.value)} className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-200 focus:outline-none focus:ring-1 focus:ring-blue-500" />
              </div>
              <div className="space-y-1.5">
                <label className="text-[11px] font-medium text-zinc-400 ml-1">SSH Port</label>
                <input type="number" value={port} onChange={(e) => setPort(parseInt(e.target.value))} className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-200 focus:outline-none focus:ring-1 focus:ring-blue-500" />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] font-medium text-zinc-400 ml-1">Username</label>
              <input value={username} onChange={(e) => setUsername(e.target.value)} className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-200 focus:outline-none focus:ring-1 focus:ring-blue-500" />
            </div>

            {authMode === 'password' ? (
              <div className="space-y-1.5">
                <label className="text-[11px] font-medium text-zinc-400 ml-1">Password</label>
                <div className="relative">
                  <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-200 focus:outline-none focus:ring-1 focus:ring-blue-500 pr-10" />
                  <Key className="absolute right-3 top-2.5 w-4 h-4 text-zinc-600" />
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-[11px] font-medium text-zinc-400 ml-1">Private Key Content</label>
                  <textarea value={privateKey} onChange={(e) => setPrivateKey(e.target.value)} rows={4} className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-[10px] font-mono text-zinc-300 focus:outline-none focus:ring-1 focus:ring-blue-500 resize-none" placeholder="-----BEGIN OPENSSH PRIVATE KEY-----" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[11px] font-medium text-zinc-400 ml-1">Public Key Content (Optional for RSA, Mandatory for ED25519)</label>
                  <textarea value={publicKey} onChange={(e) => setPublicKey(e.target.value)} rows={2} className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-[10px] font-mono text-zinc-300 focus:outline-none focus:ring-1 focus:ring-blue-500 resize-none" placeholder="ssh-ed25519 AAAA..." />
                </div>
              </div>
            )}
          </div>

          {errorMessage && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 flex items-start gap-3">
              <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
              <p className="text-xs text-red-400 leading-relaxed">{errorMessage}</p>
            </div>
          )}

          {status === 'success' && (
            <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-3 flex items-center gap-3">
              <Check className="w-4 h-4 text-emerald-500 shrink-0" />
              <p className="text-xs text-emerald-400 font-medium">Successfully connected to Nexus brain!</p>
            </div>
          )}
        </div>

        <div className="px-6 py-4 bg-zinc-900/80 border-t border-zinc-800 flex items-center justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 text-xs font-semibold text-zinc-400 hover:text-white transition-colors">Cancel</button>
          <button onClick={handleConnect} disabled={status === 'connecting'} className={`flex items-center gap-2 px-5 py-2 rounded-lg text-xs font-bold transition-all ${status === 'connecting' ? 'bg-blue-600/50 text-white cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-600/20'}`}>
            {status === 'connecting' ? (
              <div className="flex items-center gap-2">
                <div className="animate-spin h-3.5 w-3.5 border-2 border-white/30 border-t-white rounded-full" />
                <span>Connecting...</span>
              </div>
            ) : (
              <> <Terminal className="w-3.5 h-3.5" /> <span>Establish Connection</span> </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
