import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'

// Error boundary for better debugging
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.error('🚨 React Error Boundary caught an error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100vh',
          backgroundColor: '#1a1a1a',
          color: 'white',
          fontFamily: 'Arial, sans-serif'
        }}>
          <h1>🚨 Something went wrong</h1>
          <p>Please refresh the page and try again.</p>
          <button 
            onClick={() => window.location.reload()}
            style={{
              padding: '10px 20px',
              marginTop: '20px',
              backgroundColor: '#4CAF50',
              color: 'white',
              border: 'none',
              borderRadius: '5px',
              cursor: 'pointer'
            }}
          >
            Refresh Page
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

// Check for required browser features
const checkBrowserSupport = () => {
  const issues = [];
  
  // Check for Web Audio API
  if (!window.AudioContext && !window.webkitAudioContext) {
    issues.push('Web Audio API not supported');
  }
  
  // Check for Speech Recognition
  if (!window.SpeechRecognition && !window.webkitSpeechRecognition) {
    issues.push('Speech Recognition not supported');
  }
  
  // Check for Speech Synthesis
  if (!window.speechSynthesis) {
    issues.push('Speech Synthesis not supported');
  }
  
  // Check for WebGL
  const canvas = document.createElement('canvas');
  const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
  if (!gl) {
    issues.push('WebGL not supported');
  }
  
  if (issues.length > 0) {
    console.warn('⚠️ Browser compatibility issues:', issues);
    // Show a warning but don't block the app
    const warningDiv = document.createElement('div');
    warningDiv.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      background: #ff9800;
      color: white;
      padding: 10px;
      text-align: center;
      z-index: 10000;
      font-family: Arial, sans-serif;
    `;
    warningDiv.innerHTML = `
      ⚠️ Some features may not work properly: ${issues.join(', ')}
      <button onclick="this.parentElement.remove()" style="margin-left: 10px; padding: 2px 8px;">×</button>
    `;
    document.body.appendChild(warningDiv);
  }
};

// Performance monitoring
const startPerformanceMonitoring = () => {
  if (import.meta.env.DEV) {
    let frameCount = 0;
    let lastTime = performance.now();
    
    const measureFPS = () => {
      frameCount++;
      const currentTime = performance.now();
      
      if (currentTime - lastTime >= 1000) {
        const fps = Math.round((frameCount * 1000) / (currentTime - lastTime));
        
        if (fps < 30) {
          console.warn(`⚠️ Low FPS detected: ${fps} fps`);
        }
        
        frameCount = 0;
        lastTime = currentTime;
      }
      
      requestAnimationFrame(measureFPS);
    };
    
    requestAnimationFrame(measureFPS);
  }
};

// Initialize app
const initializeApp = () => {
  checkBrowserSupport();
  startPerformanceMonitoring();
  
  const root = ReactDOM.createRoot(document.getElementById('root'));
  
  // For development: StrictMode can cause double-execution of effects
  // which might interfere with audio/viseme timing
  if (import.meta.env.DEV) {
    console.log('🔧 Running in development mode');
    
    // You can disable StrictMode if it causes issues with lip sync timing
    // Comment out the StrictMode wrapper if you experience timing problems
    root.render(
      <React.StrictMode>
        <ErrorBoundary>
          <App />
        </ErrorBoundary>
      </React.StrictMode>
    );
  } else {
    // Production build - no StrictMode
    console.log('🚀 Running in production mode');
    root.render(
      <ErrorBoundary>
        <App />
      </ErrorBoundary>
    );
  }
};

// Global error handler
window.addEventListener('error', (event) => {
  console.error('🚨 Global error:', event.error);
});

window.addEventListener('unhandledrejection', (event) => {
  console.error('🚨 Unhandled promise rejection:', event.reason);
});

// Clean up on page unload
window.addEventListener('beforeunload', () => {
  // Stop any ongoing speech
  if (window.speechSynthesis && window.speechSynthesis.speaking) {
    window.speechSynthesis.cancel();
  }
  
  // Stop any audio
  const audioElements = document.querySelectorAll('audio');
  audioElements.forEach(audio => {
    audio.pause();
    audio.currentTime = 0;
  });
  
  console.log('🧹 Cleaned up before page unload');
});

// Initialize the application
initializeApp();