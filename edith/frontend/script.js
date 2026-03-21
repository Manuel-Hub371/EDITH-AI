/**
 * EDITH AI - Frontend Core Logic
 * Version: 39.0.0 (Electron Desktop)
 */

// Detect Electron context (preload.js exposes window.edith)
// When running via file://, all API URLs must be absolute.
const API_BASE = (window.edith || window.location.protocol === 'file:') 
    ? 'http://localhost:5000' 
    : '';

const UI = {
    form: document.getElementById('chat-form'),
    input: document.getElementById('user-input'),
    window: document.getElementById('chat-window'),
    greeting: document.getElementById('greeting-placeholder'),
    voiceBtn: document.getElementById('voice-btn'),
    fileBtn: document.getElementById('file-btn'),
    fileInput: document.getElementById('file-input'),
    newChatBtn: document.getElementById('new-chat-btn'),
    viewport: document.querySelector('.chat-viewport'),
    sidebar: document.getElementById('history-sidebar'),
    sidebarToggle: document.getElementById('sidebar-toggle'),
    closeSidebar: document.getElementById('close-sidebar'),
    sessionList: document.getElementById('session-list')
};

const API_CONFIG = {
    url: `${API_BASE}/api/chat`,
    headers: { 'Content-Type': 'application/json' }
};


const TTS = {
    synth: window.speechSynthesis,
    speak(text) {
        if (!this.synth) return;
        this.synth.cancel();
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'en-US';
        const voices = this.synth.getVoices();
        const premium = voices.find(v => v.name.includes('Google US English') || v.name.includes('Samantha'));
        if (premium) utterance.voice = premium;
        this.synth.speak(utterance);
    }
};

const STT = {
    recognition: null,
    isListening: false,
    init() {
        const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!Recognition) return null;
        const rec = new Recognition();
        rec.continuous = false;
        rec.interimResults = true;
        rec.lang = 'en-US';
        rec.onresult = (e) => UI.input.value = Array.from(e.results).map(r => r[0].transcript).join('');
        rec.onend = () => {
            if (this.isListening) {
                this.stop();
                if (UI.input.value.trim()) UI.form.dispatchEvent(new Event('submit'));
            }
        };
        this.recognition = rec;
        return rec;
    },
    start() {
        if (!this.recognition && !this.init()) return;
        this.isListening = true;
        UI.voiceBtn.classList.add('listening');
        this.recognition.start();
    },
    stop() {
        this.isListening = false;
        UI.voiceBtn.classList.remove('listening');
        if (this.recognition) this.recognition.stop();
    },
    toggle() { this.isListening ? this.stop() : this.start(); }
};

