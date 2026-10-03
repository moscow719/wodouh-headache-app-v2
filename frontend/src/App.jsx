import React, { useEffect, useState } from 'react';
import { supabase } from './supabaseClient';
import Sidebar from './components/Sidebar';
import Assessment from './components/Assessment';
import Results from './components/Results';
import Disclaimer from './components/Disclaimer';
import Auth from './components/Auth';
import ResetPassword from './components/ResetPassword';
import Home from './components/Home';
import Diary from './components/Diary';
import Report from './components/Report';
import Plan from './components/Plan';
import Assistant from './components/Assistant';
import ComparisonTable from './components/ComparisonTable';
import './App.css';

const STORAGE_KEYS = Object.freeze({
  fontScale: 'neuropath_font_scale',
  highContrast: 'neuropath_high_contrast',
  disclaimerAgreed: 'neuropath_disclaimer_agreed',
  analysisDataPrefix: 'neuropath_analysis_data',
  legacyAnalysisData: 'neuropath_analysis_data',
});

const VALID_VIEWS = new Set([
  'home',
  'assess',
  'results',
  'plan',
  'compare',
  'diary',
  'report',
  'assistant',
]);

const DEFAULT_FONT_SCALE = 1;
const MIN_FONT_SCALE = 0.9;
const MAX_FONT_SCALE = 1.3;

function getUserStorageKey(prefix, userId) {
  if (!userId || typeof userId !== 'string') {
    return null;
  }

  return `${prefix}_${userId}`;
}

function readStoredNumber(key, fallback, min, max) {
  try {
    const value = Number(localStorage.getItem(key));

    if (!Number.isFinite(value)) {
      return fallback;
    }

    return Math.min(max, Math.max(min, value));
  } catch {
    return fallback;
  }
}

function readStoredBoolean(key) {
  try {
    return localStorage.getItem(key) === 'true';
  } catch {
    return false;
  }
}

function readStoredAnalysis(userId) {
  const storageKey = getUserStorageKey(
    STORAGE_KEYS.analysisDataPrefix,
    userId
  );

  if (!storageKey) {
    return null;
  }

  try {
    const rawValue = localStorage.getItem(storageKey);

    if (!rawValue) {
      return null;
    }

    const parsed = JSON.parse(rawValue);

    if (
      !parsed ||
      typeof parsed !== 'object' ||
      Array.isArray(parsed)
    ) {
      return null;
    }

    return parsed;
  } catch (error) {
    console.error('Failed to restore analysis data:', error);
    return null;
  }
}

function isValidAnalysisData(data) {
  return (
    data &&
    typeof data === 'object' &&
    !Array.isArray(data) &&
    typeof data.primaryType === 'string'
  );
}

