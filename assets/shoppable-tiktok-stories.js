(function () {
  'use strict';

  if (window.HeliosShoppableStories) {
    window.HeliosShoppableStories.initAll();
    return;
  }

  function toBoolean(value) {
    return value === true || value === 'true';
  }

  function toNumber(value, fallback) {
    var parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
  }

  function StorySlider(root) {
    this.root = root;
    this.sliderElement = root.querySelector('[data-sts-slider]');
    this.total = root.querySelectorAll('[data-sts-slide]').length;
    this.progressElement = root.querySelector('[data-sts-progress]');
    this.videoAutoplay = toBoolean(root.dataset.videoAutoplay);
    this.videoMode = root.dataset.videoMode || 'visible';
    this.pauseOnHover = toBoolean(root.dataset.pauseOnHover);
    this.sliderAutoplay = toBoolean(root.dataset.sliderAutoplay);
    this.disableOnInteraction = toBoolean(root.dataset.disableOnInteraction);
    this.userStoppedAutoplay = false;
    this.swiper = null;

    if (!this.sliderElement || !window.Swiper) return;

    this.initSwiper();
    this.bindControls();
    this.bindHover();
    this.updateProgress();
    this.syncVideos();
    root.dataset.stsReady = 'true';
  }

  StorySlider.prototype.initSwiper = function () {
    var self = this;
    var nextElement = this.root.querySelector('[data-sts-next]');
    var previousElement = this.root.querySelector('[data-sts-prev]');
    var paginationElement = this.root.querySelector('[data-sts-pagination]');
    var desktopSlides = toNumber(this.root.dataset.slidesDesktop, 4.2);
    var mobileSlides = toNumber(this.root.dataset.slidesMobile, 1.35);
    var desktopGap = toNumber(this.root.dataset.gapDesktop, 12);
    var mobileGap = toNumber(this.root.dataset.gapMobile, 10);
    var speed = toNumber(this.root.dataset.speed, 550);
    var minimumLoopSlides = Math.ceil(Math.max(desktopSlides, mobileSlides));
    var shouldLoop = toBoolean(this.root.dataset.loop) && this.total >= minimumLoopSlides;
    var autoplayDelay = toNumber(this.root.dataset.sliderDelay, 5000);
    var autoplaySetting = false;

    if (this.sliderAutoplay && this.total > 1) {
      autoplaySetting = {
        delay: autoplayDelay,
        disableOnInteraction: this.disableOnInteraction,
        stopOnLastSlide: false
      };
    }

    var options = {
      slidesPerView: desktopSlides,
      spaceBetween: desktopGap,
      speed: speed,
      loop: shouldLoop,
      centeredSlides: toBoolean(this.root.dataset.centeredDesktop),
      allowTouchMove: toBoolean(this.root.dataset.touch),
      watchSlidesProgress: true,
      watchSlidesVisibility: true,
      observer: true,
      observeParents: true,
      preloadImages: false,
      autoplay: autoplaySetting,
      breakpoints: {
        749: {
          slidesPerView: mobileSlides,
          spaceBetween: mobileGap,
          centeredSlides: toBoolean(this.root.dataset.centeredMobile)
        }
      }
    };

    if (nextElement && previousElement) {
      options.navigation = {
        nextEl: nextElement,
        prevEl: previousElement
      };
    }

    if (paginationElement) {
      options.pagination = {
        el: paginationElement,
        clickable: true
      };
    }

    this.swiper = new window.Swiper(this.sliderElement, options);

    this.swiper.on('slideChange', function () {
      self.updateProgress();
      self.closeProductPanels();
    });

    this.swiper.on('slideChangeTransitionStart', function () {
      self.syncVideos();
    });

    this.swiper.on('transitionEnd', function () {
      self.syncVideos();
    });

    this.swiper.on('sliderFirstMove', function () {
      if (self.disableOnInteraction) self.userStoppedAutoplay = true;
    });
  };

  StorySlider.prototype.bindControls = function () {
    var self = this;

    this.onClick = function (event) {
      var playButton = event.target.closest('[data-sts-play]');
      var muteButton = event.target.closest('[data-sts-mute]');
      var productButton = event.target.closest('[data-sts-product-toggle]');

      if (playButton && self.root.contains(playButton)) {
        event.preventDefault();
        event.stopPropagation();
        var playCard = playButton.closest('.sts__card');
        var playVideo = playCard && playCard.querySelector('[data-sts-video]');
        if (!playVideo) return;

        if (playVideo.paused) {
          var playPromise = playVideo.play();
          if (playPromise && typeof playPromise.catch === 'function') {
            playPromise.catch(function () {});
          }
        } else {
          playVideo.pause();
        }
        self.updateVideoState(playVideo);
        return;
      }

      if (muteButton && self.root.contains(muteButton)) {
        event.preventDefault();
        event.stopPropagation();
        var muteCard = muteButton.closest('.sts__card');
        var muteVideo = muteCard && muteCard.querySelector('[data-sts-video]');
        if (!muteVideo) return;
        muteVideo.muted = !muteVideo.muted;
        self.updateVideoState(muteVideo);
        return;
      }

      if (productButton && self.root.contains(productButton)) {
        event.preventDefault();
        event.stopPropagation();
        var productCard = productButton.closest('.sts__card');
        if (!productCard) return;
        var willOpen = !productCard.classList.contains('is-product-open');
        self.closeProductPanels();
        productCard.classList.toggle('is-product-open', willOpen);
        productButton.setAttribute('aria-expanded', willOpen ? 'true' : 'false');
      }
    };

    this.onKeyDown = function (event) {
      if (event.key === 'Escape') self.closeProductPanels();
    };

    this.onVideoEvent = function (event) {
      if (event.target.matches('[data-sts-video]')) self.updateVideoState(event.target);
    };

    this.root.addEventListener('click', this.onClick);
    this.root.addEventListener('keydown', this.onKeyDown);
    this.root.addEventListener('play', this.onVideoEvent, true);
    this.root.addEventListener('pause', this.onVideoEvent, true);
    this.root.addEventListener('volumechange', this.onVideoEvent, true);
  };

  StorySlider.prototype.bindHover = function () {
    var self = this;
    if (!this.pauseOnHover || !this.sliderAutoplay) return;

    this.onMouseEnter = function () {
      if (self.swiper && self.swiper.autoplay && self.swiper.autoplay.stop) {
        self.swiper.autoplay.stop();
      }
    };

    this.onMouseLeave = function () {
      if (
        self.swiper &&
        self.swiper.autoplay &&
        self.swiper.autoplay.start &&
        !self.userStoppedAutoplay
      ) {
        self.swiper.autoplay.start();
      }
    };

    this.root.addEventListener('mouseenter', this.onMouseEnter);
    this.root.addEventListener('mouseleave', this.onMouseLeave);
  };

  StorySlider.prototype.updateProgress = function () {
    if (!this.progressElement || !this.swiper || this.total < 1) return;
    var index = typeof this.swiper.realIndex === 'number' ? this.swiper.realIndex : this.swiper.activeIndex;
    var progress = Math.min(1, Math.max(0, (index + 1) / this.total));
    this.progressElement.style.transform = 'scaleX(' + progress + ')';
  };

  StorySlider.prototype.updateVideoState = function (video) {
    var card = video.closest('.sts__card');
    if (!card) return;
    var playButton = card.querySelector('[data-sts-play]');
    var muteButton = card.querySelector('[data-sts-mute]');

    if (playButton) {
      playButton.classList.toggle('is-playing', !video.paused);
      playButton.setAttribute('aria-label', video.paused ? 'Phát video' : 'Tạm dừng video');
    }

    if (muteButton) {
      muteButton.classList.toggle('is-muted', video.muted);
      muteButton.setAttribute('aria-label', video.muted ? 'Bật âm thanh' : 'Tắt âm thanh');
    }
  };

  StorySlider.prototype.syncVideos = function () {
    var self = this;
    var videos = Array.prototype.slice.call(this.root.querySelectorAll('[data-sts-video]'));

    videos.forEach(function (video) {
      var slide = video.closest('.swiper-slide');
      var shouldPlay = false;

      if (self.videoAutoplay) {
        if (self.videoMode === 'all') {
          shouldPlay = true;
        } else if (self.videoMode === 'active') {
          shouldPlay = slide && slide.classList.contains('swiper-slide-active');
        } else {
          shouldPlay = slide && (
            slide.classList.contains('swiper-slide-visible') ||
            slide.classList.contains('swiper-slide-active')
          );
        }
      }

      if (shouldPlay) {
        var promise = video.play();
        if (promise && typeof promise.catch === 'function') promise.catch(function () {});
      } else if (self.videoAutoplay || (slide && !slide.classList.contains('swiper-slide-active'))) {
        video.pause();
      }

      self.updateVideoState(video);
    });
  };

  StorySlider.prototype.closeProductPanels = function () {
    this.root.querySelectorAll('.sts__card.is-product-open').forEach(function (card) {
      card.classList.remove('is-product-open');
      var button = card.querySelector('[data-sts-product-toggle]');
      if (button) button.setAttribute('aria-expanded', 'false');
    });
  };

  StorySlider.prototype.selectBlock = function (blockId) {
    if (!this.swiper) return;
    var matchingSlide = null;
    var slides = this.root.querySelectorAll('[data-sts-slide]');

    for (var i = 0; i < slides.length; i += 1) {
      if (slides[i].dataset.blockId === blockId && !slides[i].classList.contains('swiper-slide-duplicate')) {
        matchingSlide = slides[i];
        break;
      }
    }

    if (!matchingSlide) return;
    var index = toNumber(matchingSlide.dataset.slideIndex, 0);
    if (this.swiper.slideToLoop && this.swiper.params.loop) {
      this.swiper.slideToLoop(index);
    } else {
      this.swiper.slideTo(index);
    }

    if (this.swiper.autoplay && this.swiper.autoplay.stop) this.swiper.autoplay.stop();
  };

  StorySlider.prototype.destroy = function () {
    if (this.root) {
      this.root.removeEventListener('click', this.onClick);
      this.root.removeEventListener('keydown', this.onKeyDown);
      this.root.removeEventListener('play', this.onVideoEvent, true);
      this.root.removeEventListener('pause', this.onVideoEvent, true);
      this.root.removeEventListener('volumechange', this.onVideoEvent, true);
      if (this.onMouseEnter) this.root.removeEventListener('mouseenter', this.onMouseEnter);
      if (this.onMouseLeave) this.root.removeEventListener('mouseleave', this.onMouseLeave);
      delete this.root.dataset.stsReady;
      delete this.root.__stsInstance;
    }

    if (this.swiper && this.swiper.destroy) this.swiper.destroy(true, true);
  };

  function initRoot(root, attempt) {
    if (!root || root.__stsInstance) return;
    var tries = attempt || 0;

    if (!window.Swiper) {
      if (tries < 40) {
        window.setTimeout(function () {
          initRoot(root, tries + 1);
        }, 100);
      }
      return;
    }

    root.__stsInstance = new StorySlider(root);
  }

  function initAll(scope) {
    var container = scope || document;
    if (container.matches && container.matches('[data-shoppable-stories]')) initRoot(container);
    container.querySelectorAll('[data-shoppable-stories]').forEach(function (root) {
      initRoot(root);
    });
  }

  window.HeliosShoppableStories = {
    initAll: initAll
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () {
      initAll(document);
    });
  } else {
    initAll(document);
  }

  document.addEventListener('shopify:section:load', function (event) {
    initAll(event.target);
  });

  document.addEventListener('shopify:section:unload', function (event) {
    var root = event.target.querySelector('[data-shoppable-stories]');
    if (root && root.__stsInstance) root.__stsInstance.destroy();
  });

  document.addEventListener('shopify:block:select', function (event) {
    var roots = document.querySelectorAll('[data-shoppable-stories]');
    roots.forEach(function (root) {
      if (root.__stsInstance) root.__stsInstance.selectBlock(event.detail.blockId);
    });
  });
})();
