/* ═══════════════════════════════════════════════════
   admin-security.js — Sécurité complète
   localStorage uniquement (compatible Hostinger)
   ═══════════════════════════════════════════════════ */

const Security = (() => {

  const MAX_ATTEMPTS    = 5;
  const LOCKOUT_MS      = 5 * 60 * 1000;   // 5 min
  const SESSION_MS      = 30 * 60 * 1000;  // 30 min
  const MIN_PW_LENGTH   = 10;

  const K = {
    userHash:  'eq_auth_user',
    passHash:  'eq_auth_pass',
    username:  'eq_auth_name',
    attempts:  'eq_auth_attempts',
    lockout:   'eq_auth_lockout',
    sessionTk: 'eq_session_token',
    sessionEx: 'eq_session_expires',
    log:       'eq_security_log',
  };

  /* ── SHA-256 natif ── */
  async function sha256(text) {
    const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
    return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2,'0')).join('');
  }

  function randToken() {
    const a = new Uint8Array(32);
    crypto.getRandomValues(a);
    return Array.from(a).map(b => b.toString(16).padStart(2,'0')).join('');
  }

  function ls(key, val) {
    if (val === undefined) { try { return localStorage.getItem(key); } catch { return null; } }
    try { localStorage.setItem(key, val); } catch {}
  }

  /* ── Init credentials par défaut ── */
  async function init() {
    if (!ls(K.userHash)) ls(K.userHash, await sha256('admin'));
    if (!ls(K.passHash)) ls(K.passHash, await sha256('Equally@2025!'));
    if (!ls(K.username)) ls(K.username, 'Admin');
  }

  /* ── Lockout ── */
  function isLockedOut() { return Date.now() < parseInt(ls(K.lockout)||'0', 10); }
  function getLockoutRemaining() { return Math.max(0, Math.ceil((parseInt(ls(K.lockout)||'0',10) - Date.now()) / 1000)); }
  function getAttempts() { return parseInt(ls(K.attempts)||'0', 10); }
  function incAttempts() { const n = getAttempts()+1; ls(K.attempts, n); return n; }
  function resetAttempts() { localStorage.removeItem(K.attempts); localStorage.removeItem(K.lockout); }

  /* ── Session ── */
  function createSession() {
    const tk = randToken();
    ls(K.sessionTk, tk);
    ls(K.sessionEx, Date.now() + SESSION_MS);
    return tk;
  }
  function refreshSession() { if (isSessionValid()) ls(K.sessionEx, Date.now() + SESSION_MS); }
  function isSessionValid() {
    return !!ls(K.sessionTk) && Date.now() < parseInt(ls(K.sessionEx)||'0', 10);
  }
  function destroySession() {
    localStorage.removeItem(K.sessionTk);
    localStorage.removeItem(K.sessionEx);
  }
  function getSessionRemaining() { return Math.max(0, Math.floor((parseInt(ls(K.sessionEx)||'0',10) - Date.now())/1000)); }

  /* ── Login ── */
  async function login(username, password, honeypot) {
    if (honeypot && honeypot.trim()) {
      addLog('BOT','Honeypot déclenché','warn');
      await delay(2000);
      return { ok:false, reason:'Identifiants incorrects.' };
    }
    if (isLockedOut()) {
      return { ok:false, reason:`Compte bloqué. Réessayez dans ${Math.ceil(getLockoutRemaining()/60)} min.`, locked:true };
    }
    if (!username || !password) return { ok:false, reason:'Tous les champs sont requis.' };

    const attempts = getAttempts();
    if (attempts > 0) await delay(Math.min(attempts * 600, 3000));

    const [uH, pH] = await Promise.all([sha256(username.trim()), sha256(password)]);
    const storedU  = ls(K.userHash);
    const storedP  = ls(K.passHash);

    if (uH === storedU && pH === storedP) {
      resetAttempts();
      createSession();
      addLog('LOGIN','Connexion réussie','ok');
      return { ok:true };
    }

    const n = incAttempts();
    addLog('ECHEC',`Tentative ${n}/${MAX_ATTEMPTS}`,'warn');
    if (n >= MAX_ATTEMPTS) {
      ls(K.lockout, Date.now() + LOCKOUT_MS);
      addLog('BLOCAGE',`Compte bloqué 5 min`,'err');
      return { ok:false, reason:'Trop de tentatives. Compte bloqué 5 minutes.', locked:true };
    }
    return { ok:false, reason:`Identifiants incorrects. (${n}/${MAX_ATTEMPTS})` };
  }

  /* ── Changer mot de passe ── */
  async function changePassword(current, newPw, confirm) {
    if (await sha256(current) !== ls(K.passHash)) return { ok:false, reason:'Mot de passe actuel incorrect.' };
    if (newPw.length < MIN_PW_LENGTH) return { ok:false, reason:`Minimum ${MIN_PW_LENGTH} caractères.` };
    if (newPw !== confirm) return { ok:false, reason:'Les mots de passe ne correspondent pas.' };
    if (!/[A-Z]/.test(newPw)||!/[a-z]/.test(newPw)||!/[0-9]/.test(newPw)||!/[^A-Za-z0-9]/.test(newPw))
      return { ok:false, reason:'Doit contenir maj, min, chiffre et symbole.' };
    ls(K.passHash, await sha256(newPw));
    addLog('SECURITE','Mot de passe modifié','ok');
    return { ok:true };
  }

  async function changeUsername(val) {
    const clean = val.trim();
    if (clean.length < 3) return { ok:false, reason:'Minimum 3 caractères.' };
    ls(K.userHash, await sha256(clean));
    ls(K.username, clean);
    addLog('SECURITE',`Identifiant → ${clean}`,'ok');
    return { ok:true };
  }

  /* ── Sanitize ── */
  function sanitize(str) {
    return String(str||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
      .replace(/"/g,'&quot;').replace(/'/g,'&#x27;').replace(/\//g,'&#x2F;').trim();
  }
  function sanitizeDisplay(str) {
    const d = document.createElement('div');
    d.appendChild(document.createTextNode(String(str||'')));
    return d.innerHTML;
  }

  /* ── Force mot de passe ── */
  function getPasswordStrength(pw) {
    if (!pw) return { level:0, label:'', cls:'' };
    let s = 0;
    if (pw.length>=8) s++; if (pw.length>=12) s++;
    if (/[A-Z]/.test(pw)) s++; if (/[a-z]/.test(pw)) s++;
    if (/[0-9]/.test(pw)) s++; if (/[^A-Za-z0-9]/.test(pw)) s++;
    if (s<=2) return { level:1, label:'Faible',  cls:'strength-weak'   };
    if (s<=4) return { level:2, label:'Moyen',   cls:'strength-medium' };
    return            { level:3, label:'Fort',    cls:'strength-strong' };
  }

  /* ── Journal ── */
  function addLog(type, msg, level) {
    const logs = JSON.parse(ls(K.log)||'[]');
    logs.unshift({ type, msg, level:level||'info', time: new Date().toLocaleTimeString('fr-FR') });
    if (logs.length > 60) logs.pop();
    ls(K.log, JSON.stringify(logs));
  }
  function getLogs() { return JSON.parse(ls(K.log)||'[]'); }
  function getUsername() { return ls(K.username) || 'Admin'; }

  function delay(ms) { return new Promise(r => setTimeout(r, ms)); }

  return {
    init, login, isSessionValid, refreshSession, destroySession,
    getSessionRemaining, changePassword, changeUsername,
    sanitize, sanitizeDisplay, getPasswordStrength,
    addLog, getLogs, getUsername,
    isLockedOut, getLockoutRemaining, SESSION_MS,
  };
})();

window.Security = Security;
