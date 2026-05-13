/* ============================================================
   EDITH -- Desktop App Logic (Minimal Production Version)
   ============================================================ */

(function () {
  'use strict';

  // -- State
  var isWaiting   = false;
  var hasMessages = false;
  var currentMode = 'normal';

  // -- DOM
  var app          = document.getElementById('app');
  var welcome      = document.getElementById('welcome');
  var messages     = document.getElementById('messages');
  var msgInput     = document.getElementById('msg-input');
  var btnSend      = document.getElementById('btn-send');
  var welcomeTitle = document.getElementById('welcome-title');
  var statusDot    = document.querySelector('.status-dot');
  var statusText   = document.querySelector('.status-text');
  var segNormal    = document.getElementById('seg-normal');
  var segAgent     = document.getElementById('seg-agent');
  var modeLabel    = document.getElementById('mode-label');

  // -- Helpers
  function getTime() {
    var d = new Date();
    var h = d.getHours();
    var m = String(d.getMinutes()).padStart(2, '0');
    var ap = h >= 12 ? 'PM' : 'AM';
    h = h % 12 || 12;
    return h + ':' + m + ' ' + ap;
  }

  function esc(t) {
    var d = document.createElement('div');
    d.appendChild(document.createTextNode(t));
    return d.innerHTML;
  }

  function scrollDown() {
    var area = document.getElementById('chat-area');
    if (area) area.scrollTo({ top: area.scrollHeight, behavior: 'smooth' });
  }

  function setStatus(online) {
    if (statusDot)  statusDot.style.background  = online ? '#10B981' : '#EF4444';
    if (statusText) statusText.textContent = online ? 'Backend Online' : 'Backend Offline';
  }

  function robotSVG(size) {
    return '<svg width="' + size + '" height="' + size + '" viewBox="0 0 100 100" fill="none">'
      + '<circle cx="50" cy="50" r="48" fill="#1E293B" stroke="#3B82F6" stroke-width="2"/>'
      + '<rect x="30" y="35" width="40" height="30" rx="5" stroke="#3B82F6" stroke-width="2"/>'
      + '<circle cx="40" cy="45" r="3" fill="#3B82F6"/>'
      + '<circle cx="60" cy="45" r="3" fill="#3B82F6"/>'
      + '<path d="M40 55 Q50 60 60 55" stroke="#3B82F6" stroke-width="2" fill="none"/>'
      + '</svg>';
  }

  function showMessages() {
    if (!hasMessages) {
      hasMessages = true;
      welcome.classList.add('hidden');
      messages.classList.remove('hidden');
    }
  }

  function appendUser(text) {
    showMessages();
    var row = document.createElement('div');
    row.className = 'msg-row user';
    row.innerHTML = '<div class="msg-avatar user-av">U</div>'
      + '<div class="msg-wrap">'
      + '<div class="msg-bubble">' + esc(text) + '</div>'
      + '<span class="msg-time">' + getTime() + '</span>'
      + '</div>';
    messages.appendChild(row);
    scrollDown();
  }

  function appendAI(result) {
    showMessages();
    var row = document.createElement('div');
    row.className = 'msg-row ai';
    
    // Full Production Orchestration Rendering
    var intent = result.intent || {};
    var strategy = intent.execution_strategy || {};
    
    var html = '<div class="ir-box">'
      + '<div class="ir-title">INTENT ORCHESTRATION LAYER</div>'
      + '<div class="ir-row"><strong>Style:</strong> <span class="ir-badge style">' + (intent.interaction_style || 'DIRECT').toUpperCase() + '</span></div>'
      + '<div class="ir-row"><strong>Strategy:</strong> <span class="ir-badge strategy">' + (strategy.execution_mode || 'DIRECT').toUpperCase() + '</span></div>'
      + '<div class="ir-row"><strong>Planning:</strong> <span class="ir-badge ' + (strategy.requires_planning ? 'plan' : 'none') + '">' + (strategy.requires_planning ? 'REQUIRED' : 'NO') + '</span></div>';

    // Entities Extracted
    if (intent.entities && Object.keys(intent.entities).length > 0) {
      html += '<div class="ir-section"><strong>Entities:</strong><div class="ir-ent-grid">';
      for (var key in intent.entities) {
        html += '<div class="ir-ent-item"><em>' + key + ':</em> <span>' + intent.entities[key] + '</span></div>';
      }
      html += '</div></div>';
    }

    // Required Capabilities
    if (intent.capabilities_required && intent.capabilities_required.length > 0) {
      html += '<div class="ir-section"><strong>Capabilities Required:</strong>'
        + '<div class="ir-caps-list">';
      intent.capabilities_required.forEach(function(cap) {
        html += '<span class="cap-tag">' + cap.replace('_', ' ') + '</span>';
      });
      html += '</div></div>';
    }

    // Missing Parameters & Clarification
    if (intent.missing_parameters && intent.missing_parameters.length > 0) {
      html += '<div class="ir-section alert"><strong>Missing Parameters:</strong>'
        + '<div class="ir-missing-list">';
      intent.missing_parameters.forEach(function(p) {
        html += '<span class="missing-tag">' + p + '</span>';
      });
      html += '</div>'
        + '<div class="ir-clarify"><strong>Clarification:</strong> ' + esc(intent.clarification_question || '...') + '</div>'
        + '</div>';
    }

    // Intent Hierarchy
    if (intent.intents && intent.intents.length > 0) {
      html += '<div class="ir-section"><strong>Intent Hierarchy:</strong>';
      intent.intents.forEach(function(i) {
        var conf = Math.round(i.confidence * 100);
        html += '<div class="ir-intent-item">'
          + '<span class="ir-primary">' + i.primary_intent + '</span>'
          + '<span class="ir-arrow">→</span>'
          + '<span class="ir-sub">' + i.sub_intent + '</span>'
          + '<span class="ir-conf">' + conf + '%</span>'
          + '</div>';
      });
      html += '</div>';
    }

    // Reasoning
    html += '<div class="ir-meta">'
      + '<div class="ir-reason"><strong>Orchestration Logic:</strong> ' + esc(intent.reasoning || 'N/A') + '</div>'
      + '</div>';

    html += '</div>';
    
    // Conditionally show Orchestration Layer
    // Hide it for direct responses to keep the UI clean
    var showOrchestration = strategy.execution_mode !== 'direct_response';
    
    // Display the main AI message bubble
    var aiMsg = result.ai_response ? result.ai_response.content : "Thinking...";
    
    row.innerHTML = '<div class="msg-avatar">' + robotSVG(28) + '</div>'
      + '<div class="msg-wrap">'
      + '<div class="msg-bubble ai-bubble">' + esc(aiMsg) + '</div>'
      + (showOrchestration ? html : '') // Only show orchestration for complex tasks
      + '<span class="msg-time">' + getTime() + '</span>'
      + '</div>';
    messages.appendChild(row);
    scrollDown();
  }

  function appendError(msg) {
    showMessages();
    var row = document.createElement('div');
    row.className = 'msg-row ai';
    row.innerHTML = '<div class="msg-avatar">' + robotSVG(28) + '</div>'
      + '<div class="msg-wrap">'
      + '<div class="msg-bubble" style="color:#EF4444;border-color:#FEE2E2;">'
      + '<strong>Error:</strong> ' + esc(msg)
      + '</div>'
      + '</div>';
    messages.appendChild(row);
    scrollDown();
  }

  async function send() {
    var text = msgInput.value.trim();
    if (!text || isWaiting) return;

    isWaiting = true;
    msgInput.value = '';
    updateSend();
    appendUser(text);

    try {
      const result = await EDITH_API.preprocess(text, 'desktop_session_001');
      appendAI(result);
      setStatus(true);
    } catch (e) {
      appendError(e.message);
      setStatus(false);
    } finally {
      isWaiting = false;
      updateSend();
    }
  }

  function updateSend() {
    var active = msgInput.value.trim().length > 0 && !isWaiting;
    btnSend.disabled = !active;
    btnSend.classList.toggle('active', active);
  }

  msgInput.addEventListener('input', updateSend);
  msgInput.addEventListener('keydown', function (e) {
    if (e.key === 'Enter') { e.preventDefault(); send(); }
  });
  btnSend.addEventListener('click', send);

  // -- Mode Switching
  function setMode(mode) {
    currentMode = mode;
    app.className = 'mode-' + mode;
    
    segNormal.classList.toggle('active', mode === 'normal');
    segAgent.classList.toggle('active', mode === 'agent');
    
    if (mode === 'agent') {
      modeLabel.textContent = 'Agentic RAG Mode Active';
      msgInput.placeholder  = 'Ask Agent EDITH to research...';
    } else {
      modeLabel.textContent = 'Chat with EDITH';
      msgInput.placeholder  = 'Message EDITH...';
    }
  }

  segNormal.addEventListener('click', () => setMode('normal'));
  segAgent.addEventListener('click', () => setMode('agent'));

  // Boot
  (async function boot() {
    const online = await EDITH_API.checkHealth();
    setStatus(online);
    msgInput.focus();
  })();

})();
