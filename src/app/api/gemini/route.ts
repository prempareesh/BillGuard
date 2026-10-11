import { NextRequest, NextResponse } from "next/server";

// Server-side environment key only — never exposed to client
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || "";

// Simple IP-based in-memory rate limiter (20 requests per minute)
const RATE_LIMIT_WINDOW_MS = 60 * 1000;
const MAX_REQUESTS_PER_WINDOW = 20;
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);
  if (!entry || now > entry.resetTime) {
    rateLimitMap.set(ip, { count: 1, resetTime: now + RATE_LIMIT_WINDOW_MS });
    return true;
  }
  if (entry.count >= MAX_REQUESTS_PER_WINDOW) {
    return false;
  }
  entry.count += 1;
  return true;
}

// Models in priority order
const GEMINI_MODELS = [
  "gemini-3.5-flash",
  "gemini-3-flash-preview",
  "gemini-3.8-flash",
  "gemini-3.1-flash-lite",
  "gemini-flash-latest",
];

async function callGemini(contents: unknown[]) {
  if (!GEMINI_API_KEY) {
    throw new Error("GEMINI_API_KEY is not configured on the server. Please configure it in your environment variables.");
  }

  let lastError: Error | null = null;

  for (const model of GEMINI_MODELS) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": GEMINI_API_KEY,
        },
        body: JSON.stringify({ contents }),
        signal: AbortSignal.timeout(35000), // 35s timeout for multimodal OCR
      });

      if (!response.ok) {
        if (response.status === 400 || response.status === 401 || response.status === 403) {
          throw new Error("Gemini API authentication failed (invalid or unauthorized API key). Please verify your GEMINI_API_KEY configuration.");
        }
        const errorText = await response.text();
        console.warn(`Gemini model ${model} failed (${response.status}):`, errorText.slice(0, 100));
        continue;
      }

      const data = await response.json();
      const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || "";
      if (text) {
        return text;
      }
    } catch (err: unknown) {
      if (err instanceof Error && err.message.includes("authentication failed")) {
        throw err;
      }
      lastError = err instanceof Error ? err : new Error(String(err));
      console.warn(`Error calling Gemini model ${model}:`, lastError.message);
    }
  }

  throw lastError || new Error("All Gemini model endpoints failed");
}


