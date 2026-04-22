from flask import Flask, render_template, request, jsonify
import requests
import os
import logging
from dotenv import load_dotenv
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry

# Configure structured enterprise logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# Load environment variables from .env file
load_dotenv()

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")

# Fail-Fast Boot Validation: Do not start if API key is missing
if not GEMINI_API_KEY:
    logger.critical("CRITICAL ERROR: GEMINI_API_KEY is not set in the environment.")
    raise RuntimeError("Missing GEMINI_API_KEY")

API_URL = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key={GEMINI_API_KEY}"

# Auto-Healing Session Manager
def get_retry_session(retries=3, backoff_factor=1.0):
    session = requests.Session()
    retry = Retry(
        total=retries,
        read=retries,
        connect=retries,
        backoff_factor=backoff_factor,
        status_forcelist=(429, 500, 502, 503, 504),
    )
    adapter = HTTPAdapter(max_retries=retry)
    session.mount('http://', adapter)
    session.mount('https://', adapter)
    return session

api_session = get_retry_session()

app = Flask(__name__)

# Security Headers & CORS
@app.after_request
def set_secure_headers(response):
    response.headers['X-Content-Type-Options'] = 'nosniff'
    response.headers['X-Frame-Options'] = 'DENY'
    response.headers['Access-Control-Allow-Origin'] = '*'
    return response

# Global Error Sinkhole
@app.errorhandler(Exception)
def handle_global_error(e):
    logger.error(f"Unhandled Exception: {str(e)}", exc_info=True)
    return jsonify({"reply": "I'm currently experiencing heavy traffic or technical difficulties. Please try again in a moment!"}), 500

@app.route('/favicon.ico')
def favicon():
    return '', 204

@app.route("/")
def index():
    return render_template("index.html")

@app.route("/ask", methods=["POST"])
def ask():
    # Defensive Payload Validation
    if not request.is_json:
        return jsonify({"reply": "Invalid request format. Expected JSON."}), 400
        
    req_data = request.get_json()
    if not req_data or "message" not in req_data:
        return jsonify({"reply": "No message provided."}), 400
        
    user_message = req_data.get("message")

    system_prompt = """You are an advanced AI Medical Assistant (MediSage) designed to compassionately interact with users, understand their health concerns, and provide clear, accurate, and safe general health guidance.

STRICT ROLE & LIMITATIONS:
* You are NOT a licensed doctor. You DO NOT provide final diagnoses or prescribe medications.
* You act as a clinical triage and informative guide.
* ALWAYS advise the user to consult a healthcare professional for a medical diagnosis or treatment.

CORE BEHAVIOR:
When the user shares symptoms or questions, provide a comprehensive but easy-to-read response including:

1. SYMPTOM ANALYSIS: Acknowledge their symptoms compassionately and provide accurate general information.
2. POSSIBLE CAUSES: List a few potential conditions or reasons for these symptoms using probability language (e.g., "This could be related to...").
3. RECOMMENDATIONS: Give general advice on what a medical professional might recommend for temporary relief, and mention what signs mean they should see a doctor.
4. FOLLOW-UP QUESTIONS: Always end your response by asking 1 or 2 clarifying questions to narrow down the user's specific situation.

FORMAT:
Use clear headings, bullet points, and bold text as necessary to make your response highly readable and structured like a real medical consultation.

TRIAGE & URGENCY DETECTION (CRITICAL):
If RED FLAG symptoms are detected (Chest pain, Difficulty breathing, Severe bleeding, Stroke symptoms), respond IMMEDIATELY: "⚠️ This may be a medical emergency. Please seek immediate medical attention or go to the nearest hospital."
"""

    history = req_data.get("history", [])
    if not isinstance(history, list):
        history = []

    contents = []
    
    # Reconstruct conversation history for Gemini
    if not history:
        contents.append({
            "role": "user",
            "parts": [{"text": f"SYSTEM INSTRUCTIONS:\n{system_prompt}\n\nUSER:\n{user_message}"}]
        })
    else:
        first_user = True
        for msg in history:
            role = "user" if msg.get("role") == "user" else "model"
            text = msg.get("content", "")
            if first_user and role == "user":
                text = f"SYSTEM INSTRUCTIONS:\n{system_prompt}\n\nUSER:\n{text}"
                first_user = False
            contents.append({
                "role": role,
                "parts": [{"text": text}]
            })
        
        # Add the current message
        contents.append({
            "role": "user",
            "parts": [{"text": user_message}]
        })

    try:
        # Use our auto-healing session and strict timeouts
        response = api_session.post(
            API_URL,
            headers={"Content-Type": "application/json"},
            json={"contents": contents},
            timeout=15  # Vercel serverless timeout limit protection
        )
        response.raise_for_status()
        data = response.json()
        
        if "candidates" in data and len(data["candidates"]) > 0:
            ai_reply = data["candidates"][0]["content"]["parts"][0]["text"]
            
            disclaimer = "This is general information and not a substitute for professional medical advice."
            if disclaimer not in ai_reply and "I'm a medical assistant designed to help" not in ai_reply:
                ai_reply = f"{ai_reply}\n\n**Disclaimer:** {disclaimer}"
                
            return jsonify({"reply": ai_reply})
        else:
            return jsonify({"reply": "I'm sorry, I couldn't process your request at this moment. Please try again."})

    except requests.exceptions.Timeout:
        logger.warning("Gemini API Timeout during /ask")
        return jsonify({"reply": "The AI is taking too long to respond. Please try again."}), 200
    except requests.exceptions.RequestException as e:
        logger.error(f"Gemini API Error in /ask: {e}")
        return jsonify({"reply": "I am experiencing network issues communicating with the AI service. Please try again."}), 200

