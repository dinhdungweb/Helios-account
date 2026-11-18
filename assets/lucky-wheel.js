/* Lucky wheel – account tab.
 * The server decides the result; this file only renders and animates.
 */
(function () {
  'use strict';

  if (window.LuckyWheelInit) return;

  const SVG_NS = 'http://www.w3.org/2000/svg';
  const R_OUT = 186;
  const R_IN = 58;
  const CARD_SLOTS = [0, 4, 8]; // 12-slot wheel: 9 prizes + 3 chapter-card slots

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
      this.angle = 0;
      this.spinning = false;
      this.canSpin = false;

      let defs = [];
      try { defs = JSON.parse(root.dataset.segments || '[]'); } catch (e) { defs = []; }
      this.prizes = defs.filter((d) => d.key !== 'card');
      this.card = defs.find((d) => d.key === 'card') || { key: 'card', name: 'Thẻ chương 10 năm', image: null };
      this.allDefs = this.prizes.concat([this.card]);
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
      this.idle();
      this.bind();
      this.loadStatus();
    }

    /* ---------- layout ---------- */

    buildSlots() {
      const total = this.prizes.length + CARD_SLOTS.length;
      const slots = [];
      let p = 0;
      for (let i = 0; i < total; i += 1) {
        if (CARD_SLOTS.indexOf(i) !== -1 || p >= this.prizes.length) slots.push(this.card);
        else slots.push(this.prizes[p++]);
      }
      return slots;
    }

    draw() {
      const svg = this.$.svg;
      const n = this.slots.length;
      const step = 360 / n;
      let html =
        '<defs>' +
          '<radialGradient id="lwSegA" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="scale(190)">' +
            '<stop offset=".2" stop-color="#2b2b2b"/><stop offset="1" stop-color="#151515"/></radialGradient>' +
          '<radialGradient id="lwSegB" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="scale(190)">' +
            '<stop offset=".2" stop-color="#3a3a3a"/><stop offset="1" stop-color="#1f1f1f"/></radialGradient>' +
          '<radialGradient id="lwSegLose" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="scale(190)">' +
            '<stop offset=".2" stop-color="#3a2a0c"/><stop offset="1" stop-color="#1a1206"/></radialGradient>' +
          '<linearGradient id="lwGold" x1="0" y1="0" x2="1" y2="1">' +
            '<stop offset="0" stop-color="#fff3c4"/><stop offset=".5" stop-color="#e2a93a"/><stop offset="1" stop-color="#8a5a12"/></linearGradient>' +

        '</defs>';

      for (let i = 0; i < n; i += 1) {
        const a0 = (i * step - 90 - step / 2) * Math.PI / 180;
        const a1 = ((i + 1) * step - 90 - step / 2) * Math.PI / 180;
        const x0 = R_OUT * Math.cos(a0), y0 = R_OUT * Math.sin(a0);
        const x1 = R_OUT * Math.cos(a1), y1 = R_OUT * Math.sin(a1);
        const ix0 = R_IN * Math.cos(a0), iy0 = R_IN * Math.sin(a0);
        const ix1 = R_IN * Math.cos(a1), iy1 = R_IN * Math.sin(a1);
        const slot = this.slots[i];
        const fill = slot.key === 'card' ? 'url(#lwSegLose)' : (i % 2 ? 'url(#lwSegB)' : 'url(#lwSegA)');
        html += '<path d="M' + ix0 + ' ' + iy0 + ' L' + x0 + ' ' + y0 + ' A' + R_OUT + ' ' + R_OUT + ' 0 0 1 ' + x1 + ' ' + y1 +
          ' L' + ix1 + ' ' + iy1 + ' A' + R_IN + ' ' + R_IN + ' 0 0 0 ' + ix0 + ' ' + iy0 + 'Z" fill="' + fill + '"/>';
        // gold divider
        html += '<line x1="' + ix0 + '" y1="' + iy0 + '" x2="' + x0 + '" y2="' + y0 + '" stroke="url(#lwGold)" stroke-width="1.6" opacity=".9"/>';

        // content, rotated so it reads from the rim towards the centre
        const rot = i * step;
        html += '<g transform="rotate(' + rot + ')">';
        const isCard = slot.key === 'card';
        // With labels: small thumb near the rim. Without: larger thumb centred in the segment.
        const cy = this.showLabels ? -152 : -122;
        const r = this.showLabels ? 19 : 28;
        const iconScale = this.showLabels ? 1 : 1.7;
        if (slot.image) {
          html += '<circle cx="0" cy="' + cy + '" r="' + r + '" fill="#0d0d0d" stroke="url(#lwGold)" stroke-width="1.5"/>';
          html += '<image href="' + esc(slot.image) + '" x="' + -(r - 2) + '" y="' + (cy - r + 2) + '" width="' + 2 * (r - 2) + '" height="' + 2 * (r - 2) + '" clip-path="url(#lwThumbClip' + i + ')" preserveAspectRatio="xMidYMid slice"/>';
          html += '<clipPath id="lwThumbClip' + i + '"><circle cx="0" cy="' + cy + '" r="' + (r - 2) + '"/></clipPath>';
        } else {
          html += '<g transform="translate(0,' + cy + ') scale(' + iconScale + ')">' + (isCard ? LuckyWheel.cardIcon() : LuckyWheel.giftIcon()) + '</g>';
        }
        if (this.showLabels) {
          html += this.radialLabel(this.wrap(slot.name.toUpperCase(), 10).slice(0, 2), isCard ? 'lw__seg-label lw__seg-label--lose' : 'lw__seg-label');
        }
        html += '</g>';
      }

      // inner ring
      html += '<circle r="' + R_OUT + '" fill="none" stroke="url(#lwGold)" stroke-width="3"/>';
      html += '<circle r="' + (R_IN + 1) + '" fill="none" stroke="url(#lwGold)" stroke-width="2"/>';
      svg.innerHTML = html;
      LuckyWheel.lockFills(svg);
    }

    /* Vector icons (emoji get clipped inside SVG on some systems) */
    static giftIcon() {
      return (
        '<path d="M-1 -8 C-4 -16 -13 -14 -9 -8 Z" fill="#c0392b" stroke="#7a1a12" stroke-width=".8"/>' +
        '<path d="M1 -8 C4 -16 13 -14 9 -8 Z" fill="#c0392b" stroke="#7a1a12" stroke-width=".8"/>' +
        '<rect x="-10" y="-3" width="20" height="13" rx="1.5" fill="#e2a93a" stroke="#8a5a12" stroke-width=".8"/>' +
        '<rect x="-12" y="-8" width="24" height="6" rx="1.5" fill="#f5c45a" stroke="#8a5a12" stroke-width=".8"/>' +
        '<rect x="-2" y="-8" width="4" height="18" fill="#c0392b"/>'
      );
    }

    static cardIcon() {
      return (
        '<rect x="-8.5" y="-11.5" width="17" height="23" rx="2.5" fill="#f6efe0" stroke="#e2a93a" stroke-width="1.4"/>' +
        '<rect x="-6" y="-9" width="12" height="18" rx="1.5" fill="none" stroke="#e2a93a" stroke-width=".6"/>' +
        '<path d="M0 -5.5 L1.6 -1.7 L5.6 -1.4 L2.5 1.2 L3.5 5.1 L0 3 L-3.5 5.1 L-2.5 1.2 L-5.6 -1.4 L-1.6 -1.7 Z" fill="#c98f2a"/>'
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
    radialLabel(lines, cls) {
      const gap = 13;
      const offset = (lines.length - 1) * gap / 2;
      return '<g transform="translate(0,-98) rotate(-90)">' + lines.map((line, i) =>
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

    async call(action) {
      const res = await fetch(this.api, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: action, token: this.token })
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
        this.$.hubText.textContent = 'QUAY';
        this.root.classList.add('is-ready');
        this.$.status.innerHTML = 'Bạn có <strong>1 lượt quay</strong> hôm nay. Chúc may mắn!';
      }
    }

    setLocked(msg) {
      this.canSpin = false;
      this.$.btn.disabled = true;
      this.root.classList.remove('is-ready');
      this.$.status.textContent = msg;
    }

    setWaiting(today) {
      this.canSpin = false;
      this.$.btn.disabled = true;
      this.root.classList.remove('is-ready');
      this.$.hubText.textContent = 'MAI';
      const prefix = today && today.type === 'win'
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

      // Start spinning right away; land once the server answers
      const free = this.freeSpin();
      let data;
      try {
        data = await this.call('spin');
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
        if (this.spinning) this.tickPointer();
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
        const expired = !sent && left <= 0;
        return '<div class="lw-prize' + (sent ? ' is-sent' : expired ? ' is-expired' : '') + '">' +
          '<div class="lw-prize__img">' + (def.image ? '<img src="' + esc(def.image) + '" alt="" width="64" height="64" loading="lazy">' : '<span aria-hidden="true">🎁</span>') + '</div>' +
          '<div class="lw-prize__info">' +
            '<p class="lw-prize__name">' + esc(p.name) + '</p>' +
            '<p class="lw-prize__meta">Nhận ngày ' + fmtDate(p.won_at) + '</p>' +
            '<p class="lw-prize__exp' + (sent ? ' lw-prize__exp--sent' : '') + '">' + (sent ? '✓ Đã gửi kèm đơn hàng' : expired
              ? 'Đã hết hạn (' + fmtDate(p.expires_at) + ')'
              : 'Hạn dùng đến ' + fmtDate(p.expires_at) + ' · còn ' + days + ' ngày') + '</p>' +
          '</div></div>';
      }).join('');
    }

    /* ---------- result modal ---------- */

    openModal(result) {
      const win = result.type === 'win';
      const def = this.allDefs.find((d) => d.key === result.key) || {};
      this.$.modal.classList.toggle('is-win', win);
      this.$.modalImg.innerHTML = def.image
        ? '<img src="' + esc(def.image) + '" alt="">'
        : '<span>' + (win ? '🎁' : '🃏') + '</span>';
      this.$.modalEyebrow.textContent = win ? 'Chúc mừng bạn đã trúng' : 'Bạn nhận được';
      this.$.modalTitle.textContent = result.name || def.name || '';
      const exp = new Date(new Date(result.at).getTime() + 30 * 86400000);
      this.$.modalText.innerHTML = 'Quà đã được lưu trong mục <strong>Quà của tôi</strong> và sẽ được gửi kèm đơn hàng tiếp theo. Hạn dùng đến <strong>' + fmtDate(exp) + '</strong>.' +
        (win ? '' : '<br>Hẹn bạn quay tiếp vào ngày mai để thử vận may với quà lớn!');
      this.$.modal.hidden = false;
      requestAnimationFrame(() => this.$.modal.classList.add('is-open'));
      this.confetti(win ? 160 : 50);
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
