/* ============================================================
   Chloe Cheuk — portfolio
   Shape geometry, the desktop home collage and the contact
   tessellation all come straight from the Figma file.
   ============================================================ */
(function () {
  'use strict';
  document.documentElement.classList.add('js');

  /* ---------- geometry lifted from the Figma vector data ---------- */

  // 20-point starburst = four overlapping 5-point stars (599 x 599)
  var STAR = [
    'M299.46 0 L366.72 206.95 L584.35 206.95 L408.28 334.85 L475.53 541.8 ' +
    'L299.46 413.9 L123.39 541.8 L190.64 334.85 L14.57 206.95 L232.21 206.95 Z',
    'M475.25 57 L408.24 264.02 L584.46 391.72 L366.82 391.97 L299.81 599 ' +
    'L232.32 392.13 L14.68 392.38 L190.6 264.28 L123.11 57.4 L299.33 185.1 Z',
    'M394.59 15.5 L392.63 233.09 L599 302.2 L391.42 367.57 L389.46 585.16 ' +
    'L263.13 407.98 L55.55 473.35 L185.05 298.47 L58.72 121.28 L265.09 190.39 Z',
    'M545.97 129.34 L413.85 302.25 L537.5 481.32 L332.19 409.12 L200.07 582.03 ' +
    'L205.31 364.5 L0 292.29 L208.54 230.05 L213.78 12.51 L337.43 191.58 Z'
  ].join(' ');

  // Figma regular polygon, count = 3, inscribed in a 541 x 541 box
  var TRIANGLE = 'M270.5 0 L504.76 405.75 L36.24 405.75 Z';

  /* Each shape keeps its own colour, always. */
  var SHAPES = {
    star:     { size: 599, body: '<path d="' + STAR + '" fill="#BF7AB8" fill-rule="nonzero"/>' },
    circle:   { size: 599, body: '<circle cx="299.5" cy="299.5" r="299.5" fill="#7AB6BF"/>' },
    triangle: { size: 541, body: '<path d="' + TRIANGLE + '" fill="#BF947A"/>' }
  };

  var MOBILE_BREAK = 1024;   /* tablets get the phone composition too */
  function isMobile() { return window.innerWidth <= MOBILE_BREAK; }

  /* --u is a calc() expression, so its computed style is an unresolved
     token stream — measure it off a probe element instead. */
  var probeEl = null;
  function unit() {
    if (!probeEl) {
      probeEl = document.createElement('div');
      probeEl.setAttribute('aria-hidden', 'true');
      probeEl.style.cssText = 'position:absolute;left:-9999px;top:0;height:0;' +
                              'pointer-events:none;visibility:hidden;' +
                              'width:calc(1000 * var(--u))';
    }
    if (!probeEl.parentNode) document.body.appendChild(probeEl);
    var w = probeEl.getBoundingClientRect().width / 1000;
    return w > 0 ? w : 1;
  }

  /* ============================================================
     The desktop home collage — the exact Figma placements.
     (Box origins; converted to centres below.)
     ============================================================ */
  var HOME_FIGMA = [
    { s: 'star',     x: -234, y:  630 },
    { s: 'star',     x:  942, y:  168 },
    { s: 'star',     x:  302, y: -276 },
    { s: 'circle',   x:  389, y:  867 },
    { s: 'circle',   x:  942, y: -452 },
    { s: 'circle',   x: -338, y:  -41 },
    { s: 'triangle', x:  713, y:  103, rot: 48.63 }
  ].map(function (o) {
    /* Figma rotates a node about its top-left corner, so the true centre
       is the box centre pushed through that same rotation. */
    var S = SHAPES[o.s].size, h = S / 2;
    var th = (o.rot || 0) * Math.PI / 180;
    var c = Math.cos(th), sn = Math.sin(th);
    return {
      s: o.s,
      cx: o.x + h * c - h * sn,
      cy: o.y + h * sn + h * c,
      size: S,
      rot: o.rot || 0
    };
  });

  /* The phone home screen, laid out from the mockup: six large shapes,
     each running off one edge, around the two tilted plates. */
  var HOME_MOBILE = [
    { s: 'star',     cx:  53, cy:  62, size: 218 },
    { s: 'circle',   cx: 375, cy:   5, size: 190 },
    { s: 'star',     cx: 335, cy: 388, size: 205 },
    { s: 'triangle', cx: -10, cy: 575, size: 186 },
    { s: 'circle',   cx:  28, cy: 790, size: 195 },
    { s: 'star',     cx: 364, cy: 800, size: 186 }
  ].map(function (o) { o.rot = 0; return o; });

  /* The contact tessellation — Figma box origins as centres (541 box) */
  var CONTACT_FIGMA = [
    [1032.5, 508.5,   0], [1571.5, 511.5,   0], [228.5, 989.5,   0],
    [ 767.5, 994.5,   0], [1303.5, 977.5,   0],
    [1302.5, 359.5, 180], [ 761.5, 359.5, 180], [ -30.5, 824.5, 180],
    [ 500.5, 824.5, 180], [1032.5, 824.5, 180], [1574.5, 819.5, 180]
  ].map(function (t) {
    return { s: 'triangle', cx: t[0], cy: t[1], size: 541, rot: t[2] };
  });

  /* ---------- deterministic RNG, so a repaint is stable ---------- */
  function mulberry32(a) {
    return function () {
      a |= 0; a = a + 0x6D2B79F5 | 0;
      var t = Math.imul(a ^ a >>> 15, 1 | a);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }

  /* ============================================================
     Scatter — fills W x H (design units) with shapes such that
       - no two shapes overlap
       - two of the same kind are never neighbours (when mixed)
       - nothing intrudes on a keep-out rectangle
     ============================================================ */
  function scatter(W, H, o) {
    var types  = o.types || ['star', 'circle', 'triangle'];
    var scale  = o.scale || 1;
    var gap    = o.gap != null ? o.gap : 34 * scale;
    var keepOut = o.keepOut || [];
    var rand   = mulberry32(o.seed || 7);

    var big  = 599 * scale;
    /* Cell = one shape plus its gap, so centres land on an even lattice;
       `jitter` then nudges each one off the lattice by a fraction of a
       cell — enough to look hand-placed, little enough to stay evenly
       spaced. jitter 1 = the old fully-random placement. */
    var cell = o.cell || (big + gap);
    var jitter = o.jitter != null ? o.jitter : 1;
    var bleed = o.bleed != null ? o.bleed : (cell / 2 + big * 0.25);
    /* only meaningful when more than one kind is in play */
    var sameMin = types.length > 1 ? (o.sameMin || big * 1.48) : 0;

    var placed = [], order = 0;
    function radius(t) { return SHAPES[t].size / 2 * scale; }

    /* distance from a circle to a rotated rectangle */
    function clearsKeepOut(cx, cy, r) {
      for (var i = 0; i < keepOut.length; i++) {
        var k = keepOut[i];
        var th = (k.rot || 0) * Math.PI / 180;
        var c = Math.cos(th), s = Math.sin(th);
        var dx = cx - k.x, dy = cy - k.y;
        var lx =  dx * c + dy * s;          /* into the rect's own frame */
        var ly = -dx * s + dy * c;
        var qx = Math.max(0, Math.min(k.w, lx));
        var qy = Math.max(0, Math.min(k.h, ly));
        var ex = lx - qx, ey = ly - qy;
        if (Math.sqrt(ex * ex + ey * ey) < r + (k.pad || 0)) return false;
      }
      return true;
    }

    function fits(t, cx, cy) {
      var r = radius(t);
      if (!clearsKeepOut(cx, cy, r)) return false;
      for (var i = 0; i < placed.length; i++) {
        var p = placed[i];
        var d = Math.sqrt((cx - p.cx) * (cx - p.cx) + (cy - p.cy) * (cy - p.cy));
        if (d < r + radius(p.s) + gap) return false;      /* would overlap */
        if (sameMin && p.s === t && d < sameMin) return false;
      }
      return true;
    }

    function tryAt(cx, cy) {
      var start = order % types.length;
      for (var k = 0; k < types.length; k++) {
        var t = types[(start + k) % types.length];
        if (fits(t, cx, cy)) {
          placed.push({
            s: t, cx: cx, cy: cy,
            size: SHAPES[t].size * scale,
            rot: t === 'triangle' ? (order % 2 ? 180 : 0) : 0
          });
          order++;
          return true;
        }
      }
      return false;
    }

    /* Pass 1 — an even hexagonal lattice: every other row is offset half
       a cell, which spreads shapes far more evenly than a plain grid. */
    var rowH = cell * 0.866, row = 0;
    for (var gy = -bleed; gy < H + bleed; gy += rowH, row++) {
      var stagger = (row % 2) ? cell / 2 : 0;
      for (var gx = -bleed - stagger; gx < W + bleed; gx += cell) {
        tryAt(gx + cell / 2 + (rand() - 0.5) * cell * jitter,
              gy + cell / 2 + (rand() - 0.5) * cell * jitter);
      }
    }

    /* Pass 2 — sweep a finer grid and drop a shape into any hole the
       lattice left (next to the plates, say). The spacing tests still
       apply, so anything added is still a full gap from its neighbours;
       this only removes empty patches, it never crowds them. */
    var fine = cell / 2;
    for (var fy = -bleed; fy < H + bleed; fy += fine) {
      for (var fx = -bleed; fx < W + bleed; fx += fine) {
        tryAt(fx + fine / 2, fy + fine / 2);
      }
    }
    return placed;
  }

  /* ============================================================
     Interlocking up/down triangle bands, filling yTop..yBottom.
     One band = a row of upright triangles interlocking with a row
     of inverted ones — the same pattern as the desktop contact page.
     ============================================================ */
  function triangleBands(W, yTop, yBottom, S) {
    var items = [], bandH = 0.75 * S, gutter = 0.14 * S, guard = 0;
    for (var y = yTop; y < yBottom && guard < 60; y += bandH + gutter, guard++) {
      for (var x = -S; x < W + S; x += S) {
        items.push({ s: 'triangle', cx: x + S / 2, cy: y + S / 2, size: S, rot: 0 });
      }
      for (var x2 = -S / 2; x2 < W + S; x2 += S) {
        items.push({ s: 'triangle', cx: x2 + S / 2, cy: y - 0.25 * S + S / 2, size: S, rot: 180 });
      }
    }
    return items;
  }

  /* ---------- render ---------- */
  function svgFor(it, i) {
    var base = SHAPES[it.s].size;
    var x0 = it.cx - it.size / 2;
    var y0 = it.cy - it.size / 2;
    return '<svg viewBox="0 0 ' + base + ' ' + base + '" aria-hidden="true" focusable="false" ' +
           'data-shape="' + it.s + '" ' +
           'style="left:0;top:0;' +
           'width:calc(' + it.size.toFixed(2) + ' * var(--u));' +
           'height:calc(' + it.size.toFixed(2) + ' * var(--u));' +
           'transform-origin:50% 50%;' +
           '--place:translate(calc(' + x0.toFixed(2) + ' * var(--u)), calc(' +
              y0.toFixed(2) + ' * var(--u))) rotate(' + it.rot + 'deg);' +
           '--d:' + Math.min(i * 0.055, 0.6).toFixed(3) + 's">' +
           SHAPES[it.s].body + '</svg>';
  }

  function applyPlacement(layer) {
    Array.prototype.forEach.call(layer.querySelectorAll('svg'), function (el) {
      el.style.transform = (el.style.getPropertyValue('--place') || '').trim();
    });
  }

  /* Closest point on a rotated rectangle to a point, in world space. */
  function closestOnRect(k, px, py) {
    var th = (k.rot || 0) * Math.PI / 180;
    var c = Math.cos(th), sn = Math.sin(th);
    var dx = px - k.x, dy = py - k.y;
    var lx =  dx * c + dy * sn;
    var ly = -dx * sn + dy * c;
    var qx = Math.max(0, Math.min(k.w, lx));
    var qy = Math.max(0, Math.min(k.h, ly));
    return { x: k.x + qx * c - qy * sn, y: k.y + qx * sn + qy * c };
  }

  /* Push each shape straight away from any keep-out rectangle it sits too
     close to, until it clears by `minClear`. Used to give the name and
     nav plates room to breathe without disturbing the composition. */
  function repel(items, keepOut, minClear) {
    return items.map(function (it) {
      var cx = it.cx, cy = it.cy, r = it.size / 2;
      for (var pass = 0; pass < 2; pass++) {
        for (var i = 0; i < keepOut.length; i++) {
          var q = closestOnRect(keepOut[i], cx, cy);
          var vx = cx - q.x, vy = cy - q.y;
          var d = Math.sqrt(vx * vx + vy * vy);
          var want = r + minClear;
          if (d < want) {
            if (d < 0.001) { vx = 0; vy = -1; d = 1; }   /* centre inside: push up */
            cx = q.x + vx / d * want;
            cy = q.y + vy / d * want;
          }
        }
      }
      return { s: it.s, cx: cx, cy: cy, size: it.size, rot: it.rot };
    });
  }

  /* The plates' true resting rectangles.
     Read from the layout box plus the computed `transform` — NOT from
     getBoundingClientRect, which would include the intro animation's
     `translate` offset while the plate is still flying in, and would
     only give an axis-aligned box for a rotated plate. */
  function plateRects(host, u, sels) {
    var hostBox = host.getBoundingClientRect();
    return sels.map(function (sel) {
      var el = document.querySelector(sel);
      if (!el) return null;
      /* the plate sits inside the centred stage, so shift its box into the
         vector layer's own coordinate space before comparing */
      var parentBox = (el.offsetParent || host).getBoundingClientRect();
      var m = new DOMMatrix(getComputedStyle(el).transform);
      return {
        x: (parentBox.left - hostBox.left + el.offsetLeft + m.e) / u,
        y: (parentBox.top  - hostBox.top  + el.offsetTop  + m.f) / u,
        w: el.offsetWidth / u,
        h: el.offsetHeight / u,
        rot: Math.atan2(m.b, m.a) * 180 / Math.PI
      };
    }).filter(Boolean);
  }

  /* Repel can nudge two shapes together; push any such pair apart again. */
  function separate(items, gap) {
    for (var pass = 0; pass < 6; pass++) {
      var moved = false;
      for (var i = 0; i < items.length; i++) {
        for (var j = i + 1; j < items.length; j++) {
          var a = items[i], b = items[j];
          var vx = b.cx - a.cx, vy = b.cy - a.cy;
          var d = Math.sqrt(vx * vx + vy * vy) || 0.001;
          var want = a.size / 2 + b.size / 2 + gap;
          if (d < want) {
            var push = (want - d) / 2;
            vx /= d; vy /= d;
            a.cx -= vx * push; a.cy -= vy * push;
            b.cx += vx * push; b.cy += vy * push;
            moved = true;
          }
        }
      }
      if (!moved) break;
    }
    return items;
  }

  /* Give the plates room *and* keep the shapes off each other. The two
     rules pull against one another, so alternate them until they settle
     rather than applying each once. */
  function space(items, rects, minClear, shapeGap) {
    for (var i = 0; i < 10; i++) {
      items = repel(items, rects, minClear);
      items = separate(items, shapeGap);
    }
    /* a last repel so the plates definitely win the final say */
    return repel(items, rects, minClear);
  }

  /* Find the most open point in the layer — the spot furthest from every
     already-placed shape and from the plates. Used to drop the triangle
     into whatever white space the rest of the composition leaves. */
  function emptiestPoint(items, rects, W, H, inset) {
    /* Search only inside the visible frame — off-screen corners are
       trivially "empty" and would just banish the shape out of sight.
       Clamp the inset to half the frame first: a frame smaller than two
       insets (a pane mid-resize, or a layer with no layout yet at first
       paint) would otherwise leave an empty search box and return null. */
    var best = null, step = 12;
    var ix = Math.min(inset, W / 2), iy = Math.min(inset, H / 2);
    for (var x = ix; x <= W - ix; x += step) {
      for (var y = iy; y <= H - iy; y += step) {
        var m = Infinity, i;
        for (i = 0; i < items.length; i++) {
          var dx = x - items[i].cx, dy = y - items[i].cy;
          m = Math.min(m, Math.sqrt(dx * dx + dy * dy) - items[i].size / 2);
        }
        for (i = 0; i < rects.length; i++) {
          var q = closestOnRect(rects[i], x, y);
          m = Math.min(m, Math.sqrt((x - q.x) * (x - q.x) + (y - q.y) * (y - q.y)));
        }
        if (!best || m > best.m) best = { x: x, y: y, m: m };
      }
    }
    /* the centre is the honest fallback if the frame is degenerate */
    return best || { x: W / 2, y: H / 2, m: 0 };
  }

  function paintVectors(page) {
    var layer = document.querySelector('.vectors');
    if (!layer) return;
    layer.innerHTML = '';

    /* the about page carries a single starburst pinned to the photo,
       which lives in the markup — nothing to generate here */
    if (page === 'about') return;

    var u = unit();
    var host = layer.parentNode;
    var mob = isMobile();
    var W = host.clientWidth / u;
    var H = Math.max(host.scrollHeight, window.innerHeight) / u;
    var items;

    if (page === 'home') {
      var rects = plateRects(host, u, ['.home-name-plate', '.home-nav-plate']);

      if (mob) {
        /* the mockup composition, centred in the 390 x 806 frame */
        var mX = (W - 390) / 2, mY = (H - 806) / 2;
        var rest = HOME_MOBILE.filter(function (it) { return it.s !== 'triangle'; })
          .map(function (it) {
            return { s: it.s, cx: it.cx + mX, cy: it.cy + mY, size: it.size, rot: it.rot };
          });
        rest = space(rest, rects, 30, 16);

        /* drop the triangle into the largest remaining gap on screen */
        var triSrc = HOME_MOBILE.filter(function (it) { return it.s === 'triangle'; })[0];
        if (triSrc) {
          var spot = emptiestPoint(rest, rects, W, H, triSrc.size * 0.18);
          rest.push({ s: 'triangle', cx: spot.x, cy: spot.y, size: triSrc.size, rot: triSrc.rot });
          rest = space(rest, rects, 30, 16);
        }
        items = rest;

      } else {
        /* the exact Figma composition, with the plates given extra room */
        var offX = (W - 1440) / 2, offY = (H - 1060) / 2;
        items = HOME_FIGMA.map(function (it) {
          return { s: it.s, cx: it.cx + offX, cy: it.cy + offY, size: it.size, rot: it.rot };
        });
        items = space(items, rects, 130, 24);
      }

    } else if (page === 'contact') {
      if (mob) {
        /* fill everything below the copy, leaving a clear gap under it */
        var box = host.getBoundingClientRect();
        var last = document.querySelector('.contact-list');
        var textBottom = last
          ? (last.getBoundingClientRect().bottom - box.top) / u
          : 0;
        items = triangleBands(W, textBottom + 40, H, 118);
      } else {
        items = CONTACT_FIGMA;
      }

    } else {
      /* work — fewer, larger circles on an even lattice */
      items = scatter(W, H, {
        seed: 23, types: ['circle'],
        scale: mob ? 0.62 : 1.6,
        gap: mob ? 34 : 90,
        jitter: 0.18
      });
    }

    layer.innerHTML = items.map(svgFor).join('');
    applyPlacement(layer);
  }

  /* ---------- home intro ----------
     Desktop shapes fall from above; on a phone each slides in from the
     side it sits nearer to. The travel itself is CSS (see the keyframes),
     so all this does is tag the direction and start it. */
  function runIntro() {
    var home = document.querySelector('.home');
    if (!home) return;
    var layer = home.querySelector('.vectors');

    if (layer && isMobile()) {
      var mid = window.innerWidth / 2;
      Array.prototype.forEach.call(layer.querySelectorAll('svg'), function (el) {
        var r = el.getBoundingClientRect();
        el.setAttribute('data-from', (r.left + r.width / 2) < mid ? 'left' : 'right');
      });
    }

    var revealed = false;
    function reveal() {
      if (revealed) return;
      revealed = true;
      home.classList.add('is-ready');
      /* after it has played once, repaints must not replay it */
      setTimeout(function () { home.classList.add('intro-done'); }, 2600);
    }
    requestAnimationFrame(function () { requestAnimationFrame(reveal); });
    /* rAF is throttled while a tab is hidden — make sure the page still
       ends up in its resting state rather than stuck off-screen */
    setTimeout(reveal, 400);
  }

  /* ---------- cursor-following project caption ---------- */
  function initHoverTags() {
    var tiles = document.querySelectorAll('.tile[data-project]');
    if (!tiles.length || !window.matchMedia('(hover:hover)').matches) return;

    var tag = document.createElement('div');
    tag.className = 'hover-tag';
    var inner = document.createElement('div');
    inner.className = 'hover-tag__inner';
    inner.setAttribute('role', 'status');
    tag.appendChild(inner);
    document.body.appendChild(tag);

    var x = 0, y = 0, raf = null;

    function place() {
      raf = null;
      var offset = 18 * unit();                       /* below-right of the pointer */
      var w = inner.offsetWidth, h = inner.offsetHeight;
      var left = x + offset, top = y + offset;
      if (left + w > window.innerWidth - 8) left = x - w - offset;   /* flip near the edge */
      if (top + h > window.innerHeight - 8) top = y - h - offset;
      tag.style.transform = 'translate3d(' + left + 'px,' + top + 'px,0)';
    }

    function onMove(e) {
      x = e.clientX; y = e.clientY;
      if (!raf) raf = requestAnimationFrame(place);
    }

    Array.prototype.forEach.call(tiles, function (tile) {
      tile.addEventListener('mouseenter', function (e) {
        inner.innerHTML = '<b>' + tile.dataset.project + '</b>' +
                          (tile.dataset.roles ? '<span> &mdash; ' + tile.dataset.roles + '</span>' : '');
        x = e.clientX; y = e.clientY;
        place();
        tag.classList.add('is-visible');
      });
      tile.addEventListener('mousemove', onMove);
      tile.addEventListener('mouseleave', function () {
        tag.classList.remove('is-visible');
      });
    });
  }

  /* ---------- boot ---------- */
  function init() {
    var page = document.body.dataset.page || 'home';
    paintVectors(page);
    initHoverTags();
    if (page === 'home') runIntro();

    function markReady() {
      var home = document.querySelector('.home');
      if (home) home.classList.add('is-ready');
    }

    /* The home screen has no images, so `load` fires almost immediately;
       repainting there would tear down the intro mid-flight. Only pages
       whose height depends on images need the second pass. */
    window.addEventListener('load', function () {
      if (page !== 'home') paintVectors(page);
      markReady();
    });

    var t = null;
    function onResize() {
      clearTimeout(t);
      t = setTimeout(function () { paintVectors(page); markReady(); }, 160);
    }
    if (window.ResizeObserver) new ResizeObserver(onResize).observe(document.documentElement);
    window.addEventListener('resize', onResize);
    window.addEventListener('orientationchange', onResize);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