class AppErrorBoundary extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      hasError: false,
    };
  }

  static getDerivedStateFromError() {
    return {
      hasError: true,
    };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Application rendering error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="card" role="alert" style={{ margin: 24 }}>
          <h2>حصل خطأ غير متوقع</h2>

          <p className="muted-text" style={{ marginTop: 8 }}>
            حصلت مشكلة أثناء تحميل الصفحة. جرّب إعادة تحميل التطبيق.
          </p>

          <button
            type="button"
            className="btn primary"
            style={{ marginTop: 16 }}
            onClick={() => window.location.reload()}
          >
            إعادة تحميل الصفحة
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

function AppContent() {
  const [session, setSession] = useState(null);
  const [sessionLoading, setSessionLoading] = useState(true);

  const [fontScale, setFontScale] = useState(() =>
    readStoredNumber(
      STORAGE_KEYS.fontScale,
      DEFAULT_FONT_SCALE,
      MIN_FONT_SCALE,
      MAX_FONT_SCALE
    )
  );

  const [highContrast, setHighContrast] = useState(() =>
    readStoredBoolean(STORAGE_KEYS.highContrast)
  );

  const [hasAgreed, setHasAgreed] = useState(false);
  const [activeView, setActiveView] = useState('home');
  const [analysisData, setAnalysisData] = useState(null);

  useEffect(() => {
    let isMounted = true;

    async function loadSession() {
      try {
        const {
          data: { session: currentSession },
          error,
        } = await supabase.auth.getSession();

        if (error) {
          throw error;
        }

        if (isMounted) {
          setSession(currentSession);
        }
      } catch (error) {
        console.error('Failed to load Supabase session:', error);

        if (isMounted) {
          setSession(null);
        }
      } finally {
        if (isMounted) {
          setSessionLoading(false);
        }
      }
    }

    loadSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, currentSession) => {
      if (!isMounted) {
        return;
      }

      setSession(currentSession);

      if (!currentSession) {
        setHasAgreed(false);
        setActiveView('home');
        setAnalysisData(null);
      }
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    const userId = session?.user?.id;

    if (!userId) {
      setHasAgreed(false);
      setAnalysisData(null);
      return;
    }

    try {
      const agreedUserId = localStorage.getItem(
        STORAGE_KEYS.disclaimerAgreed
      );

      setHasAgreed(agreedUserId === userId);
    } catch (error) {
      console.error('Failed to read disclaimer agreement:', error);
      setHasAgreed(false);
    }

    const storedAnalysis = readStoredAnalysis(userId);

    if (isValidAnalysisData(storedAnalysis)) {
      setAnalysisData(storedAnalysis);
    } else {
      setAnalysisData(null);

      const userStorageKey = getUserStorageKey(
        STORAGE_KEYS.analysisDataPrefix,
        userId
      );

      if (userStorageKey) {
        try {
          localStorage.removeItem(userStorageKey);
        } catch (error) {
          console.error(
            'Failed to clear invalid user analysis data:',
            error
          );
        }
      }
    }

    try {
      localStorage.removeItem(STORAGE_KEYS.legacyAnalysisData);
    } catch (error) {
      console.error('Failed to remove legacy analysis data:', error);
    }

    setActiveView('home');
  }, [session]);

  useEffect(() => {
    document.documentElement.style.fontSize = `${fontScale * 100}%`;

    try {
      localStorage.setItem(
        STORAGE_KEYS.fontScale,
        String(fontScale)
      );
    } catch (error) {
      console.error('Failed to save font scale:', error);
    }

    return () => {
      document.documentElement.style.fontSize = '';
    };
  }, [fontScale]);

  useEffect(() => {
    document.body.classList.toggle('high-contrast', highContrast);

    try {
      localStorage.setItem(
        STORAGE_KEYS.highContrast,
        String(highContrast)
      );
    } catch (error) {
      console.error('Failed to save contrast preference:', error);
    }

    return () => {
      document.body.classList.remove('high-contrast');
    };
  }, [highContrast]);

  useEffect(() => {
    const userId = session?.user?.id;

    if (!userId) {
      return;
    }

    const storageKey = getUserStorageKey(
      STORAGE_KEYS.analysisDataPrefix,
      userId
    );

    if (!storageKey) {
      return;
    }

    if (!isValidAnalysisData(analysisData)) {
      try {
        localStorage.removeItem(storageKey);
      } catch (error) {
        console.error('Failed to clear invalid analysis data:', error);
      }

      return;
    }

    try {
      localStorage.setItem(
        storageKey,
        JSON.stringify(analysisData)
      );
    } catch (error) {
      console.error('Failed to save analysis data:', error);
    }
  }, [analysisData, session]);

  function handleAgree() {
    const userId = session?.user?.id;

    if (!userId) {
      return;
    }

    try {
      localStorage.setItem(
        STORAGE_KEYS.disclaimerAgreed,
        userId
      );

      setHasAgreed(true);
    } catch (error) {
      console.error('Failed to save disclaimer agreement:', error);
      setHasAgreed(false);
    }
  }

  function handleAnalysisComplete(data) {
    if (!isValidAnalysisData(data)) {
      console.error('Invalid analysis data received:', data);
      return;
    }

    setAnalysisData(data);
    setActiveView('results');
  }

  function handleNavigate(view) {
    if (!VALID_VIEWS.has(view)) {
      console.warn(`Ignored invalid application view: ${view}`);
      return;
    }

    if (view === 'results' && !analysisData) {
      setActiveView('assess');
      return;
    }

    setActiveView(view);
  }

  function renderView() {
    switch (activeView) {
      case 'home':
        return <Home onNavigate={handleNavigate} />;

      case 'assess':
        return (
          <Assessment
            onAnalysisComplete={handleAnalysisComplete}
            onExit={() => handleNavigate('home')}
          />
        );

      case 'results':
        return (
          <Results
            analysisData={analysisData}
            onNavigate={handleNavigate}
          />
        );

      case 'plan':
        return <Plan onNavigate={handleNavigate} />;

      case 'compare':
        return <ComparisonTable />;

      case 'diary':
        return <Diary onNavigate={handleNavigate} />;

      case 'report':
        return <Report onNavigate={handleNavigate} />;

      case 'assistant':
        return <Assistant />;

      default:
        return <Home onNavigate={handleNavigate} />;
    }
  }

  if (window.location.pathname === '/reset-password') {
    return <ResetPassword />;
  }

  if (sessionLoading) {
    return (
      <main
        className="content"
        aria-live="polite"
        aria-busy="true"
      >
        <p className="muted-text" style={{ padding: 40 }}>
          جارٍ التحميل...
        </p>
      </main>
    );
  }

  if (!session) {
    return <Auth />;
  }

  if (!hasAgreed) {
    return <Disclaimer onAgree={handleAgree} />;
  }

  return (
    <div
      className={
        activeView === 'assess'
          ? 'app-shell assessment-shell'
          : 'app-shell'
      }
    >
      {activeView !== 'assess' && (
        <Sidebar
          activeView={activeView}
          onNavigate={handleNavigate}
          fontScale={fontScale}
          setFontScale={setFontScale}
          highContrast={highContrast}
          setHighContrast={setHighContrast}
        />
      )}

      <main
        className={
          activeView === 'assess'
            ? 'content content-assessment'
            : activeView === 'results'
              ? 'content content-results'
              : activeView === 'plan'
                ? 'content content-plan'
                : activeView === 'compare'
                  ? 'content content-comparison'
                  : activeView === 'diary'
                    ? 'content content-diary'
                    : activeView === 'home'
                      ? 'content content-home'
                      : 'content'
        }
      >
        {renderView()}
      </main>
    </div>
  );
}

function App() {
  return (
    <AppErrorBoundary>
      <AppContent />
    </AppErrorBoundary>
  );
}

export default App;