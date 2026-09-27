import { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import Sidebar from './components/Sidebar';
import Assessment from './components/Assessment';
import Results from './components/Results';
import Disclaimer from './components/Disclaimer';
import Auth from './components/Auth';
import Home from './components/Home';
import Diary from './components/Diary';
import Report from './components/Report';
import Plan from './components/Plan';
import Assistant from './components/Assistant';
import ComparisonTable from './components/ComparisonTable';
import './App.css';

function ComingSoon({ title }) {
  return (
    <div className="card coming-soon">
      <h2>{title}</h2>
      <p className="muted-text">هنبني الصفحة دي في خطوة جاية.</p>
    </div>
  );
}

import { supabaseConfigError } from './supabaseClient';

function App() {
  if (supabaseConfigError) {
    return (
      <div style={{ padding: 40, fontFamily: 'monospace', direction: 'ltr', textAlign: 'left' }}>
        <h2>Debug: Environment variables missing</h2>
        <p>VITE_SUPABASE_URL: {JSON.stringify(import.meta.env.VITE_SUPABASE_URL)}</p>
        <p>VITE_SUPABASE_KEY exists: {String(Boolean(import.meta.env.VITE_SUPABASE_KEY))}</p>
        <p>VITE_API_URL: {JSON.stringify(import.meta.env.VITE_API_URL)}</p>
      </div>
    );
  }

  const [session, setSession] = useState(null);
  const [sessionLoading, setSessionLoading] = useState(true);
  const [fontScale, setFontScale] = useState(() => Number(localStorage.getItem('wodouh_font_scale')) || 1);
  const [highContrast, setHighContrast] = useState(() => localStorage.getItem('wodouh_high_contrast') === 'true');

  const [hasAgreed, setHasAgreed] = useState(false);
  const [activeView, setActiveView] = useState('home');
  const [analysisData, setAnalysisData] = useState(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setSessionLoading(false);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    const agreed = localStorage.getItem('wodouh_disclaimer_agreed');
    if (agreed === 'true') {
      setHasAgreed(true);
    }
  }, []);

  useEffect(() => {
    document.documentElement.style.fontSize = `${fontScale * 100}%`;
    localStorage.setItem('wodouh_font_scale', fontScale);
  }, [fontScale]);

  useEffect(() => {
    document.body.classList.toggle('high-contrast', highContrast);
    localStorage.setItem('wodouh_high_contrast', highContrast);
  }, [highContrast]);

  function handleAgree() {
    localStorage.setItem('wodouh_disclaimer_agreed', 'true');
    setHasAgreed(true);
  }

  function handleAnalysisComplete(data) {
    setAnalysisData(data);
    setActiveView('results');
  }

  if (sessionLoading) {
    return <p className="muted-text" style={{ padding: 40 }}>جارٍ التحميل...</p>;
  }

  if (!session) {
    return <Auth />;
  }

  if (!hasAgreed) {
    return <Disclaimer onAgree={handleAgree} />;
  }

  function renderView() {
    switch (activeView) {
      case 'home':
        return <Home onNavigate={setActiveView} />;
      case 'assess':
        return <Assessment onAnalysisComplete={handleAnalysisComplete} />;
      case 'results':
        return <Results analysisData={analysisData} onNavigate={setActiveView} />;
      case 'plan':
        return <Plan onNavigate={setActiveView} />;
      case 'compare':
        return <ComparisonTable />;
      case 'diary':
        return <Diary onNavigate={setActiveView} />;
      case 'report':
        return <Report onNavigate={setActiveView} />;
      case 'assistant':
        return <Assistant />;
      default:
        return null;
    }
  }

  return (
    <div className="app-shell">
      <Sidebar
        activeView={activeView}
        onNavigate={setActiveView}
        fontScale={fontScale}
        setFontScale={setFontScale}
        highContrast={highContrast}
        setHighContrast={setHighContrast}
      />
      <main className="content">{renderView()}</main>
    </div>
  );
}

export default App;