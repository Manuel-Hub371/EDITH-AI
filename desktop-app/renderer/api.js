/* ============================================================
   EDITH — Minimal Intent API Service
   Connects to FastAPI at http://localhost:8001
   ============================================================ */

const EDITH_API = (function () {
  'use strict';

  var BASE_URL = 'http://localhost:8001';

  // ── REST helper ──────────────────────────────────────────
  async function request(method, path, body) {
    var opts = {
      method: method,
      headers: { 'Content-Type': 'application/json' },
    };
    if (body) opts.body = JSON.stringify(body);
    
    try {
      var resp = await fetch(BASE_URL + path, opts);
      if (!resp.ok) {
        var err = await resp.json().catch(function () { return {}; });
        throw new Error(err.detail || err.error || ('HTTP ' + resp.status));
      }
      return resp.json();
    } catch (e) {
      console.error('[EDITH_API] Request failed:', e);
      throw e;
    }
  }

  // ── Chat API (primary) ────────────────────────────────────
  async function chat(message, session_id) {
    return request('POST', '/chat', { 
      user_input: message, 
      session_id: session_id || 'desktop_session_001' 
    });
  }

  // ── Preprocess alias (keeps backward compat) ─────────────
  async function preprocess(message, session_id) {
    return chat(message, session_id);
  }

  // ── State retrieval ───────────────────────────────────────
  async function getState(session_id) {
    return request('GET', '/state/' + (session_id || 'desktop_session_001'));
  }

  // ── Health check ─────────────────────────────────────────
  async function checkHealth() {
    try {
      var resp = await fetch(BASE_URL + '/health');
      return resp.ok;
    } catch (e) {
      return false;
    }
  }

  // ── Public API ────────────────────────────────────────────
  return {
    chat:        chat,
    preprocess:  preprocess,
    getState:    getState,
    checkHealth: checkHealth
  };

})();
