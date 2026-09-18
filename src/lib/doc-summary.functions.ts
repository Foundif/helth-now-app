import { createServerFn } from "@tanstack/react-start";
import { requireOwner } from "@/lib/helth.functions";

export type DocSummary = {
  overview: string;
  keyPoints: string[];
  timeline: { when: string; what: string }[];
  advice: string;
  error?: string;
};

/** Removes markdown noise (asterisks, hashes, bullets) so the UI shows clean sentences. */
function clean(text: string) {
  return text
    .replace(/[*#_`]+/g, "")
    .replace(/^\s*[-•]\s*/gm, "")
    .replace(/\s+/g, " ")
    .trim();
}

const empty: DocSummary = { overview: "", keyPoints: [], timeline: [], advice: "" };

export const summarizeDocument = createServerFn({ method: "POST" })
  .inputValidator((input: { cardId: string; phone: string; id: string }) => input)
  .handler(async ({ data }): Promise<DocSummary> => {
    const apiKey = process.env["GEMINI_API_KEY"];
    if (!apiKey) return { ...empty, error: "AI summaries are not configured." };

    const { db, row } = await requireOwner(data.cardId, data.phone);
    const { data: doc } = await db
      .from("health_documents")
      .select("id, name, doc_type, storage_path, created_at")
      .eq("id", data.id)
      .eq("card_id", row.card_id)
      .maybeSingle();
    if (!doc) return { ...empty, error: "Document not found." };

    const download = await db.storage.from("health-docs").download(doc.storage_path);
    if (download.error || !download.data) {
      return { ...empty, error: "Could not open this document." };
    }
    const bytes = new Uint8Array(await download.data.arrayBuffer());
    if (bytes.length > 12_000_000) {
      return { ...empty, error: "This file is too large to summarise." };
    }
    let binary = "";
    for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]!);
    const base64 = btoa(binary);
    const mime = download.data.type || "application/octet-stream";
    const isImage = mime.startsWith("image/");
    const isPdf = mime === "application/pdf";
    if (!isImage && !isPdf) {
      return { ...empty, error: "Only images and PDF documents can be summarised." };
    }

    const instruction = [
      `This is a health document titled "${doc.name}" (${doc.doc_type}), uploaded on ${new Date(doc.created_at).toISOString().slice(0, 10)}.`,
      "Explain it for a patient with no medical training, in very simple words.",
      "Return JSON only with these fields:",
      'overview: two short plain sentences saying what this document is and the headline finding.',
      "keyPoints: 3 to 5 short sentences, each one finding, test value or medicine with what it means.",
      "timeline: up to 5 entries ordered oldest to newest, each with when (a date or visit label found in the document) and what (one short sentence).",
      "advice: one short sentence on what to do or discuss next, with no diagnosis.",
      "Never use asterisks, markdown, bullets or emojis. Never invent values that are not in the document.",
      "If the document is unreadable, say so plainly in overview and leave the other fields empty.",
    ].join(" ");

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
          contents: [{
            role: "user",
            parts: [
              { text: instruction },
              { inlineData: { mimeType: mime, data: base64 } },
            ],
          }],
          generationConfig: {
            temperature: 0.1,
            responseMimeType: "application/json",
            responseSchema: {
              type: "OBJECT",
              properties: {
                overview: { type: "STRING" },
                keyPoints: { type: "ARRAY", items: { type: "STRING" } },
                timeline: {
                  type: "ARRAY",
                  items: {
                    type: "OBJECT",
                    properties: { when: { type: "STRING" }, what: { type: "STRING" } },
                    required: ["when", "what"],
                  },
                },
                advice: { type: "STRING" },
              },
              required: ["overview", "keyPoints", "timeline", "advice"],
            },
          },
        }),
        },
      );

      if (!response.ok) {
        const body = await response.text();
        console.error(`Doc summary failed [${response.status}]: ${body}`);
        if (response.status === 429) return { ...empty, error: "Too many requests — try again in a minute." };
        if (response.status === 429)
          return { ...empty, error: "Too many requests — try again in a minute." };
        return { ...empty, error: "AI summary is unavailable right now." };
      }

      const payload = (await response.json()) as {
        candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
      };
      const text = payload.candidates?.[0]?.content?.parts?.map((part) => part.text ?? "").join("") ?? "";

      if (!text.trim()) return { ...empty, error: "No summary was generated." };
      const parsed = JSON.parse(text) as DocSummary;
      return {
        overview: clean(parsed.overview ?? ""),
        keyPoints: (parsed.keyPoints ?? []).map(clean).filter(Boolean).slice(0, 6),
        timeline: (parsed.timeline ?? [])
          .map((e) => ({ when: clean(e.when ?? ""), what: clean(e.what ?? "") }))
          .filter((e) => e.what)
          .slice(0, 6),
        advice: clean(parsed.advice ?? ""),
      };
    } catch (error) {
      console.error("Doc summary error", error);
      return { ...empty, error: "AI summary is unavailable right now." };
    }
  });
