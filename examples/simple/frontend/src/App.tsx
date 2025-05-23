import { RemoteControl } from '@limbar/ui';
import { useState } from 'react';

function App() {
  const [instanceData, setInstanceData] = useState<{
    webrtcUrl: string;
    token: string;
  } | undefined>(undefined);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | undefined>(undefined);
  
  const createInstance = async () => {
    try {
      // Clear any previous errors and set loading state
      setError(undefined);
      setLoading(true);
      
      const response = await fetch('http://localhost:3000/create-instance', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: `sdk-example`
        })
      });
      const data = await response.json();
      if (!response.ok) {
        setError(data.message || 'Request creation failed');
        return;
      }
      setInstanceData({
        webrtcUrl: data.webrtcUrl,
        token: data.token
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container" style={{ padding: '20px', maxWidth: '800px', margin: '0 auto' }}>
      <h1>Limbar Remote Control</h1>
      
      {!instanceData && (
        <div style={{ marginBottom: '20px' }}>
          <button 
            onClick={createInstance}
            disabled={loading}
            style={{
              padding: '10px 20px',
              fontSize: '16px',
              backgroundColor: loading ? '#cccccc' : '#007bff',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: loading ? 'not-allowed' : 'pointer'
            }}
          >
            {loading ? 'Creating Instance...' : 'Create New Instance'}
          </button>
        </div>
      )}
      
      {error && (
        <div style={{ 
          padding: '10px', 
          backgroundColor: '#f8d7da', 
          color: '#721c24', 
          borderRadius: '4px',
          marginBottom: '20px'
        }}>
          <strong>Error:</strong> {error}
        </div>
      )}
      
      {instanceData && (
        <>
          <div style={{ 
            padding: '10px', 
            backgroundColor: '#d4edda', 
            color: '#155724', 
            borderRadius: '4px',
            marginBottom: '20px'
          }}>
            Instance created successfully! Remote control is ready.
          </div>
          <RemoteControl
            url={instanceData.webrtcUrl}
            token={instanceData.token}
            sessionId={`session-${Date.now()}`}
          />
        </>
      )}
    </div>
  );
}

export default App
