/**
 * EDITH AI — Frontend Core (V55.0)
 * Clean rewrite for the minimal premium UI redesign.
 */

const API_BASE = (window.edith || window.location.protocol === 'file:')
    ? 'http://localhost:5000'
    : '';

// ================================================================
// DOM REFERENCES
// ================================================================
const UI = {
    form:          document.getElementById('chat-form'),
    input:         document.getElementById('user-input'),
    window:        document.getElementById('chat-window'),
    greeting:      document.getElementById('greeting-placeholder'),
    voiceBtn:      document.getElementById('voice-btn'),
    fileBtn:       document.getElementById('file-btn'),
    fileInput:     document.getElementById('file-input'),
    newChatBtn:    document.getElementById('new-chat-btn'),
    feed:          document.querySelector('.message-feed'),
    sidebar:       document.getElementById('history-sidebar'),
    sidebarToggle: document.getElementById('sidebar-toggle'),
    closeSidebar:  document.getElementById('close-sidebar'),
    sessionList:   document.getElementById('session-list'),
    inputBar:      document.getElementById('input-bar')
};

const API_CONFIG = {
    url: `${API_BASE}/api/chat`,
    headers: { 'Content-Type': 'application/json' }
};

// ================================================================
// TEXT-TO-SPEECH
// ================================================================
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

// ================================================================
// SPEECH-TO-TEXT
// ================================================================
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

