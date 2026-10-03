import { supabase } from '../supabaseClient';

const MAX_ANALYSIS_LENGTH = 10000;
const MAX_MEDICATION_NAME_LENGTH = 100;
const MAX_MEDICATION_DOSE_LENGTH = 100;
const MAX_FAMILY_HISTORY_LENGTH = 500;

const MAX_ASSESSMENTS_TO_LOAD = 200;
const MAX_MEDICATIONS_TO_LOAD = 200;

const ALLOWED_PRIMARY_TYPES = new Set([
  'tension',
  'migraine',
  'cluster',
  'sinus',
  'eye_strain',
  'dehydration',
]);

function logSupabaseError(operation, error) {
  console.error(operation, {
    name:
      typeof error?.name === 'string'
        ? error.name
        : undefined,
    message:
      typeof error?.message === 'string'
        ? error.message
        : String(error),
    status:
      Number.isInteger(error?.status)
        ? error.status
        : undefined,
    code:
      typeof error?.code === 'string'
        ? error.code
        : undefined,
    details:
      typeof error?.details === 'string'
        ? error.details
        : undefined,
    hint:
      typeof error?.hint === 'string'
        ? error.hint
        : undefined,
  });
}

function isValidDateString(value) {
  if (typeof value !== 'string' || !value.trim()) {
    return false;
  }

  return !Number.isNaN(new Date(value).getTime());
}

function normalizeRequiredString(value, maxLength, errorMessage) {
  if (typeof value !== 'string') {
    throw new Error(errorMessage);
  }

  const normalized = value.trim();

  if (!normalized) {
    throw new Error(errorMessage);
  }

  if (normalized.length > maxLength) {
    throw new Error(
      `النص أطول من الحد المسموح به (${maxLength} حرف).`
    );
  }

  return normalized;
}

function normalizeOptionalString(value, maxLength) {
  if (value === null || value === undefined) {
    return '';
  }

  if (typeof value !== 'string') {
    return '';
  }

  const normalized = value.trim();

  if (normalized.length > maxLength) {
    return normalized.slice(0, maxLength);
  }

  return normalized;
}

async function getCurrentUser() {
  let result;

  try {
    result = await supabase.auth.getUser();
  } catch (error) {
    logSupabaseError(
      'Failed to get current user from Supabase Auth:',
      error
    );
    throw new Error(
      'تعذر التحقق من المستخدم الحالي.',
      { cause: error }
    );
  }

  const {
    data: { user },
    error,
  } = result;

  if (error) {
    logSupabaseError(
      'Supabase Auth getUser failed:',
      error
    );
    throw new Error(
      'تعذر التحقق من المستخدم الحالي.',
      { cause: error }
    );
  }

  if (!user) {
    console.error(
      'Supabase Auth returned no current user while loading user data.'
    );
    throw new Error(
      'لازم تسجل دخول عشان تستخدم بياناتك.'
    );
  }

  return user;
}

