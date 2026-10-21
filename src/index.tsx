import React from 'react';
import ReactDOM from 'react-dom/client';
import "./index.css"
import { loadUserProfile, applyUserProfile } from "./Functions/UserProfile";
import App from './App';
import { ThemeProvider } from './Context/ThemeContext';
import reportWebVitals from './reportWebVitals';

const storedTheme = localStorage.getItem('theme');
if (storedTheme) {
  document.body.setAttribute('data-theme', storedTheme);
}

applyUserProfile(loadUserProfile());

// Drop the entries written by the old localStorage cache, they are not used
// anymore and would otherwise stay in the browser forever.
try {
    for (let i = localStorage.length - 1; i >= 0; i--) {
        const key = localStorage.key(i);
        if (key && key.startsWith("ncd_cache:")) localStorage.removeItem(key);
    }
} catch {
    // Storage can be unavailable (private mode, disabled cookies); ignore.
}

const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
);
root.render(
  <React.StrictMode>
    <ThemeProvider>
      <App />
    </ThemeProvider>
  </React.StrictMode>
);

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();