// ================================================================
// MAIN CHAT APPLICATION
// ================================================================
const ChatApp = {
    init() {
        this.sessionId = localStorage.getItem('edith_session_id') || this.generateSessionId();
        localStorage.setItem('edith_session_id', this.sessionId);
        this.bindEvents();
        this.loadHistory();
        this.loadSessions();

        // Real-time Backend Trace Forwarding to DevTools
        if (window.edith && window.edith.onBackendTrace) {
            window.edith.onBackendTrace((data) => {
                // If it's a trace message (starts with []), use styles
                if (data.includes('[') && data.includes(']')) {
                    console.log(`%c${data.trim()}`, 'color: #00d2ff; font-weight: bold;');
                } else {
                    console.log(data.trim());
                }
            });
        }
    },

    generateSessionId() { return 'sess_' + Math.random().toString(36).substring(2, 15); },

    bindEvents() {
        // Form submit (Enter key or button)
        UI.form.addEventListener('submit', (e) => this.handleSubmit(e));

        // Allow Enter to send, Shift+Enter for newline
        UI.input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                UI.form.dispatchEvent(new Event('submit'));
            }
        });

        // Auto-resize textarea
        UI.input.addEventListener('input', () => {
            UI.input.style.height = 'auto';
            UI.input.style.height = Math.min(UI.input.scrollHeight, 120) + 'px';
        });

        // Tool buttons
        UI.voiceBtn.addEventListener('click', () => STT.toggle());
        UI.fileBtn.addEventListener('click', () => UI.fileInput.click());
        UI.newChatBtn.addEventListener('click', () => this.handleNewChat());

        // Sidebar
        UI.sidebarToggle.addEventListener('click', () => UI.sidebar.classList.add('open'));
        UI.closeSidebar.addEventListener('click', () => UI.sidebar.classList.remove('open'));

        // Quick action chips
        document.querySelectorAll('.quick-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                UI.input.value = btn.dataset.prompt;
                UI.form.dispatchEvent(new Event('submit'));
            });
        });
    },

    // ---- Send & Receive ----
    async handleSubmit(e) {
        e.preventDefault();
        const message = UI.input.value.trim();
        if (!message) return;

        UI.input.value = '';
        UI.input.style.height = 'auto';
        this.addMessage(message, 'user');

        // Show typing indicator
        const typingEl = this.showTyping();

        try {
            const res = await fetch(API_CONFIG.url, {
                method: 'POST',
                headers: API_CONFIG.headers,
                body: JSON.stringify({ message, sessionId: this.sessionId })
            });
            const data = await res.json();

            // Remove typing indicator
            typingEl.remove();

            if (data.status === 'success') {
                const aiAction = data.action;
                const aiText = aiAction.message || aiAction.response || '';

                if (aiAction.mode === 'execution' && aiAction.intent) {
                    // Show initial acknowledgement
                    const aiBubble = this.addMessage(aiText, 'ai');
                    const execTyping = this.showTyping();

                    try {
                        const execRes = await fetch(`${API_BASE}/api/execute`, {
                            method: 'POST',
                            headers: API_CONFIG.headers,
                            body: JSON.stringify({ action: aiAction, sessionId: this.sessionId })
                        });
                        let execData = await execRes.json();

                        // Auto-confirm loop for multi-step tasks
                        while (execData.status === 'NEED_CONFIRMATION' && execData.actionId) {
                            const confirmRes = await fetch(`${API_BASE}/api/execute/confirm`, {
                                method: 'POST',
                                headers: API_CONFIG.headers,
                                body: JSON.stringify({ actionId: execData.actionId, confirmed: true })
                            });
                            execData = await confirmRes.json();
                        }

                        execTyping.remove();

                        if (execData.status === 'NEED_CHOICE') {
                            this.updateBubble(aiBubble, execData.message || 'Multiple matches found. Please clarify.');
                        } else {
                            let displayMessage = execData.message || aiText || 'Done.';
                            
                            // Rich formatting for multi-step results
                            if (execData.executedSteps && execData.executedSteps.length > 0) {
                                displayMessage += `<br><br><small style="color: #4ade80;">Executed ${execData.executedSteps.length} steps.</small>`;
                            }
                            if (execData.failedSteps && execData.failedSteps.length > 0) {
                                displayMessage += `<br><small style="color: #f87171;">Failed ${execData.failedSteps.length} steps.</small>`;
                            }

                            this.updateBubble(aiBubble, displayMessage);
                        }
                    } catch (execErr) {
                        execTyping.remove();
                        this.updateBubble(aiBubble, `Execution Error: ${execErr.message}`);
                    }
                } else {
                    // Chat-only mode
                    this.addMessage(aiText, 'ai');
                }

                this.loadSessions();
            }
        } catch (err) {
            typingEl.remove();
            this.addMessage("I'm having trouble connecting. Please try again.", 'ai');
        }
    },

    // ---- Session Management ----
    handleNewChat(silent = false) {
        if (silent || confirm("Start a new conversation?")) {
            this.sessionId = this.generateSessionId();
            localStorage.setItem('edith_session_id', this.sessionId);
            this.clearChat();
            this.loadSessions();
        }
    },

    clearChat() {
        UI.window.innerHTML = `
            <div id="greeting-placeholder" class="greeting-wrap">
                <div class="greeting-body">
                    <div class="greeting-avatar">E</div>
                    <h2 class="greeting-title">Hello, Sir.</h2>
                    <p class="greeting-sub">How can I assist you today?</p>
                    <div class="quick-actions">
                        <button class="quick-btn" data-prompt="What's on my Desktop?">📂 Scan Desktop</button>
                        <button class="quick-btn" data-prompt="Open Documents folder">📄 Open Documents</button>
                        <button class="quick-btn" data-prompt="What time is it?">🕐 Current Time</button>
                        <button class="quick-btn" data-prompt="Set volume to 50%">🔊 Set Volume 50%</button>
                    </div>
                </div>
            </div>
        `;
        UI.greeting = document.getElementById('greeting-placeholder');

        // Re-bind quick action chips
        document.querySelectorAll('.quick-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                UI.input.value = btn.dataset.prompt;
                UI.form.dispatchEvent(new Event('submit'));
            });
        });
    },

    async loadSessions() {
        try {
            const res = await fetch(`${API_BASE}/api/sessions`);
            const data = await res.json();
            if (data.status === 'success') this.renderSessions(data.sessions);
        } catch (err) { /* Sidebar fails silently */ }
    },

    renderSessions(sessions) {
        UI.sessionList.innerHTML = '';
        if (!sessions || sessions.length === 0) {
            UI.sessionList.innerHTML = '<div style="padding:16px;text-align:center;color:var(--text-muted);font-size:0.78rem;">No saved conversations</div>';
            return;
        }
        sessions.forEach(sess => {
            const sessId = sess._id;
            const div = document.createElement('div');
            div.className = `session-item ${sessId === this.sessionId ? 'active' : ''}`;
            div.innerHTML = `
                <div class="session-title">${(sess.lastMessage || 'New Thread').substring(0, 36)}</div>
                <div class="session-meta">${new Date(sess.timestamp).toLocaleDateString()}</div>
            `;
            div.onclick = () => this.switchSession(sessId);
            UI.sessionList.appendChild(div);
        });
    },

    async deleteSession(id) {
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
        } catch (err) { /* Silent fail on load */ }
    },

    // ---- UI Helpers ----
    addMessage(content, sender = 'ai', quiet = false) {
        if (UI.greeting) UI.greeting.style.display = 'none';

        const div = document.createElement('div');
        div.className = `message ${sender}-message`;

        if (sender === 'ai') {
            div.innerHTML = `
                <div class="ai-avatar">E</div>
                <div class="ai-bubble">${this.escapeHtml(content)}</div>
            `;
        } else {
            div.textContent = content || '';
        }

        UI.window.appendChild(div);
        UI.feed.scrollTo({ top: UI.feed.scrollHeight, behavior: quiet ? 'auto' : 'smooth' });

        if (sender === 'ai' && !quiet && content) {
            const spokenContent = content.replace(/\[System:.*?\]/gs, '').trim();
            if (spokenContent) TTS.speak(spokenContent);
        }
        return div;
    },

    updateBubble(container, text) {
        const bubble = container.querySelector('.ai-bubble');
        if (bubble) bubble.textContent = text;
    },

    showTyping() {
        const el = document.createElement('div');
        el.className = 'typing-indicator';
        el.innerHTML = `
            <div class="ai-avatar">E</div>
            <div class="typing-dots"><span></span><span></span><span></span></div>
        `;
        UI.window.appendChild(el);
        UI.feed.scrollTo({ top: UI.feed.scrollHeight, behavior: 'smooth' });
        return el;
    },

    escapeHtml(text) {
        const el = document.createElement('span');
        el.textContent = text || '';
        return el.innerHTML;
    }
};

