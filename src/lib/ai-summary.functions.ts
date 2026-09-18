import { createServerFn } from "@tanstack/react-start";

export type SummaryInput = {
  holderName: string;
  bloodGroup: string;
  allergies: string[];
  medications: string[];
  conditions: string[];
  contactCount: number;
};

function clean(input: SummaryInput): SummaryInput {
  const list = (values: unknown) =>
    Array.isArray(values) ? values.map((v) => String(v).slice(0, 80)).slice(0, 20) : [];
  return {
    holderName: String(input.holderName ?? "").slice(0, 100),
    bloodGroup: String(input.bloodGroup ?? "").slice(0, 5),
    allergies: list(input.allergies),
    medications: list(input.medications),
    conditions: list(input.conditions),
    contactCount: Number(input.contactCount) || 0,
  };
}

export const getEmergencySummary = createServerFn({ method: "POST" })
  .inputValidator((input: SummaryInput) => clean(input))
  .handler(async ({ data }) => {
    const apiKey = process.env["OPENAI_API_KEY"];
    if (!apiKey) return { summary: "", error: "AI summary is not configured." };

    const prompt = [
      `Patient: ${data.holderName || "Unknown"}`,
      `Blood group: ${data.bloodGroup || "unknown"}`,
      `Allergies: ${data.allergies.join(", ") || "none reported"}`,
      `Medications: ${data.medications.join(", ") || "none reported"}`,
      `Conditions: ${data.conditions.join(", ") || "none reported"}`,
      `Emergency contacts on file: ${data.contactCount}`,
      "",
      "Write a 3-sentence triage briefing for a first responder who just scanned this emergency card.",
      "Lead with the most dangerous interaction risks, note what to avoid, and end with one caution.",
      "Plain text, no markdown, under 70 words. Never invent details that are not listed.",
    ].join("\n");

    try {
      const response = await fetch(process.env["OPENAI_RESPONSES_URL"] ?? "https://api.openai.com/v1/responses", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: process.env["OPENAI_MODEL"] ?? "gpt-4o-mini",
          input: prompt,
          stream: true,
          reasoning: { effort: "low", summary: "auto" },
        }),
      });

      if (!response.ok) {
        const body = await response.text();
        console.error(`AI summary failed [${response.status}]: ${body}`);
        if (response.status === 402) return { summary: "", error: "AI credits exhausted." };
        return { summary: "", error: "AI summary is unavailable right now." };
      }

      const reader = response.body?.getReader();
      if (!reader) return { summary: "", error: "AI summary is unavailable right now." };
      const decoder = new TextDecoder();
      let buffer = "";
      let text = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";
        for (const line of lines) {
          if (!line.startsWith("data:")) continue;
          const payload = line.slice(5).trim();
          if (!payload || payload === "[DONE]") continue;
          try {
            const event = JSON.parse(payload) as { type?: string; delta?: string };
            if (event.type === "response.output_text.delta" && typeof event.delta === "string") {
              text += event.delta;
            }
          } catch {
            // ignore partial frames
          }
        }
      }
      return { summary: text.trim(), error: text.trim() ? "" : "No summary was generated." };
    } catch (error) {
      console.error("AI summary error", error);
      return { summary: "", error: "AI summary is unavailable right now." };
    }
  });
