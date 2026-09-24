// This file contains the critical Red Flag questions for headache assessment.
// Each question represents a warning sign that requires urgent medical attention.
// This logic must NEVER be skipped or inferred silently by AI - every question
// must be explicitly answered before proceeding.

const redFlagQuestions = [
  {
    id: 'sudden_severe_onset',
    question: 'Did the headache start suddenly and reach maximum intensity within seconds or minutes?',
    reasonIfAsked: 'A sudden, severe headache (thunderclap headache) can indicate a serious condition like a brain hemorrhage and requires immediate evaluation.',
    urgencyLevel: 'emergency'
  },
  {
    id: 'worst_headache_ever',
    question: 'Is this the worst headache you have ever experienced in your life?',
    reasonIfAsked: 'An unusually severe headache compared to your normal pattern can be a warning sign of a serious underlying cause.',
    urgencyLevel: 'emergency'
  },
  {
    id: 'head_injury',
    question: 'Did the headache start after a head injury or trauma?',
    reasonIfAsked: 'Headaches following head trauma need evaluation to rule out bleeding or brain injury.',
    urgencyLevel: 'emergency'
  },
  {
    id: 'neurological_symptoms',
    question: 'Do you have weakness, numbness, difficulty speaking, vision problems, or fainting along with the headache?',
    reasonIfAsked: 'These neurological symptoms alongside a headache may indicate a stroke or other serious neurological condition.',
    urgencyLevel: 'emergency'
  },
  {
    id: 'fever_neck_stiffness',
    question: 'Do you have a high fever and neck stiffness along with the headache?',
    reasonIfAsked: 'This combination can be a sign of meningitis, which requires immediate medical care.',
    urgencyLevel: 'emergency'
  },
  {
    id: 'new_unusual_pattern',
    question: 'Is this headache new, unusual for you, or getting progressively worse over days or weeks?',
    reasonIfAsked: 'A new or worsening headache pattern, especially in someone who does not usually get headaches, needs medical evaluation.',
    urgencyLevel: 'urgent'
  }
];

module.exports = redFlagQuestions;