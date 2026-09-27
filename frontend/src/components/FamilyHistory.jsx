import { useEffect, useRef, useState } from 'react';
import {
  getProfile,
  saveFamilyHistory,
} from '../utils/storage';

const options = Object.freeze([
  {
    id: 'migraine',
    label: 'صداع نصفي (ميجرين) في العائلة',
  },
  {
    id: 'neurological',
    label: 'تاريخ عائلي معروف لمشاكل عصبية',
  },
  {
    id: 'none',
    label: 'لا يوجد تاريخ عائلي معروف',
  },
]);

const validOptionIds = new Set(
  options.map((option) => option.id)
);

function normalizeSelectedValues(values) {
  if (!Array.isArray(values)) {
    return [];
  }

  const validValues = values.filter(
    (value) =>
      typeof value === 'string' &&
      validOptionIds.has(value)
  );

  if (validValues.includes('none')) {
    return ['none'];
  }

  return [...new Set(validValues)];
}

function parseStoredFamilyHistory(value) {
  if (typeof value !== 'string') {
    return [];
  }

  const values = value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);

  return normalizeSelectedValues(values);
}

function FamilyHistory() {
  const [selected, setSelected] =
    useState([]);

  const [saving, setSaving] =
    useState(false);

  const [loading, setLoading] =
    useState(true);

  const [savedMessage, setSavedMessage] =
    useState(false);

  const [error, setError] =
    useState(null);

  const successTimeoutRef =
    useRef(null);

  useEffect(() => {
    let isMounted = true;

    async function loadFamilyHistory() {
      try {
        const profile =
          await getProfile();

        if (!isMounted) {
          return;
        }

        const storedValue =
          profile &&
          typeof profile === 'object' &&
          !Array.isArray(profile)
            ? profile.family_history
            : null;

        setSelected(
          parseStoredFamilyHistory(
            storedValue
          )
        );

        setError(null);
      } catch (err) {
        console.error(
          'Failed to load family history:',
          err
        );

        if (isMounted) {
          setError(
            'تعذر تحميل التاريخ العائلي. من فضلك حاول مرة أخرى.'
          );
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    loadFamilyHistory();

    return () => {
      isMounted = false;

      if (
        successTimeoutRef.current
      ) {
        window.clearTimeout(
          successTimeoutRef.current
        );
      }
    };
  }, []);

  function toggleOption(id) {
    if (
      !validOptionIds.has(id) ||
      saving
    ) {
      return;
    }

    setSavedMessage(false);
    setError(null);

    setSelected((previous) => {
      const normalizedPrevious =
        normalizeSelectedValues(
          previous
        );

      if (id === 'none') {
        return normalizedPrevious.includes(
          'none'
        )
          ? []
          : ['none'];
      }

      const withoutNone =
        normalizedPrevious.filter(
          (value) =>
            value !== 'none'
        );

      if (
        withoutNone.includes(id)
      ) {
        return withoutNone.filter(
          (value) =>
            value !== id
        );
      }

      return [
        ...withoutNone,
        id,
      ];
    });
  }

  async function handleSave() {
    if (saving) {
      return;
    }

    const normalizedSelection =
      normalizeSelectedValues(
        selected
      );

    setSelected(
      normalizedSelection
    );
    setSaving(true);
    setSavedMessage(false);
    setError(null);

    try {
      const value =
        normalizedSelection.join(',');

      await saveFamilyHistory(
        value
      );

      setSavedMessage(true);

      if (
        successTimeoutRef.current
      ) {
        window.clearTimeout(
          successTimeoutRef.current
        );
      }

      successTimeoutRef.current =
        window.setTimeout(() => {
          setSavedMessage(false);
          successTimeoutRef.current =
            null;
        }, 4000);
    } catch (err) {
      console.error(
        'Failed to save family history:',
        err
      );

      setError(
        'تعذر حفظ التاريخ العائلي. من فضلك حاول مرة أخرى.'
      );
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <p
        className="muted-text"
        role="status"
        aria-live="polite"
      >
        جارٍ تحميل التاريخ العائلي...
      </p>
    );
  }

  return (
    <div className="card">
      <h3 style={{ marginTop: 0 }}>
        <span
          aria-hidden="true"
        >
          👨‍👧
        </span>{' '}
        التاريخ العائلي
      </h3>

      <p className="muted-text">
        تسجيل وجود تاريخ عائلي للصداع
        أو بعض المشاكل العصبية ممكن
        يساعدك في توثيق معلوماتك الطبية
        ومراجعتها مع الطبيب. المعلومة دي
        للتوثيق فقط ومش بتستخدم لوحدها
        لتشخيص أي حالة.
      </p>

      {error && (
        <p
          className="analysis-error"
          role="alert"
          aria-live="assertive"
        >
          {error}
        </p>
      )}

      <div
        className="family-options"
        role="group"
        aria-label="اختيارات التاريخ العائلي"
      >
        {options.map((option) => (
          <label
            key={option.id}
            className="family-checkbox"
          >
            <input
              type="checkbox"
              checked={selected.includes(
                option.id
              )}
              onChange={() =>
                toggleOption(
                  option.id
                )
              }
              disabled={saving}
            />

            <span>
              {option.label}
            </span>
          </label>
        ))}
      </div>

      <p
        className="muted-text"
        style={{
          marginTop: 10,
        }}
      >
        لو مش متأكد من التاريخ العائلي،
        سيب الاختيارات بدون تحديد. عدم
        الاختيار معناه إن المعلومة غير
        مسجلة، ومش معناه إن مفيش تاريخ
        عائلي.
      </p>

      <button
        type="button"
        className="btn primary"
        onClick={handleSave}
        disabled={saving}
        style={{
          marginTop: 16,
        }}
      >
        {saving
          ? 'جارٍ الحفظ...'
          : 'حفظ'}
      </button>

      {savedMessage && (
        <p
          className="specialty-box"
          style={{
            marginTop: 12,
          }}
          role="status"
          aria-live="polite"
        >
          تم حفظ التاريخ العائلي بنجاح.
        </p>
      )}
    </div>
  );
}

export default FamilyHistory;