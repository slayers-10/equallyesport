/* admin.js — Dashboard Equally Esport — MySQL/PHP */

/* ── Déclarations anticipées (pour les onclick HTML inline) ── */
var saveSocials, toggleMaintenance, renderLoginHistory;

/* ── Token global ── */
let TOKEN = localStorage.getItem('eq_admin_token') || '';
let CURRENT_ROLE = localStorage.getItem('eq_admin_role') || 'admin';
let CURRENT_USERNAME = localStorage.getItem('eq_admin_username') || '';
let CURRENT_USER_ID = localStorage.getItem('eq_admin_user_id') || '';

/* ── API helpers ── */
async function GET(endpoint) {
    const r = await fetch('api/'+endpoint, {
        headers: { 'X-Admin-Token': TOKEN }
    });
    const j = await r.json();
    if (!j.ok) throw new Error(j.error||'Erreur API');
    return j.data;
}
async function POST(endpoint, data) {
    const r = await fetch('api/'+endpoint, {
        method:'POST',
        headers:{'Content-Type':'application/json','X-Admin-Token':TOKEN},
        body:JSON.stringify(data)
    });
    const j = await r.json();
    if (!j.ok) throw new Error(j.error||'Erreur API');
    return j.data;
}
async function DEL(endpoint, id) {
    const r = await fetch('api/'+endpoint+'?id='+encodeURIComponent(id), {
        method:'DELETE',
        headers:{'X-Admin-Token':TOKEN}
    });
    const j = await r.json();
    if (!j.ok) throw new Error(j.error||'Erreur API');
    return j.data;
}
async function UPLOAD(endpoint, file, context) {
    const fd = new FormData();
    fd.append('file', file);
    if (context) fd.append('context', context);
    const r = await fetch('api/'+endpoint, {
        method:'POST',
        headers:{'X-Admin-Token':TOKEN},
        body:fd
    });
    const j = await r.json();
    if (!j.ok) throw new Error(j.error||'Erreur upload');
    return j.data;
}

/* ── DOM helpers ── */
const $ = id => document.getElementById(id);
const val = id => $(id)?.value?.trim()||'';
const setVal = (id,v) => { const e=$(id); if(e) e.value=v??''; };
const setText = (id,v) => { const e=$(id); if(e) e.textContent=v??''; };
const san = v => Security.sanitize(String(v||''));
function safe(str) {
    const d=document.createElement('div');
    d.appendChild(document.createTextNode(String(str||'')));
    return d.innerHTML;
}
function showForm(id){ const e=$(id); if(e){e.style.display='block';e.scrollIntoView({behavior:'smooth',block:'start'});}}
function hideForm(id){ const e=$(id); if(e) e.style.display='none'; }
function emptyState(msg){ return `<p style="color:#555;padding:2rem;text-align:center">${msg}</p>`; }
function toast(msg,type){
    type=type||'info';
    const c=$('toast-container'); if(!c) return;
    const t=document.createElement('div');
    t.className='toast toast-'+type;
    t.innerHTML=`<span>${{success:'✅',error:'❌',info:'ℹ️'}[type]||'ℹ️'}</span><span>${safe(msg)}</span>`;
    c.appendChild(t);
    setTimeout(()=>{t.classList.add('fade-out');setTimeout(()=>t.remove(),300);},3500);
}

/* États édition */
let editTeamId=null, editResultId=null, editNewsId=null, editAchId=null, editPartnerId=null;

