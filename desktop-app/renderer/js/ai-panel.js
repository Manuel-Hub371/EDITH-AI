/* ─── AI Panel Manager ────────────────────────────────────────────────────── */

const AIPanel = (() => {
  const BACKEND_URL = 'http://127.0.0.1:8001';
  
  let isVisible = true;
  let conversationHistory = [];
  let isProcessing = false;
  let currentContext = null;

  // DOM Elements
  let panel, messages, input, sendBtn, statusEl;

  // ─── Init ─────────────────────────────────────────────────────────────────

  function init() {
    panel = document.getElementById('ai-panel');
    messages = document.getElementById('ai-messages');
    input = document.getElementById('ai-input');
    sendBtn = document.getElementById('ai-send-btn');
    statusEl = document.getElementById('ai-status');

    // Event listeners
    sendBtn.addEventListener('click', handleSend);
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSend();
      }
    });

    // Auto-resize textarea
    input.addEventListener('input', () => {
      input.style.height = 'auto';
      input.style.height = Math.min(input.scrollHeight, 120) + 'px';
    });

    // Toggle button
    document.getElementById('btn-toggle-ai').addEventListener('click', toggle);
    
    // Close button
    document.getElementById('btn-close-ai').addEventListener('click', () => toggle(false));

    // Resizer
    initResizer();

    // Suggestion buttons
    document.querySelectorAll('.ai-suggestion-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        input.value = btn.textContent;
        input.focus();
      });
    });

    // Check backend connection
    checkBackendConnection();

    console.log('[AIPanel] Initialized');
  }

  // ─── Resizer ──────────────────────────────────────────────────────────────

  function initResizer() {
    const resizer = document.getElementById('ai-panel-resizer');
    let resizing = false, startX = 0, startW = 0;

    resizer.addEventListener('mousedown', (e) => {
      resizing = true;
      startX = e.clientX;
      startW = panel.offsetWidth;
      resizer.classList.add('dragging');
      e.preventDefault();
    });

    document.addEventListener('mousemove', (e) => {
      if (!resizing) return;
      const w = Math.max(300, Math.min(600, startW - (e.clientX - startX)));
      panel.style.width = `${w}px`;
      document.documentElement.style.setProperty('--ai-panel-width', `${w}px`);
      if (window.EditorManager) EditorManager.layout();
    });

    document.addEventListener('mouseup', () => {
      if (resizing) {
        resizing = false;
        resizer.classList.remove('dragging');
      }
    });
  }

  // ─── Backend Connection ───────────────────────────────────────────────────

  async function checkBackendConnection() {
    try {
      const response = await fetch(`${BACKEND_URL}/health`);
      if (response.ok) {
        updateStatus('Connected to EDITH', 'connected');
      } else {
        updateStatus('Backend unavailable', 'error');
      }
    } catch (error) {
      updateStatus('Backend offline', 'error');
      console.error('[AIPanel] Backend connection failed:', error);
    }
  }

  function updateStatus(message, type = '') {
    if (statusEl) {
      statusEl.textContent = message;
      statusEl.className = `ai-status ${type}`;
    }
  }

  // ─── Send Message ─────────────────────────────────────────────────────────

  async function handleSend() {
    const message = input.value.trim();
    if (!message || isProcessing) return;

    // Add user message
    addMessage('user', message);
    input.value = '';
    input.style.height = 'auto';

    // Get current context
    currentContext = getCurrentContext();

    // Show thinking indicator
    isProcessing = true;
    sendBtn.disabled = true;
    const thinkingId = addThinkingMessage();

    try {
      // Call EDITH backend
      const response = await fetch(`${BACKEND_URL}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_input: message,
          session_id: 'default-session',
        }),
      });

      if (!response.ok) {
        throw new Error(`Backend error: ${response.status}`);
      }

      const data = await response.json();
      
      // Remove thinking indicator
      removeMessage(thinkingId);

      // Add assistant response
      const reply = data.ai_response?.content || 'No response from EDITH';
      addMessage('assistant', reply);

      // Store in conversation history
      conversationHistory.push(
        { role: 'user', content: message, timestamp: Date.now() },
        { role: 'assistant', content: reply, timestamp: Date.now() }
      );

    } catch (error) {
      console.error('[AIPanel] Error sending message:', error);
      removeMessage(thinkingId);
      addMessage('assistant', `⚠️ Error: ${error.message}. Please ensure the EDITH backend is running.`);
    } finally {
      isProcessing = false;
      sendBtn.disabled = false;
      input.focus();
    }
  }

  // ─── Context Collection ───────────────────────────────────────────────────

  function getCurrentContext() {
    const context = {
      timestamp: new Date().toISOString(),
      editor: null,
      workspace: null,
      selection: null,
    };

    // Get active editor file
    if (window.EditorManager && window.__monacoEditor) {
      const model = window.__monacoEditor.getModel();
      if (model) {
        const uri = model.uri.toString();
        const content = model.getValue();
        const selection = window.__monacoEditor.getSelection();
        const selectedText = selection ? model.getValueInRange(selection) : null;

        context.editor = {
          filePath: uri.replace('file://', ''),
          language: model.getLanguageId(),
          content: content.substring(0, 5000), // Limit to 5KB
          lineCount: model.getLineCount(),
        };

        if (selectedText) {
          context.selection = {
            text: selectedText,
            startLine: selection.startLineNumber,
            endLine: selection.endLineNumber,
          };
        }
      }
    }

    // Get workspace info
    if (window.FileTree && window.FileTree.getRootPath) {
      const rootPath = window.FileTree.getRootPath();
      if (rootPath) {
        context.workspace = {
          path: rootPath,
          name: rootPath.split(/[/\\]/).pop(),
        };
      }
    }

    return context;
  }

  // ─── Message Management ───────────────────────────────────────────────────

  function addMessage(role, content) {
    // Hide welcome screen
    const welcome = document.querySelector('.ai-welcome');
    if (welcome) welcome.style.display = 'none';

    const messageEl = document.createElement('div');
    messageEl.className = `ai-message ${role}`;
    messageEl.dataset.timestamp = Date.now();

    const time = new Date().toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });

    messageEl.innerHTML = `
      <div class="ai-message-header">
        <div class="ai-message-avatar">${role === 'user' ? 'You' : 'AI'}</div>
        <div class="ai-message-sender">${role === 'user' ? 'You' : 'EDITH'}</div>
        <div class="ai-message-time">${time}</div>
      </div>
      <div class="ai-message-content">${formatMessage(content)}</div>
    `;

    // Add action buttons for assistant messages
    if (role === 'assistant') {
      const actions = document.createElement('div');
      actions.className = 'ai-message-actions';
      actions.innerHTML = `
        <button class="ai-action-btn" data-action="copy">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
          </svg>
          Copy
        </button>
        <button class="ai-action-btn" data-action="insert" title="Insert into editor">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
          </svg>
          Insert
        </button>
      `;

      // Action button handlers
      actions.querySelector('[data-action="copy"]').addEventListener('click', () => {
        navigator.clipboard.writeText(content);
        Notifications.success('Copied', 'Response copied to clipboard');
      });

      actions.querySelector('[data-action="insert"]').addEventListener('click', () => {
        if (window.__monacoEditor) {
          const editor = window.__monacoEditor;
          const selection = editor.getSelection();
          editor.executeEdits('ai-insert', [{
            range: selection,
            text: content,
          }]);
          Notifications.success('Inserted', 'Response inserted into editor');
        } else {
          Notifications.error('No Editor', 'Please open a file first');
        }
      });

      messageEl.appendChild(actions);
    }

    messages.appendChild(messageEl);
    messages.scrollTop = messages.scrollHeight;

    return messageEl.dataset.timestamp;
  }

  function addThinkingMessage() {
    const messageEl = document.createElement('div');
    messageEl.className = 'ai-message assistant thinking';
    const id = 'thinking-' + Date.now();
    messageEl.dataset.id = id;

    messageEl.innerHTML = `
      <div class="ai-message-header">
        <div class="ai-message-avatar">AI</div>
        <div class="ai-message-sender">EDITH</div>
      </div>
      <div class="ai-message-content">
        <span>Thinking</span>
        <div class="ai-thinking-dots">
          <div class="ai-thinking-dot"></div>
          <div class="ai-thinking-dot"></div>
          <div class="ai-thinking-dot"></div>
        </div>
      </div>
    `;

    messages.appendChild(messageEl);
    messages.scrollTop = messages.scrollHeight;

    return id;
  }

  function removeMessage(id) {
    const messageEl = messages.querySelector(`[data-id="${id}"]`);
    if (messageEl) messageEl.remove();
  }

  function formatMessage(content) {
    // Convert markdown-style code blocks
    content = content.replace(/```(\w+)?\n([\s\S]*?)```/g, (match, lang, code) => {
      return `<pre><code>${escapeHtml(code.trim())}</code></pre>`;
    });

    // Convert inline code
    content = content.replace(/`([^`]+)`/g, '<code>$1</code>');

    // Convert line breaks
    content = content.replace(/\n/g, '<br>');

    return content;
  }

  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  // ─── Clear History ────────────────────────────────────────────────────────

  function clearHistory() {
    conversationHistory = [];
    messages.innerHTML = `
      <div class="ai-welcome">
        <svg class="ai-welcome-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
          <path d="M12 2L2 7l10 5 10-5-10-5z"/>
          <path d="M2 17l10 5 10-5"/>
          <path d="M2 12l10 5 10-5"/>
        </svg>
        <h3>EDITH AI Assistant</h3>
        <p>Ask me anything about your code, get suggestions, or request help with development tasks.</p>
        <div class="ai-suggestions">
          <button class="ai-suggestion-btn">Explain this code</button>
          <button class="ai-suggestion-btn">Find bugs in my code</button>
          <button class="ai-suggestion-btn">Optimize this function</button>
          <button class="ai-suggestion-btn">Write unit tests</button>
        </div>
      </div>
    `;
    
    // Re-attach suggestion button listeners
    document.querySelectorAll('.ai-suggestion-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        input.value = btn.textContent;
        input.focus();
      });
    });

    Notifications.success('Cleared', 'Conversation history cleared');
  }

  // ─── Toggle Panel ─────────────────────────────────────────────────────────

  function toggle(forceState) {
    isVisible = forceState !== undefined ? forceState : !isVisible;
    
    if (isVisible) {
      panel.classList.remove('collapsed');
    } else {
      panel.classList.add('collapsed');
    }

    // Update toggle button state
    const toggleBtn = document.getElementById('btn-toggle-ai');
    if (toggleBtn) {
      toggleBtn.classList.toggle('active', isVisible);
    }

    if (window.EditorManager) EditorManager.layout();
  }

  function show() { toggle(true); }
  function hide() { toggle(false); }

  // ─── Public API ───────────────────────────────────────────────────────────

  return {
    init,
    toggle,
    show,
    hide,
    clearHistory,
    sendMessage: (message) => {
      input.value = message;
      handleSend();
    },
  };
})();

// Expose to window
window.AIPanel = AIPanel;
