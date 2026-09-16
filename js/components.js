/* ═══════════════════════════════════════
   components.js — Navbar + Footer partagés
   Injecté sur toutes les pages
   ═══════════════════════════════════════ */

(function() {
  'use strict';

  /* ── Détecte la profondeur de la page pour les chemins relatifs ── */
  const isSubpage = window.location.pathname.includes('/pages/');
  const root = isSubpage ? '../' : '';

  /* ════════════════════════════════════
     NAVBAR
  ════════════════════════════════════ */
  function buildNavbar() {
    const currentPage = window.location.pathname.split('/').pop() || 'index.html';

    const links = [
      { href: root + 'index.html',              label: 'Accueil',      id: 'index.html'      },
      { href: root + 'pages/equipes.html',      label: 'Équipes',      id: 'equipes.html'    },
      { href: root + 'pages/resultats.html',    label: 'Résultats',    id: 'resultats.html'  },
      { href: root + 'pages/actualites.html',   label: 'Actus',        id: 'actualites.html' },
      { href: root + 'pages/palmares.html',     label: 'Palmarès',     id: 'palmares.html'   },
      { href: root + 'pages/shop.html',         label: 'Shop',         id: 'shop.html'       },
      { href: root + 'pages/recrutement.html',  label: 'Recruter',     id: 'recrutement.html'},
      { href: root + 'pages/partenaires.html',  label: 'Partenaires',  id: 'partenaires.html'},
    ];

    const linksHTML = links.map(l => {
      const active = currentPage === l.id ? ' active' : '';
      return `<a href="${l.href}" class="nav-link${active}">${l.label}</a>`;
    }).join('');

    const html = `
    <header class="navbar" role="banner">
      <div class="navbar-inner">
        <a href="${root}index.html" class="navbar-logo" aria-label="Equally Esport — Accueil">
          <img src="${root}assets/logo/logo.png" alt="" class="navbar-logo-img" aria-hidden="true" />
          <span class="navbar-logo-text">Equally<em>Esport</em></span>
        </a>

        <nav id="nav-menu" class="navbar-nav" aria-label="Navigation principale">
          ${linksHTML}
          <a href="${root}pages/contact.html" class="btn btn-primary" style="padding:0.4rem 1.2rem;font-size:0.9rem;">Contact</a>
          <a href="${root}admin.html" class="btn btn-outline" style="padding:0.4rem 1rem;font-size:0.8rem;display:flex;align-items:center;gap:0.4rem;" aria-label="Admin">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
            Admin
          </a>
        </nav>

        <button id="burger" class="burger" aria-label="Ouvrir le menu" aria-expanded="false" aria-controls="nav-menu">
          <span></span><span></span><span></span>
        </button>
      </div>
    </header>`;

    document.body.insertAdjacentHTML('afterbegin', html);

    // ── Bannière d'annonce ──
    fetch(root + 'api/socials.php')
      .then(r => r.json())
      .then(j => {
        if (!j.ok || j.data.banner_enabled !== '1' || !j.data.banner_text) return;
        // Bannière uniquement sur l'index
        const isIndex = window.location.pathname.endsWith('index.html') || window.location.pathname === '/' || window.location.pathname.endsWith('equallyesport.fr/');
        if (!isIndex) return;
        const dismissed = sessionStorage.getItem('eq_banner_dismissed');
        if (dismissed === j.data.banner_text) return;

        const color  = j.data.banner_color || '#e5000a';
        const banner = document.createElement('div');
        banner.className = 'site-banner show';
        banner.style.cssText = `background:${color};color:#fff`;
        const txt = j.data.banner_text.replace(/</g,'&lt;').replace(/'/g,'&#39;');
        banner.innerHTML = `
          <span>📢 ${txt}</span>
          <button class="banner-close" onclick="this.parentElement.remove()">✕</button>`;

        // Insérer AVANT le header/navbar
        const navbar = document.querySelector('.navbar');
        if (navbar) {
          navbar.parentNode.insertBefore(banner, navbar);
        } else {
          document.body.insertAdjacentElement('afterbegin', banner);
        }
      }).catch(() => {});

    // Sticky + scroll
    const navbar = document.querySelector('.navbar');
    window.addEventListener('scroll', () => {
      navbar.classList.toggle('scrolled', window.scrollY > 40);
    }, { passive: true });

    // Burger
    const burger = document.getElementById('burger');
    const menu   = document.getElementById('nav-menu');
    burger?.addEventListener('click', () => {
      burger.classList.toggle('open');
      menu.classList.toggle('open');
      burger.setAttribute('aria-expanded', menu.classList.contains('open'));
    });
    menu?.querySelectorAll('a').forEach(a => {
      a.addEventListener('click', () => {
        burger.classList.remove('open');
        menu.classList.remove('open');
      });
    });
  }

  /* ════════════════════════════════════
     FOOTER
  ════════════════════════════════════ */
  function buildFooter() {
    const html = `
    <footer role="contentinfo">
      <div class="container">
        <div class="footer-grid">

          <div class="footer-brand">
            <div class="footer-logo-wrap">
              <img src="${root}assets/logo/logo.png" alt="Equally Esport" class="footer-logo-img" />
              <div class="footer-logo">Equally<span>Esport</span></div>
            </div>
            <p class="footer-tagline">
              Organisation esport française fondée sur la compétition,
              la rigueur et la victoire collective.
            </p>
            <div class="social-links" aria-label="Réseaux sociaux">
              <a href="#" class="social-link" aria-label="Twitter / X">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
              </a>
              <a href="#" class="social-link" aria-label="Discord">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057.101 18.08.114 18.1.136 18.116a19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03z"/></svg>
              </a>
              <a href="#" class="social-link" aria-label="Twitch">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M11.571 4.714h1.715v5.143H11.57zm4.715 0H18v5.143h-1.714zM6 0L1.714 4.286v15.428h5.143V24l4.286-4.286h3.428L22.286 12V0zm14.571 11.143l-3.428 3.428h-3.429l-3 3v-3H6.857V1.714h13.714z"/></svg>
              </a>
              <a href="#" class="social-link" aria-label="YouTube">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>
              </a>
              <a href="#" class="social-link" aria-label="Instagram">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 1 0 0 12.324 6.162 6.162 0 0 0 0-12.324zM12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm6.406-11.845a1.44 1.44 0 1 0 0 2.881 1.44 1.44 0 0 0 0-2.881z"/></svg>
              </a>
            </div>
          </div>

          <nav aria-label="Navigation footer">
            <div class="footer-col-title">Navigation</div>
            <ul class="footer-links">
              <li><a href="${root}index.html">Accueil</a></li>
              <li><a href="${root}pages/equipes.html">Équipes</a></li>
              <li><a href="${root}pages/resultats.html">Résultats</a></li>
              <li><a href="${root}pages/actualites.html">Actualités</a></li>
              <li><a href="${root}pages/palmares.html">Palmarès</a></li>
              <li><a href="${root}pages/recrutement.html">Recrutement</a></li>
              <li><a href="${root}pages/contact.html">Contact</a></li>
            </ul>
          </nav>

          <div>
            <div class="footer-col-title">Réseaux</div>
            <ul class="footer-links">
              <li><a id="footer-link-twitter" href="#" target="_blank" rel="noopener">Twitter / X</a></li>
              <li><a id="footer-link-discord" href="#" target="_blank" rel="noopener">Discord</a></li>
              <li><a id="footer-link-twitch" href="#" target="_blank" rel="noopener">Twitch</a></li>
              <li><a id="footer-link-youtube" href="#" target="_blank" rel="noopener">YouTube</a></li>
              <li><a id="footer-link-instagram" href="#" target="_blank" rel="noopener">Instagram</a></li>
            </ul>
          </div>

          <div class="footer-contact">
            <div class="footer-col-title">Discord</div>
            <iframe id="footer-discord-widget" src="https://discord.com/widget?id=1387554505121333318&theme=dark"
              width="100%" height="200"
              style="border:none;border-radius:8px;display:block"
              sandbox="allow-popups allow-popups-to-escape-sandbox allow-same-origin allow-scripts"
              title="Discord Equally Esport">
            </iframe>
            <a id="footer-discord-invite" href="https://discord.gg/6KKdhW9HWs" target="_blank" rel="noopener"
              style="display:flex;align-items:center;gap:.5rem;margin-top:.75rem;font-family:var(--font-mono);font-size:.72rem;color:#5865F2;text-decoration:none;transition:opacity .2s"
              onmouseover="this.style.opacity='.7'" onmouseout="this.style.opacity='1'">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057.101 18.08.114 18.1.136 18.116a19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03z"/></svg>
              Rejoindre le serveur →
            </a>
          </div>

        </div>

        <div class="footer-newsletter">
          <div class="footer-newsletter-text">
            <strong>Ne rate rien.</strong> Actus, résultats et matchs importants, directement par e-mail.
          </div>
          <form id="newsletter-form" class="footer-newsletter-form" autocomplete="off">
            <input type="text" name="_hp" id="nl-hp" style="display:none;position:absolute;left:-9999px" tabindex="-1" autocomplete="off"/>
            <input type="email" id="nl-email" class="footer-newsletter-input" placeholder="ton@email.fr" required/>
            <button type="submit" class="footer-newsletter-btn" id="nl-submit">S'inscrire</button>
          </form>
          <div class="footer-newsletter-msg" id="nl-msg"></div>
        </div>

        <div class="footer-bottom">
          <p class="footer-copy">© 2025 Equally Esport — Tous droits réservés</p>
          <nav class="footer-legal" aria-label="Liens légaux">
            <a href="${root}pages/mentions-legales.html">Mentions légales</a>
            <a href="${root}pages/confidentialite.html">Politique de confidentialité</a>
            <a href="${root}pages/cgu.html">CGU</a>
          </nav>
        </div>
      </div>
    </footer>`;

    document.body.insertAdjacentHTML('beforeend', html);

    // Charger les liens réseaux depuis l'API
    try {
      fetch(root + 'api/socials.php')
        .then(r => r.json())
        .then(j => {
          if (!j.ok) return;
          const s = j.data;
          const map = {
            'Twitter / X': s.twitter,
            'Discord':      s.discord,
            'Twitch':       s.twitch,
            'YouTube':      s.youtube,
            'Instagram':    s.instagram
          };
          // Mettre à jour les icônes sociales du footer
          document.querySelectorAll('.social-link').forEach(a => {
            const label = a.getAttribute('aria-label');
            if (map[label] && map[label].startsWith('http')) {
              a.href = map[label];
              a.target = '_blank';
              a.rel = 'noopener';
            }
          });
          // Mettre à jour les liens texte réseaux
          document.querySelectorAll('.footer-links a').forEach(a => {
            const txt = a.textContent.trim();
            if (map[txt] && map[txt].startsWith('http')) {
              a.href = map[txt];
            }
          });
        });
    } catch(e) {}
  }

  /* ════════════════════════════════════
     PAGE LOADER
  ════════════════════════════════════ */
  function buildLoader() {
    const html = `
    <div id="page-loader" role="status" aria-label="Chargement">
      <div class="loader-logo-wrap">
        <img src="${root}assets/logo/logo.png" alt="Equally Esport" class="loader-logo-img" />
        <div class="loader-logo">Equally<span>Esport</span></div>
      </div>
      <div class="loader-bar-track"><div class="loader-bar"></div></div>
    </div>`;
    document.body.insertAdjacentHTML('afterbegin', html);

    // ── Bannière d'annonce ──
    fetch(root + 'api/socials.php')
      .then(r => r.json())
      .then(j => {
        if (!j.ok || j.data.banner_enabled !== '1' || !j.data.banner_text) return;
        // Bannière uniquement sur l'index
        const isIndex = window.location.pathname.endsWith('index.html') || window.location.pathname === '/' || window.location.pathname.endsWith('equallyesport.fr/');
        if (!isIndex) return;
        const dismissed = sessionStorage.getItem('eq_banner_dismissed');
        if (dismissed === j.data.banner_text) return;

        const color  = j.data.banner_color || '#e5000a';
        const banner = document.createElement('div');
        banner.className = 'site-banner show';
        banner.style.cssText = `background:${color};color:#fff`;
        const txt = j.data.banner_text.replace(/</g,'&lt;').replace(/'/g,'&#39;');
        banner.innerHTML = `
          <span>📢 ${txt}</span>
          <button class="banner-close" onclick="this.parentElement.remove()">✕</button>`;

        // Insérer AVANT le header/navbar
        const navbar = document.querySelector('.navbar');
        if (navbar) {
          navbar.parentNode.insertBefore(banner, navbar);
        } else {
          document.body.insertAdjacentElement('afterbegin', banner);
        }
      }).catch(() => {});
    setTimeout(() => document.getElementById('page-loader')?.classList.add('hidden'), 1200);
  }

  /* ── Tracking des visites (pages publiques uniquement) ── */
  function trackVisit() {
    if (window.location.pathname.includes('admin')) return; // pas de tracking sur l'admin
    try {
      const payload = JSON.stringify({
        page: window.location.pathname,
        referrer: document.referrer || ''
      });
      const url = root + 'api/track.php';
      if (navigator.sendBeacon) {
        navigator.sendBeacon(url, new Blob([payload], { type: 'application/json' }));
      } else {
        fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: payload, keepalive: true }).catch(() => {});
      }
    } catch (e) { /* silencieux : le tracking ne doit jamais gêner la navigation */ }
  }

  /* ── Applique les réseaux sociaux / widget Discord réels (depuis l'admin) ── */
  function applySocialSettings() {
    fetch(root + 'api/socials.php')
      .then(r => r.json())
      .then(res => {
        if (!res.ok || !res.data) return;
        const d = res.data;

        const linkMap = {
          twitter: 'footer-link-twitter',
          discord: 'footer-link-discord',
          twitch: 'footer-link-twitch',
          youtube: 'footer-link-youtube',
          instagram: 'footer-link-instagram'
        };
        Object.entries(linkMap).forEach(([key, id]) => {
          const el = document.getElementById(id);
          if (el && d[key]) el.href = d[key];
        });

        // Lien "Rejoindre le serveur" : utilise le lien d'invitation Discord
        const inviteEl = document.getElementById('footer-discord-invite');
        if (inviteEl && d.discord) inviteEl.href = d.discord;

        // Widget Discord : reconstruit l'iframe avec l'ID de serveur configuré
        const widgetEl = document.getElementById('footer-discord-widget');
        if (widgetEl && d.discord_widget) {
          widgetEl.src = `https://discord.com/widget?id=${encodeURIComponent(d.discord_widget)}&theme=dark`;
        }
      })
      .catch(() => {}); // silencieux : ne bloque jamais l'affichage du site si l'API est indisponible
  }

  /* ── Newsletter (footer) ── */
  function initNewsletterForm() {
    const form = document.getElementById('newsletter-form');
    if (!form || form.dataset.wired) return;
    form.dataset.wired = '1';

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const emailEl = document.getElementById('nl-email');
      const hpEl    = document.getElementById('nl-hp');
      const btn     = document.getElementById('nl-submit');
      const msgEl   = document.getElementById('nl-msg');
      const email   = emailEl?.value.trim() || '';

      if (msgEl) { msgEl.textContent = ''; msgEl.style.color = ''; }
      if (!email) return;

      if (btn) { btn.disabled = true; btn.textContent = '…'; }
      try {
        const r = await fetch(root + 'api/newsletter.php', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, _hp: hpEl?.value || '' })
        });
        const j = await r.json();
        if (j.ok) {
          if (msgEl) { msgEl.textContent = '✅ Inscription confirmée, merci !'; msgEl.style.color = '#00c853'; }
          if (emailEl) emailEl.value = '';
        } else {
          if (msgEl) { msgEl.textContent = j.error || 'Une erreur est survenue.'; msgEl.style.color = '#ff5252'; }
        }
      } catch (err) {
        if (msgEl) { msgEl.textContent = 'Impossible de contacter le serveur.'; msgEl.style.color = '#ff5252'; }
      }
      if (btn) { btn.disabled = false; btn.textContent = "S'inscrire"; }
    });
  }

  /* ── Init ── */
  document.addEventListener('DOMContentLoaded', () => {
    buildLoader();
    buildNavbar();
    buildFooter();
    trackVisit();
    applySocialSettings();
    initNewsletterForm();

    // ── Cursor personnalisé ──
    if (window.innerWidth > 768) {
      const dot  = document.createElement('div'); dot.className  = 'cursor-dot';
      const ring = document.createElement('div'); ring.className = 'cursor-ring';
      document.body.appendChild(dot);
      document.body.appendChild(ring);

      let mx = 0, my = 0, rx = 0, ry = 0;
      document.addEventListener('mousemove', e => {
        mx = e.clientX; my = e.clientY;
        dot.style.left  = mx + 'px';
        dot.style.top   = my + 'px';
      });
      // Ring suit avec délai (lerp)
      (function animRing() {
        rx += (mx - rx) * 0.12;
        ry += (my - ry) * 0.12;
        ring.style.left = rx + 'px';
        ring.style.top  = ry + 'px';
        requestAnimationFrame(animRing);
      })();

      // Hover sur éléments cliquables
      document.addEventListener('mouseover', e => {
        if (e.target.closest('a,button,[onclick],.btn,.sidebar-link')) {
          dot.classList.add('hover'); ring.classList.add('hover');
        }
      });
      document.addEventListener('mouseout', e => {
        if (e.target.closest('a,button,[onclick],.btn,.sidebar-link')) {
          dot.classList.remove('hover'); ring.classList.remove('hover');
        }
      });
      document.addEventListener('mousedown', () => { dot.classList.add('click'); ring.classList.add('click'); });
      document.addEventListener('mouseup',   () => { dot.classList.remove('click'); ring.classList.remove('click'); });
    }

    // Vérifier le mode maintenance (sauf sur admin)
    if (!window.location.pathname.includes('admin')) {
      fetch(root + 'api/socials.php')
        .then(r => r.json())
        .then(j => {
          if (j.ok && j.data.maintenance === '1') {
            document.body.innerHTML = `
              <style>
                @import url('https://fonts.googleapis.com/css2?family=Barlow+Condensed:ital,wght@1,900&display=swap');
                body{margin:0;background:#050505;overflow:hidden}
                .maint-wrap{min-height:100vh;display:flex;align-items:center;justify-content:center;text-align:center;position:relative;font-family:'Segoe UI',sans-serif}
                .maint-bg{position:fixed;inset:0;background:radial-gradient(ellipse 60% 60% at 50% 50%,rgba(229,0,10,.06) 0%,transparent 70%);pointer-events:none}
                .maint-particles{position:fixed;inset:0;pointer-events:none;overflow:hidden}
                .maint-particle{position:absolute;width:2px;height:2px;background:rgba(229,0,10,.4);border-radius:50%;animation:float-p linear infinite}
                @keyframes float-p{0%{transform:translateY(100vh) translateX(0);opacity:0}10%{opacity:1}90%{opacity:1}100%{transform:translateY(-100px) translateX(var(--dx));opacity:0}}
                .maint-content{position:relative;z-index:10;padding:2rem}
                .maint-logo{width:160px;height:auto;max-height:100px;object-fit:contain;margin:0 auto 1.5rem;animation:logo-pulse 2s ease-in-out infinite}
                @keyframes logo-pulse{0%,100%{transform:scale(1);filter:drop-shadow(0 0 10px rgba(229,0,10,.4))}50%{transform:scale(1.05);filter:drop-shadow(0 0 25px rgba(229,0,10,.8))}}
                .maint-brand{font-size:1rem;font-weight:700;text-transform:uppercase;letter-spacing:.2em;color:#fff;margin-bottom:.5rem;opacity:0;animation:fade-up .6s ease-out .2s forwards}
                .maint-brand span{color:#e5000a}
                .maint-line{width:60px;height:3px;background:linear-gradient(90deg,transparent,#e5000a,transparent);margin:.75rem auto;opacity:0;animation:fade-up .6s ease-out .4s forwards}
                .maint-title{font-size:clamp(3rem,8vw,6rem);font-weight:900;font-style:italic;text-transform:uppercase;color:#e5000a;line-height:1;margin-bottom:.75rem;opacity:0;animation:fade-up .6s ease-out .5s forwards;text-shadow:0 0 40px rgba(229,0,10,.3)}
                .maint-sub{font-size:1rem;color:#555;line-height:1.6;opacity:0;animation:fade-up .6s ease-out .7s forwards}
                .maint-dots{display:flex;justify-content:center;gap:.5rem;margin-top:2rem;opacity:0;animation:fade-up .6s ease-out .9s forwards}
                .maint-dot{width:8px;height:8px;border-radius:50%;background:#e5000a;animation:dot-bounce .8s ease-in-out infinite}
                .maint-dot:nth-child(2){animation-delay:.15s}
                .maint-dot:nth-child(3){animation-delay:.3s}
                @keyframes dot-bounce{0%,100%{transform:translateY(0);opacity:.3}50%{transform:translateY(-8px);opacity:1}}
                @keyframes fade-up{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:translateY(0)}}
                .maint-border-top{position:fixed;top:0;left:0;right:0;height:3px;background:linear-gradient(90deg,transparent,#e5000a,transparent);animation:scan 3s ease-in-out infinite}
                @keyframes scan{0%,100%{opacity:.3}50%{opacity:1}}
              </style>
              <div class="maint-bg"></div>
              <div class="maint-particles" id="maint-particles"></div>
              <div class="maint-border-top"></div>
              <div class="maint-wrap">
                <div class="maint-content">
                  <img src="${root}assets/logo/logo-trimmed.png" alt="Equally Esport" class="maint-logo"/>
                  <div class="maint-brand">EQUALLY <span>ESPORT</span></div>
                  <div class="maint-line"></div>
                  <div class="maint-title">Maintenance</div>
                  <p class="maint-sub">Notre site est momentanément en maintenance.<br>Nous revenons très bientôt !</p>
                  <div class="maint-dots">
                    <div class="maint-dot"></div>
                    <div class="maint-dot"></div>
                    <div class="maint-dot"></div>
                  </div>
                </div>
              </div>
              <script>
                // Particules
                const c = document.getElementById('maint-particles');
                for(let i=0;i<25;i++){
                  const p=document.createElement('div');
                  p.className='maint-particle';
                  p.style.cssText='left:'+Math.random()*100+'%;animation-duration:'+(6+Math.random()*8)+'s;animation-delay:'+(-Math.random()*10)+'s;--dx:'+(Math.random()*100-50)+'px';
                  c.appendChild(p);
                }
              </script>`;
          }
        }).catch(() => {});
    }
  });

})();
