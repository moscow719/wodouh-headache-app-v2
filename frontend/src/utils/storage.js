import { supabase } from '../supabaseClient';

// Retrieves all assessments belonging to the current logged-in user,
// most recent first. Supabase's Row Level Security ensures each user
// only ever sees their own data.
async function getAssessments() {
  const { data, error } = await supabase
    .from('assessments')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Failed to fetch assessments:', error.message);
    return [];
  }

  return data.map((row) => ({
    id: row.id,
    date: row.created_at,
    analysis: row.analysis,
    primaryType: row.primary_type,
    confidence: row.confidence,
    specialty: { ar: row.specialty_ar, en: row.specialty_en },
  }));
}

// Saves a new assessment result, linked to the currently logged-in user.
async function saveAssessment(analysisData) {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    console.error('No logged-in user found, cannot save assessment.');
    return null;
  }

  const { data, error } = await supabase
    .from('assessments')
    .insert({
      user_id: user.id,
      analysis: analysisData.analysis,
      primary_type: analysisData.primaryType,
      confidence: analysisData.confidence,
      specialty_ar: analysisData.specialty?.ar,
      specialty_en: analysisData.specialty?.en,
    })
    .select()
    .single();

  if (error) {
    console.error('Failed to save assessment:', error.message);
    return null;
  }

  return data;
}

// Returns the most recent assessment, or null if none exist.
async function getLatestAssessment() {
  const all = await getAssessments();
  return all.length > 0 ? all[0] : null;
}

// Basic aggregate stats used by the Home page.
async function getAssessmentStats() {
  const all = await getAssessments();

  const typeCounts = {};
  all.forEach((entry) => {
    if (entry.primaryType) {
      typeCounts[entry.primaryType] = (typeCounts[entry.primaryType] || 0) + 1;
    }
  });

  const mostCommonType = Object.keys(typeCounts).sort(
    (a, b) => typeCounts[b] - typeCounts[a]
  )[0];

  return {
    totalAssessments: all.length,
    mostCommonType: mostCommonType || null,
  };
}
// Saves a medication the user has taken.
async function saveMedication(name, dose) {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    console.error('No logged-in user found, cannot save medication.');
    return null;
  }

  const { data, error } = await supabase
    .from('medications')
    .insert({
      user_id: user.id,
      name,
      dose,
    })
    .select()
    .single();

  if (error) {
    console.error('Failed to save medication:', error.message);
    return null;
  }

  return data;
}

// Retrieves all medications logged by the current user, most recent first.
async function getMedications() {
  const { data, error } = await supabase
    .from('medications')
    .select('*')
    .order('taken_at', { ascending: false });

  if (error) {
    console.error('Failed to fetch medications:', error.message);
    return [];
  }

  return data;
}
// Retrieves the user's profile (family history, etc.), or null if not set yet.
async function getProfile() {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('user_id', user.id)
    .maybeSingle();

  if (error) {
    console.error('Failed to fetch profile:', error.message);
    return null;
  }

  return data;
}

// Saves or updates the user's family history note.
async function saveFamilyHistory(familyHistory) {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data, error } = await supabase
    .from('profiles')
    .upsert({ user_id: user.id, family_history: familyHistory, updated_at: new Date().toISOString() })
    .select()
    .single();

  if (error) {
    console.error('Failed to save family history:', error.message);
    return null;
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