@app.route("/suggest", methods=["POST"])
def suggest():
    """Generate 3-4 contextual quick-reply suggestions based on conversation so far."""
    if not request.is_json:
        return jsonify({"suggestions": []}), 400
        
    req_data = request.get_json()
    if not req_data:
        return jsonify({"suggestions": []})

    history = req_data.get("history", [])
    if not isinstance(history, list):
        history = []
        
    last_ai = req_data.get("last_ai_message", "")

    suggest_prompt = f"""You are a suggestion engine for a medical chatbot conversation.

The AI just said:
\"\"\"{last_ai}\"\"\"

Based on the conversation context and the AI's last message, generate exactly 4 short, natural patient responses or follow-up questions that a user might realistically say or ask next. These should help the patient quickly answer the AI's questions, provide relevant info, or ask natural follow-up questions about their condition.

Rules:
- Each suggestion must be under 10 words
- Make them feel like real patient replies or questions, not clinical
- Cover different possible scenarios (e.g. answering questions, or asking "Is this serious?", "What should I do?")
- Do NOT number them
- Return ONLY a JSON array of 4 strings, nothing else
- Example format: ["Since yesterday", "It's a sharp pain", "Is this dangerous?", "Should I see a doctor?"]

Return only the JSON array."""

    contents = [{"role": "user", "parts": [{"text": suggest_prompt}]}]

    try:
        response = api_session.post(
            API_URL,
            headers={"Content-Type": "application/json"},
            json={"contents": contents},
            timeout=10 # Faster timeout for suggestions
        )
        response.raise_for_status()
        data = response.json()
        raw = data["candidates"][0]["content"]["parts"][0]["text"].strip()
        # Strip markdown fences if present
        raw = raw.replace("```json", "").replace("```", "").strip()
        import json
        suggestions = json.loads(raw)
        if isinstance(suggestions, list):
            return jsonify({"suggestions": suggestions[:4]})
        return jsonify({"suggestions": []})
    except Exception as e:
        logger.warning(f"Suggest error silently caught: {e}")
        return jsonify({"suggestions": []})


if __name__ == "__main__":
    app.run(host="127.0.0.1", port=5001, debug=True)
