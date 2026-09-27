import { useState } from 'react';
import { API_URL } from '../config';

function Results({ analysisData, onNavigate }) {
  const [loadingPlaces, setLoadingPlaces] = useState(false);
  const [places, setPlaces] = useState(null);
  const [placesError, setPlacesError] = useState(null);

  function findNearbyDoctors() {
    setLoadingPlaces(true);
    setPlacesError(null);
    setPlaces(null);

    if (!navigator.geolocation) {
      setPlacesError('المتصفح مايدعمش تحديد الموقع الجغرافي.');
      setLoadingPlaces(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;

        fetch(`${API_URL}/api/nearby-doctors?lat=${latitude}&lng=${longitude}`)
          .then((res) => res.json())
          .then((data) => {
            setLoadingPlaces(false);
            if (data.success) {
              setPlaces(data.places);
            } else {
              setPlacesError('حصل خطأ أثناء البحث عن أماكن قريبة.');
            }
          })
          .catch(() => {
            setLoadingPlaces(false);
            setPlacesError('تعذر الاتصال بالسيرفر.');
          });
      },
      () => {
        setLoadingPlaces(false);
        setPlacesError('محتاجين إذن الوصول لموقعك عشان نلاقي أماكن قريبة منك.');
      }
    );
  }

  if (!analysisData) {
    return (
      <div className="card coming-soon">
        <h2>لا توجد نتائج بعد</h2>
        <p className="muted-text">لازم تكمل تقييم الصداع الأول عشان تظهر النتائج هنا.</p>
        <button className="btn primary" onClick={() => onNavigate('assess')}>
          ابدأ التقييم الآن
        </button>
      </div>
    );
  }

  return (
    <div className="card">
      <h2>نتائج التقييم</h2>
      <p className="muted-text">احتمالات مبنية على وصفك — مش تشخيص نهائي.</p>

      <div className="analysis-result no-border">
        <p>{analysisData.analysis}</p>
        <div className="specialty-box">
          <strong>التخصص المقترح:</strong> {analysisData.specialty.ar}
        </div>
      </div>

      <div className="doctors-section">
        <button className="btn primary" onClick={findNearbyDoctors} disabled={loadingPlaces}>
          {loadingPlaces ? 'جارٍ البحث...' : 'دور على دكاترة وعيادات قريبة'}
        </button>

        {placesError && <p className="analysis-error">{placesError}</p>}

        {places && places.length === 0 && (
          <p className="muted-text" style={{ marginTop: 14 }}>
            مفيش نتائج قريبة منك حاليًا.
          </p>
        )}

        {places && places.length > 0 && (
          <ul className="places-list">
            {places.map((place, index) => (
              <li key={index} className="place-item">
                <span className="place-name">{place.name}</span>
                <span className="place-type">{place.type === 'hospital' ? 'مستشفى' : 'عيادة'}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

export default Results;