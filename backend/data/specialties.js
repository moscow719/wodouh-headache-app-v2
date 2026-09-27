const specialtyMap = Object.freeze({
  tension: Object.freeze({
    ar: 'مخ وأعصاب',
    en: 'Neurology',
  }),

  migraine: Object.freeze({
    ar: 'مخ وأعصاب',
    en: 'Neurology',
  }),

  cluster: Object.freeze({
    ar: 'مخ وأعصاب',
    en: 'Neurology',
  }),

  sinus: Object.freeze({
    ar: 'أنف وأذن وحنجرة',
    en: 'ENT',
  }),

  eye_strain: Object.freeze({
    ar: 'طب وجراحة العيون',
    en: 'Ophthalmology',
  }),

  dehydration: Object.freeze({
    ar: 'باطنة عامة',
    en: 'General Medicine',
  }),
});

function getSpecialtyForType(headacheType) {
  if (typeof headacheType !== 'string') {
    return null;
  }

  return specialtyMap[headacheType] || null;
}

module.exports = {
  getSpecialtyForType,
};