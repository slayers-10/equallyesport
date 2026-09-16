/* ═══════════════════════════════════════
   main.js — Initialisation globale
   ═══════════════════════════════════════ */

document.addEventListener('DOMContentLoaded', async () => {

  /* ── LOADER DE PAGE ── */
  const loader = document.getElementById('page-loader');
  if (loader) {
    setTimeout(() => loader.classList.add('hidden'), 1400);
  }

  /* ── NAVBAR STICKY + SCROLL ACTIVE ── */
  const navbar = document.querySelector('.navbar');
  const burger = document.getElementById('burger');
  const navMenu = document.getElementById('nav-menu');

  if (navbar) {
    window.addEventListener('scroll', () => {
      navbar.classList.toggle('scrolled', window.scrollY > 40);
      const sections = document.querySelectorAll('section[id]');
      let current = '';
      sections.forEach(section => {
        if (window.scrollY >= section.offsetTop - 100) current = section.id;
      });
      document.querySelectorAll('.navbar-nav a[href^="#"]').forEach(link => {
        link.classList.toggle('active', link.getAttribute('href') === `#${current}`);
      });
    }, { passive: true });
  }

  if (burger && navMenu) {
    burger.addEventListener('click', () => {
      burger.classList.toggle('open');
      navMenu.classList.toggle('open');
      burger.setAttribute('aria-expanded', navMenu.classList.contains('open'));
    });
    navMenu.querySelectorAll('a').forEach(link => {
      link.addEventListener('click', () => {
        burger.classList.remove('open');
        navMenu.classList.remove('open');
        burger.setAttribute('aria-expanded', 'false');
      });
    });
  }

  /* ── SCROLL REVEAL GÉNÉRAL ── */
  const revealObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        revealObserver.unobserve(entry.target);
      }
    });
  }, { threshold: 0.1, rootMargin: '0px 0px -50px 0px' });

  document.querySelectorAll('.reveal, .reveal-left, .reveal-right')
    .forEach(el => revealObserver.observe(el));

  /* ── POSTES OUVERTS (recrutement) ── */
  const positions = [
    { game: 'VAL', role: 'Duelist',   level: 'Immortal+' },
    { game: 'CS2', role: 'Support',   level: 'Faceit 8+' },
    { game: 'LOL', role: 'Jungler',   level: 'Diamond+'  },
    { game: 'RL',  role: 'Attaquant', level: 'Champion+' },
    { game: 'VAL', role: 'Controller',level: 'Immortal+' },
    { game: 'CS2', role: 'AWPer',     level: 'Faceit 9+' },
  ];
  const posGrid = document.getElementById('open-positions');
  if (posGrid) {
    positions.forEach(pos => {
      const card = document.createElement('div');
      card.className = 'position-card reveal';
      card.innerHTML = `
        <div class="position-game">${pos.game}</div>
        <div class="position-info">
          <div class="role-name">${pos.role}</div>
          <div class="role-level">${pos.level}</div>
        </div>`;
      posGrid.appendChild(card);
    });
    if (window.addStaggerReveal) addStaggerReveal(posGrid.querySelectorAll('.reveal'));
  }

  /* ── FORMULAIRE RECRUTEMENT ── */
  const form = document.getElementById('recruitment-form');
  if (form) {
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      let valid = true;
      const fields = [
        { id: 'field-pseudo',  msg: 'Ton pseudo est requis.' },
        { id: 'field-game',    msg: 'Choisis un jeu.' },
        { id: 'field-rank',    msg: 'Indique ton rang.' },
        { id: 'field-message', msg: 'Écris quelques mots sur toi.' },
      ];
      fields.forEach(f => {
        const input = document.getElementById(f.id);
        const error = document.getElementById(f.id + '-error');
        if (!input || !error) return;
        const empty = !input.value.trim();
        input.classList.toggle('error', empty);
        error.classList.toggle('show', empty);
        if (empty) valid = false;
      });
      if (valid) {
        const btn = form.querySelector('button[type="submit"]');
        btn.textContent = '✓ Candidature envoyée !';
        btn.style.background = 'var(--color-green)';
        btn.disabled = true;
        form.reset();
        setTimeout(() => {
          btn.textContent = 'Envoyer ma candidature';
          btn.style.background = '';
          btn.disabled = false;
        }, 4000);
      }
    });
    form.querySelectorAll('.form-input, .form-select, .form-textarea').forEach(input => {
      input.addEventListener('focus', () => {
        input.classList.remove('error');
        const err = document.getElementById(input.id + '-error');
        if (err) err.classList.remove('show');
      });
    });
  }

  /* ── CHARGEMENT DONNÉES (admin-first) ── */
  if (window.initDataLoaders) await initDataLoaders();

  /* ── REVEAL sur éléments injectés dynamiquement ── */
  document.querySelectorAll('.reveal, .reveal-left, .reveal-right')
    .forEach(el => revealObserver.observe(el));

  /* ── PARTICULES ── */
  if (window.initParticles) initParticles();

  /* ── COMPTEURS ── */
  if (window.initCounters) initCounters();

});
