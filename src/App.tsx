import { useEffect, useState } from 'react';
import { MainLayout } from './components/MainLayout';
import { useNexusStore } from './store/useNexusStore';
import { WifiOff, RefreshCw } from 'lucide-react';
import './App.css';

function App() {
  const [isInitializing, setIsInitializing] = useState(true);
  const { checkNexusStatus, initializeTauriListeners, backend } = useNexusStore();

  useEffect(() => {
    // Initialize Tauri listeners and check connection
    const init = async () => {
      try {
        await initializeTauriListeners();
        await checkNexusStatus();
      } catch (error) {
        console.error('Failed to initialize:', error);
      } finally {
        setIsInitializing(false);
      }
    };

    init();

    // Set up periodic status check
    const interval = setInterval(() => {
      checkNexusStatus();
    }, 30000);

    return () => clearInterval(interval);
  }, [checkNexusStatus, initializeTauriListeners]);

  if (isInitializing) {
    return (
      <div className="flex items-center justify-center h-screen bg-zinc-950 text-zinc-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <h1 className="text-xl font-semibold mb-2">Initializing Nexus Desktop...</h1>
          <p className="text-zinc-400">Connecting to Nexus CLI backend</p>
        </div>
      </div>
    );
  }

  // Show warning if not connected, but still show the app
  const showConnectionWarning = backend.status === 'disconnected' || backend.status === 'error';

  return (
    <div className="h-screen w-full bg-zinc-950 text-zinc-100 overflow-hidden">
      {showConnectionWarning && (
        <div className="bg-yellow-500/10 border-b border-yellow-500/30 px-4 py-2 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <WifiOff className="w-4 h-4 text-yellow-500" />
            <span className="text-sm text-yellow-500">
              Nexus CLI not detected. Some features may be unavailable.
            </span>
          </div>
          <button
            onClick={() => checkNexusStatus()}
            className="flex items-center gap-1 px-3 py-1 bg-yellow-500/20 hover:bg-yellow-500/30 rounded text-xs text-yellow-500 transition-colors"
          >
            <RefreshCw className="w-3 h-3" />
            Retry
          </button>
        </div>
      )}
      <MainLayout />
    </div>
  );
}

export default App;
