import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { IDEProvider } from './context/IDEContext';
import './index.css';

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <IDEProvider>
      <App />
    </IDEProvider>
  </React.StrictMode>
);
