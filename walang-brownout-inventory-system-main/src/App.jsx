import { useEffect, useState } from 'react';
import api from "./api/axios";

function App() {
  const [msg, setMsg] = useState('Connecting...');

  useEffect(() => {
    api.get('/test-connection')
      .then((res) => setMsg(res.data.message))
      .catch((err) => setMsg('Failed: ' + err.message));
  }, []);

  return <h1>{msg}</h1>;
}

export default App;