const ChatApp = {
    init() {
        this.sessionId = localStorage.getItem('edith_session_id') || this.generateSessionId();
        localStorage.setItem('edith_session_id', this.sessionId);
        this.bindEvents();
        this.loadHistory();
        this.loadSessions();
    },

    generateSessionId() { return 'sess_' + Math.random().toString(36).substring(2, 15); },

    bindEvents() {
        UI.form.addEventListener('submit', (e) => this.handleSubmit(e));
        UI.voiceBtn.addEventListener('click', () => STT.toggle());
        UI.fileBtn.addEventListener('click', () => UI.fileInput.click());
        UI.newChatBtn.addEventListener('click', () => this.handleNewChat());
        UI.sidebarToggle.addEventListener('click', () => UI.sidebar.classList.add('open'));
        UI.closeSidebar.addEventListener('click', () => UI.sidebar.classList.remove('open'));
    },

    async handleSubmit(e) {
        e.preventDefault();
        const message = UI.input.value.trim();
        if (!message) return;

        UI.input.value = '';
        this.addMessage(message, 'user');

        // Add a "Processing" message bubble and keep a reference
        const aiBubble = this.addMessage("", 'ai');
        aiBubble.classList.add('hologram-pulse');
        aiBubble.textContent = "Synthesizing..."; 

        try {
            const res = await fetch(API_CONFIG.url, {
                method: 'POST',
                headers: API_CONFIG.headers,
                body: JSON.stringify({ message, sessionId: this.sessionId })
            });
            const data = await res.json();
            
            if (data.status === 'success') {
                const aiAction = data.action;
                
                // 1. Show the Initial Acknowledgement
                aiBubble.classList.remove('hologram-pulse');
                aiBubble.textContent = aiAction.response || '';
                
                // 2. Handle Execution Flow (V38.0: reads 'actions' array)
                const actions = aiAction.actions || [];
                
                if (aiAction.mode === 'execution' && actions.length > 0) {
                    // Enter Execution Phase
                    aiBubble.classList.add('hologram-pulse');
                    
                    try {
                        const execRes = await fetch('/api/execute', {
                            method: 'POST',
                            headers: API_CONFIG.headers,
                            body: JSON.stringify({ actions })
                        });
                        const execData = await execRes.json();
                        
                        // 3. Replace Acknowledgement with Final Result
                        aiBubble.classList.remove('hologram-pulse');
                        aiBubble.textContent = execData.response || aiAction.response;
                    } catch (execErr) {
                        aiBubble.classList.remove('hologram-pulse');
                        aiBubble.textContent = "Ran into a problem during execution.";
                    }
                }
                
                this.loadSessions();
            }
        } catch (err) {
            aiBubble.classList.remove('hologram-pulse');
            aiBubble.textContent = "I'm having trouble connecting right now. Mind trying again?";
        }
    },

    handleNewChat(silent = false) {
        if (silent || confirm("Reset current session and initiate a new thread?")) {
            this.sessionId = this.generateSessionId();
            localStorage.setItem('edith_session_id', this.sessionId);
            this.clearChat();
            this.loadSessions();
        }
    },

    clearChat() {
        UI.window.innerHTML = `
            <div id="greeting-placeholder" class="hub-greeting">
                <div class="greeting-content">
                    <div class="greeting-icon">
                        <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                            <rect x="3" y="11" width="18" height="10" rx="2"></rect>
                            <circle cx="12" cy="5" r="2"></circle>
                            <path d="M12 7v4"></path>
                            <line x1="8" y1="16" x2="8" y2="16" stroke-width="3"></line>
                            <line x1="16" y1="16" x2="16" y2="16" stroke-width="3"></line>
                        </svg>
                    </div>
                    <h2>Hi, I'm EDITH.</h2>
                    <p>What's on your mind today?</p>
                </div>
            </div>
        `;
        UI.greeting = document.getElementById('greeting-placeholder');
    },

    async loadSessions() {
        try {
            const res = await fetch(`${API_BASE}/api/sessions`);
            const data = await res.json();
            if (data.status === 'success') this.renderSessions(data.sessions);
        } catch (err) { console.error(err); }
    },

    renderSessions(sessions) {
        UI.sessionList.innerHTML = '';
        if (!sessions || sessions.length === 0) {
            UI.sessionList.innerHTML = '<div class="no-sessions">No saved conversations</div>';
            return;
        }
        sessions.forEach(sess => {
            const sessId = sess._id; // aggregate returns _id as the sessionId
            const div = document.createElement('div');
            div.className = `session-item ${sessId === this.sessionId ? 'active' : ''}`;
            div.innerHTML = `
                <div class="session-title">${(sess.lastMessage || 'New Thread').substring(0, 40)}</div>
                <div class="session-meta">${new Date(sess.timestamp).toLocaleDateString()}</div>
                <button class="delete-session-btn" title="Delete Conversation">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <polyline points="3 6 5 6 21 6"></polyline>
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                    </svg>
                </button>
            `;
            div.onclick = () => this.switchSession(sessId);
            div.querySelector('.delete-session-btn').onclick = (e) => {
                e.stopPropagation();
                this.deleteSession(sessId);
            };
            UI.sessionList.appendChild(div);
        });
    },

    async deleteSession(id) {
        if (!confirm("Are you sure?")) return;
        try {
            const res = await fetch(`${API_BASE}/api/chat/${id}`, { method: 'DELETE' });
            if ((await res.json()).status === 'success') {
                id === this.sessionId ? this.handleNewChat(true) : this.loadSessions();
            }
        } catch (err) { console.error(err); }
    },

    async switchSession(id) {
        if (id === this.sessionId) return;
        this.sessionId = id;
        localStorage.setItem('edith_session_id', id);
        UI.sidebar.classList.remove('open');
        this.clearChat();
        await this.loadHistory();
        this.loadSessions();
    },

    async loadHistory() {
        try {
            const res = await fetch(`${API_BASE}/api/chat/${this.sessionId}`);
            const data = await res.json();
            if (data.status === 'success' && data.history && data.history.length > 0) {
                if (UI.greeting) UI.greeting.style.display = 'none';
                data.history.forEach(item => {
                    if (item.user) this.addMessage(item.user, 'user', true);
                    const aiText = item.ai && (typeof item.ai === 'object' ? item.ai.response : item.ai);
                    if (aiText) this.addMessage(aiText, 'ai', true);
                });
            }
        } catch (err) { console.error('[History Load Error]', err); }
    },

    addMessage(content, sender = 'ai', quiet = false) {
        if (UI.greeting) UI.greeting.style.display = 'none';
        
        const div = document.createElement('div');
        div.className = `message ${sender}-message`;
        div.textContent = content || "";
        UI.window.appendChild(div);
        
        UI.viewport.scrollTo({ top: UI.viewport.scrollHeight, behavior: quiet ? 'auto' : 'smooth' });
        
        if (sender === 'ai' && !quiet && content) {
            const spokenContent = content.replace(/\[System:.*?\]/gs, '').trim();
            if (spokenContent) TTS.speak(spokenContent);
        }
        return div;
    }
};

