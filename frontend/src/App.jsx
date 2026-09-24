import { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import Assessment from './components/Assessment';
import Results from './components/Results';
import Disclaimer from './components/Disclaimer';
import Home from './components/Home';
import Diary from './components/Diary';
import Report from './components/Report';
import Plan from './components/Plan';
import Assistant from './components/Assistant';
import './App.css';

function ComingSoon({ title }) {
  return (
    <div className="card coming-soon">
      <h2>{title}</h2>
      <p className="muted-text">هنبني الصفحة دي في خطوة جاية.</p>
    </div>
  );
}

function App() {
  const [hasAgreed, setHasAgreed] = useState(false);
  const [activeView, setActiveView] = useState('home');
  const [analysisData, setAnalysisData] = useState(null);

  useEffect(() => {
    const agreed = localStorage.getItem('wodouh_disclaimer_agreed');
    if (agreed === 'true') {
      setHasAgreed(true);
    }
  }, []);

  function handleAgree() {
    localStorage.setItem('wodouh_disclaimer_agreed', 'true');
    setHasAgreed(true);
  }

  function handleAnalysisComplete(data) {
    setAnalysisData(data);
    setActiveView('results');
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
      <Sidebar activeView={activeView} onNavigate={setActiveView} />
      <main className="content">{renderView()}</main>
    </div>
  );
}

export default App;