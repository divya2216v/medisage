const landingView = document.getElementById('landing-view');
const appLayout = document.getElementById('app-layout');
const chatContainer = document.getElementById('chat-container');
const userInput = document.getElementById('user-input');
const sendBtn = document.getElementById('send-btn');
let chatHistory = [];

function startConsultation() {
    landingView.classList.add('hidden');
    appLayout.classList.remove('hidden');
    // Initialize suggestions if not already done
    if (chatHistory.length === 0 && !document.getElementById('suggestions-container')) {
        showSuggestions([
            "I have a headache since morning",
            "Mujhe bukhar aur body pain hai",
            "My stomach has been hurting",
            "I feel very tired and weak"
        ]);
    }
}

function backToHome() {
    appLayout.classList.add('hidden');
    landingView.classList.remove('hidden');
}

function startNewChat() {
    // Clear history
    chatHistory = [];
    // Reset chat container to initial state
    chatContainer.innerHTML = `
        <div class="message ai">
            <div class="avatar">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="M9 12h6M12 9v6"/></svg>
            </div>
            <div class="bubble">
                Hello! I am MediSage, your smart health companion. Please describe your symptoms, and I'll do my best to provide general health guidance.
            </div>
        </div>
    `;
    clearSuggestions();
    showSuggestions([
        "I have a headache since morning",
        "Mujhe bukhar aur body pain hai",
        "My stomach has been hurting",
        "I feel very tired and weak"
    ]);
}

function addMessage(text, sender) {
    const messageDiv = document.createElement('div');
    messageDiv.classList.add('message', sender);
    
    if (sender === 'ai') {
        messageDiv.innerHTML = `
            <div class="avatar">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="M9 12h6M12 9v6"/></svg>
            </div>
            <div class="bubble">${formatAIResponse(text)}</div>
        `;
    } else {
        messageDiv.innerHTML = `<div class="bubble">${text}</div>`;
    }
    
    chatContainer.appendChild(messageDiv);
    scrollToBottom();
}

function showTyping() {
    const typingDiv = document.createElement('div');
    typingDiv.classList.add('typing-indicator');
    typingDiv.id = 'typing-indicator';
    typingDiv.innerHTML = '<div class="typing-dot"></div><div class="typing-dot"></div><div class="typing-dot"></div>';
    chatContainer.appendChild(typingDiv);
    scrollToBottom();
}

function removeTyping() {
    const el = document.getElementById('typing-indicator');
    if (el) el.remove();
}

function scrollToBottom() {
    chatContainer.scrollTop = chatContainer.scrollHeight;
}

function clearSuggestions() {
    const existing = document.getElementById('suggestions-container');
    if (existing) existing.remove();
}

function showSuggestions(suggestions) {
    clearSuggestions();
    if (!suggestions || suggestions.length === 0) return;

    const inputArea = document.querySelector('.chat-input-area');
    
    const container = document.createElement('div');
    container.id = 'suggestions-container';
    container.classList.add('suggestions-container');

    const label = document.createElement('span');
    label.classList.add('suggestions-label');
    label.textContent = 'Quick replies:';
    container.appendChild(label);

    const chipsRow = document.createElement('div');
    chipsRow.classList.add('suggestions-chips');

    suggestions.forEach(text => {
        const chip = document.createElement('button');
        chip.classList.add('suggestion-chip');
        chip.textContent = text;
        chip.addEventListener('click', () => {
            userInput.value = text;
            clearSuggestions();
            sendBtn.click();
        });
        chipsRow.appendChild(chip);
    });

    container.appendChild(chipsRow);
    // Insert just before the input wrapper
    const inputWrapper = document.querySelector('.input-wrapper');
    inputArea.insertBefore(container, inputWrapper);
    scrollToBottom();
}

async function fetchSuggestions(lastAiMessage) {
    try {
        const res = await fetch('/suggest', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ history: chatHistory, last_ai_message: lastAiMessage })
        });
        const data = await res.json();
        return data.suggestions || [];
    } catch (e) {
        console.error('Suggestion fetch error:', e);
        return [];
    }
}

function formatAIResponse(text) {
    let html = text
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");

    html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    html = html.replace(/(?<!\*)\*(?!\*)(.*?)(?<!\*)\*(?!\*)/g, '<i>$1</i>');

    const lines = html.split('\n');
    let processedHtml = '';
    let inList = false;

    for (let line of lines) {
        const listMatch = line.match(/^[\*\-]\s+(.*)/);
        if (listMatch) {
            if (!inList) { processedHtml += '<ul>'; inList = true; }
            processedHtml += `<li>${listMatch[1]}</li>`;
        } else {
            if (inList) { processedHtml += '</ul>'; inList = false; }
            processedHtml += line.trim() !== '' ? line + '<br>' : '<br>';
        }
    }
    if (inList) processedHtml += '</ul>';
    processedHtml = processedHtml.replace(/(<br>){3,}/g, '<br><br>');
    if (processedHtml.startsWith('<br>')) processedHtml = processedHtml.substring(4);
    return processedHtml;
}

async function fetchAIResponse(userText) {
    try {
        const response = await fetch("/ask", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ message: userText, history: chatHistory })
        });

        let data;
        try { data = await response.json(); } catch (e) { console.error('JSON parse:', e); }

        if (!response.ok) {
            if (data && data.reply) return data.reply;
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        return (data && data.reply) ? data.reply : "I'm sorry, I couldn't process your request. Please try again.";
    } catch (error) {
        console.error('Fetch error:', error);
        return "An error occurred while connecting to the medical assistant. Please ensure the backend is running.";
    }
}

sendBtn.addEventListener('click', async () => {
    const text = userInput.value.trim();
    if (!text) return;

    clearSuggestions();
    addMessage(text, 'user');
    userInput.value = '';
    sendBtn.disabled = true;

    showTyping();
    let aiResponse = await fetchAIResponse(text);

    chatHistory.push({ role: "user", content: text });
    const isError = aiResponse.startsWith("I'm sorry") || aiResponse.startsWith("An error occurred");
    if (!isError) chatHistory.push({ role: "assistant", content: aiResponse });

    removeTyping();
    addMessage(aiResponse, 'ai');

    if (!isError) {
        const suggestions = await fetchSuggestions(aiResponse);
        showSuggestions(suggestions);
    }

    sendBtn.disabled = false;
});

userInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') sendBtn.click();
});
