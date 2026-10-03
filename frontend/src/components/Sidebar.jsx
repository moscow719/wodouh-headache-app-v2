import { useState } from 'react';
import { supabase } from '../supabaseClient';

const navItems = Object.freeze([
  {
    id: 'home',
    label: 'الرئيسية',
    icon: 'home',
  },
  {
    id: 'assess',
    label: 'تقييم الصداع',
    icon: 'assessment',
  },
  {
    id: 'results',
    label: 'النتائج والتخصص',
    icon: 'results',
  },
  {
    id: 'plan',
    label: 'معلومات الوقاية',
    icon: 'plan',
  },
  {
    id: 'compare',
    label: 'مقارنة الأنماط',
    icon: 'compare',
  },
  {
    id: 'diary',
    label: 'سجل الصداع',
    icon: 'diary',
  },
  {
    id: 'report',
    label: 'تقرير الطبيب',
    icon: 'report',
  },
  {
    id: 'assistant',
    label: 'المساعد الذكي',
    icon: 'assistant',
  },
]);

const navIconPaths = Object.freeze({
  home: (
    <>
      <path d="m3 10 9-7 9 7" />
      <path d="M5 9v11h14V9M9 20v-6h6v6" />
    </>
  ),
  assessment: (
    <>
      <path d="M21 11.5a8.4 8.4 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.4 8.4 0 0 1-3.8-.9L3 21l1.9-5.7a8.4 8.4 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.4 8.4 0 0 1 3.8-.9h.5a8.5 8.5 0 0 1 8 8z" />
      <path d="M12 8v4m0 4h.01" />
    </>
  ),
  results: (
    <>
      <path d="M4 19V5m0 14h17" />
      <path d="M8 16v-4m5 4V8m5 8v-6" />
    </>
  ),
  plan: (
    <>
      <path d="M20 4c-8 0-14 3-14 10a6 6 0 0 0 6 6c7 0 10-6 8-16Z" />
      <path d="M4 21c2-5 6-8 12-11" />
    </>
  ),
  compare: (
    <>
      <path d="M7 7h13l-3-3m3 3-3 3" />
      <path d="M17 17H4l3 3m-3-3 3-3" />
    </>
  ),
  diary: (
    <>
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M16 3v4M8 3v4M3 10h18m-13 4h2m3 0h2m-7 4h2" />
    </>
  ),
  report: (
    <>
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <path d="M14 2v6h6M8 13h8m-8 4h8" />
    </>
  ),
  assistant: (
    <>
      <path d="M12 3a3 3 0 0 0-5.8 1A4 4 0 0 0 4 11a4 4 0 0 0 2 7h11a4 4 0 0 0 1-7.9A5 5 0 0 0 12 3Z" />
      <path d="M12 8v8m-3-4h6" />
    </>
  ),
});

const MIN_FONT_SCALE = 0.9;
const MAX_FONT_SCALE = 1.3;
const DEFAULT_FONT_SCALE = 1;

