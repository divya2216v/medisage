const chatContainer = document.getElementById('chat-container');
const userInput = document.getElementById('user-input');
const sendBtn = document.getElementById('send-btn');

function addMessage(text, sender) {
    const messageDiv = document.createElement('div');
    messageDiv.classList.add('message', sender);

    if (sender === 'ai') {
        messageDiv.innerHTML = formatAIResponse(text);
    } else {
        messageDiv.textContent = text;
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
    const typingDiv = document.getElementById('typing-indicator');
    if (typingDiv) {
        typingDiv.remove();
    }
}

function scrollToBottom() {
    chatContainer.scrollTop = chatContainer.scrollHeight;
}

function formatAIResponse(text) {
    // Basic formatting for Markdown-like structure returned by Gemini

    // Escape basic HTML to avoid injection, except we want to allow newlines and lists
    let html = text
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");

    // Bold text (**text**)
    html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');

    // Italic text (*text*)
    html = html.replace(/(?<!\*)\*(?!\*)(.*?)(?<!\*)\*(?!\*)/g, '<i>$1</i>');

    // Convert lines starting with * or - followed by a space to <li> items
    const lines = html.split('\n');
    let processedHtml = '';
    let inList = false;

    for (let line of lines) {
        const listMatch = line.match(/^[\*\-]\s+(.*)/);
        if (listMatch) {
            if (!inList) {
                processedHtml += '<ul>';
                inList = true;
            }
            processedHtml += `<li>${listMatch[1]}</li>`;
        } else {
            if (inList) {
                processedHtml += '</ul>';
                inList = false;
            }
            if (line.trim() !== '') {
                processedHtml += line + '<br>';
            } else {
                processedHtml += '<br>';
            }
        }
    }

    if (inList) {
        processedHtml += '</ul>';
    }

    // Clean up excessive <br>
    processedHtml = processedHtml.replace(/(<br>){3,}/g, '<br><br>');
    if (processedHtml.startsWith('<br>')) processedHtml = processedHtml.substring(4);

    return processedHtml;
}

async function fetchAIResponse(userText) {
    try {
        const response = await fetch("/ask", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                message: userText
            })
        });

        // Try to parse the response regardless of status, as our backend sends JSON on 500 errors too
        let data;
        try {
            data = await response.json();
        } catch (e) {
            console.error('Failed to parse JSON response:', e);
        }

        if (!response.ok) {
            if (data && data.reply) {
                return data.reply; // Return the specific error from the backend (e.g., API key missing)
            }
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        if (data && data.reply) {
            return data.reply;
        } else {
            return "I'm sorry, I couldn't process your request at this moment. Please try again.";
        }
    } catch (error) {
        console.error('Error fetching from backend API:', error);
        return "An error occurred while connecting to the medical assistant. Please ensure the backend is running.";
    }
}

sendBtn.addEventListener('click', async () => {
    const text = userInput.value.trim();
    if (!text) return;

    // Add user message to UI
    addMessage(text, 'user');
    userInput.value = '';

    // Show typing indicator
    showTyping();

    // Fetch response from Flask backend
    let aiResponse = await fetchAIResponse(text);

    // Remove typing indicator and show AI response
    removeTyping();
    addMessage(aiResponse, 'ai');
});

// Allow sending message with Enter key
userInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        sendBtn.click();
    }
});
