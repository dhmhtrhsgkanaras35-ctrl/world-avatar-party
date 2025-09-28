import { createRoot } from "react-dom/client";
import React from "react";
import "./index.css";

// Simple direct import to avoid module resolution issues
const initializeApp = async () => {
  const root = createRoot(document.getElementById("root")!);
  
  // Remove loading state immediately
  const loadingElement = document.querySelector('#root > div') as HTMLElement;
  if (loadingElement) {
    loadingElement.style.display = 'none';
  }
  
  try {
    // Simple direct import
    const { default: App } = await import("./App.tsx");
    root.render(<App />);
  } catch (error) {
    console.error('Failed to load app:', error);
    // Show error state
    root.render(
      <div style={{ 
        position: 'fixed', 
        inset: '0', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        background: 'hsl(240 10% 3.9%)',
        color: 'hsl(0 0% 98%)',
        fontFamily: 'system-ui'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '1.125rem', fontWeight: '600', marginBottom: '0.5rem' }}>
            Failed to load WorldMe
          </div>
          <div style={{ fontSize: '0.875rem', opacity: '0.8' }}>
            Please refresh the page
          </div>
        </div>
      </div>
    );
  }
};

// Simple initialization without complex scheduling
initializeApp();
