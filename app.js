let appPassword = '';
let chatHistory = [];

const loginScreen = document.getElementById('login-screen');
const chatScreen = document.getElementById('chat-screen');
const loginBtn = document.getElementById('login-btn');
const passInput = document.getElementById('password-input');
const chatBox = document.getElementById('chat-box');
const msgInput = document.getElementById('message-input');
const sendBtn = document.getElementById('send-btn');
const statusDisplay = document.getElementById('status-display');

// AUTHENTIFICATION
loginBtn.addEventListener('click', () => {
    appPassword = passInput.value;
    if (appPassword) {
        // En mode réel, on vérifiera via la fonction Netlify
        loginScreen.style.display = 'none';
        chatScreen.style.display = 'flex';
    }
});

// ENVOI
sendBtn.addEventListener('click', sendMessage);
msgInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
    }
});

async function sendMessage() {
    const text = msgInput.value.trim();
    if (!text) return;

    addLogEntry(text, 'user');
    chatHistory.push({ role: 'user', content: text });
    msgInput.value = '';
    
    sendBtn.disabled = true;
    statusDisplay.innerHTML = 'STATUT: <span class="accent-text">RÉFLEXION...</span>';
    const loadingId = addLogEntry('GÉNÉRATION EN COURS...', 'ai');

    try {
        const response = await fetch('/.netlify/functions/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ password: appPassword, messages: chatHistory })
        });

        const data = await response.json();

        if (response.ok) {
            updateLogEntry(loadingId, data.reply);
            chatHistory.push({ role: 'assistant', content: data.reply });
        } else {
            updateLogEntry(loadingId, "ERREUR SYSTÈME: ACCÈS REFUSÉ.");
            if(response.status === 401) setTimeout(() => location.reload(), 2000);
        }
    } catch (e) {
        updateLogEntry(loadingId, "ERREUR DE LIAISON SATELLITE.");
    } finally {
        sendBtn.disabled = false;
        statusDisplay.innerHTML = 'STATUT: <span class="accent-text">EN LIGNE</span>';
        chatBox.scrollTop = chatBox.scrollHeight;
    }
}

function addLogEntry(text, type) {
    const id = 'log-' + Date.now();
    const div = document.createElement('div');
    div.id = id;
    div.className = `log-entry ${type}`;
    div.innerText = text;
    chatBox.appendChild(div);
    chatBox.scrollTop = chatBox.scrollHeight;
    return id;
}

function updateLogEntry(id, text) {
    const el = document.getElementById(id);
    if (el) el.innerText = text;
}

document.getElementById('logout-btn').addEventListener('click', () => location.reload());