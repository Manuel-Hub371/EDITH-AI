/* EDITH Chat with History */

const Chat = (() => {
  const BACKEND_URL = 'http://127.0.0.1:8001';
  
  let elements = {};
  let isProcessing = false;
  let connectionStatus = 'connecting';
  let chatHistory = [];
  let currentChatId = null;
  let pendingDeleteChatId = null;

  // Initialize
  function init() {
    elements = {
      sidebar: document.getElementById('sidebar'),
      messages: document.getElementById('messages'),
      input: document.getElementById('input'),
      sendBtn: document.getElementById('btn-send'),
      newChatBtn: document.getElementById('btn-new-chat'),
      chatHistory: document.getElementById('chat-history'),
      connectionStatus: document.getElementById('connection-status'),
      welcome: document.getElementById('welcome'),
      modeToggle: document.getElementById('mode-toggle'),
      sidebarToggle: document.getElementById('sidebar-toggle'),
      mobileMenu: document.getElementById('mobile-menu'),
      btnMinimize: document.getElementById('btn-minimize'),
      btnMaximize: document.getElementById('btn-maximize'),
      btnClose: document.getElementById('btn-close'),
      deleteModal: document.getElementById('delete-modal'),
      deleteConfirm: document.getElementById('delete-confirm'),
      deleteCancel: document.getElementById('delete-cancel'),
    };

    setupEvents();
    setupAutoResize();
    checkConnection();
    loadChatHistory();
  }

  // Event Listeners
  function setupEvents() {
    elements.sendBtn.addEventListener('click', sendMessage);
    
    elements.input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
      }
    });

    elements.newChatBtn.addEventListener('click', startNewChat);

    if (elements.sidebarToggle) {
      elements.sidebarToggle.addEventListener('click', toggleSidebar);
    }

    if (elements.mobileMenu) {
      elements.mobileMenu.addEventListener('click', toggleSidebar);
    }

    if (elements.modeToggle) {
      elements.modeToggle.addEventListener('click', toggleMode);
    }

    // Delete modal events
    elements.deleteConfirm.addEventListener('click', confirmDelete);
    elements.deleteCancel.addEventListener('click', closeDeleteModal);
    elements.deleteModal.addEventListener('click', (e) => {
      if (e.target === elements.deleteModal) {
        closeDeleteModal();
      }
    });

    // Window controls
    elements.btnMinimize.addEventListener('click', () => {
      if (window.edith && window.edith.window) {
        window.edith.window.minimize();
      } else if (window.novagen && window.novagen.window) {
        window.novagen.window.minimize();
      }
    });
    
    elements.btnMaximize.addEventListener('click', () => {
      if (window.edith && window.edith.window) {
        window.edith.window.toggleMaximize();
      } else if (window.novagen && window.novagen.window) {
        window.novagen.window.maximize();
      }
    });
    
    elements.btnClose.addEventListener('click', () => {
      if (window.edith && window.edith.window) {
        window.edith.window.close();
      } else if (window.novagen && window.novagen.window) {
        window.novagen.window.close();
      }
    });
  }

  // Auto-resize textarea
  function setupAutoResize() {
    elements.input.addEventListener('input', () => {
      elements.input.style.height = 'auto';
      elements.input.style.height = Math.min(elements.input.scrollHeight, 120) + 'px';
    });
  }

  // Toggle Sidebar
  function toggleSidebar() {
    elements.sidebar.classList.toggle('open');
  }

  // Check Backend Connection
  async function checkConnection() {
    try {
      const response = await fetch(`${BACKEND_URL}/health`);
      if (response.ok) {
        setStatus('connected', 'Connected');
      } else {
        setStatus('error', 'Unavailable');
      }
    } catch (error) {
      setStatus('error', 'Offline');
    }
  }

  function setStatus(status, text) {
    connectionStatus = status;
    const statusEl = elements.connectionStatus;
    const statusText = statusEl.querySelector('.status-text');
    statusEl.className = `status ${status}`;
    if (statusText) statusText.textContent = text;
  }

  // Chat History Management
  function loadChatHistory() {
    const saved = localStorage.getItem('edith_chat_history');
    if (saved) {
      try {
        chatHistory = JSON.parse(saved);
        renderChatHistory();
      } catch (e) {
        chatHistory = [];
      }
    }
  }

  function saveChatHistory() {
    localStorage.setItem('edith_chat_history', JSON.stringify(chatHistory));
  }

  function renderChatHistory() {
    elements.chatHistory.innerHTML = '';
    
    chatHistory.forEach(chat => {
      const item = document.createElement('div');
      item.className = `chat-item ${chat.id === currentChatId ? 'active' : ''}`;
      item.dataset.id = chat.id;
      
      item.innerHTML = `
        <span class="chat-item-text">${chat.title}</span>
        <button class="chat-item-delete" title="Delete chat">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="3 6 5 6 21 6"/>
            <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/>
          </svg>
        </button>
      `;
      
      // Click on item to load chat
      item.querySelector('.chat-item-text').addEventListener('click', () => loadChat(chat.id));
      
      // Click on delete button
      item.querySelector('.chat-item-delete').addEventListener('click', (e) => {
        e.stopPropagation();
        deleteChat(chat.id);
      });
      
      elements.chatHistory.appendChild(item);
    });
  }

  function startNewChat() {
    currentChatId = Date.now().toString();
    
    // Clear current messages
    const messages = elements.messages.querySelectorAll('.message');
    messages.forEach(msg => msg.remove());
    
    // Show welcome
    if (elements.welcome) {
      elements.welcome.style.display = 'flex';
    }
    
    // Clear input
    elements.input.value = '';
    elements.input.style.height = 'auto';
    
    // Update active state
    renderChatHistory();
  }

  function loadChat(chatId) {
    const chat = chatHistory.find(c => c.id === chatId);
    if (!chat) return;
    
    currentChatId = chatId;
    
    // Clear current messages
    const messages = elements.messages.querySelectorAll('.message');
    messages.forEach(msg => msg.remove());
    
    // Hide welcome
    if (elements.welcome) {
      elements.welcome.style.display = 'none';
    }
    
    // Load messages
    chat.messages.forEach(msg => {
      addMessage(msg.role, msg.content, false);
    });
    
    // Update active state
    renderChatHistory();
    
    // Scroll to bottom
    elements.messages.scrollTop = elements.messages.scrollHeight;
  }

  function saveCurrentChat(userMessage, aiMessage) {
    if (!currentChatId) {
      currentChatId = Date.now().toString();
    }
    
    let chat = chatHistory.find(c => c.id === currentChatId);
    
    if (!chat) {
      chat = {
        id: currentChatId,
        title: userMessage.substring(0, 50) + (userMessage.length > 50 ? '...' : ''),
        messages: [],
        timestamp: Date.now()
      };
      chatHistory.unshift(chat);
    }
    
    chat.messages.push(
      { role: 'user', content: userMessage },
      { role: 'assistant', content: aiMessage }
    );
    chat.timestamp = Date.now();
    
    // Keep only last 50 chats
    if (chatHistory.length > 50) {
      chatHistory = chatHistory.slice(0, 50);
    }
    
    saveChatHistory();
    renderChatHistory();
  }

  function deleteChat(chatId) {
    pendingDeleteChatId = chatId;
    showDeleteModal();
  }

  function showDeleteModal() {
    elements.deleteModal.classList.add('show');
  }

  function closeDeleteModal() {
    elements.deleteModal.classList.remove('show');
    pendingDeleteChatId = null;
  }

  function confirmDelete() {
    if (pendingDeleteChatId) {
      // Remove from history
      chatHistory = chatHistory.filter(c => c.id !== pendingDeleteChatId);
      saveChatHistory();
      renderChatHistory();
      
      // If deleting current chat, start new chat
      if (pendingDeleteChatId === currentChatId) {
        startNewChat();
      }
      
      closeDeleteModal();
    }
  }

  // Send Message
  async function sendMessage() {
    const text = elements.input.value.trim();
    if (!text || isProcessing) return;

    if (connectionStatus !== 'connected') {
      alert('Please wait for backend connection');
      return;
    }

    // Clear input
    elements.input.value = '';
    elements.input.style.height = 'auto';

    // Hide welcome
    if (elements.welcome) {
      elements.welcome.style.display = 'none';
    }

    // Add user message
    addMessage('user', text);

    // Show thinking
    isProcessing = true;
    elements.sendBtn.disabled = true;
    const thinkingId = addThinking();

    try {
      const response = await fetch(`${BACKEND_URL}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_input: text,
          session_id: currentChatId || 'default-session',
        }),
      });

      removeMessage(thinkingId);

      if (!response.ok) {
        throw new Error('Backend error');
      }

      const data = await response.json();
      const reply = data.ai_response?.content || 'No response';

      // Add assistant response
      addMessage('assistant', reply);

      // Save to history
      saveCurrentChat(text, reply);

    } catch (error) {
      removeMessage(thinkingId);
      addMessage('assistant', '⚠️ Error: Could not reach backend. Please ensure EDITH backend is running.');
    } finally {
      isProcessing = false;
      elements.sendBtn.disabled = false;
    }
  }

  // Add Message
  function addMessage(role, content, scroll = true) {
    const id = Date.now();
    const name = role === 'user' ? 'You' : 'EDITH';
    const initial = role === 'user' ? 'Y' : 'E';

    const messageEl = document.createElement('div');
    messageEl.className = `message ${role}`;
    messageEl.dataset.id = id;
    messageEl.innerHTML = `
      <div class="message-avatar">${initial}</div>
      <div class="message-content">
        <div class="message-name">${name}</div>
        <div class="message-text">${formatMessage(content)}</div>
      </div>
    `;

    elements.messages.appendChild(messageEl);
    
    if (scroll) {
      elements.messages.scrollTop = elements.messages.scrollHeight;
    }

    return id;
  }

  // Add Thinking
  function addThinking() {
    const id = 'thinking-' + Date.now();
    const messageEl = document.createElement('div');
    messageEl.className = 'message assistant thinking';
    messageEl.dataset.id = id;
    messageEl.innerHTML = `
      <div class="message-avatar">E</div>
      <div class="message-content">
        <div class="message-name">EDITH</div>
        <div class="message-text">
          <span>Thinking</span>
          <div class="thinking-dots">
            <div class="thinking-dot"></div>
            <div class="thinking-dot"></div>
            <div class="thinking-dot"></div>
          </div>
        </div>
      </div>
    `;

    elements.messages.appendChild(messageEl);
    elements.messages.scrollTop = elements.messages.scrollHeight;

    return id;
  }

  // Remove Message
  function removeMessage(id) {
    const messageEl = elements.messages.querySelector(`[data-id="${id}"]`);
    if (messageEl) messageEl.remove();
  }

  // Format Message
  function formatMessage(text) {
    // Code blocks
    text = text.replace(/```(\w+)?\n([\s\S]*?)```/g, (match, lang, code) => {
      return `<pre><code>${escapeHtml(code.trim())}</code></pre>`;
    });

    // Inline code
    text = text.replace(/`([^`]+)`/g, '<code>$1</code>');

    // Bold
    text = text.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');

    // Italic
    text = text.replace(/\*([^*]+)\*/g, '<em>$1</em>');

    // Line breaks
    text = text.replace(/\n/g, '<br>');

    return text;
  }

  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  // Toggle Mode
  async function toggleMode() {
    const btn = elements.modeToggle;
    btn.classList.toggle('active');

    if (btn.classList.contains('active')) {
      btn.querySelector('span').textContent = 'Agent';
      
      // Navigate to agent mode
      if (window.edith && window.edith.navigation) {
        await window.edith.navigation.loadAgentMode();
      } else if (window.novagen && window.novagen.navigation) {
        await window.novagen.navigation.loadAgentMode();
      } else {
        window.location.href = 'index.html';
      }
    }
  }

  // Public API
  return { init };
})();

// Start
document.addEventListener('DOMContentLoaded', () => {
  Chat.init();
});