/* ════════════════════════════════════
   INIT
════════════════════════════════════ */
document.addEventListener('DOMContentLoaded', async () => {

    /* Toggle password */
    $('toggle-pass')?.addEventListener('click',()=>{
        const i=$('login-pass'); if(i) i.type=i.type==='password'?'text':'password';
    });

    /* Compteur textarea */
    $('nf-summary')?.addEventListener('input',function(){ setText('nf-char-count',this.value.length); });

    /* Color picker */
    $('tf-color')?.addEventListener('input',function(){ setVal('tf-color-hex',this.value); });
    $('tf-color-hex')?.addEventListener('input',function(){
        if(/^#[0-9A-Fa-f]{6}$/.test(this.value)) setVal('tf-color',this.value);
    });

    /* Modal clic extérieur */
    $('confirm-modal')?.addEventListener('click',function(e){ if(e.target===this) closeModal(); });

    /* ── LOGIN ── */
    $('login-form')?.addEventListener('submit', async e => {
        e.preventDefault();
        const btn=$('login-btn'), errEl=$('login-error');
        errEl.classList.remove('show');
        btn.disabled=true; btn.textContent='⏳ Connexion…';

        try {
            const r = await fetch('api/auth.php',{
                method:'POST',
                headers:{'Content-Type':'application/json'},
                body:JSON.stringify({username:val('login-user'), password:val('login-pass'), _hp:val('hp-field')})
            });
            const j = await r.json();

            if (j.ok && j.token) {
                TOKEN = j.token;
                CURRENT_ROLE = j.role || 'admin';
                CURRENT_USERNAME = j.username || '';
                CURRENT_USER_ID = j.user_id != null ? String(j.user_id) : '';
                localStorage.setItem('eq_admin_token',  TOKEN);
                localStorage.setItem('eq_token_expires', j.expires);
                localStorage.setItem('eq_admin_role', CURRENT_ROLE);
                localStorage.setItem('eq_admin_username', CURRENT_USERNAME);
                localStorage.setItem('eq_admin_user_id', CURRENT_USER_ID);
                Security.addLog('LOGIN','Connexion réussie','ok');
                $('login-screen').style.opacity='0';
                setTimeout(initDashboard, 350);
            } else {
                errEl.textContent = j.error||'Erreur de connexion.';
                errEl.classList.add('show');
                btn.disabled=false;
                btn.innerHTML='<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/><polyline points="10 17 15 12 10 7"/><line x1="15" y1="12" x2="3" y2="12"/></svg> Accéder au panneau';
                if (r.status===429) { btn.disabled=true; startLockout(); }
            }
        } catch(ex) {
            errEl.textContent='Impossible de joindre le serveur.';
            errEl.classList.add('show');
            btn.disabled=false;
            btn.textContent='Accéder au panneau';
        }
    });

    setTimeout(()=>$('login-user')?.focus(), 100);

    /* Session déjà valide ? */
    if (Security.isSessionValid()) {
        try {
            const r = await fetch('api/verify.php',{headers:{'X-Admin-Token':TOKEN}});
            const j = await r.json();
            if (j.ok) { initDashboard(); return; }
            // Si verify échoue on reste sur le login, on ne déconnecte pas
        } catch {
            // Erreur réseau/serveur — on reste sur login
        }
    }
    localStorage.removeItem('eq_admin_token');
    localStorage.removeItem('eq_token_expires');
    localStorage.removeItem('eq_admin_role');
    localStorage.removeItem('eq_admin_username');
    localStorage.removeItem('eq_admin_user_id');
    TOKEN=''; CURRENT_ROLE='admin'; CURRENT_USERNAME=''; CURRENT_USER_ID='';
});

function startLockout() {
    let sec=300;
    const d=$('lockout-display'); if(d) d.style.display='block';
    const iv=setInterval(()=>{
        sec--;
        if(sec<=0){
            clearInterval(iv); if(d) d.style.display='none';
            const b=$('login-btn'); if(b){b.disabled=false;b.textContent='Accéder au panneau';}
        } else if(d) d.textContent=`Déblocage dans ${Math.floor(sec/60)}:${String(sec%60).padStart(2,'0')}`;
    },1000);
}

/* ════════════════════════════════════
   DASHBOARD
════════════════════════════════════ */
async function initDashboard() {
    // S'assurer que TOKEN est bien chargé depuis localStorage
    if (!TOKEN) TOKEN = localStorage.getItem('eq_admin_token') || '';
    $('login-screen').style.display='none';
    $('admin-screen').style.display='block';

    const name=Security.getUsername();
    setText('sidebar-name',name);
    setText('sidebar-avatar',name.charAt(0).toUpperCase());
    setVal('sec-username',name);

    /* Nav sidebar */
    document.querySelectorAll('.sidebar-link[data-panel]').forEach(link=>{
        link.addEventListener('click',()=>{
            document.querySelectorAll('.sidebar-link').forEach(l=>l.classList.remove('active'));
            document.querySelectorAll('.admin-panel').forEach(p=>p.classList.remove('active'));
            link.classList.add('active');
            const panel=link.dataset.panel;
            $('panel-'+panel)?.classList.add('active');
            setText('topbar-title',link.textContent.trim());
            if (panel === 'site-visits') { startSiteVisitsAutoRefresh(); } else { stopSiteVisitsAutoRefresh(); }
            if (panel === 'login-history') { startLoginHistoryAutoRefresh(); } else { stopLoginHistoryAutoRefresh(); }
            if (typeof renderPanel === 'function') renderPanel(panel);
        });
    });

    /* Timer session — démarre seulement si on a un token valide */
    const tEl=$('session-countdown');
    let sessionExpired=false;
    setInterval(()=>{
        if(sessionExpired) return;
        const expires=parseInt(localStorage.getItem('eq_token_expires')||'0',10);
        if(!expires || !TOKEN) return; // Pas encore connecté
        const rem=Math.max(0, expires - Math.floor(Date.now()/1000));
        if(tEl){ tEl.textContent=`${Math.floor(rem/60)}:${String(rem%60).padStart(2,'0')}`; tEl.style.color=rem<120?'#ff9800':''; }
        if(rem<=0){ sessionExpired=true; toast('Session expirée.','error'); setTimeout(logout,2000); }
    },1000);

    /* Heartbeat — vérifie activement toutes les 15s que la session n'a pas été révoquée
       à distance (ex: quelqu'un a cliqué "Déconnecter" sur cet appareil depuis Sécurité).
       Sans ça, la personne ne s'en rendrait compte qu'au prochain clic (erreur passive). */
    setInterval(async ()=>{
        if(sessionExpired || !TOKEN) return;
        try{
            const r = await fetch('api/verify.php',{headers:{'X-Admin-Token':TOKEN}});
            if(!r.ok){
                sessionExpired = true;
                toast('Ta session a été terminée à distance.','error');
                setTimeout(logout, 1500);
            }
        }catch(e){ /* erreur réseau ponctuelle : on ne déconnecte pas pour ça */ }
    }, 15000);

    Security.addLog('SESSION','Dashboard ouvert','ok');
    applyRoleRestrictions();
    renderPanel('dashboard');
}

// Masque les sections du menu et de l'UI que le rôle courant n'est pas autorisé à voir.
// Rappel : ceci n'est qu'un confort visuel. La vraie sécurité est appliquée côté serveur
// (require_permission) — même si quelqu'un forçait l'affichage, les appels API seraient refusés.
function applyRoleRestrictions() {
    if (CURRENT_ROLE === 'admin') return; // rien à cacher

    const adminOnlyPanels = ['partners', 'socials', 'maintenance', 'site-visits', 'login-history', 'trash', 'newsletter'];
    adminOnlyPanels.forEach(p => {
        document.querySelector(`.sidebar-link[data-panel="${p}"]`)?.style.setProperty('display', 'none');
    });

    $('card-manage-accounts')?.style.setProperty('display', 'none');
    $('card-manage-sessions')?.style.setProperty('display', 'none');
}

async function renderPanel(p) {
    const panels = {
        dashboard:       () => renderDashboard(),
        teams:           () => renderTeams(),
        staff:           () => renderStaff(),
        games:           () => renderGames(),
        results:         () => renderResults(),
        news:            () => renderNews(),
        achievements:    () => renderAchievements(),
        partners:        () => renderPartners(),
        tournaments:     () => renderTournaments(),
        applications:    () => renderApplications(),
        feed:            () => renderFeed(),
        notes:           () => renderNotes(),
        maintenance:     () => renderMaintenance(),
        'site-visits':   () => renderSiteVisits(),
        'login-history': () => renderLoginHistory(),
        trash:           () => renderTrash(),
        newsletter:      () => renderNewsletter(),
        security:        () => renderSecLog()
    };
    if (panels[p]) await panels[p]();
}

/* ════════════════════════════════════
   STATS
════════════════════════════════════ */
async function renderDashboard() {
    try {
        const [teams,results,news,ach]=await Promise.all([GET('teams.php'),GET('results.php'),GET('news.php'),GET('achievements.php')]);
        setText('stat-teams',teams.length);
        setText('stat-results',results.length);
        setText('stat-news',news.length);
        setText('stat-achievements',ach.length);
    } catch(e){ toast('Erreur stats: '+e.message,'error'); }
    const logEl=$('recent-activity');
    if(logEl){
        const logs=Security.getLogs().slice(0,8);
        logEl.innerHTML=logs.length
            ? logs.map(l=>`<div class="log-entry"><span class="log-time">${safe(l.time)}</span> <span class="log-${l.level}">[${safe(l.type)}]</span> ${safe(l.msg)}</div>`).join('')
            : '<div style="color:#333;font-family:var(--font-mono);font-size:.75rem">Aucune activité.</div>';
    }
}

/* ════════════════════════════════════
   GESTION JEUX (BDD)
════════════════════════════════════ */

// Charge les jeux depuis la BDD et remplit tous les selects
async function loadGames(selectedValue) {
    try {
        const games = await GET('games.php');

        // Remplir tous les selects de jeux
        const selects = ['tf-game', 'rf-game'];
        selects.forEach(id => {
            const sel = $(id);
            if (!sel) return;
            const current = selectedValue !== undefined ? selectedValue : sel.value;
            sel.innerHTML = '<option value="">— Choisir —</option>';
            games.forEach(g => {
                const opt = document.createElement('option');
                opt.value = g.name;
                opt.textContent = g.name;
                sel.appendChild(opt);
            });
            if (current) sel.value = current;
        });

        // Remplir la liste dans la modal
        const listEl = $('games-list-modal');
        if (listEl) {
            if (!games.length) {
                listEl.innerHTML = '<p style="color:#444;font-size:.8rem;padding:.5rem">Aucun jeu.</p>';
            } else {
                listEl.innerHTML = games.map(g => `
                    <div style="display:flex;align-items:center;justify-content:space-between;padding:0.4rem 0.5rem;border-bottom:1px solid rgba(255,255,255,0.04)">
                        <div style="display:flex;align-items:center;gap:0.6rem">
                            <span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:${safe(g.color)}"></span>
                            <span style="font-size:.85rem">${safe(g.name)}</span>
                        </div>
                        <button onclick="deleteGame('${safe(g.id)}','${safe(g.name)}')"
                            style="background:rgba(139,0,0,0.3);border:1px solid rgba(139,0,0,0.5);border-radius:4px;color:#ff6666;width:26px;height:26px;cursor:pointer;font-size:.8rem;display:flex;align-items:center;justify-content:center;">
                            🗑
                        </button>
                    </div>`).join('');
            }
        }

        return games;
    } catch(e) {
        toast('Erreur chargement jeux: '+e.message,'error');
        return [];
    }
}

async function openAddGameModal() {
    const modal = $('add-game-modal');
    if (modal) modal.style.display = 'flex';
    setVal('new-game-name','');
    setVal('new-game-icon','');
    setVal('new-game-color','#E5000A');
    setVal('new-game-color-hex','#E5000A');
    await refreshGamesList();
    setTimeout(()=>$('new-game-name')?.focus(), 100);
}

function closeAddGameModal() {
    const modal = $('add-game-modal');
    if (modal) modal.style.display = 'none';
}

async function refreshGamesList() {
    const listEl = $('games-list-modal');
    if (!listEl) return;
    try {
        // Admin voit tous les jeux (actifs + inactifs)
        const games = await GET('games.php?admin=1');
        if (!games.length) {
            listEl.innerHTML = '<p style="color:#444;font-size:.8rem;padding:.5rem">Aucun jeu.</p>';
            return;
        }
        listEl.innerHTML = games.map(g => `
            <div style="display:flex;align-items:center;justify-content:space-between;padding:0.5rem;border-bottom:1px solid rgba(255,255,255,0.04)">
                <div style="display:flex;align-items:center;gap:0.6rem;flex:1">
                    <span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:${safe(g.color)}"></span>
                    <span style="font-size:.85rem;${!g.active?'color:#555;text-decoration:line-through':''}">${safe(g.name)}</span>
                </div>
                <div style="display:flex;align-items:center;gap:0.5rem">
                    <!-- Toggle actif/inactif -->
                    <button onclick="toggleGame('${safe(g.id)}','${safe(g.name)}',${g.active})"
                        title="${g.active ? 'Désactiver' : 'Activer'}"
                        style="background:${g.active?'rgba(0,200,83,0.15)':'rgba(255,255,255,0.05)'};border:1px solid ${g.active?'rgba(0,200,83,0.4)':'rgba(255,255,255,0.1)'};border-radius:4px;color:${g.active?'#00c853':'#555'};padding:3px 8px;cursor:pointer;font-size:.7rem;font-family:var(--font-mono);transition:all .2s">
                        ${g.active ? '✅ Actif' : '⛔ Inactif'}
                    </button>
                    <button onclick="deleteGame('${safe(g.id)}','${safe(g.name)}')"
                        style="background:rgba(139,0,0,0.3);border:1px solid rgba(139,0,0,0.5);border-radius:4px;color:#ff6666;width:28px;height:28px;cursor:pointer;font-size:.8rem;display:flex;align-items:center;justify-content:center;">
                        🗑
                    </button>
                </div>
            </div>`).join('');
    } catch(e) {
        listEl.innerHTML = '<p style="color:#aa4444;font-size:.8rem;padding:.5rem">Erreur chargement.</p>';
    }
}

async function toggleGame(id, name, currentActive) {
    try {
        await POST('games.php', { id, active: !currentActive });
        toast(`"${name}" ${!currentActive ? 'activé ✅' : 'désactivé ⛔'}`, 'success');
        Security.addLog('CRUD', `Jeu ${!currentActive?'activé':'désactivé'}: ${name}`, 'ok');
        await refreshGamesList();
        // Recharger les selects
        await loadGames($('tf-game')?.value || '');
    } catch(e) { toast(e.message, 'error'); }
}

async function saveNewGame() {
    const name  = san(val('new-game-name'));
    const icon  = san(val('new-game-icon')) || name.slice(0,3).toUpperCase();
    const color = val('new-game-color') || '#E5000A';

    if (!name) { toast('Nom du jeu requis.','error'); return; }

    try {
        await POST('games.php', {name, icon, color, active: true});
        toast(`"${name}" ajouté ✅`,'success');
        Security.addLog('CRUD',`Nouveau jeu: ${name}`,'ok');
        await refreshGamesList();
        await loadGames(name);
        const tfGame = $('tf-game');
        if (tfGame) tfGame.value = name;
        setVal('new-game-name','');
        setVal('new-game-icon','');
        setVal('new-game-color','#E5000A');
        setVal('new-game-color-hex','#E5000A');
    } catch(e) { toast(e.message,'error'); }
}

async function deleteGame(id, name) {
    if (!confirm(`Supprimer définitivement "${name}" ?`)) return;
    try {
        await DEL('games.php', id);
        toast(`"${name}" supprimé.`,'success');
        await refreshGamesList();
        await loadGames('');
    } catch(e) { toast(e.message,'error'); }
}

// Fermer modal au clic extérieur
document.addEventListener('DOMContentLoaded', () => {
    $('add-game-modal')?.addEventListener('click', function(e) {
        if (e.target === this) closeAddGameModal();
    });
    initPartnerLogoDropzone();
    initNewsImageDropzone();
    initStaffPhotoDropzone();
});


function setStaffPhotoPreview(url){
    const prev=$('sf-photo-preview');
    const clearBtn=$('sf-photo-clear-btn');
    if(prev){
        prev.innerHTML = url
            ? `<img src="${url.startsWith('http')||url.startsWith('data:')?url:'../'+url}" alt="" style="max-width:100%;max-height:100px;object-fit:contain;pointer-events:none"/>`
            : `<div class="logo-dropzone-empty">
                 <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/></svg>
                 <span>Glisse une photo ici ou <u>clique pour parcourir</u></span>
                 <small>PNG, JPG ou WEBP — 2 Mo max</small>
               </div>`;
    }
    if(clearBtn) clearBtn.style.display = url ? 'inline-flex' : 'none';
}

function clearStaffPhoto(){
    setVal('sf-photo-url','');
    const f=$('sf-photo-file'); if(f) f.value='';
    setText('sf-photo-status','');
    setStaffPhotoPreview('');
}

async function uploadStaffPhotoFile(file){
    if(!file) return;
    if(!/^image\/(png|jpeg|webp)$/.test(file.type)){ toast('Format non supporté (PNG, JPG ou WEBP uniquement).','error'); return; }
    if(file.size > 2*1024*1024){ toast('Fichier trop volumineux (2 Mo max).','error'); return; }
    setText('sf-photo-status','Envoi en cours…');
    try{
        const data=await UPLOAD('upload.php',file,'roster');
        setVal('sf-photo-url',data.url);
        setStaffPhotoPreview(data.url);
        setText('sf-photo-status','✅ Photo envoyée');
    }catch(e){
        toast(e.message,'error');
        setText('sf-photo-status','');
    }
}

async function handleStaffPhotoUpload(evt){
    await uploadStaffPhotoFile(evt.target.files[0]);
}

function initStaffPhotoDropzone(){
    const zone=$('sf-photo-dropzone');
    if(!zone || zone.dataset.dndInit) return;
    zone.dataset.dndInit='1';
    ['dragenter','dragover'].forEach(evtName=>{
        zone.addEventListener(evtName, e=>{ e.preventDefault(); e.stopPropagation(); zone.classList.add('dragover'); });
    });
    ['dragleave','dragend'].forEach(evtName=>{
        zone.addEventListener(evtName, e=>{ e.preventDefault(); e.stopPropagation(); zone.classList.remove('dragover'); });
    });
    zone.addEventListener('drop', e=>{
        e.preventDefault(); e.stopPropagation();
        zone.classList.remove('dragover');
        const file = e.dataTransfer?.files?.[0];
        if(file) uploadStaffPhotoFile(file);
    });
}

let staffCache = [];
let editStaffId = null;

async function renderStaff() {
    const el = $('staff-list-admin');
    if (!el) return;
    el.innerHTML = '<p style="color:#555;padding:1rem">Chargement…</p>';
    try {
        const staff = await GET('staff.php');
        staffCache = staff;
        if (!staff.length) { el.innerHTML = emptyState('Aucun membre du staff pour le moment.'); return; }

        el.innerHTML = `<table class="a-table">
            <thead><tr><th>Nom</th><th>Rôle</th><th>Arrivée</th><th style="text-align:right">Actions</th></tr></thead>
            <tbody>
                ${staff.map(s => `<tr>
                    <td style="font-size:.88rem;color:#fff"><strong>${safe(s.name)}</strong></td>
                    <td><span class="a-badge a-badge-red">${safe(s.role)}</span></td>
                    <td style="font-size:.78rem;color:#666">${safe(s.joined_date||'—')}</td>
                    <td class="actions" style="text-align:right">
                        <button class="a-btn secondary" onclick="editStaffMember('${safe(s.id)}')">✏️</button>
                        <button class="a-btn danger" onclick="deleteStaffMember('${safe(s.id)}','${safe(s.name)}')">🗑</button>
                    </td>
                </tr>`).join('')}
            </tbody>
        </table>`;
    } catch(e) { el.innerHTML = emptyState('Erreur.'); toast(e.message,'error'); }
}

function editStaffMember(id) {
    const s = staffCache.find(x => x.id === id);
    if (!s) return;
    editStaffId = id;
    setVal('sf-id', id);
    setVal('sf-name', s.name);
    setVal('sf-role', s.role);
    setVal('sf-birthdate', s.birthdate || '');
    setVal('sf-joined', s.joined_date || '');
    setVal('sf-twitter', s.twitter || '');
    setVal('sf-bio', s.bio || '');
    setVal('sf-photo-url', s.photo_url || '');
    setStaffPhotoPreview(s.photo_url || '');
    setText('sf-title', `Modifier "${s.name}"`);
    $('sf-cancel-btn').style.display = 'inline-flex';
    $('sf-name')?.scrollIntoView({behavior:'smooth', block:'center'});
}

function clearStaffForm() {
    editStaffId = null;
    ['sf-name','sf-role','sf-birthdate','sf-joined','sf-twitter','sf-bio'].forEach(id => setVal(id,''));
    setVal('sf-id','');
    clearStaffPhoto();
    setText('sf-title', 'Nouveau membre du staff');
    $('sf-cancel-btn').style.display = 'none';
}

async function saveStaffMember() {
    const name = san(val('sf-name'));
    const role = san(val('sf-role'));
    if (!name) { toast('Le nom est requis.','error'); return; }
    if (!role) { toast('Le rôle est requis.','error'); return; }
    try {
        await POST('staff.php', {
            id: editStaffId || '',
            name, role,
            birthdate: val('sf-birthdate') || null,
            joined_date: val('sf-joined') || null,
            twitter: san(val('sf-twitter')),
            bio: san(val('sf-bio')),
            photo_url: val('sf-photo-url') || '',
        });
        toast(`"${name}" enregistré ✅`,'success');
        Security.addLog('CRUD', `Staff: ${name}`, 'ok');
        clearStaffForm();
        renderStaff();
    } catch(e) { toast(e.message,'error'); }
}

async function deleteStaffMember(id, name) {
    if (!confirm(`Retirer "${name}" du staff ?`)) return;
    try {
        await DEL('staff.php', id);
        toast(`"${name}" retiré.`,'success');
        renderStaff();
    } catch(e) { toast(e.message,'error'); }
}

let gamesCache = [];
let editGameId = null;

async function renderGames() {
    const el = $('games-list-admin');
    if (!el) return;
    el.innerHTML = '<p style="color:#555;padding:1rem">Chargement…</p>';
    try {
        const games = await GET('games.php?admin=1');
        gamesCache = games;
        await loadGames(); // rafraîchit aussi les <select> du formulaire équipe

        if (!games.length) { el.innerHTML = emptyState('Aucun jeu/catégorie pour le moment.'); return; }

        el.innerHTML = `<table class="a-table">
            <thead><tr><th>Couleur</th><th>Nom</th><th>Statut</th><th style="text-align:right">Actions</th></tr></thead>
            <tbody>
                ${games.map(g => `<tr>
                    <td><span style="display:inline-block;width:20px;height:20px;border-radius:6px;background:${safe(g.color)};border:1px solid rgba(255,255,255,.15)"></span></td>
                    <td style="font-size:.88rem;color:#fff"><strong>${safe(g.name)}</strong></td>
                    <td>${g.active ? '<span class="a-badge a-badge-win">Actif</span>' : '<span class="a-badge a-badge-red">Masqué</span>'}</td>
                    <td class="actions" style="text-align:right">
                        <button class="a-btn secondary" onclick="editGame('${safe(g.id)}')">✏️</button>
                        <button class="a-btn danger" onclick="deleteGame('${safe(g.id)}','${safe(g.name)}')">🗑</button>
                    </td>
                </tr>`).join('')}
            </tbody>
        </table>`;
    } catch(e) { el.innerHTML = emptyState('Erreur.'); toast(e.message,'error'); }
}

function editGame(id) {
    const g = gamesCache.find(x => x.id === id);
    if (!g) return;
    editGameId = id;
    setVal('gf-id', id);
    setVal('gf-name', g.name);
    setVal('gf-color', g.color || '#e5000a');
    const activeEl = $('gf-active'); if (activeEl) activeEl.checked = !!g.active;
    setText('gf-title', `Modifier "${g.name}"`);
    $('gf-cancel-btn').style.display = 'inline-flex';
    document.getElementById('gf-name')?.scrollIntoView({behavior:'smooth', block:'center'});
}

function clearGameForm() {
    editGameId = null;
    setVal('gf-id',''); setVal('gf-name',''); setVal('gf-color','#e5000a');
    const activeEl = $('gf-active'); if (activeEl) activeEl.checked = true;
    setText('gf-title', 'Nouveau jeu / catégorie');
    $('gf-cancel-btn').style.display = 'none';
}

async function saveGame() {
    const name = san(val('gf-name'));
    if (!name) { toast('Le nom est requis.','error'); return; }
    const icon = name.slice(0,3).toUpperCase();
    const color = val('gf-color') || '#e5000a';
    const active = $('gf-active')?.checked ?? true;
    try {
        await POST('games.php', { id: editGameId || '', name, icon, color, active });
        toast(`"${name}" enregistré ✅`,'success');
        Security.addLog('CRUD', `Jeu/catégorie: ${name}`, 'ok');
        clearGameForm();
        renderGames();
    } catch(e) { toast(e.message,'error'); }
}

async function deleteGame(id, name) {
    if (!confirm(`Supprimer "${name}" ? Les équipes déjà créées avec cette catégorie ne seront pas supprimées, mais le filtre disparaîtra du site.`)) return;
    try {
        await DEL('games.php', id);
        toast(`"${name}" supprimé.`,'success');
        renderGames();
    } catch(e) { toast(e.message,'error'); }
}

async function renderTeams() {
    // Charger les jeux dans le select
    await loadGames();

    const el=$('teams-list-admin'); if(!el) return;
    el.innerHTML='<p style="color:#555;padding:1rem">Chargement…</p>';
    try {
        const teams=await GET('teams.php');
        if(!teams.length){el.innerHTML=emptyState('Aucune équipe.');return;}
        el.innerHTML=`<table class="a-table"><thead><tr><th>Équipe</th><th>Jeu</th><th>Joueurs</th><th>Actions</th></tr></thead><tbody>
        ${teams.map(t=>`<tr>
            <td><strong>${safe(t.teamName)}</strong></td>
            <td><span class="a-badge a-badge-red">${safe(t.game)}</span></td>
            <td style="font-family:var(--font-mono);font-size:.75rem;color:#666">${(t.players||[]).length} joueur(s)</td>
            <td class="actions">
                <button class="a-btn secondary" onclick="editTeam('${safe(t.id)}')">✏️ Modifier</button>
                <button class="a-btn danger" onclick="confirmDel('team','${safe(t.id)}','${safe(t.teamName)}')">🗑</button>
            </td></tr>`).join('')}</tbody></table>`;
    } catch(e){el.innerHTML=emptyState('Erreur.');toast(e.message,'error');}
}

function addPlayerRow(pseudo, role, country, twitter, twitch, youtube, age, numero, category, agent, birthdate, joined_date, bio, photo_url) {
    const b = $('players-builder'); if (!b) return;
    const row = document.createElement('div');
    row.className = 'player-row-admin';
    row.style.cssText = 'display:grid;grid-template-columns:1fr 1fr;gap:.5rem;margin-bottom:.75rem;padding:.75rem;background:rgba(255,255,255,0.02);border-radius:6px;border:1px solid rgba(255,255,255,0.05)';
    row.innerHTML = `
        <div style="grid-column:1/-1;display:flex;gap:.5rem;align-items:center;flex-wrap:wrap">
            <input class="a-input player-pseudo" type="text" placeholder="Pseudo *" value="${safe(pseudo||'')}" maxlength="30" style="flex:2;min-width:100px"/>
            <input class="a-input player-role" type="text" placeholder="Rôle (Duelist…)" value="${safe(role||'')}" maxlength="30" style="flex:2;min-width:100px"/>
            <select class="a-input player-category" style="flex:1;min-width:100px">
              <option value="player" ${(!category||category==='player')?'selected':''}>Joueur</option>
              <option value="coach"   ${category==='coach'?'selected':''}>Coach</option>
              <option value="manager" ${category==='manager'?'selected':''}>Manager</option>
              <option value="analyst" ${category==='analyst'?'selected':''}>Analyste</option>
            </select>
            <button type="button" onclick="this.closest('.player-row-admin').remove()" style="background:rgba(139,0,0,.3);border:1px solid rgba(139,0,0,.5);border-radius:4px;color:#ff6666;width:34px;height:34px;display:flex;align-items:center;justify-content:center;cursor:pointer;flex-shrink:0">✕</button>
        </div>

        <div style="grid-column:1/-1">
            <label class="a-label">📸 Photo</label>
            <div class="player-photo-dropzone logo-dropzone" style="min-height:70px;padding:.5rem">
                <div class="player-photo-preview logo-dropzone-content">
                    ${photo_url
                        ? `<img src="../${safe(photo_url)}" alt="" style="max-width:100%;max-height:64px;object-fit:contain;pointer-events:none"/>`
                        : `<div class="logo-dropzone-empty" style="font-size:.68rem">
                             <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/></svg>
                             <span>Glisse une photo ou <u>clique</u></span>
                           </div>`}
                </div>
                <input type="file" class="player-photo-file" accept="image/png,image/jpeg,image/webp" style="display:none"/>
            </div>
            <input type="hidden" class="player-photo-url" value="${safe(photo_url||'')}"/>
        </div>

        <div>
            <label class="a-label">🌍 Pays (code 2 lettres)</label>
            <input class="a-input player-country" type="text" placeholder="FR, BE…" value="${safe(country||'')}" maxlength="2" style="text-transform:uppercase"/>
        </div>
        <div>
            <label class="a-label">🎂 Date de naissance</label>
            <input class="a-input player-birthdate" type="date" value="${safe(birthdate||'')}"/>
        </div>
        <div>
            <label class="a-label">🔢 Numéro</label>
            <input class="a-input player-numero" type="number" placeholder="7" value="${safe(numero||'')}" min="1"/>
        </div>
        <div>
            <label class="a-label">📅 Arrivée chez Equally</label>
            <input class="a-input player-joined" type="date" value="${safe(joined_date||'')}"/>
        </div>
        <div>
            <label class="a-label">🐦 Twitter/X (pseudo)</label>
            <input class="a-input player-twitter" type="text" placeholder="pseudo_twitter" value="${safe(twitter||'')}" maxlength="50"/>
        </div>
        <div>
            <label class="a-label">💜 Twitch (pseudo)</label>
            <input class="a-input player-twitch" type="text" placeholder="pseudo_twitch" value="${safe(twitch||'')}" maxlength="50"/>
        </div>
        <div style="grid-column:1/-1">
            <label class="a-label">▶️ YouTube (pseudo)</label>
            <input class="a-input player-youtube" type="text" placeholder="pseudo_youtube" value="${safe(youtube||'')}" maxlength="50"/>
        </div>
        <div style="grid-column:1/-1">
            <label class="a-label">📝 Mini description</label>
            <textarea class="a-input player-bio" placeholder="Quelques mots sur cette personne..." maxlength="400" rows="2" style="resize:vertical">${safe(bio||'')}</textarea>
        </div>`;
    b.appendChild(row);
    row.querySelector('.player-pseudo')?.focus();
    initPlayerPhotoDropzone(row);
}

function initPlayerPhotoDropzone(row) {
    const zone   = row.querySelector('.player-photo-dropzone');
    const fileEl = row.querySelector('.player-photo-file');
    const urlEl  = row.querySelector('.player-photo-url');
    const preview = row.querySelector('.player-photo-preview');
    if (!zone) return;

    const setPreview = (url) => {
        urlEl.value = url || '';
        preview.innerHTML = url
            ? `<img src="${url.startsWith('http')?url:'../'+url}" alt="" style="max-width:100%;max-height:64px;object-fit:contain;pointer-events:none"/>`
            : `<div class="logo-dropzone-empty" style="font-size:.68rem">
                 <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/></svg>
                 <span>Glisse une photo ou <u>clique</u></span>
               </div>`;
    };

    const doUpload = async (file) => {
        if (!file) return;
        if (!/^image\/(png|jpeg|webp)$/.test(file.type)) { toast('Format non supporté (PNG, JPG ou WEBP).','error'); return; }
        if (file.size > 2*1024*1024) { toast('Fichier trop volumineux (2 Mo max).','error'); return; }
        preview.innerHTML = '<div style="font-size:.68rem;color:#555">Envoi…</div>';
        try {
            const data = await UPLOAD('upload.php', file, 'roster');
            setPreview(data.url);
        } catch(e) { toast(e.message,'error'); setPreview(urlEl.value); }
    };

    zone.addEventListener('click', () => fileEl.click());
    fileEl.addEventListener('change', e => doUpload(e.target.files[0]));
    ['dragenter','dragover'].forEach(evt => zone.addEventListener(evt, e => { e.preventDefault(); e.stopPropagation(); zone.classList.add('dragover'); }));
    ['dragleave','dragend'].forEach(evt => zone.addEventListener(evt, e => { e.preventDefault(); e.stopPropagation(); zone.classList.remove('dragover'); }));
    zone.addEventListener('drop', e => {
        e.preventDefault(); e.stopPropagation();
        zone.classList.remove('dragover');
        doUpload(e.dataTransfer?.files?.[0]);
    });
}

function clearTeamForm(){
    editTeamId=null;
    setVal('tf-game','');setVal('tf-name','');setVal('tf-color','#E5000A');setVal('tf-color-hex','');
    const b=$('players-builder');if(b)b.innerHTML='';
    setText('team-form-title','Nouvelle équipe');
}

async function editTeam(id){
    try{
        const teams=await GET('teams.php');
        const t=teams.find(x=>x.id===id);if(!t)return;
        editTeamId=id;
        setVal('tf-game',t.game);setVal('tf-name',t.teamName);
        setVal('tf-color',t.gameColor||'#E5000A');setVal('tf-color-hex',t.gameColor||'');
        const b=$('players-builder');if(b)b.innerHTML='';
        (t.players||[]).forEach(p=>addPlayerRow(p.pseudo, p.role, p.country, p.twitter, p.twitch, p.youtube, p.age, p.numero, p.category, p.agent, p.birthdate, p.joined_date, p.bio, p.photo_url));
        setText('team-form-title',"Modifier l'équipe");showForm('team-form');
    }catch(e){toast(e.message,'error');}
}

async function saveTeam(){
    const game=san(val('tf-game')),name=san(val('tf-name'));
    if(!game||!name){toast('Jeu et nom requis.','error');return;}
    const icon=game.slice(0,3).toUpperCase();
    const color=val('tf-color')||'#E5000A';
    const players=Array.from(document.querySelectorAll('#players-builder .player-row-admin')).map(r=>({
        pseudo:    san(r.querySelector('.player-pseudo')?.value),
        role:      san(r.querySelector('.player-role')?.value),
        category:  r.querySelector('.player-category')?.value || 'player',
        country:   san(r.querySelector('.player-country')?.value?.toUpperCase()),
        numero:    r.querySelector('.player-numero')?.value || null,
        twitter:   san(r.querySelector('.player-twitter')?.value),
        twitch:    san(r.querySelector('.player-twitch')?.value),
        youtube:   san(r.querySelector('.player-youtube')?.value),
        birthdate:   r.querySelector('.player-birthdate')?.value || null,
        joined_date: r.querySelector('.player-joined')?.value || null,
        bio:         san(r.querySelector('.player-bio')?.value),
        photo_url:   r.querySelector('.player-photo-url')?.value || '',
    })).filter(p=>p.pseudo);
    try{
        await POST('teams.php',{id:editTeamId||'',game,teamName:name,gameIcon:icon,gameColor:color,players});
        toast(editTeamId?`"${name}" mis à jour ✅`:`"${name}" créée ✅`,'success');
        Security.addLog('CRUD',`Équipe: ${name}`,'ok');
        hideForm('team-form');
        clearTeamForm();
        await renderTeams(); // Refresh automatique de la liste
        renderDashboard();
    }catch(e){toast(e.message,'error');}
}

/* ════════════════════════════════════
   RÉSULTATS
════════════════════════════════════ */
async function renderResults(){
    await loadGames();
    const el=$('results-list-admin');if(!el)return;
    el.innerHTML='<p style="color:#555;padding:1rem">Chargement…</p>';
    try{
        const rows=await GET('results.php');
        if(!rows.length){el.innerHTML=emptyState('Aucun résultat.');return;}
        el.innerHTML=`<div style="overflow-x:auto"><table class="a-table"><thead><tr><th>Match</th><th>Score</th><th>Jeu</th><th>Tournoi</th><th>Date</th><th>Résultat</th><th>Actions</th></tr></thead><tbody>
        ${rows.map(r=>`<tr>
            <td><strong>Equally</strong> vs ${safe(r.opponent)}</td>
            <td style="font-family:var(--font-mono);font-weight:600">${safe(r.scoreUs)} — ${safe(r.scoreThem)}</td>
            <td><span class="a-badge a-badge-red">${safe(r.game)}</span></td>
            <td style="font-size:.8rem;color:#888">${safe(r.tournament)}</td>
            <td style="font-family:var(--font-mono);font-size:.75rem;color:#666">${safe(r.date)}</td>
            <td><span class="a-badge ${r.result==='win'?'a-badge-win':'a-badge-loss'}">${r.result==='win'?'Victoire':'Défaite'}</span></td>
            <td class="actions">
                <button class="a-btn secondary" onclick="editResult('${safe(r.id)}')">✏️</button>
                <button class="a-btn danger" onclick="confirmDel('result','${safe(r.id)}','vs ${safe(r.opponent)}')">🗑</button>
            </td></tr>`).join('')}</tbody></table></div>`;
    }catch(e){el.innerHTML=emptyState('Erreur.');toast(e.message,'error');}
}

function clearResultForm(){
    editResultId=null;
    ['rf-game','rf-opponent','rf-tournament','rf-score-us','rf-score-them','rf-date'].forEach(id=>setVal(id,''));
    setVal('rf-result','win');setText('result-form-title','Nouveau résultat');
}

async function editResult(id){
    try{
        const rows=await GET('results.php');
        const r=rows.find(x=>x.id===id);if(!r)return;
        editResultId=id;
        setVal('rf-game',r.game);setVal('rf-opponent',r.opponent);setVal('rf-tournament',r.tournament);
        setVal('rf-score-us',r.scoreUs);setVal('rf-score-them',r.scoreThem);setVal('rf-date',r.date);setVal('rf-result',r.result||'win');
        setText('result-form-title','Modifier le résultat');showForm('result-form');
    }catch(e){toast(e.message,'error');}
}

async function saveResult(){
    const game=san(val('rf-game')),opponent=san(val('rf-opponent')),tournament=san(val('rf-tournament'));
    if(!game||!opponent||!tournament){toast('Jeu, adversaire et tournoi requis.','error');return;}
    try{
        await POST('results.php',{id:editResultId||'',game,opponent,tournament,
            scoreUs:parseInt(val('rf-score-us')||'0',10),scoreThem:parseInt(val('rf-score-them')||'0',10),
            date:val('rf-date')||new Date().toISOString().slice(0,10),result:val('rf-result')||'win'});
        toast('Résultat enregistré ✅','success');
        Security.addLog('CRUD',`Résultat: vs ${opponent}`,'ok');
        hideForm('result-form');clearResultForm();renderResults();renderDashboard();
    }catch(e){toast(e.message,'error');}
}

/* ════════════════════════════════════
   ACTUALITÉS
════════════════════════════════════ */
function setNewsImagePreview(url){
    const prev=$('nf-image-preview');
    const clearBtn=$('nf-image-clear-btn');
    if(prev){
        prev.innerHTML = url
            ? `<img src="${url.startsWith('http')||url.startsWith('data:')?url:url}" alt="" style="max-width:100%;max-height:140px;object-fit:contain;pointer-events:none" />`
            : `<div class="logo-dropzone-empty">
                 <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/></svg>
                 <span>Glisse une image ici ou <u>clique pour parcourir</u></span>
                 <small>PNG, JPG ou WEBP — 2 Mo max — format paysage recommandé</small>
               </div>`;
    }
    if(clearBtn) clearBtn.style.display = url ? 'inline-flex' : 'none';
}

function clearNewsImage(){
    setVal('nf-image-url','');
    const f=$('nf-image-file'); if(f) f.value='';
    setText('nf-image-status','');
    setNewsImagePreview('');
}

async function uploadNewsImageFile(file){
    if(!file) return;
    if(!/^image\/(png|jpeg|webp)$/.test(file.type)){
        toast('Format non supporté (PNG, JPG ou WEBP uniquement).','error');
        return;
    }
    if(file.size > 2*1024*1024){ toast('Fichier trop volumineux (2 Mo max).','error'); return; }
    setText('nf-image-status','Envoi en cours…');
    try{
        const data=await UPLOAD('upload.php',file,'news');
        setVal('nf-image-url',data.url);
        setNewsImagePreview(data.url);
        setText('nf-image-status','✅ Image envoyée');
    }catch(e){
        toast(e.message,'error');
        setText('nf-image-status','');
    }
}

async function handleNewsImageUpload(evt){
    const file=evt.target.files[0];
    await uploadNewsImageFile(file);
}

function initNewsImageDropzone(){
    const zone=$('nf-image-dropzone');
    if(!zone || zone.dataset.dndInit) return;
    zone.dataset.dndInit='1';
    ['dragenter','dragover'].forEach(evtName=>{
        zone.addEventListener(evtName, e=>{
            e.preventDefault(); e.stopPropagation();
            zone.classList.add('dragover');
        });
    });
    ['dragleave','dragend'].forEach(evtName=>{
        zone.addEventListener(evtName, e=>{
            e.preventDefault(); e.stopPropagation();
            zone.classList.remove('dragover');
        });
    });
    zone.addEventListener('drop', e=>{
        e.preventDefault(); e.stopPropagation();
        zone.classList.remove('dragover');
        const file = e.dataTransfer?.files?.[0];
        if(file) uploadNewsImageFile(file);
    });
}

async function renderNews(){
    const el=$('news-list-admin');if(!el)return;
    el.innerHTML='<p style="color:#555;padding:1rem">Chargement…</p>';
    try{
        const rows=await GET('news.php');
        if(!rows.length){el.innerHTML=emptyState('Aucune actualité.');return;}
        el.innerHTML=`<table class="a-table"><thead><tr><th>Image</th><th>Titre</th><th>Catégorie</th><th>Date</th><th>Actions</th></tr></thead><tbody>
        ${rows.map(n=>`<tr>
            <td>${n.image_url?`<img src="../${safe(n.image_url)}" alt="" style="width:48px;height:32px;object-fit:cover;border-radius:4px">`:`<div style="width:48px;height:32px;border-radius:4px;background:rgba(255,255,255,.04);display:flex;align-items:center;justify-content:center;font-size:.8rem">📰</div>`}</td>
            <td style="max-width:300px;font-size:.85rem">${safe(n.title)}</td>
            <td><span class="a-badge a-badge-red">${safe(n.category)}</span></td>
            <td style="font-family:var(--font-mono);font-size:.75rem;color:#666">${safe(n.date)}</td>
            <td class="actions">
                <button class="a-btn secondary" onclick="editNews('${safe(n.id)}')">✏️ Modifier</button>
                <button class="a-btn secondary" onclick="sendNewsToNewsletter('${safe(n.id)}','${safe((n.title||'').replace(/'/g,"\\'"))}')" title="Envoyer cette actu aux abonnés newsletter">📧</button>
                <button class="a-btn danger" onclick="confirmDel('news','${safe(n.id)}','${safe((n.title||'').slice(0,25))}')">🗑</button>
            </td></tr>`).join('')}</tbody></table>`;
    }catch(e){el.innerHTML=emptyState('Erreur.');toast(e.message,'error');}
}

