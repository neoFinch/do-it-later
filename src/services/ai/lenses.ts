import {
  AnalysisLens,
  ExpectationLevel,
  ImplementationLevel,
  LearningStyle,
  ScorecardMetric
} from '../../types/ai-analysis';

export interface LensPack {
  id: AnalysisLens;
  label: string;
  guidelines: string;
  fieldsSchema: string;
  metrics: (lensFields: Record<string, unknown>) => ScorecardMetric[];
}

const asString = (value: unknown, fallback = '—'): string => {
  if (typeof value === 'string' && value.trim()) {
    return value.trim();
  }
  return fallback;
};

const asLevel = (value: unknown): string => {
  if (value === 'low' || value === 'medium' || value === 'high' || value === 'none') {
    return value.charAt(0).toUpperCase() + value.slice(1);
  }
  return '—';
};

const LEARNING_STYLE_LABELS: Record<LearningStyle, string> = {
  conceptual: 'Conceptual',
  mixed: 'Mixed',
  practical: 'Practical'
};

const IMPLEMENTATION_LABELS: Record<ImplementationLevel, string> = {
  none: 'None',
  low: 'Low',
  medium: 'Medium',
  high: 'High'
};

export const LENS_PACKS: Record<AnalysisLens, LensPack> = {
  technology: {
    id: 'technology',
    label: 'Technology',
    guidelines: `Technology lens:
- Judge practical learning value for builders and engineers.
- Talking about code does NOT mean the content is hands-on.
- Only assign high implementationLevel if a learner could follow along and build something.
- Prefer conservative confidence when demos are slideware-only.`,
    fieldsSchema: `"lensFields": {
    "difficulty": "beginner" | "intermediate" | "advanced",
    "prerequisites": string[],
    "implementationLevel": "none" | "low" | "medium" | "high",
    "learningStyle": "conceptual" | "mixed" | "practical",
    "codeWalkthrough": boolean
  }`,
    metrics: (fields) => [
      {
        label: 'Learning style',
        value:
          typeof fields.learningStyle === 'string' && fields.learningStyle in LEARNING_STYLE_LABELS
            ? LEARNING_STYLE_LABELS[fields.learningStyle as LearningStyle]
            : '—'
      },
      {
        label: 'Implementation',
        value:
          typeof fields.implementationLevel === 'string' && fields.implementationLevel in IMPLEMENTATION_LABELS
            ? IMPLEMENTATION_LABELS[fields.implementationLevel as ImplementationLevel]
            : '—'
      }
    ]
  },
  science: {
    id: 'science',
    label: 'Science',
    guidelines: `Science lens:
- Judge clarity, depth, and whether prerequisites are honest.
- Prefer evidence-oriented framing over hype.
- Call out if this is popularization vs primary-source depth.`,
    fieldsSchema: `"lensFields": {
    "difficulty": "beginner" | "intermediate" | "advanced",
    "prerequisites": string[],
    "depth": "low" | "medium" | "high",
    "evidenceStyle": string
  }`,
    metrics: (fields) => [
      { label: 'Depth', value: asLevel(fields.depth) },
      { label: 'Evidence', value: asString(fields.evidenceStyle) }
    ]
  },
  health: {
    id: 'health',
    label: 'Health',
    guidelines: `Health lens:
- Judge actionability and whether claims overpromise results.
- Flag medicalAdviceRisk when content implies diagnosis or treatment.
- Note equipment and intensity for exercise content.`,
    fieldsSchema: `"lensFields": {
    "exerciseType": string,
    "equipmentNeeded": string,
    "intensity": "low" | "medium" | "high",
    "medicalAdviceRisk": "low" | "medium" | "high"
  }`,
    metrics: (fields) => [
      { label: 'Intensity', value: asLevel(fields.intensity) },
      { label: 'Medical risk', value: asLevel(fields.medicalAdviceRisk) }
    ]
  },
  art: {
    id: 'art',
    label: 'Art',
    guidelines: `Art lens:
- Distinguish inspiration from instructional craft lessons.
- Judge whether time spent yields technique, taste, or mood only.`,
    fieldsSchema: `"lensFields": {
    "medium": string,
    "mode": "inspirational" | "instructional" | "mixed",
    "craftFocus": string
  }`,
    metrics: (fields) => [
      { label: 'Medium', value: asString(fields.medium) },
      { label: 'Mode', value: asString(fields.mode) }
    ]
  },
  movie: {
    id: 'movie',
    label: 'Movie',
    guidelines: `Movie / entertainment lens:
- Judge fit, tone, and whether the recommendation is worth the runtime.
- Avoid spoilers in youWillGet / youWillNotGet when spoilerRisk is medium or high.
- This is NOT a learning tutorial unless the content is clearly about filmmaking craft.`,
    fieldsSchema: `"lensFields": {
    "genre": string,
    "mood": string,
    "spoilerRisk": "low" | "medium" | "high",
    "whyWatch": string
  }`,
    metrics: (fields) => [
      { label: 'Genre', value: asString(fields.genre) },
      { label: 'Spoilers', value: asLevel(fields.spoilerRisk) }
    ]
  },
  finance: {
    id: 'finance',
    label: 'Finance',
    guidelines: `Finance lens:
- Separate educational explainers from opinion / hype / investment pitches.
- Be conservative when content implies guaranteed outcomes.`,
    fieldsSchema: `"lensFields": {
    "mode": "educational" | "opinion" | "news" | "mixed",
    "beginnerFriendly": boolean,
    "riskFraming": "low" | "medium" | "high"
  }`,
    metrics: (fields) => [
      { label: 'Mode', value: asString(fields.mode) },
      { label: 'Risk framing', value: asLevel(fields.riskFraming) }
    ]
  },
  productivity: {
    id: 'productivity',
    label: 'Productivity',
    guidelines: `Productivity lens:
- Prefer concrete actionable steps over motivational fluff.
- Note whether frameworks/templates are included.`,
    fieldsSchema: `"lensFields": {
    "actionability": "low" | "medium" | "high",
    "hasFramework": boolean,
    "fluffRisk": "low" | "medium" | "high"
  }`,
    metrics: (fields) => [
      { label: 'Actionability', value: asLevel(fields.actionability) },
      { label: 'Fluff risk', value: asLevel(fields.fluffRisk) }
    ]
  },
  news: {
    id: 'news',
    label: 'News',
    guidelines: `News lens:
- Judge time-sensitivity vs evergreen value.
- Prefer clarity of what changed and why it matters now.`,
    fieldsSchema: `"lensFields": {
    "timeSensitivity": "low" | "medium" | "high",
    "evergreen": boolean,
    "angle": string
  }`,
    metrics: (fields) => [
      { label: 'Urgency', value: asLevel(fields.timeSensitivity) },
      { label: 'Evergreen', value: fields.evergreen === true ? 'Yes' : fields.evergreen === false ? 'No' : '—' }
    ]
  },
  general: {
    id: 'general',
    label: 'General',
    guidelines: `General lens:
- Use when no specialist domain fits cleanly.
- Still answer whether the time investment is likely worthwhile.
- Keep lensFields minimal.`,
    fieldsSchema: `"lensFields": {
    "focus": string
  }`,
    metrics: (fields) => [{ label: 'Focus', value: asString(fields.focus) }]
  }
};

export const getLensPack = (lens: AnalysisLens): LensPack => LENS_PACKS[lens] ?? LENS_PACKS.general;

export const listLensLabels = (): string =>
  Object.values(LENS_PACKS)
    .map((pack) => pack.id)
    .join(' | ');

export const normalizeLens = (value: unknown): AnalysisLens => {
  if (typeof value === 'string' && value in LENS_PACKS) {
    return value as AnalysisLens;
  }
  return 'general';
};

export const isExpectationLevel = (value: unknown): value is ExpectationLevel =>
  value === 'low' || value === 'medium' || value === 'high';
