// ─── Gemini AI client (Google AI Studio native) ─────────────────────────────
// Uses the @google/genai SDK. Follows the AI Studio Build convention of reading
// process.env.API_KEY, with Vite-exposed fallbacks so the SAME code runs in:
//   • Google AI Studio Build  (process.env.API_KEY injected by the platform)
//   • Local dev / Firebase     (VITE_GEMINI_API_KEY baked at build time)
// Keep this file framework-agnostic so AI Studio <-> Firebase <-> GitHub stay aligned.
import { GoogleGenAI } from "@google/genai";

const MODEL = "gemini-2.5-flash";

function resolveApiKey(): string {
  // AI Studio injects process.env.API_KEY; Vite exposes import.meta.env.*
  const fromProcess =
    (typeof process !== "undefined" && (process as any)?.env?.API_KEY) || "";
  const fromVite =
    (typeof import.meta !== "undefined" &&
      ((import.meta as any).env?.VITE_GEMINI_API_KEY ||
        (import.meta as any).env?.VITE_API_KEY)) ||
    "";
  return fromProcess || fromVite || "";
}

let _client: GoogleGenAI | null = null;
function client(): GoogleGenAI | null {
  const apiKey = resolveApiKey();
  if (!apiKey) return null;
  if (!_client) _client = new GoogleGenAI({ apiKey });
  return _client;
}

export function geminiAvailable(): boolean {
  return !!resolveApiKey();
}

/** Low-level text generation. Returns plain text (or an [Error: …] string). */
export async function geminiGenerate(
  systemPrompt: string,
  userPrompt: string,
  opts: { json?: boolean } = {}
): Promise<string> {
  const ai = client();
  if (!ai) {
    return "[Error: Gemini API key missing. Set API_KEY (AI Studio) or VITE_GEMINI_API_KEY (build).]";
  }
  try {
    const res = await ai.models.generateContent({
      model: MODEL,
      contents: userPrompt,
      config: {
        systemInstruction: systemPrompt,
        ...(opts.json ? { responseMimeType: "application/json" } : {}),
      },
    });
    return (res.text || "").trim();
  } catch (e: any) {
    console.error("[Gemini] generate error:", e);
    return "[Error: " + (e?.message || "Gemini call failed") + "]";
  }
}

// ─── FPCC business features ──────────────────────────────────────────────────

export interface OpsSnapshot {
  staff: any[];
  events: any[];
  clients: any[];
  invoices?: any[];
  quotes?: any[];
}

/** Operational insights: staffing risks, upcoming gaps, revenue/billing flags. */
export async function geminiOpsInsights(snap: OpsSnapshot): Promise<string> {
  const today = new Date().toISOString().slice(0, 10);
  const compact = {
    today,
    staffCount: snap.staff?.length || 0,
    staff: (snap.staff || []).map((s) => ({
      name: s.name,
      role: s.role,
      dept: s.department,
      rate: s.rate,
    })),
    events: (snap.events || []).map((e) => ({
      title: e.title,
      date: e.date,
      venue: e.venue,
      staffAssigned: (e.staffIds || []).length,
      start: e.startTime,
      end: e.endTime,
    })),
    openInvoices: (snap.invoices || []).filter(
      (i) => i.status !== "paid"
    ).length,
    draftQuotes: (snap.quotes || []).filter((q) => q.status === "draft").length,
  };
  const system =
    "You are the operations analyst for Fresh People, a South African events staffing agency. " +
    "Be concise and practical. Output 4-6 short bullet points (plain text, no markdown headers). " +
    "Focus on: understaffed upcoming events, scheduling clashes, idle staff, overdue/open billing, " +
    "and one revenue or efficiency suggestion. Use ZAR. Reference real names/dates from the data.";
  return geminiGenerate(system, "Operations data:\n" + JSON.stringify(compact));
}

/** Draft a professional WhatsApp/message to a client about an event. */
export async function geminiDraftClientMessage(
  client_: any,
  event_: any,
  intent: string
): Promise<string> {
  const system =
    "You write short, warm, professional messages for Fresh People (SA events staffing). " +
    "Tone: friendly but business-appropriate. Keep under 90 words. No markdown. " +
    "Sign off as 'Fresh People Team'. Use the client's first name.";
  const ctx = {
    client: { name: client_?.name, email: client_?.email },
    event: {
      title: event_?.title,
      date: event_?.date,
      venue: event_?.venue,
      start: event_?.startTime,
      end: event_?.endTime,
    },
    intent,
  };
  return geminiGenerate(system, "Write the message for:\n" + JSON.stringify(ctx));
}
