// The Indigo Republic — shared site behavior (vanilla JS, no framework)

document.addEventListener('DOMContentLoaded', function(){
  var yearEl = document.getElementById('year');
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  initNavToggle();
  initFooterGrain();
  initHoverPreview();
});

function initNavToggle(){
  var toggle = document.querySelector('.nav-toggle');
  if (!toggle) return;
  toggle.addEventListener('click', function(){
    document.body.classList.toggle('nav-open');
    var open = document.body.classList.contains('nav-open');
    toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
  });
  document.querySelectorAll('.nav-links a').forEach(function(a){
    a.addEventListener('click', function(){ document.body.classList.remove('nav-open'); });
  });
}

function initFooterGrain(){
  var canvas = document.getElementById('static');
  if (!canvas) return;
  var ctx = canvas.getContext('2d');
  var w, h, imageData;

  function resize(){
    var rect = canvas.parentElement.getBoundingClientRect();
    w = canvas.width = Math.floor(rect.width / 3);
    h = canvas.height = Math.floor(rect.height / 3);
    canvas.style.width = '100%';
    canvas.style.height = '100%';
    imageData = ctx.createImageData(w, h);
  }
  resize();
  window.addEventListener('resize', resize);

  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var last = 0;
  function draw(ts){
    if (!last || ts - last > 90) {
      last = ts;
      var buf = imageData.data;
      for (var i = 0; i < buf.length; i += 4) {
        var v = (Math.random() * 255) | 0;
        buf[i] = buf[i+1] = buf[i+2] = v;
        buf[i+3] = 255;
      }
      ctx.putImageData(imageData, 0, 0);
    }
    if (!reduced) requestAnimationFrame(draw);
  }
  requestAnimationFrame(draw);
}

// Vanilla-JS equivalent of the shadcn `LinkPreview` hover component.
// Any page can define its own PREVIEWS map on window.INDIGO_PREVIEWS
// before this script runs; falls back to a small shared default set.
function initHoverPreview(){
  var fine = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  if (!fine) return;

  var card = document.getElementById('preview-card');
  if (!card) return;

  var DEFAULTS = {
    strategy: { label: 'Where it begins', icon: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="1.2" fill="currentColor"/><path d="M12 3v3M12 18v3M3 12h3M18 12h3"/>' },
    shoot:    { label: 'On location',     icon: '<path d="M4 7h3l1.5-2h7L17 7h3a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V8a1 1 0 0 1 1-1z"/><circle cx="12" cy="13" r="3.2"/>' },
    edit:     { label: 'In the room',     icon: '<rect x="3" y="7" width="18" height="10" rx="2"/><path d="M8 7v10M16 7v10"/>' },
    delivery: { label: 'Out the door',    icon: '<path d="M3 11l9-7 9 7"/><path d="M5 10v9a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-9"/>' },
    frame:    { label: 'What stays with you', icon: '<rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="9" cy="10" r="2"/><path d="M21 15l-5-5L5 21"/>' },
    team:     { label: 'The whole crew',  icon: '<circle cx="9" cy="8" r="3"/><circle cx="17" cy="9" r="2.4"/><path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6M15 14.2c2.4.3 4.3 2.2 4.6 4.8"/>' }
  };

  var PREVIEWS = Object.assign({}, DEFAULTS, window.INDIGO_PREVIEWS || {});

  var art = card.querySelector('.art');
  var label = card.querySelector('.label');
  var targetX = 0, targetY = 0, curX = 0, curY = 0, active = false;

  function render(){
    curX += (targetX - curX) * 0.22;
    curY += (targetY - curY) * 0.22;
    card.style.left = curX + 'px';
    card.style.top = curY + 'px';
    if (active) requestAnimationFrame(render);
  }

  document.querySelectorAll('.hover-word[data-preview]').forEach(function(el){
    var key = el.getAttribute('data-preview');
    var data = PREVIEWS[key];
    if (!data) return;

    el.addEventListener('mouseenter', function(e){
      art.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">' + data.icon + '</svg>';
      label.textContent = data.label;
      targetX = curX = e.clientX;
      targetY = curY = e.clientY;
      active = true;
      card.classList.add('visible');
      requestAnimationFrame(render);
    });
    el.addEventListener('mousemove', function(e){
      targetX = e.clientX;
      targetY = e.clientY;
    });
    el.addEventListener('mouseleave', function(){
      active = false;
      card.classList.remove('visible');
    });
  });
}
