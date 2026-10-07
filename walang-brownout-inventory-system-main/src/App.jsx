import { useEffect, useState } from 'react';
import api from './api/axios';

function App() {
  const [status, setStatus] = useState('Connecting to backend...');

  useEffect(() => {
    api.get('/test-connection')
      .then((res) => setStatus(res.data.message))
      .catch((err) => {
        console.error('Connection error:', err);
        setStatus('Failed to connect to backend.');
      });
  }, []);

  return (
    <div style={{ padding: '2rem', fontFamily: 'sans-serif' }}>
      <h1>Inventory Management System</h1>
      <p>Backend Connection Status: <strong>{status}</strong></p>
    </div>
  );
}