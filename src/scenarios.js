// Single source of truth for scenario metadata: cards, welcome copy, suggestions.

export const SCENARIOS = [
  {
    id: 'photoshop',
    title: 'Photoshop',
    subtitle: 'Photo editing',
    description:
      'Learn how to retouch a portrait, work with layers, and apply adjustments — Mokitu watches your canvas.',
    emoji: '🎨',
    gradient: 'linear-gradient(135deg, #FFB088 0%, #FF8A65 100%)',
    welcome: "I can see you have Photoshop open with a photo. Ask me anything about editing it!",
    suggestions: [
      'How do I smooth the edges?',
      'Can I change the background color?',
      'Walk me through using the Select menu.'
    ]
  },
  {
    id: 'math',
    title: 'Mathematics',
    subtitle: 'Calculus practice',
    description:
      'Work through integration by parts and other calculus problems with a tutor that sees the same page you do.',
    emoji: '∫',
    gradient: 'linear-gradient(135deg, #B8C9A3 0%, #94B47B 100%)',
    welcome: "I can see a calculus problem on your screen. Want me to help you solve it?",
    suggestions: [
      "What's the next step?",
      'Can you explain integration by parts?',
      'Why does this approach work here?'
    ]
  },
  {
    id: 'excel',
    title: 'Excel',
    subtitle: 'Spreadsheet formulas',
    description:
      'Master VLOOKUP, INDEX/MATCH, and other lookup formulas with guidance on the cells in front of you.',
    emoji: '📊',
    gradient: 'linear-gradient(135deg, #FFD5CC 0%, #FFB088 100%)',
    welcome: "I can see your spreadsheet with product data. Need help with formulas?",
    suggestions: [
      'How do I get the product prices?',
      'What does FALSE mean in VLOOKUP?',
      'Walk me through writing the formula.'
    ]
  }
];

export const SCENARIO_BY_ID = Object.fromEntries(SCENARIOS.map((s) => [s.id, s]));
