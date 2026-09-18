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
    const apiKey = process.env["OPENROUTER_API_KEY"];
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
      const model = process.env["OPENROUTER_MODEL"] ?? "google/gemini-2.0-flash-exp:free";
      const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
          "HTTP-Referer": process.env["OPENROUTER_SITE_URL"] ?? "https://helthnow.vercel.app",
          "X-Title": "Helth Emergency Health Card",
        },
        body: JSON.stringify({
          model,
          messages: [{ role: "user", content: prompt }],
          temperature: 0.2,
          max_tokens: 180,
        }),
      });

      if (!response.ok) {
        const body = await response.text();
        console.error(`AI summary failed [${response.status}]: ${body}`);
        if (response.status === 429) return { summary: "", error: "AI rate limit reached." };
        return { summary: "", error: "AI summary is unavailable right now." };
      }

      const payload = (await response.json()) as {
        choices?: Array<{ message?: { content?: string | Array<{ type?: string; text?: string }> } }>;
      };
      const content = payload.choices?.[0]?.message?.content;
      const text = typeof content === "string" ? content : content?.map((part) => part.text ?? "").join("") ?? "";
      return { summary: text.trim(), error: text.trim() ? "" : "No summary was generated." };
    } catch (error) {
      console.error("AI summary error", error);
      return { summary: "", error: "AI summary is unavailable right now." };
    }
  });
