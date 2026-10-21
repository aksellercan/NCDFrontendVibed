import React from 'react';
import ReactDOM from 'react-dom/client';
import "./index.css"
import { loadUserProfile, applyUserProfile } from "./Functions/UserProfile";
import { purgeExpiredCache } from "./Functions/BrowserCache";
import App from './App';
import { ThemeProvider } from './Context/ThemeContext';
import reportWebVitals from './reportWebVitals';

const storedTheme = localStorage.getItem('theme');
if (storedTheme) {
  document.body.setAttribute('data-theme', storedTheme);
}

applyUserProfile(loadUserProfile());

// Drop cached data that is older than the cache TTL (or belongs to another
// user) so the browser does not keep stale listings around.
purgeExpiredCache();

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
