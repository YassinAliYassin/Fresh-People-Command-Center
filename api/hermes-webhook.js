// Hermes Calendar Webhook — Vercel Serverless Function
// Processes calendar events with Gemini AI + Firestore
import { initializeApp, getApps, cert } from "firebase-admin/app";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { GoogleGenerativeAI } from "@google/generative-ai";

// Initialize Firebase Admin (once per cold start)
function initAdmin() {
  if (getApps().length > 0) return;
  const projectId = process.env.FIREBASE_PROJECT_ID || "freshchat-3545e";

  const saJson = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (saJson) {
    try {
      const creds = JSON.parse(saJson);
      initializeApp({ credential: cert(creds), projectId });
      return;
    } catch (e) {
      console.error("[Hermes] Failed to parse FIREBASE_SERVICE_ACCOUNT:", e);
    }
  }

  initializeApp({ projectId });
}

// Resolve Gemini API key
function resolveApiKey() {
  return process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY || "";
}

// Main handler
export default async function handler(req, res) {
  // CORS
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const payload = req.body;
  if (!payload || Object.keys(payload).length === 0) {
    return res.status(200).json({ status: "ignored", reason: "empty body" });
  }

  const apiKey = resolveApiKey();
  if (!apiKey) {
    return res.status(500).json({
      error: "Gemini API key not configured. Set GEMINI_API_KEY in Vercel env vars.",
    });
  }

  try {
    initAdmin();
    const db = getFirestore();

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash",
      systemInstruction:
        "You are Hermes, the FPCC operations agent for Fresh People (SA events staffing). " +
        "Process calendar webhook payloads. For each event: " +
        "1. Check staff availability by looking at the events data provided " +
        "2. Return a JSON summary with actions_taken, conflicts, and recommendations",
    });

    const prompt =
      "Process this calendar webhook payload and provide a JSON summary with actions_taken, conflicts, and scheduling recommendations:\n" +
      JSON.stringify(payload, null, 2);

    const result = await model.generateContent(prompt);
    const text = result.response.text();

    // Log to Firestore for audit trail
    try {
      await db.collection("webhook_logs").add({
        source: "calendar",
        payload,
        hermes_response: text,
        processed_at: FieldValue.serverTimestamp(),
      });
    } catch (dbErr) {
      console.error("[Hermes] Firestore log error:", dbErr);
    }

    return res.status(200).json({
      status: "processed",
      hermes_report: text,
    });
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err);
    console.error("[Hermes Webhook] Error:", errMsg);
    return res.status(500).json({ error: errMsg });
  }
}
