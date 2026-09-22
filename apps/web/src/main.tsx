import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App.js';
// Self-hosted variable fonts (docs/specs/edge-visual-refinement.md). Each subset declares its
// unicode-range, so an English page downloads the latin file and nothing else.
import '@fontsource-variable/space-grotesk/index.css';
import '@fontsource-variable/jetbrains-mono/index.css';
import './theme.css';
import './shell.css';
import './dashboard.css';
import './continue-card.css';
import './lesson.css';
import './navigation.css';
import './activities.css';
import './diagram.css';

const container = document.getElementById('root');
if (!container) throw new Error('index.html is missing its #root element');

createRoot(container).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
