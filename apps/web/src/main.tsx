import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App.js';
import './theme.css';
import './shell.css';
import './dashboard.css';
import './lesson.css';
import './diagram.css';

const container = document.getElementById('root');
if (!container) throw new Error('index.html is missing its #root element');

createRoot(container).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
