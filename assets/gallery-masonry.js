(function () {
  'use strict';

  class GalleryMasonry {
    constructor(root) {
      this.root = root;
      this.sectionId = root.dataset.sectionId;
      this.infinite = root.dataset.infinite === 'true';
      this.grid = root.querySelector('[data-gm-grid]');
      this.more = root.querySelector('[data-gm-more]');
      this.items = Array.from(this.grid.querySelectorAll('[data-gm-item]'));
      this.filter = '';
      this.loading = false;
      this.cols = [];
      this.heights = [];

      if (!this.items.length) return;

      this.grid.classList.add('gm__grid--js');
      if (this.infinite) root.classList.add('gm--infinite');

      this.layout();
      this.bindFilters();
      this.bindMore();

      let resizeTimer;
      this.onResize = () => {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(() => {
          if (this.columnCount() !== this.cols.length) this.layout();
        }, 150);
      };
      window.addEventListener('resize', this.onResize);
    }

    columnCount() {
      const style = getComputedStyle(this.root);
      const w = window.innerWidth;
      const key = w >= 990 ? '--gm-cols-desktop' : w >= 750 ? '--gm-cols-tablet' : '--gm-cols-mobile';
      return Math.max(1, parseInt(style.getPropertyValue(key), 10) || 2);
    }

    // Relative height of an item per unit of column width.
    weight(item) {
      const ratio = parseFloat(item.dataset.ratio) || 1;
      return 1 / ratio + (item.querySelector('.gm__info') ? 0.2 : 0) + 0.05;
    }

    isVisible(item) {
      if (!this.filter) return true;
      return (' ' + item.dataset.categories + ' ').indexOf(' ' + this.filter + ' ') !== -1;
    }

    layout() {
      const count = this.columnCount();
      this.grid.innerHTML = '';
      this.cols = [];
      this.heights = [];
      for (let i = 0; i < count; i++) {
        const col = document.createElement('div');
        col.className = 'gm__col';
        this.grid.appendChild(col);
        this.cols.push(col);
        this.heights.push(0);
      }
      this.place(this.items);
    }

    place(items) {
      items.forEach((item) => {
        const visible = this.isVisible(item);
        item.hidden = !visible;
        let target = 0;
        if (visible) {
          for (let i = 1; i < this.heights.length; i++) {
            if (this.heights[i] < this.heights[target]) target = i;
          }
          this.heights[target] += this.weight(item);
        }
        this.cols[target].appendChild(item);
      });
    }

    bindFilters() {
      const buttons = this.root.querySelectorAll('[data-gm-filter]');
      buttons.forEach((btn) => {
        btn.addEventListener('click', () => {
          buttons.forEach((b) => b.classList.toggle('is-active', b === btn));
          this.filter = btn.dataset.gmFilter;
          this.layout();
          this.checkMore();
        });
      });
    }

    bindMore() {
      if (!this.more) return;
      const btn = this.more.querySelector('[data-gm-more-btn]');
      if (btn) {
        btn.addEventListener('click', (e) => {
          e.preventDefault();
          this.loadNext();
        });
      }
      if (this.infinite && 'IntersectionObserver' in window) {
        this.observer = new IntersectionObserver(
          (entries) => {
            if (entries.some((e) => e.isIntersecting)) this.loadNext();
          },
          { rootMargin: '800px 0px' }
        );
        this.observer.observe(this.more);
      } else if (this.infinite) {
        this.root.classList.remove('gm--infinite');
      }
    }

    // Re-trigger the observer if the sentinel is still on screen
    // (e.g. a filter hid most items, or the page is very tall).
    checkMore() {
      if (!this.observer || !this.more) return;
      this.observer.unobserve(this.more);
      this.observer.observe(this.more);
    }

    async loadNext() {
      if (this.loading || !this.more) return;
      const page = parseInt(this.more.dataset.nextPage, 10);
      const total = parseInt(this.more.dataset.totalPages, 10);
      if (!page || page > total) return this.finish();

      this.loading = true;
      this.more.classList.add('is-loading');

      try {
        const url = new URL(window.location.href);
        url.searchParams.set('page', page);
        url.searchParams.set('section_id', this.sectionId);
        const res = await fetch(url.toString(), { credentials: 'same-origin' });
        if (!res.ok) throw new Error('HTTP ' + res.status);
        const doc = new DOMParser().parseFromString(await res.text(), 'text/html');
        const newItems = Array.from(doc.querySelectorAll('[data-gm-item]')).map((el) => {
          const node = document.importNode(el, true);
          node.classList.add('is-new');
          return node;
        });

        this.items.push(...newItems);
        this.place(newItems);

        if (page >= total || !newItems.length) {
          this.finish();
        } else {
          this.more.dataset.nextPage = page + 1;
          const btn = this.more.querySelector('[data-gm-more-btn]');
          if (btn) {
            url.searchParams.delete('section_id');
            url.searchParams.set('page', page + 1);
            btn.href = url.pathname + url.search;
          }
        }
      } catch (err) {
        console.error('[gallery-masonry] load failed', err);
        // Fall back to the visible button so the user can retry.
        this.root.classList.remove('gm--infinite');
      } finally {
        this.loading = false;
        if (this.more) this.more.classList.remove('is-loading');
        this.checkMore();
      }
    }

    finish() {
      if (this.observer) this.observer.disconnect();
      if (this.more) this.more.remove();
      this.more = null;
    }

    destroy() {
      if (this.observer) this.observer.disconnect();
      window.removeEventListener('resize', this.onResize);
    }
  }

  const instances = new WeakMap();
  const init = (scope) => {
    scope.querySelectorAll('[data-gallery-masonry]').forEach((el) => {
      if (!instances.has(el)) instances.set(el, new GalleryMasonry(el));
    });
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => init(document));
  } else {
    init(document);
  }

  // Theme editor support
  document.addEventListener('shopify:section:load', (e) => init(e.target));
  document.addEventListener('shopify:section:unload', (e) => {
    const el = e.target.querySelector('[data-gallery-masonry]');
    if (el && instances.has(el)) {
      instances.get(el).destroy();
      instances.delete(el);
    }
  });
})();
