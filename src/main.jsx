import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import './index.css';

// Globally prevent mouse wheel scroll from modifying focused number input values
window.addEventListener('wheel', () => {
  if (document.activeElement && document.activeElement.tagName === 'INPUT') {
    if (document.activeElement.type === 'number') {
      document.activeElement.blur();
    }
  }
}, { passive: true });

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>
);