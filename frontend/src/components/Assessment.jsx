import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';
import { supabase } from '../supabaseClient';
import { saveAssessment } from '../utils/storage';
import { API_URL } from '../config';
import HeadMap from './HeadMap';
import PainScale from './PainScale';

const MAX_DESCRIPTION_LENGTH = 5000;
const ASSESSMENT_DRAFT_PREFIX = 'wodouh_assessment_draft';

const answerOptions = Object.freeze([
  { id: 'yes', label: 'نعم' },
  { id: 'no', label: 'لا' },
  { id: 'unknown', label: 'لست متأكدًا' },
]);

const questionTranslations = Object.freeze({
  sudden_severe_onset: {
    question:
      'هل بدأ الصداع فجأة ووصل إلى أشد درجاته خلال ثوانٍ أو دقائق؟',
    reason:
      'قد يكون الصداع المفاجئ الذي يصل إلى أقصى شدته بسرعة علامة تحذيرية لحالة طبية خطيرة تستلزم تقييمًا عاجلًا.',
  },
  worst_headache_ever: {
    question:
      'هل هذا أشد صداع شعرت به في حياتك؟',
    reason:
      'قد يحتاج الصداع المفاجئ أو الأشد بكثير من المعتاد إلى تقييم طبي عاجل.',
  },
  head_injury: {
    question:
      'هل بدأ الصداع بعد إصابة في الرأس أو حادث قوي؟',
    reason:
      'قد يتطلب الصداع الذي يلي إصابة في الرأس تقييمًا عاجلًا لاستبعاد إصابة خطيرة.',
  },
  neurological_symptoms: {
    question:
      'هل يصاحب الصداع ضعف أو تنميل أو صعوبة في الكلام أو تغير شديد في الرؤية أو ارتباك أو فقدان للوعي أو تشنج؟',
    reason:
      'قد تكون الأعراض العصبية الجديدة المصاحبة للصداع علامة تحذيرية تستدعي عناية طبية عاجلة.',
  },
  fever_neck_stiffness: {
    question:
      'هل لديك حمى شديدة أو تيبّس شديد في الرقبة مع الصداع؟',
    reason:
      'قد يرتبط الصداع المصحوب بحمى أو تيبّس شديد في الرقبة بعدوى خطيرة ويحتاج إلى تقييم طبي عاجل.',
  },
  new_unusual_pattern: {
    question:
      'هل هذا الصداع جديد أو مختلف بوضوح عن المعتاد أو يزداد سوءًا تدريجيًا؟',
    reason:
      'قد يحتاج الصداع الجديد أو المتفاقم تدريجيًا إلى تقييم طبي، خاصةً إذا كان مختلفًا عن المعتاد.',
  },
});

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

function getDraftStorageKey(userId) {
  return `${ASSESSMENT_DRAFT_PREFIX}_${userId}`;
}

function isValidAnswer(value) {
  return answerOptions.some((option) => option.id === value);
}

