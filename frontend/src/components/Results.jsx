import { useState } from 'react';
import { API_URL } from '../config';

const MAX_PLACES_TO_SHOW = 20;

const primaryTypeLabels = Object.freeze({
  tension: 'صداع توتري محتمل',
  migraine: 'صداع نصفي محتمل',
  cluster: 'صداع عنقودي محتمل',
  sinus: 'نمط مرتبط بالجيوب الأنفية',
  eye_strain: 'إجهاد العين',
  dehydration: 'نمط قد يرتبط بالجفاف',
});

function isValidPlace(place) {
  return (
    place &&
    typeof place === 'object' &&
    typeof place.name === 'string' &&
    place.name.trim().length > 0
  );
}

function Results({ analysisData, onNavigate }) {
  const [loadingPlaces, setLoadingPlaces] = useState(false);
  const [places, setPlaces] = useState(null);
  const [placesError, setPlacesError] = useState(null);

  function findNearbyDoctors() {
    if (loadingPlaces) {
      return;
    }

    setLoadingPlaces(true);
    setPlacesError(null);
    setPlaces(null);

    if (!navigator.geolocation) {
      setPlacesError(
        'المتصفح لا يدعم تحديد الموقع الجغرافي.'
      );
      setLoadingPlaces(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;

        if (
          !Number.isFinite(latitude) ||
          !Number.isFinite(longitude) ||
          latitude < -90 ||
          latitude > 90 ||
          longitude < -180 ||
          longitude > 180
        ) {
          setPlacesError(
            'تعذر الحصول على موقع جغرافي صالح.'
          );
          setLoadingPlaces(false);
          return;
        }

        try {
          const params = new URLSearchParams({
            lat: String(latitude),
            lng: String(longitude),
          });

          const response = await fetch(
            `${API_URL}/api/nearby-doctors?${params.toString()}`
          );

          let data = null;

          try {
            data = await response.json();
          } catch {
            throw new Error('Invalid server response');
          }

          if (!response.ok || !data?.success) {
            throw new Error(
              data?.error || 'Nearby places request failed'
            );
          }

          const validPlaces = Array.isArray(data.places)
            ? data.places
                .filter(isValidPlace)
                .slice(0, MAX_PLACES_TO_SHOW)
            : [];

          setPlaces(validPlaces);
        } catch (error) {
          console.error(
            'Failed to load nearby places:',
            error
          );

          setPlacesError(
            'تعذر البحث عن أماكن قريبة حاليًا. حاول مرة أخرى.'
          );
        } finally {
          setLoadingPlaces(false);
        }
      },
      (error) => {
        console.error(
          'Geolocation request failed:',
          error
        );

        setLoadingPlaces(false);

        if (error?.code === 1) {
          setPlacesError(
            'يلزم السماح بالوصول إلى موقعك للبحث عن أماكن قريبة.'
          );
          return;
        }

        if (error?.code === 2) {
          setPlacesError(
            'تعذر تحديد موقعك حاليًا. حاول مرة أخرى أو تحقق من تفعيل خدمات الموقع.'
          );
          return;
        }

        setPlacesError(
          'تعذر الحصول على موقعك. حاول مرة أخرى.'
        );
      },
      {
        enableHighAccuracy: false,
        timeout: 10000,
        maximumAge: 300000,
      }
    );
  }

  if (!analysisData) {
    return (
      <div className="card coming-soon">
        <h2>لا توجد نتائج بعد</h2>

        <p className="muted-text">
          أكمل تقييم الصداع أولًا لعرض النتائج هنا.
        </p>

        <button
          type="button"
          className="btn primary"
          onClick={() => onNavigate('assess')}
        >
          ابدأ التقييم الآن
        </button>
      </div>
    );
  }

  const analysisText =
    typeof analysisData.analysis === 'string'
      ? analysisData.analysis.trim()
      : '';

  const specialty =
    analysisData.specialty &&
    typeof analysisData.specialty === 'object'
      ? analysisData.specialty
      : null;

  const specialtyArabic =
    typeof specialty?.ar === 'string'
      ? specialty.ar.trim()
      : '';

  const isEmergency =
    analysisData.urgencyLevel === 'emergency' ||
    analysisData.isEmergency === true ||
    analysisData.emergency === true;

  return (
    <div className="results-page">
      <header className="results-heading">
        <h1>نتائج التقييم</h1>
        <p>
          تستند هذه النتائج إلى وصفك للأعراض، وتهدف إلى التوعية ومساعدتك في اختيار الخطوة التالية. وهي ليست تشخيصًا طبيًا.
        </p>
      </header>

      {isEmergency && (
        <div
          className="emergency-note"
          role="alert"
          style={{ marginBottom: 18 }}
        >
          <strong>مهم:</strong> تشير المعلومات المسجلة إلى علامة تستدعي تقييمًا طبيًا عاجلًا. لا تعتمد على نتيجة التطبيق لتأجيل طلب المساعدة الطبية.
        </div>
      )}

      <section className="results-panel results-summary">
        {!isEmergency && (
          <h2 className="results-pattern">
            النمط المحتمل:{' '}
            {primaryTypeLabels[analysisData.primaryType] ||
              'نمط يحتاج إلى مراجعة'}
          </h2>
        )}

        <div className="results-analysis">
          {analysisText ? (
            <p>{analysisText}</p>
          ) : (
            <p>
              لا يتوفر وصف تفصيلي لهذه النتيجة.
            </p>
          )}

          {specialtyArabic && !isEmergency && (
            <div className="results-highlight">
              <strong>التخصص المقترح مبدئيًا:</strong>
              {specialtyArabic}
            </div>
          )}

          {isEmergency && (
            <div className="results-highlight">
              <strong>الأولوية: التقييم الطبي العاجل</strong>
              <p>
                لا تجعل التخصص المقترح أولوية عند وجود علامة خطر. اطلب المساعدة الطبية العاجلة بحسب شدة الأعراض.
              </p>
            </div>
          )}
        </div>

        <p className="results-review-note" role="note">
          هذا تصنيف آلي مبدئي، وقد لا يتطابق تمامًا مع وصف الأعراض. ينبغي مراجعة النتيجة مع مختص صحي، ولا تُعد تشخيصًا.
        </p>
      </section>

      <section className="results-panel results-doctors">
        <h2>أماكن طبية قريبة</h2>

        <p>
          يمكنك البحث عن أطباء وعيادات قريبة منك.
        </p>

        <div className="results-privacy-note" role="note">
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
            <rect x="4" y="10" width="16" height="11" rx="2" />
            <path d="M8 10V7a4 4 0 0 1 8 0v3m-4 4v3" />
          </svg>
          <span>
            يُستخدم موقع جهازك للبحث عن أماكن قريبة فقط، ولا نحتاج إليه لعرض نتيجة التقييم.
          </span>
        </div>

        <button
          type="button"
          className="results-nearby-button"
          onClick={findNearbyDoctors}
          disabled={loadingPlaces}
        >
          {loadingPlaces
            ? 'جارٍ البحث عن عيادات قريبة...'
            : 'ابحث عن عيادات قريبة'}
        </button>

        {placesError && (
          <p
            className="analysis-error"
            role="alert"
            aria-live="assertive"
            style={{ marginTop: 14 }}
          >
            {placesError}
          </p>
        )}

        {places && places.length === 0 && (
          <p
            className="muted-text"
            style={{ marginTop: 14 }}
          >
            لا تتوفر نتائج قريبة حاليًا.
          </p>
        )}

        {places && places.length > 0 && (
          <ul
            className="places-list"
            aria-label="أماكن طبية قريبة"
          >
            {places.map((place, index) => {
              const placeType =
                place.type === 'hospital'
                  ? 'مستشفى'
                  : 'عيادة';

              return (
                <li
                  key={
                    place.id ||
                    `${place.name}-${place.lat || ''}-${place.lng || ''}-${index}`
                  }
                  className="place-item"
                >
                  <span className="place-name">
                    {place.name}
                  </span>

                  <span className="place-type">
                    {placeType}
                  </span>
                </li>
              );
            })}
          </ul>
        )}

      </section>

      <div className="results-actions">
        <button
          type="button"
          className="results-report-button"
          onClick={() => onNavigate('report')}
        >
          إنشاء تقرير للطبيب
        </button>
        <button
          type="button"
          className="results-retake-button"
          onClick={() => onNavigate('assess')}
        >
          إعادة التقييم
        </button>
      </div>
    </div>
  );
}

export default Results;