/* ============================================
   EQUALLY ESPORT — JS PREMIUM v2
   ============================================ */

document.addEventListener('DOMContentLoaded', () => {

  /* ---- PAGE LOADER ---- */
  const loader = document.getElementById('page-loader');
  if (loader) {
    setTimeout(() => {
      loader.classList.add('hide');
      setTimeout(() => loader.remove(), 700);
    }, 1400);
  }

  /* ---- CUSTOM CURSOR ---- */
  const cursor = document.querySelector('.cursor');
  const ring   = document.querySelector('.cursor-ring');
  if (cursor && ring) {
    let mx = 0, my = 0, rx = 0, ry = 0;
    document.addEventListener('mousemove', e => { mx = e.clientX; my = e.clientY; });
    function animCursor() {
      cursor.style.left = mx + 'px'; cursor.style.top = my + 'px';
      rx += (mx - rx) * 0.14; ry += (my - ry) * 0.14;
      ring.style.left = rx + 'px'; ring.style.top = ry + 'px';
      requestAnimationFrame(animCursor);
    }
    animCursor();
    document.querySelectorAll('a, button, .team-card, .actu-card, .staff-card').forEach(el => {
      el.addEventListener('mouseenter', () => { cursor.classList.add('hover'); ring.classList.add('hover'); });
      el.addEventListener('mouseleave', () => { cursor.classList.remove('hover'); ring.classList.remove('hover'); });
    });
  }

  /* ---- NAVBAR SCROLL ---- */
  const navbar = document.querySelector('.navbar');
  if (navbar) {
    const onScroll = () => navbar.classList.toggle('scrolled', window.scrollY > 20);
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  }

  /* ---- ACTIVE NAV LINK ---- */
  const page = window.location.pathname.split('/').pop() || 'index.html';
  document.querySelectorAll('.nav-links a').forEach(a => {
    if (a.getAttribute('href') === page ||
        (page === '' && a.getAttribute('href') === 'index.html') ||
        (page === 'index.html' && a.getAttribute('href') === 'index.html')) {
      a.classList.add('active');
    }
  });

  /* ---- HAMBURGER MOBILE ---- */
  const hamburger = document.querySelector('.nav-hamburger');
  const mobileMenu = document.querySelector('.nav-mobile');
  if (hamburger && mobileMenu) {
    hamburger.addEventListener('click', () => {
      const open = mobileMenu.classList.toggle('open');
      hamburger.setAttribute('aria-expanded', open);
      const [s1, s2, s3] = hamburger.querySelectorAll('span');
      if (open) {
        s1.style.transform = 'rotate(45deg) translate(5px, 5px)';
        s2.style.opacity = '0'; s2.style.transform = 'scaleX(0)';
        s3.style.transform = 'rotate(-45deg) translate(5px, -5px)';
      } else {
        [s1, s2, s3].forEach(s => { s.style.transform = ''; s.style.opacity = ''; });
      }
    });
    document.addEventListener('click', e => {
      if (!hamburger.contains(e.target) && !mobileMenu.contains(e.target)) {
        mobileMenu.classList.remove('open');
        hamburger.setAttribute('aria-expanded', 'false');
      }
    });
  }

  /* ---- SCROLL REVEAL ---- */
  const revealObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry, i) => {
      if (entry.isIntersecting) {
        const delay = entry.target.dataset.delay || i * 90;
        setTimeout(() => entry.target.classList.add('revealed'), +delay);
        revealObserver.unobserve(entry.target);
      }
    });
  }, { threshold: 0.12 });
  document.querySelectorAll('[data-reveal]').forEach(el => revealObserver.observe(el));

  /* ---- COUNTER ANIMATION ---- */
  const counterObs = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      const el = entry.target;
      const target = parseInt(el.dataset.target);
      const suffix = el.dataset.suffix || '';
      const duration = 1200;
      const start = performance.now();
      const initial = target > 1000 ? target - 200 : 0;
      function update(now) {
        const elapsed = Math.min((now - start) / duration, 1);
        const eased = 1 - Math.pow(1 - elapsed, 3);
        const value = Math.round(initial + (target - initial) * eased);
        el.textContent = value + suffix;
        if (elapsed < 1) requestAnimationFrame(update);
      }
      requestAnimationFrame(update);
      counterObs.unobserve(el);
    });
  }, { threshold: 0.5 });
  document.querySelectorAll('.stat-num[data-target]').forEach(c => counterObs.observe(c));

  /* ---- PARTICLES HERO ---- */
  const heroParticles = document.querySelector('.hero-particles');
  if (heroParticles) {
    for (let i = 0; i < 18; i++) {
      const p = document.createElement('div');
      p.className = 'particle';
      const size = Math.random() * 4 + 2;
      p.style.cssText = `
        width:${size}px; height:${size}px;
        left:${Math.random() * 100}%;
        bottom:${Math.random() * 30}%;
        --dur:${5 + Math.random() * 6}s;
        --delay:${Math.random() * 6}s;
        --op:${0.2 + Math.random() * 0.4};
      `;
      heroParticles.appendChild(p);
    }
  }

  /* ---- GLITCH ON HOVER ---- */
  document.querySelectorAll('.glitch').forEach(el => {
    el.dataset.text = el.textContent;
  });

  /* ---- TYPEWRITER EFFECT ---- */
  const typeEl = document.querySelector('[data-typewriter]');
  if (typeEl) {
    const words = typeEl.dataset.typewriter.split('|');
    let wi = 0, ci = 0, deleting = false;
    function type() {
      const word = words[wi];
      if (!deleting) {
        typeEl.textContent = word.slice(0, ++ci);
        if (ci === word.length) { deleting = true; setTimeout(type, 1800); return; }
      } else {
        typeEl.textContent = word.slice(0, --ci);
        if (ci === 0) { deleting = false; wi = (wi + 1) % words.length; }
      }
      setTimeout(type, deleting ? 60 : 90);
    }
    setTimeout(type, 800);
  }

  /* ---- TILT 3D CARDS ---- */
  document.querySelectorAll('.team-card, .stat, .staff-card').forEach(card => {
    card.addEventListener('mousemove', e => {
      const rect = card.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width  - 0.5;
      const y = (e.clientY - rect.top)  / rect.height - 0.5;
      card.style.transform = `translateY(-5px) rotateY(${x * 6}deg) rotateX(${-y * 6}deg)`;
    });
    card.addEventListener('mouseleave', () => {
      card.style.transform = '';
    });
  });

  /* ---- SMOOTH ANCHOR ---- */
  document.querySelectorAll('a[href^="#"]').forEach(a => {
    a.addEventListener('click', e => {
      const t = document.querySelector(a.getAttribute('href'));
      if (t) { e.preventDefault(); t.scrollIntoView({ behavior: 'smooth', block: 'start' }); }
    });
  });

  /* ---- RIPPLE EFFECT ON BUTTONS ---- */
  document.querySelectorAll('.btn-primary, .btn-secondary, .nav-btn, .form-submit').forEach(btn => {
    btn.addEventListener('click', function(e) {
      const rect = this.getBoundingClientRect();
      const r = document.createElement('span');
      const size = Math.max(rect.width, rect.height);
      r.style.cssText = `
        position:absolute; border-radius:50%; background:rgba(255,255,255,0.25);
        width:${size}px; height:${size}px;
        left:${e.clientX - rect.left - size/2}px;
        top:${e.clientY - rect.top - size/2}px;
        transform:scale(0); animation:ripple 0.5s linear;
        pointer-events:none;
      `;
      this.style.position = 'relative'; this.style.overflow = 'hidden';
      this.appendChild(r);
      setTimeout(() => r.remove(), 500);
    });
  });
  const rippleStyle = document.createElement('style');
  rippleStyle.textContent = '@keyframes ripple{to{transform:scale(2.5);opacity:0}}';
  document.head.appendChild(rippleStyle);

  /* ---- SHOP IFRAME FALLBACK ---- */
  const iframe   = document.querySelector('#shopIframe');
  const shopLoader = document.querySelector('#shopLoader');
  const shopFallback = document.querySelector('#shopFallback');
  if (iframe && shopLoader) {
    iframe.addEventListener('load', () => shopLoader.classList.add('hidden'));
    setTimeout(() => {
      try {
        const doc = iframe.contentDocument || iframe.contentWindow.document;
        if (!doc || !doc.body || doc.body.innerHTML.trim() === '') throw new Error();
      } catch(e) {
        shopLoader.classList.add('hidden');
        iframe.style.display = 'none';
        if (shopFallback) shopFallback.style.display = 'flex';
      }
    }, 6000);
  }

  /* ---- FILTER BUTTONS ---- */
  document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.addEventListener('click', function() {
      this.closest('.shop-filters, .actus-filters')
        ?.querySelectorAll('.filter-btn')
        .forEach(b => b.classList.remove('active'));
      this.classList.add('active');
    });
  });

  /* ---- PARALLAX HERO LOGO ---- */
  const heroLogo = document.querySelector('.hero-logo');
  if (heroLogo) {
    window.addEventListener('scroll', () => {
      heroLogo.style.transform = `translateY(${window.scrollY * 0.12}px)`;
    }, { passive: true });
  }

});