async function sendNewsToNewsletter(id, title) {
    if (!confirm(`Envoyer "${title}" par e-mail à tous les abonnés de la newsletter ?`)) return;
    try {
        const data = await POST('newsletter-send.php', { news_id: id });
        toast(`Envoyé à ${data.count} abonné(s) ✅`, 'success');
        Security.addLog('CRUD', `Newsletter envoyée: ${title.slice(0,40)}`, 'ok');
    } catch(e) { toast(e.message, 'error'); }
}

function clearNewsForm(){
    editNewsId=null;
    ['nf-title','nf-summary','nf-date'].forEach(id=>setVal(id,''));
    setVal('nf-category','');setText('nf-char-count','0');setText('news-form-title','Nouvelle actualité');
    clearNewsImage();
}

async function editNews(id){
    try{
        const rows=await GET('news.php');
        const n=rows.find(x=>x.id===id);if(!n)return;
        editNewsId=id;
        setVal('nf-title',n.title);setVal('nf-category',n.category);setVal('nf-date',n.date);setVal('nf-summary',n.summary);
        setVal('nf-image-url',n.image_url||''); setNewsImagePreview(n.image_url ? '../'+n.image_url : '');
        setText('nf-char-count',(n.summary||'').length);setText('news-form-title',"Modifier l'actualité");showForm('news-form');
    }catch(e){toast(e.message,'error');}
}

