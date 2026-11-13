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
      if (root.dataset.modal === 'true') this.modal = new GalleryModal(this);

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
      const below = item.querySelector('.gm__info') && this.root.classList.contains('gm--text-below');
      return 1 / ratio + (below ? 0.2 : 0) + 0.05;
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
        url.searchParams.delete('g');
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
      if (this.modal) this.modal.destroy();
      if (this.observer) this.observer.disconnect();
      window.removeEventListener('resize', this.onResize);
    }
  }

  /* ------------------------------------------------------------------
   * Detail popup
   * ------------------------------------------------------------------ */

  const svg = (d, extra) =>
    '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"' +
    (extra || '') + '>' + d + '</svg>';

  const ICON = {
    close: svg('<path d="M6 6l12 12M18 6L6 18"/>'),
    prev: svg('<path d="M15 18l-6-6 6-6"/>'),
    next: svg('<path d="M9 18l6-6-6-6"/>'),
    share: svg('<path d="M12 3v12"/><path d="M7 8l5-5 5 5"/><path d="M5 13v6a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-6"/>'),
    link: svg('<path d="M14 4h6v6"/><path d="M20 4l-9 9"/><path d="M19 14v4a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h4"/>'),
    bag: svg('<path d="M6 7h12l-1 13H7L6 7z"/><path d="M9 7a3 3 0 0 1 6 0"/>'),
    check: svg('<path d="M5 12l5 5 9-10"/>'),
    arrow: svg('<path d="M5 12h14"/><path d="M13 6l6 6-6 6"/>')
  };

  const esc = (s) =>
    String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  const handleize = (s) =>
    String(s || '')
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .replace(/[đĐ]/g, 'd')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');

  const DEFAULT_LABELS = {
    products: 'Sản phẩm trong ảnh', related: 'Khám phá thêm', view: 'Xem chi tiết',
    add: 'Thêm vào giỏ', added: 'Đã thêm vào giỏ', viewCart: 'Xem giỏ hàng', choose: 'Chọn size',
    soldOut: 'Hết hàng', error: 'Không thêm được, vui lòng thử lại', open: 'Mở liên kết',
    share: 'Chia sẻ', copied: 'Đã sao chép liên kết', close: 'Đóng', prev: 'Ảnh trước', next: 'Ảnh sau'
  };

  class GalleryModal {
    constructor(gallery) {
      this.g = gallery;
      this.isOpen = false;
      this.pushed = false;
      this.item = null;
      try {
        this.t = Object.assign({}, DEFAULT_LABELS, JSON.parse(gallery.root.dataset.labels || '{}'));
      } catch (e) {
        this.t = DEFAULT_LABELS;
      }

      this.build();

      this.onGridClick = (e) => {
        const link = e.target.closest('[data-gm-open]');
        if (!link || !this.g.grid.contains(link)) return;
        if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
        e.preventDefault();
        this.open(link.closest('[data-gm-item]'), { history: 'push' });
      };
      this.g.grid.addEventListener('click', this.onGridClick);

      this.onPop = () => {
        const handle = new URL(window.location.href).searchParams.get('g');
        const item = handle && this.find(handle);
        if (item) {
          this.open(item, { history: 'none' });
        } else if (this.isOpen) {
          this.pushed = false;
          this.close({ history: 'none' });
        }
      };
      window.addEventListener('popstate', this.onPop);

      this.onKey = (e) => {
        if (!this.isOpen) return;
        if (e.key === 'Escape') { e.preventDefault(); this.close(); }
        else if (e.key === 'ArrowLeft') { this.step(-1); }
        else if (e.key === 'ArrowRight') { this.step(1); }
        else if (e.key === 'Tab') { this.trapFocus(e); }
      };
      document.addEventListener('keydown', this.onKey);

      // Deep link: ?g=<handle>
      const initial = new URL(window.location.href).searchParams.get('g');
      const initialItem = initial && this.find(initial);
      if (initialItem) this.open(initialItem, { history: 'none' });
    }

    /* ---------- DOM ---------- */

    build() {
      const t = this.t;
      const el = document.createElement('div');
      el.className = 'gmm gmm--' + (this.g.root.dataset.modalTheme || 'dark');
      el.hidden = true;
      el.innerHTML =
        '<div class="gmm__backdrop" data-gmm-close></div>' +
        '<div class="gmm__scroller" data-gmm-scroller>' +
          '<div class="gmm__dialog" role="dialog" aria-modal="true" aria-labelledby="gmm-title-' + esc(this.g.sectionId) + '">' +
            '<div class="gmm__card">' +
              '<button type="button" class="no-hover gmm__icon-btn gmm__close" data-gmm-close aria-label="' + esc(t.close) + '">' + ICON.close + '</button>' +
              '<div class="gmm__media" data-gmm-media>' +
                '<img class="gmm__img" data-gmm-img alt="">' +
              '</div>' +
              '<div class="gmm__body">' +
                '<div class="gmm__toolbar">' +
                  '<button type="button" class="no-hover gmm__icon-btn" data-gmm-share aria-label="' + esc(t.share) + '" title="' + esc(t.share) + '">' + ICON.share + '</button>' +
                  '<a class="gmm__pill" data-gmm-link target="_blank" rel="noopener">' + ICON.link + '<span>' + esc(t.open) + '</span></a>' +
                '</div>' +
                '<h2 class="gmm__title" id="gmm-title-' + esc(this.g.sectionId) + '" data-gmm-title></h2>' +
                '<p class="gmm__caption" data-gmm-caption></p>' +
                '<div class="gmm__tags" data-gmm-tags></div>' +
                '<div class="gmm__products" data-gmm-products-wrap>' +
                  '<h3 class="gmm__subheading">' + esc(t.products) + '</h3>' +
                  '<div class="gmm__product-list" data-gmm-products></div>' +
                '</div>' +
              '</div>' +
            '</div>' +
            '<div class="gmm__related" data-gmm-related-wrap>' +
              '<h3 class="gmm__related-heading">' + esc(t.related) + '</h3>' +
              '<div class="gmm__related-grid" data-gmm-related></div>' +
            '</div>' +
          '</div>' +
        '</div>' +
        '<button type="button" class="no-hover gmm__nav gmm__nav--prev" data-gmm-prev aria-label="' + esc(t.prev) + '">' + ICON.prev + '</button>' +
        '<button type="button" class="no-hover gmm__nav gmm__nav--next" data-gmm-next aria-label="' + esc(t.next) + '">' + ICON.next + '</button>' +
        '<div class="gmm__toast" data-gmm-toast role="status" aria-live="polite"></div>';

      document.body.appendChild(el);
      this.el = el;
      const q = (s) => el.querySelector(s);
      this.$ = {
        scroller: q('[data-gmm-scroller]'),
        dialog: q('.gmm__dialog'),
        media: q('[data-gmm-media]'),
        img: q('[data-gmm-img]'),
        title: q('[data-gmm-title]'),
        caption: q('[data-gmm-caption]'),
        tags: q('[data-gmm-tags]'),
        link: q('[data-gmm-link]'),
        share: q('[data-gmm-share]'),
        productsWrap: q('[data-gmm-products-wrap]'),
        products: q('[data-gmm-products]'),
        relatedWrap: q('[data-gmm-related-wrap]'),
        related: q('[data-gmm-related]'),
        prev: q('[data-gmm-prev]'),
        next: q('[data-gmm-next]'),
        toast: q('[data-gmm-toast]'),
        close: q('.gmm__close')
      };

      el.addEventListener('click', (e) => {
        if (e.target.closest('[data-gmm-close]')) { this.close(); return; }
        // Click on the empty area around the dialog closes too
        if (e.target === this.$.scroller) { this.close(); return; }

        const add = e.target.closest('[data-gmm-add]');
        if (add) { this.addToCart(add); return; }

        const rel = e.target.closest('[data-gmm-related-item]');
        if (rel) {
          const item = this.find(rel.dataset.gmmRelatedItem);
          if (item) this.open(item, { history: 'replace' });
          return;
        }

        const tag = e.target.closest('[data-gmm-tag]');
        if (tag) { this.filterBy(tag.dataset.gmmTag); return; }
      });

      this.$.prev.addEventListener('click', () => this.step(-1));
      this.$.next.addEventListener('click', () => this.step(1));
      this.$.share.addEventListener('click', () => this.share());
      this.$.products.addEventListener('scroll', () => {
        const l = this.$.products;
        l.classList.toggle('is-end', l.scrollTop + l.clientHeight >= l.scrollHeight - 4);
      }, { passive: true });
      this.onResize = () => { if (this.isOpen) this.fitProducts(); };
      window.addEventListener('resize', this.onResize);

      // Swipe left/right on the image (touch screens)
      let sx = 0, sy = 0;
      this.$.media.addEventListener('touchstart', (e) => {
        sx = e.touches[0].clientX; sy = e.touches[0].clientY;
      }, { passive: true });
      this.$.media.addEventListener('touchend', (e) => {
        const dx = e.changedTouches[0].clientX - sx;
        const dy = e.changedTouches[0].clientY - sy;
        if (Math.abs(dx) > 50 && Math.abs(dy) < 60) this.step(dx < 0 ? 1 : -1);
      }, { passive: true });
    }

    /* ---------- data helpers ---------- */

    find(handle) {
      return this.g.items.find((i) => i.dataset.handle === handle) || null;
    }

    data(item) {
      if (!item) return null;
      if (!item._gmData) {
        const node = item.querySelector('[data-gm-data]');
        try { item._gmData = JSON.parse(node ? node.textContent : 'null'); }
        catch (e) { item._gmData = null; }
      }
      return item._gmData;
    }

    visibleItems() {
      return this.g.items.filter((i) => !i.hidden);
    }

    thumbSrc(item) {
      const img = item.querySelector('.gm__img');
      return img ? img.currentSrc || img.src : '';
    }

    urlFor(handle) {
      const url = new URL(window.location.href);
      url.searchParams.delete('section_id');
      if (handle) url.searchParams.set('g', handle);
      else url.searchParams.delete('g');
      return url.pathname + url.search + url.hash;
    }

    /* ---------- open / close ---------- */

    open(item, opts) {
      const d = this.data(item);
      if (!d) return;
      const mode = (opts && opts.history) || 'push';
      const wasOpen = this.isOpen;

      this.item = item;
      this.render(d, item);

      if (mode === 'push') {
        if (wasOpen && this.pushed) {
          history.replaceState({ gm: d.handle }, '', this.urlFor(d.handle));
        } else {
          history.pushState({ gm: d.handle }, '', this.urlFor(d.handle));
          this.pushed = true;
        }
      } else if (mode === 'replace') {
        history.replaceState({ gm: d.handle }, '', this.urlFor(d.handle));
      }

      if (!wasOpen) {
        this.lastFocus = document.activeElement;
        this.lockScroll();
        this.el.hidden = false;
        // next frame so the transition runs
        requestAnimationFrame(() => requestAnimationFrame(() => this.el.classList.add('is-open')));
        this.isOpen = true;
        setTimeout(() => this.$.close.focus({ preventScroll: true }), 50);
      }
      this.$.scroller.scrollTop = 0;
      this.fitProducts();
    }

    // Show ~2 products, scroll the rest (desktop/tablet only, see CSS)
    fitProducts() {
      const list = this.$.products;
      list.scrollTop = 0;
      list.style.removeProperty('--gmm-products-max');
      list.classList.remove('is-scrollable', 'is-end');
      const cards = list.children;
      if (cards.length <= 2) return;
      const top = cards[0].offsetTop;
      const second = cards[1];
      const max = second.offsetTop + second.offsetHeight - top;
      if (max <= 0) return;
      // + a peek of the third card so it is obvious the list scrolls
      list.style.setProperty('--gmm-products-max', Math.round(max + 36) + 'px');
      list.classList.add('is-scrollable');
    }

    close(opts) {
      if (!this.isOpen) return;
      const mode = (opts && opts.history) || 'auto';

      if (mode === 'auto') {
        if (this.pushed) {
          // Going back fires popstate, which calls close({history:'none'}).
          this.pushed = false;
          history.back();
          return;
        }
        history.replaceState(history.state, '', this.urlFor(null));
      }

      this.isOpen = false;
      this.el.classList.remove('is-open');
      const item = this.item;
      setTimeout(() => {
        if (this.isOpen) return;
        this.el.hidden = true;
        this.unlockScroll();
        const target = item && !item.hidden ? item.querySelector('[data-gm-open]') : this.lastFocus;
        if (target && target.focus) target.focus({ preventScroll: true });
      }, 250);
    }

    async step(dir) {
      if (!this.item) return;
      let list = this.visibleItems();
      let i = list.indexOf(this.item);
      if (dir > 0 && i === list.length - 1 && this.g.more) {
        await this.g.loadNext();
        list = this.visibleItems();
      }
      const next = list[i + dir];
      if (next) this.open(next, { history: 'replace' });
    }

    lockScroll() {
      const sbw = window.innerWidth - document.documentElement.clientWidth;
      document.documentElement.classList.add('gmm-lock');
      if (sbw > 0) document.body.style.paddingRight = sbw + 'px';
    }

    unlockScroll() {
      document.documentElement.classList.remove('gmm-lock');
      document.body.style.paddingRight = '';
    }

    trapFocus(e) {
      const nodes = Array.from(
        this.el.querySelectorAll('a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])')
      ).filter((n) => n.offsetParent !== null);
      if (!nodes.length) return;
      const first = nodes[0];
      const last = nodes[nodes.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      else if (!this.el.contains(document.activeElement)) { e.preventDefault(); first.focus(); }
    }

    /* ---------- render ---------- */

    render(d, item) {
      const $ = this.$;
      const t = this.t;

      // Image: show the already-loaded grid image instantly, swap to the large one when ready
      const w = d.image && d.image.width;
      const h = d.image && d.image.height;
      $.media.style.aspectRatio = w && h ? w + ' / ' + h : '';
      $.img.alt = (d.image && d.image.alt) || d.title || '';
      $.img.src = this.thumbSrc(item) || (d.image && d.image.src) || '';
      $.media.classList.add('is-loading');
      if (d.image && d.image.src) {
        const big = new Image();
        big.onload = () => {
          if (this.item !== item) return;
          $.img.src = big.src;
          $.media.classList.remove('is-loading');
        };
        big.src = d.image.src;
      }

      $.title.textContent = d.title || '';
      $.title.hidden = !d.title;
      $.caption.textContent = d.caption || '';
      $.caption.hidden = !d.caption;

      // Tags (clickable when a matching filter exists)
      const cats = (d.categories || []).filter(Boolean);
      $.tags.innerHTML = cats.map((c) => {
        const h = handleize(c);
        const hasFilter = this.g.root.querySelector('[data-gm-filter="' + h + '"]');
        return hasFilter
          ? '<button type="button" class="no-hover gmm__tag" data-gmm-tag="' + esc(h) + '">' + esc(c) + '</button>'
          : '<span class="gmm__tag">' + esc(c) + '</span>';
      }).join('');
      $.tags.hidden = !cats.length;

      // External link
      if (d.link) {
        $.link.href = d.link;
        $.link.hidden = false;
      } else {
        $.link.removeAttribute('href');
        $.link.hidden = true;
      }

      // Products
      const products = d.products || [];
      $.products.innerHTML = products.map((p) => this.productHTML(p)).join('');
      $.productsWrap.hidden = !products.length;

      // Related
      const related = this.related(item, d);
      $.related.innerHTML = related.map((r) => {
        const rd = this.data(r) || {};
        const rw = rd.image && rd.image.width;
        const rh = rd.image && rd.image.height;
        return (
          '<button type="button" class="no-hover gmm__related-item" data-gmm-related-item="' + esc(r.dataset.handle) + '"' +
          ' aria-label="' + esc(rd.title || (rd.image && rd.image.alt) || '') + '">' +
            '<img src="' + esc(this.thumbSrc(r)) + '" alt="" loading="lazy"' +
            (rw && rh ? ' width="' + rw + '" height="' + rh + '"' : '') + '>' +
            (rd.title ? '<span class="gmm__related-title">' + esc(rd.title) + '</span>' : '') +
          '</button>'
        );
      }).join('');
      $.relatedWrap.hidden = !related.length;

      // Prev / next
      const list = this.visibleItems();
      const i = list.indexOf(item);
      $.prev.disabled = i <= 0;
      $.next.disabled = i === list.length - 1 && !this.g.more;
    }

    productHTML(p) {
      const t = this.t;
      let action;
      if (!p.available) {
        action = '<button type="button" class="no-hover gmm__btn gmm__btn--muted" disabled>' + esc(t.soldOut) + '</button>';
      } else if (p.multi) {
        action = '<a class="gmm__btn gmm__btn--primary" href="' + esc(p.url) + '">' + esc(t.choose) + '</a>';
      } else {
        action = '<button type="button" class="no-hover gmm__btn gmm__btn--primary" data-gmm-add="' + esc(p.variant) + '">' +
          ICON.bag + '<span>' + esc(t.add) + '</span></button>';
      }
      return (
        '<div class="gmm__product">' +
          '<a class="gmm__product-img" href="' + esc(p.url) + '" tabindex="-1" aria-hidden="true">' +
            (p.image ? '<img src="' + esc(p.image) + '" alt="" loading="lazy">' : '') +
          '</a>' +
          '<div class="gmm__product-main">' +
            '<a class="gmm__product-title" href="' + esc(p.url) + '">' + esc(p.title) + '</a>' +
            '<div class="gmm__product-price">' +
              '<span>' + esc(p.price) + '</span>' +
              (p.compare ? '<s>' + esc(p.compare) + '</s>' : '') +
            '</div>' +
            '<div class="gmm__product-actions">' +
              action +
              '<a class="gmm__btn gmm__btn--ghost" href="' + esc(p.url) + '">' + esc(t.view) + ICON.arrow + '</a>' +
            '</div>' +
          '</div>' +
        '</div>'
      );
    }

    related(item, d) {
      const cats = (d.categories || []).map(handleize);
      const others = this.g.items.filter((i) => i !== item);
      const score = (i) => {
        const c = ((this.data(i) || {}).categories || []).map(handleize);
        return c.some((x) => cats.indexOf(x) !== -1) ? 1 : 0;
      };
      const start = this.g.items.indexOf(item);
      // Prefer same category, then the items that follow the current one
      return others
        .map((i) => ({ i, s: score(i), d: (this.g.items.indexOf(i) - start + this.g.items.length) % this.g.items.length }))
        .sort((a, b) => b.s - a.s || a.d - b.d)
        .slice(0, 12)
        .map((x) => x.i);
    }

    /* ---------- actions ---------- */

    filterBy(handle) {
      const btn = this.g.root.querySelector('[data-gm-filter="' + handle + '"]');
      this.close();
      if (btn) {
        setTimeout(() => {
          btn.click();
          this.g.root.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 300);
      }
    }

    async share() {
      const d = this.data(this.item) || {};
      const url = window.location.origin + this.urlFor(d.handle);
      if (navigator.share) {
        try { await navigator.share({ title: d.title || document.title, url }); } catch (e) { /* cancelled */ }
        return;
      }
      try {
        await navigator.clipboard.writeText(url);
      } catch (e) {
        const ta = document.createElement('textarea');
        ta.value = url;
        ta.style.position = 'fixed';
        ta.style.opacity = '0';
        document.body.appendChild(ta);
        ta.select();
        try { document.execCommand('copy'); } catch (err) { /* ignore */ }
        ta.remove();
      }
      this.toast(this.t.copied);
    }

    toast(msg) {
      const el = this.$.toast;
      el.textContent = msg;
      el.classList.add('is-visible');
      clearTimeout(this.toastTimer);
      this.toastTimer = setTimeout(() => el.classList.remove('is-visible'), 2200);
    }

    async addToCart(btn) {
      if (btn.disabled || btn.classList.contains('is-added')) return;
      const t = this.t;
      const original = btn.innerHTML;
      btn.disabled = true;
      btn.classList.add('is-loading');
      try {
        const root = (window.Shopify && window.Shopify.routes && window.Shopify.routes.root) || '/';
        const res = await fetch(root + 'cart/add.js', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
          body: JSON.stringify({ items: [{ id: Number(btn.dataset.gmmAdd), quantity: 1 }] })
        });
        if (!res.ok) throw new Error('HTTP ' + res.status);

        btn.classList.remove('is-loading');
        btn.classList.add('is-added');
        btn.innerHTML = ICON.check + '<span>' + esc(t.added) + '</span>';
        const actions = btn.parentNode;
        if (actions && !actions.querySelector('.gmm__view-cart')) {
          const a = document.createElement('a');
          a.className = 'gmm__view-cart';
          a.href = root + 'cart';
          a.textContent = t.viewCart;
          actions.parentNode.appendChild(a);
        }
        this.refreshCart();
      } catch (e) {
        console.error('[gallery-masonry] add to cart failed', e);
        btn.classList.remove('is-loading');
        btn.innerHTML = original;
        btn.disabled = false;
        this.toast(t.error);
      }
    }

    async refreshCart() {
      try {
        const root = (window.Shopify && window.Shopify.routes && window.Shopify.routes.root) || '/';
        const cart = await (await fetch(root + 'cart.js', { headers: { Accept: 'application/json' } })).json();
        if (typeof window.updateCartItemCounts === 'function') window.updateCartItemCounts(cart.item_count);
        if (typeof window.updateCartDrawer === 'function') await window.updateCartDrawer();
      } catch (e) { /* theme helpers are optional */ }
      document.dispatchEvent(new CustomEvent('theme:cartchanged', { bubbles: true }));
      document.dispatchEvent(new CustomEvent('cart:updated', { bubbles: true }));
    }

    destroy() {
      this.g.grid.removeEventListener('click', this.onGridClick);
      window.removeEventListener('popstate', this.onPop);
      document.removeEventListener('keydown', this.onKey);
      window.removeEventListener('resize', this.onResize);
      this.unlockScroll();
      if (this.el) this.el.remove();
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