export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "127.0.0.1";
    if (!checkRateLimit(ip)) {
      return NextResponse.json(
        { error: "Too many requests. Please wait a minute before making more requests." },
        { status: 429 }
      );
    }

    if (!GEMINI_API_KEY) {
      return NextResponse.json(
        { error: "Gemini API service is not configured on the server. Please set GEMINI_API_KEY in environment variables." },
        { status: 503 }
      );
    }

    const body = await req.json();
    const { mode } = body;


    // ------------------------------------------------------------------
    // MODE 1: OCR EXTRACTION FROM BILL IMAGE
    // ------------------------------------------------------------------
    if (mode === "ocr") {
      const { imageBase64, mimeType = "image/jpeg" } = body;

      const promptText = `
You are an expert electricity bill auditing AI specialized in Indian Electricity Regulatory Commissions, specifically Andhra Pradesh DISCOMs (APSPDCL, APCPDCL, APEPDCL).
Analyze this electricity bill image and extract the following details precisely as strict JSON:

{
  "consumerName": "Full name of consumer",
  "consumerNumber": "Consumer Account / Unique Service Identifier",
  "serviceNumber": "USC / Distribution Service Number",
  "discom": "APSPDCL" | "APCPDCL" | "APEPDCL",
  "consumerCategory": "Domestic" | "Commercial",
  "billingMonth": "Month and Year e.g. August 2026",
  "unitsConsumed": 0,
  "billAmount": 0,
  "fixedCharges": 0,
  "taxes": 0,
  "fuelAdjustmentCharges": 0,
  "previousReading": 0,
  "currentReading": 0,
  "dueDate": "DD-MM-YYYY"
}

Ensure all monetary values and meter readings are numbers. If a field cannot be found, make an intelligent approximation based on AP standards (e.g. fixed charges = 30 for domestic, taxes ~ 6 paise/unit). Output ONLY JSON.
`;

      const contents = [
        {
          parts: [
            { text: promptText },
            {
              inlineData: {
                mimeType,
                data: imageBase64.replace(/^data:[^;]+;base64,/, ""),
              },
            },
          ],
        },
      ];

      try {
        const rawText = await callGemini(contents);
        let jsonStr = rawText;
        const jsonMatch = rawText.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
        if (jsonMatch && jsonMatch[1]) {
          jsonStr = jsonMatch[1];
        }
        const parsed = JSON.parse(jsonStr.trim());
        return NextResponse.json({ success: true, data: parsed, source: "gemini" });
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Failed to extract bill data using Gemini OCR";
        console.warn("Gemini OCR error:", message);
        const isAuthError = message.includes("authentication") || message.includes("API key");
        return NextResponse.json(
          {
            error: isAuthError
              ? "Gemini API authentication failed (invalid or unauthorized API key). Please verify your GEMINI_API_KEY configuration."
              : "Could not extract required billing parameters from statement image. Please ensure the bill is clear and readable.",
          },
          { status: isAuthError ? 401 : 422 }
        );
      }
    }

    // ------------------------------------------------------------------
    // MODE 2: MULTILINGUAL AUDIT EXPLANATION
    // ------------------------------------------------------------------
    if (mode === "multilingual_explain") {
      const { language = "en", auditData } = body;

      const promptText = `
You are an expert APERC Tariff Compliance Auditor.
Provide an official, government-grade explanation of the following audited electricity bill in language: ${
        language === "te"
          ? "Telugu (తెలుగు)"
          : language === "hi"
          ? "Hindi (हिन्दी)"
          : "English"
      }.

Bill Audit Context:
- DISCOM: ${auditData?.discom || "APSPDCL"}
- Consumer Category: ${auditData?.consumerCategory || "Domestic"}
- Billing Period: ${auditData?.billingMonth || "August 2026"}
- Units Consumed: ${auditData?.unitsConsumed || 320} kWh
- Expected Amount (APERC Approved): ₹${auditData?.expectedBill || 2740}
- Actual Billed Amount: ₹${auditData?.actualBill || 2850}
- Variance: ${auditData?.difference >= 0 ? "+" : ""}₹${auditData?.difference ?? 110} (${auditData?.percentageDifference ?? 4}%)
- Status: ${auditData?.status || "Potential Overcharge"}

Generate a strict JSON object:
{
  "headline": "Short title in requested language",
  "explanation": "Clear, precise explanation in requested language explaining the variance",
  "keyReasons": [
    "Reason 1 in requested language (slab crossed)",
    "Reason 2 in requested language (fixed charges)",
    "Reason 3 in requested language (fuel surcharge)"
  ],
  "alertTitle": "Audit Alert Title",
  "alertMessage": "Detailed alert message",
  "recommendationSummary": "Practical energy advice"
}
`;

      try {
        const rawText = await callGemini([{ parts: [{ text: promptText }] }]);
        let jsonStr = rawText;
        const jsonMatch = rawText.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
        if (jsonMatch && jsonMatch[1]) {
          jsonStr = jsonMatch[1];
        }
        const parsed = JSON.parse(jsonStr.trim());
        return NextResponse.json({ success: true, data: parsed, source: "gemini" });
      } catch (err) {
        console.warn("Gemini multilingual fallback triggered:", err);
        return NextResponse.json({
          success: true,
          data: {
            headline: "APERC Tariff Compliance Audit",
            explanation: `Your bill is ₹${Math.abs(auditData?.difference ?? 110)} higher than expected under official Andhra Pradesh retail tariff slabs.`,
            keyReasons: [
              "Consumption crossed into the 226–400 unit slab (₹8.75/unit)",
              `Statutory fixed charges: ₹${auditData?.fixedCharges ?? 30}`,
              `Fuel adjustment (FPPCA): ₹${auditData?.fppcaFuelSurcharge ?? 48}`,
            ],
            alertTitle: "Potential Overcharge Detected",
            alertMessage: "Your actual billed statement exceeds official APERC tariff schedules.",
            recommendationSummary: "Optimize heavy electrical load and adjust AC to 24°C to save ~₹350/month.",
          },
          source: "fallback",
        });
      }
    }

    // ------------------------------------------------------------------
    // MODE 3: CONTEXTUAL, BILL-AWARE ELECTRICITY ASSISTANT
    // ------------------------------------------------------------------
    if (mode === "assistant_chat") {
      const { message, language = "en", billContext } = body;

      const consumerName = billContext?.consumerName || "Consumer";
      const serviceNumber = billContext?.serviceNumber || "NEL-04-12948";
      const units = Number(billContext?.units) || 320;
      const actual = Number(billContext?.actualBill) || 2850;
      const expected = Number(billContext?.expectedBill) || 2740;
      const diff = billContext?.detectedVariance !== undefined ? Number(billContext.detectedVariance) : (actual - expected);
      const discom = billContext?.discom || "APSPDCL";
      const tariffSlab = billContext?.tariffSlab || "226–400 units @ ₹8.75/unit";
      const status = billContext?.status || (diff > 0 ? "Potential Overcharge" : "Verified");
      const isEligibleForComplaint = diff > 0;

      const promptText = `
You are the official AI Electricity Assistant for BillGuard, an APERC-regulated consumer tariff transparency tool in Andhra Pradesh, India.
The user is asking a question about their electricity bill in language: ${
        language === "te"
          ? "Telugu (తెలుగు)"
          : language === "hi"
          ? "Hindi (हिन्दी)"
          : "English"
      }.

CRITICAL: NEVER give generic boilerplate answers. You MUST cite the user's REAL bill figures below in your reply.

User's Real Audited Bill Context:
- Consumer Name: ${consumerName}
- Service Number: ${serviceNumber}
- DISCOM: ${discom}
- Units Consumed: ${units} kWh
- Billed Statement Amount: ₹${actual}
- APERC Approved Expected Amount: ₹${expected}
- Detected Variance: ${diff >= 0 ? "+" : ""}₹${diff}
- Highest Tariff Slab Applied: ${tariffSlab}
- Audit Status: ${status}
- Complaint Grievance Eligibility: ${isEligibleForComplaint ? "Grievance inquiry may be submitted to DISCOM customer care or CGRF" : "Statement is tariff compliant"}

Instructions for specific user questions:
1. If user asks "Why am I overcharged?" or "Why is my bill higher?":
   Explain using the ₹${diff} variance and note that ${units} units pushed consumption into the ${tariffSlab} tier, plus explain that ₹${diff} is not accounted for by published APERC retail tariff rates.
2. If user asks "Can I challenge this bill?" or "Can I file complaint?":
   ${isEligibleForComplaint ? `State that because actual billed statement ₹${actual} exceeds expected calculation ₹${expected} by ₹${diff}, they may submit a formal billing inquiry to ${discom} customer care or local CGRF for meter reading and billing ledger verification under APERC regulations.` : `State that their bill matches APERC schedules (₹${expected}), so no grievance submission is indicated.`}
3. If user asks "How can I reduce next month's bill?" or "How can I reduce bill?":
   Use current ${units} units. Calculate that reducing consumption by ${Math.max(0, units - 225)} units brings them below the 225-unit threshold, saving approximately ₹${Math.round(Math.max(0, units - 225) * 8.75)} per month on slab energy costs.
4. If user asks "What tariff slab am I in?":
   List official APERC LT-I Domestic telescopic slabs: 0–30 units: ₹1.90, 31–75: ₹3.00, 76–125: ₹4.50, 126–225: ₹6.00, 226–400: ₹8.75, 401+: ₹9.75, and state their highest tier is ${tariffSlab}.
5. If user asks "Explain this audit result.":
   Summarize: ${consumerName}'s usage of ${units} units in ${discom} was audited. Expected: ₹${expected}, Actual: ₹${actual}, Variance: ${diff >= 0 ? "+" : ""}₹${diff}.

User Question: "${message}"

Keep response direct, authoritative, and under 120 words. No AI fluff. Do not make unsupported claims of government certification, automatic disconnection stay, or guaranteed 15-day resolution.
`;

      try {
        const rawText = await callGemini([{ parts: [{ text: promptText }] }]);
        return NextResponse.json({ success: true, reply: rawText.trim(), source: "gemini" });
      } catch (err) {
        console.warn("Gemini chatbot fallback triggered:", err);

        const queryLower = (message || "").toLowerCase();
        let fallbackReply = "";

        if (language === "te") {
          if (queryLower.includes("overcharge") || queryLower.includes("high") || queryLower.includes("ఎక్కువ") || queryLower.includes("అదనపు")) {
            fallbackReply = `మీ బిల్లు ₹${actual} గా రావడంలో ₹${diff} వ్యత్యాసం ఉంది. మీ వినియోగం (${units} యూనిట్లు) ${tariffSlab} పరిధిలోకి ప్రవేశించింది. APERC టారిఫ్ లెక్కల ప్రకారం రావాల్సిన మొత్తం ₹${expected}.`;
          } else if (queryLower.includes("challenge") || queryLower.includes("complaint") || queryLower.includes("ఫిర్యాదు")) {
            fallbackReply = isEligibleForComplaint
              ? `అవును, మీ బిల్లులో ₹${diff} వ్యత్యాసం ఉన్నందున మీరు ${discom} కస్టమర్ కేర్ లేదా స్థానిక CGRF వద్ద మీ మీటర్ రీడింగ్ మరియు బిల్లింగ్ లెడ్జర్ సమీక్ష కోసం దరఖాస్తు చేసుకోవచ్చు.`
              : `మీ బిల్లు అధికారిక టారిఫ్‌కు అనుగుణంగా ఉంది, కాబట్టి ప్రస్తుతం ఫిర్యాదు అవసరం లేదు.`;
          } else if (queryLower.includes("reduce") || queryLower.includes("తగ్గించ")) {
            const unitsToDrop = Math.max(0, units - 225);
            fallbackReply = `మీ ప్రస్తుత వినియోగం ${units} యూనిట్లు. మీరు ${unitsToDrop} యూనిట్లు తగ్గించుకుంటే 225 యూనిట్ల లోపు స్లాబ్‌లో ఉండి, నెలకు సుమారు ₹${Math.round(unitsToDrop * 8.75)} ఆదా చేసుకోవచ్చు.`;
          } else if (queryLower.includes("slab") || queryLower.includes("స్లాబ్")) {
            fallbackReply = `మీ ప్రస్తుత గరిష్ట స్లాబ్: ${tariffSlab}. అధికారిక APERC గృహ స్లాబ్‌లు: 0–30: ₹1.90, 31–75: ₹3.00, 76–125: ₹4.50, 126–225: ₹6.00, 226–400: ₹8.75, 401+: ₹9.75.`;
          } else {
            fallbackReply = `${consumerName} గారి బిల్లు ఆడిట్ విశ్లేషణ: ${units} యూనిట్లకు APERC ఆమోదించిన మొత్తం ₹${expected}. వాస్తవ బిల్లు ₹${actual}. గుర్తించిన వ్యత్యాసం: ₹${diff}.`;
          }
        } else if (language === "hi") {
          if (queryLower.includes("overcharge") || queryLower.includes("high") || queryLower.includes("ज्यादा") || queryLower.includes("अधिक")) {
            fallbackReply = `आपके बिल ₹${actual} में ₹${diff} का अंतर पाया गया है। आपकी खपत (${units} यूनिट) उच्च स्लैब (${tariffSlab}) में है। APERC गणना के अनुसार अपेक्षित राशि ₹${expected} है।`;
          } else if (queryLower.includes("challenge") || queryLower.includes("complaint") || queryLower.includes("शिकायत")) {
            fallbackReply = isEligibleForComplaint
              ? `हाँ, ₹${diff} के अंतर के सत्यापन हेतु आप ${discom} ग्राहक सेवा या स्थानीय CGRF में मीटर रीडिंग और लेजर समीक्षा के लिए आवेदन कर सकते हैं।`
              : `आपका बिल आधिकारिक APERC टैरिफ के अनुरूप है, इसलिए शिकायत की आवश्यकता नहीं है।`;
          } else if (queryLower.includes("reduce") || queryLower.includes("कम")) {
            const unitsToDrop = Math.max(0, units - 225);
            fallbackReply = `आपकी खपत ${units} यूनिट है। यदि आप ${unitsToDrop} यूनिट कम करते हैं, तो आप 225 यूनिट सीमा के भीतर रहकर लगभग ₹${Math.round(unitsToDrop * 8.75)} की बचत कर सकेंगे।`;
          } else if (queryLower.includes("slab") || queryLower.includes("स्लैब")) {
            fallbackReply = `आपका उच्चतम लागू स्लैब ${tariffSlab} है। आधिकारिक APERC घरेलू स्लैब: 0-30: ₹1.90, 31-75: ₹3.00, 76-125: ₹4.50, 126-225: ₹6.00, 226-400: ₹8.75, 401+: ₹9.75 प्रति यूनिट।`;
          } else {
            fallbackReply = `${consumerName} का ऑडिट सारांश: ${units} यूनिट के लिए अपेक्षित बिल ₹${expected} है, जबकि वास्तविक बिल ₹${actual} है। अंतर: ₹${diff}।`;
          }
        } else {
          // English
          if (queryLower.includes("overcharge") || queryLower.includes("high") || queryLower.includes("higher")) {
            fallbackReply = `Your actual bill of ₹${actual} is ₹${diff} higher than expected. Consuming ${units} units reached the ${tariffSlab} tier. The ₹${diff} variance is not accounted for by published APERC retail tariff schedules.`;
          } else if (queryLower.includes("challenge") || queryLower.includes("complaint") || queryLower.includes("dispute")) {
            fallbackReply = isEligibleForComplaint
              ? `Yes, you may submit a formal billing inquiry to ${discom} customer care or local CGRF regarding the ₹${diff} variance to verify your meter readings and billing ledger.`
              : `Your statement of ₹${actual} conforms to published APERC tariff rates (₹${expected}). No grievance submission is indicated.`;
          } else if (queryLower.includes("reduce") || queryLower.includes("save")) {
            const unitsToDrop = Math.max(0, units - 225);
            fallbackReply = `Your current consumption is ${units} units. Reducing consumption by ${unitsToDrop} units keeps you within the 225-unit ceiling, saving approximately ₹${Math.round(unitsToDrop * 8.75)} per month on energy charges.`;
          } else if (queryLower.includes("slab") || queryLower.includes("tier")) {
            fallbackReply = `Your consumption reached ${tariffSlab}. APERC Domestic telescopic schedule: 0–30 units @ ₹1.90, 31–75 @ ₹3.00, 76–125 @ ₹4.50, 126–225 @ ₹6.00, 226–400 @ ₹8.75, 401+ @ ₹9.75.`;
          } else {
            fallbackReply = `Audit for ${consumerName} (${serviceNumber}): Consumed ${units} units in ${discom}. Expected calculation: ₹${expected}. Actual billed statement: ₹${actual}. Variance: ₹${diff}. Status: ${status}.`;
          }
        }

        return NextResponse.json({ success: true, reply: fallbackReply, source: "fallback" });
      }
    }

    return NextResponse.json({ error: "Invalid mode" }, { status: 400 });
  } catch (err: unknown) {
    const error = err instanceof Error ? err : new Error(String(err));
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
