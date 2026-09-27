import { useState, useEffect } from 'react';
import { saveAssessment } from '../utils/storage';
import { API_URL } from '../config';
import HeadMap from './HeadMap';
import PainScale from './PainScale';

const regionLabels = {
  forehead: 'الجبهة',
  left_side: 'الجانب الأيسر',
  right_side: 'الجانب الأيمن',
  back: 'خلف الرأس',
  around_eyes: 'حول العين',
  top: 'أعلى الرأس',
};

function Assessment({ onAnalysisComplete }) {
  const [redFlagQuestions, setRedFlagQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [currentIndex, setCurrentIndex] = useState(0);
  const [showReason, setShowReason] = useState(false);
  const [emergencyTriggered, setEmergencyTriggered] = useState(false);
  const [assessmentComplete, setAssessmentComplete] = useState(false);

  const [description, setDescription] = useState('');
  const [selectedRegion, setSelectedRegion] = useState(null);
  const [painLevel, setPainLevel] = useState(5);
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisError, setAnalysisError] = useState(null);

  useEffect(() => {
    fetch(`${API_URL}/api/red-flags`)
      .then((response) => response.json())
      .then((data) => {
        setRedFlagQuestions(data);
        setLoading(false);
      })
      .catch((err) => {
        setError('Failed to load data from server');
        setLoading(false);
        console.error(err);
      });
  }, []);

  function handleAnswer(answeredYes) {
    if (answeredYes) {
      setEmergencyTriggered(true);
      return;
    }

    const isLastQuestion = currentIndex === redFlagQuestions.length - 1;

    if (isLastQuestion) {
      setAssessmentComplete(true);
    } else {
      setCurrentIndex(currentIndex + 1);
      setShowReason(false);
    }
  }

  function buildAutoPrefix(regionLabel, level) {
    const regionPart = regionLabel ? `الألم في منطقة ${regionLabel}. ` : '';
    const painPart = `شدة الألم ${level} من 10. `;
    return regionPart + painPart;
  }

  function updateDescriptionPrefix(regionLabel, level) {
    setDescription((prev) => {
      const withoutOldPrefix = prev.replace(
        /^(الألم في منطقة .+?\.\s*)?شدة الألم \d+ من 10\.\s*/,
        ''
      );
      return buildAutoPrefix(regionLabel, level) + withoutOldPrefix;
    });
  }

  function handleRegionSelect(regionId, regionLabel) {
    setSelectedRegion(regionId);
    updateDescriptionPrefix(regionLabel, painLevel);
  }

  function handlePainChange(level) {
    setPainLevel(level);
    const currentRegionLabel = selectedRegion ? regionLabels[selectedRegion] : null;
    updateDescriptionPrefix(currentRegionLabel, level);
  }

  async function handleAnalyze() {
    if (description.trim().length === 0) return;

    setAnalyzing(true);
    setAnalysisError(null);

    try {
      const res = await fetch(`${API_URL}/api/analyze-symptoms`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ description }),
      });
      const data = await res.json();

      setAnalyzing(false);

      if (data.success && data.isHeadacheRelated) {
        await saveAssessment(data);
        onAnalysisComplete(data);
      } else if (data.success && !data.isHeadacheRelated) {
        setAnalysisError('الوصف اللي كتبته مايبدوش متعلق بالصداع. من فضلك اوصف أعراض الصداع اللي حاسس بيه.');
      } else {
        setAnalysisError('حصل خطأ أثناء تحليل الأعراض.');
      }
    } catch (err) {
      console.error(err);
      setAnalyzing(false);
      setAnalysisError('تعذر الاتصال بالسيرفر.');
    }
  }

  if (loading) return <p className="muted-text">جارٍ التحميل...</p>;
  if (error) return <p className="muted-text">{error}</p>;

  if (emergencyTriggered) {
    return (
      <div className="emergency-screen">
        <div className="emergency-icon">🚨</div>
        <h1>يلزم تقييم طبي عاجل</h1>
        <p>
          بناءً على إجابتك، ده ممكن يشير لحالة خطيرة. من فضلك توجه لأقرب طوارئ فورًا أو اتصل
          بالإسعاف الآن.
        </p>

        <a href="tel:123" className="emergency-call-button">
          📞 اتصل بالطوارئ الآن (123)
        </a>

        <p className="emergency-subtext">
          لو مش قادر تتحرك أو حد معاك، خلي أي حد قريب منك يساعدك تتصل فورًا.
        </p>
      </div>
    );
  }

  if (assessmentComplete) {
    return (
      <div className="describe-screen">
        <div className="card">
          <h2>لا توجد علامات خطر</h2>
          <p className="muted-text">
            خبر جيد — مفيش أي علامة من علامات الخطورة الطارئة. تقدر دلوقتي تصف الصداع بكلامك.
          </p>

          <HeadMap onSelect={handleRegionSelect} selectedRegion={selectedRegion} />

          <PainScale value={painLevel} onChange={handlePainChange} />

          <textarea
            className="description-input"
            placeholder="مثال: صداعي نابض ومعايا غثيان (اختر مكان الألم وشدته فوق كمان)"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={4}
          />

          <button
            className="btn primary"
            onClick={handleAnalyze}
            disabled={analyzing || description.trim().length === 0}
          >
            {analyzing ? 'جارٍ التحليل...' : 'حلّل الأعراض'}
          </button>

          {analysisError && <p className="analysis-error">{analysisError}</p>}
        </div>
      </div>
    );
  }

  const currentQuestion = redFlagQuestions[currentIndex];

  return (
    <div className="question-screen">
      <div className="card">
        <p className="progress">
          سؤال {currentIndex + 1} من {redFlagQuestions.length}
        </p>

        <h2>{currentQuestion.question}</h2>

        <button className="why-button" onClick={() => setShowReason(!showReason)}>
          ليه بنسأل السؤال ده؟
        </button>

        {showReason && <p className="reason-text">{currentQuestion.reasonIfAsked}</p>}

        <div className="answer-buttons">
          <button className="no-button" onClick={() => handleAnswer(false)}>
            لأ
          </button>
          <button className="yes-button" onClick={() => handleAnswer(true)}>
            أيوه
          </button>
        </div>
      </div>
    </div>
  );
}

export default Assessment;