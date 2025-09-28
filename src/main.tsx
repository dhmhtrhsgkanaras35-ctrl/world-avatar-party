import { createRoot } from "react-dom/client";
import React from "react";
import "./index.css";

// Type augmentation for scheduler API
declare global {
  interface Window {
    scheduler?: {
      postTask: (callback: () => void, options?: { priority?: string }) => void;
    };
  }
}

// Dynamically import App to reduce initial bundle size and main-thread work
const loadApp = async () => {
  // Use dynamic import to defer heavy component loading
  const { default: App } = await import("./App.tsx");
  return App;
};

// Optimize React rendering with Concurrent Mode features
const initializeApp = async () => {
  const root = createRoot(document.getElementById("root")!);
  
  // Show minimal loading state while app loads
  const loadingElement = document.querySelector('#root > div') as HTMLElement;
  
  try {
    // Load app components in background
    const App = await loadApp();
    
    // Use startTransition for non-urgent updates to avoid blocking main thread
    if ('startTransition' in React) {
      (React as any).startTransition(() => {
        root.render(<App />);
      });
    } else {
      // Fallback for older React versions
      root.render(<App />);
    }
    
    // Remove loading state after app renders
    if (loadingElement) {
      loadingElement.style.display = 'none';
    }
  } catch (error) {
    console.error('Failed to load app:', error);
    // Fallback to direct import if dynamic import fails
    const { default: App } = await import("./App.tsx");
    root.render(<App />);
  }
};

// Use scheduler API to defer app initialization and reduce main-thread blocking
if (window.scheduler?.postTask) {
  window.scheduler.postTask(initializeApp, { priority: 'user-blocking' });
} else if (window.requestIdleCallback) {
  requestIdleCallback(() => initializeApp(), { timeout: 100 });
} else {
  // Fallback to setTimeout for browsers without modern scheduling
  setTimeout(initializeApp, 0);
}
