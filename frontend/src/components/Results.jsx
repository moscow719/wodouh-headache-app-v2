import { useState } from 'react';
import { API_URL } from '../config';

const MAX_PLACES_TO_SHOW = 20;

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
        'المتصفح مايدعمش تحديد الموقع الجغرافي.'
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
            'محتاجين إذن الوصول لموقعك عشان نلاقي أماكن قريبة منك.'
          );
          return;
        }

        if (error?.code === 2) {
          setPlacesError(
            'تعذر تحديد موقعك حاليًا. حاول مرة أخرى أو تأكد من تشغيل خدمات الموقع.'
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
          لازم تكمل تقييم الصداع الأول عشان تظهر النتائج هنا.
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
    <div>
      <div className="page-head">
        <div>
          <h1>نتائج التقييم</h1>
          <p className="muted-text">
            النتائج دي مبنية على وصفك للأعراض وهدفها
            التوعية وتوجيهك للخطوة المناسبة، ومش تشخيص طبي نهائي.
          </p>
        </div>
      </div>

      {isEmergency && (
        <div
          className="emergency-note"
          role="alert"
          style={{ marginBottom: 18 }}
        >
          <strong>مهم:</strong> المعلومات المسجلة تشير إلى
          وجود علامة تستدعي تقييمًا طبيًا عاجلًا. ما تعتمدش
          على نتيجة التطبيق لتأجيل طلب المساعدة الطبية.
        </div>
      )}

      <div className="card">
        <div className="analysis-result no-border">
          {analysisText ? (
            <p>{analysisText}</p>
          ) : (
            <p className="muted-text">
              مفيش وصف تفصيلي متاح للنتيجة.
            </p>
          )}

          {specialtyArabic && !isEmergency && (
            <div
              className="specialty-box"
              style={{ marginTop: 16 }}
            >
              <strong>التخصص المقترح مبدئيًا:</strong>{' '}
              {specialtyArabic}
            </div>
          )}

          {isEmergency && (
            <div
              className="specialty-box"
              style={{ marginTop: 16 }}
            >
              <strong>
                الأولوية: التقييم الطبي العاجل
              </strong>
              <p style={{ marginTop: 8 }}>
                التخصص المقترح مش هو الأولوية في حالة وجود
                علامة خطر. اطلب المساعدة الطبية العاجلة
                حسب شدة الأعراض.
              </p>
            </div>
          )}
        </div>
      </div>

      <div
        className="card doctors-section"
        style={{ marginTop: 18 }}
      >
        <h2>أماكن طبية قريبة</h2>

        <p className="muted-text">
          لو حابب، ممكن نستخدم موقع جهازك للبحث عن أماكن
          طبية قريبة. موقعك لا نحتاجه لعرض نتيجة التقييم.
        </p>

        <button
          type="button"
          className="btn primary"
          onClick={findNearbyDoctors}
          disabled={loadingPlaces}
          style={{ marginTop: 12 }}
        >
          {loadingPlaces
            ? 'جارٍ البحث...'
            : 'دور على دكاترة وعيادات قريبة'}
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
            مفيش نتائج قريبة متاحة حاليًا.
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
      </div>
    </div>
  );
}

export default Results;