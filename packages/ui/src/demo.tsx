import { StrictMode, useState, useCallback, useRef } from 'react'
import { createRoot } from 'react-dom/client'
import { RemoteControl, RemoteControlHandle } from './components/remote-control'

interface InstanceData {
  webrtcUrl: string;
  token: string;
  name: string;
}

function InstanceLoader() {
  const [organizationId, setOrganizationId] = useState<string>("");
  const [apiToken, setApiToken] = useState<string>("");
  const remoteControlRef = useRef<RemoteControlHandle>(null);
  const [urlToOpen, setUrlToOpen] = useState<string>("https://www.limbar.io");
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [screenshotDataUri, setScreenshotDataUri] = useState<string | null>(null);
  
  const [instanceData, setInstanceData] = useState<InstanceData | null>(null);
  const [appState, setAppState] = useState<'idle' | 'creating' | 'running' | 'stopping' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);
  const [currentInstanceName, setCurrentInstanceName] = useState<string>('');

  const generateInstanceName = useCallback(() => {
      return `ui-demo-${Math.random().toString(36).substring(2, 10)}`;
  }, []);

  const createInstance = useCallback(async () => {
    if (!organizationId || !apiToken) {
      setError("Please enter both Organization ID and API Token.");
      setAppState('error');
      return;
    }

    const instanceName = generateInstanceName();
    setCurrentInstanceName(instanceName);
    setAppState('creating');
    setError(null);
    
    try {
      const apiEndpoint = `https://eu-north1.limbar.net/apis/android.limbar.io/v1alpha1/organizations/${organizationId}/instances`;
      
      const response = await fetch(apiEndpoint, {
        method: 'PUT',
        headers: {
          'authorization': `Bearer ${apiToken}`,
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          instance: {
            metadata: {
              name: instanceName, 
              organizationId: organizationId,
            },
            spec: {
              os: "Android",
            },
          },
          wait: true,
        }),
      });

      if (!response.ok) {
        const errorBody = await response.text();
        throw new Error(`API Error (${response.status}): ${errorBody}`);
      }

      const data = await response.json();

      if (data?.metadata?.name !== instanceName) {
        throw new Error(`API response mismatch: Expected ${instanceName}, got ${data?.metadata?.name}`);
      }

      if (data?.status?.webrtcUrl && data?.token && data?.status?.state === 'ready') {
        setInstanceData({
          webrtcUrl: data.status.webrtcUrl,
          token: data.token,
          name: data.metadata.name, 
        });
        setAppState('running');
      } else {
        throw new Error('Invalid API response format or instance not ready.');
      }
    } catch (err) {
      console.error("Failed to create instance:", err);
      setError(err instanceof Error ? err.message : String(err));
      setAppState('error');
    } 
  }, [generateInstanceName, organizationId, apiToken]);

  const stopInstance = useCallback(async () => {
    if (!instanceData || !organizationId || !apiToken) return;

    const instanceNameToDelete = instanceData.name;
    setAppState('stopping');
    setError(null);

    try {
        // Construct endpoint using state
        const apiEndpoint = `https://eu-north1.limbar.net/apis/android.limbar.io/v1alpha1/organizations/${organizationId}/instances`;
        const deleteUrl = `${apiEndpoint}/${instanceNameToDelete}`;
        
        const response = await fetch(deleteUrl, {
            method: 'DELETE',
            headers: {
                'authorization': `Bearer ${apiToken}`,
                'content-type': 'application/json',
            },
        });

        if (!response.ok) {
            let errorBody = '';
            try {
                errorBody = await response.text();
            } catch {}
            if (response.status !== 404) {
                throw new Error(`API Error (${response.status}): ${errorBody}`);
            }
        }

        setInstanceData(null);
        setAppState('idle');

    } catch (err) {
        console.error("Failed to stop instance:", err);
        setError(err instanceof Error ? err.message : `Failed to stop instance ${instanceNameToDelete}. ${String(err)}`);
        setAppState('error');
    } 
  }, [instanceData, organizationId, apiToken]);
  const showCreateButton = appState === 'idle';
  const showStopButton = appState === 'running' || appState === 'stopping';
  const isBusy = appState === 'creating' || appState === 'stopping';

  let mainContent;
  switch (appState) {
    case 'creating':
      mainContent = <p className="text-lg text-gray-600 text-center mt-10">Creating instance ({currentInstanceName})... Please wait.</p>;
      break;
    case 'running':
    case 'stopping':
      mainContent = (
        <div className={`relative h-[80vh] w-full overflow-hidden rounded-lg bg-muted/90 shadow-lg ${appState === 'stopping' ? 'opacity-50' : ''}`}>
          {instanceData && <RemoteControl ref={remoteControlRef} url={instanceData.webrtcUrl} token={instanceData.token} />}
        </div>
      );
      break;
    case 'error':
      mainContent = (
        <div className="text-center mt-10 p-4 border border-red-300 bg-red-50 rounded-md">
          <p className="text-red-700 font-semibold mb-2">Error</p>
          <p className="text-red-600 mb-4">{error}</p>
          <button 
            onClick={() => { setAppState('idle'); setError(null); }}
            className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600 transition-colors mr-2"
          >
            Dismiss
          </button>
        </div>
      );
      break;
    default: // Idle state shows nothing in the main area initially
      mainContent = <div className="text-center text-gray-500 mt-10">Please enter credentials and click "Create Instance".</div>;
      break;
  }

  return (
    // Changed layout: Inputs/Buttons at top, main content below
    <div className="w-full max-w-4xl h-full flex flex-col items-center p-5 space-y-6">
      <h1 className="text-3xl font-bold text-gray-800">Limbar Remote Control Demo</h1>
      
      {/* Inputs Section */}
      <div className="w-full flex flex-col md:flex-row gap-4 p-4 border rounded-lg bg-white shadow-sm">
        <div className="flex-1">
          <label htmlFor="orgId" className="block text-sm font-medium text-gray-700 mb-1">Organization ID</label>
          <input 
            type="text" 
            id="orgId" 
            value={organizationId}
            onChange={(e) => setOrganizationId(e.target.value)}
            disabled={isBusy || appState === 'running'}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm disabled:bg-gray-100 disabled:cursor-not-allowed"
            placeholder="e.g., 914173c5-512e..."
          />
        </div>
        <div className="flex-1">
          <label htmlFor="apiToken" className="block text-sm font-medium text-gray-700 mb-1">API Token</label>
          <input 
            id="apiToken" 
            value={apiToken}
            onChange={(e) => setApiToken(e.target.value)}
            disabled={isBusy || appState === 'running'}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm disabled:bg-gray-100 disabled:cursor-not-allowed"
            placeholder="lim_..."
          />
        </div>
      </div>

      {/* Buttons Section */}
      <div className="flex gap-4">
        {showCreateButton && (
          <button 
            onClick={createInstance} 
            disabled={isBusy}
            className="px-5 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors text-lg shadow disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            {isBusy ? 'Processing...' : 'Create Instance'}
          </button>
        )}
        {showStopButton && (
          <button
            onClick={stopInstance}
            disabled={appState === 'stopping'}
            className="px-5 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors shadow disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            {appState === 'stopping' ? 'Stopping...' : `Stop Instance (${instanceData?.name})`}
          </button>
        )}
      </div>

      {/* UI for sending open URL command */}
      {appState === 'running' && instanceData && (
        <div className="w-full flex flex-col md:flex-row gap-4 p-4 border rounded-lg bg-white shadow-sm items-end">
          <div className="flex-grow">
            <label htmlFor="urlToOpen" className="block text-sm font-medium text-gray-700 mb-1">URL to Open</label>
            <input
              type="text"
              id="urlToOpen"
              value={urlToOpen}
              onChange={(e) => setUrlToOpen(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              placeholder="e.g., https://www.example.com"
            />
          </div>
          <button
            onClick={() => {
              if (remoteControlRef.current && urlToOpen) {
                remoteControlRef.current.openUrl(urlToOpen);
              }
            }}
            className="px-5 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors text-lg shadow disabled:bg-gray-400 disabled:cursor-not-allowed"
            disabled={!urlToOpen}
          >
            Open URL in Instance
          </button>
        </div>
      )}

      {/* UI for sending RR (Refresh) command */}
      {appState === 'running' && instanceData && (
        <div className="w-full flex flex-col md:flex-row gap-4 p-4 border rounded-lg bg-white shadow-sm items-end justify-center">
          <button
            onClick={async () => {
              if (remoteControlRef.current && !isRefreshing) {
                setIsRefreshing(true);
                const rParams = { code: 'KeyR', shiftKey: true }; // Uppercase R
                if (remoteControlRef.current) {
                  remoteControlRef.current.sendKeyEvent({ type: 'keydown', ...rParams });
                  await new Promise(r => setTimeout(r, 50)); 
                  remoteControlRef.current.sendKeyEvent({ type: 'keyup', ...rParams });
                  await new Promise(r => setTimeout(r, 70)); 
                  remoteControlRef.current.sendKeyEvent({ type: 'keydown', ...rParams });
                  await new Promise(r => setTimeout(r, 50)); 
                  remoteControlRef.current.sendKeyEvent({ type: 'keyup', ...rParams });
                }
                setIsRefreshing(false);
              }
            }}
            className="px-5 py-2 bg-cyan-600 text-white rounded-md hover:bg-cyan-700 transition-colors text-lg shadow disabled:bg-gray-400 disabled:cursor-not-allowed"
            disabled={isRefreshing}
          >
            {isRefreshing ? 'Sending RR...' : 'Refresh (Send RR)'}
          </button>
        </div>
      )}

      {/* UI for taking a screenshot */}
      {appState === 'running' && instanceData && (
        <div className="w-full flex flex-col items-center gap-4 p-4 border rounded-lg bg-white shadow-sm">
          <button
            onClick={async () => {
              if (remoteControlRef.current) {
                try {
                  console.log("Requesting screenshot...");
                  const screenshot = await remoteControlRef.current.screenshot();
                  console.log("Screenshot received:", screenshot.dataUri.substring(0, 50) + "...");
                  setScreenshotDataUri(screenshot.dataUri);
                } catch (err) {
                  console.error("Failed to take screenshot:", err);
                  setError("Failed to take screenshot: " + (err instanceof Error ? err.message : String(err)));
                  // Optionally, set appState to 'error' or show a more specific error message for screenshots
                }
              }
            }}
            className="px-5 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 transition-colors text-lg shadow"
          >
            Take Screenshot
          </button>
          {screenshotDataUri && (
            <div className="mt-4 p-2 border rounded-md shadow-inner bg-gray-50 relative">
              <img src={screenshotDataUri} alt="Instance Screenshot" className="max-w-full h-auto rounded" style={{ maxHeight: '400px' }} />
              <button
                onClick={() => setScreenshotDataUri(null)}
                className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1 text-xs leading-none hover:bg-red-600"
                aria-label="Clear screenshot"
              >
                X
              </button>
            </div>
          )}
        </div>
      )}

      {/* Main Content Area (Loading / Error / RemoteControl) */}
      <div className="w-full flex-grow flex justify-center items-center">
        {mainContent}
      </div>

    </div>
  );
}

// Render the InstanceLoader inside a full-screen container
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {/* Use Tailwind for full screen centering */}
    <div className="h-screen w-screen flex flex-col justify-center items-center bg-gray-100 p-4">
      <InstanceLoader />
    </div>
  </StrictMode>,
)
