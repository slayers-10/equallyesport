/* ═══════════════════════════════════════════════════
   loader.js — Chargement données depuis API PHP/MySQL
   Appelle api/*.php pour lire les données en BDD
   ═══════════════════════════════════════════════════ */

const API = 'api/';

async function apiGet(endpoint) {
  try {
    const res = await fetch(API + endpoint);
    const json = await res.json();
    if (json.ok) return json.data;
    console.warn('[Equally] API erreur:', json.error);
    return [];
  } catch(e) {
    console.warn('[Equally] Fetch échoué:', endpoint, e);
    return [];
  }
}

function safeText(str) {
  const d = document.createElement('div');
  d.appendChild(document.createTextNode(String(str || '')));
  return d.innerHTML;
}

/* ════════════════════════════════════
   ÉQUIPES
════════════════════════════════════ */
async function loadTeams() {
  const container = document.getElementById('teams-grid');
  const filterBar = document.getElementById('teams-filter');
  if (!container) return;
  container.innerHTML = '<p style="color:var(--color-gray);grid-column:1/-1;text-align:center;padding:2rem">Chargement…</p>';
  if (filterBar) filterBar.innerHTML = '';

  const teams = await apiGet('teams.php');

  container.innerHTML = '';
  if (!teams.length) {
    container.innerHTML = '<p style="color:var(--color-gray);grid-column:1/-1;text-align:center;padding:2rem">Aucune équipe enregistrée.</p>';
    return;
  }

  if (filterBar) {
    const games = ['Tous', ...new Set(teams.map(t => t.game))];
    games.forEach(game => {
      const btn = document.createElement('button');
      btn.className = 'filter-btn' + (game === 'Tous' ? ' active' : '');
      btn.textContent = game;
      btn.addEventListener('click', () => {
        filterBar.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        filterTeams(game);
      });
      filterBar.appendChild(btn);
    });
  }

  teams.forEach(team => container.appendChild(makeTeamCard(team)));
  revealAll(container.querySelectorAll('.team-card'));
}

function makeTeamCard(team) {
  const card = document.createElement('div');
  card.className = 'team-card reveal';
  card.dataset.game = team.game;
  const color = team.gameColor || '#E5000A';

  function countryFlag(code) {
    if (!code || code.length !== 2) return '';
    return code.toUpperCase().replace(/./g, c => String.fromCodePoint(127397 + c.charCodeAt(0)));
  }

  const twitterSVG = `<svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>`;
  const twitchSVG  = `<svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M11.571 4.714h1.715v5.143H11.57zm4.715 0H18v5.143h-1.714zM6 0L1.714 4.286v15.428h5.143V24l4.286-4.286h3.428L22.286 12V0zm14.571 11.143l-3.428 3.428h-3.429l-3 3v-3H6.857V1.714h13.714z"/></svg>`;
  const youtubeSVG = `<svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>`;

  const players = (team.players || []).map(p => {
    const flag     = countryFlag(p.country);
    const initials = (p.pseudo || '?').slice(0, 2).toUpperCase();

    const socials = [
      p.twitter ? `<a href="https://twitter.com/${safeText(p.twitter)}" target="_blank" rel="noopener" class="player-social-btn twitter" title="@${safeText(p.twitter)}">${twitterSVG}</a>` : '',
      p.twitch  ? `<a href="https://twitch.tv/${safeText(p.twitch)}"   target="_blank" rel="noopener" class="player-social-btn twitch"  title="${safeText(p.twitch)}">${twitchSVG}</a>` : '',
      p.youtube ? `<a href="https://youtube.com/@${safeText(p.youtube)}" target="_blank" rel="noopener" class="player-social-btn youtube" title="${safeText(p.youtube)}">${youtubeSVG}</a>` : '',
    ].join('');

    return `
      <div class="player-card-new">
        <div class="player-avatar">${initials}</div>
        <div class="player-info-new">
          <div class="player-pseudo-new">
            ${flag ? `<span class="player-flag-new">${flag}</span>` : ''}
            ${safeText(p.pseudo)}
          </div>
          <div class="player-meta-new">
            <span class="player-role-new">${safeText(p.role || 'Joueur')}</span>
            ${p.country ? `<span style="color:#333">${safeText(p.country)}</span>` : ''}
          </div>
        </div>
        ${socials ? `<div class="player-socials-new">${socials}</div>` : ''}
      </div>`;
  }).join('') || '<p style="color:#333;font-size:.8rem;padding:.75rem 1.25rem;font-family:var(--font-mono)">Aucun joueur enregistré</p>';

  const playerCount = (team.players || []).length;

  card.innerHTML = `
    <div class="team-card-accent" style="background:linear-gradient(90deg,${safeText(color)},transparent)"></div>
    <div class="team-card-header-new">
      <div class="team-game-icon-big" style="background:${safeText(color)}18;color:${safeText(color)}">${safeText(team.gameIcon||'EQ')}</div>
      <div>
        <div class="team-card-title">${safeText(team.teamName)}</div>
        <div class="team-game-badge" style="background:${safeText(color)}15;color:${safeText(color)};border:1px solid ${safeText(color)}30">
          ${safeText(team.game)}
        </div>
      </div>
    </div>
    <div class="team-card-sep" style="background:linear-gradient(90deg,${safeText(color)},transparent)"></div>
    <div class="players-list-new">${players}</div>
    <div class="team-card-footer">
      <span>${playerCount} joueur${playerCount > 1 ? 's' : ''}</span>
      <span style="color:${safeText(color)}">${safeText(team.game)}</span>
    </div>`;

  return card;
}

