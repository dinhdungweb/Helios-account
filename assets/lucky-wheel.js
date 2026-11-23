/* Lucky wheel – account tab.
 * The server decides the result; this file only renders and animates.
 */
(function () {
  'use strict';

  if (window.LuckyWheelInit) return;

  const SVG_NS = 'http://www.w3.org/2000/svg';
  const R_OUT = 186;

  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
  ));

  const fmtDate = (iso) => {
    const d = new Date(iso);
    return d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'Asia/Ho_Chi_Minh' });
  };

  class LuckyWheel {
    constructor(root) {
      this.root = root;
      this.api = root.dataset.api;
      this.token = root.dataset.token;
      this.showLabels = root.dataset.showLabels !== 'false';
      this.imageFrame = root.dataset.imageFrame !== 'false';
      this.imageBg = root.dataset.imageBg !== 'false';
      this.angle = 0;
      this.spinning = false;
      this.canSpin = false;

      let defs = [];
      try { defs = JSON.parse(root.dataset.segments || '[]'); } catch (e) { defs = []; }
      this.prizes = defs.filter((d) => /^p\d+$/.test(d.key));
      this.card = defs.find((d) => d.key === 'card') || { key: 'card', name: 'Thẻ chương 10 năm', image: null };
      this.lose = defs.find((d) => d.key === 'lose') || { key: 'lose', name: 'Chúc bạn may mắn lần sau', image: null };
      this.allDefs = this.prizes.concat([this.card, this.lose]);
      this.slots = this.buildSlots();

      this.$ = {
        svg: root.querySelector('[data-lw-svg]'),
        disc: root.querySelector('[data-lw-disc]'),
        btn: root.querySelector('[data-lw-spin]'),
        hubText: root.querySelector('[data-lw-hub-text]'),
        pointer: root.querySelector('[data-lw-pointer]'),
        status: root.querySelector('[data-lw-status]'),
        prizes: root.querySelector('[data-lw-prizes]'),
        modal: root.querySelector('[data-lw-modal]'),
        modalImg: root.querySelector('[data-lw-modal-img]'),
        modalEyebrow: root.querySelector('[data-lw-modal-eyebrow]'),
        modalTitle: root.querySelector('[data-lw-modal-title]'),
        modalText: root.querySelector('[data-lw-modal-text]'),
        confetti: root.querySelector('[data-lw-confetti]'),
        stage: root.querySelector('[data-lw-stage]')
      };

      // Move the modal to <body> so no transformed/overflow ancestor can clip it
      if (this.$.modal) document.body.appendChild(this.$.modal);

      this.draw();
      this.fitBanner();
      // Custom fonts load late and change the text width: fit again once they are ready
      if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => this.fitBanner());
      this.idle();
      this.bind();
      this.loadStatus();
    }

    /* ---------- layout ---------- */

    /**
     * One slot per prize, in Theme settings order, then the chapter card and
     * "better luck next time" last (clockwise from the top).
     */
    buildSlots() {
      const prizes = this.prizes.slice().sort((x, y) => (x.slot || 0) - (y.slot || 0));
      return prizes.concat([this.card, this.lose]);
    }

    draw() {
      const svg = this.$.svg;
      const n = this.slots.length;
      const step = 360 / n;
      let html =
        '<defs>' +
          '<radialGradient id="lwSegA" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="scale(190)">' +
            '<stop offset="0" stop-color="#5a5a5a"/><stop offset="1" stop-color="#454545"/></radialGradient>' +
          '<radialGradient id="lwSegB" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="scale(190)">' +
            '<stop offset="0" stop-color="#3b3b3b"/><stop offset="1" stop-color="#2c2c2c"/></radialGradient>' +
          '<radialGradient id="lwSegCard" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="scale(190)">' +
            '<stop offset="0" stop-color="#2a2a2a"/><stop offset="1" stop-color="#1c1c1c"/></radialGradient>' +
          '<linearGradient id="lwGold" x1="0" y1="0" x2="1" y2="1">' +
            '<stop offset="0" stop-color="#ffe2a8"/><stop offset=".5" stop-color="#e3a75a"/><stop offset="1" stop-color="#a5672a"/></linearGradient>' +
          '<filter id="lwLift" x="-30%" y="-30%" width="160%" height="160%">' +
            '<feDropShadow dx="0" dy="6" stdDeviation="7" flood-color="#000" flood-opacity=".65"/></filter>' +
        '</defs>';

      for (let i = 0; i < n; i += 1) {
        const a0 = (i * step - 90 - step / 2) * Math.PI / 180;
        const a1 = ((i + 1) * step - 90 - step / 2) * Math.PI / 180;
        const x0 = R_OUT * Math.cos(a0), y0 = R_OUT * Math.sin(a0);
        const x1 = R_OUT * Math.cos(a1), y1 = R_OUT * Math.sin(a1);
        const slot = this.slots[i];
        const isCard = slot.key === 'card';
        const isLose = slot.key === 'lose';
        const fill = i % 2 ? 'url(#lwSegB)' : 'url(#lwSegA)';

        html += '<g class="lw__seg" data-seg="' + i + '">';
        html += '<path class="lw__seg-shape" d="M0 0 L' + x0 + ' ' + y0 + ' A' + R_OUT + ' ' + R_OUT + ' 0 0 1 ' + x1 + ' ' + y1 + 'Z" fill="' + fill + '"' +
          ' stroke="rgba(0,0,0,.35)" stroke-width="1"/>';

        // content, rotated so it reads from the rim towards the centre
        html += '<g transform="rotate(' + (i * step) + ')">';
        // With labels: smaller icon near the rim. Without: larger icon centred in the segment.
        const cy = this.showLabels ? -150 : -122;
        const iconScale = this.showLabels ? 1 : 1.35;
        if (isLose) {
          html += '<g transform="translate(0,' + cy + ') scale(' + iconScale + ')">' + LuckyWheel.loseIcon() + '</g>';
        } else if (slot.image) {
          const s = this.showLabels ? 30 : 40;
          // Dark tile and its border are toggled independently from Theme settings.
          if (this.imageBg || this.imageFrame) {
            const frameStroke = this.imageFrame
              ? ' stroke="' + (isCard ? 'url(#lwGold)' : 'rgba(255,255,255,.75)') + '" stroke-width="1.5"'
              : ' stroke="none"';
            html += '<rect x="' + (-s / 2 - 2) + '" y="' + (cy - s / 2 - 2) + '" width="' + (s + 4) + '" height="' + (s + 4) + '" rx="8" fill="' + (this.imageBg ? '#111' : 'none') + '"' + frameStroke + '/>';
          }
          html += '<clipPath id="lwThumbClip' + i + '"><rect x="' + (-s / 2) + '" y="' + (cy - s / 2) + '" width="' + s + '" height="' + s + '" rx="6"/></clipPath>';
          html += '<image href="' + esc(slot.image) + '" x="' + (-s / 2) + '" y="' + (cy - s / 2) + '" width="' + s + '" height="' + s + '" clip-path="url(#lwThumbClip' + i + ')" preserveAspectRatio="xMidYMid slice"/>';
        } else {
          html += '<g transform="translate(0,' + cy + ') scale(' + iconScale + ')">' + (isCard ? LuckyWheel.cardIcon() : LuckyWheel.giftIcon()) + '</g>';
        }
        if (this.showLabels) {
          html += this.radialLabel(this.wrap(slot.name.toUpperCase(), 10).slice(0, 2), isLose ? 'lw__seg-label lw__seg-label--lose' : 'lw__seg-label');
        }
        html += '</g></g>';
      }

      svg.innerHTML = html;
      LuckyWheel.lockFills(svg);
    }

    /* Ribbon = an arc concentric with the wheel (same -200..200 coordinates).
       Its angle grows with the text so the ribbon always hugs the rim. */
    fitBanner() {
      const svg = this.root.querySelector('[data-lw-banner-svg]');
      const textPath = this.root.querySelector('[data-lw-banner-text]');
      const shape = this.root.querySelector('[data-lw-banner-shape]');
      const edge = this.root.querySelector('[data-lw-banner-edge]');
      const arc = svg && svg.querySelector('#lwBannerArc');
      if (!svg || !textPath || !shape || !arc) return;

      // Measure the text on a straight line with the same styles
      const probe = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      probe.setAttribute('class', 'lw__banner-text');
      probe.style.visibility = 'hidden';
      probe.textContent = textPath.textContent;
      svg.appendChild(probe);
      let textLen = 0;
      try { textLen = probe.getComputedTextLength(); } catch (e) { textLen = 0; }
      probe.remove();

      const RO = 214, RI = 184, RC = 199, PAD = 26;
      const MIN_DEG = 30, MAX_DEG = 68; // half-angle of the ribbon, from the top
      let half = MIN_DEG;
      if (textLen) half = Math.min(MAX_DEG, Math.max(MIN_DEG, ((textLen + PAD * 2) / RC) * 90 / Math.PI));

      const pt = (r, deg) => {
        const a = deg * Math.PI / 180;
        return (r * Math.sin(a)).toFixed(2) + ' ' + (-r * Math.cos(a)).toFixed(2);
      };
      const large = half > 90 ? 1 : 0;
      shape.setAttribute('d',
        'M' + pt(RO, -half) + ' A' + RO + ' ' + RO + ' 0 ' + large + ' 1 ' + pt(RO, half) +
        ' L' + pt(RI, half) + ' A' + RI + ' ' + RI + ' 0 ' + large + ' 0 ' + pt(RI, -half) + ' Z');
      if (edge) edge.setAttribute('d', 'M' + pt(RO, -half) + ' A' + RO + ' ' + RO + ' 0 ' + large + ' 1 ' + pt(RO, half));
      arc.setAttribute('d', 'M' + pt(RC, -half) + ' A' + RC + ' ' + RC + ' 0 ' + large + ' 1 ' + pt(RC, half));

      // Still too long at the maximum angle: squeeze the text instead of overflowing
      const available = (2 * half * Math.PI / 180) * RC - PAD * 2;
      if (textLen > available + 1) {
        textPath.setAttribute('textLength', Math.max(40, Math.floor(available)));
        textPath.setAttribute('lengthAdjust', 'spacingAndGlyphs');
      } else {
        textPath.removeAttribute('textLength');
        textPath.removeAttribute('lengthAdjust');
      }
    }

    /* Lift the segment that landed under the banner */
    highlight(index) {
      this.$.svg.querySelectorAll('.lw__seg.is-active').forEach((g) => {
        g.classList.remove('is-active');
        g.removeAttribute('transform');
        g.removeAttribute('filter');
        const p = g.querySelector('.lw__seg-shape');
        if (p) { p.setAttribute('stroke', 'rgba(0,0,0,.35)'); p.setAttribute('stroke-width', '1'); }
      });
      if (index == null) return;
      const g = this.$.svg.querySelector('.lw__seg[data-seg="' + index + '"]');
      if (!g) return;
      g.classList.add('is-active');
      g.setAttribute('transform', 'scale(1.07)');
      g.setAttribute('filter', 'url(#lwLift)');
      const shape = g.querySelector('.lw__seg-shape');
      if (shape) { shape.setAttribute('stroke', 'url(#lwGold)'); shape.setAttribute('stroke-width', '2.5'); }
      g.parentNode.appendChild(g); // draw on top of its neighbours
    }

    /* Flat vector icons (emoji get clipped inside SVG on some systems) */
    static giftIcon() {
      return (
        '<path d="M0 -9 C-2 -17 -12 -18 -11 -12 C-10 -8.5 -4 -8.5 0 -9 Z" fill="#f4f4f4"/>' +
        '<path d="M0 -9 C2 -17 12 -18 11 -12 C10 -8.5 4 -8.5 0 -9 Z" fill="#f4f4f4"/>' +
        '<rect x="-13" y="-8.5" width="26" height="6.5" rx="1.2" fill="#f4f4f4"/>' +
        '<rect x="-11" y="-0.5" width="22" height="13.5" rx="1.2" fill="#f4f4f4"/>' +
        '<rect x="-1.6" y="-8.5" width="3.2" height="21.5" fill="rgba(0,0,0,.45)"/>'
      );
    }

    /* Four-leaf clover for "better luck next time" */
    static loseIcon() {
      const leaf = (r) => '<path d="M0 -1 C-7 -6 -9 -14 -4.5 -15 C-2 -15.5 0 -13.5 0 -11 C0 -13.5 2 -15.5 4.5 -15 C9 -14 7 -6 0 -1 Z" transform="rotate(' + r + ')" fill="url(#lwGold)"/>';
      return leaf(0) + leaf(90) + leaf(180) + leaf(270) +
        '<path d="M0.8 0.8 C4 5 5 9 8.5 12.5" fill="none" stroke="#e3a75a" stroke-width="1.8" stroke-linecap="round"/>' +
        '<circle r="2.2" fill="#8a5a12"/>';
    }

    static cardIcon() {
      return (
        '<rect x="-14" y="-14" width="28" height="28" rx="3" fill="#121212" stroke="rgba(227,167,90,.55)" stroke-width=".8"/>' +
        '<rect x="-7" y="-10" width="14" height="20" rx="2" fill="url(#lwGold)"/>' +
        '<rect x="-5" y="-8" width="10" height="16" rx="1.2" fill="#f7ead2"/>' +
        '<path d="M0 -4.6 L1.35 -1.45 L4.7 -1.2 L2.15 1 L2.95 4.3 L0 2.55 L-2.95 4.3 L-2.15 1 L-4.7 -1.2 L-1.35 -1.45 Z" fill="#b8792f"/>'
      );
    }

    /* The account dashboard has `.db-wrapper svg * { fill: none !important }`.
       Re-apply every fill as an inline !important style, which outranks it. */
    static lockFills(svg) {
      svg.querySelectorAll('*').forEach((el) => {
        const tag = el.tagName.toLowerCase();
        if (tag === 'stop' || tag === 'lineargradient' || tag === 'radialgradient' || tag === 'defs' || tag === 'clippath') return;
        let fill = el.getAttribute('fill');
        if (!fill && tag === 'text') {
          fill = el.classList.contains('lw__seg-label--lose') ? '#f5c45a'
            : el.classList.contains('lw__seg-label') ? '#f6efe0'
            : '#ffffff';
        }
        if (fill) el.style.setProperty('fill', fill, 'important');
      });
    }

    /* Text running along the radius (centre -> rim), max 2 lines */
    radialLabel(lines, cls, r = -98, gap = 13) {
      const offset = (lines.length - 1) * gap / 2;
      return '<g transform="translate(0,' + r + ') rotate(-90)">' + lines.map((line, i) =>
        '<text class="' + cls + '" x="0" y="' + (i * gap - offset) + '" text-anchor="middle" dominant-baseline="middle">' + esc(line) + '</text>'
      ).join('') + '</g>';
    }

    labelSvg(text, y, cls) {
      return '<text class="' + cls + '" x="0" y="' + y + '" text-anchor="middle" dominant-baseline="middle">' + esc(text) + '</text>';
    }

    wrap(text, max) {
      const words = String(text).split(/\s+/);
      const lines = [];
      let line = '';
      words.forEach((w) => {
        if ((line + ' ' + w).trim().length > max && line) { lines.push(line); line = w; }
        else line = (line + ' ' + w).trim();
      });
      if (line) lines.push(line);
      return lines;
    }

    /* ---------- events ---------- */

    bind() {
      this.$.btn.addEventListener('click', () => this.spin());
      if (this.$.modal) this.$.modal.querySelectorAll('[data-lw-close]').forEach((el) => el.addEventListener('click', () => this.closeModal()));
      document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && !this.$.modal.hidden) this.closeModal();
      });
    }

    /* ---------- API ---------- */

    async call(action, extra) {
      const res = await fetch(this.api, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(Object.assign({ action: action, token: this.token }, extra || {}))
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const err = new Error(data.error || 'Request failed');
        err.code = data.code;
        err.data = data;
        throw err;
      }
      return data;
    }

    /**
     * Retries while the server is busy (many spins at the same moment) or the network
     * hiccups. Safe: a repeated spin returns the result already recorded for today.
     */
    async callWithRetry(action, extra, tries = 4) {
      for (let i = 1; ; i += 1) {
        try {
          return await this.call(action, extra);
        } catch (e) {
          const transient = e.code === 'busy' || e.code === 'server_error' || e.name === 'TypeError';
          if (!transient || i >= tries) throw e;
          await new Promise((r) => setTimeout(r, 600 + Math.random() * 900 * i));
        }
      }
    }

    async loadStatus() {
      try {
        const data = await this.call('status');
        this.applyStatus(data);
        if (Array.isArray(data.prizes)) this.renderPrizes(data.prizes);
      } catch (e) {
        this.showError(e);
      }
    }

    applyStatus(data) {
      const c = data.campaign || {};
      this.nextSpinAt = data.next_spin_at ? new Date(data.next_spin_at) : null;
      if (c.status === 'not_started') {
        this.setLocked('Chương trình bắt đầu lúc ' + new Date(c.start_at).toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' }));
      } else if (c.status === 'ended') {
        this.setLocked('Chương trình đã kết thúc. Cảm ơn bạn đã tham gia!');
      } else if (c.status !== 'active') {
        this.setLocked('Vòng quay hiện chưa mở.');
      } else if (!data.can_spin) {
        this.setWaiting(data.today);
      } else {
        this.canSpin = true;
        this.$.btn.disabled = false;
        this.$.hubText.textContent = 'Quay ngay';
        this.root.classList.add('is-ready');
        this.$.status.innerHTML = 'Bạn có <strong>1 lượt quay</strong> hôm nay. Chúc may mắn!';
      }
    }

    setLocked(msg) {
      this.canSpin = false;
      this.$.btn.disabled = true;
      this.$.hubText.textContent = 'Quay ngay';
      this.root.classList.remove('is-ready');
      this.$.status.textContent = msg;
    }

    setWaiting(today) {
      this.canSpin = false;
      this.$.btn.disabled = true;
      this.root.classList.remove('is-ready');
      this.$.hubText.textContent = 'Hẹn bạn ngày mai';
      const prefix = today && (today.type === 'win' || today.type === 'card')
        ? 'Hôm nay bạn đã trúng <strong>' + esc(today.name) + '</strong>. '
        : 'Bạn đã quay hôm nay. ';
      const tick = () => {
        if (!this.nextSpinAt) { this.$.status.innerHTML = prefix; return; }
        const ms = Math.max(0, this.nextSpinAt - Date.now());
        if (ms === 0) { clearInterval(this.timer); this.loadStatus(); return; }
        const h = String(Math.floor(ms / 3600000)).padStart(2, '0');
        const m = String(Math.floor(ms % 3600000 / 60000)).padStart(2, '0');
        const s = String(Math.floor(ms % 60000 / 1000)).padStart(2, '0');
        this.$.status.innerHTML = prefix + 'Lượt tiếp theo sau <span class="lw__clock">' + h + ':' + m + ':' + s + '</span>';
      };
      clearInterval(this.timer);
      tick();
      this.timer = setInterval(tick, 1000);
    }

    showError(e) {
      if (e && e.code === 'token_expired') this.setLocked('Phiên đã hết hạn, vui lòng tải lại trang.');
      else if (e && e.code === 'unauthorized') this.setLocked('Vui lòng đăng nhập lại để quay.');
      else this.setLocked('Không kết nối được vòng quay, vui lòng thử lại sau.');
    }

    /* ---------- spin ---------- */

    async spin() {
      if (this.spinning || !this.canSpin) return;
      this.spinning = true;
      this.canSpin = false;
      this.$.btn.disabled = true;
      this.root.classList.remove('is-ready');
      this.root.classList.add('is-spinning');
      this.$.status.textContent = 'Đang quay…';
      this.$.hubText.textContent = 'Đang quay…';
      this.highlight(null);
      this.parked = false;

      // Start spinning right away; land once the server answers
      const free = this.freeSpin();
      let data;
      try {
        data = await this.callWithRetry('spin');
      } catch (e) {
        if (e.code === 'already_spun' && e.data && e.data.result) {
          data = { result: e.data.result, next_spin_at: null, already: true };
        } else {
          await free.stop();
          this.spinning = false;
          this.root.classList.remove('is-spinning');
          this.showError(e);
          if (e.code !== 'token_expired' && e.code !== 'unauthorized') setTimeout(() => this.loadStatus(), 2500);
          return;
        }
      }

      const result = data.result;
      const index = this.slotIndexFor(result);
      await free.landOn(index);
      this.parked = true;
      this.highlight(index);

      this.spinning = false;
      this.root.classList.remove('is-spinning');
      if (data.next_spin_at) this.nextSpinAt = new Date(data.next_spin_at);
      this.setWaiting(result);
      if (Array.isArray(data.prizes)) this.renderPrizes(data.prizes);
      else this.loadStatus();
      this.openModal(result);
    }

    slotIndexFor(result) {
      const matches = [];
      this.slots.forEach((s, i) => { if (s.key === result.key) matches.push(i); });
      if (!matches.length) return 0;
      return matches[Math.floor(Math.random() * matches.length)];
    }

    /* Idle drift so the wheel feels alive */
    idle() {
      let last = performance.now();
      const loop = (t) => {
        const dt = t - last;
        last = t;
        if (!this.spinning && !this.parked) {
          this.angle += dt * 0.004;
          this.render();
        }
        this.idleRaf = requestAnimationFrame(loop);
      };
      this.idleRaf = requestAnimationFrame(loop);
    }

    render() {
      this.$.disc.style.transform = 'rotate(' + this.angle + 'deg)';
      const step = 360 / this.slots.length;
      const seg = Math.floor(((this.angle % 360) + 360 + step / 2) / step);
      if (seg !== this.lastSeg) {
        this.lastSeg = seg;
        // (no pointer tick: it made the ribbon look like it was shaking)
      }
    }

    tickPointer() {
      const p = this.$.pointer;
      p.classList.remove('is-tick');
      void p.offsetWidth;
      p.classList.add('is-tick');
    }

    freeSpin() {
      const self = this;
      let speed = 0; // deg per ms
      let mode = 'accel';
      let raf;
      let last = performance.now();
      let landing = null;

      const loop = (t) => {
        const dt = Math.min(48, t - last);
        last = t;
        if (mode === 'accel') {
          speed = Math.min(1.1, speed + dt * 0.0022);
          self.angle += speed * dt;
        } else if (mode === 'land') {
          const p = Math.min(1, (t - landing.t0) / landing.duration);
          const eased = 1 - Math.pow(1 - p, 4); // easeOutQuart
          self.angle = landing.from + (landing.to - landing.from) * eased;
          if (p >= 1) {
            self.render();
            landing.done();
            return;
          }
        } else if (mode === 'stop') {
          speed *= 0.92;
          self.angle += speed * dt;
          if (speed < 0.01) { self.render(); landing.done(); return; }
        }
        self.render();
        raf = requestAnimationFrame(loop);
      };
      raf = requestAnimationFrame(loop);

      return {
        landOn(index) {
          return new Promise((resolve) => {
            const n = self.slots.length;
            const step = 360 / n;
            // Pointer is at the top; slot i is centred at i*step, so the disc must be at -i*step (mod 360)
            const jitter = (Math.random() - 0.5) * step * 0.6;
            const targetMod = ((-index * step + jitter) % 360 + 360) % 360;
            const current = self.angle;
            const currentMod = ((current % 360) + 360) % 360;
            let delta = targetMod - currentMod;
            if (delta < 0) delta += 360;
            const minTurns = 4;
            const to = current + delta + minTurns * 360;
            // Duration matched to current speed so there is no visible jolt
            const distance = to - current;
            const duration = Math.max(3800, Math.min(7000, (4 * distance) / Math.max(speed, 0.4)));
            landing = { from: current, to, t0: performance.now(), duration, done: resolve };
            mode = 'land';
          });
        },
        stop() {
          return new Promise((resolve) => { landing = { done: resolve }; mode = 'stop'; });
        }
      };
    }

    /* ---------- prizes list ---------- */

    renderPrizes(prizes) {
      if (!this.$.prizes) return;
      if (!prizes.length) {
        this.$.prizes.innerHTML = '<p class="lw__empty">Bạn chưa có quà nào. Quay ngay để thử vận may!</p>';
        return;
      }
      const now = Date.now();
      this.$.prizes.innerHTML = prizes.map((p) => {
        const def = this.allDefs.find((d) => d.key === p.key) || {};
        const exp = new Date(p.expires_at).getTime();
        const left = exp - now;
        const days = Math.ceil(left / 86400000);
        const sent = p.status === 'sent';
        const attached = p.status === 'attached' && p.order;
        const orderName = p.order && p.order.name ? ' ' + p.order.name : '';
        const expired = !sent && !attached && left <= 0;
        return '<div class="lw-prize' + (sent || attached ? ' is-sent' : expired ? ' is-expired' : '') + '">' +
          '<div class="lw-prize__img' + (def.photo ? ' is-photo' : '') + '">' + ((def.photo || def.image) ? '<img src="' + esc(def.photo || def.image) + '" alt="" width="64" height="64" loading="lazy">' : '<span aria-hidden="true">🎁</span>') + '</div>' +
          '<div class="lw-prize__info">' +
            '<p class="lw-prize__name">' + esc(p.name) + '</p>' +
            '<p class="lw-prize__meta">Nhận ngày ' + fmtDate(p.won_at) + '</p>' +
            '<p class="lw-prize__exp' + (sent || attached ? ' lw-prize__exp--sent' : '') + '">' + (sent
              ? '✓ Đã gửi kèm đơn hàng' + esc(orderName)
              : attached
                ? '✓ Sẽ gửi kèm đơn hàng' + esc(orderName)
                : expired
                  ? 'Đã hết hạn (' + fmtDate(p.expires_at) + ')'
                  : 'Gửi kèm đơn hàng tiếp theo · đặt hàng trước ' + fmtDate(p.expires_at) + ' (còn ' + days + ' ngày)') + '</p>' +
          '</div></div>';
      }).join('');
    }

    /* ---------- result modal ---------- */

    openModal(result) {
      const win = result.type === 'win';
      const lose = result.type === 'lose';
      const def = this.allDefs.find((d) => d.key === result.key) || {};
      this.$.modal.classList.toggle('is-win', win);
      const photo = def.photo || def.image;
      this.$.modalImg.classList.toggle('is-photo', !!def.photo);
      this.$.modalImg.innerHTML = photo
        ? '<img src="' + esc(photo) + '" alt="' + esc(result.name || def.name || '') + '">'
        : '<span>' + (win ? '🎁' : lose ? '🍀' : '🃏') + '</span>';
      this.$.modalEyebrow.textContent = win ? 'Chúc mừng bạn đã trúng' : lose ? 'Tiếc quá!' : 'Bạn nhận được';
      this.$.modalTitle.textContent = result.name || def.name || '';
      const exp = result.expires_at ? new Date(result.expires_at) : new Date(new Date(result.at).getTime() + 30 * 86400000);
      this.$.modalText.innerHTML = lose
        ? 'Hẹn bạn quay tiếp vào ngày mai để thử vận may nhé!'
        : 'Quà đã được lưu trong mục <strong>Quà của tôi</strong>. Quà sẽ được <strong>gửi kèm đơn hàng tiếp theo</strong> của bạn, đặt hàng trước <strong>' + fmtDate(exp) + '</strong>.' +
          (win ? '' : '<br>Hẹn bạn quay tiếp vào ngày mai để thử vận may với quà lớn!');
      this.$.modal.hidden = false;
      requestAnimationFrame(() => this.$.modal.classList.add('is-open'));
      if (!lose) this.confetti(win ? 160 : 50);
      const btn = this.$.modal.querySelector('.lw-modal__btn');
      if (btn) btn.focus({ preventScroll: true });
    }

    closeModal() {
      this.$.modal.classList.remove('is-open');
      setTimeout(() => { this.$.modal.hidden = true; }, 250);
      cancelAnimationFrame(this.confettiRaf);
    }

    confetti(count) {
      const canvas = this.$.confetti;
      const ctx = canvas.getContext('2d');
      const dpr = window.devicePixelRatio || 1;
      const w = canvas.clientWidth, h = canvas.clientHeight;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      ctx.scale(dpr, dpr);
      const colors = ['#f5c45a', '#fff3c4', '#e2a93a', '#ffffff', '#c0c0c0'];
      const parts = Array.from({ length: count || 160 }, () => ({
        x: w / 2, y: h * 0.45,
        vx: (Math.random() - 0.5) * 14, vy: -Math.random() * 14 - 4,
        r: 3 + Math.random() * 5, c: colors[Math.floor(Math.random() * colors.length)],
        a: Math.random() * Math.PI, va: (Math.random() - 0.5) * 0.3, life: 0
      }));
      const start = performance.now();
      const loop = (t) => {
        ctx.clearRect(0, 0, w, h);
        parts.forEach((p) => {
          p.vy += 0.32; p.vx *= 0.99; p.x += p.vx; p.y += p.vy; p.a += p.va;
          ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.a);
          ctx.fillStyle = p.c; ctx.fillRect(-p.r, -p.r / 2, p.r * 2, p.r);
          ctx.restore();
        });
        if (t - start < 3500) this.confettiRaf = requestAnimationFrame(loop);
        else ctx.clearRect(0, 0, w, h);
      };
      this.confettiRaf = requestAnimationFrame(loop);
    }
  }

  const init = (scope) => {
    (scope || document).querySelectorAll('[data-lucky-wheel]').forEach((el) => {
      if (!el.__luckyWheel) el.__luckyWheel = new LuckyWheel(el);
    });
  };
  window.LuckyWheelInit = init;

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => init());
  else init();
})();
