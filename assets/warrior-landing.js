(function () {
  var TRANSPARENT_PIXEL = 'data:image/gif;base64,R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs=';

  function wrapIndex(index, length) {
    return ((index % length) + length) % length;
  }

  function createDots(container, count, onSelect) {
    if (!container) return [];
    container.innerHTML = '';

    return Array.from({ length: count }, function (_, index) {
      var dot = document.createElement('button');
      dot.type = 'button';
      dot.setAttribute('aria-label', 'Chọn mục ' + (index + 1));
      dot.addEventListener('click', function () { onSelect(index); });
      container.appendChild(dot);
      return dot;
    });
  }

  function hydrateChapterPoster(slide) {
    var video = slide.querySelector('[data-warrior-chapter-video]');
    if (!video || !video.dataset.poster || video.poster) return;
    video.poster = video.dataset.poster;
  }

  function hydrateChapterImage(slide) {
    var image = slide.querySelector('img[data-src]');
    if (!image) return;
    window.clearTimeout(image.warriorUnloadTimer);
    if (image.dataset.loaded === 'true') return;
    image.src = image.dataset.src;
    image.dataset.loaded = 'true';
  }

  function unloadChapterImage(slide) {
    var image = slide.querySelector('img[data-src]');
    if (!image || image.dataset.loaded !== 'true') return;
    window.clearTimeout(image.warriorUnloadTimer);
    image.src = TRANSPARENT_PIXEL;
    image.dataset.loaded = 'false';
  }

  function scheduleChapterImageUnload(slide, delay) {
    var image = slide.querySelector('img[data-src]');
    if (!image || image.dataset.loaded !== 'true') return;

    window.clearTimeout(image.warriorUnloadTimer);
    image.warriorUnloadTimer = window.setTimeout(function () {
      var isVisibleSlide = slide.classList.contains('is-active') ||
        slide.classList.contains('is-previous') ||
        slide.classList.contains('is-next');

      if (!isVisibleSlide) unloadChapterImage(slide);
    }, delay);
  }

  function pauseChapterVideo(video, resetToStart) {
    if (!video) return;
    video.pause();
    video.autoplay = false;
    video.removeAttribute('autoplay');

    if (resetToStart && video.readyState > 0) {
      try { video.currentTime = 0; } catch (error) { /* The poster remains visible until metadata is ready. */ }
    }
  }

  function loadChapterVideo(slide, shouldPlay) {
    var video = slide.querySelector('[data-warrior-chapter-video]');
    if (!video) return;

    hydrateChapterPoster(slide);

    // iOS Safari checks the DOM properties as well as the HTML attributes.
    video.muted = true;
    video.defaultMuted = true;
    video.playsInline = true;
    video.autoplay = false;
    video.setAttribute('muted', '');
    video.setAttribute('playsinline', '');
    video.setAttribute('webkit-playsinline', '');

    if (video.dataset.loaded !== 'true') {
      video.querySelectorAll('source[data-src]').forEach(function (source) {
        // A looping Shopify video must use MP4. Safari otherwise prefers HLS,
        // whose playlist can stop after the first frame or fail to loop.
        if ((source.type || '').toLowerCase().indexOf('mpegurl') !== -1) {
          source.remove();
          return;
        }
        source.src = source.dataset.src;
        source.removeAttribute('data-src');
      });
      video.dataset.loaded = 'true';
      video.preload = shouldPlay ? 'auto' : 'metadata';
      video.load();
    }

    if (!shouldPlay) return;
    video.preload = 'auto';
    var playPromise = video.play();
    if (playPromise && typeof playPromise.catch === 'function') {
      playPromise.catch(function () {
        if (video.dataset.playRetryBound === 'true') return;
        video.dataset.playRetryBound = 'true';

        var retryPlayback = function () {
          video.dataset.playRetryBound = 'false';
          var activeSlide = video.closest('.warrior-chapter-card');
          if (!activeSlide || !activeSlide.classList.contains('is-active')) return;

          var retryPromise = video.play();
          if (retryPromise && typeof retryPromise.catch === 'function') {
            retryPromise.catch(function () { /* Keep the poster if the OS still blocks playback. */ });
          }
        };

        if (window.PointerEvent) {
          document.addEventListener('pointerdown', retryPlayback, { once: true, capture: true, passive: true });
        } else {
          document.addEventListener('touchstart', retryPlayback, { once: true, capture: true, passive: true });
        }
      });
    }
  }

  function setupCarousel(root, options) {
    var slides = Array.from(root.querySelectorAll(options.slideSelector));
    if (!slides.length) return null;

    root.classList.toggle('is-static', slides.length < 2);

    var current = 0;
    var previousButton = root.querySelector(options.previousSelector);
    var nextButton = root.querySelector(options.nextSelector);
    var dots = createDots(root.querySelector(options.dotsSelector), slides.length, update);
    var isTransitioning = false;
    var stageTimer = null;
    var settleTimer = null;
    var mediaInView = !options.manageChapterMedia;

    function syncChapterMedia() {
      if (!options.manageChapterMedia) return;

      var previous = wrapIndex(current - 1, slides.length);
      var next = wrapIndex(current + 1, slides.length);

      slides.forEach(function (slide, slideIndex) {
        var isNearby = slideIndex === current || slideIndex === previous || slideIndex === next;
        var video = slide.querySelector('[data-warrior-chapter-video]');

        if (mediaInView && isNearby) {
          hydrateChapterImage(slide);
          hydrateChapterPoster(slide);
        } else if (root.classList.contains('is-transitioning')) {
          // Keep the outgoing GIF visible until its transform/fade has finished.
          scheduleChapterImageUnload(slide, (Number(options.settleDurationMs) || 0) + 50);
        } else {
          unloadChapterImage(slide);
        }

        if (!video) return;
        if (mediaInView && slideIndex === current) {
          loadChapterVideo(slide, true);
        } else {
          pauseChapterVideo(video, true);
        }
      });
    }

    function render(index) {
      current = wrapIndex(index, slides.length);
      var previous = wrapIndex(current - 1, slides.length);
      var next = wrapIndex(current + 1, slides.length);

      slides.forEach(function (slide, slideIndex) {
        slide.classList.toggle('is-active', slideIndex === current);
        slide.classList.toggle('is-previous', slides.length > 2 && slideIndex === previous);
        slide.classList.toggle('is-next', slides.length > 2 && slideIndex === next);
        slide.setAttribute('aria-hidden', slideIndex === current ? 'false' : 'true');
      });

      dots.forEach(function (dot, dotIndex) {
        dot.classList.toggle('is-active', dotIndex === current);
        dot.setAttribute('aria-current', dotIndex === current ? 'true' : 'false');
      });

      syncChapterMedia();
    }

    function update(index) {
      var target = wrapIndex(index, slides.length);
      var stageDuration = Number(options.stagedTransitionMs) || 0;

      if (target === current || isTransitioning) return;

      if (options.manageChapterMedia && mediaInView) {
        hydrateChapterImage(slides[target]);
        hydrateChapterPoster(slides[target]);
      }

      if (!stageDuration) {
        render(target);
        return;
      }

      isTransitioning = true;
      root.classList.add('is-transitioning');
      slides[current].classList.add('is-leaving');

      stageTimer = window.setTimeout(function () {
        slides[current].classList.remove('is-leaving');
        render(target);
        settleTimer = window.setTimeout(function () {
          root.classList.remove('is-transitioning');
          isTransitioning = false;
        }, Number(options.settleDurationMs) || 0);
      }, stageDuration);
    }

    function reset(index) {
      window.clearTimeout(stageTimer);
      window.clearTimeout(settleTimer);
      slides.forEach(function (slide) { slide.classList.remove('is-leaving'); });
      root.classList.remove('is-transitioning');
      isTransitioning = false;
      render(index);
    }

    if (previousButton) previousButton.addEventListener('click', function () { update(current - 1); });
    if (nextButton) nextButton.addEventListener('click', function () { update(current + 1); });

    if (options.clickAdjacentSlides) {
      slides.forEach(function (slide) {
        slide.addEventListener('click', function () {
          if (slide.classList.contains('is-previous')) update(current - 1);
          if (slide.classList.contains('is-next')) update(current + 1);
        });
      });
    }

    root.addEventListener('keydown', function (event) {
      if (event.key === 'ArrowLeft') update(current - 1);
      if (event.key === 'ArrowRight') update(current + 1);
    });

    var startX = null;
    var startY = null;
    var activePointerId = null;

    root.addEventListener('pointerdown', function (event) {
      if (!event.isPrimary || (event.pointerType === 'mouse' && event.button !== 0)) return;
      if (event.target.closest('button, a')) return;

      var adjacentSlide = options.clickAdjacentSlides && event.target.closest(options.slideSelector);
      if (adjacentSlide && (adjacentSlide.classList.contains('is-previous') || adjacentSlide.classList.contains('is-next'))) return;

      startX = event.clientX;
      startY = event.clientY;
      activePointerId = event.pointerId;

      if (root.setPointerCapture) {
        try { root.setPointerCapture(event.pointerId); } catch (error) { /* Pointer capture is optional. */ }
      }
    });

    root.addEventListener('pointerup', function (event) {
      if (startX === null || event.pointerId !== activePointerId) return;
      var distanceX = event.clientX - startX;
      var distanceY = event.clientY - startY;
      startX = null;
      startY = null;
      activePointerId = null;

      if (Math.abs(distanceX) < 45 || Math.abs(distanceX) <= Math.abs(distanceY)) return;
      event.preventDefault();
      update(current + (distanceX < 0 ? 1 : -1));
    });

    root.addEventListener('pointercancel', function () {
      startX = null;
      startY = null;
      activePointerId = null;
    });

    if (options.manageChapterMedia) {
      if ('IntersectionObserver' in window) {
        var mediaObserver = new IntersectionObserver(function (entries) {
          entries.forEach(function (entry) {
            mediaInView = entry.isIntersecting;
            syncChapterMedia();
          });
        }, { threshold: 0.05 });
        mediaObserver.observe(root);
      } else {
        mediaInView = true;
      }

      document.addEventListener('visibilitychange', function () {
        if (document.hidden) {
          slides.forEach(function (slide) {
            var video = slide.querySelector('[data-warrior-chapter-video]');
            pauseChapterVideo(video, false);
          });
        } else {
          syncChapterMedia();
        }
      });
    }

    render(0);
    return { select: update, reset: reset };
  }

  function setupCollectionTabs(root, galleries) {
    var tabs = Array.from(root.querySelectorAll('[data-warrior-collection-tab]'));

    function activateCollection(index) {
      tabs.forEach(function (item, tabIndex) {
        var active = tabIndex === index;
        item.classList.toggle('is-active', active);
        item.setAttribute('aria-pressed', active ? 'true' : 'false');
      });

      galleries.forEach(function (gallery, galleryIndex) {
        var active = galleryIndex === index;
        if (active && gallery.api) gallery.api.reset(0);
        gallery.element.classList.toggle('is-active', active);
        gallery.element.setAttribute('aria-hidden', active ? 'false' : 'true');
      });
    }

    tabs.forEach(function (tab) {
      tab.addEventListener('click', function (event) {
        var ctaClicked = event.target.closest('[data-warrior-collection-cta]');
        var targetUrl = tab.dataset.warriorCollectionLink;
        if (ctaClicked && targetUrl) {
          window.location.href = targetUrl;
          return;
        }

        activateCollection(Number(tab.dataset.index) || 0);
      });
    });

    activateCollection(0);
  }

  function setup(root) {
    if (root.dataset.warriorReady === 'true') return;
    root.dataset.warriorReady = 'true';

    var chapterRoot = root.querySelector('[data-warrior-chapters]');
    if (chapterRoot) {
      setupCarousel(chapterRoot, {
        slideSelector: '[data-warrior-chapter]',
        previousSelector: '[data-warrior-chapter-previous]',
        nextSelector: '[data-warrior-chapter-next]',
        dotsSelector: '[data-warrior-chapter-dots]',
        clickAdjacentSlides: true,
        manageChapterMedia: true,
        stagedTransitionMs: 350,
        settleDurationMs: 1200
      });
    }

    var galleries = Array.from(root.querySelectorAll('[data-warrior-collection-gallery]')).map(function (galleryRoot) {
      return {
        element: galleryRoot,
        api: setupCarousel(galleryRoot, {
          slideSelector: '[data-warrior-gallery-slide]',
          previousSelector: '[data-warrior-gallery-previous]',
          nextSelector: '[data-warrior-gallery-next]',
          dotsSelector: '[data-warrior-gallery-dots]',
          stagedTransitionMs: 260,
          settleDurationMs: 500
        })
      };
    });

    setupCollectionTabs(root, galleries);

    root.querySelectorAll('[data-warrior-mobile-gallery]').forEach(function (galleryRoot) {
      setupCarousel(galleryRoot, {
        slideSelector: '[data-warrior-mobile-gallery-slide]',
        previousSelector: '[data-warrior-mobile-gallery-previous]',
        nextSelector: '[data-warrior-mobile-gallery-next]',
        dotsSelector: '[data-warrior-mobile-gallery-dots]',
        stagedTransitionMs: 220,
        settleDurationMs: 380
      });
    });
  }

  function setupAll(scope) {
    scope.querySelectorAll('[data-warrior-landing]').forEach(setup);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () { setupAll(document); });
  } else {
    setupAll(document);
  }

  document.addEventListener('shopify:section:load', function (event) { setupAll(event.target); });
})();
