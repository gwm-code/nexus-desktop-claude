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

    // Smart status polling with exponential backoff
    let pollInterval = 5000; // Start at 5s
    let lastActivity = Date.now();
    let intervalId: NodeJS.Timeout;

    const schedulePoll = () => {
      const timeSinceActivity = Date.now() - lastActivity;

      // Fast polling when active (< 1 min idle)
      if (timeSinceActivity < 60000) {
        pollInterval = 5000; // 5s
      }
      // Medium polling when recently active (1-5 min idle)
      else if (timeSinceActivity < 300000) {
        pollInterval = 15000; // 15s
      }
      // Slow polling when idle (5+ min)
      else {
        pollInterval = 60000; // 60s
      }

      intervalId = setTimeout(() => {
        checkNexusStatus();
        schedulePoll();
      }, pollInterval);
    };

    // Track user activity
    const resetActivity = () => {
      lastActivity = Date.now();
    };

    window.addEventListener('click', resetActivity);
    window.addEventListener('keypress', resetActivity);
    window.addEventListener('focus', resetActivity);

    schedulePoll();

    return () => {
      clearTimeout(intervalId);
      window.removeEventListener('click', resetActivity);
      window.removeEventListener('keypress', resetActivity);
      window.removeEventListener('focus', resetActivity);
    };
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
