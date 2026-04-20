import React from 'react';
import { createRoot } from 'react-dom/client';
import App from '../../core/src/App';
import { logger } from '../../core/src/utils/logger';

const rootElement = document.getElementById('root');

if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

try {
  const root = createRoot(rootElement);
  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
} catch (error) {
  logger.error("Application failed to mount to root element", "index.root", error);
  rootElement.innerHTML = `
    <div style="padding: 2rem; color: #ef4444; font-family: sans-serif; text-align: center;">
      <h1 style="font-size: 1.5rem; font-weight: bold; margin-bottom: 1rem;">Unable to Load Application</h1>
      <p style="color: #374151;">Please check the console for more details.</p>
      <pre style="background: #fef2f2; padding: 1rem; border-radius: 0.5rem; margin-top: 1rem; text-align: left; overflow: auto;">${error instanceof Error ? error.message : String(error)}</pre>
    </div>
  `;
}
