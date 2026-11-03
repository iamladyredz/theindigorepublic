/* ===========================================================
   The Indigo Republic — Creation Factory, interactive 3D hero
   Procedural three.js: no 3D models, no photos. Every prop is
   built from primitive geometry; every "screen" is a 2D canvas
   drawing mapped onto a plane — the same technique the Agentic
   Factory 3D reference uses for its machine. Drag to rotate,
   scroll/pinch to zoom.
   =========================================================== */
(function () {
  "use strict";

  function boot() {
    var root = document.getElementById("creationFactory3D");
    if (!root || typeof THREE === "undefined" || !THREE.OrbitControls) {
      if (root) root.classList.add("cf3d-unavailable");
      return;
    }
    initScene(root);
  }

  function initScene(root) {
    var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    function w() { return root.clientWidth || 1; }
    function h() { return root.clientHeight || 1; }

    var scene = new THREE.Scene();
    var camera = new THREE.PerspectiveCamera(36, w() / h(), 0.1, 100);

    var renderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "high-performance" });
    } catch (e) {
      root.classList.add("cf3d-unavailable");
      return;
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(w(), h());
    if (renderer.outputEncoding !== undefined) renderer.outputEncoding = THREE.sRGBEncoding;
    if (renderer.physicallyCorrectLights !== undefined) renderer.physicallyCorrectLights = false;
    root.appendChild(renderer.domElement);
    renderer.domElement.setAttribute("aria-label", "Interactive 3D scene: The Indigo Republic creation factory. Drag to rotate, scroll to zoom.");
    renderer.domElement.setAttribute("role", "img");

    var controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.enablePan = false;
    controls.minDistance = 6;
    controls.maxDistance = 15;
    controls.minPolarAngle = 0.35;
    controls.maxPolarAngle = Math.PI * 0.49;
    controls.rotateSpeed = 0.55;
    controls.zoomSpeed = 0.6;
    controls.autoRotate = !reduceMotion;
    controls.autoRotateSpeed = 0.55;
    controls.addEventListener("start", function () { controls.autoRotate = false; });

    // Embedded-hero mode: this canvas sits inline in a scrolling page, not
    // in its own full-screen viewer. A capturing wheel-zoom would block the
    // page from scrolling past it, so zoom is off entirely; on touch
    // devices, rotate is off too so a swipe scrolls the page instead of
    // spinning the scene (same tradeoff the reference component makes for
    // its own "embed" mode).
    controls.enableZoom = false;
    var isCoarsePointer = window.matchMedia("(pointer: coarse)").matches;
    if (isCoarsePointer) controls.enableRotate = false;

    // This three.js build's OrbitControls calls preventDefault() on wheel
    // events unconditionally, ignoring enableZoom — which would trap page
    // scroll inside the hero. Intercept the wheel event in the capture
    // phase, before it ever reaches the canvas's own listener, so the
    // browser's native scroll behaves normally.
    root.addEventListener("wheel", function (e) { e.stopPropagation(); }, { capture: true, passive: true });

    /* ---------- lighting ---------- */
    scene.add(new THREE.HemisphereLight(0xdbe3f0, 0x33303a, 1.15));
    var key = new THREE.DirectionalLight(0xfff1d8, 1.5);
    key.position.set(-4, 7, 5);
    scene.add(key);
    var rim = new THREE.DirectionalLight(0xc4d4ed, 1.0);
    rim.position.set(4, 5, -6);
    scene.add(rim);
    var fill = new THREE.DirectionalLight(0xffffff, 0.35);
    fill.position.set(2, 3, 8);
    scene.add(fill);

    /* ---------- geometry/material helpers ---------- */
    var geoCache = {};
    function boxGeo(wd, ht, dp) {
      var k = "b" + wd + "," + ht + "," + dp;
      if (!geoCache[k]) geoCache[k] = new THREE.BoxGeometry(wd, ht, dp);
      return geoCache[k];
    }
    function cylGeo(r1, r2, ht, seg) {
      var k = "c" + r1 + "," + r2 + "," + ht + "," + seg;
      if (!geoCache[k]) geoCache[k] = new THREE.CylinderGeometry(r1, r2, ht, seg || 16);
      return geoCache[k];
    }
    function sphGeo(r) {
      var k = "s" + r;
      if (!geoCache[k]) geoCache[k] = new THREE.SphereGeometry(r, 16, 12);
      return geoCache[k];
    }
    function mat(color, opts) {
      var o = { color: color, metalness: 0.15, roughness: 0.55 };
      for (var k in opts) o[k] = opts[k];
      return new THREE.MeshStandardMaterial(o);
    }
    function box(parent, wd, ht, dp, x, y, z, m) {
      var o = new THREE.Mesh(boxGeo(wd, ht, dp), m);
      o.position.set(x, y, z);
      o.castShadow = o.receiveShadow = true;
      parent.add(o);
      return o;
    }
    function cyl(parent, r1, ht, x, y, z, m, r2, seg) {
      var o = new THREE.Mesh(cylGeo(r1, r2 === undefined ? r1 : r2, ht, seg), m);
      o.position.set(x, y, z);
      o.castShadow = o.receiveShadow = true;
      parent.add(o);
      return o;
    }
    function ball(parent, r, x, y, z, m) {
      var o = new THREE.Mesh(sphGeo(r), m);
      o.position.set(x, y, z);
      parent.add(o);
      return o;
    }
    function canvasTexture(wd, ht, draw) {
      var c = document.createElement("canvas");
      c.width = wd; c.height = ht;
      var ctx = c.getContext("2d");
      draw(ctx, wd, ht);
      var t = new THREE.CanvasTexture(c);
      if (t.encoding !== undefined) t.encoding = THREE.sRGBEncoding;
      return { texture: t, ctx: ctx, canvas: c };
    }
    function screen(parent, wd, ht, x, y, z, tex, rotY, rotX, emissive) {
      var map = tex.texture ? tex.texture : tex;
      var m = new THREE.MeshBasicMaterial({ map: map, transparent: true });
      var o = new THREE.Mesh(new THREE.PlaneGeometry(wd, ht), m);
      o.position.set(x, y, z);
      if (rotY) o.rotation.y = rotY;
      if (rotX) o.rotation.x = rotX;
      parent.add(o);
      return o;
    }

    var world = new THREE.Group();
    scene.add(world);

    /* =========================================================
       BOOK STAGE
       ========================================================= */
    var M = {
      cover: mat(0x3b2a1d, { roughness: 0.65, metalness: 0.05 }),
      coverEdge: mat(0x241a12, { roughness: 0.7 }),
      page: mat(0xece3cf, { roughness: 0.85, metalness: 0 }),
      dark: mat(0x15161a, { roughness: 0.4, metalness: 0.3 }),
      body: mat(0x2c2f36, { roughness: 0.45, metalness: 0.25 }),
      chrome: mat(0xb9c0c8, { roughness: 0.25, metalness: 0.75 }),
      wood: mat(0x6b4a30, { roughness: 0.7 }),
      crate: mat(0xb79568, { roughness: 0.8 }),
      rubble: mat(0xc9ccd1, { roughness: 0.95 }),
      shirt: mat(0x121214, { roughness: 0.55, metalness: 0.08 }),
      skin: [0xd9a06b, 0xf0c49a, 0x8a5a38, 0xc98a54, 0xe8b98f],
      hair: [0x241c16, 0x3a2a1c, 0x14100d, 0x5c4228, 0x1a1a1a],
      amber: mat(0xffdba6, { roughness: 0.25, metalness: 0, transparent: true, opacity: 0.94, emissive: 0xff9c3a, emissiveIntensity: 1.1 })
    };

    var BOOK_W = 7.6, BOOK_D = 5.2;
    box(world, BOOK_W, 0.22, BOOK_D, 0, -0.11, 0, M.coverEdge);
    box(world, BOOK_W - 0.15, 0.1, BOOK_D - 0.15, 0, 0.05, 0, M.cover);

    var pageTex = canvasTexture(1400, 1000, function (ctx, cw, ch) {
      ctx.fillStyle = "#ede3cd";
      ctx.fillRect(0, 0, cw, ch);
      ctx.strokeStyle = "rgba(60,45,25,.18)";
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(cw / 2, 0); ctx.lineTo(cw / 2, ch); ctx.stroke();
      ctx.fillStyle = "rgba(50,38,22,.38)";
      var cols = [cw * 0.08, cw * 0.56];
      for (var c = 0; c < 2; c++) {
        for (var i = 0; i < 26; i++) {
          var lw = (i % 7 === 6) ? 0.28 : 0.6 + Math.random() * 0.3;
          ctx.fillRect(cols[c], 40 + i * 34, (cw * 0.36) * lw, 6);
        }
      }
    });
    screen(world, BOOK_W - 0.3, BOOK_D - 0.3, 0, 0.101, 0, pageTex, 0, -Math.PI / 2);

    var BOOK_TOP = 0.1;

    // scattered rubble
    var rubblePositions = [
      [-3.3, 0.95], [-3.6, -0.6], [3.3, 1.1], [3.6, -0.4], [-2.6, -1.9],
      [2.7, -2.0], [0.2, -2.1], [-1.1, 2.2], [1.3, 2.25], [-3.9, 0.1]
    ];
    rubblePositions.forEach(function (p, i) {
      var g = new THREE.Group();
      var n = 3 + (i % 3);
      for (var j = 0; j < n; j++) {
        var s = 0.1 + Math.random() * 0.16;
        var o = box(g, s, s, s, (Math.random() - 0.5) * 0.3, s / 2, (Math.random() - 0.5) * 0.3, M.rubble);
        o.rotation.set(Math.random(), Math.random(), Math.random());
      }
      g.position.set(p[0], BOOK_TOP, p[1]);
      world.add(g);
    });

    /* =========================================================
       CRT TELEVISION (left)
       ========================================================= */
    var tv = new THREE.Group();
    tv.position.set(-2.55, 0, -0.5);
    world.add(tv);

    box(tv, 1.15, 0.5, 0.95, 0, BOOK_TOP + 0.25, 0, M.crate, 0);
    box(tv, 1.12, 0.46, 0.92, 0, BOOK_TOP + 0.25, 0, M.wood);
    var tvCrateTop = BOOK_TOP + 0.5;

    var tvBody = new THREE.Group();
    tvBody.position.set(0, tvCrateTop + 0.62, 0);
    tv.add(tvBody);
    box(tvBody, 1.45, 1.22, 1.05, 0, 0, 0, M.body);
    box(tvBody, 1.0, 0.85, 0.08, 0, 0.02, 0.49, M.dark);

    var barsTex = canvasTexture(512, 384, function (ctx, cw, ch) {
      var cols = ["#f4f1ea", "#e4b84a", "#4fb6c9", "#5fae5a", "#b85fae", "#c44a4a", "#2a3a6b"];
      var cw7 = cw / 7;
      for (var i = 0; i < 7; i++) { ctx.fillStyle = cols[i]; ctx.fillRect(i * cw7, 0, cw7, ch * 0.78); }
      ctx.fillStyle = "#111"; ctx.fillRect(0, ch * 0.78, cw, ch * 0.22);
      for (var j = 0; j < 4; j++) { ctx.fillStyle = j % 2 ? "#e8e4da" : "#1c1c1c"; ctx.fillRect(j * cw / 4, ch * 0.78, cw / 4, ch * 0.22); }
    });
    screen(tvBody, 0.94, 0.72, 0, 0.03, 0.535, barsTex);

    for (var k = 0; k < 2; k++) {
      cyl(tvBody, 0.045, 0.1, 0.55, 0.35 + k * 0.22, 0.46, M.dark, 0.045, 14);
    }
    var ant1 = cyl(tvBody, 0.012, 0.6, 0.18, 0.95, -0.1, M.chrome, 0.012, 8);
    ant1.rotation.z = -0.5;
    var ant2 = cyl(tvBody, 0.012, 0.6, -0.18, 0.95, -0.1, M.chrome, 0.012, 8);
    ant2.rotation.z = 0.5;

    /* =========================================================
       FILM CAMERA + TRIPOD (center-left)
       ========================================================= */
    var camRig = new THREE.Group();
    camRig.position.set(-0.55, 0, 0.65);
    world.add(camRig);

    var legTop = BOOK_TOP + 0.95;
    [-0.42, 0.42, 0].forEach(function (lx, i) {
      var lz = i === 2 ? 0.46 : -0.22;
      var leg = cyl(camRig, 0.02, 1.0, lx, legTop - 0.5, lz, M.wood, 0.02, 8);
      leg.lookAt(new THREE.Vector3(camRig.position.x, legTop + 0.05, camRig.position.z));
      leg.rotation.x += Math.PI / 2;
      leg.position.set(lx, legTop - 0.55, lz);
    });
    var head = cyl(camRig, 0.1, 0.12, 0, legTop, 0, M.dark, 0.1, 16);
    var camBody = box(camRig, 0.42, 0.3, 0.3, 0, legTop + 0.22, -0.05, M.body);
    var lens = cyl(camRig, 0.11, 0.3, 0, legTop + 0.22, 0.22, M.dark, 0.08, 20);
    lens.rotation.x = Math.PI / 2;
    [-0.15, 0.15].forEach(function (rx) {
      cyl(camRig, 0.12, 0.08, rx, legTop + 0.44, -0.1, M.dark, 0.12, 20);
      cyl(camRig, 0.045, 0.1, rx, legTop + 0.44, -0.1, M.chrome, 0.045, 14);
    });

    /* =========================================================
       CLAPPERBOARD (leaning near the camera)
       ========================================================= */
    var clapTex = canvasTexture(420, 300, function (ctx, cw, ch) {
      ctx.fillStyle = "#15161a"; ctx.fillRect(0, 0, cw, ch);
      ctx.save();
      ctx.translate(0, 0);
      for (var i = -2; i < 10; i++) {
        ctx.fillStyle = i % 2 === 0 ? "#f4f1ea" : "#15161a";
        ctx.beginPath();
        ctx.moveTo(i * 44, 0); ctx.lineTo(i * 44 + 30, 0); ctx.lineTo(i * 44 - 14, 58); ctx.lineTo(i * 44 - 44, 58);
        ctx.closePath(); ctx.fill();
      }
      ctx.restore();
      ctx.fillStyle = "#f4f1ea";
      ctx.font = "700 30px Arial";
      ctx.fillText("INDIGO REPUBLIC", 26, 120);
      ctx.font = "400 18px Arial";
      ctx.fillStyle = "#c7c5bd";
      ctx.fillText("SCENE  —  TAKE", 26, 160);
      ctx.strokeStyle = "rgba(244,241,234,.3)"; ctx.lineWidth = 2;
      ctx.strokeRect(14, 70, cw - 28, ch - 90);
    });
    var clap = screen(world, 0.55, 0.4, 0.15, BOOK_TOP + 0.2, 1.15, clapTex);
    clap.rotation.x = -0.35;
    clap.rotation.z = 0.08;
    box(world, 0.12, 0.4, 0.1, 0.15, BOOK_TOP + 0.2, 1.25, M.dark);

    /* =========================================================
       EDITING DESK + MULTI-MONITOR BAY (right)
       ========================================================= */
    var desk = new THREE.Group();
    desk.position.set(2.15, 0, 0.55);
    world.add(desk);

    var deskTopY = BOOK_TOP + 0.52;
    box(desk, 1.7, 0.08, 0.85, 0, deskTopY, 0, M.wood);
    [[-0.78, -0.35], [0.78, -0.35], [-0.78, 0.35], [0.78, 0.35]].forEach(function (p) {
      cyl(desk, 0.025, deskTopY - BOOK_TOP, p[0], BOOK_TOP + (deskTopY - BOOK_TOP) / 2, p[1], M.dark, 0.025, 8);
    });
    box(desk, 0.5, 0.025, 0.3, -0.35, deskTopY + 0.03, 0.15, M.dark); // keyboard

    var timelineTex = canvasTexture(640, 420, function (ctx, cw, ch) {
      ctx.fillStyle = "#121318"; ctx.fillRect(0, 0, cw, ch);
      for (var r = 0; r < 4; r++) {
        ctx.fillStyle = r === 0 ? "#3a4a66" : "#242836";
        ctx.fillRect(16, 20 + r * 90, cw - 32, 70);
        ctx.fillStyle = "#6f8fd1";
        for (var i = 0; i < 40; i++) {
          ctx.fillRect(20 + i * 14, 30 + r * 90, 8, 24 + Math.sin(i * 0.6 + r) * 14);
        }
      }
      ctx.fillStyle = "#ff7a2e";
      ctx.fillRect(220, 10, 3, ch - 20);
    });
    var waveTex = canvasTexture(640, 420, function (ctx, cw, ch) {
      ctx.fillStyle = "#0e1013"; ctx.fillRect(0, 0, cw, ch);
      ctx.strokeStyle = "#54e0c7"; ctx.lineWidth = 3; ctx.beginPath();
      for (var x = 0; x < cw; x++) {
        var y = ch / 2 + Math.sin(x * 0.04) * 60 * Math.sin(x * 0.003) + (Math.random() - 0.5) * 10;
        x === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
      }
      ctx.stroke();
      ctx.fillStyle = "rgba(255,255,255,.08)";
      for (var g = 0; g < ch; g += 40) ctx.fillRect(0, g, cw, 1);
    });
    var wheelTex = canvasTexture(420, 420, function (ctx, cw, ch) {
      ctx.fillStyle = "#121318"; ctx.fillRect(0, 0, cw, ch);
      var cx = cw / 2, cy = ch / 2, rad = cw * 0.4;
      var seg = 48;
      for (var i = 0; i < seg; i++) {
        var a0 = (i / seg) * Math.PI * 2, a1 = ((i + 1) / seg) * Math.PI * 2;
        ctx.fillStyle = "hsl(" + Math.round((i / seg) * 360) + ",70%,55%)";
        ctx.beginPath(); ctx.moveTo(cx, cy);
        ctx.arc(cx, cy, rad, a0, a1); ctx.closePath(); ctx.fill();
      }
      ctx.fillStyle = "#121318"; ctx.beginPath(); ctx.arc(cx, cy, rad * 0.35, 0, Math.PI * 2); ctx.fill();
    });

    var monY = deskTopY + 0.46;
    var mon1 = new THREE.Group(); mon1.position.set(-0.46, monY, -0.33); mon1.rotation.y = 0.18;
    box(mon1, 0.5, 0.36, 0.02, 0, 0, 0, M.dark);
    screen(mon1, 0.46, 0.32, 0, 0, 0.012, timelineTex);
    desk.add(mon1);

    var mon2 = new THREE.Group(); mon2.position.set(0.46, monY, -0.33); mon2.rotation.y = -0.18;
    box(mon2, 0.5, 0.36, 0.02, 0, 0, 0, M.dark);
    screen(mon2, 0.23, 0.32, -0.115, 0, 0.012, waveTex);
    screen(mon2, 0.23, 0.32, 0.115, 0, 0.012, wheelTex);
    desk.add(mon2);

    // desk lamp
    var lamp = new THREE.Group(); lamp.position.set(0.72, deskTopY, 0.3);
    desk.add(lamp);
    cyl(lamp, 0.02, 0.4, 0, 0.2, 0, M.chrome, 0.02, 8);
    var lampArm = cyl(lamp, 0.015, 0.35, 0, 0.42, -0.12, M.chrome, 0.015, 8);
    lampArm.rotation.x = 1.0;
    var lampLight = new THREE.PointLight(0xfff0cf, 0.9, 2.2);
    lampLight.position.set(0, 0.55, -0.26);
    lamp.add(lampLight);
    cyl(lamp, 0.09, 0.08, 0, 0.55, -0.26, mat(0xf4f1ea, { emissive: 0xffe6b0, emissiveIntensity: 0.6 }), 0.05, 16);

    // small stool
    cyl(desk, 0.18, 0.04, 0, BOOK_TOP + 0.3, 0.6, M.wood, 0.18, 20);
    [[-0.12, -0.12], [0.12, -0.12], [-0.12, 0.12], [0.12, 0.12]].forEach(function (p) {
      cyl(desk, 0.015, 0.3, p[0], BOOK_TOP + 0.15, 0.6 + p[1], M.dark, 0.015, 6);
    });

    /* =========================================================
       GLOWING CRYSTAL
       ========================================================= */
    var crystalGroup = new THREE.Group();
    crystalGroup.position.set(0.2, BOOK_TOP, 0.0);
    world.add(crystalGroup);
    var crystalMeshes = [];
    var cPositions = [[0, 0, 0, 0.34], [0.12, 0, 0.08, 0.24], [-0.14, 0, -0.05, 0.22], [0.05, 0, -0.16, 0.2], [-0.08, 0, 0.17, 0.18]];
    cPositions.forEach(function (p, i) {
      var geo = new THREE.OctahedronGeometry(0.12, 0);
      var m = M.amber.clone();
      var o = new THREE.Mesh(geo, m);
      o.position.set(p[0], p[3] / 2, p[2]);
      o.scale.set(0.55, p[3] / 0.12, 0.55);
      o.rotation.y = i * 0.7;
      crystalGroup.add(o);
      crystalMeshes.push(o);
    });
    var crystalLight = new THREE.PointLight(0xffa94d, 1.6, 3.2);
    crystalLight.position.set(0, 0.3, 0);
    crystalGroup.add(crystalLight);

    /* =========================================================
       PROCEDURAL CLOUD (above the scene)
       ========================================================= */
    var cloud = new THREE.Group();
    cloud.position.set(0, 4.15, -0.6);
    world.add(cloud);
    var cloudMat = new THREE.MeshStandardMaterial({ color: 0xfbf3e4, roughness: 0.95, metalness: 0, emissive: 0xffdca0, emissiveIntensity: 0.18 });
    var cloudPuffs = [
      [0, 0, 0, 0.75], [0.55, -0.08, 0.1, 0.55], [-0.6, -0.06, -0.05, 0.58],
      [1.05, -0.18, -0.05, 0.4], [-1.05, -0.2, 0.1, 0.4], [0.2, 0.3, -0.1, 0.5], [-0.25, 0.28, 0.05, 0.42]
    ];
    cloudPuffs.forEach(function (p) {
      ball(cloud, p[3], p[0], p[1], p[2], cloudMat);
    });
    var cloudLight = new THREE.PointLight(0xffe2a8, 1.1, 6);
    cloudLight.position.set(0, -0.3, 0.3);
    cloud.add(cloudLight);

    /* =========================================================
       CREW FIGURES — stylized, modern, black shirts, real logo
       ========================================================= */
    var logoTexture = new THREE.TextureLoader().load("assets/images/indigo-republic-logo.webp");
    if (logoTexture.encoding !== undefined) logoTexture.encoding = THREE.sRGBEncoding;
    var logoMat = new THREE.MeshBasicMaterial({ map: logoTexture, transparent: true });

    function buildFigure(skinColor, hairColor) {
      var g = new THREE.Group();
      var skin = mat(skinColor, { roughness: 0.6, metalness: 0 });
      var pants = mat(0x1b1b1f, { roughness: 0.6 });

      cyl(g, 0.065, 0.56, -0.09, 0.28, 0, pants, 0.065, 10);
      cyl(g, 0.065, 0.56, 0.09, 0.28, 0, pants, 0.065, 10);
      box(g, 0.14, 0.12, 0.18, -0.09, 0.56, 0, mat(0x0c0c0e), 0);
      box(g, 0.14, 0.12, 0.18, 0.09, 0.56, 0, mat(0x0c0c0e), 0);

      box(g, 0.36, 0.44, 0.2, 0, 0.78, 0, M.shirt);
      cyl(g, 0.055, 0.44, -0.23, 0.76, 0, M.shirt, 0.055, 10);
      cyl(g, 0.055, 0.44, 0.23, 0.76, 0, M.shirt, 0.055, 10);
      box(g, 0.12, 0.12, 0.09, -0.23, 0.53, 0, skin, 0);
      box(g, 0.12, 0.12, 0.09, 0.23, 0.53, 0, skin, 0);

      ball(g, 0.145, 0, 1.12, 0, skin);
      var hair = new THREE.Mesh(new THREE.SphereGeometry(0.15, 16, 12, 0, Math.PI * 2, 0, Math.PI * 0.62), mat(hairColor, { roughness: 0.85 }));
      hair.position.set(0, 1.14, 0);
      g.add(hair);

      var plaque = new THREE.Mesh(new THREE.PlaneGeometry(0.17, 0.2), logoMat);
      plaque.position.set(0, 0.82, 0.101);
      g.add(plaque);

      return g;
    }

    var crew = [];

    var figTV = buildFigure(M.skin[0], M.hair[0]);
    figTV.position.set(-2.0, BOOK_TOP, 0.35);
    figTV.rotation.y = Math.PI * 0.82;
    world.add(figTV); crew.push(figTV);

    var figClap = buildFigure(M.skin[1], M.hair[1]);
    figClap.position.set(-0.75, BOOK_TOP, 1.1);
    figClap.rotation.y = Math.PI * 0.35;
    world.add(figClap); crew.push(figClap);

    var figCam = buildFigure(M.skin[2], M.hair[2]);
    figCam.position.set(-0.55, legTop - 0.95, 1.15);
    figCam.rotation.y = -Math.PI * 0.1;
    world.add(figCam); crew.push(figCam);

    var figEdit = buildFigure(M.skin[3], M.hair[3]);
    figEdit.position.set(2.15 - 0.0, BOOK_TOP, 0.55 + 0.68);
    figEdit.rotation.y = Math.PI;
    world.add(figEdit); crew.push(figEdit);

    // Rigid stick-figures have no joints, so "sitting cross-legged" isn't
    // achievable without a broken pose — standing on the TV cabinet, bent
    // slightly forward over the laptop, reads honestly instead.
    var figTop = buildFigure(M.skin[4], M.hair[4]);
    figTop.position.set(-2.55, tvBody.position.y + 0.62, -0.5);
    figTop.rotation.y = Math.PI * 0.18;
    figTop.rotation.x = 0.22;
    var laptop = new THREE.Group();
    box(laptop, 0.2, 0.014, 0.15, 0, 0, 0, mat(0xf4f1ea));
    var ltScreen = screen(laptop, 0.17, 0.11, 0, 0.065, 0.065, { texture: logoTexture });
    ltScreen.rotation.x = -1.15;
    laptop.position.set(0, 0.94, 0.26);
    figTop.add(laptop);
    world.add(figTop); crew.push(figTop);

    /* ---------- idle motion ---------- */
    window.__cf3dTick = function (t) {
      crystalMeshes.forEach(function (m, i) {
        m.rotation.y = t * 0.3 + i;
        m.material.emissiveIntensity = 0.9 + Math.sin(t * 1.6 + i) * 0.35;
      });
      crystalLight.intensity = 1.3 + Math.sin(t * 1.6) * 0.5;
      cloud.position.y = 5.1 + Math.sin(t * 0.35) * 0.08;
      figTop.children[figTop.children.length - 1].rotation.y = Math.sin(t * 0.4) * 0.08;
    };

    /* ---------- camera framing ---------- */
    camera.position.set(7.0, 6.2, 8.2);
    controls.target.set(0, 1.4, 0);
    controls.update();

    /* ---------- resize ---------- */
    var lastW = w(), lastH = h();
    function onResize() {
      var nw = w(), nh = h();
      if (Math.abs(nw - lastW) < 2 && Math.abs(nh - lastH) < 2) return;
      lastW = nw; lastH = nh;
      renderer.setSize(nw, nh);
      camera.aspect = nw / nh;
      camera.updateProjectionMatrix();
    }
    window.addEventListener("resize", onResize);
    if (window.ResizeObserver) new ResizeObserver(onResize).observe(root);

    /* ---------- visibility pause ---------- */
    var visible = true;
    if (window.IntersectionObserver) {
      new IntersectionObserver(function (entries) { visible = entries[0].isIntersecting; }, { threshold: 0.01 }).observe(root);
    }

    /* ---------- animate ---------- */
    var clock = new THREE.Clock();
    function animate() {
      requestAnimationFrame(animate);
      if (!visible) return;
      var t = clock.getElapsedTime();
      if (window.__cf3dTick) window.__cf3dTick(t);
      controls.update();
      renderer.render(scene, camera);
    }
    requestAnimationFrame(animate);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
