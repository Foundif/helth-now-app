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
    const apiKey = process.env["GEMINI_API_KEY"];
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
      const model = process.env["GEMINI_MODEL"] ?? "gemini-3.6-flash";
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(apiKey)}`,
        {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          contents: [{ role: "user", parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.2, maxOutputTokens: 180 },
        }),
        },
      );

      if (!response.ok) {
        const body = await response.text();
        console.error(`AI summary failed [${response.status}]: ${body}`);
        if (response.status === 429) return { summary: "", error: "AI rate limit reached." };
        return { summary: "", error: "AI summary is unavailable right now." };
      }

      const payload = (await response.json()) as {
        candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
      };
      const text = payload.candidates?.[0]?.content?.parts?.map((part) => part.text ?? "").join("") ?? "";
      return { summary: text.trim(), error: text.trim() ? "" : "No summary was generated." };
    } catch (error) {
      console.error("AI summary error", error);
      return { summary: "", error: "AI summary is unavailable right now." };
    }
  });