function Sidebar({
  activeView,
  onNavigate,
  fontScale,
  setFontScale,
  highContrast,
  setHighContrast,
  isAssessment = false,
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [loggingOut, setLoggingOut] =
    useState(false);

  const [logoutError, setLogoutError] =
    useState(null);

  function decreaseFont() {
    const current =
      Number(fontScale) ||
      DEFAULT_FONT_SCALE;

    setFontScale(
      Math.max(
        MIN_FONT_SCALE,
        Number(
          (current - 0.1).toFixed(2)
        )
      )
    );
  }

  function increaseFont() {
    const current =
      Number(fontScale) ||
      DEFAULT_FONT_SCALE;

    setFontScale(
      Math.min(
        MAX_FONT_SCALE,
        Number(
          (current + 0.1).toFixed(2)
        )
      )
    );
  }

  function resetFont() {
    setFontScale(
      DEFAULT_FONT_SCALE
    );
  }

  async function handleLogout() {
    if (loggingOut) {
      return;
    }

    setLoggingOut(true);
    setLogoutError(null);

    try {
      const { error } =
        await supabase.auth.signOut();

      if (error) {
        throw error;
      }
    } catch (error) {
      console.error(
        'Logout failed:',
        error
      );

      setLogoutError(
        'تعذر تسجيل الخروج. حاول مرة أخرى.'
      );
    } finally {
      setLoggingOut(false);
    }
  }

  return (
    <aside
      className={`sidebar${menuOpen ? ' menu-open' : ''}${
        isAssessment ? ' assessment-nav' : ''
      }`}
      aria-label="القائمة الجانبية"
    >
      <div className="brand">
        <img
          className="brand-logo"
          src="/wodouh-logo.svg"
          alt="وضوح Wodouh"
        />
      </div>

      <button
        type="button"
        className="mobile-menu-toggle"
        aria-label={menuOpen ? 'إغلاق القائمة' : 'فتح القائمة'}
        aria-expanded={menuOpen}
        aria-controls="primary-navigation"
        onClick={() => setMenuOpen((open) => !open)}
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          aria-hidden="true"
          focusable="false"
        >
          {menuOpen ? (
            <path d="m6 6 12 12M18 6 6 18" />
          ) : (
            <path d="M4 6h16M4 12h16M4 18h16" />
          )}
        </svg>
      </button>

      <nav
        id="primary-navigation"
        className={`nav${menuOpen ? ' is-open' : ''}`}
        aria-label="التنقل الرئيسي"
      >
        {navItems.map((item) => {
          const isActive =
            activeView === item.id;

          return (
            <button
              key={item.id}
              type="button"
              className={
                isActive
                  ? 'active'
                  : ''
              }
              onClick={() => {
                onNavigate(item.id);
                setMenuOpen(false);
              }}
              aria-current={
                isActive
                  ? 'page'
                  : undefined
              }
            >
              <svg
                className="icon"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
                focusable="false"
              >
                {navIconPaths[item.icon]}
              </svg>

              {item.label}
            </button>
          );
        })}
      </nav>

      <div
        className="a11y-controls"
        role="group"
        aria-label="إعدادات إمكانية الوصول"
      >
        <span className="a11y-label">
          حجم الخط
        </span>

        <div className="a11y-row">
          <button
            type="button"
            aria-label="تصغير الخط"
            onClick={decreaseFont}
            disabled={
              Number(fontScale) <=
              MIN_FONT_SCALE
            }
          >
            A-
          </button>

          <button
            type="button"
            aria-label="الحجم الافتراضي"
            onClick={resetFont}
            disabled={
              Number(fontScale) ===
              DEFAULT_FONT_SCALE
            }
          >
            A
          </button>

          <button
            type="button"
            aria-label="تكبير الخط"
            onClick={increaseFont}
            disabled={
              Number(fontScale) >=
              MAX_FONT_SCALE
            }
          >
            A+
          </button>
        </div>

        <span
          className="muted-text"
          aria-live="polite"
        >
          الحجم الحالي:{' '}
          {Math.round(
            (Number(fontScale) || 1) *
              100
          )}
          %
        </span>

        <button
          type="button"
          className={`a11y-contrast ${
            highContrast
              ? 'active'
              : ''
          }`}
          onClick={() =>
            setHighContrast(
              (previous) => !previous
            )
          }
          aria-pressed={highContrast}
        >
          {highContrast
            ? '✓ التباين العالي مفعّل'
            : 'تفعيل التباين العالي'}
        </button>
      </div>

      {logoutError && (
        <p
          className="analysis-error"
          role="alert"
          aria-live="assertive"
        >
          {logoutError}
        </p>
      )}

      <button
        type="button"
        className="logout-button"
        onClick={handleLogout}
        disabled={loggingOut}
        aria-busy={loggingOut}
      >
        <span
          className="icon"
          aria-hidden="true"
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
            focusable="false"
          >
            <path d="M10 17l5-5-5-5m5 5H3" />
            <path d="M12 3h6a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-6" />
          </svg>
        </span>

        {loggingOut
          ? 'جارٍ تسجيل الخروج...'
          : 'تسجيل الخروج'}
      </button>

    </aside>
  );
}

export default Sidebar;