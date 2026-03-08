/**
 * ARG EFFECTS — EGEX Network Template
 * Analog horror layer for all network sites
 * Information Control Center — do not remove
 */
(function() {
  'use strict';

  // ── INJECT HTML ELEMENTS ─────────────────────────────────────────────────────
  function injectElements() {
    const body = document.body;

    // Vignette
    const vig = document.createElement('div');
    vig.id = 'arg-vignette';
    body.appendChild(vig);

    // VHS tracking bands
    const track = document.createElement('div');
    track.id = 'arg-vhs-track';
    track.innerHTML = `
      <div class="arg-vhs-band" style="--dur:2.2s;--delay:0s;height:3px;"></div>
      <div class="arg-vhs-band" style="--dur:3.5s;--delay:0.8s;height:5px;opacity:0.7;"></div>
      <div class="arg-vhs-band" style="--dur:2.9s;--delay:1.6s;height:2px;"></div>
      <div class="arg-vhs-band" style="--dur:4.5s;--delay:0.3s;height:7px;opacity:0.5;"></div>
    `;
    body.appendChild(track);

    // Warm noise
    const noise = document.createElement('div');
    noise.id = 'arg-warm-noise';
    body.appendChild(noise);

    // Timecode
    const tc = document.createElement('div');
    tc.id = 'arg-timecode';
    body.appendChild(tc);

    // REC indicator
    const rec = document.createElement('div');
    rec.id = 'arg-rec';
    rec.textContent = 'REC';
    body.appendChild(rec);

    // Interference banner
    const intf = document.createElement('div');
    intf.id = 'arg-interference';
    intf.textContent = 'SIGNAL INTEGRITY COMPROMISED — PLEASE STAND BY';
    body.appendChild(intf);

    // Static burst
    const burst = document.createElement('div');
    burst.id = 'arg-static-burst';
    body.appendChild(burst);

    // Corner marks
    [
      ['arg-corner tl', 'RESTRICTED'],
      ['arg-corner tr', 'MONITORED'],
      ['arg-corner bl', 'ICC-' + Math.floor(Math.random()*900+100)],
      ['arg-corner br', new Date().getFullYear() + '']
    ].forEach(([cls, txt]) => {
      const c = document.createElement('div');
      c.className = cls; c.textContent = txt;
      body.appendChild(c);
    });
  }

  // ── TIMECODE ─────────────────────────────────────────────────────────────────
  function startTimecode() {
    const el = document.getElementById('arg-timecode');
    if (!el) return;
    let frames = Math.floor(Math.random() * 86400 * 24);
    setInterval(() => {
      frames++;
      const h = Math.floor(frames/86400)%24;
      const m = Math.floor(frames/1440)%60;
      const s = Math.floor(frames/24)%60;
      const f = frames%24;
      el.textContent = [h,m,s,f].map(n=>String(n).padStart(2,'0')).join(':');
      if (Math.random()<0.003) { el.style.opacity='0.08'; setTimeout(()=>el.style.opacity='',80); }
    }, 42);
  }

  // ── CHARACTER CORRUPTION ─────────────────────────────────────────────────────
  const CORRUPT = '█▓▒░■□▪▫◆◇○●◉×÷±∞≈≠';
  function corruptChar() {
    const paras = [...document.querySelectorAll('p, h2, h3, li')].filter(el => {
      return el.textContent.trim().length > 8 && !el.closest('#arg-interference');
    });
    if (!paras.length) return;
    const p = paras[Math.floor(Math.random()*paras.length)];
    const walker = document.createTreeWalker(p, NodeFilter.SHOW_TEXT);
    const nodes = [];
    let n;
    while((n=walker.nextNode())) { if(n.textContent.trim().length>3) nodes.push(n); }
    if (!nodes.length) return;
    const tn = nodes[Math.floor(Math.random()*nodes.length)];
    const txt = tn.textContent;
    const idx = Math.floor(Math.random()*txt.length);
    if (!/[a-zA-Z0-9]/.test(txt[idx])) return;
    const orig = txt[idx];
    tn.textContent = txt.slice(0,idx) + CORRUPT[Math.floor(Math.random()*CORRUPT.length)] + txt.slice(idx+1);
    setTimeout(()=>{ if(tn.textContent[idx]!==orig) tn.textContent=txt; }, 80+Math.random()*120);
  }

  // ── CURSOR TRAIL ─────────────────────────────────────────────────────────────
  function initCursorTrail() {
    let last = 0;
    document.addEventListener('mousemove', e => {
      const now = Date.now();
      if (now-last<30) return; last=now;
      const d = document.createElement('div');
      const sz = Math.random()*3+1;
      d.style.cssText = `position:fixed;left:${e.clientX-sz/2}px;top:${e.clientY-sz/2}px;width:${sz}px;height:${sz}px;border-radius:50%;background:rgba(139,0,0,${0.12+Math.random()*0.18});pointer-events:none;z-index:9996;transition:opacity 0.5s,transform 0.5s;`;
      document.body.appendChild(d);
      requestAnimationFrame(()=>{ d.style.opacity='0'; d.style.transform=`translate(${(Math.random()-.5)*8}px,${(Math.random()-.5)*8}px)`; });
      setTimeout(()=>d.remove(), 600);
    });
  }

  // ── TEXT SCRAMBLE ON LINKS ────────────────────────────────────────────────────
  function initScramble() {
    const CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789█▓▒░';
    document.querySelectorAll('a').forEach(link => {
      const orig = link.textContent;
      if (orig.length < 3 || orig.length > 40) return;
      let timer;
      link.addEventListener('mouseenter', () => {
        let iter = 0;
        clearInterval(timer);
        timer = setInterval(() => {
          link.textContent = orig.split('').map((c,i) => {
            if (i<iter) return orig[i];
            if (c===' ') return ' ';
            return CHARS[Math.floor(Math.random()*CHARS.length)];
          }).join('');
          iter += 3;
          if (iter>=orig.length) { clearInterval(timer); link.textContent=orig; }
        }, 25);
      });
      link.addEventListener('mouseleave', ()=>{ clearInterval(timer); link.textContent=orig; });
    });
  }

  // ── NAV STATUS CYCLING ───────────────────────────────────────────────────────
  function initNavStatus() {
    const status = document.querySelector('.arg-nav-status, #arg-nav-status');
    if (!status) return;
    const states = ['LIVE','MONITORING','TRACKING','ACTIVE','LIVE','LIVE','FLAGGED'];
    let i = 0;
    setInterval(()=>{ i=(i+1)%states.length; status.textContent=states[i]; }, 1500+Math.random()*2000);
  }

  // ── BOOT ─────────────────────────────────────────────────────────────────────
  function boot() {
    injectElements();
    startTimecode();
    initCursorTrail();
    setTimeout(initScramble, 500);
    setTimeout(initNavStatus, 200);
    setInterval(corruptChar, 120);
    setInterval(corruptChar, 200);
    setInterval(() => {
      if (Math.random()<0.15) { for(let i=0;i<6;i++) setTimeout(corruptChar,i*50); }
    }, 800);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