function validateAssessmentData(analysisData) {
  if (
    !analysisData ||
    typeof analysisData !== 'object' ||
    Array.isArray(analysisData)
  ) {
    throw new Error('بيانات التقييم غير صالحة.');
  }

  if (
    typeof analysisData.analysis !== 'string' ||
    !analysisData.analysis.trim()
  ) {
    throw new Error('نتيجة التقييم لا تحتوي على تحليل صالح.');
  }

  const analysis = analysisData.analysis.trim();

  if (analysis.length > MAX_ANALYSIS_LENGTH) {
    throw new Error(
      `نتيجة التقييم أطول من الحد المسموح به (${MAX_ANALYSIS_LENGTH} حرف).`
    );
  }

  const primaryType =
    typeof analysisData.primaryType === 'string'
      ? analysisData.primaryType.trim()
      : '';

  if (
    primaryType &&
    !ALLOWED_PRIMARY_TYPES.has(primaryType)
  ) {
    throw new Error('نوع الصداع المرسل غير صالح.');
  }

  let confidence = null;

  if (
    analysisData.confidence !== null &&
    analysisData.confidence !== undefined &&
    analysisData.confidence !== ''
  ) {
    const numericConfidence = Number(
      analysisData.confidence
    );

    if (
      !Number.isFinite(numericConfidence) ||
      numericConfidence < 0 ||
      numericConfidence > 100
    ) {
      throw new Error('نسبة التوافق غير صالحة.');
    }

    confidence = Math.round(numericConfidence);
  }

  let specialtyAr = null;
  let specialtyEn = null;

  if (
    analysisData.specialty &&
    typeof analysisData.specialty === 'object' &&
    !Array.isArray(analysisData.specialty)
  ) {
    specialtyAr =
      normalizeOptionalString(
        analysisData.specialty.ar,
        200
      ) || null;

    specialtyEn =
      normalizeOptionalString(
        analysisData.specialty.en,
        200
      ) || null;
  }

  return {
    analysis,
    primaryType: primaryType || null,
    confidence,
    specialtyAr,
    specialtyEn,
  };
}

function normalizeAssessmentRow(row) {
  if (!row || typeof row !== 'object') {
    return null;
  }

  if (
    typeof row.id !== 'string' ||
    !row.id.trim()
  ) {
    return null;
  }

  if (!isValidDateString(row.created_at)) {
    return null;
  }

  const primaryType =
    typeof row.primary_type === 'string' &&
    ALLOWED_PRIMARY_TYPES.has(row.primary_type)
      ? row.primary_type
      : null;

  let confidence = null;

  if (
    row.confidence !== null &&
    row.confidence !== undefined &&
    row.confidence !== ''
  ) {
    const numericConfidence = Number(row.confidence);

    if (
      Number.isFinite(numericConfidence) &&
      numericConfidence >= 0 &&
      numericConfidence <= 100
    ) {
      confidence = Math.round(numericConfidence);
    }
  }

  const specialtyAr =
    typeof row.specialty_ar === 'string'
      ? row.specialty_ar.trim().slice(0, 200)
      : '';

  const specialtyEn =
    typeof row.specialty_en === 'string'
      ? row.specialty_en.trim().slice(0, 200)
      : '';

  return {
    id: row.id,
    date: row.created_at,
    analysis:
      typeof row.analysis === 'string'
        ? row.analysis
        : '',
    primaryType,
    confidence,
    specialty:
      specialtyAr || specialtyEn
        ? {
            ar: specialtyAr,
            en: specialtyEn,
          }
        : null,
  };
}

/**
 * Retrieves assessments belonging to the current
 * authenticated user.
 *
 * Supabase RLS must enforce that authenticated users
 * can only SELECT their own rows.
 */
async function getAssessments() {
  await getCurrentUser();

  const {
    data,
    error,
  } = await supabase
    .from('assessments')
    .select(
      'id, created_at, analysis, primary_type, confidence, specialty_ar, specialty_en'
    )
    .order('created_at', {
      ascending: false,
    })
    .limit(MAX_ASSESSMENTS_TO_LOAD);

  if (error) {
    console.error(
      'Failed to fetch assessments:',
      error.message
    );

    throw new Error('تعذر تحميل تقييماتك.');
  }

  if (!Array.isArray(data)) {
    throw new Error('بيانات التقييمات غير صالحة.');
  }

  return data
    .map(normalizeAssessmentRow)
    .filter(Boolean);
}

/**
 * Saves a new assessment result for the
 * currently authenticated user.
 *
 * RLS must enforce INSERT ownership server-side.
 */
