import { useCallback, useEffect, useState } from 'react';
import { saveAssessment } from '../utils/storage';
import { API_URL } from '../config';
import HeadMap from './HeadMap';
import PainScale from './PainScale';

const MAX_DESCRIPTION_LENGTH = 5000;

const regionLabels = Object.freeze({
  forehead: 'الجبهة',
  left_temple: 'الصدغ الأيسر',
  right_temple: 'الصدغ الأيمن',
  left_side: 'الجانب الأيسر',
  right_side: 'الجانب الأيمن',
  back: 'خلف الرأس',
  around_eyes: 'حول العين',
  top: 'أعلى الرأس',
});

function isValidRedFlagQuestion(item) {
  return (
    item &&
    typeof item === 'object' &&
    typeof item.id === 'string' &&
    item.id.trim().length > 0 &&
    typeof item.question === 'string' &&
    item.question.trim().length > 0 &&
    typeof item.reasonIfAsked === 'string' &&
    item.reasonIfAsked.trim().length > 0 &&
    (item.urgencyLevel === undefined ||
      item.urgencyLevel === 'emergency' ||
      item.urgencyLevel === 'urgent')
  );
}

function Assessment({ onAnalysisComplete }) {
  const [redFlagQuestions, setRedFlagQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [currentIndex, setCurrentIndex] = useState(0);
  const [showReason, setShowReason] = useState(false);
  const [emergencyTriggered, setEmergencyTriggered] = useState(false);
  const [assessmentComplete, setAssessmentComplete] = useState(false);

  const [redFlagAnswers, setRedFlagAnswers] = useState([]);

  const [description, setDescription] = useState('');
  const [selectedRegion, setSelectedRegion] = useState(null);
  const [painLevel, setPainLevel] = useState(5);
  const [analyzing, setAnalyzing] = useState(false);
  const [answering, setAnswering] = useState(false);
  const [analysisError, setAnalysisError] = useState(null);

  const loadRedFlags = useCallback(async (signal) => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`${API_URL}/api/red-flags`, {
        signal,
        headers: {
          Accept: 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Red flags request failed: ${response.status}`);
      }

      const data = await response.json();

      if (!Array.isArray(data)) {
        throw new Error('Invalid red flags response');
      }

      const validQuestions = data.filter(isValidRedFlagQuestion);

      if (validQuestions.length === 0) {
        throw new Error('No valid red flag questions received');
      }

      if (signal.aborted) return;

      setRedFlagQuestions(validQuestions);
      setCurrentIndex(0);
      setRedFlagAnswers([]);
      setShowReason(false);
    } catch (err) {
      if (err?.name === 'AbortError') return;

      console.error('Failed to load red flags:', err);

      setError(
        'تعذر تحميل أسئلة التقييم. من فضلك حاول مرة أخرى.'
      );
    } finally {
      if (!signal.aborted) {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();

    loadRedFlags(controller.signal);

    return () => {
      controller.abort();
    };
  }, [loadRedFlags]);

  function handleAnswer(answeredYes) {
    if (answering || emergencyTriggered || assessmentComplete) {
      return;
    }

    const currentQuestion = redFlagQuestions[currentIndex];

    if (!currentQuestion) {
      setError('حدث خطأ في سؤال التقييم الحالي.');
      return;
    }

    setAnswering(true);

    const answerRecord = {
      id: currentQuestion.id,
      answer: answeredYes ? 'yes' : 'no',
    };

    setRedFlagAnswers((previousAnswers) => [
      ...previousAnswers,
      answerRecord,
    ]);

    if (answeredYes) {
      setEmergencyTriggered(true);
      setAnswering(false);
      return;
    }

    const isLastQuestion =
      currentIndex === redFlagQuestions.length - 1;

    if (isLastQuestion) {
      setAssessmentComplete(true);
      setAnswering(false);
      return;
    }

    setCurrentIndex((previousIndex) => previousIndex + 1);
    setShowReason(false);
    setAnswering(false);
  }

  function buildAutoPrefix(regionLabel, level) {
    const regionPart = regionLabel
      ? `الألم في منطقة ${regionLabel}. `
      : '';

    const painPart = `شدة الألم ${level} من 10. `;

    return regionPart + painPart;
  }

  function updateDescriptionPrefix(regionLabel, level) {
    setDescription((previousDescription) => {
      const withoutOldPrefix = previousDescription.replace(
        /^(الألم في منطقة .+?\.\s*)?شدة الألم \d+ من 10\.\s*/,
        ''
      );

      return (
        buildAutoPrefix(regionLabel, level) +
        withoutOldPrefix
      ).slice(0, MAX_DESCRIPTION_LENGTH);
    });
  }

  function handleRegionSelect(regionId) {
    if (!regionLabels[regionId]) {
      setSelectedRegion(null);
      return;
    }

    setSelectedRegion(regionId);
    updateDescriptionPrefix(
      regionLabels[regionId],
      painLevel
    );
  }

  function handlePainChange(level) {
    const safeLevel = Math.min(
      10,
      Math.max(1, Number(level) || 1)
    );

    setPainLevel(safeLevel);

    const currentRegionLabel = selectedRegion
      ? regionLabels[selectedRegion]
      : null;

    updateDescriptionPrefix(
      currentRegionLabel,
      safeLevel
    );
  }

  async function handleAnalyze() {
    if (analyzing) return;

    const trimmedDescription = description.trim();

    if (!trimmedDescription) {
      setAnalysisError(
        'من فضلك اكتب وصفًا للأعراض أولًا.'
      );
      return;
    }

    if (trimmedDescription.length > MAX_DESCRIPTION_LENGTH) {
      setAnalysisError(
        `الوصف طويل جدًا. الحد الأقصى ${MAX_DESCRIPTION_LENGTH} حرف.`
      );
      return;
    }

    if (
      redFlagAnswers.length !== redFlagQuestions.length
    ) {
      setAnalysisError(
        'من فضلك أكمل أسئلة الفحص الأولي قبل تحليل الأعراض.'
      );
      return;
    }

    setAnalyzing(true);
    setAnalysisError(null);

    const controller = new AbortController();

    try {
      const response = await fetch(
        `${API_URL}/api/analyze-symptoms`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
          },
          body: JSON.stringify({
            description: trimmedDescription,
            redFlagAnswers,
          }),
          signal: controller.signal,
        }
      );

      let data;

      try {
        data = await response.json();
      } catch {
        throw new Error('Invalid server response');
      }

      if (!response.ok) {
        throw new Error(
          data?.error ||
            `Analysis request failed: ${response.status}`
        );
      }

      if (
        data?.success &&
        data?.isHeadacheRelated === true
      ) {
        await saveAssessment(data);
        onAnalysisComplete(data);
        return;
      }

      if (
        data?.success &&
        data?.isHeadacheRelated === false
      ) {
        setAnalysisError(
          'الوصف اللي كتبته لا يبدو متعلقًا بالصداع. من فضلك اوصف أعراض الصداع اللي حاسس بيه.'
        );
        return;
      }

      setAnalysisError(
        'حصل خطأ أثناء تحليل الأعراض. من فضلك حاول مرة أخرى.'
      );
    } catch (err) {
      if (err?.name === 'AbortError') {
        return;
      }

      console.error('Symptom analysis failed:', err);

      setAnalysisError(
        'تعذر الاتصال بالسيرفر أو تحليل الأعراض. من فضلك حاول مرة أخرى.'
      );
    } finally {
      setAnalyzing(false);
    }
  }

  if (loading) {
    return (
      <div
        className="card"
        aria-live="polite"
        aria-busy="true"
      >
        <p className="muted-text">
          جارٍ تحميل أسئلة التقييم...
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="card" role="alert">
        <h2>تعذر تحميل التقييم</h2>

        <p
          className="muted-text"
          style={{ marginTop: 8 }}
        >
          {error}
        </p>

        <button
          type="button"
          className="btn primary"
          style={{ marginTop: 16 }}
          onClick={() => {
            const controller = new AbortController();
            loadRedFlags(controller.signal).finally(() => {
              controller.abort();
            });
          }}
        >
          حاول مرة أخرى
        </button>
      </div>
    );
  }

  if (redFlagQuestions.length === 0) {
    return (
      <div className="card" role="alert">
        <p className="muted-text">
          لا توجد أسئلة تقييم متاحة حاليًا.
        </p>
      </div>
    );
  }

  if (emergencyTriggered) {
    return (
      <div
        className="emergency-screen"
        role="alert"
        aria-live="assertive"
      >
        <div
          className="emergency-icon"
          aria-hidden="true"
        >
          🚨
        </div>

        <h1>يلزم تقييم طبي عاجل</h1>

        <p>
          بناءً على إجابتك، ظهرت علامة تستدعي تقييمًا
          طبيًا عاجلًا. من فضلك توجه لأقرب طوارئ فورًا
          أو اتصل بالإسعاف.
        </p>

        <a
          href="tel:123"
          className="emergency-call-button"
        >
          اتصل بالطوارئ الآن (123)
        </a>

        <p className="emergency-subtext">
          لو مش قادر تتحرك أو حد معاك، خلي أي حد قريب
          منك يساعدك في طلب المساعدة فورًا.
        </p>
      </div>
    );
  }

  if (assessmentComplete) {
    return (
      <div className="describe-screen">
        <div className="card">
          <h2>لم تظهر علامات الخطر التي تم فحصها</h2>

          <p className="muted-text">
            بناءً على إجاباتك على أسئلة الفحص الأولي، لم
            تظهر علامة الخطر التي تم فحصها في هذا التقييم.
            تقدر دلوقتي تصف الصداع بالتفصيل.
          </p>

          <HeadMap
            onSelect={handleRegionSelect}
            selectedRegion={selectedRegion}
          />

          <PainScale
            value={painLevel}
            onChange={handlePainChange}
          />

          <textarea
            className="description-input"
            placeholder="مثال: صداعي نابض ومعايا غثيان (اختر مكان الألم وشدته فوق كمان)"
            value={description}
            onChange={(event) =>
              setDescription(
                event.target.value.slice(
                  0,
                  MAX_DESCRIPTION_LENGTH
                )
              )
            }
            rows={4}
            maxLength={MAX_DESCRIPTION_LENGTH}
            aria-label="وصف أعراض الصداع"
            aria-describedby="description-counter"
          />

          <div
            id="description-counter"
            className="muted-text description-counter"
            aria-live="polite"
          >
            {description.length} / {MAX_DESCRIPTION_LENGTH}
          </div>

          <button
            type="button"
            className="btn primary"
            onClick={handleAnalyze}
            disabled={
              analyzing ||
              description.trim().length === 0
            }
            aria-busy={analyzing}
          >
            {analyzing
              ? 'جارٍ التحليل...'
              : 'حلّل الأعراض'}
          </button>

          {analysisError && (
            <p
              className="analysis-error"
              role="alert"
              aria-live="assertive"
            >
              {analysisError}
            </p>
          )}
        </div>
      </div>
    );
  }

  const currentQuestion =
    redFlagQuestions[currentIndex];

  if (!currentQuestion) {
    return (
      <div className="card" role="alert">
        <p className="muted-text">
          حدث خطأ في تحميل سؤال التقييم.
        </p>
      </div>
    );
  }

  return (
    <div className="question-screen">
      <div className="card">
        <p
          className="progress"
          aria-live="polite"
        >
          سؤال {currentIndex + 1} من{' '}
          {redFlagQuestions.length}
        </p>

        <h2>{currentQuestion.question}</h2>

        <button
          type="button"
          className="why-button"
          onClick={() =>
            setShowReason(
              (previous) => !previous
            )
          }
          aria-expanded={showReason}
          aria-controls="red-flag-reason"
        >
          ليه بنسأل السؤال ده؟
        </button>

        {showReason && (
          <p
            id="red-flag-reason"
            className="reason-text"
          >
            {currentQuestion.reasonIfAsked}
          </p>
        )}

        <div
          className="answer-buttons"
          aria-busy={answering}
        >
          <button
            type="button"
            className="no-button"
            onClick={() => handleAnswer(false)}
            disabled={answering}
          >
            لأ
          </button>

          <button
            type="button"
            className="yes-button"
            onClick={() => handleAnswer(true)}
            disabled={answering}
          >
            أيوه
          </button>
        </div>
      </div>
    </div>
  );
}

export default Assessment;