function filterTeams(game) {
  document.querySelectorAll('#teams-grid .team-card').forEach(card => {
    const show = game === 'Tous' || card.dataset.game === game;
    card.style.display = show ? '' : 'none';
    if (show) { card.classList.remove('visible'); setTimeout(() => card.classList.add('visible'), 50); }
  });
}

/* ════════════════════════════════════
   RÉSULTATS
════════════════════════════════════ */
async function loadResults() {
  const tbody = document.getElementById('results-tbody');
  if (!tbody) return;
  tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;padding:2rem;color:var(--color-gray)">Chargement…</td></tr>';

  const results = await apiGet('results.php');

  tbody.innerHTML = '';
  if (!results.length) {
    tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;padding:2rem;color:var(--color-gray)">Aucun résultat.</td></tr>';
    return;
  }

  results.forEach((r, i) => {
    const tr = document.createElement('tr');
    tr.className = 'reveal';
    tr.style.transitionDelay = (i * 0.05) + 's';
    const win = r.result === 'win';
    let dateStr = r.date || '';
    try { dateStr = new Date(r.date).toLocaleDateString('fr-FR', {day:'numeric',month:'short',year:'numeric'}); } catch {}

    tr.innerHTML = `
      <td><div class="result-teams"><strong>Equally</strong><span class="result-vs">VS</span><span>${safeText(r.opponent)}</span></div></td>
      <td><span class="result-score ${win?'win':'loss'}">${safeText(r.scoreUs)} - ${safeText(r.scoreThem)}</span></td>
      <td><span class="result-game-tag">${safeText(r.game)}</span></td>
      <td><span class="badge ${win?'badge-green':'badge-dark'}">${win?'Victoire':'Défaite'}</span></td>
      <td style="font-family:var(--font-mono);font-size:var(--text-xs);color:var(--color-gray)">${dateStr}</td>`;
    tbody.appendChild(tr);
  });

  revealAll(tbody.querySelectorAll('tr'));
}