function Assessment({ onAnalysisComplete, onExit }) {
  const [redFlagQuestions, setRedFlagQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState(null);
  const [selectionError, setSelectionError] = useState(false);
  const [draftError, setDraftError] = useState(null);
  const [draftRestored, setDraftRestored] = useState(false);
  const [emergencyTriggered, setEmergencyTriggered] = useState(false);
  const [assessmentComplete, setAssessmentComplete] = useState(false);

  const [redFlagAnswers, setRedFlagAnswers] = useState([]);

  const [description, setDescription] = useState('');
  const [selectedRegion, setSelectedRegion] = useState(null);
  const [painLevel, setPainLevel] = useState(5);
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisError, setAnalysisError] = useState(null);
  const questionHeadingRef = useRef(null);

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

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) {
        throw userError;
      }
      if (signal.aborted) return;

      let restoredIndex = 0;
      let restoredAnswers = [];
      let restoredSelection = null;
      let hasRestoredDraft = false;

      if (user) {
        const draftKey = getDraftStorageKey(user.id);
        let rawDraft = null;

        try {
          rawDraft = localStorage.getItem(draftKey);
        } catch (draftReadError) {
          console.error(
            'Failed to access assessment draft storage:',
            draftReadError
          );
          setDraftError(
            'تعذر الوصول إلى التخزين المحلي لاستعادة تقدمك.'
          );
        }

        if (rawDraft) {
          try {
            const draft = JSON.parse(rawDraft);
            const validDraft =
              draft &&
              draft.version === 1 &&
              Number.isInteger(draft.currentIndex) &&
              draft.currentIndex >= 0 &&
              draft.currentIndex < validQuestions.length &&
              Array.isArray(draft.answers) &&
              draft.answers.length === draft.currentIndex &&
              draft.answers.every(
                (answer, index) =>
                  answer?.id === validQuestions[index]?.id &&
                  isValidAnswer(answer.answer) &&
                  answer.answer !== 'yes'
              ) &&
              (draft.selectedAnswer === null ||
                isValidAnswer(draft.selectedAnswer));

            if (validDraft) {
              restoredIndex = draft.currentIndex;
              restoredAnswers = draft.answers;
              restoredSelection = draft.selectedAnswer;
              hasRestoredDraft = true;
            } else {
              localStorage.removeItem(draftKey);
            }
          } catch (draftReadError) {
            console.error(
              'Failed to restore assessment draft:',
              draftReadError
            );
            localStorage.removeItem(draftKey);
          }
        }
      }

      if (signal.aborted) return;

      setRedFlagQuestions(validQuestions);
      setCurrentIndex(restoredIndex);
      setRedFlagAnswers(restoredAnswers);
      setSelectedAnswer(restoredSelection);
      setSelectionError(false);
      setDraftRestored(hasRestoredDraft);
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

  useEffect(() => {
    if (!loading && !error && !assessmentComplete && !emergencyTriggered) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
      questionHeadingRef.current?.focus();
    }
  }, [
    assessmentComplete,
    currentIndex,
    emergencyTriggered,
    error,
    loading,
  ]);

  function handleNextQuestion() {
    if (emergencyTriggered || assessmentComplete) {
      return;
    }

    if (!isValidAnswer(selectedAnswer)) {
      setSelectionError(true);
      return;
    }

    const currentQuestion = redFlagQuestions[currentIndex];

    if (!currentQuestion) {
      setError('حدث خطأ في سؤال التقييم الحالي.');
      return;
    }

    const answerRecord = {
      id: currentQuestion.id,
      answer: selectedAnswer,
    };

    const nextAnswers = [
      ...redFlagAnswers.slice(0, currentIndex),
      answerRecord,
    ];
    setRedFlagAnswers(nextAnswers);

    if (selectedAnswer === 'yes') {
      setEmergencyTriggered(true);
      clearAssessmentDraft();
      return;
    }

    const isLastQuestion =
      currentIndex === redFlagQuestions.length - 1;

    if (isLastQuestion) {
      setAssessmentComplete(true);
      clearAssessmentDraft();
      return;
    }

    setCurrentIndex(currentIndex + 1);
    setSelectedAnswer(null);
    setSelectionError(false);
  }

  function handlePreviousQuestion() {
    if (currentIndex === 0) {
      return;
    }

    const previousIndex = currentIndex - 1;
    setCurrentIndex(previousIndex);
    setSelectedAnswer(
      redFlagAnswers[previousIndex]?.answer ?? null
    );
    setSelectionError(false);
  }

  function clearAssessmentDraft() {
    supabase.auth.getUser().then(({ data, error: userError }) => {
      if (userError) {
        console.error('Failed to identify assessment draft owner:', userError);
        return;
      }

      if (data.user) {
        localStorage.removeItem(
          getDraftStorageKey(data.user.id)
        );
      }
    }).catch((error) => {
      console.error('Failed to clear assessment draft:', error);
    });
  }

  async function handleSaveAndExit() {
    if (selectedAnswer === 'yes') {
      setEmergencyTriggered(true);
      clearAssessmentDraft();
      return;
    }

    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) {
        throw userError;
      }

      if (!user) {
        throw new Error('Authentication required to save this draft.');
      }

      localStorage.setItem(
        getDraftStorageKey(user.id),
        JSON.stringify({
          version: 1,
          currentIndex,
          answers: redFlagAnswers.slice(0, currentIndex),
          selectedAnswer,
        })
      );

      setDraftError(null);
      onExit();
    } catch (error) {
      console.error('Failed to save assessment draft:', error);
      setDraftError(
        'تعذر حفظ تقدمك. تحقق من مساحة التخزين وحاول مرة أخرى.'
      );
    }
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
        clearAssessmentDraft();
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
    const hasUncertainAnswers = redFlagAnswers.some(
      (answer) => answer.answer === 'unknown'
    );

    return (
      <div className="describe-screen">
        <div className="card assessment-description-card">
          <h2>
            {hasUncertainAnswers
              ? 'اكتملت أسئلة الفحص الأولي'
              : 'لم تظهر علامات الخطر التي تم فحصها'}
          </h2>

          <p className="muted-text">
            {hasUncertainAnswers
              ? 'بعض الإجابات غير مؤكدة، لذلك لا يمكن استبعاد العلامات المرتبطة بها. إذا كنت تعتقد أن أي عرض منها موجود أو كان الصداع شديدًا أو يزداد سوءًا، فاطلب تقييمًا طبيًا.'
              : 'بناءً على إجاباتك، لم تظهر علامات الخطر التي تم فحصها. يمكنك الآن وصف الصداع بالتفصيل.'}
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
  const translatedQuestion =
    questionTranslations[currentQuestion?.id];

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
      <div className="assessment-card">
        <div className="assessment-progress-header">
          <div
            className="assessment-progress-label"
            aria-live="polite"
          >
            <span>
              السؤال {currentIndex + 1} من{' '}
              {redFlagQuestions.length}
            </span>
            <strong>{currentIndex + 1}</strong>
          </div>

          <button
            type="button"
            className="assessment-back"
            onClick={handlePreviousQuestion}
            disabled={currentIndex === 0}
          >
            السابق
          </button>
        </div>

        <div
          className="assessment-progress-track"
          role="progressbar"
          aria-label="التقدم في أسئلة التقييم"
          aria-valuemin={0}
          aria-valuemax={redFlagQuestions.length}
          aria-valuenow={currentIndex + 1}
        >
          {redFlagQuestions.map((question, index) => (
            <span
              key={question.id}
              className={
                index <= currentIndex
                  ? 'assessment-progress-segment complete'
                  : 'assessment-progress-segment'
              }
            />
          ))}
        </div>

        {draftRestored && (
          <p className="assessment-draft-restored" role="status">
            تم استعادة تقدم التقييم المحفوظ.
          </p>
        )}

        <h1
          ref={questionHeadingRef}
          className="assessment-question"
          dir="rtl"
          tabIndex={-1}
        >
          {translatedQuestion?.question || currentQuestion.question}
        </h1>

        <details className="assessment-reason">
          <summary>لماذا نسأل هذا السؤال؟</summary>
          <p>
            {translatedQuestion?.reason ||
              currentQuestion.reasonIfAsked}
          </p>
        </details>

        <div
          className="assessment-answer-list"
          role="group"
          aria-label="اختر إجابة"
          aria-describedby={
            selectionError ? 'assessment-selection-error' : undefined
          }
        >
          {answerOptions.map((option) => (
            <button
              key={option.id}
              type="button"
              aria-pressed={selectedAnswer === option.id}
              className={`assessment-answer${
                selectedAnswer === option.id ? ' selected' : ''
              }`}
              onClick={() => {
                setSelectedAnswer(option.id);
                setSelectionError(false);
              }}
            >
              <span>{option.label}</span>
              <span className="assessment-radio" aria-hidden="true" />
            </button>
          ))}
        </div>

        {selectedAnswer === 'unknown' && (
          <p className="assessment-caution" role="status">
            عدم التأكد لا يعني أن العرض غير موجود؛ إذا احتملت وجوده أو ساءت الأعراض، اطلب تقييمًا طبيًا.
          </p>
        )}

        {selectedAnswer === 'yes' && (
          <p className="assessment-urgent-hint" role="alert">
            الإجابة بنعم على هذا السؤال تستدعي تقييمًا طبيًا عاجلًا.
          </p>
        )}

        {selectionError && (
          <p
            id="assessment-selection-error"
            className="assessment-selection-error"
            role="alert"
          >
            اختر إجابة للمتابعة.
          </p>
        )}

        <div className="assessment-actions">
          <button
            type="button"
            className="assessment-next"
            onClick={handleNextQuestion}
          >
            {selectedAnswer === 'yes'
              ? 'عرض التنبيه العاجل'
              : 'التالي'}
          </button>

          <button
            type="button"
            className="assessment-save-exit"
            onClick={handleSaveAndExit}
          >
            حفظ والخروج
          </button>
        </div>

        {draftError && (
          <p className="assessment-selection-error" role="alert">
            {draftError}
          </p>
        )}
      </div>
    </div>
  );
}

export default Assessment;