async function saveNews(){
    const title=san(val('nf-title')),category=san(val('nf-category')),summary=san(val('nf-summary'));
    if(!title||!category||!summary){toast('Titre, catégorie et résumé requis.','error');return;}
    try{
        await POST('news.php',{id:editNewsId||'',title,category,summary,image_url:val('nf-image-url')||'',date:val('nf-date')||new Date().toISOString().slice(0,10)});
        toast('Actualité publiée ✅','success');
        Security.addLog('CRUD',`Actu: ${title.slice(0,40)}`,'ok');
        hideForm('news-form');clearNewsForm();renderNews();renderDashboard();
    }catch(e){toast(e.message,'error');}
}

/* ════════════════════════════════════
   PALMARÈS
════════════════════════════════════ */
async function renderAchievements(){
    const el=$('achievements-list-admin');if(!el)return;
    el.innerHTML='<p style="color:#555;padding:1rem">Chargement…</p>';
    try{
        const rows=await GET('achievements.php');
        if(!rows.length){el.innerHTML=emptyState('Aucun trophée.');return;}
        el.innerHTML=`<table class="a-table"><thead><tr><th>🏆</th><th>Tournoi</th><th>Jeu</th><th>Année</th><th>Actions</th></tr></thead><tbody>
        ${rows.map(a=>`<tr>
            <td style="font-size:1.3rem">${safe(a.icon)}</td>
            <td><strong>${safe(a.name)}</strong></td>
            <td><span class="a-badge a-badge-red">${safe(a.game)}</span></td>
            <td style="font-family:var(--font-mono);color:var(--color-red)">${safe(a.year)}</td>
            <td class="actions">
                <button class="a-btn secondary" onclick="editAch('${safe(a.id)}')">✏️</button>
                <button class="a-btn danger" onclick="confirmDel('achievement','${safe(a.id)}','${safe(a.name)}')">🗑</button>
            </td></tr>`).join('')}</tbody></table>`;
    }catch(e){el.innerHTML=emptyState('Erreur.');toast(e.message,'error');}
}

function clearAchForm(){
    editAchId=null;
    setVal('af-name','');setVal('af-game','');setVal('af-year','');setVal('af-icon','🏆');
    setText('achievement-form-title','Nouveau trophée');
}

async function editAch(id){
    try{
        const rows=await GET('achievements.php');
        const a=rows.find(x=>x.id===id);if(!a)return;
        editAchId=id;
        setVal('af-name',a.name);setVal('af-game',a.game);setVal('af-year',a.year);setVal('af-icon',a.icon||'🏆');
        setText('achievement-form-title','Modifier le trophée');showForm('achievement-form');
    }catch(e){toast(e.message,'error');}
}

async function saveAchievement(){
    const name=san(val('af-name')),game=san(val('af-game')),year=san(val('af-year')),icon=val('af-icon')||'🏆';
    if(!name||!game||!year){toast('Tous les champs requis.','error');return;}
    try{
        await POST('achievements.php',{id:editAchId||'',name,game,year,icon});
        toast('Trophée enregistré ✅','success');
        Security.addLog('CRUD',`Trophée: ${name}`,'ok');
        hideForm('achievement-form');clearAchForm();renderAchievements();renderDashboard();
    }catch(e){toast(e.message,'error');}
}

/* ════════════════════════════════════
   PARTENAIRES
════════════════════════════════════ */
async function renderNewsletter() {
    const el = $('newsletter-list');
    if (!el) return;
    el.innerHTML = '<div style="color:#444;font-family:var(--font-mono);font-size:.75rem;padding:1rem">Chargement…</div>';
    try {
        const subs = await GET('newsletter.php');
        newsletterCache = subs;
        setText('nl-stat-total', subs.length);

        if (!subs.length) { el.innerHTML = '<div style="color:#333;font-family:var(--font-mono);font-size:.75rem;padding:1rem">Aucun inscrit pour le moment.</div>'; return; }
        el.innerHTML = `<table class="a-table">
            <thead><tr><th>E-mail</th><th>Inscrit le</th><th style="text-align:right">Actions</th></tr></thead>
            <tbody>
                ${subs.map(s => `<tr>
                    <td style="font-size:.85rem;color:#fff">${safe(s.email)}</td>
                    <td style="font-size:.78rem;color:#666">${safe(s.date)}</td>
                    <td class="actions" style="text-align:right">
                        <button class="a-btn danger" onclick="deleteNewsletterSubscriber('${safe(s.id)}','${safe(s.email)}')">🗑</button>
                    </td>
                </tr>`).join('')}
            </tbody>
        </table>`;
    } catch(e) { el.innerHTML = `<div style="color:#cc4444;font-family:var(--font-mono);font-size:.75rem;padding:1rem">Erreur: ${e.message}</div>`; }
}

let newsletterCache = [];

function exportNewsletterCSV() {
    exportToCSV(
        `newsletter_${new Date().toISOString().slice(0,10)}.csv`,
        ['E-mail','Inscrit le'],
        (newsletterCache||[]).map(s => [s.email, s.date])
    );
}

async function deleteNewsletterSubscriber(id, email) {
    if (!confirm(`Désinscrire "${email}" de la newsletter ?`)) return;
    try {
        await DEL('newsletter.php', id);
        toast('Contact désinscrit.','success');
        renderNewsletter();
    } catch(e) { toast(e.message,'error'); }
}

async function renderPartners(){
    const el=$('partners-list-admin');if(!el)return;
    el.innerHTML='<p style="color:#555;padding:1rem">Chargement…</p>';
    try{
        const rows=await GET('partners.php');
        partnersCache = rows;
        if(!rows.length){el.innerHTML=emptyState('Aucun partenaire.');return;}
        const tl={gold:'🥇 Gold',silver:'🥈 Silver',bronze:'🥉 Bronze'};
        el.innerHTML=`<table class="a-table"><thead><tr><th>Logo</th><th>Nom</th><th>Tier</th><th>URL</th><th>Actions</th></tr></thead><tbody>
        ${rows.map(p=>`<tr>
            <td>${p.logo_url?`<img src="../${safe(p.logo_url)}" alt="" onclick="openLogoPreview('${safe(p.id)}')" style="width:36px;height:36px;object-fit:contain;background:rgba(255,255,255,.04);border-radius:6px;padding:2px;cursor:zoom-in" title="Cliquer pour agrandir">`:`<div onclick="openLogoPreview('${safe(p.id)}')" style="width:36px;height:36px;border-radius:6px;background:rgba(255,255,255,.04);display:flex;align-items:center;justify-content:center;font-size:.65rem;color:#666;cursor:zoom-in" title="Cliquer pour agrandir">${safe(p.initials||'')}</div>`}</td>
            <td><strong>${safe(p.name)}</strong></td>
            <td><span class="a-badge a-badge-red">${safe(tl[p.tier]||p.tier)}</span></td>
            <td style="font-size:.75rem;color:#555;max-width:160px;overflow:hidden;text-overflow:ellipsis">${safe(p.url||'—')}</td>
            <td class="actions">
                <button class="a-btn secondary" onclick="editPartner('${safe(p.id)}')">✏️</button>
                <button class="a-btn danger" onclick="confirmDel('partner','${safe(p.id)}','${safe(p.name)}')">🗑</button>
            </td></tr>`).join('')}</tbody></table>`;
    }catch(e){el.innerHTML=emptyState('Erreur.');toast(e.message,'error');}
}

let partnersCache = [];

function openLogoPreview(id){
    const p = partnersCache.find(x=>x.id===id);
    if(!p) return;
    const img=$('logo-preview-img');
    const initialsEl=$('logo-preview-initials');
    if(p.logo_url){
        if(img){ img.src = p.logo_url.startsWith('http')||p.logo_url.startsWith('data:') ? p.logo_url : '../'+p.logo_url; img.style.display=''; }
        if(initialsEl){ initialsEl.style.display='none'; initialsEl.textContent=''; }
    } else {
        if(img){ img.style.display='none'; img.src=''; }
        if(initialsEl){ initialsEl.style.display='flex'; initialsEl.textContent=p.initials||'?'; }
    }
    setText('logo-preview-title', p.name||'—');
    const tl={gold:'🥇 Gold',silver:'🥈 Silver',bronze:'🥉 Bronze'};
    setText('logo-preview-sub', `${tl[p.tier]||p.tier}${p.url?' · '+p.url:''}`);
    $('logo-preview-modal')?.classList.add('show');
}

function closeLogoPreview(){
    $('logo-preview-modal')?.classList.remove('show');
}

function clearPartnerForm(){
    editPartnerId=null;
    setVal('pf-name','');setVal('pf-initials','');setVal('pf-tier','gold');setVal('pf-url','');
    clearPartnerLogo();
    setText('partner-form-title','Nouveau partenaire');
}

function clearPartnerLogo(){
    setVal('pf-logo-url','');
    const f=$('pf-logo-file'); if(f) f.value='';
    setText('pf-logo-status','');
    setPartnerLogoPreview('');
}

function setPartnerLogoPreview(url){
    const prev=$('pf-logo-preview');
    const clearBtn=$('pf-logo-clear-btn');
    if(prev){
        prev.innerHTML = url
            ? `<img src="${url.startsWith('http')||url.startsWith('data:')?url:'../'+url}" alt="" />`
            : `<div class="logo-dropzone-empty">
                 <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
                 <span>Glisse un logo ici ou <u>clique pour parcourir</u></span>
                 <small>PNG, JPG, WEBP ou SVG — 2 Mo max</small>
               </div>`;
    }
    if(clearBtn) clearBtn.style.display = url ? 'inline-flex' : 'none';
}

async function uploadPartnerLogoFile(file){
    if(!file) return;
    if(!/^image\/(png|jpeg|webp|svg\+xml)$/.test(file.type)){
        toast('Format non supporté (PNG, JPG, WEBP ou SVG uniquement).','error');
        return;
    }
    if(file.size > 2*1024*1024){ toast('Fichier trop volumineux (2 Mo max).','error'); return; }
    setText('pf-logo-status','Envoi en cours…');
    try{
        const data=await UPLOAD('upload.php',file);
        setVal('pf-logo-url',data.url);
        setPartnerLogoPreview(data.url);
        setText('pf-logo-status','✅ Logo envoyé');
    }catch(e){
        toast(e.message,'error');
        setText('pf-logo-status','');
    }
}

async function handlePartnerLogoUpload(evt){
    const file=evt.target.files[0];
    await uploadPartnerLogoFile(file);
}

function initPartnerLogoDropzone(){
    const zone=$('pf-logo-dropzone');
    if(!zone || zone.dataset.dndInit) return;
    zone.dataset.dndInit='1';
    ['dragenter','dragover'].forEach(evtName=>{
        zone.addEventListener(evtName, e=>{
            e.preventDefault(); e.stopPropagation();
            zone.classList.add('dragover');
        });
    });
    ['dragleave','dragend'].forEach(evtName=>{
        zone.addEventListener(evtName, e=>{
            e.preventDefault(); e.stopPropagation();
            zone.classList.remove('dragover');
        });
    });
    zone.addEventListener('drop', e=>{
        e.preventDefault(); e.stopPropagation();
        zone.classList.remove('dragover');
        const file = e.dataTransfer?.files?.[0];
        if(file) uploadPartnerLogoFile(file);
    });
}

async function editPartner(id){
    try{
        const rows=await GET('partners.php');
        const p=rows.find(x=>x.id===id);if(!p)return;
        editPartnerId=id;
        setVal('pf-name',p.name);setVal('pf-initials',p.initials);setVal('pf-tier',p.tier||'gold');setVal('pf-url',p.url);
        setVal('pf-logo-url',p.logo_url||'');
        setPartnerLogoPreview(p.logo_url||'');
        setText('pf-logo-status','');
        setText('partner-form-title','Modifier le partenaire');showForm('partner-form');
    }catch(e){toast(e.message,'error');}
}

async function savePartner(){
    const name=san(val('pf-name'));if(!name){toast('Nom requis.','error');return;}
    const initials=san(val('pf-initials'))||name.slice(0,2).toUpperCase();
    const tier=['gold','silver','bronze'].includes(val('pf-tier'))?val('pf-tier'):'bronze';
    const url=san(val('pf-url'));
    const logo_url=val('pf-logo-url');
    try{
        await POST('partners.php',{id:editPartnerId||'',name,initials,logo_url,tier,url});
        toast(`"${name}" enregistré ✅`,'success');
        Security.addLog('CRUD',`Partenaire: ${name}`,'ok');
        hideForm('partner-form');clearPartnerForm();renderPartners();
    }catch(e){toast(e.message,'error');}
}

/* ════════════════════════════════════
   SUPPRESSION
════════════════════════════════════ */
function confirmDel(type,id,label){
    const modal=$('confirm-modal');if(!modal)return;
    const msg=$('modal-msg');if(msg)msg.textContent=`Supprimer "${label}" ? Action irréversible.`;
    modal.classList.add('show');
    const btn=$('modal-confirm-btn');
    if(btn){
        const nb=btn.cloneNode(true);btn.parentNode.replaceChild(nb,btn);
        nb.addEventListener('click',()=>{doDel(type,id,label);closeModal();});
    }
}
function closeModal(){$('confirm-modal')?.classList.remove('show');}

async function doDel(type,id,label){
    const ep={team:'teams.php',result:'results.php',news:'news.php',achievement:'achievements.php',partner:'partners.php',application:'applications.php'}[type];
    if(!ep)return;
    try{
        await DEL(ep,id);
        toast(`"${label}" supprimé.`,'success');
        Security.addLog('CRUD',`Supprimé [${type}]: ${label}`,'warn');
        // Refresh le panel actif
        const active=document.querySelector('.sidebar-link.active')?.dataset?.panel||'dashboard';
        await renderPanel(active);
        renderDashboard();
    }catch(e){toast(e.message,'error');}
}