ChatApp.init();

// ================================================================
// ELECTRON DESKTOP BRIDGE (V55.0)
// ================================================================
const DesktopBridge = {
    overlay: document.getElementById('loading-overlay'),
    statusEl: document.getElementById('loading-status'),

    async waitForBackend(retries = 30, delay = 2000) {
        let lastError = 'Timeout during handshake';
        for (let i = 0; i < retries; i++) {
            try {
                const res = await fetch(`${API_BASE}/api/status`);
                if (res.ok) { this.hideOverlay(); return; }
            } catch (err) { lastError = err.message; }
            if (this.statusEl) {
                this.statusEl.textContent = `Attempting connection... (${i + 1}/${retries})`;
            }
            await new Promise(r => setTimeout(r, delay));
        }

        // Backend offline
        if (this.statusEl) {
            this.statusEl.innerHTML = `
                <span style="color:var(--red);">Connection failed: ${lastError}</span>
                <br><span style="opacity:0.6;font-size:0.72rem;">Check System Tray → Open Logs for details.</span>
            `;
        }
    },

    hideOverlay() {
        if (this.overlay) {
            this.overlay.classList.add('hidden');
            setTimeout(() => { this.overlay.style.display = 'none'; }, 500);
        }
    },

    init() {
        this.waitForBackend();

        // Electron IPC status listener
        if (window.edith && window.edith.onBackendStatus) {
            window.edith.onBackendStatus((status) => {
                const dot = document.querySelector('.tb-status-dot');
                const txt = document.querySelector('.tb-status-text');
                if (status === 'down') {
                    if (dot) { dot.style.background = 'var(--red)'; dot.style.boxShadow = '0 0 6px var(--red)'; }
                    if (txt) txt.textContent = 'Reconnecting...';
                } else {
                    if (dot) { dot.style.background = 'var(--green)'; dot.style.boxShadow = '0 0 6px var(--green)'; }
                    if (txt) txt.textContent = 'Systems Online';
                }
            });
        }

        // Title bar buttons
        const btnMin = document.getElementById('btn-minimize');
        const btnClose = document.getElementById('btn-close');

        if (btnMin) btnMin.addEventListener('click', () => { if (window.edith) window.edith.minimizeWindow(); });
        if (btnClose) btnClose.addEventListener('click', () => { if (window.edith) window.edith.closeWindow(); });
    }
};

DesktopBridge.init();
