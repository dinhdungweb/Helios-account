/**
 * Popup Overlay Handler - Lazy Loaded
 * Optimized for performance - loads after page interaction or delay
 */
(function() {
  'use strict';

  var popupInitialized = false;

  function initPopup() {
    if (popupInitialized) return;
    popupInitialized = true;

    var popups = document.querySelectorAll('.popup-overlay');
    
    popups.forEach(function(popup) {
      var delay = parseInt(popup.getAttribute('data-popup-delay')) || 5000;
      var showOnce = popup.getAttribute('data-popup-show-once') === 'true';
      var popupId = popup.id;

      // Check if popup was already shown
      if (showOnce && localStorage.getItem('popupShown_' + popupId)) {
        return;
      }

      // Load popup image lazily
      var popupImage = popup.querySelector('.popup-image');
      if (popupImage) {
        var imageSrc = popupImage.getAttribute('data-popup-image');
        if (imageSrc) {
          popupImage.src = imageSrc;
          popupImage.removeAttribute('data-popup-image');
        }
      }

      // Show popup after delay
      setTimeout(function() {
        popup.classList.add('active');
        document.body.style.overflow = 'hidden';
      }, delay);

      // Close button handler
      var closeBtn = popup.querySelector('[data-popup-close]');
      if (closeBtn) {
        closeBtn.addEventListener('click', function() {
          closePopup(popup, popupId, showOnce);
        });
      }

      // Close when clicking outside
      popup.addEventListener('click', function(e) {
        if (e.target === popup) {
          closePopup(popup, popupId, showOnce);
        }
      });

      // Close with ESC key
      document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape' && popup.classList.contains('active')) {
          closePopup(popup, popupId, showOnce);
        }
      });
    });
  }

  function closePopup(popup, popupId, showOnce) {
    popup.classList.remove('active');
    document.body.style.overflow = '';
    
    // Save to localStorage if show once is enabled
    if (showOnce) {
      localStorage.setItem('popupShown_' + popupId, 'true');
    }
  }

  // Initialize popup after user interaction or after delay
  var interactionEvents = ['mousedown', 'touchstart', 'scroll', 'keydown'];
  var interactionTimeout;

  function handleInteraction() {
    clearTimeout(interactionTimeout);
    interactionTimeout = setTimeout(function() {
      initPopup();
      // Remove event listeners after initialization
      interactionEvents.forEach(function(event) {
        document.removeEventListener(event, handleInteraction);
      });
    }, 100);
  }

  // Wait for page load
  if (document.readyState === 'complete') {
    // Add interaction listeners
    interactionEvents.forEach(function(event) {
      document.addEventListener(event, handleInteraction, { passive: true, once: true });
    });

    // Fallback: init after 3 seconds if no interaction
    setTimeout(function() {
      if (!popupInitialized) {
        initPopup();
      }
    }, 3000);
  } else {
    window.addEventListener('load', function() {
      // Add interaction listeners
      interactionEvents.forEach(function(event) {
        document.addEventListener(event, handleInteraction, { passive: true, once: true });
      });

      // Fallback: init after 3 seconds if no interaction
      setTimeout(function() {
        if (!popupInitialized) {
          initPopup();
        }
      }, 3000);
    });
  }

  // Handle Shopify theme editor
  if (window.Shopify && window.Shopify.designMode) {
    document.addEventListener('shopify:section:load', function(event) {
      if (event.detail.sectionId.indexOf('popup') > -1) {
        popupInitialized = false;
        setTimeout(initPopup, 100);
      }
    });
  }
})();
