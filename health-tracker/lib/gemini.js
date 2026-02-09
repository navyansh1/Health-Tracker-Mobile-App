/**
 * Gemini Vision helper for food/meal analysis
 * Uses Firebase AI Logic SDK (no API key needed)
 */

// Lazy-loaded model instance
let _model = null;

function getModel() {
  if (!_model) {
    // Polyfill AbortSignal.any for React Native Hermes (must apply BEFORE firebase/ai loads)
    if (typeof AbortSignal !== 'undefined' && typeof AbortSignal.any !== 'function') {
      AbortSignal.any = function (signals) {
        const controller = new AbortController();
        for (const signal of signals) {
          if (signal.aborted) {
            controller.abort(signal.reason);
            return controller.signal;
          }
          signal.addEventListener('abort', () => controller.abort(signal.reason), { once: true });
        }
        return controller.signal;
      };
    }

    const { getAI, getGenerativeModel, GoogleAIBackend } = require("firebase/ai");
    const app = require("../firebaseConfig").default;
    const ai = getAI(app, { backend: new GoogleAIBackend() });
    _model = getGenerativeModel(ai, { model: "gemini-2.5-flash" });
  }
  return _model;
}

export async function analyzeFood({ base64 }) {
  // Get current time info for smarter meal type detection
  const now = new Date();
  const hour = now.getHours();
  const timeStr = now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });

  // Suggest meal type based on time
  let suggestedMeal = "Snack";
  if (hour >= 5 && hour < 11) suggestedMeal = "Breakfast";
  else if (hour >= 11 && hour < 15) suggestedMeal = "Lunch";
  else if (hour >= 18 && hour < 22) suggestedMeal = "Dinner";

  const prompt = `Analyze this food image and extract detailed nutritional information.

CURRENT TIME: ${timeStr}
SUGGESTED MEAL TYPE: ${suggestedMeal} (based on time, but use your judgement based on the food type)

Return ONLY valid JSON in this exact format:
{"food_name":"Grilled Chicken Salad","meal_type":"Lunch","calories":350,"protein":35,"carbs":15,"fat":18,"fiber":5,"sugar":3,"sodium":450,"serving_size":"1 plate","confidence":"high"}

Rules:
- food_name: SHORT name (max 25 chars), e.g. "Butter Chicken", "Egg Fried Rice", "Caesar Salad"
- meal_type: One of: Breakfast, Lunch, Dinner, Snack. Consider the current time (${timeStr}) when deciding. If eating cereal at 9 PM, it's still "Dinner" or "Snack", not "Breakfast".
- calories: Estimated total calories as NUMBER (kcal)
- protein: Estimated protein in grams as NUMBER
- carbs: Estimated carbohydrates in grams as NUMBER
- fat: Estimated total fat in grams as NUMBER
- fiber: Estimated dietary fiber in grams as NUMBER
- sugar: Estimated sugar in grams as NUMBER
- sodium: Estimated sodium in milligrams as NUMBER
- serving_size: Estimated serving size (e.g., "1 cup", "1 plate", "2 pieces")
- confidence: "high", "medium", or "low" based on how clearly you can identify the food

If you see multiple food items on the plate, combine them into one entry with total nutritional values.
Be as accurate as possible with nutritional estimates based on typical serving sizes.

Return ONLY the JSON object, no markdown or extra text.`;

  try {
    const model = getModel();

    const imagePart = {
      inlineData: {
        data: base64,
        mimeType: "image/jpeg",
      },
    };

    const result = await model.generateContent([prompt, imagePart]);
    const response = result.response;
    const rawText = response.text();

    console.log("Gemini Response Text:", rawText);

    // Clean and parse JSON
    let cleanText = rawText
      .replace(/```json\n?/gi, "")
      .replace(/```\n?/gi, "")
      .replace(/^\s+|\s+$/g, "");

    const match = cleanText.match(/\{[\s\S]*\}/);

    if (!match) {
      console.log("No JSON found in response");
      return getDefault();
    }

    const parsed = JSON.parse(match[0]);
    console.log("Parsed:", parsed);

    // Validate and extract nutritional data
    return {
      food_name: parsed.food_name || parsed.name || parsed.dish || "Unknown Food",
      meal_type: validateMealType(parsed.meal_type),
      calories: ensureNumber(parsed.calories, 0),
      protein: ensureNumber(parsed.protein, 0),
      carbs: ensureNumber(parsed.carbs || parsed.carbohydrates, 0),
      fat: ensureNumber(parsed.fat || parsed.fats, 0),
      fiber: ensureNumber(parsed.fiber, 0),
      sugar: ensureNumber(parsed.sugar, 0),
      sodium: ensureNumber(parsed.sodium, 0),
      serving_size: parsed.serving_size || "1 serving",
      confidence: validateConfidence(parsed.confidence),
    };
  } catch (err) {
    console.log("Gemini error:", err);
    return getDefault();
  }
}

function ensureNumber(value, defaultVal = 0) {
  if (typeof value === "number" && !isNaN(value)) {
    return Math.round(value * 10) / 10;
  }
  if (typeof value === "string") {
    const num = parseFloat(value.replace(/[^0-9.]/g, ""));
    return isNaN(num) ? defaultVal : Math.round(num * 10) / 10;
  }
  return defaultVal;
}

function validateMealType(type) {
  const valid = ["Breakfast", "Lunch", "Dinner", "Snack"];
  if (!type) return "Snack";
  const normalized = type.charAt(0).toUpperCase() + type.slice(1).toLowerCase();
  return valid.includes(normalized) ? normalized : "Snack";
}

function validateConfidence(conf) {
  const valid = ["high", "medium", "low"];
  if (!conf) return "medium";
  const normalized = conf.toLowerCase();
  return valid.includes(normalized) ? normalized : "medium";
}

function getDefault() {
  return {
    food_name: "Unknown Food",
    meal_type: "Snack",
    calories: 0,
    protein: 0,
    carbs: 0,
    fat: 0,
    fiber: 0,
    sugar: 0,
    sodium: 0,
    serving_size: "1 serving",
    confidence: "low",
  };
}
