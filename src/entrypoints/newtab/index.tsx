import React from 'react';
import ReactDOM from 'react-dom/client';
import { WorkflowManager } from './components/WorkflowManager';
import { ThemeProvider } from './contexts/ThemeContext';

// 引入 Tailwind CSS
import "@/assets/tailwind.css";
import './styles/globals.css';

const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
);

root.render(
  <React.StrictMode>
    <ThemeProvider>
      <WorkflowManager />
    </ThemeProvider>
  </React.StrictMode>
);
