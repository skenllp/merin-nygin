/* ============================================================
   Merin Elsa Roy & Nygin Thomas — Wedding Invitation
   Cinematic flow controller
   Landing cover → invitation video → hero → scroll journey
   ============================================================ */
(function () {
  'use strict';

  var body = document.body;
  var landing = document.getElementById('landing');
  var openBtn = document.getElementById('openBtn');
  var revealBox = document.getElementById('reveal');
  var video = document.getElementById('revealVideo');
  var skipBtn = document.getElementById('skipBtn');
  var heroImg = document.getElementById('heroImg');

  var COVER_FADE_MS = 420;
  var READY_TIMEOUT_MS = 10000;
  var PLAY_SAFETY_MS = 14000;

  /* ---------------------------------------------------------
     0 · Ambient audio
     Plays music.mp3 when the user taps "Open Invitation".
     The disc button toggles mute/unmute (track keeps playing).
     Falls back to pause/resume if mute is not available.
     --------------------------------------------------------- */
  var bgAudio = document.getElementById('bgAudio');
  var audioBtn = document.getElementById('audioBtn');

  /* true once the user gesture has triggered play() */
  var audioUnlocked = false;
  /* tracks whether the user wants silence */
  var userMuted = false;

  /* ---- UI sync ---- */
  function syncAudioBtn() {
    if (!audioBtn) return;
    var playing = !!(bgAudio && !bgAudio.paused && !bgAudio.muted);
    audioBtn.classList.toggle('is-playing', playing);
    audioBtn.setAttribute('aria-pressed', playing ? 'true' : 'false');
    audioBtn.setAttribute('aria-label', playing ? 'Mute music' : 'Unmute music');
  }

  function showAudioBtn() {
    if (!audioBtn) return;
    audioBtn.hidden = false;
    /* small delay so the button animates in after the hero reveals */
    setTimeout(function () {
      audioBtn.classList.add('is-visible');
    }, 80);
  }

  /* ---- Start (called inside the user-gesture of openBtn click) ---- */
  function startAudio() {
    if (!bgAudio) return;
    if (audioUnlocked) {
      /* already unlocked — just unmute if user hadn't silenced it */
      if (!userMuted) {
        bgAudio.muted = false;
        if (bgAudio.paused) bgAudio.play().catch(function () {});
      }
      syncAudioBtn();
      return;
    }

    audioUnlocked = true;
    bgAudio.muted = false;
    bgAudio.volume = 0.72;
    bgAudio.currentTime = 0;

    var p = bgAudio.play();
    if (p && p.then) {
      p.then(function () {
        syncAudioBtn();
        showAudioBtn();
      }).catch(function () {
        /* Autoplay blocked — show button in muted state so user can tap */
        bgAudio.muted = true;
        userMuted = true;
        syncAudioBtn();
        showAudioBtn();
      });
    } else {
      syncAudioBtn();
      showAudioBtn();
    }
  }

  /* ---- Toggle (disc button click) ---- */
  function toggleAudio() {
    if (!bgAudio) return;

    if (!audioUnlocked) {
      /* First tap on disc before openBtn — unlock + play */
      startAudio();
      return;
    }

    if (bgAudio.paused) {
      /* Paused — resume */
      userMuted = false;
      bgAudio.muted = false;
      bgAudio.play().catch(function () { syncAudioBtn(); });
    } else if (!bgAudio.muted) {
      /* Playing with sound — mute */
      userMuted = true;
      bgAudio.muted = true;
      syncAudioBtn();
    } else {
      /* Playing but muted — unmute */
      userMuted = false;
      bgAudio.muted = false;
      syncAudioBtn();
    }
  }

  if (audioBtn) {
    audioBtn.addEventListener('click', function (e) {
      e.stopPropagation();
      toggleAudio();
    });
  }

  /* Keep disc icon in sync with any external state change */
  if (bgAudio) {
    bgAudio.addEventListener('play',        syncAudioBtn);
    bgAudio.addEventListener('pause',       syncAudioBtn);
    bgAudio.addEventListener('volumechange', syncAudioBtn);
    bgAudio.addEventListener('ended',       syncAudioBtn);
  }

  /* ---------------------------------------------------------
     1 · Image fallback chain + graceful placeholders
     --------------------------------------------------------- */
  function markMissing(img) {
    img.classList.add('failed');
    var host = img.parentElement;
    if (!host) return;

    if (img.classList.contains('cover-img') || img.classList.contains('section-bg') ||
        img.classList.contains('bleed') || img.id === 'heroImg') {
      if (host.classList.contains('landing-media') || host.classList.contains('scene-frame') ||
          host.classList.contains('scene') || host.id === 'reveal') {
        host.classList.add('fallback-on');
      }
    } else if (img.classList.contains('couple-photo-img')) {
      var frame = host.classList.contains('couple-photo-frame') ? host : host.closest('.couple-photo-frame');
      if (frame) frame.classList.add('is-empty');
    } else if (host.classList.contains('portrait') || host.classList.contains('tile') ||
               host.classList.contains('photo-card__paper')) {
      var emptyHost = host.classList.contains('photo-card__paper')
        ? host.closest('.photo-card') || host : host;
      emptyHost.classList.add('is-empty');
      emptyHost.setAttribute('data-label', img.getAttribute('data-placeholder') || 'Photo');
      if (host.classList.contains('photo-card__paper')) {
        host.setAttribute('data-label', img.getAttribute('data-placeholder') || 'Photo');
      }
    }
  }

  function wireImage(img) {
    var queue = (img.getAttribute('data-fallbacks') || '')
      .split(',').map(function (s) { return s.trim(); }).filter(Boolean);

    img.addEventListener('error', function () {
      if (queue.length) { img.src = queue.shift(); return; }
      markMissing(img);
    });

    if (img.complete && img.naturalWidth === 0) {
      if (queue.length) img.src = queue.shift();
      else markMissing(img);
    }
  }

  Array.prototype.forEach.call(
    document.querySelectorAll('img[data-fallbacks], img[data-placeholder]'),
    wireImage
  );

  /* ---------------------------------------------------------
     2 · Scroll lock
     --------------------------------------------------------- */
  function blockTouch(e) { if (body.classList.contains('is-locked')) e.preventDefault(); }
  document.addEventListener('touchmove', blockTouch, { passive: false });

  if ('scrollRestoration' in history) history.scrollRestoration = 'manual';

  function jumpToTop() {
    var root = document.documentElement;
    var prev = root.style.scrollBehavior;
    root.style.scrollBehavior = 'auto';
    window.scrollTo(0, 0);
    root.style.scrollBehavior = prev;
  }

  function unlockScroll() {
    body.classList.remove('is-locked');
    jumpToTop();
  }

  /* ---------------------------------------------------------
     3 · Video preload
     --------------------------------------------------------- */
  var videoReady = false;
  var opening = false;
  var finished = false;
  var safety = 0;
  var readyWait = 0;

  function markVideoReady() { videoReady = true; }

  function isVideoReady() {
    return video && !video.error && video.readyState >= 3;
  }

  function beginVideoPreload() {
    if (!video) return;
    video.muted = true;
    video.setAttribute('muted', '');
    video.playsInline = true;
    video.setAttribute('playsinline', '');
    video.setAttribute('webkit-playsinline', '');
    video.preload = 'auto';
    try { video.load(); } catch (e) {}

    var onReady = function () {
      markVideoReady();
      video.removeEventListener('canplay', onReady);
      video.removeEventListener('canplaythrough', onReady);
      video.removeEventListener('loadeddata', onReady);
    };
    video.addEventListener('canplay', onReady);
    video.addEventListener('canplaythrough', onReady);
    video.addEventListener('loadeddata', onReady);
    if (isVideoReady()) markVideoReady();
  }

  beginVideoPreload();

  /* ---------------------------------------------------------
     4 · Hero gate — never show until bg is loaded + decoded
     --------------------------------------------------------- */
  var heroEl = document.getElementById('hero');
  var heroReadyPromise = null;
  var heroIsReady = false;
  var TEXT_REVEAL_MS = 520;

  var HERO_CANDIDATES = (
    (heroImg && heroImg.getAttribute('data-candidates')) ||
    'assets/images/hero/hero-alt.png,assets/images/hero/hero.png,assets/images/hero/hero.webp,assets/images/hero/hero.avif'
  ).split(',').map(function (s) { return s.trim(); }).filter(Boolean);

  function loadAndDecodeUrl(url) {
    return new Promise(function (resolve, reject) {
      var probe = new Image();
      probe.decoding = 'async';
      function succeed() {
        if (probe.decode) {
          probe.decode().then(function () { resolve(url); }).catch(function () { resolve(url); });
        } else { resolve(url); }
      }
      probe.onload = succeed;
      probe.onerror = function () { reject(new Error('fail ' + url)); };
      probe.src = url;
      if (probe.complete && probe.naturalWidth > 0) succeed();
    });
  }

  function firstAvailable(urls, index) {
    index = index || 0;
    if (index >= urls.length) return Promise.reject(new Error('no hero asset'));
    return loadAndDecodeUrl(urls[index]).catch(function () {
      return firstAvailable(urls, index + 1);
    });
  }

  function warmFonts() {
    if (!(document.fonts && document.fonts.load)) return Promise.resolve();
    return Promise.all([
      document.fonts.load('300 48px "Cormorant Garamond"'),
      document.fonts.load('400 18px Marcellus'),
      document.fonts.load('400 36px "Pinyon Script"')
    ]).catch(function () {});
  }

  function applyHeroUrl(url) {
    if (!heroImg || !url) return Promise.resolve();
    var isAvif = /\.avif($|\?)/i.test(url);
    var isWebp = /\.webp($|\?)/i.test(url);
    var avifSource = document.getElementById('heroSourceAvif');
    var webpSource = document.getElementById('heroSourceWebp');

    if (avifSource) {
      if (isAvif) avifSource.srcset = url;
      else avifSource.removeAttribute('srcset');
    }
    if (webpSource) {
      if (isWebp) webpSource.srcset = url;
      else if (isAvif) webpSource.srcset = 'assets/images/hero/hero.webp';
      else webpSource.removeAttribute('srcset');
    }
    heroImg.src = url;
    if (heroImg.decode) return heroImg.decode().catch(function () {});
    return Promise.resolve();
  }

  function ensureHeroReady() {
    if (heroIsReady) return Promise.resolve(true);
    if (heroReadyPromise) return heroReadyPromise;

    heroReadyPromise = firstAvailable(HERO_CANDIDATES)
      .then(function (url) { return applyHeroUrl(url).then(function () { return url; }); })
      .then(function () { return warmFonts(); })
      .then(function () {
        heroIsReady = true;
        if (heroEl) void heroEl.offsetWidth;
        return true;
      })
      .catch(function () {
        if (heroImg) heroImg.src = 'assets/images/hero/hero-alt.png';
        heroIsReady = true;
        return false;
      });

    return heroReadyPromise;
  }

  function scheduleHeroWarm() {
    if (heroReadyPromise) return;
    if (isVideoReady() || !video) { ensureHeroReady(); return; }
    var once = function () {
      video.removeEventListener('canplay', once);
      ensureHeroReady();
    };
    video.addEventListener('canplay', once);
    setTimeout(function () { ensureHeroReady(); }, 5000);
  }

  if (document.readyState === 'complete') scheduleHeroWarm();
  else window.addEventListener('load', scheduleHeroWarm);

  /* ---------------------------------------------------------
     5 · Landing → video → hero
     --------------------------------------------------------- */
  function revealHeroAndSite() {
    if (heroEl) {
      heroEl.classList.add('loaded');
      heroEl.setAttribute('aria-busy', 'false');
    }
    body.classList.add('is-revealed');
    unlockScroll();
    initReveals();
    initGallery();
    activateLazySections();
    initRingsScroll();

    /* Show the audio disc button now that we're on the main site */
    showAudioBtn();

    setTimeout(function () {
      if (heroEl) heroEl.classList.add('text-ready');
    }, TEXT_REVEAL_MS);

    revealBox.classList.remove('is-armed', 'is-on');
    revealBox.classList.add('is-out', 'is-live');

    setTimeout(function () {
      revealBox.classList.add('is-gone');
      revealBox.setAttribute('aria-hidden', 'true');
      try {
        video.pause();
        video.removeAttribute('src');
        while (video.firstChild) video.removeChild(video.firstChild);
        video.load();
      } catch (e) {}
    }, 900);
  }

  function finishReveal() {
    if (finished) return;
    finished = true;
    clearTimeout(safety);
    clearTimeout(readyWait);

    try {
      video.pause();
      if (video.duration && isFinite(video.duration)) {
        video.currentTime = Math.max(0, video.duration - 0.05);
      }
    } catch (e) {}

    ensureHeroReady().then(function () { revealHeroAndSite(); });
  }

  function startPlaybackUnderCover() {
    if (finished) return;

    ensureHeroReady();
    revealBox.classList.add('is-armed');
    revealBox.removeAttribute('aria-hidden');

    try { video.currentTime = 0; } catch (e) {}

    var coverLifted = false;
    function liftCover() {
      if (coverLifted || finished) return;
      coverLifted = true;
      requestAnimationFrame(function () {
        requestAnimationFrame(function () {
          landing.classList.remove('is-opening');
          landing.classList.add('is-out');
          setTimeout(function () {
            landing.classList.add('is-gone');
            revealBox.classList.add('is-on', 'is-live');
            revealBox.classList.remove('is-armed');
          }, COVER_FADE_MS);
        });
      });
    }

    function onPlaying() {
      video.removeEventListener('playing', onPlaying);
      liftCover();
      ensureHeroReady();
    }
    video.addEventListener('playing', onPlaying);

    var attempt = video.play();
    if (attempt && attempt.then) {
      attempt.then(function () {
        if (!video.paused) liftCover();
      }).catch(function () {
        video.muted = true;
        video.setAttribute('muted', '');
        var retry = video.play();
        if (retry && retry.then) {
          retry.then(function () {
            if (!video.paused) liftCover();
          }).catch(function () {
            video.removeEventListener('playing', onPlaying);
            finishReveal();
          });
        } else {
          video.removeEventListener('playing', onPlaying);
          finishReveal();
        }
      });
    } else if (!video.paused) {
      liftCover();
    }

    setTimeout(function () {
      if (!coverLifted && !finished) liftCover();
    }, 900);

    setTimeout(function () { if (!finished && skipBtn) skipBtn.hidden = false; }, 5000);

    safety = setTimeout(function () {
      if (!finished && (video.readyState < 2 || video.paused)) finishReveal();
    }, PLAY_SAFETY_MS);
  }

  function whenVideoReady(done) {
    if (isVideoReady() || videoReady) { done(); return; }

    var settled = false;
    function settle() {
      if (settled) return;
      settled = true;
      video.removeEventListener('canplay', settle);
      video.removeEventListener('canplaythrough', settle);
      video.removeEventListener('loadeddata', settle);
      clearTimeout(readyWait);
      done();
    }
    video.addEventListener('canplay', settle);
    video.addEventListener('canplaythrough', settle);
    video.addEventListener('loadeddata', settle);
    try { video.load(); } catch (e) {}
    readyWait = setTimeout(settle, READY_TIMEOUT_MS);
  }

  function openInvitation() {
    if (opening || finished) return;
    opening = true;
    if (openBtn) openBtn.disabled = true;
    landing.classList.add('is-opening');

    /* Start music inside the user gesture — this is the only reliable
       moment browsers will allow autoplay with sound */
    startAudio();

    if (!video) { finishReveal(); return; }
    whenVideoReady(startPlaybackUnderCover);
  }

  if (openBtn) openBtn.addEventListener('click', openInvitation);
  if (landing) {
    landing.addEventListener('click', function (e) {
      if (e.target.closest && e.target.closest('a, button')) return;
      openInvitation();
    });
  }
  if (skipBtn) skipBtn.addEventListener('click', finishReveal);

  if (video) {
    video.addEventListener('ended', finishReveal);
    video.addEventListener('error', function () {
      if (opening && !finished) finishReveal();
    });
    video.addEventListener('timeupdate', function () {
      if (video.duration && video.duration - video.currentTime < 0.12) finishReveal();
    });
    video.addEventListener('playing', function () { ensureHeroReady(); }, { once: true });
  }

  /* ---------------------------------------------------------
     6 · Scroll reveals
     --------------------------------------------------------- */
  var revealsStarted = false;
  function initReveals() {
    if (revealsStarted) return;
    revealsStarted = true;

    var els = document.querySelectorAll('.reveal');
    if (!('IntersectionObserver' in window)) {
      Array.prototype.forEach.call(els, function (el) { el.classList.add('in'); });
      return;
    }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        en.target.classList.add('in');
        io.unobserve(en.target);
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -8% 0px' });
    Array.prototype.forEach.call(els, function (el) { io.observe(el); });
  }

  /* ---------------------------------------------------------
     7 · Lazy sections
     --------------------------------------------------------- */
  function activateLazySections() {
    Array.prototype.forEach.call(
      document.querySelectorAll('#gallery img[data-src], #couple img[data-src]'),
      function (img) {
        if (!img.getAttribute('src')) {
          img.src = img.getAttribute('data-src');
          img.removeAttribute('data-src');
        }
      }
    );
  }

  /* ---------------------------------------------------------
     7b · Royal Gallery & Lightbox (Responsive Mobile/Desktop)
     --------------------------------------------------------- */
  function initGallery() {
    var track = document.getElementById('galleryTrack');
    var cards = document.querySelectorAll('.gallery-card');
    var items = document.querySelectorAll('.gallery-item');
    var dots = document.querySelectorAll('#galleryDots .gallery-dot');
    var prevBtn = document.getElementById('galleryPrev');
    var nextBtn = document.getElementById('galleryNext');

    var lightbox = document.getElementById('galleryLightbox');
    var lightboxImg = document.getElementById('lightboxImg');
    var lightboxCounter = document.getElementById('lightboxCounter');
    var lightboxClose = document.getElementById('lightboxClose');
    var lightboxBackdrop = document.getElementById('lightboxBackdrop');
    var lightboxPrev = document.getElementById('lightboxPrev');
    var lightboxNext = document.getElementById('lightboxNext');

    var currentLightboxIndex = 0;
    var imageList = [];

    Array.prototype.forEach.call(cards, function (card, idx) {
      var img = card.querySelector('img');
      var src = img ? (img.getAttribute('src') || img.src) : '';
      var alt = img ? (img.getAttribute('alt') || 'Merin & Nygin') : 'Merin & Nygin';
      imageList.push({ src: src, alt: alt });

      // Open lightbox on click or Enter / Space key
      var openHandler = function (e) {
        if (e) e.preventDefault();
        openLightbox(idx);
      };
      card.addEventListener('click', openHandler);
      card.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          openLightbox(idx);
        }
      });
    });

    /* Touch bounce effect for interactive cards */
    Array.prototype.forEach.call(document.querySelectorAll('.venue-dest-item, .gallery-card'), function (el) {
      el.addEventListener('pointerdown', function (e) {
        if (e.pointerType === 'mouse') return;
        el.classList.add('is-touched');
        window.setTimeout(function () { el.classList.remove('is-touched'); }, 1200);
      }, { passive: true });
    });

    /* Mobile Carousel Dot Sync & Navigation */
    if (track && dots.length) {
      var updateDots = function () {
        var scrollLeft = track.scrollLeft;
        var trackWidth = track.clientWidth || 1;
        var activeIndex = 0;
        var minDiff = Infinity;

        Array.prototype.forEach.call(items, function (item, idx) {
          var itemCenter = item.offsetLeft + item.offsetWidth / 2;
          var viewCenter = scrollLeft + trackWidth / 2;
          var diff = Math.abs(itemCenter - viewCenter);
          if (diff < minDiff) {
            minDiff = diff;
            activeIndex = idx;
          }
        });

        Array.prototype.forEach.call(dots, function (dot, idx) {
          var isActive = idx === activeIndex;
          dot.classList.toggle('is-active', isActive);
          dot.setAttribute('aria-selected', isActive ? 'true' : 'false');
        });
      };

      var scrollTimer;
      track.addEventListener('scroll', function () {
        if (scrollTimer) cancelAnimationFrame(scrollTimer);
        scrollTimer = requestAnimationFrame(updateDots);
      }, { passive: true });

      Array.prototype.forEach.call(dots, function (dot, idx) {
        dot.addEventListener('click', function () {
          if (items[idx]) {
            items[idx].scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
          }
        });
      });

      if (prevBtn) {
        prevBtn.addEventListener('click', function () {
          var current = 0;
          Array.prototype.forEach.call(dots, function (d, i) {
            if (d.classList.contains('is-active')) current = i;
          });
          var prevIdx = Math.max(0, current - 1);
          if (items[prevIdx]) {
            items[prevIdx].scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
          }
        });
      }

      if (nextBtn) {
        nextBtn.addEventListener('click', function () {
          var current = 0;
          Array.prototype.forEach.call(dots, function (d, i) {
            if (d.classList.contains('is-active')) current = i;
          });
          var nextIdx = Math.min(items.length - 1, current + 1);
          if (items[nextIdx]) {
            items[nextIdx].scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
          }
        });
      }
    }

    /* Lightbox Functions */
    function openLightbox(index) {
      if (!lightbox || !imageList.length) return;
      currentLightboxIndex = (index + imageList.length) % imageList.length;
      updateLightboxImage();
      lightbox.classList.add('is-open');
      lightbox.removeAttribute('aria-hidden');
      document.body.classList.add('lightbox-open');
      if (lightboxClose) lightboxClose.focus();
    }

    function closeLightbox() {
      if (!lightbox) return;
      lightbox.classList.remove('is-open');
      lightbox.setAttribute('aria-hidden', 'true');
      document.body.classList.remove('lightbox-open');
    }

    function updateLightboxImage() {
      var item = imageList[currentLightboxIndex];
      if (!item || !lightboxImg) return;
      lightboxImg.style.opacity = '0';
      lightboxImg.style.transform = 'scale(0.96)';
      setTimeout(function () {
        lightboxImg.src = item.src;
        lightboxImg.alt = item.alt;
        lightboxImg.style.opacity = '1';
        lightboxImg.style.transform = 'scale(1)';
      }, 120);
      if (lightboxCounter) {
        lightboxCounter.textContent = (currentLightboxIndex + 1) + ' / ' + imageList.length;
      }
    }

    function prevLightboxImage() {
      if (!imageList.length) return;
      currentLightboxIndex = (currentLightboxIndex - 1 + imageList.length) % imageList.length;
      updateLightboxImage();
    }

    function nextLightboxImage() {
      if (!imageList.length) return;
      currentLightboxIndex = (currentLightboxIndex + 1) % imageList.length;
      updateLightboxImage();
    }

    if (lightbox) {
      if (lightboxClose) lightboxClose.addEventListener('click', closeLightbox);
      if (lightboxBackdrop) lightboxBackdrop.addEventListener('click', closeLightbox);
      if (lightboxPrev) lightboxPrev.addEventListener('click', prevLightboxImage);
      if (lightboxNext) lightboxNext.addEventListener('click', nextLightboxImage);

      window.addEventListener('keydown', function (e) {
        if (!lightbox.classList.contains('is-open')) return;
        if (e.key === 'Escape') closeLightbox();
        else if (e.key === 'ArrowLeft') prevLightboxImage();
        else if (e.key === 'ArrowRight') nextLightboxImage();
      });

      // Touch swipe in lightbox
      var touchStartX = 0;
      var touchEndX = 0;
      lightbox.addEventListener('touchstart', function (e) {
        if (e.changedTouches && e.changedTouches.length) {
          touchStartX = e.changedTouches[0].screenX;
        }
      }, { passive: true });
      lightbox.addEventListener('touchend', function (e) {
        if (e.changedTouches && e.changedTouches.length) {
          touchEndX = e.changedTouches[0].screenX;
          var diff = touchEndX - touchStartX;
          if (diff > 45) prevLightboxImage();
          else if (diff < -45) nextLightboxImage();
        }
      }, { passive: true });
    }
  }

  if (document.readyState === 'complete') initGallery();
  else window.addEventListener('load', initGallery);

  /* ---------------------------------------------------------
     8 · Countdown — 29 Aug 2026, 11:00 IST
     --------------------------------------------------------- */
  (function countdown() {
    /* Wedding: Wednesday 9 September 2026 at 10:00 AM IST (UTC+5:30) */
    var target = new Date('2026-09-09T10:00:00+05:30').getTime();
    var d = document.getElementById('cdD'),
        h = document.getElementById('cdH'),
        m = document.getElementById('cdM'),
        s = document.getElementById('cdS');
    if (!d || isNaN(target)) return;

    var pad = function (n) { return n < 10 ? '0' + n : String(n); };

    function tick() {
      var left = target - Date.now();
      if (left <= 0) {
        d.textContent = h.textContent = m.textContent = s.textContent = '00';
        clearInterval(timer);
        return;
      }
      var sec = Math.floor(left / 1000);
      d.textContent = pad(Math.floor(sec / 86400));
      h.textContent = pad(Math.floor(sec / 3600) % 24);
      m.textContent = pad(Math.floor(sec / 60) % 60);
      s.textContent = pad(sec % 60);
    }
    tick();
    var timer = setInterval(tick, 1000);
  })();

  /* ---------------------------------------------------------
     9 · Particles + THANK YOU finale
     --------------------------------------------------------- */
  function bootParticles() {
    if (!window.KeralaParticles) return;
    window.KeralaParticles.init();

    var stage = document.getElementById('finaleStage');
    if (!stage || !('IntersectionObserver' in window)) return;

    var fo = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting && en.intersectionRatio >= 0.6) {
          window.KeralaParticles.finale(stage);
        } else if (!en.isIntersecting && en.boundingClientRect.top > 0) {
          window.KeralaParticles.reset();
        }
      });
    }, { threshold: [0, 0.6, 0.95] });

    fo.observe(stage);
  }

  if (document.readyState === 'complete') bootParticles();
  else window.addEventListener('load', bootParticles);

  /* ---------------------------------------------------------
     10 · Smooth anchor
     --------------------------------------------------------- */
  document.addEventListener('click', function (e) {
    var a = e.target.closest ? e.target.closest('a[href^="#"]') : null;
    if (!a) return;
    var id = a.getAttribute('href');
    if (!id || id === '#') return;
    var t = document.querySelector(id);
    if (!t) return;
    e.preventDefault();
    t.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });

  /* ---------------------------------------------------------
     11 · Scroll progress bar
     --------------------------------------------------------- */
  (function () {
    var bar = document.getElementById('scroll-progress');
    if (!bar) return;

    function updateBar() {
      var el = document.documentElement;
      var b = document.body;
      var scrollTop = el.scrollTop || b.scrollTop;
      var scrollHeight = (el.scrollHeight || b.scrollHeight) - el.clientHeight;
      if (scrollHeight <= 0) { bar.style.width = '0%'; return; }
      var pct = Math.min(100, Math.round((scrollTop / scrollHeight) * 1000) / 10);
      bar.style.width = pct + '%';
    }

    var barVisible = false;
    function onScroll() {
      if (!document.body.classList.contains('is-revealed')) return;
      if (!barVisible) {
        barVisible = true;
        bar.classList.add('is-visible');
      }
      updateBar();
    }

    window.addEventListener('scroll', onScroll, { passive: true });
  })();

  /* ---------------------------------------------------------
     12 · Scroll-Driven Wedding Rings Animation (Hero to Thank You Journey)
     --------------------------------------------------------- */
  function initRingsScroll() {
    var heroSection = document.getElementById('hero') || document.getElementById('site');
    var thankyouSlot = document.getElementById('thankyouRingsSlot') || document.getElementById('finaleStage');
    var overlay = document.getElementById('ringsOverlay');
    var scene = overlay ? overlay.querySelector('.rings-scene') : null;
    var leftRing = document.getElementById('ringLeft');
    var rightRing = document.getElementById('ringRight');
    var overlapRing = document.getElementById('ringLeftOverlap');

    if (!thankyouSlot || !overlay || !leftRing || !rightRing || !scene) return;

    var ticking = false;

    function clamp(val, min, max) {
      return Math.min(Math.max(val, min), max);
    }

    function updateRings() {
      ticking = false;
      var vh = window.innerHeight || document.documentElement.clientHeight || 800;
      var vw = window.innerWidth || document.documentElement.clientWidth || 1200;
      var docTop = window.scrollY || document.documentElement.scrollTop || 0;

      // Only display once invitation cover/reveal is opened
      if (!document.body.classList.contains('is-revealed')) {
        overlay.classList.remove('is-active');
        overlay.style.opacity = '0';
        return;
      }

      var slotRect = thankyouSlot.getBoundingClientRect();

      // If user has scrolled way past thankyou section off top
      if (slotRect.bottom < -150) {
        overlay.classList.remove('is-active');
        overlay.style.opacity = '0';
        return;
      }

      var heroRect = heroSection ? heroSection.getBoundingClientRect() : { top: -docTop };
      var heroPageTop = heroRect.top + docTop;
      var slotPageCenter = slotRect.top + docTop + (slotRect.height / 2);
      var targetScrollEnd = slotPageCenter - (vh * 0.5);
      var totalDistance = targetScrollEnd - heroPageTop;
      if (totalDistance <= 0) totalDistance = 1;

      var progress = clamp((docTop - heroPageTop) / totalDistance, 0, 1);

      overlay.classList.add('is-active');
      overlay.style.opacity = '1';

      var isMobile = vw < 640;
      // Start position (Hero): separated on left and right flanks
      var startX = isMobile
        ? Math.min(Math.max(vw * 0.38, 125), 160)
        : Math.min(Math.max(vw * 0.38, 250), 500);

      // Final position (Thank You): interlocked union distance
      var endX = isMobile ? 22 : 36;
      var travelX = startX - endX;

      var leftX = -startX + (progress * travelX);
      var rightX = startX - (progress * travelX);

      var leftY = -24 + (progress * 24);
      var rightY = 24 - (progress * 24);

      var leftRotate = -18 + (progress * 16);
      var rightRotate = 18 - (progress * 16);

      var scale = (isMobile ? 0.86 : 0.84) + (progress * 0.16);

      var transformLeft = 'translate(calc(-50% + ' + leftX.toFixed(1) + 'px), calc(-50% + ' + leftY.toFixed(1) + 'px)) rotate(' + leftRotate.toFixed(1) + 'deg) scale(' + scale.toFixed(3) + ')';
      var transformRight = 'translate(calc(-50% + ' + rightX.toFixed(1) + 'px), calc(-50% + ' + rightY.toFixed(1) + 'px)) rotate(' + rightRotate.toFixed(1) + 'deg) scale(' + scale.toFixed(3) + ')';

      leftRing.style.transform = transformLeft;
      rightRing.style.transform = transformRight;

      if (overlapRing) {
        overlapRing.style.transform = transformLeft;
        var overlapOpacity = progress > 0.65 ? clamp((progress - 0.65) / 0.15, 0, 1) : 0;
        overlapRing.style.opacity = overlapOpacity.toFixed(3);
      }

      leftRing.style.zIndex = progress > 0.65 ? '3' : '1';
      rightRing.style.zIndex = progress > 0.65 ? '1' : '3';

      // Pin vertically to slot between THANK YOU and "for being a part of our story" when reached
      if (docTop >= targetScrollEnd) {
        var slotCenterY = slotRect.top + (slotRect.height / 2);
        var offsetY = slotCenterY - (vh * 0.5);
        scene.style.transform = 'translateY(' + offsetY.toFixed(1) + 'px)';
      } else {
        scene.style.transform = 'translateY(0px)';
      }
    }

    function onScroll() {
      if (!ticking) {
        ticking = true;
        window.requestAnimationFrame(updateRings);
      }
    }

    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll, { passive: true });

    updateRings();
  }

  if (document.readyState === 'complete') initRingsScroll();
  else window.addEventListener('load', initRingsScroll);

})();