/* ════════════════════════════════════
   ACTUALITÉS
════════════════════════════════════ */
async function loadNews() {
  const grid = document.getElementById('news-grid');
  if (!grid) return;
  grid.innerHTML = '<p style="color:var(--color-gray);grid-column:1/-1;text-align:center;padding:2rem">Chargement…</p>';

  const news = await apiGet('news.php');

  grid.innerHTML = '';
  if (!news.length) {
    grid.innerHTML = '<p style="color:var(--color-gray);grid-column:1/-1;text-align:center;padding:2rem">Aucune actualité.</p>';
    return;
  }

  const icons = {Victoire:'🏆',Transfert:'🔄',Qualification:'⚡',Partenariat:'🤝',Analyse:'📊',Annonce:'📣'};

  news.forEach((item, i) => {
    const article = document.createElement('article');
    article.className = 'news-card reveal';
    article.style.transitionDelay = (i * 0.1) + 's';
    let dateStr = '';
    try { dateStr = new Date(item.date).toLocaleDateString('fr-FR',{day:'numeric',month:'long',year:'numeric'}); } catch {}

    article.innerHTML = `
      <div class="news-card-thumb">
        <span class="thumb-icon">${icons[item.category]||'📰'}</span>
        <div class="news-card-thumb-overlay">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
        </div>
      </div>
      <div class="news-card-body">
        <div class="news-card-meta">
          <span class="badge badge-red">${safeText(item.category)}</span>
          <span class="news-card-date">${dateStr}</span>
        </div>
        <h3 class="news-card-title">${safeText(item.title)}</h3>
        <p class="news-card-summary">${safeText(item.summary)}</p>
      </div>`;
    grid.appendChild(article);
  });

  revealAll(grid.querySelectorAll('.news-card'));
}

/* ════════════════════════════════════
   PALMARÈS
════════════════════════════════════ */
async function loadAchievements() {
  const grid = document.getElementById('achievements-grid');
  if (!grid) return;
  grid.innerHTML = '';

  const data = await apiGet('achievements.php');

  (data.length ? data : [
    {id:'d1',year:'2025',name:'Open Series S2',game:'CS2',icon:'🏆'},
    {id:'d2',year:'2025',name:'VCT Challengers Phase 1',game:'Valorant',icon:'🥇'},
    {id:'d3',year:'2024',name:'RLCS Open Qualifier',game:'Rocket League',icon:'🏆'},
  ]).forEach((a, i) => {
    const card = document.createElement('div');
    card.className = `trophy-card ${i%2===0?'reveal-left':'reveal-right'}`;
    card.style.transitionDelay = (i * 0.1) + 's';
    card.innerHTML = `
      <div class="trophy-icon">${safeText(a.icon)}</div>
      <div class="trophy-year">${safeText(a.year)}</div>
      <div class="trophy-name">${safeText(a.name)}</div>
      <div class="trophy-game">${safeText(a.game)}</div>`;
    grid.appendChild(card);
  });

  revealAll(grid.querySelectorAll('.reveal-left, .reveal-right'));
}

/* ════════════════════════════════════
   PARTENAIRES
════════════════════════════════════ */
async function loadPartners() {
  const goldRow     = document.getElementById('partners-gold');
  const silverRow   = document.getElementById('partners-silver');
  const bronzeTrack = document.getElementById('partners-bronze-track');
  if (goldRow)     goldRow.innerHTML     = '';
  if (silverRow)   silverRow.innerHTML   = '';
  if (bronzeTrack) bronzeTrack.innerHTML = '';

  const partners = await apiGet('partners.php');
  if (!partners.length) return;

  function makeLogo(p) {
    const a = document.createElement('a');
    a.href = p.url || '#'; a.target='_blank'; a.rel='noopener noreferrer';
    a.className='partner-logo';
    a.setAttribute('aria-label','Partenaire : '+safeText(p.name));
    a.textContent = p.name;
    return a;
  }

  partners.filter(p=>p.tier==='gold').forEach(p   => goldRow   && goldRow.appendChild(makeLogo(p)));
  partners.filter(p=>p.tier==='silver').forEach(p => silverRow && silverRow.appendChild(makeLogo(p)));
  const bronze = partners.filter(p=>p.tier==='bronze');
  if (bronzeTrack && bronze.length) [...bronze,...bronze].forEach(p => bronzeTrack.appendChild(makeLogo(p)));
}

