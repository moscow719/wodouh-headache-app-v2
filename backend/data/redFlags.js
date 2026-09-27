const redFlagQuestions = [
  {
    id: 'sudden_severe_onset',
    question:
      'Did the headache start suddenly and reach maximum intensity within seconds or minutes?',
    reasonIfAsked:
      'A sudden severe headache that reaches maximum intensity very quickly can be a warning sign of a serious medical condition and requires immediate evaluation.',
    urgencyLevel: 'emergency',
  },

  {
    id: 'worst_headache_ever',
    question:
      'Is this the worst or most severe headache you have ever experienced?',
    reasonIfAsked:
      'A sudden or unusually severe headache compared with your usual headaches can require urgent medical evaluation.',
    urgencyLevel: 'emergency',
  },

  {
    id: 'head_injury',
    question:
      'Did the headache begin after a head injury or significant trauma?',
    reasonIfAsked:
      'A headache following head trauma may require urgent evaluation to rule out serious injury.',
    urgencyLevel: 'emergency',
  },

  {
    id: 'neurological_symptoms',
    question:
      'Are you experiencing weakness, numbness, difficulty speaking, major vision changes, confusion, loss of consciousness, or a seizure along with the headache?',
    reasonIfAsked:
      'New neurological symptoms together with a headache can be a warning sign of a serious neurological condition and require urgent medical attention.',
    urgencyLevel: 'emergency',
  },

  {
    id: 'fever_neck_stiffness',
    question:
      'Do you have a high fever or severe neck stiffness along with the headache?',
    reasonIfAsked:
      'A headache with fever or severe neck stiffness can be associated with serious infections and requires urgent medical evaluation.',
    urgencyLevel: 'emergency',
  },

  {
    id: 'new_unusual_pattern',
    question:
      'Is this headache new, significantly different from your usual headaches, or progressively getting worse?',
    reasonIfAsked:
      'A new or progressively worsening headache pattern may require medical evaluation, particularly when it is different from your usual headaches.',
    urgencyLevel: 'urgent',
  },
];

module.exports = redFlagQuestions;