async function saveAssessment(analysisData) {
  const user = await getCurrentUser();

  const validated =
    validateAssessmentData(analysisData);

  const {
    data,
    error,
  } = await supabase
    .from('assessments')
    .insert({
      user_id: user.id,
      analysis: validated.analysis,
      primary_type: validated.primaryType,
      confidence: validated.confidence,
      specialty_ar: validated.specialtyAr,
      specialty_en: validated.specialtyEn,
    })
    .select(
      'id, created_at, analysis, primary_type, confidence, specialty_ar, specialty_en'
    )
    .single();

  if (error) {
    console.error(
      'Failed to save assessment:',
      error.message
    );

    throw new Error('تعذر حفظ نتيجة التقييم.');
  }

  const normalized = normalizeAssessmentRow(data);

  if (!normalized) {
    throw new Error(
      'تم حفظ التقييم لكن البيانات المرجعة غير صالحة.'
    );
  }

  return normalized;
}

/**
 * Returns the most recent assessment.
 */
async function getLatestAssessment() {
  const assessments = await getAssessments();

  return assessments.length > 0
    ? assessments[0]
    : null;
}

/**
 * Basic aggregate stats used by the Home
 * and Plan pages.
 */
async function getAssessmentStats() {
  const assessments = await getAssessments();

  const typeCounts = {};

  assessments.forEach((entry) => {
    if (
      typeof entry.primaryType === 'string' &&
      ALLOWED_PRIMARY_TYPES.has(entry.primaryType)
    ) {
      typeCounts[entry.primaryType] =
        (typeCounts[entry.primaryType] || 0) + 1;
    }
  });

  const mostCommonType =
    Object.keys(typeCounts).sort(
      (a, b) =>
        typeCounts[b] - typeCounts[a]
    )[0] || null;

  return {
    totalAssessments: assessments.length,
    mostCommonType,
  };
}

function validateMedicationInput(name, dose) {
  const normalizedName =
    normalizeRequiredString(
      name,
      MAX_MEDICATION_NAME_LENGTH,
      'اسم الدواء مطلوب.'
    );

  const normalizedDose =
    normalizeOptionalString(
      dose,
      MAX_MEDICATION_DOSE_LENGTH
    );

  if (
    typeof dose !== 'string' &&
    dose !== null &&
    dose !== undefined
  ) {
    throw new Error('بيانات الجرعة غير صالحة.');
  }

  if (
    typeof dose === 'string' &&
    dose.trim().length > MAX_MEDICATION_DOSE_LENGTH
  ) {
    throw new Error(
      `بيانات الجرعة أطول من الحد المسموح به (${MAX_MEDICATION_DOSE_LENGTH} حرف).`
    );
  }

  return {
    name: normalizedName,
    dose: normalizedDose,
  };
}

/**
 * Saves a medication intake record for
 * the currently authenticated user.
 *
 * This records what the user says they took.
 * It does NOT determine whether the dose is
 * medically appropriate.
 */
async function saveMedication(name, dose) {
  const user = await getCurrentUser();

  const validated =
    validateMedicationInput(name, dose);

  const {
    data,
    error,
  } = await supabase
    .from('medications')
    .insert({
      user_id: user.id,
      name: validated.name,
      dose: validated.dose || null,
    })
    .select(
      'id, taken_at, name, dose'
    )
    .single();

  if (error) {
    console.error(
      'Failed to save medication:',
      error.message
    );

    throw new Error('تعذر تسجيل الدواء.');
  }

  if (
    !data ||
    typeof data !== 'object' ||
    typeof data.name !== 'string' ||
    !isValidDateString(data.taken_at)
  ) {
    throw new Error(
      'تم تسجيل الدواء لكن البيانات المرجعة غير صالحة.'
    );
  }

  return data;
}

/**
 * Retrieves medication records belonging
 * to the current authenticated user.
 */
