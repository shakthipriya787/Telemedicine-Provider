(function () {
  'use strict';

  var REDUCED = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var HAS_GSAP = typeof window.gsap !== 'undefined' && typeof window.ScrollTrigger !== 'undefined';

  /* ================== PRELOADER ================== */
  function preloader() {
    var el = document.querySelector('.preloader');
    if (!el) return;
    var hide = function () { el.classList.add('done'); setTimeout(function () { el.remove(); }, 900); };
    if (REDUCED) { hide(); return; }
    window.addEventListener('load', function () { setTimeout(hide, 550); });
    setTimeout(hide, 2600);
  }

  /* ================== HEADER / NAV ================== */
  function header() {
    var head = document.querySelector('.site-header');
    var burger = document.querySelector('.burger');
    var links = document.querySelector('.nav-links');
    var overlay = document.createElement('div');
    overlay.className = 'nav-overlay';
    document.body.appendChild(overlay);

    function onScroll() {
      if (!head) return;
      head.classList.toggle('stuck', window.scrollY > 12);
      var top = document.querySelector('.to-top');
      if (top) top.classList.toggle('show', window.scrollY > 600);
      var p = document.querySelector('.progress');
      if (p) {
        var h = document.documentElement.scrollHeight - window.innerHeight;
        p.style.width = (h > 0 ? (window.scrollY / h) * 100 : 0) + '%';
      }
    }
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });

    var menuScrollY = 0;

    /* Freezing the page by clipping overflow resets the scroll offset, which walks
       the sticky header — and the drawer nested inside it — off the top of the
       screen, so the menu came up empty whenever it was opened after scrolling.
       Pinning <body> keeps the page exactly where the user left it instead. While
       it is pinned the header is switched to position:fixed by the .menu-open
       rules, and the body is padded by the header's height (--nav-lock-pad) so
       the page behind the full-screen drawer does not jump by a frame. */
    function lockPageForMenu(scrollY, headerHeight) {
      menuScrollY = scrollY;
      document.body.classList.add('no-scroll');
      if (headerHeight) document.body.style.setProperty('--nav-lock-pad', headerHeight + 'px');
      document.body.style.position = 'fixed';
      document.body.style.top = '-' + menuScrollY + 'px';
      document.body.style.left = '0';
      document.body.style.right = '0';
      document.body.style.width = '100%';
    }

    function restoreScrollNow() {
      var root = document.documentElement;
      var smooth = root.style.scrollBehavior;
      root.style.scrollBehavior = 'auto';
      window.scrollTo(0, menuScrollY);
      root.style.scrollBehavior = smooth;
    }

    function unlockPageFromMenu() {
      document.body.classList.remove('no-scroll');
      document.body.style.removeProperty('--nav-lock-pad');
      document.body.style.position = '';
      document.body.style.top = '';
      document.body.style.left = '';
      document.body.style.right = '';
      document.body.style.width = '';
      /* Restored with scroll-behavior forced to auto, otherwise html's
         scroll-behavior:smooth would animate the page back up from the top.
         The document only regains its full height on the next frame, so the
         restore is repeated there in case the first one got clamped. */
      restoreScrollNow();
      requestAnimationFrame(restoreScrollNow);
    }

    function close(restoreFocus) {
      if (!links) return;
      var wasOpen = links.classList.contains('open');
      links.classList.remove('open');
      overlay.classList.remove('open');
      if (head) head.classList.remove('menu-open');
      if (burger) {
        burger.classList.remove('open');
        burger.setAttribute('aria-expanded', 'false');
        if (restoreFocus) burger.focus();
      }
      if (wasOpen) unlockPageFromMenu();
    }
    if (burger && links) {
      burger.addEventListener('click', function () {
        /* Both are read before anything is toggled: pinning the header out of the
           flow shrinks the document by its height, and a scroll parked at the very
           bottom is clamped by the browser the moment that happens — so the lock
           has to remember the offset and the in-flow header height the user
           actually had. */
        var menuY = window.pageYOffset || document.documentElement.scrollTop || 0;
        var headH = head ? head.offsetHeight : 0;
        var open = links.classList.toggle('open');
        overlay.classList.toggle('open', open);
        burger.classList.toggle('open', open);
        burger.setAttribute('aria-expanded', open ? 'true' : 'false');
        if (head) head.classList.toggle('menu-open', open);
        if (open) lockPageForMenu(menuY, headH);
        else unlockPageFromMenu();
        /* Keyboard users must land inside the drawer, not behind it */
        if (open) {
          var first = links.querySelector('a');
          if (first) first.focus();
        } else {
          burger.focus();
        }
      });
      overlay.addEventListener('click', function () { close(true); });
      links.querySelectorAll('a').forEach(function (a) { a.addEventListener('click', function () { close(); }); });
      document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape' && links.classList.contains('open')) close(true);
      });
      /* Drawer is hidden by CSS on desktop — never leave it stuck open after a rotate/resize */
      window.addEventListener('resize', function () {
        if (window.innerWidth > 980 && links.classList.contains('open')) close();
      });
      document.addEventListener('focusin', function (e) {
        if (!links.classList.contains('open')) return;
        if (!links.contains(e.target) && e.target !== burger) close(true);
      });
    }

    var top = document.querySelector('.to-top');
    if (top) top.addEventListener('click', function () { window.scrollTo({ top: 0, behavior: REDUCED ? 'auto' : 'smooth' }); });

    var bar = document.createElement('div');
    bar.className = 'progress';
    document.body.appendChild(bar);
  }

  /* ================== GSAP ANIMATIONS ================== */
  function animations() {
    var st = window.ScrollTrigger;

    if (!HAS_GSAP) {
      document.documentElement.classList.add('gsap-fallback');
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (en) {
          if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); }
        });
      }, { threshold: 0.12, rootMargin: '0px 0px -8% 0px' });
      document.querySelectorAll('.reveal').forEach(function (el) { io.observe(el); });
      document.querySelectorAll('.reveal-s').forEach(function (el) { el.classList.add('in'); });
      countUp(true);
      return;
    }

    gsap.registerPlugin(st);

    document.querySelectorAll('.reveal').forEach(function (el) {
      gsap.to(el, {
        opacity: 1, y: 0, duration: 1, ease: 'power3.out',
        scrollTrigger: { trigger: el, start: 'top 88%', once: true }
      });
    });

    document.querySelectorAll('.reveal-s').forEach(function (el) {
      gsap.to(el, {
        opacity: 1, y: 0, duration: .9, ease: 'power3.out',
        scrollTrigger: { trigger: el, start: 'top 92%', once: true }
      });
    });

    if (REDUCED) { countUp(true); return; }

    /* Stagger groups */
    document.querySelectorAll('[data-stagger]').forEach(function (grp) {
      var kids = grp.children;
      if (!kids.length) return;
      gsap.fromTo(kids,
        { opacity: 0, y: 40 },
        {
          opacity: 1, y: 0, duration: .95, ease: 'power3.out', stagger: .11,
          scrollTrigger: { trigger: grp, start: 'top 86%', once: true }
        });
    });

    /* Parallax layers */
    document.querySelectorAll('[data-speed]').forEach(function (el) {
      var s = parseFloat(el.getAttribute('data-speed')) || 0.1;
      gsap.to(el, {
        yPercent: -s * 100, ease: 'none',
        scrollTrigger: { trigger: el.closest('section') || el, start: 'top bottom', end: 'bottom top', scrub: 1 }
      });
    });

    /* Floating orbs */
    document.querySelectorAll('[data-float]').forEach(function (el, i) {
      gsap.to(el, {
        y: i % 2 ? 34 : -34, x: i % 3 ? 18 : -18,
        duration: 4.5 + i * 0.7, repeat: -1, yoyo: true, ease: 'sine.inOut'
      });
    });

    /* Header entrance */
    var header = document.querySelector('.site-header');
    if (header) gsap.from(header, { y: -30, opacity: 0, duration: .9, ease: 'power3.out' });

    /* Hero cinematic */
    var hero = document.querySelector('.hero-intro');
    if (hero) {
      var tl = gsap.timeline({ defaults: { ease: 'power3.out' } });
      tl.fromTo('[data-hero="badge"]', { opacity: 0, y: 26 }, { opacity: 1, y: 0, duration: .8 })
        .fromTo('[data-hero="title"] .word', { yPercent: 115, opacity: 0 }, { yPercent: 0, opacity: 1, duration: 1.05, stagger: .07 }, '-=.4')
        .fromTo('[data-hero="lead"]', { opacity: 0, y: 26 }, { opacity: 1, y: 0, duration: .85 }, '-=.6')
        .fromTo('[data-hero="actions"] > *', { opacity: 0, y: 26 }, { opacity: 1, y: 0, duration: .8, stagger: .1 }, '-=.55')
        .fromTo('[data-hero="trust"]', { opacity: 0, y: 22 }, { opacity: 1, y: 0, duration: .8 }, '-=.5')
        .fromTo('.hero-visual', { opacity: 0, scale: .92, x: 40 }, { opacity: 1, scale: 1, x: 0, duration: 1.25, ease: 'power4.out' }, '-=1.5');
    }

    /* Section title line wipe */
    document.querySelectorAll('[data-line]').forEach(function (el) {
      gsap.fromTo(el, { yPercent: 100 }, {
        yPercent: 0, duration: 1, ease: 'power4.out',
        scrollTrigger: { trigger: el, start: 'top 92%', once: true }
      });
    });

    /* Dark section background glow */
    document.querySelectorAll('.sect-dark').forEach(function (s) {
      gsap.fromTo(s, { backgroundPosition: '50% 0%' }, {
        backgroundPosition: '50% 100%', ease: 'none',
        scrollTrigger: { trigger: s, start: 'top bottom', end: 'bottom top', scrub: 1.2 }
      });
    });

    countUp(false);
  }

  /* ================== DASHBOARD ================== */
  function dashboard() {
    var side = document.querySelector('.side');
    var toggle = document.querySelector('.side-toggle');
    var backdrop = document.createElement('div');
    backdrop.className = 'side-backdrop';
    document.body.appendChild(backdrop);

    /* One place that owns the drawer state, so the toggle, the in-drawer X,
       the backdrop, Escape and link taps can never drift apart. */
    function setSide(open) {
      if (!side) return;
      side.classList.toggle('open', open);
      backdrop.classList.toggle('open', open);
      if (toggle) {
        toggle.classList.toggle('open', open);
        toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
      }
      document.body.classList.toggle('no-scroll', open);
      /* html carries overflow-x:clip, so a body-only lock never reaches the
         viewport: the lock must sit on <html> too. */
      document.documentElement.classList.toggle('no-scroll', open);
    }

    if (side && toggle) {
      toggle.addEventListener('click', function () {
        setSide(!side.classList.contains('open'));
      });
      document.querySelectorAll('[data-side-close]').forEach(function (b) {
        b.addEventListener('click', function () {
          setSide(false);
          toggle.focus();
        });
      });
      backdrop.addEventListener('click', function () { setSide(false); });
      side.querySelectorAll('.side-link').forEach(function (a) {
        a.addEventListener('click', function () { setSide(false); });
      });
      document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape' && side.classList.contains('open')) setSide(false);
      });
      window.addEventListener('resize', function () {
        if (window.innerWidth > 1024 && side.classList.contains('open')) setSide(false);
      });
    }

    /* Filterable tables */
    document.querySelectorAll('[data-table-filter]').forEach(function (input) {
      var table = document.querySelector(input.getAttribute('data-table-filter'));
      if (!table) return;
      input.addEventListener('input', function () {
        var q = input.value.toLowerCase().trim();
        table.querySelectorAll('tbody tr').forEach(function (tr) {
          tr.style.display = tr.textContent.toLowerCase().indexOf(q) > -1 ? '' : 'none';
        });
      });
    });

    /* Table row select + bulk action */
    document.querySelectorAll('[data-select-all]').forEach(function (cb) {
      var table = cb.closest('table');
      if (!table) return;
      cb.addEventListener('change', function () {
        table.querySelectorAll('tbody input[type="checkbox"]').forEach(function (c) { c.checked = cb.checked; });
      });
    });

    /* Row action buttons */
    document.querySelectorAll('.act-btn, .btn-icon-sm').forEach(function (b) {
      b.addEventListener('click', function () {
        var host = b.closest('tr') || b.closest('.app-card');
        if (!host) return;
        if (b.hasAttribute('data-confirm')) {
          var st = host.querySelector('.pill-state');
          if (st) {
            st.textContent = 'Resolved';
            st.className = 'pill-state st-green';
            st.innerHTML = '<i></i>Resolved';
          } else {
            var label = host.querySelector('.app-info b');
            if (label) label.textContent = 'Assigned to care team';
            var meta = host.querySelector('.app-info .meta');
            if (meta) meta.innerHTML = '<span>Assigned just now</span>';
            host.style.borderColor = 'var(--brand)';
          }
          var ico = b.innerHTML;
          b.innerHTML = '<i class="fa-solid fa-check fa-iw" aria-hidden="true"></i>';
          b.style.background = 'var(--brand)';
          b.style.color = '#fff';
          b.style.borderColor = 'transparent';
          setTimeout(function () { b.innerHTML = ico; b.style.background = ''; b.style.color = ''; b.style.borderColor = ''; }, 1400);
        } else if (b.hasAttribute('data-block')) {
          host.style.opacity = '.45';
          host.style.pointerEvents = 'none';
        }
      });
    });

    /* Tabs inside panels */
    document.querySelectorAll('[data-tab-group]').forEach(function (grp) {
      grp.addEventListener('click', function (e) {
        var tab = e.target.closest('.tab');
        if (!tab) return;
        grp.querySelectorAll('.tab').forEach(function (t) { t.classList.remove('active'); });
        tab.classList.add('active');
        var key = tab.getAttribute('data-range') || tab.textContent.trim();
        var target = document.querySelector(grp.getAttribute('data-tab-group'));
        if (!target) return;
        var byRange = target.getAttribute('data-series-map');
        var labels = target.getAttribute('data-labels');
        try {
          if (byRange) {
            var map = JSON.parse(byRange);
            var set = map[key];
            if (set) drawChart(target, set.series, key, set.labels || (labels ? labels.split(',') : null));
          } else {
            var raw = target.getAttribute('data-chart');
            if (raw) drawChart(target, JSON.parse(raw), key, labels ? labels.split(',') : null);
          }
        } catch (err) {}
      });
    });

    /* Charts */
    document.querySelectorAll('[data-chart]').forEach(function (w) {
      var raw = w.getAttribute('data-chart');
      var labels = w.getAttribute('data-labels');
      try {
        drawChart(w, JSON.parse(raw), w.getAttribute('data-active') || '1M', labels ? labels.split(',') : null);
      } catch (err) {}
    });

    /* Donut rings: grow each segment from its own start angle */
    document.querySelectorAll('.donut').forEach(function (d) {
      [].slice.call(d.querySelectorAll('circle')).forEach(function (s, i) {
        var da = (s.getAttribute('stroke-dasharray') || '').trim().split(/[\s,]+/).map(Number);
        var len = da[0] || 0, gap = da[1] || 0;
        if (len <= 0) return;
        if (HAS_GSAP && !REDUCED) {
          var obj = { v: 0 };
          gsap.to(obj, {
            v: len, duration: 1.3, ease: 'power3.out', delay: 0.15 + i * 0.12,
            onUpdate: function () { s.setAttribute('stroke-dasharray', obj.v.toFixed(2) + ' ' + gap); },
            onComplete: function () { s.setAttribute('stroke-dasharray', len + ' ' + gap); }
          });
        } else {
          s.setAttribute('stroke-dasharray', len + ' ' + gap);
        }
      });
      var box = d.closest('.donut-wrap');
      var val = box && box.querySelector('[data-count]');
      if (val) countUp(false, val);
    });

    /* Progress bars */
    document.querySelectorAll('.pg-bar i').forEach(function (bar) {
      var w = bar.getAttribute('data-pct') || '70';
      if (HAS_GSAP && !REDUCED) {
        gsap.to(bar, { width: w + '%', duration: 1.4, ease: 'power3.out', delay: .2 });
      } else {
        bar.style.width = w + '%';
      }
    });

    /* Sparklines */
    document.querySelectorAll('.spark').forEach(function (s) {
      var pts = (s.getAttribute('data-spark') || '').split(',').filter(Boolean).map(Number);
      if (pts.length < 2) return;
      var max = Math.max.apply(null, pts), min = Math.min.apply(null, pts);
      var rng = (max - min) || 1;
      var d = pts.map(function (v, i) {
        var x = (i / (pts.length - 1)) * 100;
        var y = 32 - ((v - min) / rng) * 28;
        return (i ? 'L' : 'M') + x.toFixed(1) + ',' + y.toFixed(1);
      }).join(' ');
      s.setAttribute('viewBox', '0 0 100 34');
      s.setAttribute('preserveAspectRatio', 'none');
      var path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      path.setAttribute('d', d);
      s.appendChild(path);
      if (HAS_GSAP && !REDUCED) {
        var len = path.getTotalLength();
        gsap.fromTo(path, { strokeDasharray: len, strokeDashoffset: len }, { strokeDashoffset: 0, duration: 1.5, ease: 'power2.out' });
      }
    });

    /* Mark messages read */
    document.querySelectorAll('.msg[data-msg]').forEach(function (m) {
      m.addEventListener('click', function () { m.classList.remove('unread'); });
    });

    /* Sidebar logout */
    document.querySelectorAll('[data-logout]').forEach(function (b) {
      b.addEventListener('click', function () {
        if (b.classList.contains('busy')) return;
        b.classList.add('busy');
        b.setAttribute('aria-busy', 'true');
        b.querySelector('span').textContent = 'Signing out…';
        setSide(false);
        clearSession();
        setTimeout(function () { window.location.href = b.getAttribute('data-logout') || 'login.html'; }, 700);
      });
    });

    /* Quick replies fill the message composer */
    document.querySelectorAll('[data-reply]').forEach(function (chip) {
      chip.addEventListener('click', function () {
        var box = document.querySelector(chip.getAttribute('data-reply'));
        if (!box) return;
        box.value = chip.getAttribute('data-reply-text') || box.value;
        box.focus();
      });
    });

    /* Toast feedback for any control carrying data-toast */
    document.querySelectorAll('[data-toast]').forEach(function (q) {
      q.addEventListener('click', function () {
        var n = q.getAttribute('data-toast');
        var host = document.querySelector('.dash-body-pad');
        if (!host || !n) return;
        var t = document.createElement('div');
        t.className = 'alert';
        t.style.background = 'color-mix(in srgb,var(--brand) 12%,#fff)';
        t.style.borderColor = 'color-mix(in srgb,var(--brand) 32%,#fff)';
        t.innerHTML = '<i class="fa-solid fa-circle-check fa-iw" style="color:var(--brand)" aria-hidden="true"></i><p><b>' + n + '</b></p>';
        host.insertBefore(t, host.firstChild);
        setTimeout(function () { t.remove(); }, 2600);
      });
    });
  }

  /* ================== COME BACK FROM 404 ================== */
  /* Opened from file:// the browser sends no Referer, so the page that sent you
     to 404 is stamped here before the jump and read back on arrival. Referrer
     and then real history are the fallbacks; the home page is the last resort. */
  var ORIGIN_KEY = 'stacklyFrom';
  var RESTORE_KEY = 'stacklyRestoreScroll';

  function rememberOrigin() {
    try {
      window.sessionStorage.setItem(ORIGIN_KEY, JSON.stringify({
        url: window.location.href,
        x: window.scrollX || 0,
        y: window.scrollY || 0
      }));
    } catch (e) {}
  }

  function parseOrigin(raw) {
    if (!raw) return null;
    var data = null;
    try { data = JSON.parse(raw); } catch (e) { data = { url: raw, x: 0, y: 0 }; }
    if (!data || !data.url) return null;
    var url;
    try { url = new URL(data.url, window.location.href); } catch (e) { return null; }
    if (url.protocol !== window.location.protocol || url.origin !== window.location.origin) return null;
    var name = decodeURIComponent(url.pathname.split('/').pop() || '');
    if (!/\.html?$/i.test(name) || /^404\.html?$/i.test(name)) return null;
    return { url: url.href, x: Number(data.x)||0, y: Number(data.y)||0 };
  }

  function comeBack() {
    var stored = '';
    try { stored = window.sessionStorage.getItem(ORIGIN_KEY) || ''; } catch (e) {}
    var origin = parseOrigin(stored);
    if (origin) return origin;
    if (document.referrer) return parseOrigin(JSON.stringify({url:document.referrer,x:0,y:0}));
    return null;
  }

  function capture404Origin() {
    document.addEventListener('click', function (e) {
      if (e.defaultPrevented || e.button || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      var a = e.target.closest && e.target.closest('a[href]');
      if (!a) return;
      var href = a.getAttribute('href') || '';
      try {
        var u = new URL(href, window.location.href);
        if (/\/404\.html?$/i.test(u.pathname)) rememberOrigin();
      } catch (err) {}
    }, true);
  }

  function backControl() {
    document.querySelectorAll('[data-back]').forEach(function (b) {
      b.addEventListener('click', function () {
        var target = comeBack();
        if (target) {
          try { window.sessionStorage.setItem(RESTORE_KEY, JSON.stringify(target)); } catch (e) {}
          /* Returning through history preserves the previous document and its scroll
             position immediately; RESTORE_KEY remains as a safety net if the browser
             reloads the page instead of restoring it from history. */
          if (window.history.length > 1) { window.history.back(); return; }
          window.location.replace(target.url);
          return;
        }
        if (window.history.length > 1) { window.history.back(); return; }
        window.location.href = b.getAttribute('data-back') || 'index.html';
      });
    });
  }

  function restoreScrollPosition() {
    var raw='';
    try { raw=window.sessionStorage.getItem(RESTORE_KEY)||''; } catch(e){}
    if(!raw) return;
    var target=parseOrigin(raw);
    if(!target) return;
    var here;
    try { here=new URL(window.location.href); } catch(e){ return; }
    var there=new URL(target.url);
    if(here.origin!==there.origin || here.pathname!==there.pathname || here.search!==there.search) return;
    try { window.sessionStorage.removeItem(RESTORE_KEY); window.sessionStorage.removeItem(ORIGIN_KEY); } catch(e){}
    var restore=function(){ window.scrollTo(target.x,target.y); };
    requestAnimationFrame(function(){ requestAnimationFrame(restore); });
    window.addEventListener('load', function(){ setTimeout(restore,60); }, {once:true});
  }

  function selectIcons() {
    document.querySelectorAll('select').forEach(function (select) {
      if (select.parentElement && select.parentElement.classList.contains('select-wrap')) return;
      var wrap=document.createElement('div');
      wrap.className='select-wrap';
      select.parentNode.insertBefore(wrap,select);
      wrap.appendChild(select);
      var icon=document.createElement('i');
      icon.className='fa-solid fa-chevron-down fa-iw select-fa';
      icon.setAttribute('aria-hidden','true');
      wrap.appendChild(icon);
    });
  }

  function passwordToggles() {
    document.querySelectorAll('input[type="password"]').forEach(function (input) {
      if (input.parentElement && input.parentElement.classList.contains('password-wrap')) return;
      var wrap=document.createElement('div');
      wrap.className='password-wrap';
      input.parentNode.insertBefore(wrap,input);
      wrap.appendChild(input);
      var btn=document.createElement('button');
      btn.type='button';
      btn.className='password-toggle';
      btn.setAttribute('aria-label','Show password');
      btn.setAttribute('aria-pressed','false');
      btn.innerHTML='<i class="fa-solid fa-eye fa-iw" aria-hidden="true"></i>';
      wrap.appendChild(btn);
      btn.addEventListener('click',function(){
        var show=input.type==='password';
        input.type=show?'text':'password';
        btn.setAttribute('aria-label',show?'Hide password':'Show password');
        btn.setAttribute('aria-pressed',show?'true':'false');
        btn.innerHTML='<i class="fa-solid '+(show?'fa-eye-slash':'fa-eye')+' fa-iw" aria-hidden="true"></i>';
        input.focus({preventScroll:true});
      });
    });
  }

  /* ================== DASHBOARD 404 GATE ================== */
  /* On dashboard pages only the Stackly logo, the sidebar links, the drawer
     open/close controls, the in-panel tabs/filter chips and Log out stay live.
     Every other button, icon button, arrow, alert action and the search field
     jumps to 404.html instead. Anchors are not the trigger, the click is. */
  var DASH_LIVE = '.side-brand, .dash-brand, .side-link, .side-logout, .side-toggle, [data-side-close], .tab, .chip, .acc-q';
  var DASH_CLICKABLE = 'a, button, [role="button"], summary, input[type="submit"], input[type="button"], input[type="image"]';

  function dashGate() {
    if (!document.body.classList.contains('dash-body')) return;

    function dead(e) {
      e.preventDefault();
      e.stopPropagation();
      rememberOrigin();
      window.location.href = '404.html';
    }

    document.addEventListener('click', function (e) {
      if (e.button) return;                       /* leave middle/right-click to the browser */
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;   /* leave open-in-new-tab alone */
      var hit = e.target.closest(DASH_CLICKABLE);
      if (!hit || hit.closest(DASH_LIVE)) return;
      dead(e);
    }, true);

    /* The search field is not a button, so catch it on the way to focus.
       Capture phase means the field never even gets the caret. */
    document.addEventListener('focusin', function (e) {
      if (e.target.closest && e.target.closest('.search-box')) dead(e);
    }, true);
  }

  function drawChart(w, series, range, labels) {
    var wv = w.clientWidth || 640, hv = w.clientHeight || 250;
    var pad = { t: 18, r: 14, b: 30, l: 40 };
    var iw = wv - pad.l - pad.r, ih = hv - pad.t - pad.b;
    var vals = [];
    series.forEach(function (s) { vals = vals.concat(s.data); });
    var max = Math.max.apply(null, vals), min = Math.min.apply(null, vals);
    var span = (max - min) || 1;
    max += span * 0.12; min -= span * 0.12;
    span = max - min;

    var n = labels ? labels.length : series[0].data.length;
    var pts = series.map(function (s) {
      return s.data.map(function (v, i) {
        return {
          x: pad.l + (n === 1 ? iw / 2 : (i / (n - 1)) * iw),
          y: pad.t + ih - ((v - min) / span) * ih
        };
      });
    });

    var svg = '<svg viewBox="0 0 ' + wv + ' ' + hv + '" preserveAspectRatio="none">';
    svg += '<defs>';
    series.forEach(function (s, si) {
      svg += '<linearGradient id="g' + range.replace(/\W/g, '') + si + '" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="' + s.color + '" stop-opacity=".32"/><stop offset="100%" stop-color="' + s.color + '" stop-opacity="0"/></linearGradient>';
    });
    svg += '</defs>';

    for (var g = 0; g <= 3; g++) {
      var gy = pad.t + (ih / 3) * g;
      svg += '<line class="grid-line" x1="' + pad.l + '" y1="' + gy + '" x2="' + (wv - pad.r) + '" y2="' + gy + '"/>';
    }

    series.forEach(function (s, si) {
      var p = pts[si];
      var line = p.map(function (pt, i) { return (i ? 'L' : 'M') + pt.x.toFixed(1) + ',' + pt.y.toFixed(1); }).join(' ');
      svg += '<path d="' + line + ' L' + p[p.length - 1].x.toFixed(1) + ',' + (pad.t + ih) + ' L' + p[0].x.toFixed(1) + ',' + (pad.t + ih) + ' Z" fill="url(#g' + range.replace(/\W/g, '') + si + ')"/>';
      svg += '<path class="ln" d="' + line + '" fill="none" stroke="' + s.color + '" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/>';
      p.forEach(function (pt) {
        svg += '<circle cx="' + pt.x.toFixed(1) + '" cy="' + pt.y.toFixed(1) + '" r="4" fill="#fff" stroke="' + s.color + '" stroke-width="2.4"/>';
      });
    });

    if (labels) {
      var skip = wv < 520 ? Math.ceil(labels.length / 6) : 1;
      labels.forEach(function (l, i) {
        if (i % skip) return;
        var x = pad.l + (i / (n - 1)) * iw;
        svg += '<text class="axis-t" x="' + x.toFixed(1) + '" y="' + (hv - 8) + '" text-anchor="middle">' + l + '</text>';
      });
    }
    svg += '</svg>';
    w.innerHTML = svg;

    if (HAS_GSAP && !REDUCED) {
      w.querySelectorAll('.ln').forEach(function (ln) {
        var len = ln.getTotalLength();
        gsap.fromTo(ln, { strokeDasharray: len, strokeDashoffset: len }, { strokeDashoffset: 0, duration: 1.5, ease: 'power3.inOut' });
      });
      w.querySelectorAll('circle').forEach(function (c, i) {
        gsap.fromTo(c, { scale: 0, transformOrigin: 'center' }, { scale: 1, duration: .5, delay: .7 + i * .04, ease: 'back.out(2.5)' });
      });
      var wrap = w.querySelector('svg');
      if (wrap) gsap.fromTo(wrap, { opacity: 0 }, { opacity: 1, duration: .5 });
    }
  }

  function countUp(immediate, el) {
    var nodes = el ? [el] : document.querySelectorAll('[data-count]');
    if (!nodes.length) return;
    [].forEach.call(nodes, function (node) {
      var target = parseFloat(node.getAttribute('data-count')) || 0;
      var dec = node.getAttribute('data-dec') | 0;
      var sufEl = node.parentElement && node.parentElement.querySelector('.suf');
      if (immediate || REDUCED || !HAS_GSAP) {
        node.textContent = target.toFixed(dec);
        return;
      }
      if (sufEl && node.dataset.done) return;
      node.dataset.done = '1';
      var obj = { v: 0 };
      gsap.to(obj, {
        v: target, duration: 2, ease: 'power2.out',
        onUpdate: function () { node.textContent = obj.v.toFixed(dec); }
      });
    });
  }

  /* ================== SLIDERS ================== */
  function sliders() {
    document.querySelectorAll('.slider').forEach(function (sl) {
      var track = sl.querySelector('.s-track');
      var slides = sl.querySelectorAll('.s-slide');
      var prev = sl.parentElement.querySelector('[data-dir="prev"]') || document.querySelector('[data-dir="prev"][data-for="' + sl.id + '"]');
      var next = sl.parentElement.querySelector('[data-dir="next"]') || document.querySelector('[data-dir="next"][data-for="' + sl.id + '"]');
      var dotsWrap = sl.parentElement.querySelector('.dots');
      if (!track || !slides.length) return;

      var idx = 0, timer = null;

      function perView() {
        var w = window.innerWidth;
        if (w <= 760) return 1;
        if (w <= 1100) return 2;
        return 3;
      }
      function maxIdx() { return Math.max(0, slides.length - perView()); }

      function buildDots() {
        if (!dotsWrap) return;
        dotsWrap.innerHTML = '';
        for (var i = 0; i <= maxIdx(); i++) {
          var d = document.createElement('span');
          d.className = 'dot' + (i === idx ? ' active' : '');
          (function (n) {
            d.addEventListener('click', function () { go(n); restart(); });
          })(i);
          dotsWrap.appendChild(d);
        }
      }
      function update() {
        var gap = parseFloat(getComputedStyle(track).columnGap || 26) || 26;
        var w = slides[idx].getBoundingClientRect().width;
        track.style.transform = 'translate3d(-' + (idx * (w + gap)) + 'px,0,0)';
        if (dotsWrap) {
          dotsWrap.querySelectorAll('.dot').forEach(function (d, i) { d.classList.toggle('active', i === idx); });
        }
      }
      function go(n) {
        idx = Math.max(0, Math.min(n, maxIdx()));
        update();
      }
      function restart() {
        if (timer) clearInterval(timer);
        timer = setInterval(function () { go(idx >= maxIdx() ? 0 : idx + 1); }, 5200);
      }

      if (prev) prev.addEventListener('click', function () { go(idx - 1); restart(); });
      if (next) next.addEventListener('click', function () { go(idx + 1); restart(); });

      var sx = null;
      track.addEventListener('touchstart', function (e) { sx = e.touches[0].clientX; }, { passive: true });
      track.addEventListener('touchend', function (e) {
        if (sx === null) return;
        var dx = e.changedTouches[0].clientX - sx;
        if (Math.abs(dx) > 45) go(idx + (dx < 0 ? 1 : -1));
        sx = null; restart();
      });

      buildDots();
      update();
      window.addEventListener('resize', function () { idx = Math.min(idx, maxIdx()); buildDots(); update(); });
      if (HAS_GSAP && !REDUCED) restart();
    });
  }

  /* ================== ACCORDION ================== */
  function accordion() {
    document.querySelectorAll('.acc').forEach(function (acc) {
      var q = acc.querySelector('.acc-q');
      var a = acc.querySelector('.acc-a');
      if (!q || !a) return;
      /* Make pre-opened accordions actually show their answer on first paint. */
      q.setAttribute('aria-expanded', acc.classList.contains('active') ? 'true' : 'false');
      if (acc.classList.contains('active')) a.style.maxHeight = a.scrollHeight + 22 + 'px';
      q.addEventListener('click', function () {
        var open = acc.classList.contains('active');
        var wrap = acc.closest('[data-acc-group]');
        if (wrap && !open) {
          wrap.querySelectorAll('.acc.active').forEach(function (o) {
            o.classList.remove('active');
            var oq = o.querySelector('.acc-q');
            var oa = o.querySelector('.acc-a');
            if (oq) oq.setAttribute('aria-expanded','false');
            if (oa) oa.style.maxHeight = null;
          });
        }
        acc.classList.toggle('active', !open);
        q.setAttribute('aria-expanded', open ? 'false' : 'true');
        a.style.maxHeight = open ? null : a.scrollHeight + 22 + 'px';
      });
    });
    window.addEventListener('resize', function () {
      document.querySelectorAll('.acc.active .acc-a').forEach(function (a) { a.style.maxHeight = a.scrollHeight + 22 + 'px'; });
    });
  }

  /* ================== FORMS ================== */
  function forms() {
    var RULE_TESTS = {
      alpha: function (v) { return /^[A-Za-z]+(?:[ ][A-Za-z]+)*$/.test(v.trim()); },
      gmail: function (v) { return /^[A-Za-z0-9._%+-]+@gmail\.com$/i.test(v.trim()); },
      phone: function (v) { return /^[0-9]{10}$/.test(v.trim()); }
    };

    document.querySelectorAll('form[data-validate]').forEach(function (form) {
      form.addEventListener('submit', function (e) {
        e.preventDefault();
        var ok = true;
        form.querySelectorAll('[required], [data-rules]').forEach(function (inp) {
          var field = inp.closest('.field') || inp.parentElement;
          var v = inp.value.trim();
          var rules = (inp.getAttribute('data-rules') || '').split(/\s+/).filter(Boolean);
          var bad = !v && !!inp.required;
          if (!bad && !v) { field.classList.remove('err'); return; }
          if (!bad && rules.length) {
            bad = rules.some(function (r) { return RULE_TESTS[r] && !RULE_TESTS[r](v); });
          }
          if (!bad && inp.type === 'email' && !rules.length && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v)) bad = true;
          if (!bad && inp.tagName === 'SELECT') bad = !v;
          field.classList.toggle('err', bad);
          if (bad) ok = false;
        });
        var alert = form.querySelector('.form-alert');
        if (!ok) {
          if (alert) { alert.classList.add('show'); alert.querySelector('span').textContent = 'Please fill in all required fields correctly.'; }
          var firstErr = form.querySelector('.field.err input, .field.err select, .field.err textarea');
          if (firstErr) firstErr.focus();
          return;
        }
        var btn = form.querySelector('[type="submit"]');
        var redirect = form.getAttribute('data-redirect');

        /* A form that says where it is going hands off straight away: no
           "Sending…" state, no reset and no confirmation banner, because the
           page it lands on is the acknowledgement. rememberOrigin() stamps this
           page so the 404 back-control can return here. */
        if (redirect) {
          rememberOrigin();
          window.location.href = redirect;
          return;
        }

        var txt = btn ? btn.innerHTML : '';
        if (btn) { btn.disabled = true; btn.innerHTML = 'Sending…'; }
        setTimeout(function () {
          if (btn) { btn.disabled = false; btn.innerHTML = txt; }
          form.reset();
          form.querySelectorAll('.field').forEach(function (f) { f.classList.remove('err'); });
          if (alert) { alert.classList.add('show'); alert.querySelector('span').textContent = 'Thank you! Our care team will reach out within 24 hours.'; }
        }, 1100);
      });
      form.querySelectorAll('input,select,textarea').forEach(function (inp) {
        inp.addEventListener('input', function () {
          var f = inp.closest('.field');
          if (f) f.classList.remove('err');
        });
      });
    });

    document.querySelectorAll('.news-form, .f-news-mini').forEach(function (f) {
      f.addEventListener('submit', function (e) {
        e.preventDefault();
        var i = f.querySelector('input');
        if (!i.value.trim()) return;
        var note = f.parentElement.querySelector('.news-note');
        if (note) note.textContent = "You're on the list! Welcome to the Pulse family.";
        i.value = '';
      });
    });

    var dateIn = document.querySelector('input[type="date"]');
    if (dateIn) {
      var t = new Date();
      var iso = new Date(t.getTime() - t.getTimezoneOffset() * 60000).toISOString().split('T')[0];
      dateIn.min = iso;
      if (!dateIn.value) dateIn.value = iso;
    }
  }

  /* ================== MISC UI ================== */
  function misc() {
    var year = document.querySelectorAll('[data-year]');
    year.forEach(function (y) { y.textContent = new Date().getFullYear(); });

    var clock = document.querySelectorAll('[data-clock]');
    if (clock.length) {
      var tick = function () {
        var d = new Date();
        var h = d.getHours();
        var m = String(d.getMinutes()).padStart(2, '0');
        clock.forEach(function (c) {
          var open = h >= 8 && h < 20;
          c.innerHTML = '<span class="st ' + (open ? 'open' : 'closed') + '">' + (open ? 'Open now' : 'Closed') + '</span> &middot; ' + (h % 12 || 12) + ':' + m + ' ' + (h >= 12 ? 'PM' : 'AM');
        });
      };
      tick();
      setInterval(tick, 30000);
    }

    document.querySelectorAll('[data-filter]').forEach(function (chips) {
      var target = document.querySelector(chips.getAttribute('data-filter'));
      if (!target) return;
      chips.addEventListener('click', function (e) {
        var chip = e.target.closest('.chip');
        if (!chip) return;
        chips.querySelectorAll('.chip').forEach(function (c) { c.classList.remove('active'); });
        chip.classList.add('active');
        var f = chip.getAttribute('data-cat');
        var items = target.querySelectorAll('[data-cats]');
        items.forEach(function (it) {
          var show = f === 'all' || it.getAttribute('data-cats').indexOf(f) > -1;
          if (HAS_GSAP && !REDUCED) {
            gsap.to(it, { opacity: show ? 1 : 0, scale: show ? 1 : .95, duration: .45, ease: 'power2.out' });
            it.style.display = show ? '' : 'none';
          } else {
            it.style.display = show ? '' : 'none';
          }
        });
      });
    });

    document.querySelectorAll('[data-count-up]').forEach(function (b) {
      b.addEventListener('click', function () {
        var id = b.getAttribute('data-count-up');
        var el = document.getElementById(id);
        if (el) el.scrollIntoView({ behavior: REDUCED ? 'auto' : 'smooth', block: 'start' });
      });
    });

    document.querySelectorAll('.play-btn').forEach(function (play) {
      play.addEventListener('click', function () {
        var card = play.closest('.hero-card-main, .vid, .fp-media');
        if (card && HAS_GSAP && !REDUCED) {
          gsap.fromTo(card, { filter: 'brightness(1)' }, { filter: 'brightness(1.35)', duration: .3, yoyo: true, repeat: 1 });
        }
        var note = play.closest('article, section, div').querySelector('.vid-dur');
        if (note) note.textContent = 'Playing';
      });
    });
  }

  /* ================== LOGGED-IN USER ================== */
  var SESSION_KEY = 'stacklySession';

  function nameFromEmail(email) {
    var local = String(email || '').split('@')[0] || '';
    var words = local
      .replace(/\+/g, ' ')
      .split(/[._\-]+|\s+/)
      .filter(function (w) { return /\w/.test(w); });
    if (!words.length) return 'Guest';
    return words.map(function (w) {
      return w.charAt(0).toUpperCase() + w.slice(1).replace(/\d+$/, '');
    }).join(' ').trim();
  }

  function getSession() {
    try {
      var raw = window.localStorage.getItem(SESSION_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (e) { return null; }
  }

  function saveSession(email, role) {
    var data = { email: String(email || '').trim(), role: role || 'user', name: nameFromEmail(email) };
    try { window.localStorage.setItem(SESSION_KEY, JSON.stringify(data)); } catch (e) {}
    return data;
  }

  function clearSession() {
    try { window.localStorage.removeItem(SESSION_KEY); } catch (e) {}
  }

  function userSession() {
    var session = getSession();
    if (!session || !session.email) return;
    var first = session.name ? session.name.split(' ')[0] : session.name;

    document.querySelectorAll('[data-user-name]').forEach(function (el) { el.textContent = session.name; });
    document.querySelectorAll('[data-user-first]').forEach(function (el) { el.textContent = first; });
    document.querySelectorAll('[data-user-email]').forEach(function (el) { el.textContent = session.email; });
    document.querySelectorAll('[data-user-initial]').forEach(function (el) { el.textContent = first.charAt(0).toUpperCase() || 'G'; });
    document.querySelectorAll('[data-user-avatar]').forEach(function (el) { el.alt = session.name; });
  }

  function init() {
    preloader();
    header();
    animations();
    sliders();
    accordion();
    forms();
    misc();
    passwordToggles();
    selectIcons();
    capture404Origin();
    restoreScrollPosition();
    dashGate();
    backControl();
    dashboard();
    userSession();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();