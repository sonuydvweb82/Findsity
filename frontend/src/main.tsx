import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import App from './App';
import { AuthProvider } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <ThemeProvider>
        <AuthProvider>
          <App />
          <Toaster
            position="top-center"
            toastOptions={{
              duration: 3500,
              style: {
                background: '#1e293b',
                color: '#f1f5f9',
                borderRadius: '10px',
                fontSize: '14px',
              },
              success: { iconTheme: { primary: '#4f46e5', secondary: '#fff' } },
            }}
          />
        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  </React.StrictMode>,
);