let appPassword = '';
let chatHistory = [];

// --- SÉLECTEURS DOM ---
const loginScreen = document.getElementById('login-screen');
const chatScreen = document.getElementById('chat-screen');
const loginBtn = document.getElementById('login-btn');
const passInput = document.getElementById('password-input');
const loginError = document.getElementById('login-error');
const chatBox = document.getElementById('chat-box');
const msgInput = document.getElementById('message-input');
const sendBtn = document.getElementById('send-btn');
const statusDisplay = document.getElementById('status-display');
const logoutBtn = document.getElementById('logout-btn');

// --- 1. SYSTÈME D'AUTHENTIFICATION ---
loginBtn.addEventListener('click', async () => {
    const pass = passInput.value.trim();
    if (!pass) return;

    loginBtn.innerHTML = 'VÉRIFICATION...';
    loginBtn.disabled = true;
    loginError.style.display = 'none';

    try {
        // On vérifie le mot de passe via une action "login" silencieuse
        const response = await fetch('/.netlify/functions/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ password: pass, action: 'login' })
        });

        if (response.ok) {
            appPassword = pass;
            loginScreen.style.display = 'none';
            chatScreen.style.display = 'flex';
            msgInput.focus();
        } else {
            loginError.innerText = "ACCÈS REFUSÉ : MOT DE PASSE INCORRECT";
            loginError.style.display = 'block';
            passInput.value = '';
        }
    } catch (e) {
        loginError.innerText = "ERREUR DE CONNEXION AU SERVEUR";
        loginError.style.display = 'block';
    } finally {
        loginBtn.innerHTML = 'ENTRER dans le système →';
        loginBtn.disabled = false;
    }
});

// --- 2. GESTION DU RENDU (MARKDOWN + BOUTON COPIER) ---
function renderContent(text, containerElement, isAI = false) {
    if (isAI) {
        // Utilisation de la bibliothèque marked.js pour transformer le markdown en HTML
        containerElement.innerHTML = marked.parse(text);

        // Ajout des boutons "Copier" sur chaque bloc de code <pre>
        const codeBlocks = containerElement.querySelectorAll('pre');
        codeBlocks.forEach((pre) => {
            // Empêcher les doublons de boutons si updateLogEntry est appelé plusieurs fois
            if (pre.querySelector('.copy-btn')) return;

            const btn = document.createElement('button');
            btn.className = 'copy-btn';
            btn.innerText = 'COPIER LE CODE';

            btn.addEventListener('click', () => {
                const codeText = pre.querySelector('code').innerText;
                navigator.clipboard.writeText(codeText).then(() => {
                    btn.innerText = 'COPIÉ !';
                    btn.style.background = '#00ff6a';
                    btn.style.color = '#000';
                    setTimeout(() => {
                        btn.innerText = 'COPIER LE CODE';
                        btn.style.background = 'var(--ink)';
                        btn.style.color = 'var(--bg-paper)';
                    }, 2000);
                });
            });
            pre.appendChild(btn);
        });
    } else {
        // Pour l'utilisateur, on affiche le texte brut pour éviter les injections XSS
        containerElement.innerText = text;
    }
}

// --- 3. LOGIQUE DE CHAT ---
async function sendMessage() {
    const text = msgInput.value.trim();
    if (!text || sendBtn.disabled) return;

    // UI: Message Utilisateur
    addLogEntry(text, 'user');
    chatHistory.push({ role: 'user', content: text });
    msgInput.value = '';
    
    // UI: État d'attente
    sendBtn.disabled = true;
    statusDisplay.innerHTML = 'STATUT: <span class="accent-text">RÉFLEXION...</span>';
    const loadingId = addLogEntry('GÉNÉRATION EN COURS...', 'ai');

    try {
        const response = await fetch('/.netlify/functions/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                password: appPassword, 
                messages: chatHistory, 
                action: 'chat' 
            })
        });

        const data = await response.json();

        if (response.ok) {
            updateLogEntry(loadingId, data.reply);
            chatHistory.push({ role: 'assistant', content: data.reply });
        } else {
            // Gestion des erreurs (Timeout Netlify ou erreur OpenRouter)
            let errorMsg = data.error || "Problème de communication avec l'IA.";
            if (response.status === 500 && errorMsg.includes('Timeout')) {
                errorMsg = "TIMEOUT : L'IA met trop de temps à répondre. Essayez un modèle plus rapide (Gemini Flash).";
            }
            updateLogEntry(loadingId, "ERREUR IA : " + errorMsg);
        }
    } catch (e) {
        updateLogEntry(loadingId, "ERREUR DE LIAISON SATELLITE (Vérifiez votre connexion).");
    } finally {
        sendBtn.disabled = false;
        statusDisplay.innerHTML = 'STATUT: <span class="accent-text">EN LIGNE</span>';
        chatBox.scrollTop = chatBox.scrollHeight;
    }
}

// --- 4. HELPERS UI ---
function addLogEntry(text, type) {
    const id = 'log-' + Date.now();
    const div = document.createElement('div');
    div.id = id;
    div.className = `log-entry ${type}`;
    
    renderContent(text, div, type === 'ai');
    
    chatBox.appendChild(div);
    chatBox.scrollTop = chatBox.scrollHeight;
    return id;
}

function updateLogEntry(id, text) {
    const el = document.getElementById(id);
    if (el) {
        renderContent(text, el, true);
        chatBox.scrollTop = chatBox.scrollHeight;
    }
}

// --- 5. ÉVÉNEMENTS ---
sendBtn.addEventListener('click', sendMessage);

msgInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
    }
});

logoutBtn.addEventListener('click', () => {
    if(confirm("Voulez-vous fermer la session ?")) {
        location.reload();
    }
});

// Auto-focus mot de passe au chargement
window.onload = () => passInput.focus();
