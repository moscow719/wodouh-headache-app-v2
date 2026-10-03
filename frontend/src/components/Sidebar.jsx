import { useState } from 'react';
import { supabase } from '../supabaseClient';

const navItems = Object.freeze([
  {
    id: 'home',
    label: 'الرئيسية',
    icon: '🏠',
  },
  {
    id: 'assess',
    label: 'تقييم الصداع',
    icon: '💬',
  },
  {
    id: 'results',
    label: 'النتائج والتخصص',
    icon: '📊',
  },
  {
    id: 'plan',
    label: 'معلومات الوقاية',
    icon: '🌿',
  },
  {
    id: 'compare',
    label: 'مقارنة الأنماط',
    icon: '⚖️',
  },
  {
    id: 'diary',
    label: 'سجل الصداع',
    icon: '📅',
  },
  {
    id: 'report',
    label: 'تقرير الطبيب',
    icon: '📄',
  },
  {
    id: 'assistant',
    label: 'المساعد الذكي',
    icon: '🤍',
  },
]);

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
}) {
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
      className="sidebar"
      aria-label="القائمة الجانبية"
    >
      <div className="brand">
        <img
          className="brand-logo"
          src="/wodouh-logo.svg"
          alt="وضوح Wodouh"
        />
      </div>

      <nav
        className="nav"
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
              onClick={() =>
                onNavigate(item.id)
              }
              aria-current={
                isActive
                  ? 'page'
                  : undefined
              }
            >
              <span
                className="icon"
                aria-hidden="true"
              >
                {item.icon}
              </span>

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
          🚪
        </span>

        {loggingOut
          ? 'جارٍ تسجيل الخروج...'
          : 'تسجيل الخروج'}
      </button>

      <div className="sidebar-footer">
        NeuroPath — أداة توعية ومتابعة،
        وليست بديلًا عن التشخيص الطبي.
      </div>
    </aside>
  );
}

export default Sidebar;