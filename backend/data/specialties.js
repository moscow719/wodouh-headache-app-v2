// Explicit mapping from headache type to medical specialty.
// This mapping is fixed logic - the AI never decides the specialty itself,
// it only classifies the headache type, and this table decides the rest.

const specialtyMap = {
  tension: { ar: 'مخ وأعصاب', en: 'Neurology' },
  migraine: { ar: 'مخ وأعصاب', en: 'Neurology' },
  cluster: { ar: 'مخ وأعصاب', en: 'Neurology' },
  sinus: { ar: 'أنف وأذن وحنجرة', en: 'ENT' },
  eye_strain: { ar: 'طب وجراحة العيون', en: 'Ophthalmology' },
  dehydration: { ar: 'باطنة عامة', en: 'General Medicine' },
};

const fallbackSpecialty = { ar: 'باطنة عامة', en: 'General Medicine' };

function getSpecialtyForType(headacheType) {
  return specialtyMap[headacheType] || fallbackSpecialty;
}

module.exports = { getSpecialtyForType };