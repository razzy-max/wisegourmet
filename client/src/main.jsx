import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App.jsx';
import { AuthProvider } from './context/AuthContext';
import { CartProvider } from './context/CartContext';
import { ThemeProvider } from './context/ThemeContext';
import './index.css';

// Browsers restore scroll position across a reload/back-forward by default,
// independent of anything React Router does — refreshing a page you'd
// previously scrolled down on lands you right back there, showing blank
// space above the content until you scroll. The app handles scroll position
// itself on navigation (see App.jsx), so hand reload/history scroll back
// to it too instead of letting the browser guess.
if ('scrollRestoration' in window.history) {
  window.history.scrollRestoration = 'manual';
}

// Registered in every environment, including dev, so notifications work
// there too — sw.js itself skips its caching behavior on localhost, which
// is the part that used to serve stale Vite dev chunks back on a refresh.
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch((error) => {
      console.error('Service worker registration failed:', error);
    });
  });
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ThemeProvider>
      <BrowserRouter>
        <AuthProvider>
          <CartProvider>
            <App />
          </CartProvider>
        </AuthProvider>
      </BrowserRouter>
    </ThemeProvider>
  </StrictMode>,
);