async function getMedications() {
  await getCurrentUser();

  let result;

  try {
    result = await supabase
      .from('medications')
      .select(
        'id, taken_at, name, dose'
      )
      .order('taken_at', {
        ascending: false,
      })
      .limit(MAX_MEDICATIONS_TO_LOAD);
  } catch (error) {
    logSupabaseError(
      'Medication SELECT request threw before returning a response:',
      error
    );
    throw new Error(
      'تعذر تحميل سجل الأدوية.',
      { cause: error }
    );
  }

  const { data, error } = result;

  if (error) {
    logSupabaseError(
      'Failed to fetch medications:',
      error
    );

    throw new Error(
      'تعذر تحميل سجل الأدوية.',
      { cause: error }
    );
  }

  if (!Array.isArray(data)) {
    console.error(
      'Supabase returned a non-array medication response:',
      {
        responseType:
          data === null
            ? 'null'
            : typeof data,
      }
    );
    throw new Error('بيانات الأدوية غير صالحة.');
  }

  const medications = data.filter(
    (item) =>
      item &&
      typeof item === 'object' &&
      !Array.isArray(item) &&
      (item.id === undefined ||
        typeof item.id === 'string') &&
      typeof item.name === 'string' &&
      item.name.trim().length > 0 &&
      (item.dose === undefined ||
        item.dose === null ||
        (typeof item.dose === 'string' &&
          item.dose.trim().length <=
            MAX_MEDICATION_DOSE_LENGTH)) &&
      isValidDateString(item.taken_at)
  );

  if (data.length > 0 && medications.length === 0) {
    console.error(
      'Supabase returned medication rows, but none had a valid record shape:',
      {
        returnedRecordCount: data.length,
      }
    );
    throw new Error(
      'بيانات الأدوية غير صالحة.'
    );
  }

  return medications;
}

/**
 * Retrieves the current user's profile.
 */
async function getProfile() {
  const user = await getCurrentUser();

  const {
    data,
    error,
  } = await supabase
    .from('profiles')
    .select(
      'user_id, family_history, updated_at'
    )
    .eq('user_id', user.id)
    .maybeSingle();

  if (error) {
    console.error(
      'Failed to fetch profile:',
      error.message
    );

    throw new Error(
      'تعذر تحميل بيانات الملف الشخصي.'
    );
  }

  if (!data) {
    return null;
  }

  if (data.user_id !== user.id) {
    throw new Error(
      'بيانات الملف الشخصي غير صالحة.'
    );
  }

  return data;
}

/**
 * Saves or updates the user's family history.
 */
async function saveFamilyHistory(familyHistory) {
  const user = await getCurrentUser();

  if (
    familyHistory !== null &&
    familyHistory !== undefined &&
    typeof familyHistory !== 'string'
  ) {
    throw new Error(
      'بيانات التاريخ العائلي غير صالحة.'
    );
  }

  const normalizedHistory =
    normalizeOptionalString(
      familyHistory,
      MAX_FAMILY_HISTORY_LENGTH
    );

  if (
    typeof familyHistory === 'string' &&
    familyHistory.trim().length >
      MAX_FAMILY_HISTORY_LENGTH
  ) {
    throw new Error(
      `التاريخ العائلي أطول من الحد المسموح به (${MAX_FAMILY_HISTORY_LENGTH} حرف).`
    );
  }

  const {
    data,
    error,
  } = await supabase
    .from('profiles')
    .upsert(
      {
        user_id: user.id,
        family_history:
          normalizedHistory || null,
        updated_at: new Date().toISOString(),
      },
      {
        onConflict: 'user_id',
      }
    )
    .select(
      'user_id, family_history, updated_at'
    )
    .single();

  if (error) {
    console.error(
      'Failed to save family history:',
      error.message
    );

    throw new Error(
      'تعذر حفظ التاريخ العائلي.'
    );
  }

  if (
    !data ||
    data.user_id !== user.id
  ) {
    throw new Error(
      'تم الحفظ لكن بيانات الملف الشخصي غير صالحة.'
    );
  }

  return data;
}

export {
  getAssessments,
  saveAssessment,
  getLatestAssessment,
  getAssessmentStats,
  saveMedication,
  getMedications,
  getProfile,
  saveFamilyHistory,
};