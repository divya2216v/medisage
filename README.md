# 🩺 MediSage – Your Smart Health Companion

Welcome to **MediSage**, an advanced, AI-powered medical portal providing intelligent, structured health guidance. Designed for both accuracy and accessibility, MediSage leverages Google's cutting-edge Gemini Engine to triage symptoms, recommend over-the-counter interventions, and seamlessly advise users on when to seek professional medical help. 

With a classical, deeply reassuring "old-school medical portal" aesthetic, it bridges the gap between state-of-the-art AI infrastructure and human-centric, trustworthy design.

---

## 🌟 Key Features

### 🧠 Intelligent Symptom Analysis (Powered by Gemini API)
MediSage doesn't just return generic text; it structures its cognitive output to be easily digestible for the end user. When a user inputs their symptoms, MediSage algorithmically categorizes the response into:
- **Possible Condition**: The most likely ailments aligning with the symptoms.
- **Causes**: Biological or environmental triggers.
- **Severity Level**: clearly marked as *Mild, Moderate, or Severe*.
- **Suggested OTC Medicines**: Relevant over-the-counter remedies.
- **Dosage Instructions**: General guidelines for taking suggested medicines safely.
- **Possible Side Effects**: Awareness regarding the suggested remedies.
- **Precautions & Prevention**: Long-term care and proactive steps.
- **Doctor Consultation Advice**: Explicit markers on *when* to escalate to professional medical care.

### 🌍 Multilingual NLP Support
Health emergencies don't just happen in English. MediSage uses advanced natural language processing to natively understand and reply in:
- **English**
- **Hindi**
- **Hinglish** (e.g., *"Mujhe kal se fever aur body pain hai"*)

### 🛡️ Iron-Clad Safety Architecture
Medical AI requires rigorous safety bounds. MediSage features a two-tiered safety system:
1. **Persistent UI Disclaimer**: A globally visible notice banner that grounds user expectations.
2. **Backend Payload Enforcement**: The Python backend *hijacks and intercepts* the Gemini output. If the AI happens to omit the medical liability disclaimer, the backend forces it into the response before delivering it to the user.

### 🎨 Trustworthy, "Old-School Medical" UI
No sterile corporate whites or chaotic modern layouts here. MediSage purposefully invokes nostalgia and trust through:
- **Warm, Academic Palette**: Charcoal greens (`#2f4f4f`), warm cream backgrounds (`#f5f1e8`), and natural green accents (`#6b8e23`).
- **Typography**: Classic serif formatting (`Georgia`) simulating a medical journal.
- **Responsive Layout**: Fluidly scales from wide Desktop views to narrow Mobile phone screens without losing its charm.
- **Micro-Animations**: Human-like typing indicator bubbles to establish a "bedside manner".

---

## 🛠️ Technology Stack Breakdown

MediSage boasts a clean, decoupled architecture built for pure performance without the bloat of heavy frontend frameworks.

* **Frontend**: Pure HTML5, Vanilla JavaScript, and Native CSS3.
* **Backend Engine**: Python 3 and Flask. 
* **AI Provider**: Google Gemini (`gemini-2.5-flash`).
* **Communication Protocol**: Asynchronous Fetch UI mapping to RESTful Flask endpoints (`POST /ask`).

---

## 🚀 Getting Started & Local Development

Want to run MediSage locally? Follow these steps:

### Prerequisites
Make sure you have [Python 3.x](https://www.python.org/downloads/) installed.

### 1. Clone & Navigate to Project
```bash
git clone <repository_url>
cd medi-sage
```

### 2. Install Dependencies
Install the required packages using pip:
```bash
pip install -r requirements.txt
```

### 3. Setup Gemini API Key
Create a `.env` file in the root directory and add your Google Gemini API key:
```env
GEMINI_API_KEY=your_actual_key_here
```

### 4. Run the Server
Launch the Flask backend server:
```bash
python app.py
```
> The server will boot up and run on `http://127.0.0.1:5000`. Open this URL in your web browser.

---

## 📖 Disclaimer
*MediSage is designed to provide general health guidance and acts as a sophisticated triage and educational tool. It is **not** a diagnostic instrument and should never replace professional medical advice from a licensed physician.*
