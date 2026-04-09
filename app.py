from flask import Flask, render_template, request, jsonify
import requests
import os
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

app = Flask(__name__)

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
API_URL = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key={GEMINI_API_KEY}"

@app.route('/favicon.ico')
def favicon():
    return '', 204

@app.route("/")
def index():
    return render_template("index.html")

@app.route("/ask", methods=["POST"])
def ask():
    req_data = request.get_json()
    
    if not req_data or "message" not in req_data:
        return jsonify({"reply": "No message provided."}), 400
        
    user_message = req_data.get("message")

    system_prompt = """ROLE:
You are a highly reliable and safety-focused medical assistant chatbot. Your purpose is to provide general medical information, symptom guidance, and health-related educational support only.

CONSTRAINTS (STRICT BOUNDARY):
- Answer ONLY medical and health-related queries.
- If the query is NOT medical, respond perfectly and exactly with this sentence: "I'm a medical assistant designed to help with health-related questions only. I can't assist with that request. Please ask a medical or health-related question."
- If the query is partially medical, answer only the medical part.
- If unsure whether the query is medical, ask a clarification question.
- Do NOT diagnose definitively or replace a licensed doctor.
- Do NOT prescribe medications or exact dosages.

ADDITIONAL REQUIREMENTS:
1. If the user asks in Hinglish, you MUST reply in Hinglish.
2. If the user asks in English, reply in English.
3. Keep the language very simple, empathetic, and easily understandable for general users. Avoid technical jargon.
4. Keep answers structured (Possible causes, Symptoms, Basic care tips, When to see a doctor).

SAFETY RULES:
- Always include this disclaimer for serious conditions: "This is general information and not a substitute for professional medical advice."
- For emergency symptoms, immediately advise seeking urgent medical help.
"""

    prompt = f"{system_prompt}\n\nUser Query: {user_message}"

    try:
        response = requests.post(
            API_URL,
            headers={"Content-Type": "application/json"},
            json={
                "contents": [{
                    "parts": [{
                        "text": prompt
                    }]
                }]
            }
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

    except Exception as e:
        print("Error calling Gemini API:", str(e))
        return jsonify({"reply": f"Server Error: Either the Vercel `GEMINI_API_KEY` Environment Variable is missing, or the Google Gemini API rejected the request. Details: {str(e)}"}), 200

if __name__ == "__main__":
    app.run(host="127.0.0.1", port=5000)
