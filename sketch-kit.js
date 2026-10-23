// 슈니버시티 /zukan 그림체 세 판의 그리기 함수 — net-map.html(연필 원본)과 build-net-map-styles.mjs(격식체 두 판)에서 그대로 옮겼다.
//   var K = SketchKit('pencil' | 'textbook' | 'blueprint');
//   K.C = 그 판의 색, K.rng(씨앗) = 떨림 난수(격식체는 늘 0.5 → 떨림 0)
//   K.line / K.rect / K.hatch / K.curve / K.head / K.hArrow / K.dot — 원본과 같은 인자 순서(g, 좌표…, r, color, width, dash)
//   K.fresh(svg) 는 svg 를 비우고 새 <g> 를, K.rel(기준 요소) 은 요소 좌표를 기준 요소 안 좌표로 바꾸는 함수를 준다.
(function (root) {
  'use strict';
  var NS = 'http://www.w3.org/2000/svg';
  var PALETTE = {
    pencil: { ink: '#36332d', soft: '#5d584e', faint: '#8b8476', find: '#2f5d87', talk: '#b5523b', db: '#4f7d4a', marker: 'rgba(255, 214, 64, 0.55)' },
    textbook: { ink: '#1f2937', soft: '#4b5563', faint: '#a3aab5', find: '#1f5fae', talk: '#b8432f', db: '#2f7d4f', marker: 'rgba(31, 95, 174, 0.14)' },
    blueprint: { ink: '#16365c', soft: '#3d5878', faint: '#9db0c6', find: '#1d6fb8', talk: '#c23b2e', db: '#2b7a5a', marker: 'rgba(29, 111, 184, 0.13)' }
  };

  function SketchKit(style) {
    if (!PALETTE[style]) style = 'pencil';
    var C = PALETTE[style];
    var pencil = style === 'pencil';

    function el(parent, name, attrs) {
      var n = document.createElementNS(NS, name);
      Object.keys(attrs).forEach(function (a) { n.setAttribute(a, attrs[a]); });
      parent.appendChild(n);
      return n;
    }
    function path(parent, d, color, width, opacity, dash) {
      var a = { d: d, fill: 'none', stroke: color, 'stroke-width': width, 'stroke-linecap': 'round', 'stroke-linejoin': 'round', opacity: opacity };
      if (dash) a['stroke-dasharray'] = dash;
      return el(parent, 'path', a);
    }
    // 같은 자리에 다시 그려도 같은 떨림이 나오도록 씨앗 있는 난수(창 크기를 바꿀 때 선이 춤추지 않게).
    // 격식체는 늘 0.5 를 준다 — 모든 (r() - 0.5) 가 0 이 돼 선이 곧아진다.
    function rng(seed) {
      if (!pencil) return function () { return 0.5; };
      return function () {
        seed |= 0; seed = (seed + 0x6D2B79F5) | 0;
        var t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
      };
    }

    var line, rect, hatch, curve, head;
    var hatchId = 0;
    function clipped(g, x, y, w, h) {
      var id = 'hatch-' + style + '-' + (hatchId++);
      var clip = el(g, 'clipPath', { id: id });
      el(clip, 'rect', { x: x, y: y, width: Math.max(0, w), height: Math.max(0, h) });
      return el(g, 'g', { 'clip-path': 'url(#' + id + ')' });
    }

    if (pencil) {
      // 곧은 선 하나를 손으로 그은 것처럼 — 가운데가 살짝 휘고, 두 번 겹쳐 긋는다.
      line = function (g, x1, y1, x2, y2, r, color, width, dash) {
        color = color || C.ink; width = width || 1.4;
        var len = Math.hypot(x2 - x1, y2 - y1) || 1;
        var nx = -(y2 - y1) / len, ny = (x2 - x1) / len;
        for (var pass = 0; pass < 2; pass++) {
          var bend = (r() - 0.5) * Math.min(4, len * 0.03);
          var j = function () { return (r() - 0.5) * 1.4; };
          var mx = (x1 + x2) / 2 + nx * bend, my = (y1 + y2) / 2 + ny * bend;
          path(g, 'M' + (x1 + j()) + ' ' + (y1 + j()) + ' Q' + mx + ' ' + my + ' ' + (x2 + j()) + ' ' + (y2 + j()),
            color, pass ? width * 0.7 : width, pass ? 0.35 : 0.85, dash);
        }
      };
      // 모서리를 조금씩 넘겨 그은 네모
      rect = function (g, x, y, w, h, r, color, width, dash) {
        var o = 3;
        line(g, x - o, y, x + w + o, y + (r() - 0.5) * 2, r, color, width, dash);
        line(g, x + w, y - o, x + w + (r() - 0.5) * 2, y + h + o, r, color, width, dash);
        line(g, x + w + o, y + h, x - o, y + h + (r() - 0.5) * 2, r, color, width, dash);
        line(g, x, y + h + o, x + (r() - 0.5) * 2, y - o, r, color, width, dash);
      };
      // 빗금 — 연필로 슥슥 칠한 그림자. 긴 사선을 긋고 네모 밖은 잘라 낸다.
      hatch = function (g, x, y, w, h, r, gap, color, opacity) {
        var inner = clipped(g, x, y, w, h);
        for (var t = -h; t < w; t += gap) {
          path(inner, 'M' + (x + t + (r() - 0.5) * 2) + ' ' + (y + h) + ' L' + (x + t + h + (r() - 0.5) * 2) + ' ' + y, color || C.ink, 0.9, opacity || 0.16);
        }
      };
      // 굽은 선 — 같은 길을 살짝 어긋나게 한 번 더 긋는다.
      curve = function (g, d, r, color, width, dash) {
        path(g, d, color, width || 1.5, 0.88, dash);
        var again = el(g, 'g', { transform: 'translate(' + ((r() - 0.5) * 1.6) + ' ' + ((r() - 0.5) * 1.6) + ')' });
        path(again, d, color, (width || 1.5) * 0.7, 0.3, dash);
      };
      // 화살촉 두 획 — dir 1 = 오른쪽, -1 = 왼쪽
      head = function (g, x, y, dir, r, color, w) {
        line(g, x, y, x - dir * 9, y - 6, r, color, w);
        line(g, x, y, x - dir * 9, y + 6, r, color, w);
      };
    } else {
      var rx = style === 'textbook' ? 8 : 0;
      // 곧은 선 — 한 번만, 정확히
      line = function (g, x1, y1, x2, y2, r, color, width, dash) {
        path(g, 'M' + x1 + ' ' + y1 + ' L' + x2 + ' ' + y2, color || C.ink, width || 1.3, 1, dash);
      };
      // 네모 — 교과서는 모서리 8px(작은 네모는 줄인다), 도면은 각진 네모
      rect = function (g, x, y, w, h, r, color, width, dash) {
        var a = { x: x, y: y, width: Math.max(0, w), height: Math.max(0, h), rx: Math.min(rx, w / 4, h / 4), fill: 'none', stroke: color || C.ink, 'stroke-width': width || 1.3 };
        if (dash) a['stroke-dasharray'] = dash;
        el(g, 'rect', a);
      };
      hatch = style === 'textbook'
        // 교과서 — 빗금 대신 옅게 칠한다
        ? function (g, x, y, w, h, r, gap, color, opacity) {
          el(g, 'rect', { x: x, y: y, width: Math.max(0, w), height: Math.max(0, h), rx: Math.min(rx, w / 4, h / 4), fill: color || C.ink, opacity: (opacity || 0.16) * 0.7 });
        }
        // 도면 — 45도 가는 선
        : function (g, x, y, w, h, r, gap, color, opacity) {
          var inner = clipped(g, x, y, w, h);
          for (var t = -h; t < w; t += gap) path(inner, 'M' + (x + t) + ' ' + (y + h) + ' L' + (x + t + h) + ' ' + y, color || C.ink, 0.7, Math.min(0.9, (opacity || 0.16) * 2.2));
        };
      curve = function (g, d, r, color, width, dash) { path(g, d, color, width || 1.4, 1, dash); };
      head = style === 'textbook'
        // 채운 세모
        ? function (g, x, y, dir, r, color) {
          el(g, 'path', { d: 'M' + x + ' ' + y + ' L' + (x - dir * 10) + ' ' + (y - 4.5) + ' L' + (x - dir * 10) + ' ' + (y + 4.5) + ' Z', fill: color, stroke: 'none' });
        }
        // 열린 꺾쇠
        : function (g, x, y, dir, r, color, w) {
          path(g, 'M' + (x - dir * 11) + ' ' + (y - 4) + ' L' + x + ' ' + y + ' L' + (x - dir * 11) + ' ' + (y + 4), color, Math.max(1, w * 0.8), 1);
        };
    }

    function hArrow(g, x1, x2, y, r, color, w, both) {
      var dir = x2 > x1 ? 1 : -1, hw = Math.max(1.4, w * 0.8);
      line(g, x1, y, x2 - dir * 2, y + (r() - 0.5) * 1.5, r, color, w);
      head(g, x2, y, dir, r, color, hw);
      if (both) head(g, x1, y, -dir, r, color, hw);
    }
    function dot(g, x, y, rad, color) { el(g, 'circle', { cx: x, cy: y, r: rad, fill: color, opacity: 0.9 }); }
    function fresh(svg) {
      while (svg.firstChild) svg.removeChild(svg.firstChild);
      return el(svg, 'g', {});
    }
    function rel(baseEl) {
      var base = baseEl.getBoundingClientRect();
      return function (node) {
        var b = node.getBoundingClientRect(), x = b.left - base.left, y = b.top - base.top;
        return { x: x, y: y, w: b.width, h: b.height, cx: x + b.width / 2, cy: y + b.height / 2, b: y + b.height, rt: x + b.width };
      };
    }

    return { style: style, C: C, el: el, path: path, rng: rng, line: line, rect: rect, hatch: hatch, curve: curve, head: head, hArrow: hArrow, dot: dot, fresh: fresh, rel: rel };
  }

  SketchKit.PALETTE = PALETTE;
  root.SketchKit = SketchKit;
})(typeof window !== 'undefined' ? window : this);
