import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import { ConnectivityProvider } from './context/ConnectivityContext';
import { AvatarProvider } from './context/AvatarContext';
import { ToastProvider } from './context/ToastContext';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <ToastProvider>
      <ConnectivityProvider>
        <AvatarProvider>
          <App />
        </AvatarProvider>
      </ConnectivityProvider>
    </ToastProvider>
  </React.StrictMode>
);