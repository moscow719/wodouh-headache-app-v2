const STORAGE_KEY = 'wodouh_assessments';

// Retrieves all saved assessments, most recent first.
function getAssessments() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const list = raw ? JSON.parse(raw) : [];
    return list.sort((a, b) => new Date(b.date) - new Date(a.date));
  } catch (error) {
    console.error('Failed to read assessments from storage:', error);
    return [];
  }
}

// Saves a new assessment result with a timestamp and unique id.
function saveAssessment(analysisData) {
  try {
    const existing = getAssessments();

    const newEntry = {
      id: Date.now().toString(),
      date: new Date().toISOString(),
      analysis: analysisData.analysis,
      primaryType: analysisData.primaryType,
      confidence: analysisData.confidence,
      specialty: analysisData.specialty,
    };

    const updated = [newEntry, ...existing];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));

    return newEntry;
  } catch (error) {
    console.error('Failed to save assessment to storage:', error);
    return null;
  }
}

// Returns the most recent assessment, or null if none exist.
function getLatestAssessment() {
  const all = getAssessments();
  return all.length > 0 ? all[0] : null;
}

// Basic aggregate stats used by the Home page.
function getAssessmentStats() {
  const all = getAssessments();

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

export { getAssessments, saveAssessment, getLatestAssessment, getAssessmentStats };