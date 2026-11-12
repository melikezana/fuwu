import type { AssistantAnalysis, AssistantCategory } from "@/lib/ai/assistant-schema";

/**
 * Asistan değerlendirme ölçümü. Aynı soru kümesi hem kural tabanlı yedeğe hem (anahtar varsa)
 * yapay zekâ sağlayıcısına sorulur; sonuçlar yan yana raporlanır. Küme: evals/assistant-cases.json.
 */
export type EvalCase = { category: AssistantCategory | null; emergency: boolean; text: string };
export type EvalOutcome = { case: EvalCase; predicted: Pick<AssistantAnalysis, "category" | "urgency"> | null };
export type EvalScore = {
  categoryAccuracy: number; categoryCorrect: number; categoryTotal: number;
  emergencyFalseAlarms: number; emergencyMissed: string[]; emergencyRecall: number; emergencyTotal: number;
  failed: number; total: number; wrongCategory: { expected: string; got: string; text: string }[];
};

export function scoreEvaluation(outcomes: EvalOutcome[]): EvalScore {
  const answered = outcomes.filter(item => item.predicted);
  const categoryCases = answered.filter(item => item.case.category !== null && !item.case.emergency);
  const wrong = categoryCases.filter(item => item.predicted!.category !== item.case.category);
  const emergencies = answered.filter(item => item.case.emergency);
  const missed = emergencies.filter(item => item.predicted!.urgency !== "emergency");
  const ratio = (part: number, whole: number) => (whole ? Math.round((part / whole) * 1000) / 1000 : 0);
  return {
    categoryAccuracy: ratio(categoryCases.length - wrong.length, categoryCases.length),
    categoryCorrect: categoryCases.length - wrong.length,
    categoryTotal: categoryCases.length,
    emergencyFalseAlarms: answered.filter(item => !item.case.emergency && item.predicted!.urgency === "emergency").length,
    emergencyMissed: missed.map(item => item.case.text),
    emergencyRecall: ratio(emergencies.length - missed.length, emergencies.length),
    emergencyTotal: emergencies.length,
    failed: outcomes.length - answered.length,
    total: outcomes.length,
    wrongCategory: wrong.map(item => ({ expected: String(item.case.category), got: item.predicted!.category, text: item.case.text })),
  };
}