/* ════════════════════════════════════
   SÉCURITÉ
════════════════════════════════════ */
async function renderUsers() {
    const el = $('users-list');
    if (!el) return;
    if (CURRENT_ROLE !== 'admin') { el.innerHTML = ''; return; }
    el.innerHTML = '<div style="color:#444;font-family:var(--font-mono);font-size:.75rem;padding:.5rem 0">Chargement…</div>';
    try {
        const users = await GET('users.php');

        // Sessions actives pour savoir qui est actuellement connecté
        let onlineIds = new Set();
        let sessionCount = 0;
        try {
            const sessions = await GET('sessions.php');
            sessionCount = sessions.length;
            onlineIds = new Set(sessions.filter(s => s.user_id != null).map(s => String(s.user_id)));
        } catch(e) { /* si ça échoue, on affiche juste sans le statut en ligne */ }

        const sbBadge = $('sidebar-sessions-badge');
        if (sbBadge) { sbBadge.style.display = sessionCount > 0 ? 'flex' : 'none'; sbBadge.textContent = sessionCount; }

        if (!users.length) { el.innerHTML = '<div style="color:#333;font-family:var(--font-mono);font-size:.75rem;padding:.5rem 0">Aucun compte créé pour le moment — seul le mot de passe maître fonctionne.</div>'; return; }
        const roleLabels = { admin: '👑 Admin', manager: '🛠 Manager' };
        el.innerHTML = `<table class="a-table">
            <thead><tr><th>Identifiant</th><th>Rôle</th><th>Créé le</th><th style="text-align:right">Actions</th></tr></thead>
            <tbody>
                ${users.map(u => `<tr>
                    <td style="font-size:.85rem;color:#fff">
                        <strong>${safe(u.username)}</strong>${String(u.id)===CURRENT_USER_ID?' <span style="color:#555;font-size:.7rem">(toi)</span>':''}
                        ${onlineIds.has(String(u.id)) ? '<br><span style="color:#00c853;font-size:.68rem">● session ouverte</span>' : '<br><span style="color:#444;font-size:.68rem">○ pas connecté</span>'}
                    </td>
                    <td>
                        ${String(u.id)===CURRENT_USER_ID
                            ? `<span class="a-badge a-badge-red">${safe(roleLabels[u.role]||u.role)}</span>`
                            : `<select class="a-select" style="font-size:.75rem;padding:.3rem .5rem" onchange="changeUserRole('${safe(u.id)}','${safe(u.username)}',this.value,this)">
                                <option value="manager" ${u.role==='manager'?'selected':''}>🛠 Manager</option>
                                <option value="admin" ${u.role==='admin'?'selected':''}>👑 Admin</option>
                               </select>`}
                    </td>
                    <td style="font-size:.78rem;color:#666">${safe(u.created)}</td>
                    <td class="actions" style="text-align:right">
                        <button class="a-btn danger" onclick="deleteUserAccount('${safe(u.id)}','${safe(u.username)}')" ${String(u.id)===CURRENT_USER_ID?'disabled title="Impossible de supprimer ton propre compte"':''}>🗑</button>
                    </td>
                </tr>`).join('')}
            </tbody>
        </table>`;
    } catch(e) { el.innerHTML = `<div style="color:#cc4444;font-family:var(--font-mono);font-size:.75rem;padding:.5rem 0">Erreur: ${e.message}</div>`; }
}

async function changeUserRole(id, username, newRole, selectEl) {
    if (!confirm(`Changer le rôle de "${username}" en "${newRole === 'admin' ? 'Admin (accès complet)' : 'Manager (accès limité)'}" ?`)) {
        renderUsers(); // annule visuellement en rechargeant l'état réel
        return;
    }
    try {
        await POST('users.php', { action: 'update_role', id, role: newRole });
        toast(`Rôle de "${username}" mis à jour ✅`,'success');
        Security.addLog('CRUD',`Rôle changé: ${username} → ${newRole}`,'ok');
    } catch(e) { toast(e.message,'error'); renderUsers(); }
}

async function createUserAccount() {
    const username = san(val('nu-username'));
    const password = val('nu-password');
    const role = val('nu-role') || 'manager';
    if (!username || username.length < 3) { toast('Identifiant trop court (3 caractères min).','error'); return; }
    if (!password || password.length < 10) { toast('Mot de passe trop court (10 caractères min).','error'); return; }
    try {
        await POST('users.php', { username, password, role });
        toast(`Compte "${username}" créé ✅`,'success');
        Security.addLog('CRUD',`Compte créé: ${username} (${role})`,'ok');
        setVal('nu-username',''); setVal('nu-password','');
        renderUsers();
    } catch(e) { toast(e.message,'error'); }
}

async function deleteUserAccount(id, username) {
    if (!confirm(`Supprimer le compte "${username}" ? Cette personne ne pourra plus se connecter avec son mot de passe (le mot de passe maître reste actif).`)) return;
    try {
        await DEL('users.php', id);
        toast(`Compte "${username}" supprimé.`,'success');
        Security.addLog('CRUD',`Compte supprimé: ${username}`,'warn');
        renderUsers();
    } catch(e) { toast(e.message,'error'); }
}

async function renderSessions() {
    const el = $('sessions-list');
    if (!el) return;
    if (CURRENT_ROLE !== 'admin') { el.innerHTML = ''; return; }
    el.innerHTML = '<div style="color:#444;font-family:var(--font-mono);font-size:.75rem;padding:.5rem 0">Chargement…</div>';
    try {
        const sessions = await GET('sessions.php');
        if (!sessions.length) { el.innerHTML = '<div style="color:#333;font-family:var(--font-mono);font-size:.75rem;padding:.5rem 0">Aucune session active.</div>'; return; }
        const roleLabels = { admin: '👑 Admin', manager: '🛠 Manager' };
        el.innerHTML = `<table class="a-table">
            <thead><tr><th>Utilisateur</th><th>Rôle</th><th>IP</th><th>Localisation</th><th>Appareil</th><th>Connecté le</th><th style="text-align:right">Actions</th></tr></thead>
            <tbody>
                ${sessions.map(s => `<tr>
                    <td style="font-size:.85rem;color:#fff">${safe(s.username||'admin')}${s.is_current?' <span style="color:#00c853;font-size:.68rem">● cette session</span>':''}</td>
                    <td><span class="a-badge a-badge-red">${safe(roleLabels[s.role]||s.role)}</span></td>
                    <td style="font-family:var(--font-mono);font-size:.78rem;color:#ccc">${safe(s.ip)}</td>
                    <td style="font-size:.75rem;color:#999">${safe(s.location||'—')}</td>
                    <td style="font-size:.78rem;color:#666">${safe(parseUserAgent(s.user_agent))}</td>
                    <td style="font-size:.75rem;color:#666">${safe(s.created)}</td>
                    <td class="actions" style="text-align:right">
                        <button class="a-btn danger" onclick="revokeSession('${safe(s.id)}',${s.is_current})">${s.is_current?'Se déconnecter':'Déconnecter'}</button>
                    </td>
                </tr>`).join('')}
            </tbody>
        </table>`;
    } catch(e) { el.innerHTML = `<div style="color:#cc4444;font-family:var(--font-mono);font-size:.75rem;padding:.5rem 0">Erreur: ${e.message}</div>`; }
}

async function revokeSession(id, isCurrent) {
    const msg = isCurrent
        ? 'Ceci va te déconnecter immédiatement de cette session. Continuer ?'
        : 'Déconnecter cet appareil à distance ? La personne devra se reconnecter avec son mot de passe.';
    if (!confirm(msg)) return;
    try {
        await DEL('sessions.php', id);
        if (isCurrent) { logout(); return; }
        toast('Session déconnectée ✅','success');
        Security.addLog('SECURITY','Session distante révoquée','warn');
        renderSessions();
    } catch(e) { toast(e.message,'error'); }
}

async function renderTrash() {
    const el = $('trash-list');
    if (!el) return;
    if (CURRENT_ROLE !== 'admin') { el.innerHTML = '<div style="color:#333;font-family:var(--font-mono);font-size:.75rem;padding:1rem">Accès réservé aux administrateurs.</div>'; return; }
    el.innerHTML = '<div style="color:#444;font-family:var(--font-mono);font-size:.75rem;padding:1rem">Chargement…</div>';
    try {
        const items = await GET('trash.php');
        if (!items.length) { el.innerHTML = '<div style="color:#333;font-family:var(--font-mono);font-size:.75rem;padding:1rem">La corbeille est vide.</div>'; return; }
        const resourceLabels = { news:'📰 Actualité', teams:'🎮 Équipe', results:'📊 Résultat', achievements:'🏆 Palmarès', partners:'🤝 Partenaire', applications:'📝 Candidature', staff:'👤 Staff' };
        el.innerHTML = `<table class="a-table">
            <thead><tr><th>Type</th><th>Élément</th><th>Supprimé par</th><th>Le</th><th style="text-align:right">Actions</th></tr></thead>
            <tbody>
                ${items.map(t => `<tr>
                    <td><span class="a-badge a-badge-red">${safe(resourceLabels[t.resource]||t.resource)}</span></td>
                    <td style="font-size:.85rem;color:#fff">${safe(t.label||'—')}</td>
                    <td style="font-size:.78rem;color:#666">${safe(t.deleted_by||'—')}</td>
                    <td style="font-size:.75rem;color:#666">${safe(t.date)}</td>
                    <td class="actions" style="text-align:right">
                        <button class="a-btn success-btn" onclick="restoreTrashItem('${safe(t.id)}','${safe((t.label||'').slice(0,25))}')">♻ Restaurer</button>
                        <button class="a-btn danger" onclick="permanentlyDeleteTrashItem('${safe(t.id)}','${safe((t.label||'').slice(0,25))}')">🗑 Définitif</button>
                    </td>
                </tr>`).join('')}
            </tbody>
        </table>`;
    } catch(e) { el.innerHTML = `<div style="color:#cc4444;font-family:var(--font-mono);font-size:.75rem;padding:1rem">Erreur: ${e.message}</div>`; }
}

async function restoreTrashItem(id, label) {
    try {
        await POST('trash.php', { id });
        toast(`"${label}" restauré ✅`,'success');
        Security.addLog('CRUD',`Restauré depuis la corbeille: ${label}`,'ok');
        renderTrash();
    } catch(e) { toast(e.message,'error'); }
}

async function permanentlyDeleteTrashItem(id, label) {
    if (!confirm(`Supprimer définitivement "${label}" ? Cette action est irréversible, impossible de revenir en arrière.`)) return;
    try {
        await DEL('trash.php', id);
        toast('Supprimé définitivement.','success');
        renderTrash();
    } catch(e) { toast(e.message,'error'); }
}

function renderSecLog(){
    const el=$('security-log');if(!el)return;
    const logs=Security.getLogs();
    el.innerHTML=logs.length
        ? logs.map(l=>`<div class="log-entry"><span class="log-time">${safe(l.time)}</span> <span class="log-${l.level}">[${safe(l.type)}]</span> ${safe(l.msg)}</div>`).join('')
        : '<div style="color:#333;font-family:var(--font-mono);font-size:.75rem">Aucun événement.</div>';
    renderUsers();
    if (CURRENT_ROLE === 'admin') renderSessions();
}

function checkPasswordStrength(v){
    const bar=$('pw-strength-bar'),lbl=$('pw-strength-label');if(!bar||!lbl)return;
    const s=Security.getPasswordStrength(v);
    bar.className='password-strength '+(s.cls||'');
    lbl.textContent=s.label?`Force : ${s.label}`:'';
    lbl.style.color=s.cls==='strength-strong'?'#00c853':s.cls==='strength-medium'?'#e5a000':'#cc4444';
}

async function changePassword(){
    toast('Pour changer le mot de passe, modifiez ADMIN_SECRET dans api/config.php','info');
}
async function changeUsername(){
    const n=val('sec-username');if(!n)return;
    Security.setUsername(n);
    setText('sidebar-name',n);setText('sidebar-avatar',n.charAt(0).toUpperCase());
    toast('Nom mis à jour ✅','success');
}

/* ════════════════════════════════════
   DÉCONNEXION
════════════════════════════════════ */
function logout(){
    Security.addLog('LOGOUT','Déconnexion','ok');
    Security.destroySession();
    localStorage.removeItem('eq_admin_role');
    localStorage.removeItem('eq_admin_username');
    localStorage.removeItem('eq_admin_user_id');
    TOKEN='';
    window.location.reload();
}

/* ════════════════════════════════════
   EXPOSITION GLOBALE
════════════════════════════════════ */
window.showForm=showForm; window.hideForm=hideForm; window.addPlayerRow=addPlayerRow;
window.openAddGameModal=openAddGameModal; window.closeAddGameModal=closeAddGameModal;
window.saveNewGame=saveNewGame; window.deleteGame=deleteGame; window.toggleGame=toggleGame;
window.clearTeamForm=clearTeamForm; window.editTeam=editTeam; window.saveTeam=saveTeam;
window.clearResultForm=clearResultForm; window.editResult=editResult; window.saveResult=saveResult;
window.clearNewsForm=clearNewsForm; window.editNews=editNews; window.saveNews=saveNews;
window.clearAchForm=clearAchForm; window.editAch=editAch; window.saveAchievement=saveAchievement;
window.clearPartnerForm=clearPartnerForm; window.editPartner=editPartner; window.savePartner=savePartner;
window.handlePartnerLogoUpload=handlePartnerLogoUpload; window.clearPartnerLogo=clearPartnerLogo;
window.handleNewsImageUpload=handleNewsImageUpload; window.clearNewsImage=clearNewsImage;
window.openLogoPreview=openLogoPreview; window.closeLogoPreview=closeLogoPreview;
window.changeUserRole=changeUserRole;
window.renderSessions=renderSessions; window.revokeSession=revokeSession;
window.renderTrash=renderTrash; window.restoreTrashItem=restoreTrashItem; window.permanentlyDeleteTrashItem=permanentlyDeleteTrashItem;
window.confirmDel=confirmDel; window.closeModal=closeModal;
window.checkPasswordStrength=checkPasswordStrength; window.changePassword=changePassword; window.changeUsername=changeUsername;
window.logout=logout;
window.saveSocials=saveSocials; window.toggleMaintenance=toggleMaintenance;
window.renderUsers=renderUsers; window.createUserAccount=createUserAccount; window.deleteUserAccount=deleteUserAccount;

/* ════════════════════════════════════
   TOURNOIS
════════════════════════════════════ */
let editingTournamentId = null;

let tournamentsCache = [];
let tournamentsView = 'list';
let calendarMonth = new Date().getMonth();
let calendarYear = new Date().getFullYear();

async function renderTournaments() {
    const el = $('tournaments-list-admin'); if (!el) return;
    el.innerHTML = '<p style="color:#555;padding:1rem">Chargement…</p>';
    try {
        // Récupère tous les tournois (passés et futurs) via API GET sans filtre
        const r = await fetch('api/tournaments.php?admin=1&ts='+Date.now(), {headers:{'X-Admin-Token':TOKEN}});
        const j = await r.json();
        const rows = j.ok ? j.data : [];
        tournamentsCache = rows;

        if (!rows.length) { el.innerHTML = emptyState('Aucun tournoi planifié.'); renderTournamentsCalendar(); return; }

        el.innerHTML = `<table class="a-table">
          <thead><tr><th>Tournoi</th><th>Jeu</th><th>Date</th><th>Lieu</th><th>Actions</th></tr></thead>
          <tbody>${rows.map(t => {
            let dateStr = ''; try { dateStr = new Date(t.date).toLocaleDateString('fr-FR',{day:'numeric',month:'long',year:'numeric',hour:'2-digit',minute:'2-digit'}); } catch {}
            const isPast = new Date(t.date) < new Date();
            return `<tr style="${isPast?'opacity:.5':''}">
              <td><strong>${safe(t.name)}</strong>${isPast?'<span style="font-size:.7rem;color:#555;margin-left:.5rem">(passé)</span>':''}</td>
              <td><span class="a-badge a-badge-red">${safe(t.game||'—')}</span></td>
              <td style="font-family:var(--font-mono);font-size:.75rem;color:#666">${dateStr}</td>
              <td style="font-size:.8rem;color:#888">${safe(t.location||'En ligne')}</td>
              <td class="actions">
                <button class="a-btn secondary" onclick="editTournament('${safe(t.id)}')">✏️</button>
                <button class="a-btn danger" onclick="confirmDel('tournament','${safe(t.id)}','${safe(t.name)}')">🗑</button>
              </td>
            </tr>`;
          }).join('')}</tbody>
        </table>`;
        renderTournamentsCalendar();
    } catch(e) { el.innerHTML = emptyState('Erreur.'); toast(e.message,'error'); }
}

