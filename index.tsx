import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import { ConnectivityProvider } from './context/ConnectivityContext';
import { AvatarProvider } from './context/AvatarContext';
import { ToastProvider } from './context/ToastContext';
import { ThemeProvider } from './context/ThemeContext';
import { HapticsProvider } from './hooks/useHaptics';
import { HeroListsProvider } from './context/HeroListsContext';
import { MatchHistoryProvider } from './context/MatchHistoryContext';
import { SeasonsProvider } from './context/SeasonsContext';
import { ErrorBoundary } from './components/common/ErrorBoundary';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <ErrorBoundary variant="fullscreen">
      <ToastProvider>
        <ConnectivityProvider>
          <ThemeProvider>
            <HapticsProvider>
              <AvatarProvider>
                <HeroListsProvider>
                  <MatchHistoryProvider>
                    <SeasonsProvider>
                      <App />
                    </SeasonsProvider>
                  </MatchHistoryProvider>
                </HeroListsProvider>
              </AvatarProvider>
            </HapticsProvider>
          </ThemeProvider>
        </ConnectivityProvider>
      </ToastProvider>
    </ErrorBoundary>
  </React.StrictMode>
);