ChatApp.init();

// ================================================================
// EDITH DESKTOP BOOTSTRAP (V39 — Electron Integration)
// ================================================================
const DesktopBridge = {
    overlay: document.getElementById('loading-overlay'),
    statusEl: document.getElementById('loading-status'),
    statusToast: null,

    /**
     * Poll Node server health until it responds, then hide overlay.
     */
    async waitForBackend(retries = 30, delay = 2000) {
        let lastError = "Timeout during handshake";
        for (let i = 0; i < retries; i++) {
            try {
                const res = await fetch(`${API_BASE}/api/status`);
                if (res.ok) {
                    this.hideOverlay();
                    return;
                }
            } catch (err) { 
                lastError = err.message;
            }
            this.statusEl.textContent = `Connecting to EDITH... (attempt ${i + 1}/${retries})`;
            await new Promise(r => setTimeout(r, delay));
        }
        
        // Backend never came online (Diagnostic V41.1)
        if (this.overlay) {
            this.statusEl.innerHTML = `
                <div style="font-weight:bold; margin-bottom:10px;">⚠️ Backend Synchronization Failed</div>
                <div style="font-size:0.85em; opacity:0.8; color:#ff6b6b;">Error: ${lastError}</div>
                <div style="font-size:0.8em; margin-top:15px; border-top:1px solid #333; padding-top:10px;">
                    Check <b>System Tray > Open Logs</b> for details.
                </div>
            `;
            this.statusEl.style.color = '#fff';
        }
    },

    hideOverlay() {
        if (this.overlay) {
            this.overlay.classList.add('hidden');
            setTimeout(() => { this.overlay.style.display = 'none'; }, 450);
        }
    },

    showToast(msg, color = '#00f2ff') {
        if (!this.statusToast) {
            this.statusToast = document.createElement('div');
            Object.assign(this.statusToast.style, {
                position: 'fixed', bottom: '20px', left: '50%',
                transform: 'translateX(-50%)',
                background: 'rgba(5,7,10,0.95)',
                border: '1px solid rgba(255,255,255,0.1)',
                color: '#fff', padding: '8px 18px',
                borderRadius: '8px', fontSize: '0.85rem',
                zIndex: '9998', transition: 'opacity 0.3s ease'
            });
            document.body.appendChild(this.statusToast);
        }
        this.statusToast.textContent = msg;
        this.statusToast.style.borderColor = color;
        this.statusToast.style.opacity = '1';
        setTimeout(() => { this.statusToast.style.opacity = '0'; }, 3000);
    },

    /**
     * Wire up Electron-specific controls.
     * Safe to call in normal browser — window.edith will be undefined.
     */
    init() {
        // 1. Start backend health poll
        this.waitForBackend();

        // 2. Listen for backend status changes from Electron main process
        if (window.edith && window.edith.onBackendStatus) {
            window.edith.onBackendStatus((status) => {
                if (status === 'down') this.showToast('⚠️  Backend offline — reconnecting...', '#ff6b6b');
                else                   this.showToast('✅  Backend reconnected', '#00f2ff');
            });
        }

        // 3. Title-bar button handlers
        const btnMin   = document.getElementById('btn-minimize');
        const btnClose = document.getElementById('btn-close');

        if (btnMin) {
            btnMin.addEventListener('click', () => {
                // Electron doesn't expose minimize from renderer directly,
                // we use a utility function via the preload if available
                if (window.edith) window.edith.hideWindow();
            });
        }

        if (btnClose) {
            btnClose.addEventListener('click', () => {
                if (window.edith) window.edith.hideWindow();
            });
        }
    }
};

DesktopBridge.init();