function switchTournamentsView(view) {
    tournamentsView = view;
    $('tournaments-list-admin').style.display = view === 'list' ? 'block' : 'none';
    $('tournaments-calendar').style.display = view === 'calendar' ? 'block' : 'none';
    $('tv-btn-list')?.classList.toggle('active-view', view === 'list');
    $('tv-btn-calendar')?.classList.toggle('active-view', view === 'calendar');
    $('tv-btn-list').style.borderColor = view === 'list' ? 'var(--color-red)' : '';
    $('tv-btn-calendar').style.borderColor = view === 'calendar' ? 'var(--color-red)' : '';
    if (view === 'calendar') renderTournamentsCalendar();
}

function changeCalendarMonth(delta) {
    calendarMonth += delta;
    if (calendarMonth > 11) { calendarMonth = 0; calendarYear++; }
    if (calendarMonth < 0)  { calendarMonth = 11; calendarYear--; }
    renderTournamentsCalendar();
}

function renderTournamentsCalendar() {
    const el = $('tournaments-calendar');
    if (!el) return;

    const monthNames = ['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre'];
    const dayNames = ['Lun','Mar','Mer','Jeu','Ven','Sam','Dim'];

    // Grouper les tournois par jour (clé YYYY-MM-DD, heure locale)
    const byDay = {};
    tournamentsCache.forEach(t => {
        const d = new Date(t.date);
        const key = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
        (byDay[key] = byDay[key] || []).push(t);
    });

    const firstOfMonth = new Date(calendarYear, calendarMonth, 1);
    const startOffset = (firstOfMonth.getDay() + 6) % 7; // lundi = 0
    const daysInMonth = new Date(calendarYear, calendarMonth+1, 0).getDate();
    const today = new Date();
    const todayKey = `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}-${String(today.getDate()).padStart(2,'0')}`;

    let cells = '';
    for (let i = 0; i < startOffset; i++) cells += `<div></div>`;
    for (let day = 1; day <= daysInMonth; day++) {
        const key = `${calendarYear}-${String(calendarMonth+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
        const events = byDay[key] || [];
        const isToday = key === todayKey;
        cells += `<div style="min-height:76px;border:1px solid rgba(255,255,255,.05);border-radius:6px;padding:.4rem;${isToday?'border-color:var(--color-red);background:rgba(229,0,10,.05)':''}">
            <div style="font-size:.72rem;color:${isToday?'var(--color-red)':'#666'};font-weight:${isToday?'700':'400'};margin-bottom:.3rem">${day}</div>
            ${events.slice(0,3).map(t => `
                <div onclick="editTournament('${safe(t.id)}')" title="${safe(t.name)}" style="font-size:.62rem;background:rgba(229,0,10,.15);color:#ff8a8a;padding:1px 5px;border-radius:4px;margin-bottom:2px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;cursor:pointer">${safe(t.name)}</div>
            `).join('')}
            ${events.length > 3 ? `<div style="font-size:.6rem;color:#555">+${events.length-3} autre(s)</div>` : ''}
        </div>`;
    }

    el.innerHTML = `
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:1rem">
            <button class="a-btn secondary" onclick="changeCalendarMonth(-1)" style="padding:.3rem .7rem">←</button>
            <div style="font-family:var(--font-display);font-style:italic;font-weight:700;text-transform:uppercase;font-size:1.05rem">${monthNames[calendarMonth]} ${calendarYear}</div>
            <button class="a-btn secondary" onclick="changeCalendarMonth(1)" style="padding:.3rem .7rem">→</button>
        </div>
        <div style="display:grid;grid-template-columns:repeat(7,1fr);gap:4px;margin-bottom:6px">
            ${dayNames.map(d => `<div style="text-align:center;font-size:.65rem;color:#555;font-family:var(--font-mono);text-transform:uppercase">${d}</div>`).join('')}
        </div>
        <div style="display:grid;grid-template-columns:repeat(7,1fr);gap:4px">${cells}</div>
    `;
}

function clearTournamentForm() {
    editingTournamentId = null;
    setVal('tf2-name',''); setVal('tf2-game',''); setVal('tf2-date',''); setVal('tf2-location','');
    setText('tournament-form-title','Nouveau tournoi');
}

async function editTournament(id) {
    try {
        const r = await fetch('api/tournaments.php?admin=1&ts='+Date.now(), {headers:{'X-Admin-Token':TOKEN}});
        const j = await r.json();
        const t = (j.ok ? j.data : []).find(x => x.id === id);
        if (!t) return;
        editingTournamentId = id;
        setVal('tf2-name',     t.name);
        setVal('tf2-game',     t.game || '');
        setVal('tf2-date',     (t.date||'').replace(' ','T').slice(0,16));
        setVal('tf2-location', t.location || '');
        setText('tournament-form-title','Modifier le tournoi');
        showForm('tournament-form');
    } catch(e) { toast(e.message,'error'); }
}

async function saveTournament() {
    const name     = san(val('tf2-name'));
    const game     = san(val('tf2-game'));
    const date     = val('tf2-date');
    const location = san(val('tf2-location')) || 'En ligne';

    if (!name || !date) { toast('Nom et date requis.','error'); return; }

    try {
        await POST('tournaments.php', {id: editingTournamentId||'', name, game, date, location});
        toast(editingTournamentId ? 'Tournoi mis à jour ✅' : 'Tournoi ajouté ✅','success');
        Security.addLog('CRUD', `Tournoi: ${name}`, 'ok');
        hideForm('tournament-form');
        clearTournamentForm();
        renderTournaments();
    } catch(e) { toast(e.message,'error'); }
}

// Ajouter tournaments dans le renderPanel et les fonctions globales
const _origRenderPanel = window.renderPanel || function(){};
window.renderPanel = async function(p) {
    if (p === 'tournaments') { await renderTournaments(); return; }
    // Appelle l'original
    const panels = {
        dashboard: renderDashboard, teams: renderTeams, results: renderResults,
        news: renderNews, achievements: renderAchievements, partners: renderPartners,
        applications: renderApplications, feed: renderFeed, notes: renderNotes,
        maintenance: renderMaintenance, 'site-visits': renderSiteVisits,
        'login-history': renderLoginHistory, security: renderSecLog, socials: renderSocials, trash: renderTrash, newsletter: renderNewsletter, games: renderGames, staff: renderStaff
    };
    if (panels[p]) await panels[p]();
};

// Ajouter dans doDelete
const _origDoDel = window.doDel;
window.doDel = async function(type, id, label) {
    if (type === 'tournament') {
        try {
            await DEL('tournaments.php', id);
            toast(`"${label}" supprimé.`,'success');
            Security.addLog('CRUD',`Supprimé [tournament]: ${label}`,'warn');
            renderTournaments();
        } catch(e) { toast(e.message,'error'); }
        return;
    }
    if (_origDoDel) await _origDoDel(type, id, label);
};

window.clearTournamentForm = clearTournamentForm;
window.editTournament      = editTournament;
window.saveTournament      = saveTournament;
window.switchTournamentsView = switchTournamentsView;
window.changeCalendarMonth   = changeCalendarMonth;

/* ════════════════════════════════════
   FEED D'ACTIVITÉ — preview admin
════════════════════════════════════ */
async function loadFeedPreview() {
    const el = $('feed-preview');
    if (!el) return;
    el.innerHTML = '<span style="color:#555">Chargement…</span>';
    try {
        const [results, news, ach] = await Promise.all([
            GET('results.php'), GET('news.php'), GET('achievements.php')
        ]);
        const entries = [];
        const safe2 = s => { const d=document.createElement('div'); d.appendChild(document.createTextNode(String(s||''))); return d.innerHTML; };

        results.forEach(r => {
            let ds=''; try{ds=new Date(r.date).toLocaleDateString('fr-FR',{day:'2-digit',month:'2-digit',year:'2-digit'});}catch{}
            entries.push({date:r.date,ds,type:r.result,tag:r.result==='win'?'[WIN]':'[LOSS]',color:r.result==='win'?'#00c853':'#cc4444',
                msg:`Equally ${safe2(r.scoreUs)}-${safe2(r.scoreThem)} vs ${safe2(r.opponent)} · ${safe2(r.game)}`});
        });
        news.forEach(n => {
            let ds=''; try{ds=new Date(n.date).toLocaleDateString('fr-FR',{day:'2-digit',month:'2-digit',year:'2-digit'});}catch{}
            entries.push({date:n.date,ds,type:'news',tag:'[NEWS]',color:'#4fc3f7',msg:safe2(n.title)});
        });
        ach.forEach(a => entries.push({date:a.year+'-01-01',ds:a.year,type:'trophy',tag:'[TROPHY]',color:'#ffd700',msg:`${safe2(a.icon)} ${safe2(a.name)} · ${safe2(a.game)}`}));

        entries.sort((a,b)=>new Date(b.date)-new Date(a.date));

        el.innerHTML = entries.slice(0,8).map(e=>`
            <div style="display:grid;grid-template-columns:65px 80px 1fr;gap:.5rem;padding:.35rem 0;border-bottom:1px solid rgba(255,255,255,.03)">
                <span style="color:#333">${safe2(e.ds)}</span>
                <span style="color:${e.color};font-weight:700">${safe2(e.tag)}</span>
                <span style="color:#777">${safe2(e.msg)}</span>
            </div>`).join('') + `<div style="color:#333;margin-top:.5rem">$ <span style="display:inline-block;width:6px;height:12px;background:var(--color-red);animation:none"></span></div>`;
    } catch(e) { el.innerHTML = `<span style="color:#cc4444">Erreur: ${e.message}</span>`; }
}

async function renderFeed() {
    await loadFeedPreview();
}

window.loadFeedPreview = loadFeedPreview;

/* ════════════════════════════════════
   DASHBOARD AMÉLIORÉ
════════════════════════════════════ */
async function renderDashboard() {
    try {
        const [teams, results, news, ach] = await Promise.all([
            GET('teams.php'), GET('results.php'), GET('news.php'), GET('achievements.php')
        ]);

        setText('stat-teams',        teams.length);
        setText('stat-results',      results.length);
        setText('stat-news',         news.length);
        setText('stat-achievements', ach.length);

        // Graphique
        renderResultsChart(results);

        // Top jeux
        renderTopGames(results, teams);

        // Activité récente
        const logEl = $('recent-activity');
        if (logEl) {
            const logs = Security.getLogs().slice(0, 8);
            logEl.innerHTML = logs.length
                ? logs.map(l=>`<div class="log-entry"><span class="log-time">${safe(l.time)}</span> <span class="log-${l.level}">[${safe(l.type)}]</span> ${safe(l.msg)}</div>`).join('')
                : '<div style="color:#333;font-family:var(--font-mono);font-size:.75rem">Aucune activité.</div>';
        }
    } catch(e) { toast('Erreur dashboard: '+e.message, 'error'); }

    // Candidatures séparément pour ne pas bloquer
    try {
        const apps = await GET('applications.php');
        setText('stat-applications', apps.length);
        const pending = apps.filter(a => a.status === 'pending').length;
        const badge   = $('applications-badge');
        const sbBadge = $('sidebar-apps-badge');
        if (badge)   { badge.style.display   = pending > 0 ? 'block' : 'none'; badge.textContent = pending + ' NEW'; }
        if (sbBadge) { sbBadge.style.display = pending > 0 ? 'flex'  : 'none'; sbBadge.textContent = pending; }
    } catch(e) { /* applications.php peut échouer sans bloquer */ }

    // Sessions actives (admin uniquement) — badge sur le lien Sécurité
    if (CURRENT_ROLE === 'admin') {
        try {
            const sessions = await GET('sessions.php');
            const sbSessBadge = $('sidebar-sessions-badge');
            if (sbSessBadge) { sbSessBadge.style.display = sessions.length > 0 ? 'flex' : 'none'; sbSessBadge.textContent = sessions.length; }
        } catch(e) { /* ne bloque pas le dashboard */ }
    }
}

function renderResultsChart(results) {
    const chart = $('results-chart');
    if (!chart) return;

    if (!results.length) {
        chart.innerHTML = '<div style="color:#333;font-family:var(--font-mono);font-size:.75rem;padding:2rem;text-align:center;width:100%">Aucun résultat enregistré.</div>';
        return;
    }

    // Grouper par mois (6 derniers mois depuis aujourd'hui)
    const months = {};
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const key = d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0');
        months[key] = { wins: 0, losses: 0, label: d.toLocaleDateString('fr-FR', {month:'short'}) };
    }

    results.forEach(r => {
        const dateStr = r.date || r.match_date || r.created_at || '';
        const key = dateStr.slice(0, 7);
        if (months[key]) {
            if (r.result === 'win') months[key].wins++;
            else months[key].losses++;
        }
    });

    const maxVal = Math.max(1, ...Object.values(months).map(m => Math.max(m.wins, m.losses)));
    const H = 110;

    chart.style.cssText = 'height:160px;display:flex;align-items:flex-end;gap:6px;padding:1rem 0 0;min-height:160px;width:100%';

    chart.innerHTML = Object.entries(months).map(([key, m]) => {
        const wh = m.wins   > 0 ? Math.max(6, Math.round(m.wins   / maxVal * H)) : 3;
        const lh = m.losses > 0 ? Math.max(6, Math.round(m.losses / maxVal * H)) : 3;
        const total = m.wins + m.losses;
        return `<div style="flex:1;display:flex;flex-direction:column;align-items:center;gap:3px">
            <div style="width:100%;display:flex;gap:2px;align-items:flex-end;height:${H}px">
                <div style="flex:1;height:${wh}px;background:${m.wins>0?'#00c853':'rgba(0,200,83,.12)'};border-radius:3px 3px 0 0" title="${m.wins}V"></div>
                <div style="flex:1;height:${lh}px;background:${m.losses>0?'#cc4444':'rgba(204,68,68,.12)'};border-radius:3px 3px 0 0" title="${m.losses}D"></div>
            </div>
            <div style="font-family:var(--font-mono);font-size:.6rem;color:${total>0?'#888':'#2a2a2a'};text-transform:uppercase">${m.label}</div>
            ${total>0?`<div style="font-family:var(--font-mono);font-size:.58rem;color:#555">${m.wins}V·${m.losses}D</div>`:''}
        </div>`;
    }).join('');
}

function renderTopGames(results, teams) {
    const el = $('top-games');
    if (!el) return;

    // Compter résultats par jeu
    const gameStats = {};
    results.forEach(r => {
        if (!gameStats[r.game]) gameStats[r.game] = { wins: 0, total: 0 };
        gameStats[r.game].total++;
        if (r.result === 'win') gameStats[r.game].wins++;
    });

    // Trier par total
    const sorted = Object.entries(gameStats).sort((a,b) => b[1].total - a[1].total).slice(0, 3);

    if (!sorted.length) {
        el.innerHTML = '<div style="color:#333;font-family:var(--font-mono);font-size:.75rem">Aucun résultat enregistré.</div>';
        return;
    }

    const gameColors = {'Valorant':'#FF4655','CS2':'#F0A500','League of Legends':'#C89B3C','Rocket League':'#00B4D8','Fortnite':'#8000FF'};
    const medals = ['🥇','🥈','🥉'];

    el.innerHTML = sorted.map(([game, s], i) => {
        const rate   = Math.round(s.wins / s.total * 100);
        const color  = gameColors[game] || 'var(--color-red)';
        return `
            <div style="display:flex;align-items:center;gap:.75rem">
                <span style="font-size:1.1rem">${medals[i]}</span>
                <div style="flex:1">
                    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px">
                        <span style="font-family:var(--font-display);font-style:italic;font-weight:700;font-size:.9rem;text-transform:uppercase">${safe(game)}</span>
                        <span style="font-family:var(--font-mono);font-size:.7rem;color:${color}">${rate}% WR</span>
                    </div>
                    <div style="height:4px;background:rgba(255,255,255,.06);border-radius:2px;overflow:hidden">
                        <div style="height:100%;width:${rate}%;background:${color};border-radius:2px;transition:width .8s ease-out"></div>
                    </div>
                    <div style="font-family:var(--font-mono);font-size:.65rem;color:#444;margin-top:3px">${s.wins}V - ${s.total-s.wins}D · ${s.total} matchs</div>
                </div>
            </div>`;
    }).join('');
}

/* ════════════════════════════════════
   CANDIDATURES
════════════════════════════════════ */
let currentAppFilter = 'all';

/* ════════════════════════════════════
   EXPORT CSV
════════════════════════════════════ */
let appsCache = [];
let siteVisitsCache = [];

function exportToCSV(filename, headers, rows) {
    if (!rows || !rows.length) { toast('Rien à exporter.', 'error'); return; }
    const escapeCell = v => {
        const s = String(v ?? '').replace(/"/g, '""');
        return /[",;\n]/.test(s) ? `"${s}"` : s;
    };
    const lines = [headers.map(escapeCell).join(';')];
    rows.forEach(row => lines.push(row.map(escapeCell).join(';')));
    const csv = '\uFEFF' + lines.join('\r\n'); // BOM pour un bon affichage des accents dans Excel
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast('Export CSV téléchargé ✅', 'success');
}

function exportApplicationsCSV() {
    exportToCSV(
        `candidatures_${new Date().toISOString().slice(0,10)}.csv`,
        ['Pseudo','Jeu','Rang','Message','Profil','Statut','Date'],
        (appsCache||[]).map(a => [a.pseudo, a.game, a.rank, a.message, a.profile, a.status, a.date])
    );
}

function exportSiteVisitsCSV() {
    exportToCSV(
        `visiteurs_${new Date().toISOString().slice(0,10)}.csv`,
        ['Date & heure','IP','Page','Appareil','Provenance'],
        (siteVisitsCache||[]).map(v => [v.date, v.ip, v.page, parseUserAgent(v.user_agent), v.referrer])
    );
}

function exportPartnersCSV() {
    exportToCSV(
        `partenaires_${new Date().toISOString().slice(0,10)}.csv`,
        ['Nom','Initiales','Tier','URL','Logo'],
        (partnersCache||[]).map(p => [p.name, p.initials, p.tier, p.url, p.logo_url])
    );
}

window.exportApplicationsCSV = exportApplicationsCSV;
window.exportSiteVisitsCSV   = exportSiteVisitsCSV;
window.exportPartnersCSV     = exportPartnersCSV;
window.exportNewsletterCSV   = exportNewsletterCSV;
window.renderGames = renderGames; window.editGame = editGame; window.clearGameForm = clearGameForm;
window.saveGame = saveGame; window.deleteGame = deleteGame;
window.renderStaff = renderStaff; window.editStaffMember = editStaffMember; window.clearStaffForm = clearStaffForm;
window.saveStaffMember = saveStaffMember; window.deleteStaffMember = deleteStaffMember;
window.handleStaffPhotoUpload = handleStaffPhotoUpload; window.clearStaffPhoto = clearStaffPhoto;
window.deleteNewsletterSubscriber = deleteNewsletterSubscriber;
window.renderNewsletter = renderNewsletter;
window.sendNewsToNewsletter = sendNewsToNewsletter;

async function renderApplications() {
    const el = $('applications-list');
    if (!el) return;
    el.innerHTML = '<p style="color:#555;padding:1rem">Chargement…</p>';

    try {
        const apps = await GET(`applications.php${currentAppFilter !== 'all' ? '?status='+currentAppFilter : ''}`);
        appsCache = apps;

        // Mettre à jour badge
        const allApps = currentAppFilter === 'all' ? apps : await GET('applications.php');
        const pending = (currentAppFilter === 'all' ? apps : allApps).filter(a => a.status === 'pending').length;
        const badge   = $('applications-badge');
        const sbBadge = $('sidebar-apps-badge');
        if (badge)   { badge.style.display   = pending > 0 ? 'block' : 'none'; badge.textContent = pending + ' NEW'; }
        if (sbBadge) { sbBadge.style.display = pending > 0 ? 'flex'  : 'none'; sbBadge.textContent = pending; }

        if (!apps.length) {
            el.innerHTML = emptyState('Aucune candidature.');
            return;
        }

        const statusColors = { pending:'#ff9800', accepted:'#00c853', refused:'#cc4444' };
        const statusLabels = { pending:'⏳ En attente', accepted:'✅ Acceptée', refused:'❌ Refusée' };

        el.innerHTML = apps.map(a => `
            <div data-app-id="${safe(a.id)}" style="border:1px solid rgba(255,255,255,.06);border-radius:8px;padding:1.25rem;margin-bottom:.75rem;transition:border-color .2s" onmouseover="this.style.borderColor='rgba(229,0,10,.2)'" onmouseout="this.style.borderColor='rgba(255,255,255,.06)'">
                <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:1rem;flex-wrap:wrap">
                    <div style="flex:1;min-width:200px">
                        <div style="display:flex;align-items:center;gap:.75rem;margin-bottom:.5rem">
                            <span style="font-family:var(--font-display);font-style:italic;font-weight:700;font-size:1.1rem;text-transform:uppercase">${safe(a.pseudo)}</span>
                            <span class="a-badge a-badge-red">${safe(a.game)}</span>
                            <span style="font-family:var(--font-mono);font-size:.65rem;color:${statusColors[a.status]};padding:2px 8px;border-radius:20px;border:1px solid ${statusColors[a.status]}40;background:${statusColors[a.status]}10">${statusLabels[a.status]||a.status}</span>
                        </div>
                        <div style="font-family:var(--font-mono);font-size:.72rem;color:#666;margin-bottom:.5rem">
                            🏆 ${safe(a.rank)} &nbsp;·&nbsp; 📅 ${safe(a.date)}
                            ${a.profile ? `&nbsp;·&nbsp; <a href="${safe(a.profile)}" target="_blank" style="color:var(--color-red);text-decoration:none">Voir profil →</a>` : ''}
                        </div>
                        <div style="font-size:.82rem;color:#888;line-height:1.5;max-height:60px;overflow:hidden;position:relative" id="msg-${safe(a.id)}">${safe(a.message)}</div>
                    </div>
                    <div style="display:flex;flex-direction:column;gap:.5rem;flex-shrink:0">
                        ${a.status === 'pending' ? `
                            <button class="a-btn success-btn" onclick="updateAppStatus('${safe(a.id)}','accepted')" style="font-size:.75rem;padding:.4rem .9rem">✅ Accepter</button>
                            <button class="a-btn danger"      onclick="updateAppStatus('${safe(a.id)}','refused')"  style="font-size:.75rem;padding:.4rem .9rem">❌ Refuser</button>
                        ` : `
                            <button class="a-btn secondary" onclick="updateAppStatus('${safe(a.id)}','pending')" style="font-size:.75rem;padding:.4rem .9rem">↩ Remettre en attente</button>
                        `}
                        <button class="a-btn danger" onclick="confirmDel('application','${safe(a.id)}','${safe(a.pseudo)}')" style="font-size:.75rem;padding:.4rem .9rem">🗑 Supprimer</button>
                    </div>
                </div>
            </div>`).join('');

        // Filtre actif visuel
        ['all','pending','accepted','refused'].forEach(f => {
            const btn = $('app-filter-'+f);
            if (btn) btn.style.borderColor = f === currentAppFilter ? 'var(--color-red)' : '';
        });

    } catch(e) { el.innerHTML = emptyState('Erreur.'); toast(e.message,'error'); }
}

async function updateAppStatus(id, status) {
    try {
        await POST('applications.php', {id, status});
        toast('Statut mis à jour ✅', 'success');
        Security.addLog('CRUD', `Candidature ${status}: ${id}`, 'ok');
        renderApplications();
        renderDashboard();
    } catch(e) { toast(e.message, 'error'); }
}

function filterApplications(filter) {
    currentAppFilter = filter;
    renderApplications();
}

// Exposer
window.filterApplications = filterApplications;
window.updateAppStatus    = updateAppStatus;

// CSS animation badge
const badgeStyle = document.createElement('style');
badgeStyle.textContent = '@keyframes pulse-badge { from{transform:scale(1)} to{transform:scale(1.1)} }';
document.head.appendChild(badgeStyle);

/* ════════════════════════════════════
   RÉSEAUX SOCIAUX
════════════════════════════════════ */
async function renderSocials() {
    try {
        const data = await GET('socials.php');
        const fields = {twitter:'s-twitter', discord:'s-discord', twitch:'s-twitch', youtube:'s-youtube', instagram:'s-instagram'};
        Object.entries(fields).forEach(([k, id]) => {
            const el = $(id); if (el) el.value = data[k] || '';
        });
    } catch(e) { toast(e.message,'error'); }
}

async function saveSocials() {
    const fields = {twitter:'s-twitter', discord:'s-discord', twitch:'s-twitch', youtube:'s-youtube', instagram:'s-instagram', discord_widget:'s-discord-widget'};
    const payload = {};
    Object.entries(fields).forEach(([k, id]) => {
        const el = $(id); if (el) payload[k] = el.value.trim();
    });
    const webhookEl = $('s-discord-webhook');
    if (webhookEl) payload.discord_webhook_url = webhookEl.value.trim();
    try {
        await POST('socials.php', payload);
        toast('Réseaux sociaux sauvegardés ✅', 'success');
        Security.addLog('CRUD', 'Réseaux sociaux mis à jour', 'ok');
    } catch(e) { toast(e.message,'error'); }
}

async function testDiscordWebhook() {
    const url = val('s-discord-webhook').trim();
    if (!url) { toast('Colle une URL de webhook avant de tester.','error'); return; }
    try {
        await POST('testwebhook.php', { url });
        toast('Notification test envoyée — vérifie ton salon Discord ✅','success');
    } catch(e) { toast(e.message,'error'); }
}

/* ════════════════════════════════════
   MAINTENANCE
════════════════════════════════════ */
async function renderMaintenance() {
    try {
        const data = await GET('socials.php');
        const isOn = data.maintenance === '1';
        const toggle = $('maintenance-toggle');
        if (toggle) toggle.checked = isOn;
        updateMaintenanceUI(isOn);
    } catch(e) {}
}

function updateMaintenanceUI(isOn) {
    const label   = $('maintenance-status-label');
    const warning = $('maintenance-warning');
    const slider  = $('maintenance-slider');
    const knob    = $('maintenance-knob');
    if (label)   { label.textContent = isOn ? '● En maintenance' : '● En ligne'; label.style.color = isOn ? 'var(--color-red)' : '#00c853'; }
    if (warning) warning.style.display = isOn ? 'block' : 'none';
    if (slider)  slider.style.background = isOn ? 'var(--color-red)' : '#2a2a2a';
    if (knob)    knob.style.transform = isOn ? 'translateX(28px)' : 'translateX(0)';
}

async function toggleMaintenance(on) {
    try {
        await POST('socials.php', {maintenance: on ? '1' : '0'});
        updateMaintenanceUI(on);
        toast(on ? '⚠️ Mode maintenance activé' : '✅ Site remis en ligne', on ? 'warn' : 'success');
        Security.addLog('SYSTEM', `Maintenance ${on?'activée':'désactivée'}`, 'warn');
    } catch(e) { toast(e.message,'error'); }
}

/* ════════════════════════════════════
   HISTORIQUE CONNEXIONS
════════════════════════════════════ */
function parseUserAgent(ua) {
    ua = ua || '';
    let browser = 'Navigateur inconnu';
    if (/Edg\//.test(ua)) browser = 'Edge';
    else if (/OPR\//.test(ua)) browser = 'Opera';
    else if (/Chrome\//.test(ua) && !/Chromium/.test(ua)) browser = 'Chrome';
    else if (/Firefox\//.test(ua)) browser = 'Firefox';
    else if (/Safari\//.test(ua) && !/Chrome/.test(ua)) browser = 'Safari';

    let os = 'OS inconnu';
    if (/Windows/.test(ua)) os = 'Windows';
    else if (/Mac OS X/.test(ua)) os = 'macOS';
    else if (/Android/.test(ua)) os = 'Android';
    else if (/iPhone|iPad|iOS/.test(ua)) os = 'iOS';
    else if (/Linux/.test(ua)) os = 'Linux';

    return `${browser} · ${os}`;
}

let siteVisitsTimer = null;
let siteVisitsCountdown = 20;

function stopSiteVisitsAutoRefresh() {
    if (siteVisitsTimer) { clearInterval(siteVisitsTimer); siteVisitsTimer = null; }
}

function updateSiteVisitsCountdownDisplay() {
    const el = $('sv-refresh-countdown');
    if (el) el.textContent = `Actualisation dans ${siteVisitsCountdown}s`;
}

function startSiteVisitsAutoRefresh() {
    stopSiteVisitsAutoRefresh();
    siteVisitsCountdown = 20;
    updateSiteVisitsCountdownDisplay();
    siteVisitsTimer = setInterval(() => {
        siteVisitsCountdown--;
        if (siteVisitsCountdown <= 0) {
            siteVisitsCountdown = 20;
            renderSiteVisits();
        }
        updateSiteVisitsCountdownDisplay();
    }, 1000);
}

function renderDailyVisitsChart(daily) {
    const chart = $('sv-daily-chart');
    if (!chart) return;
    if (!daily.length || daily.every(d => d.count === 0)) {
        chart.innerHTML = '<div style="color:#333;font-family:var(--font-mono);font-size:.75rem;padding:2rem 0;text-align:center">Aucune visite sur cette période.</div>';
        return;
    }
    const maxVal = Math.max(1, ...daily.map(d => d.count));
    const H = 110;
    chart.style.cssText = 'height:160px;display:flex;align-items:flex-end;gap:4px;padding:1rem 0 0;min-height:160px;width:100%';
    chart.innerHTML = daily.map(d => {
        const h = d.count > 0 ? Math.max(4, Math.round(d.count / maxVal * H)) : 2;
        return `<div style="flex:1;display:flex;flex-direction:column;align-items:center;gap:4px">
            <div style="width:100%;height:${H}px;display:flex;align-items:flex-end">
                <div style="width:100%;height:${h}px;background:${d.count>0?'var(--color-red)':'rgba(229,0,10,.1)'};border-radius:3px 3px 0 0" title="${d.count} visite(s) le ${d.date}"></div>
            </div>
            <div style="font-size:.6rem;color:#555;font-family:var(--font-mono)">${d.date}</div>
        </div>`;
    }).join('');
}

function renderTopPages(topPages) {
    const el = $('sv-top-pages');
    if (!el) return;
    if (!topPages.length) { el.innerHTML = '<div style="color:#333;font-family:var(--font-mono);font-size:.75rem;padding:1rem 0;text-align:center">Aucune donnée.</div>'; return; }
    const maxC = Math.max(1, ...topPages.map(p => +p.c));
    el.innerHTML = topPages.map(p => `
        <div style="margin-bottom:.7rem">
            <div style="display:flex;justify-content:space-between;font-size:.78rem;margin-bottom:.25rem">
                <span style="color:#ccc;font-family:var(--font-mono);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:70%">${safe(p.page||'/')}</span>
                <span style="color:#666">${safe(p.c)}</span>
            </div>
            <div style="height:5px;background:rgba(255,255,255,.05);border-radius:3px;overflow:hidden">
                <div style="height:100%;width:${Math.max(4, p.c/maxC*100)}%;background:var(--color-red);border-radius:3px"></div>
            </div>
        </div>`).join('');
}

async function renderSiteVisits() {
    const el = $('site-visits-list');
    if (!el) return;
    el.innerHTML = '<div style="color:#444;font-family:var(--font-mono);font-size:.75rem;padding:1rem">Chargement…</div>';
    try {
        const data = await GET('sitevisits.php');
        const visits = data.visits || [];
        siteVisitsCache = visits;
        const stats  = data.stats  || {};
        setText('sv-stat-24h',   stats.last24h ?? '—');
        setText('sv-stat-unique', stats.uniqueIp24h ?? '—');
        setText('sv-stat-total', stats.total ?? '—');

        renderDailyVisitsChart(data.daily || []);
        renderTopPages(data.topPages || []);

        if (!visits.length) { el.innerHTML = '<div style="color:#333;font-family:var(--font-mono);font-size:.75rem;padding:1rem">Aucune visite enregistrée.</div>'; return; }
        el.innerHTML = `<table class="a-table">
            <thead><tr>
                <th>Date &amp; heure</th>
                <th>Adresse IP</th>
                <th>Localisation</th>
                <th>Page visitée</th>
                <th>Appareil</th>
                <th>Provenance</th>
            </tr></thead>
            <tbody>
                ${visits.map(v => `<tr>
                    <td style="font-family:var(--font-mono);font-size:.78rem;color:#ccc;white-space:nowrap">${safe(v.date)}</td>
                    <td style="font-family:var(--font-mono);font-size:.8rem;color:#fff">${safe(v.ip)}</td>
                    <td style="font-size:.75rem;color:#999">${safe(v.location||'—')}</td>
                    <td style="font-size:.78rem;color:#aaa;max-width:220px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${safe(v.page||'/')}</td>
                    <td style="font-size:.78rem;color:#666">${safe(parseUserAgent(v.user_agent))}</td>
                    <td style="font-size:.72rem;color:#555;max-width:160px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${safe(v.referrer||'Direct')}</td>
                </tr>`).join('')}
            </tbody>
        </table>`;
    } catch(e) { el.innerHTML = `<div style="color:#cc4444;font-family:var(--font-mono);font-size:.75rem;padding:1rem">Erreur: ${e.message}</div>`; }
}

let loginHistoryTimer = null;
let loginHistoryCountdown = 10;

function stopLoginHistoryAutoRefresh() {
    if (loginHistoryTimer) { clearInterval(loginHistoryTimer); loginHistoryTimer = null; }
}

function updateLoginHistoryCountdownDisplay() {
    const el = $('lh-refresh-countdown');
    if (el) el.textContent = `Actualisation dans ${loginHistoryCountdown}s`;
}

function startLoginHistoryAutoRefresh() {
    stopLoginHistoryAutoRefresh();
    loginHistoryCountdown = 10;
    updateLoginHistoryCountdownDisplay();
    loginHistoryTimer = setInterval(() => {
        loginHistoryCountdown--;
        if (loginHistoryCountdown <= 0) {
            loginHistoryCountdown = 10;
            renderLoginHistory();
        }
        updateLoginHistoryCountdownDisplay();
    }, 1000);
}

async function renderLoginHistory() {
    const el = $('login-history-list');
    if (!el) return;
    el.innerHTML = '<div style="color:#444;font-family:var(--font-mono);font-size:.75rem;padding:1rem">Chargement…</div>';
    try {
        const logs = await GET('loginhistory.php');
        if (!logs.length) { el.innerHTML = '<div style="color:#333;font-family:var(--font-mono);font-size:.75rem;padding:1rem">Aucune connexion enregistrée.</div>'; return; }
        el.innerHTML = `<table class="a-table">
            <thead><tr>
                <th>Date &amp; heure</th>
                <th>Utilisateur</th>
                <th>Adresse IP</th>
                <th>Localisation</th>
                <th>Appareil</th>
                <th style="text-align:right">Statut</th>
            </tr></thead>
            <tbody>
                ${logs.map(l => `<tr>
                    <td style="font-family:var(--font-mono);font-size:.78rem;color:#ccc;white-space:nowrap">${safe(l.date)}</td>
                    <td style="font-size:.8rem;color:#fff">${safe(l.username||'—')}</td>
                    <td style="font-family:var(--font-mono);font-size:.8rem;color:#fff">${safe(l.ip)}</td>
                    <td style="font-size:.75rem;color:#999">${safe(l.location||'—')}</td>
                    <td style="font-size:.78rem;color:#666">${safe(parseUserAgent(l.user_agent))}</td>
                    <td style="text-align:right">
                        <span class="a-badge ${l.success?'a-badge-win':'a-badge-red'}">${l.success?'✅ Succès':'❌ Échec'}</span>
                    </td>
                </tr>`).join('')}
            </tbody>
        </table>`;
    } catch(e) { el.innerHTML = `<div style="color:#cc4444;font-family:var(--font-mono);font-size:.75rem;padding:1rem">Erreur: ${e.message}</div>`; }
}

window.saveSocials        = saveSocials;
window.testDiscordWebhook = testDiscordWebhook;
window.toggleMaintenance  = toggleMaintenance;
window.renderLoginHistory = renderLoginHistory;
window.renderSiteVisits   = renderSiteVisits;
window.renderSocials      = renderSocials;
window.renderMaintenance  = renderMaintenance;

/* ════════════════════════════════════
   NOTES INTERNES — BDD
════════════════════════════════════ */
const NOTE_COLORS = ['#1a1a2e','#1a2a1a','#2a1a1a','#16161a','#1e1a2a','#1a2a2a'];
let _notes = [];
let _noteTimers = {};

async function renderNotes() {
    const grid = $('notes-grid');
    if (!grid) return;
    grid.innerHTML = '<div style="grid-column:1/-1;text-align:center;padding:2rem;font-family:var(--font-mono);font-size:.75rem;color:#333">Chargement…</div>';
    try {
        _notes = await GET('notes.php');
        _renderNotesUI();
    } catch(e) { toast(e.message,'error'); }
}

function _renderNotesUI() {
    const grid = $('notes-grid');
    if (!grid) return;
    if (!_notes.length) {
        grid.innerHTML = '<div style="grid-column:1/-1;text-align:center;padding:3rem;font-family:var(--font-mono);font-size:.8rem;color:#333">Aucune note. Cliquez sur "+ Nouvelle note".</div>';
        return;
    }
    grid.innerHTML = _notes.map((note, i) => `
        <div style="background:${NOTE_COLORS[i % NOTE_COLORS.length]};border:1px solid rgba(255,255,255,.08);border-radius:10px;padding:1.25rem;min-height:160px;display:flex;flex-direction:column;gap:.75rem;transition:border-color .2s" onmouseover="this.style.borderColor='rgba(229,0,10,.3)'" onmouseout="this.style.borderColor='rgba(255,255,255,.08)'">
            <input value="${safe(note.title)}"
                oninput="updateNote('${safe(note.id)}','title',this.value)"
                placeholder="Titre…"
                style="background:transparent;border:none;border-bottom:1px solid rgba(255,255,255,.1);color:#fff;font-family:var(--font-display);font-style:italic;font-weight:700;font-size:1rem;text-transform:uppercase;outline:none;padding-bottom:.4rem;width:100%"/>
            <textarea
                oninput="updateNote('${safe(note.id)}','content',this.value)"
                placeholder="Contenu…"
                style="background:transparent;border:none;color:#888;font-family:var(--font-mono);font-size:.78rem;line-height:1.6;outline:none;resize:none;flex:1;min-height:80px;width:100%">${safe(note.content)}</textarea>
            <div style="display:flex;justify-content:space-between;align-items:center">
                <span style="font-family:var(--font-mono);font-size:.6rem;color:#333">✏️ ${safe(note.date)}</span>
                <button onclick="deleteNote('${safe(note.id)}')" style="background:rgba(229,0,10,.1);border:1px solid rgba(229,0,10,.2);border-radius:4px;color:#cc4444;font-size:.65rem;padding:2px 8px;cursor:pointer">🗑</button>
            </div>
        </div>`).join('');
}

async function addNote() {
    try {
        const res = await POST('notes.php', {title:'', content:'', color: NOTE_COLORS[_notes.length % NOTE_COLORS.length]});
        await renderNotes();
        setTimeout(() => $('notes-grid')?.querySelector('input')?.focus(), 100);
    } catch(e) { toast(e.message,'error'); }
}

function updateNote(id, field, value) {
    // Debounce 800ms pour éviter trop de requêtes
    clearTimeout(_noteTimers[id]);
    _noteTimers[id] = setTimeout(async () => {
        const note = _notes.find(n => n.id === id);
        if (!note) return;
        note[field] = value;
        try {
            await POST('notes.php', {id, title: note.title, content: note.content, color: note.color});
        } catch(e) { console.warn('Save note error:', e); }
    }, 800);
}

async function deleteNote(id) {
    try {
        await DEL('notes.php', id);
        toast('Note supprimée', 'success');
        await renderNotes();
    } catch(e) { toast(e.message,'error'); }
}

window.addNote    = addNote;
window.updateNote = updateNote;
window.deleteNote = deleteNote;

/* ════════════════════════════════════
   BANNIÈRE D'ANNONCE
════════════════════════════════════ */
async function renderSocials() {
    try {
        const data = await GET('socials.php');
        // Réseaux
        const fields = {twitter:'s-twitter', discord:'s-discord', twitch:'s-twitch', youtube:'s-youtube', instagram:'s-instagram', discord_widget:'s-discord-widget'};
        Object.entries(fields).forEach(([k, id]) => { const el=$(id); if(el) el.value=data[k]||''; });

        // Webhook Discord (candidatures)
        const webhookEl = $('s-discord-webhook'); if (webhookEl) webhookEl.value = data.discord_webhook_url || '';

        // Bannière
        const enabled = data.banner_enabled === '1';
        const toggle  = $('banner-toggle');
        const text    = $('banner-text');
        const color   = $('banner-color');
        if (toggle) toggle.checked = enabled;
        if (text)   text.value  = data.banner_text  || '';
        if (color)  color.value = data.banner_color || '#e5000a';
        updateBannerUI(enabled);
        updateBannerPreview();
    } catch(e) { toast(e.message,'error'); }
}

function updateBannerUI(on) {
    const label  = $('banner-status-label');
    const slider = $('banner-slider');
    const knob   = $('banner-knob');
    if (label)  { label.textContent = on ? '● Active' : '● Désactivée'; label.style.color = on ? '#00c853' : '#555'; }
    if (slider) slider.style.background = on ? 'var(--color-red)' : '#2a2a2a';
    if (knob)   knob.style.transform = on ? 'translateX(28px)' : 'translateX(0)';
}

function updateBannerPreview() {
    const preview = $('banner-preview');
    const text    = $('banner-text');
    const color   = $('banner-color');
    if (!preview) return;
    preview.textContent = text?.value || 'Aperçu de la bannière';
    preview.style.background = color?.value || '#e5000a';
}

// Live preview
document.getElementById?.('banner-text')?.addEventListener('input', updateBannerPreview);
document.getElementById?.('banner-color')?.addEventListener('input', () => updateBannerPreview());

async function toggleBanner(on) {
    updateBannerUI(on);
    await saveBanner();
}

async function saveBanner() {
    const text  = $('banner-text')?.value  || '';
    const color = $('banner-color')?.value || '#e5000a';
    const on    = $('banner-toggle')?.checked ? '1' : '0';
    try {
        await POST('socials.php', { banner_enabled: on, banner_text: text, banner_color: color });
        toast('Bannière sauvegardée ✅', 'success');
        updateBannerPreview();
    } catch(e) { toast(e.message,'error'); }
}

window.toggleBanner         = toggleBanner;
window.saveBanner           = saveBanner;
window.updateBannerPreview  = updateBannerPreview;

/* ════════════════════════════════════
   RECHERCHE GLOBALE
════════════════════════════════════ */
let searchDataCache = { teams: null, news: null };
let globalSearchDebounce = null;

function handleGlobalSearch(query) {
    clearTimeout(globalSearchDebounce);
    const box = $('global-search-results');
    query = (query || '').trim();
    if (!query) { if (box) box.style.display = 'none'; return; }
    globalSearchDebounce = setTimeout(() => runGlobalSearch(query), 150);
}

async function runGlobalSearch(query) {
    const box = $('global-search-results');
    if (!box) return;
    const q = query.toLowerCase();
    const results = [];

    try {
        const apps = (appsCache && appsCache.length) ? appsCache : await GET('applications.php');
        apps.filter(a => (a.pseudo||'').toLowerCase().includes(q) || (a.game||'').toLowerCase().includes(q))
            .slice(0,5)
            .forEach(a => results.push({icon:'📝', label:a.pseudo, sub:`Candidature · ${a.game}`, panel:'applications'}));
    } catch(e) {}

    try {
        const partners = (partnersCache && partnersCache.length) ? partnersCache : await GET('partners.php');
        partners.filter(p => (p.name||'').toLowerCase().includes(q))
            .slice(0,5)
            .forEach(p => results.push({icon:'🤝', label:p.name, sub:'Partenaire', panel:'partners'}));
    } catch(e) {}

    try {
        if (!searchDataCache.teams) searchDataCache.teams = await GET('teams.php');
        searchDataCache.teams.forEach(t => {
            if ((t.teamName||'').toLowerCase().includes(q) || (t.game||'').toLowerCase().includes(q)) {
                results.push({icon:'🎮', label:t.teamName||t.game, sub:`Équipe · ${t.game}`, panel:'teams'});
            }
            (t.players||[]).forEach(p => {
                if ((p.pseudo||'').toLowerCase().includes(q)) {
                    results.push({icon:'👤', label:p.pseudo, sub:`Joueur · ${t.teamName||t.game}`, panel:'teams'});
                }
            });
        });
    } catch(e) {}

    try {
        if (!searchDataCache.news) searchDataCache.news = await GET('news.php');
        searchDataCache.news.filter(n => (n.title||'').toLowerCase().includes(q))
            .slice(0,5)
            .forEach(n => results.push({icon:'📰', label:n.title, sub:'Actualité', panel:'news'}));
    } catch(e) {}

    if (!results.length) {
        box.innerHTML = `<div style="padding:1rem;color:#555;font-size:.78rem;font-family:var(--font-mono)">Aucun résultat pour "${safe(query)}"</div>`;
        box.style.display = 'block';
        return;
    }

    box.innerHTML = results.slice(0,20).map(r => `
        <div onclick="goToSearchResult('${r.panel}')" style="padding:.7rem 1rem;cursor:pointer;border-bottom:1px solid rgba(255,255,255,.04);display:flex;align-items:center;gap:.7rem" onmouseover="this.style.background='rgba(229,0,10,.08)'" onmouseout="this.style.background='transparent'">
            <span style="font-size:1rem">${r.icon}</span>
            <span style="flex:1;min-width:0">
                <div style="font-size:.82rem;color:#fff;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${safe(r.label||'—')}</div>
                <div style="font-size:.68rem;color:#666">${safe(r.sub)}</div>
            </span>
        </div>`).join('');
    box.style.display = 'block';
}

function goToSearchResult(panel) {
    const link = document.querySelector(`.sidebar-link[data-panel="${panel}"]`);
    if (link) link.click();
    const box = $('global-search-results');
    if (box) box.style.display = 'none';
    const input = $('global-search');
    if (input) input.value = '';
}

document.addEventListener('click', (e) => {
    const box = $('global-search-results');
    const input = $('global-search');
    if (box && input && box.style.display !== 'none' && !box.contains(e.target) && e.target !== input) {
        box.style.display = 'none';
    }
});

window.handleGlobalSearch = handleGlobalSearch;
window.goToSearchResult   = goToSearchResult;
