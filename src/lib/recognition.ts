export interface RecognitionTier {
  name: string;
  minPoints: number;
  description: string;
  badgeClassName: string;
}

export const RECOGNITION_TIERS: RecognitionTier[] = [
  {
    name: "FoundDex Ambassador",
    minPoints: 200,
    description: "8+ verified community returns.",
    badgeClassName:
      "bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300",
  },
  {
    name: "Community Guardian",
    minPoints: 75,
    description: "3+ verified community returns.",
    badgeClassName:
      "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300",
  },
  {
    name: "Trusted Finder",
    minPoints: 25,
    description: "At least 1 verified return.",
    badgeClassName:
      "bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300",
  },
  {
    name: "New Helper",
    minPoints: 0,
    description: "Complete a verified return to earn your first badge.",
    badgeClassName:
      "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
  },
];

export function getRecognitionTier(trustPoints: number): RecognitionTier {
  const safePoints = Math.max(0, trustPoints);
  return (
    RECOGNITION_TIERS.find((tier) => safePoints >= tier.minPoints) ??
    RECOGNITION_TIERS[RECOGNITION_TIERS.length - 1]
  );
}

