/**
 * Asistan değerlendirmesi: `npm run eval:assistant`
 * Kural tabanlı yedeği her zaman ölçer. ANTHROPIC_* ya da OPENAI_* anahtarı ve modeli tanımlıysa
 * aynı kümeyi yapay zekâya da sorar (ücretli çağrı yapar) ve iki sonucu yan yana yazar.
 * Küme sentetiktir; gerçek kullanıcı verisi içermez.
 */
import fs from "node:fs";
import path from "node:path";
import { assistantAnalysisJsonSchema, parseAssistantAnalysis } from "../src/lib/ai/assistant-schema";
import { fuwuAssistantSystemPrompt } from "../src/lib/ai/assistant-prompt";
import { scoreEvaluation, type EvalCase, type EvalOutcome } from "../src/lib/ai/evaluation";
import { buildFallbackAnalysis } from "../src/lib/ai/fallback-analysis";
import { requestStructuredJson, resolveAiProviders } from "../src/lib/ai/model-gateway";

const { cases } = JSON.parse(fs.readFileSync("evals/assistant-cases.json", "utf8")) as { cases: EvalCase[] };
const percent = (value: number) => `%${(value * 100).toFixed(1)}`;

function report(label: string, outcomes: EvalOutcome[]) {
  const score = scoreEvaluation(outcomes);
  console.log(`\n${label}`);
  console.log(`  Kategori doğruluğu : ${percent(score.categoryAccuracy)} (${score.categoryCorrect}/${score.categoryTotal})`);
  console.log(`  Acil durum yakalama: ${percent(score.emergencyRecall)} (${score.emergencyTotal - score.emergencyMissed.length}/${score.emergencyTotal})`);
  console.log(`  Yanlış acil alarmı : ${score.emergencyFalseAlarms}`);
  if (score.failed) console.log(`  Yanıt alınamayan   : ${score.failed}`);
  for (const text of score.emergencyMissed) console.log(`  KAÇAN ACİL: ${text}`);
  for (const item of score.wrongCategory) console.log(`  yanlış: beklenen ${item.expected}, gelen ${item.got} · ${item.text}`);
  return score;
}

async function main() {
const result: Record<string, unknown> = { cases: cases.length, generatedAt: new Date().toISOString(), dataset: "evals/assistant-cases.json (sentetik)" };
result.ruleBased = report("Kural tabanlı yedek", cases.map(item => ({ case: item, predicted: buildFallbackAnalysis({ message: item.text }) })));

const providers = resolveAiProviders();
if (!providers.length) {
  console.log("\nYapay zekâ ölçülmedi: sağlayıcı anahtarı ve modeli tanımlı değil.");
} else {
  for (const config of providers) {
    const outcomes: EvalOutcome[] = [];
    for (const item of cases) {
      try {
        const response = await requestStructuredJson({
          instructions: fuwuAssistantSystemPrompt,
          maxOutputTokens: 1200,
          schema: assistantAnalysisJsonSchema as unknown as Record<string, unknown>,
          schemaDescription: "FUWU ev hizmeti ilk değerlendirme sonucu.",
          schemaName: "fuwu_ai_assistant_analysis",
          userText: `Aşağıdaki kullanıcı talebini JSON structured output ile değerlendir:\n${JSON.stringify({ message: item.text }, null, 2)}`,
        }, { providers: [config] });
        outcomes.push({ case: item, predicted: parseAssistantAnalysis(response.json) });
      } catch {
        outcomes.push({ case: item, predicted: null });
      }
    }
    result[config.provider] = { model: config.model, ...report(`Yapay zekâ · ${config.provider} · ${config.model}`, outcomes) };
  }
}
const output = path.join("artifacts", "ai-eval");
fs.mkdirSync(output, { recursive: true });
fs.writeFileSync(path.join(output, "result.json"), JSON.stringify(result, null, 2));
console.log(`\nSonuç: ${path.join(output, "result.json")}`);
}

main().catch(error => { console.error(error instanceof Error ? error.message : error); process.exit(1); });
