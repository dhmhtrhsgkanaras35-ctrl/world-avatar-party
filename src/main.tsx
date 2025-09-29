import { createRoot } from "react-dom/client";
import React from "react";
import "./index.css";

// Initialize the React app
const initializeApp = () => {
  try {
    const root = createRoot(document.getElementById("root")!);
    
    // Clear loading state immediately
    const rootElement = document.getElementById("root");
    if (rootElement) {
      rootElement.innerHTML = '';
    }
    
    // Import and render the app immediately
    import("./App.tsx").then(({ default: App }) => {
      root.render(<App />);
    }).catch((error) => {
      console.error('Failed to load app:', error);
      rootElement.innerHTML = `
        <div style="position: fixed; inset: 0; display: flex; align-items: center; justify-content: center; background: hsl(240 10% 3.9%); color: hsl(0 0% 98%); font-family: system-ui;">
          <div style="text-align: center;">
            <div style="font-size: 1.125rem; font-weight: 600; margin-bottom: 0.5rem;">Failed to load WorldMe</div>
            <div style="font-size: 0.875rem; opacity: 0.8;">Please refresh the page</div>
          </div>
        </div>
      `;
    });
  } catch (error) {
    console.error('Failed to initialize app:', error);
  }
};

// Start the app immediately
initializeApp();
