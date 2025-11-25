/**
 * Lazy Load Video Handler
 * Optimizes video loading for better PageSpeed performance
 */
(function() {
  'use strict';

  if (!('IntersectionObserver' in window)) {
    // Fallback for browsers without IntersectionObserver
    return;
  }

  var videoObserver = new IntersectionObserver(function(entries) {
    entries.forEach(function(entry) {
      if (entry.isIntersecting) {
        var videoContainer = entry.target;
        
        // Check if video should be lazy loaded
        if (videoContainer.getAttribute('data-video-lazy') !== 'true') {
          return;
        }

        // Mark as loading to prevent duplicate loads
        if (videoContainer.classList.contains('video-loading') || 
            videoContainer.classList.contains('video-loaded')) {
          return;
        }

        videoContainer.classList.add('video-loading');

        // Delay video load slightly to prioritize other content
        setTimeout(function() {
          loadVideoContent(videoContainer);
        }, 300);

        // Stop observing this element
        videoObserver.unobserve(videoContainer);
      }
    });
  }, {
    rootMargin: '100px', // Start loading 100px before entering viewport
    threshold: 0.1
  });

  function loadVideoContent(container) {
    var videoWrapper = container.querySelector('.video-container__video');
    if (!videoWrapper) return;

    var videoSources = container.getAttribute('data-video-sources');
    var videoUrl = container.getAttribute('data-video-url');
    var autoplay = container.getAttribute('data-video-autoplay') === 'true';
    var loop = container.getAttribute('data-video-loop') === 'true';

    if (videoSources) {
      // Shopify hosted video
      var sources = videoSources.split('|');
      var video = document.createElement('video');
      video.muted = true;
      video.playsInline = true;
      video.loop = loop;
      video.preload = 'metadata';
      
      sources.forEach(function(sourceStr) {
        var parts = sourceStr.trim().split(' ');
        if (parts.length >= 3) {
          var source = document.createElement('source');
          source.src = parts[2];
          source.type = parts[1];
          video.appendChild(source);
        }
      });

      videoWrapper.appendChild(video);

      if (autoplay) {
        video.addEventListener('loadeddata', function() {
          video.play().catch(function(error) {
            console.log('Video autoplay prevented:', error);
          });
        }, { once: true });
      }

      video.load();
      container.classList.add('video-loaded');
      container.classList.remove('video-loading');

    } else if (videoUrl) {
      // External video (YouTube/Vimeo) - handled by theme.js
      container.classList.add('video-loaded');
      container.classList.remove('video-loading');
    }
  }

  // Initialize observer when DOM is ready
  function initLazyVideo() {
    var lazyVideos = document.querySelectorAll('.video-container--background[data-video-lazy="true"]');
    lazyVideos.forEach(function(video) {
      videoObserver.observe(video);
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initLazyVideo);
  } else {
    initLazyVideo();
  }

  // Re-initialize for dynamically added content
  if (window.Shopify && window.Shopify.designMode) {
    document.addEventListener('shopify:section:load', initLazyVideo);
  }
})();
