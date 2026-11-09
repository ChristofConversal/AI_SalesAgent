import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import type { z } from "zod";
import { BRIEFING_TASK, DEBRIEF_TASK, LIVE_TASK, SYSTEM_CORE } from "./prompts";
import { Briefing, Debrief, LiveUpdate } from "./schemas";

const MODEL = process.env.COPILOT_MODEL || "claude-opus-5-5";
type Effort = "low" | "medium" | "high" | "xhigh" | "max";

let client: Anthropic | null = null;
function anthropic() {
  // Leest ANTHROPIC_API_KEY (of ANTHROPIC_AUTH_TOKEN) uit de omgeving.
  client ??= new Anthropic();
  return client;
}

async function ask<S extends z.ZodType>(opts: {
  schema: S;
  task: string;
  dossier: string;
  user: string;
  effort: Effort;
  maxTokens: number;
}): Promise<z.infer<S>> {
  const response = await anthropic().beta.messages.parse({
    model: MODEL,
    max_tokens: opts.maxTokens,
    betas: ["server-side-fallback-2026-07-01"],
    // Weigert de veiligheidsfilter, dan neemt een ander model het over in dezelfde aanroep.
    fallbacks: "default",
    // Instructies en dossier blijven het hele gesprek gelijk: die prefix wordt gecachet.
    system: [
      { type: "text", text: `${SYSTEM_CORE}\n\n${opts.task}` },
      { type: "text", text: `## Dossier\n${opts.dossier}`, cache_control: { type: "ephemeral" } },
    ],
    messages: [{ role: "user", content: opts.user }],
    output_config: { effort: opts.effort, format: betaZodOutputFormat(opts.schema) },
  });

  if (response.stop_reason === "refusal") {
    throw new Error(`Claude weigerde (${response.stop_details?.category ?? "onbekend"}).`);
  }
  if (response.stop_reason === "max_tokens") {
    throw new Error("Antwoord afgekapt (max_tokens).");
  }
  if (!response.parsed_output) {
    throw new Error("Antwoord kon niet gelezen worden.");
  }
  return response.parsed_output as z.infer<S>;
}

export function claudeLive(dossier: string, previous: LiveUpdate | null, scriptState: string, transcript: string, minute: number) {
  const user = [
    `Vorige update:\n${previous ? JSON.stringify({ ...previous, asked: [], answers: [], inserted: [] }) : "geen (eerste segment)"}`,
    `Scriptstatus tot nu toe:\n${scriptState}`,
    `Transcript tot nu toe:\n${transcript}`,
    `Het nieuwste segment eindigt op minuut ${minute}. Geef de nieuwe update.`,
  ].join("\n\n");
  const effort = (process.env.COPILOT_LIVE_EFFORT as Effort) || "low";
  return ask({ schema: LiveUpdate, task: LIVE_TASK, dossier, user, effort, maxTokens: 8000 });
}

export function claudeBriefing(dossier: string) {
  return ask({ schema: Briefing, task: BRIEFING_TASK, dossier, user: "Maak de briefing.", effort: "medium", maxTokens: 12000 });
}

export function claudeDebrief(dossier: string, transcript: string) {
  return ask({ schema: Debrief, task: DEBRIEF_TASK, dossier, user: `Volledig transcript:\n${transcript}\n\nMaak de debrief.`, effort: "high", maxTokens: 16000 });
}
