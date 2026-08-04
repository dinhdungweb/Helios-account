(function(global) {
  'use strict';

  if (global.HeliosWebGLFlipbook) return;

  var PI = Math.PI;

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function smootherStep(value) {
    return value * value * value * (value * (value * 6 - 15) + 10);
  }

  function createElement(tagName, className) {
    var element = document.createElement(tagName);
    if (className) element.className = className;
    return element;
  }

  function WebGLFlipbook(container, options) {
    if (!container) throw new Error('A flipbook container is required.');

    this.container = container;
    this.options = options || {};
    this.pages = Array.isArray(this.options.pages) ? this.options.pages : [];
    this.pageCount = this.pages.length;
    this.currentPage = clamp(Number(this.options.startPage) || 1, 1, Math.max(1, this.pageCount));
    this.duration = Math.max(1, Number(this.options.duration) || 560);
    this.mobileQuery = global.matchMedia('(max-width: 767.8px)');
    this.reducedMotion = global.matchMedia('(prefers-reduced-motion: reduce)').matches;
    this.maxTextures = 6;
    this.textureCache = new Map();
    this.destroyed = false;
    this.contextLost = false;
    this.animationFrame = null;
    this.animation = null;
    this.drag = null;
    this.turn = null;
    this.renderQueued = false;

    this.canvas = createElement('canvas', 'magazine-webgl-canvas');
    this.canvas.setAttribute('aria-label', 'Trình xem tạp chí 3D');
    this.canvas.setAttribute('role', 'img');
    this.fallback = createElement('div', 'magazine-webgl-fallback');
    this.fallback.setAttribute('aria-hidden', 'true');
    this.fallbackLeft = createElement('img', 'magazine-fallback-page magazine-fallback-left');
    this.fallbackRight = createElement('img', 'magazine-fallback-page magazine-fallback-right');
    this.fallback.appendChild(this.fallbackLeft);
    this.fallback.appendChild(this.fallbackRight);
    this.container.appendChild(this.canvas);
    this.container.appendChild(this.fallback);

    this.gl = this.canvas.getContext('webgl', {
      alpha: true,
      antialias: true,
      depth: true,
      premultipliedAlpha: false,
      preserveDrawingBuffer: false,
      powerPreference: 'high-performance'
    });

    try {
      if (this.gl) this._initializeWebGL();
    } catch (error) {
      this.gl = null;
      this._notifyError(error);
    }

    if (!this.gl) this.container.classList.add('is-webgl-fallback');

    this._bindEvents();
    this.resize();

    var initialPages = [1].filter(function(pageNumber) {
      return pageNumber <= this.pageCount;
    }, this);
    var initialLoaded = 0;
    var initialTotal = Math.max(1, initialPages.length);
    var self = this;

    this.ready = Promise.allSettled(initialPages.map(function(pageNumber) {
      return self._ensurePage(pageNumber).finally(function() {
        initialLoaded += 1;
        self._notifyLoadProgress(initialLoaded / initialTotal);
      });
    })).then(function() {
      if (self.destroyed) return self;
      self.render();
      self._notifyPageChange();
      self._scheduleNearbyTextures();
      return self;
    });
  }

  WebGLFlipbook.prototype._initializeWebGL = function() {
    var gl = this.gl;
    var vertexSource = [
      'attribute vec2 aPosition;',
      'uniform float uProgress;',
      'uniform float uDirection;',
      'uniform float uCurl;',
      'uniform float uMirror;',
      'uniform float uBackMirror;',
      'uniform vec2 uOffset;',
      'varying vec2 vUv;',
      'varying vec2 vBackUv;',
      'varying float vLight;',
      'varying float vLocalU;',
      'varying float vBackMix;',
      'void main() {',
      '  float u = aPosition.x;',
      '  float v = aPosition.y;',
      '  float angle = 3.14159265359 * uProgress;',
      '  float lift = sin(angle);',
      '  float curlAngle = angle + (u - 0.5) * 1.2 * lift * uCurl;',
      '  float bow = sin(3.14159265359 * u) * lift * 0.14 * uCurl;',
      '  float x = uDirection * (u * cos(curlAngle) + bow * 0.035);',
      '  float z = u * sin(curlAngle) + bow;',
      '  float perspective = 1.0 / max(0.72, 1.0 - z * 0.16);',
      '  float y = (1.0 - 2.0 * v) * (1.0 - z * 0.015);',
      '  y += bow * (v - 0.5) * 0.025;',
      '  gl_Position = vec4(x * perspective + uOffset.x, y * perspective + uOffset.y, -z * 0.15, 1.0);',
      '  vUv = vec2(mix(u, 1.0 - u, uMirror), v);',
      '  vBackUv = vec2(mix(u, 1.0 - u, uBackMirror), v);',
      '  vLight = 0.7 + 0.3 * abs(cos(curlAngle));',
      '  vLocalU = u;',
      '  vBackMix = 1.0 - smoothstep(-0.08, 0.08, cos(curlAngle));',
      '}'
    ].join('\n');
    var fragmentSource = [
      'precision mediump float;',
      'uniform sampler2D uTexture;',
      'uniform sampler2D uBackTexture;',
      'uniform float uHasBack;',
      'uniform float uFaceLight;',
      'uniform float uSpineShadow;',
      'uniform float uOpacity;',
      'varying vec2 vUv;',
      'varying vec2 vBackUv;',
      'varying float vLight;',
      'varying float vLocalU;',
      'varying float vBackMix;',
      'void main() {',
      '  vec4 frontColor = texture2D(uTexture, vUv);',
      '  vec4 backColor = texture2D(uBackTexture, vBackUv);',
      '  float backAmount = vBackMix * uHasBack;',
      '  vec4 color = mix(frontColor, backColor, backAmount);',
      '  float spine = 1.0 - uSpineShadow * (1.0 - smoothstep(0.0, 0.16, vLocalU));',
      '  float backShade = mix(1.0, 0.9, backAmount);',
      '  color.rgb *= clamp(vLight * uFaceLight * spine * backShade, 0.42, 1.05);',
      '  color.a *= uOpacity;',
      '  gl_FragColor = color;',
      '}'
    ].join('\n');

    this.program = this._createProgram(vertexSource, fragmentSource);
    this.locations = {
      position: gl.getAttribLocation(this.program, 'aPosition'),
      progress: gl.getUniformLocation(this.program, 'uProgress'),
      direction: gl.getUniformLocation(this.program, 'uDirection'),
      curl: gl.getUniformLocation(this.program, 'uCurl'),
      mirror: gl.getUniformLocation(this.program, 'uMirror'),
      backMirror: gl.getUniformLocation(this.program, 'uBackMirror'),
      offset: gl.getUniformLocation(this.program, 'uOffset'),
      texture: gl.getUniformLocation(this.program, 'uTexture'),
      backTexture: gl.getUniformLocation(this.program, 'uBackTexture'),
      hasBack: gl.getUniformLocation(this.program, 'uHasBack'),
      faceLight: gl.getUniformLocation(this.program, 'uFaceLight'),
      spineShadow: gl.getUniformLocation(this.program, 'uSpineShadow'),
      opacity: gl.getUniformLocation(this.program, 'uOpacity')
    };

    this._createMesh(48, 4);
    this.placeholderTexture = this._createSolidTexture(222, 222, 218, 255);
    this.edgeTexture = this._createSolidTexture(244, 243, 238, 255);
    this.shadowTexture = this._createSolidTexture(0, 0, 0, 68);

    gl.useProgram(this.program);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    gl.disable(gl.CULL_FACE);
    gl.disable(gl.DEPTH_TEST);
    gl.clearColor(0, 0, 0, 0);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
  };

  WebGLFlipbook.prototype._createShader = function(type, source) {
    var gl = this.gl;
    var shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      var message = gl.getShaderInfoLog(shader) || 'Unknown shader compilation error.';
      gl.deleteShader(shader);
      throw new Error(message);
    }
    return shader;
  };

  WebGLFlipbook.prototype._createProgram = function(vertexSource, fragmentSource) {
    var gl = this.gl;
    var vertexShader = this._createShader(gl.VERTEX_SHADER, vertexSource);
    var fragmentShader = this._createShader(gl.FRAGMENT_SHADER, fragmentSource);
    var program = gl.createProgram();
    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);
    gl.deleteShader(vertexShader);
    gl.deleteShader(fragmentShader);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      var message = gl.getProgramInfoLog(program) || 'Unknown WebGL program link error.';
      gl.deleteProgram(program);
      throw new Error(message);
    }
    return program;
  };

  WebGLFlipbook.prototype._createMesh = function(horizontalSegments, verticalSegments) {
    var gl = this.gl;
    var vertices = [];
    var indices = [];
    var x;
    var y;

    for (y = 0; y <= verticalSegments; y += 1) {
      for (x = 0; x <= horizontalSegments; x += 1) {
        vertices.push(x / horizontalSegments, y / verticalSegments);
      }
    }

    for (y = 0; y < verticalSegments; y += 1) {
      for (x = 0; x < horizontalSegments; x += 1) {
        var topLeft = y * (horizontalSegments + 1) + x;
        var bottomLeft = (y + 1) * (horizontalSegments + 1) + x;
        var topRight = topLeft + 1;
        var bottomRight = bottomLeft + 1;
        indices.push(topLeft, bottomLeft, topRight, topRight, bottomLeft, bottomRight);
      }
    }

    this.vertexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);
    this.indexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.indexBuffer);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(indices), gl.STATIC_DRAW);
    this.indexCount = indices.length;
  };

  WebGLFlipbook.prototype._createSolidTexture = function(red, green, blue, alpha) {
    var gl = this.gl;
    var texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([red, green, blue, alpha]));
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    return texture;
  };

  WebGLFlipbook.prototype._ensurePage = function(pageNumber) {
    if (pageNumber < 1 || pageNumber > this.pageCount) return Promise.resolve();
    if (!this.gl) return this._preloadFallbackImage(pageNumber);

    var existing = this.textureCache.get(pageNumber);
    if (existing) {
      existing.lastUsed = performance.now();
      return existing.promise;
    }

    var self = this;
    var pageData = this.pages[pageNumber - 1];
    var record = {
      texture: null,
      loaded: false,
      error: false,
      lastUsed: performance.now(),
      promise: null
    };

    record.promise = new Promise(function(resolve) {
      var image = new Image();
      image.crossOrigin = 'anonymous';
      image.decoding = 'async';
      image.onload = function() {
        if (self.destroyed || !self.gl || self.contextLost) {
          resolve();
          return;
        }
        try {
          var gl = self.gl;
          var texture = gl.createTexture();
          gl.bindTexture(gl.TEXTURE_2D, texture);
          gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
          gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
          gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
          gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
          gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
          gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
          record.texture = texture;
          record.loaded = true;
          record.lastUsed = performance.now();
          self._pruneTextures(self._getTextureKeepSet());
          self.requestRender();
        } catch (error) {
          record.error = true;
          self._notifyError(error);
        }
        resolve();
      };
      image.onerror = function() {
        record.error = true;
        resolve();
      };
      image.src = self.mobileQuery.matches && pageData.srcMobile ? pageData.srcMobile : pageData.src;
    });

    this.textureCache.set(pageNumber, record);
    return record.promise;
  };

  WebGLFlipbook.prototype._preloadFallbackImage = function(pageNumber) {
    var pageData = this.pages[pageNumber - 1];
    if (!pageData) return Promise.resolve();
    var useMobileImage = this.mobileQuery && this.mobileQuery.matches;
    return new Promise(function(resolve) {
      var image = new Image();
      image.onload = resolve;
      image.onerror = resolve;
      image.src = useMobileImage && pageData.srcMobile ? pageData.srcMobile : pageData.src;
    });
  };

  WebGLFlipbook.prototype._getTexture = function(pageNumber) {
    if (pageNumber < 1 || pageNumber > this.pageCount) return this.placeholderTexture;
    var record = this.textureCache.get(pageNumber);
    if (!record) {
      this._ensurePage(pageNumber);
      return this.placeholderTexture;
    }
    record.lastUsed = performance.now();
    return record.texture || this.placeholderTexture;
  };

  WebGLFlipbook.prototype._scheduleNearbyTextures = function() {
    if (this.destroyed) return;
    var self = this;
    var schedule = global.requestIdleCallback || function(callback) {
      return global.setTimeout(callback, 80);
    };
    schedule(function() {
      if (self.destroyed) return;
      var keepPages = self._getTextureKeepSet();
      keepPages.forEach(function(pageNumber) {
        self._ensurePage(pageNumber);
      });
      self._pruneTextures(keepPages);
    });
  };

  WebGLFlipbook.prototype._getTextureKeepSet = function() {
    var view = this.getView();
    var center = view[0] || view[1] || this.currentPage;
    var keepPages = new Set();
    var pageNumber;
    for (pageNumber = Math.max(1, center - 2); pageNumber <= Math.min(this.pageCount, center + 3); pageNumber += 1) {
      keepPages.add(pageNumber);
    }
    if (this.turn) {
      this.turn.fromView.concat(this.turn.toView).forEach(function(turnPage) {
        if (turnPage > 0) keepPages.add(turnPage);
      });
    }
    return keepPages;
  };

  WebGLFlipbook.prototype._pruneTextures = function(keepPages) {
    if (!this.gl || this.textureCache.size <= this.maxTextures) return;
    var removable = [];
    this.textureCache.forEach(function(record, pageNumber) {
      if (!keepPages.has(pageNumber) && record.loaded) removable.push([pageNumber, record]);
    });
    removable.sort(function(first, second) {
      return first[1].lastUsed - second[1].lastUsed;
    });
    while (this.textureCache.size > this.maxTextures && removable.length) {
      var item = removable.shift();
      if (item[1].texture) this.gl.deleteTexture(item[1].texture);
      this.textureCache.delete(item[0]);
    }
  };

  WebGLFlipbook.prototype.getView = function(page) {
    var current = clamp(Number(page) || this.currentPage, 1, Math.max(1, this.pageCount));
    var view = current % 2 ? [current - 1, current] : [current, current + 1];
    return [
      view[0] >= 1 && view[0] <= this.pageCount ? view[0] : 0,
      view[1] >= 1 && view[1] <= this.pageCount ? view[1] : 0
    ];
  };

  WebGLFlipbook.prototype.getPage = function() {
    return this.currentPage;
  };

  WebGLFlipbook.prototype.getPageCount = function() {
    return this.pageCount;
  };

  WebGLFlipbook.prototype.canNext = function() {
    return this.getView().indexOf(this.pageCount) === -1;
  };

  WebGLFlipbook.prototype.canPrevious = function() {
    return this.getView().indexOf(1) === -1;
  };

  WebGLFlipbook.prototype._transitionForDirection = function(direction) {
    var fromView = this.getView();
    var targetPage;
    if (direction > 0) {
      if (!this.canNext()) return null;
      targetPage = Math.min(this.pageCount, (fromView[1] || fromView[0]) + 1);
    } else {
      if (!this.canPrevious()) return null;
      targetPage = Math.max(1, (fromView[0] || fromView[1]) - 1);
    }
    return {
      direction: direction,
      fromPage: this.currentPage,
      fromView: fromView,
      targetPage: targetPage,
      toView: this.getView(targetPage),
      progress: 0
    };
  };

  WebGLFlipbook.prototype.next = function() {
    return this._startAutomaticTurn(1);
  };

  WebGLFlipbook.prototype.previous = function() {
    return this._startAutomaticTurn(-1);
  };

  WebGLFlipbook.prototype._startAutomaticTurn = function(direction) {
    if (this.destroyed || this.animation || this.drag) return false;
    var transition = this._transitionForDirection(direction);
    if (!transition) return false;
    this.turn = transition;
    this._prepareTransitionTextures(transition);
    this._notifyStateChange(true);
    this._animateTurn(1);
    return true;
  };

  WebGLFlipbook.prototype._prepareTransitionTextures = function(transition) {
    var required = transition.fromView.concat(transition.toView).filter(function(pageNumber) {
      return pageNumber > 0;
    });
    required.forEach(function(pageNumber) {
      this._ensurePage(pageNumber);
    }, this);
  };

  WebGLFlipbook.prototype._animateTurn = function(targetProgress) {
    var self = this;
    var startProgress = this.turn ? this.turn.progress : 0;
    var distance = Math.abs(targetProgress - startProgress);
    var duration = this.reducedMotion ? 1 : Math.max(120, this.duration * distance);
    var startedAt = performance.now();
    this.animation = { target: targetProgress };

    function frame(timestamp) {
      if (self.destroyed || !self.turn) return;
      var elapsed = clamp((timestamp - startedAt) / duration, 0, 1);
      var eased = smootherStep(elapsed);
      self.turn.progress = startProgress + (targetProgress - startProgress) * eased;
      self.render();
      if (elapsed < 1) {
        self.animationFrame = global.requestAnimationFrame(frame);
      } else {
        self.animation = null;
        self.animationFrame = null;
        self._finishTurn(targetProgress === 1);
      }
    }

    this.animationFrame = global.requestAnimationFrame(frame);
  };

  WebGLFlipbook.prototype._finishTurn = function(completed) {
    if (!this.turn) return;
    if (completed) this.currentPage = this.turn.targetPage;
    this.turn = null;
    this.drag = null;
    this.container.classList.remove('is-dragging');
    this._notifyStateChange(false);
    this.render();
    if (completed) {
      this._notifyPageChange();
      this._scheduleNearbyTextures();
    }
  };

  WebGLFlipbook.prototype.goToPage = function(pageNumber) {
    if (this.destroyed || this.animation || this.drag || this.pageCount === 0) return false;
    var target = clamp(Math.round(Number(pageNumber) || this.currentPage), 1, this.pageCount);
    if (target === this.currentPage) return true;
    this.currentPage = target;
    this.turn = null;
    this._ensureVisibleTextures();
    this.render();
    this._notifyPageChange();
    this._scheduleNearbyTextures();
    return true;
  };

  WebGLFlipbook.prototype._ensureVisibleTextures = function() {
    this.getView().forEach(function(pageNumber) {
      if (pageNumber) this._ensurePage(pageNumber);
    }, this);
  };

  WebGLFlipbook.prototype._bindEvents = function() {
    this._boundPointerDown = this._handlePointerDown.bind(this);
    this._boundPointerMove = this._handlePointerMove.bind(this);
    this._boundPointerUp = this._handlePointerUp.bind(this);
    this._boundContextLost = this._handleContextLost.bind(this);
    this.canvas.addEventListener('pointerdown', this._boundPointerDown);
    this.canvas.addEventListener('pointermove', this._boundPointerMove);
    this.canvas.addEventListener('pointerup', this._boundPointerUp);
    this.canvas.addEventListener('pointercancel', this._boundPointerUp);
    this.canvas.addEventListener('webglcontextlost', this._boundContextLost);
  };

  WebGLFlipbook.prototype._handlePointerDown = function(event) {
    if (this.destroyed || this.animation || this.drag || event.button > 0) return;
    var rect = this.canvas.getBoundingClientRect();
    if (!rect.width) return;
    var direction = event.clientX >= rect.left + rect.width / 2 ? 1 : -1;
    var transition = this._transitionForDirection(direction);
    if (!transition) return;
    event.preventDefault();
    this.turn = transition;
    this.drag = {
      pointerId: event.pointerId,
      direction: direction,
      startX: event.clientX,
      lastX: event.clientX,
      lastTime: performance.now(),
      velocity: 0,
      width: Math.max(1, rect.width / 2)
    };
    this._prepareTransitionTextures(transition);
    this.canvas.setPointerCapture(event.pointerId);
    this.container.classList.add('is-dragging');
    this._notifyStateChange(true);
  };

  WebGLFlipbook.prototype._handlePointerMove = function(event) {
    if (!this.drag || !this.turn || event.pointerId !== this.drag.pointerId) return;
    event.preventDefault();
    var now = performance.now();
    var elapsed = Math.max(1, now - this.drag.lastTime);
    var delta = event.clientX - this.drag.lastX;
    this.drag.velocity = delta / elapsed;
    this.drag.lastX = event.clientX;
    this.drag.lastTime = now;
    var distance = this.drag.direction > 0
      ? this.drag.startX - event.clientX
      : event.clientX - this.drag.startX;
    this.turn.progress = clamp(distance / this.drag.width, 0, 1);
    this.render();
  };

  WebGLFlipbook.prototype._handlePointerUp = function(event) {
    if (!this.drag || !this.turn || event.pointerId !== this.drag.pointerId) return;
    event.preventDefault();
    var forwardVelocity = this.drag.direction > 0 ? -this.drag.velocity : this.drag.velocity;
    var complete = this.turn.progress >= 0.3 || forwardVelocity > 0.45;
    if (this.canvas.hasPointerCapture(event.pointerId)) this.canvas.releasePointerCapture(event.pointerId);
    this.drag = null;
    this.container.classList.remove('is-dragging');
    this._animateTurn(complete ? 1 : 0);
  };

  WebGLFlipbook.prototype._handleContextLost = function(event) {
    event.preventDefault();
    this.contextLost = true;
    this.container.classList.add('is-webgl-fallback');
    this._updateFallback();
    this._notifyError(new Error('WebGL context was lost; the static fallback is active.'));
  };

  WebGLFlipbook.prototype.resize = function() {
    if (this.destroyed) return;
    var width = Math.max(1, Math.round(this.container.clientWidth));
    var height = Math.max(1, Math.round(this.container.clientHeight));
    if (!this.gl) {
      this._updateFallback();
      return;
    }
    var pixelRatioCap = this.mobileQuery.matches ? 1.25 : 1.5;
    var pixelRatio = Math.min(global.devicePixelRatio || 1, pixelRatioCap);
    var renderWidth = Math.max(1, Math.round(width * pixelRatio));
    var renderHeight = Math.max(1, Math.round(height * pixelRatio));
    if (this.canvas.width !== renderWidth || this.canvas.height !== renderHeight) {
      this.canvas.width = renderWidth;
      this.canvas.height = renderHeight;
      this.gl.viewport(0, 0, renderWidth, renderHeight);
    }
    this.render();
  };

  WebGLFlipbook.prototype.requestRender = function() {
    if (this.destroyed || this.renderQueued) return;
    var self = this;
    this.renderQueued = true;
    global.requestAnimationFrame(function() {
      self.renderQueued = false;
      self.render();
    });
  };

  WebGLFlipbook.prototype.render = function() {
    if (this.destroyed) return;
    if (!this.gl || this.contextLost) {
      this._updateFallback();
      return;
    }
    var gl = this.gl;
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.useProgram(this.program);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexBuffer);
    gl.enableVertexAttribArray(this.locations.position);
    gl.vertexAttribPointer(this.locations.position, 2, gl.FLOAT, false, 0, 0);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.indexBuffer);

    if (this.turn) this._renderTransition(this.turn);
    else this._renderSpread(this.getView());
  };

  WebGLFlipbook.prototype._renderSpread = function(view) {
    this._renderStacks(view);
    if (view[0]) this._drawPage(view[0], -1, 0, 0, 0, 1, 0.18);
    if (view[1]) this._drawPage(view[1], 1, 0, 0, 0, 1, 0.18);
  };

  WebGLFlipbook.prototype._renderTransition = function(transition) {
    var direction = transition.direction;
    var staticLeft = direction > 0 ? transition.fromView[0] : transition.toView[0];
    var staticRight = direction > 0 ? transition.toView[1] : transition.fromView[1];
    var frontPage = direction > 0 ? transition.fromView[1] : transition.fromView[0];
    var backPage = direction > 0 ? transition.toView[0] : transition.toView[1];
    this._renderStacks(transition.toView);
    if (staticLeft) this._drawPage(staticLeft, -1, 0, 0, 0, 1, 0.18);
    if (staticRight) this._drawPage(staticRight, 1, 0, 0, 0, 1, 0.18);

    var progress = clamp(transition.progress, 0, 1);
    var shadowOffset = this._pixelOffset(direction * 5, 5);
    this._drawTexture(this.shadowTexture, direction, progress, direction < 0 ? 1 : 0, shadowOffset.x, shadowOffset.y, 1, 0, 0.55, 1.15);

    var frontMirror = direction > 0 ? 0 : 1;
    var backMirror = direction > 0 ? 1 : 0;
    if (frontPage) {
      this._drawTurningPage(
        this._getTexture(frontPage),
        backPage ? this._getTexture(backPage) : this.placeholderTexture,
        direction,
        progress,
        frontMirror,
        backMirror
      );
    }
  };

  WebGLFlipbook.prototype._renderStacks = function(view) {
    var leftPage = view[0];
    var rightPage = view[1];
    var leftLayers = leftPage ? Math.min(4, Math.ceil((leftPage - 1) / 6)) : 0;
    var rightBase = rightPage || leftPage || 1;
    var rightLayers = rightPage ? Math.min(4, Math.ceil((this.pageCount - rightBase) / 6)) : 0;
    var layer;
    var offset;

    for (layer = leftLayers; layer >= 1; layer -= 1) {
      offset = this._pixelOffset(-layer, layer);
      this._drawTexture(this.edgeTexture, -1, 0, 1, offset.x, offset.y, 0.93 - layer * 0.025, 0, 1, 0);
    }
    for (layer = rightLayers; layer >= 1; layer -= 1) {
      offset = this._pixelOffset(layer, layer);
      this._drawTexture(this.edgeTexture, 1, 0, 0, offset.x, offset.y, 0.93 - layer * 0.025, 0, 1, 0);
    }
  };

  WebGLFlipbook.prototype._pixelOffset = function(x, y) {
    var ratioX = this.canvas.width ? 2 / this.canvas.width : 0;
    var ratioY = this.canvas.height ? 2 / this.canvas.height : 0;
    var pixelRatio = Math.min(global.devicePixelRatio || 1, this.mobileQuery.matches ? 1.25 : 1.5);
    return { x: x * pixelRatio * ratioX, y: -y * pixelRatio * ratioY };
  };

  WebGLFlipbook.prototype._drawPage = function(pageNumber, side, offsetX, offsetY, progress, faceLight, spineShadow) {
    this._drawTexture(this._getTexture(pageNumber), side, progress, side < 0 ? 1 : 0, offsetX, offsetY, faceLight, spineShadow, 1, progress ? 1.15 : 0);
  };

  WebGLFlipbook.prototype._drawTexture = function(texture, direction, progress, mirror, offsetX, offsetY, faceLight, spineShadow, opacity, curl) {
    var gl = this.gl;
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, texture || this.placeholderTexture);
    gl.uniform1i(this.locations.texture, 0);
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, texture || this.placeholderTexture);
    gl.uniform1i(this.locations.backTexture, 1);
    gl.uniform1f(this.locations.hasBack, 0);
    gl.uniform1f(this.locations.progress, progress);
    gl.uniform1f(this.locations.direction, direction);
    gl.uniform1f(this.locations.curl, curl || 0);
    gl.uniform1f(this.locations.mirror, mirror);
    gl.uniform1f(this.locations.backMirror, mirror);
    gl.uniform2f(this.locations.offset, offsetX || 0, offsetY || 0);
    gl.uniform1f(this.locations.faceLight, faceLight == null ? 1 : faceLight);
    gl.uniform1f(this.locations.spineShadow, spineShadow || 0);
    gl.uniform1f(this.locations.opacity, opacity == null ? 1 : opacity);
    gl.drawElements(gl.TRIANGLES, this.indexCount, gl.UNSIGNED_SHORT, 0);
  };

  WebGLFlipbook.prototype._drawTurningPage = function(frontTexture, backTexture, direction, progress, frontMirror, backMirror) {
    var gl = this.gl;
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, frontTexture || this.placeholderTexture);
    gl.uniform1i(this.locations.texture, 0);
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, backTexture || this.placeholderTexture);
    gl.uniform1i(this.locations.backTexture, 1);
    gl.uniform1f(this.locations.hasBack, 1);
    gl.uniform1f(this.locations.progress, progress);
    gl.uniform1f(this.locations.direction, direction);
    gl.uniform1f(this.locations.curl, 1.15);
    gl.uniform1f(this.locations.mirror, frontMirror);
    gl.uniform1f(this.locations.backMirror, backMirror);
    gl.uniform2f(this.locations.offset, 0, 0);
    gl.uniform1f(this.locations.faceLight, 1);
    gl.uniform1f(this.locations.spineShadow, 0.12);
    gl.uniform1f(this.locations.opacity, 1);
    gl.drawElements(gl.TRIANGLES, this.indexCount, gl.UNSIGNED_SHORT, 0);
  };

  WebGLFlipbook.prototype._updateFallback = function() {
    var view = this.getView();
    this._setFallbackPage(this.fallbackLeft, view[0]);
    this._setFallbackPage(this.fallbackRight, view[1]);
  };

  WebGLFlipbook.prototype._setFallbackPage = function(image, pageNumber) {
    if (!pageNumber || !this.pages[pageNumber - 1]) {
      image.classList.add('is-empty');
      image.removeAttribute('src');
      return;
    }
    var pageData = this.pages[pageNumber - 1];
    image.classList.remove('is-empty');
    image.alt = pageData.alt || ('Trang ' + pageNumber);
    image.src = this.mobileQuery.matches && pageData.srcMobile ? pageData.srcMobile : pageData.src;
  };

  WebGLFlipbook.prototype._notifyLoadProgress = function(progress) {
    if (typeof this.options.onLoadProgress === 'function') this.options.onLoadProgress(clamp(progress, 0, 1));
  };

  WebGLFlipbook.prototype._notifyPageChange = function() {
    if (typeof this.options.onPageChange === 'function') this.options.onPageChange(this.currentPage, this.getView());
  };

  WebGLFlipbook.prototype._notifyStateChange = function(isTurning) {
    if (typeof this.options.onStateChange === 'function') this.options.onStateChange(Boolean(isTurning));
  };

  WebGLFlipbook.prototype._notifyError = function(error) {
    if (typeof this.options.onError === 'function') this.options.onError(error);
    else if (global.console && console.warn) console.warn('Magazine WebGL Flipbook:', error);
  };

  WebGLFlipbook.prototype.destroy = function() {
    if (this.destroyed) return;
    this.destroyed = true;
    if (this.animationFrame) global.cancelAnimationFrame(this.animationFrame);
    this.canvas.removeEventListener('pointerdown', this._boundPointerDown);
    this.canvas.removeEventListener('pointermove', this._boundPointerMove);
    this.canvas.removeEventListener('pointerup', this._boundPointerUp);
    this.canvas.removeEventListener('pointercancel', this._boundPointerUp);
    this.canvas.removeEventListener('webglcontextlost', this._boundContextLost);
    if (this.gl) {
      var gl = this.gl;
      this.textureCache.forEach(function(record) {
        if (record.texture) gl.deleteTexture(record.texture);
      });
      if (this.placeholderTexture) gl.deleteTexture(this.placeholderTexture);
      if (this.edgeTexture) gl.deleteTexture(this.edgeTexture);
      if (this.shadowTexture) gl.deleteTexture(this.shadowTexture);
      if (this.vertexBuffer) gl.deleteBuffer(this.vertexBuffer);
      if (this.indexBuffer) gl.deleteBuffer(this.indexBuffer);
      if (this.program) gl.deleteProgram(this.program);
    }
    this.textureCache.clear();
    this.container.innerHTML = '';
  };

  global.HeliosWebGLFlipbook = WebGLFlipbook;
})(window);
