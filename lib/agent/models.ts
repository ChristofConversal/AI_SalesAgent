// Keuzes in de keuzelijst "Agent". Gedeeld door server en browser.

export type AgentId = "scripted" | "claude-haiku-5-5" | "claude-sonnet-5-5" | "claude-opus-5-5";

export const AGENTS: { id: AgentId; label: string; hint: string }[] = [
  { id: "scripted", label: "Script (zonder API)", hint: "vooraf geschreven antwoorden, gratis" },
  { id: "claude-haiku-5-5", label: "Claude Haiku 5.5", hint: "snelst en goedkoopst" },
  { id: "claude-sonnet-5-5", label: "Claude Sonnet 5.5", hint: "snel, ± helft van Opus" },
  { id: "claude-opus-5-5", label: "Claude Opus 5.5", hint: "beste kwaliteit" },
];

export function isAgentId(x: unknown): x is AgentId {
  return AGENTS.some((a) => a.id === x);
}

export function agentLabel(id: string | undefined): string {
  return AGENTS.find((a) => a.id === id)?.label ?? (id ? id : "script");
}