/* ════════════════════════════════════
   SCROLL REVEAL
════════════════════════════════════ */
function revealAll(elements) {
  const obs = new IntersectionObserver((entries) => {
    entries.forEach(e => { if(e.isIntersecting){ e.target.classList.add('visible'); obs.unobserve(e.target); } });
  }, { threshold:0.1, rootMargin:'0px 0px -40px 0px' });
  elements.forEach(el => obs.observe(el));
}

async function initDataLoaders() {
  await Promise.all([loadTeams(), loadResults(), loadNews(), loadPartners(), loadAchievements(), loadHeroStats()]);
}

/* ════════════════════════════════════
   COMPTEURS HERO (depuis BDD)
════════════════════════════════════ */
async function loadHeroStats() {
  try {
    const [teams, results] = await Promise.all([
      apiGet('teams.php'),
      apiGet('results.php'),
    ]);

    const nbEquipes   = (teams||[]).length;
    const nbJoueurs   = (teams||[]).reduce((acc,t) => acc + (t.players?.length||0), 0);
    const nbVictoires = (results||[]).filter(r=>r.result==='win').length;

    const setCounter = (id, val) => {
      const el = document.getElementById(id);
      if (el) { el.dataset.target = val; el.textContent = '0'; }
    };

    setCounter('stat-jeux',      nbEquipes);
    setCounter('stat-joueurs',   nbJoueurs);
    setCounter('stat-victoires', nbVictoires);

    if (window.initCounters) initCounters();

  } catch(e) {
    console.warn('[Equally] Stats hero:', e);
  }
}

window.initDataLoaders = initDataLoaders;
window.addStaggerReveal = revealAll;


/* ════════════════════════════════════
   TOOLTIP CLICK — ouvre/ferme au clic
════════════════════════════════════ */
document.addEventListener('click', (e) => {
  const pseudo = e.target.closest('.pseudo-clickable');

  // Fermer tous les tooltips ouverts
  document.querySelectorAll('.player-pseudo-wrap.open').forEach(w => {
    if (!pseudo || !w.contains(pseudo)) w.classList.remove('open');
  });

  // Ouvrir celui cliqué
  if (pseudo) {
    const wrap = pseudo.closest('.player-pseudo-wrap');
    if (wrap) {
      wrap.classList.toggle('open');
      e.stopPropagation();
    }
  }
});

/* ════════════════════════════════════
   FONCTIONS EXPORTÉES pour index.html
════════════════════════════════════ */
window.makeTeamCard = makeTeamCard;

window.makeNewsCard = function(item) {
  const article = document.createElement('article');
  article.className = 'news-card reveal';
  const icons = {Victoire:'🏆',Transfert:'🔄',Qualification:'⚡',Partenariat:'🤝',Analyse:'📊',Annonce:'📣'};
  let dateStr = '';
  try { dateStr = new Date(item.date).toLocaleDateString('fr-FR',{day:'numeric',month:'long',year:'numeric'}); } catch {}
  article.innerHTML = `
    <div class="news-card-thumb">
      <span class="thumb-icon">${icons[item.category]||'📰'}</span>
      <div class="news-card-thumb-overlay"><svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2"><path d="M5 12h14M12 5l7 7-7 7"/></svg></div>
    </div>
    <div class="news-card-body">
      <div class="news-card-meta">
        <span class="badge badge-red">${safeText(item.category)}</span>
        <span class="news-card-date">${dateStr}</span>
      </div>
      <h3 class="news-card-title">${safeText(item.title)}</h3>
      <p class="news-card-summary">${safeText(item.summary)}</p>
    </div>`;
  return article;
};

window.makeAchCard = function(a, i) {
  const card = document.createElement('div');
  card.className = `trophy-card ${i%2===0?'reveal-left':'reveal-right'}`;
  card.style.transitionDelay = `${i*.1}s`;
  card.innerHTML = `
    <div class="trophy-icon">${safeText(a.icon)}</div>
    <div class="trophy-year">${safeText(a.year)}</div>
    <div class="trophy-name">${safeText(a.name)}</div>
    <div class="trophy-game">${safeText(a.game)}</div>`;
  return card;
};
