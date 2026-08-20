(function () {
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

  function setupCarousel(root, options) {
    var slides = Array.from(root.querySelectorAll(options.slideSelector));
    if (!slides.length) return null;

    root.classList.toggle('is-static', slides.length < 2);

    var current = 0;
    var previousButton = root.querySelector(options.previousSelector);
    var nextButton = root.querySelector(options.nextSelector);
    var dots = createDots(root.querySelector(options.dotsSelector), slides.length, update);
    var isTransitioning = false;

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
    }

    function update(index) {
      var target = wrapIndex(index, slides.length);
      var stageDuration = Number(options.stagedTransitionMs) || 0;

      if (target === current || isTransitioning) return;
      if (!stageDuration) {
        render(target);
        return;
      }

      isTransitioning = true;
      root.classList.add('is-transitioning');
      slides[current].classList.add('is-leaving');

      window.setTimeout(function () {
        slides[current].classList.remove('is-leaving');
        render(target);
        window.setTimeout(function () {
          root.classList.remove('is-transitioning');
          isTransitioning = false;
        }, Number(options.settleDurationMs) || 0);
      }, stageDuration);
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

    render(0);
    return { select: update };
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
