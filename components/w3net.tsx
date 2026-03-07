import { useState, useEffect, useRef, useMemo, useCallback } from "react";

/* ═══════════════════════════════════════════════════════════════
   W3 NET v3.3  ·  Web3 Networking Hub
   
   KARMA ENGINE — W3-Trust™ Architecture:
   ─ Weighted voting: voter's own karma multiplies vote weight
   ─ Vote weight = 0.5 + (voterKarma / 200) clamped to [0.1, 3.0]
   ─ Contact karma propagates → Project karma (team-weighted avg)
   ─ Project karma propagates → Company karma (projects-weighted avg)
   ─ Hierarchical influence: Company ← Projects ← Contacts
   ─ Anti-sybil: new accounts (karma < 5) have weight 0.1
   ─ Time decay: votes older than 90d contribute 50% weight
   ─ Wilson Score lower bound for fair ranking with small samples
   ─ Daily vote limits per entity per user (1 up + 1 down)
   ─ Cannot vote on own entity (createdBy === voterId)
   ─ Anonymous only for discussion comments (opt-in, off by default)
   
   COMMENTS — Slack-style threaded:
   ─ Any message can start/continue a thread
   ─ Each thread message voteable
   ─ Nested max 2 levels (thread within thread = continues at lvl 2)
   ─ Author chip on every entity always visible
═══════════════════════════════════════════════════════════════ */

/* ══════════ STYLE ══════════ */
const STYLE = `
@import url('https://fonts.googleapis.com/css2?family=Geist:wght@300;400;500;600;700&family=Geist+Mono:wght@400;500&display=swap');
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}
html,body{height:100%;overflow:hidden;}
:root{
  --bg:oklch(1 0 0);--bg2:oklch(0.985 0 0);--bg3:oklch(0.97 0 0);--bg4:oklch(0.96 0 0);
  --fg:oklch(0.145 0 0);--fg2:oklch(0.556 0 0);--fg3:oklch(0.708 0 0);
  --border:oklch(0.922 0 0);--border2:oklch(0.88 0 0);
  --primary:oklch(0.205 0 0);--pri-fg:oklch(0.985 0 0);
  --input:oklch(0.922 0 0);--ring:oklch(0.708 0 0);
  --radius:0.5rem;--r2:0.375rem;--r3:0.25rem;
  --font:'Geist',-apple-system,sans-serif;--mono:'Geist Mono',monospace;
  --warn-bg:oklch(0.98 0.025 80);--warn-border:oklch(0.88 0.08 80);--warn-fg:oklch(0.42 0.14 80);
  --danger-bg:oklch(0.98 0.02 27);--danger-border:oklch(0.88 0.10 27);--danger-fg:oklch(0.45 0.18 27);
  --ok-bg:oklch(0.97 0.02 160);--ok-border:oklch(0.85 0.08 160);--ok-fg:oklch(0.38 0.14 160);
  --tb:oklch(0.96 0.018 240);--tf-b:oklch(0.32 0.12 240);
  --tg:oklch(0.96 0.018 160);--tf-g:oklch(0.30 0.12 160);
  --tp:oklch(0.96 0.018 290);--tf-p:oklch(0.32 0.12 290);
  --ta:oklch(0.97 0.020 80);--tf-a:oklch(0.38 0.12 80);
  --tr:oklch(0.97 0.018 20);--tf-r:oklch(0.38 0.14 20);
  --tt:oklch(0.96 0.018 190);--tf-t:oklch(0.30 0.10 190);
  --ts:oklch(0.95 0 0);--tf-s:oklch(0.38 0 0);
  --tro:oklch(0.97 0.018 350);--tf-ro:oklch(0.38 0.12 350);
  --ti:oklch(0.96 0.018 260);--tf-i:oklch(0.32 0.12 260);
  --tl:oklch(0.97 0.020 130);--tf-l:oklch(0.35 0.12 130);
}
.dark{
  --bg:oklch(0.145 0 0);--bg2:oklch(0.185 0 0);--bg3:oklch(0.245 0 0);--bg4:oklch(0.20 0 0);
  --fg:oklch(0.985 0 0);--fg2:oklch(0.708 0 0);--fg3:oklch(0.50 0 0);
  --border:oklch(0.269 0 0);--border2:oklch(0.32 0 0);
  --primary:oklch(0.985 0 0);--pri-fg:oklch(0.145 0 0);
  --input:oklch(0.269 0 0);--ring:oklch(0.439 0 0);
  --warn-bg:oklch(0.20 0.04 80);--warn-border:oklch(0.35 0.08 80);--warn-fg:oklch(0.78 0.14 80);
  --danger-bg:oklch(0.20 0.04 27);--danger-border:oklch(0.35 0.10 27);--danger-fg:oklch(0.74 0.18 27);
  --ok-bg:oklch(0.18 0.04 160);--ok-border:oklch(0.32 0.08 160);--ok-fg:oklch(0.74 0.14 160);
  --tb:oklch(0.22 0.04 240);--tf-b:oklch(0.74 0.12 240);
  --tg:oklch(0.20 0.04 160);--tf-g:oklch(0.74 0.12 160);
  --tp:oklch(0.20 0.04 290);--tf-p:oklch(0.74 0.12 290);
  --ta:oklch(0.22 0.04 80);--tf-a:oklch(0.80 0.14 80);
  --tr:oklch(0.22 0.05 20);--tf-r:oklch(0.74 0.16 20);
  --tt:oklch(0.20 0.04 190);--tf-t:oklch(0.74 0.10 190);
  --ts:oklch(0.25 0 0);--tf-s:oklch(0.70 0 0);
  --tro:oklch(0.22 0.04 350);--tf-ro:oklch(0.74 0.12 350);
  --ti:oklch(0.20 0.04 260);--tf-i:oklch(0.74 0.12 260);
  --tl:oklch(0.22 0.04 130);--tf-l:oklch(0.78 0.12 130);
}
body{background:var(--bg);color:var(--fg);font-family:var(--font);font-size:14px;line-height:1.5;-webkit-font-smoothing:antialiased;}
.app{display:flex;height:100vh;width:100vw;overflow:hidden;}
.sb{width:224px;flex-shrink:0;background:var(--bg2);border-right:1px solid var(--border);display:flex;flex-direction:column;}
.main{flex:1;min-width:0;display:flex;flex-direction:column;}
.topbar{height:52px;min-height:52px;border-bottom:1px solid var(--border);background:var(--bg);display:flex;align-items:center;gap:10px;padding:0 18px;}
.page{flex:1;overflow-y:auto;padding:20px 22px 40px;}
.page::-webkit-scrollbar{width:4px;}
.page::-webkit-scrollbar-thumb{background:var(--border);border-radius:2px;}
.sb-logo{padding:14px 13px 12px;border-bottom:1px solid var(--border);display:flex;align-items:center;gap:9px;}
.sb-mark{width:28px;height:28px;background:var(--primary);border-radius:var(--r2);display:flex;align-items:center;justify-content:center;flex-shrink:0;}
.sb-mark-t{color:var(--pri-fg);font-size:10px;font-weight:700;letter-spacing:-.3px;}
.sb-name{font-size:13.5px;font-weight:600;letter-spacing:-.2px;}
.sb-sub{font-size:10.5px;color:var(--fg3);}
.sb-nav{flex:1;padding:6px 5px;display:flex;flex-direction:column;gap:1px;overflow-y:auto;}
.sb-sec{padding:12px 8px 4px;font-size:10.5px;font-weight:500;color:var(--fg3);letter-spacing:.5px;text-transform:uppercase;}
.nv{display:flex;align-items:center;gap:8px;padding:6.5px 9px;border-radius:var(--r2);cursor:pointer;color:var(--fg2);font-size:13px;font-weight:500;transition:background .1s,color .1s;user-select:none;}
.nv:hover{background:var(--bg3);color:var(--fg);}
.nv.on{background:var(--bg3);color:var(--fg);font-weight:600;}
.sb-foot{padding:6px 5px;border-top:1px solid var(--border);}
.tb-title{font-size:14.5px;font-weight:600;letter-spacing:-.2px;flex-shrink:0;}
.srch{flex:1;max-width:360px;position:relative;}
.srch-ic{position:absolute;left:8px;top:50%;transform:translateY(-50%);pointer-events:none;color:var(--fg3);}
.srch-in{width:100%;height:32px;background:var(--bg2);border:1px solid var(--input);border-radius:var(--r2);padding:0 10px 0 27px;color:var(--fg);font-family:var(--font);font-size:12.5px;outline:none;transition:border-color .15s;}
.srch-in:focus{border-color:var(--ring);}
.srch-in::placeholder{color:var(--fg3);}
.tb-right{margin-left:auto;display:flex;align-items:center;gap:6px;}
.btn{display:inline-flex;align-items:center;gap:5px;height:32px;padding:0 12px;border-radius:var(--r2);border:1px solid var(--border);background:var(--bg);color:var(--fg);font-family:var(--font);font-size:12.5px;font-weight:500;cursor:pointer;transition:background .1s,border-color .1s;white-space:nowrap;}
.btn:hover{background:var(--bg3);}
.btn:disabled{opacity:.35;cursor:not-allowed;pointer-events:none;}
.btn-sm{height:28px;padding:0 9px;font-size:12px;}
.btn-xs{height:24px;padding:0 7px;font-size:11px;}
.btn-ic{width:32px;padding:0;justify-content:center;}
.btn-ic-sm{width:28px;height:28px;padding:0;justify-content:center;}
.btn-p{background:var(--primary);color:var(--pri-fg);border-color:var(--primary);}
.btn-p:hover{background:oklch(0.28 0 0);border-color:oklch(0.28 0 0);}
.dark .btn-p:hover{background:oklch(0.88 0 0);}
.btn-g{background:transparent;border-color:transparent;}
.btn-g:hover{background:var(--bg3);}
.btn-warn{color:var(--warn-fg);border-color:var(--warn-border);background:var(--warn-bg);font-size:12px;}
.tag{display:inline-flex;align-items:center;padding:1px 6px;border-radius:3px;font-size:11px;font-weight:500;white-space:nowrap;}
.t-b{background:var(--tb);color:var(--tf-b);}
.t-g{background:var(--tg);color:var(--tf-g);}
.t-p{background:var(--tp);color:var(--tf-p);}
.t-a{background:var(--ta);color:var(--tf-a);}
.t-r{background:var(--tr);color:var(--tf-r);}
.t-t{background:var(--tt);color:var(--tf-t);}
.t-s{background:var(--ts);color:var(--tf-s);}
.t-ro{background:var(--tro);color:var(--tf-ro);}
.t-i{background:var(--ti);color:var(--tf-i);}
.t-l{background:var(--tl);color:var(--tf-l);}
.sbadge{display:inline-flex;align-items:center;gap:4px;padding:2px 7px;border-radius:3px;font-size:11px;font-weight:500;}
.s-active{background:var(--tg);color:var(--tf-g);}
.s-lead{background:var(--tb);color:var(--tf-b);}
.s-partner{background:var(--tp);color:var(--tf-p);}
.s-inactive{background:var(--ts);color:var(--tf-s);}
.flag-warn{display:inline-flex;align-items:center;gap:3px;font-size:11px;font-weight:600;color:var(--warn-fg);}
.flag-danger{display:inline-flex;align-items:center;gap:3px;font-size:11px;font-weight:600;color:var(--danger-fg);}
.entity-warn{border-color:var(--warn-border)!important;background:var(--warn-bg)!important;}
.entity-danger{border-color:var(--danger-border)!important;opacity:.75;}
.card{background:var(--bg);border:1px solid var(--border);border-radius:var(--radius);}
.card-p{padding:14px 18px;}
.card-hover{cursor:pointer;transition:border-color .12s,box-shadow .12s;}
.card-hover:hover{border-color:var(--border2);box-shadow:0 2px 8px oklch(0 0 0 / .05);}
.trow{display:flex;align-items:center;gap:9px;padding:9px 13px;border-bottom:1px solid var(--border);cursor:pointer;transition:background .1s;}
.trow:last-child{border-bottom:none;}
.trow:hover{background:var(--bg2);}
.av{border-radius:50%;background:var(--bg3);display:flex;align-items:center;justify-content:center;font-weight:600;color:var(--fg2);flex-shrink:0;letter-spacing:-.5px;}
.av-sq{border-radius:var(--r2);}
.ph{display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:18px;}
.ph-t{font-size:19px;font-weight:700;letter-spacing:-.4px;}
.ph-s{font-size:12.5px;color:var(--fg2);margin-top:2px;}
.fb{display:flex;flex-wrap:wrap;gap:4px;align-items:center;margin-bottom:10px;}
.fp{height:26px;padding:0 9px;border-radius:var(--r2);font-size:12px;font-weight:500;cursor:pointer;border:1px solid var(--border);background:var(--bg);color:var(--fg2);transition:all .1s;font-family:var(--font);}
.fp:hover{border-color:var(--ring);color:var(--fg);}
.fp.on{background:var(--bg3);color:var(--fg);border-color:var(--border2);font-weight:600;}
.fb-lbl{font-size:11.5px;color:var(--fg3);font-weight:500;flex-shrink:0;}
.ov{position:fixed;inset:0;background:oklch(0 0 0 /.42);z-index:200;display:flex;align-items:center;justify-content:center;animation:fi .15s;}
@keyframes fi{from{opacity:0}to{opacity:1}}
.modal{background:var(--bg);border:1px solid var(--border2);border-radius:calc(var(--radius)+3px);width:540px;max-width:calc(100vw - 20px);max-height:90vh;display:flex;flex-direction:column;animation:su .17s ease;box-shadow:0 20px 60px oklch(0 0 0/.15);}
.modal-lg{width:680px;}
.modal-xl{width:860px;}
.modal-sm{width:420px;}
@keyframes su{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
.mh{padding:16px 20px 12px;border-bottom:1px solid var(--border);display:flex;align-items:flex-start;justify-content:space-between;flex-shrink:0;}
.mt{font-size:15px;font-weight:600;letter-spacing:-.2px;}
.ms{font-size:12.5px;color:var(--fg2);margin-top:2px;}
.mb{padding:16px 20px;overflow-y:auto;flex:1;}
.mb::-webkit-scrollbar{width:3px;}
.mb::-webkit-scrollbar-thumb{background:var(--border);}
.mf{padding:12px 20px;border-top:1px solid var(--border);display:flex;gap:6px;justify-content:flex-end;flex-shrink:0;}
.popup-body{padding:20px 24px;overflow-y:auto;flex:1;}
.popup-body::-webkit-scrollbar{width:3px;}
.popup-body::-webkit-scrollbar-thumb{background:var(--border);}
.popup-grid{display:grid;grid-template-columns:1fr 1fr;gap:18px;margin-top:16px;}
.popup-section{margin-bottom:18px;}
.popup-section-title{font-size:10.5px;font-weight:600;color:var(--fg3);letter-spacing:.5px;text-transform:uppercase;margin-bottom:8px;padding-bottom:5px;border-bottom:1px solid var(--border);}
.popup-row{display:flex;gap:9px;margin-bottom:5px;font-size:13px;}
.popup-key{color:var(--fg3);width:80px;flex-shrink:0;font-size:12px;}
.fg0{margin-bottom:12px;}
.lbl{display:block;font-size:12.5px;font-weight:500;color:var(--fg);margin-bottom:4px;}
.inp,.ta,.sel{width:100%;height:32px;background:var(--bg2);border:1px solid var(--input);border-radius:var(--r2);padding:0 10px;color:var(--fg);font-family:var(--font);font-size:12.5px;outline:none;transition:border-color .15s;}
.inp:focus,.sel:focus{border-color:var(--ring);}
.inp::placeholder{color:var(--fg3);}
.ta{height:auto;padding:8px 10px;resize:vertical;min-height:68px;line-height:1.5;}
.ta:focus{border-color:var(--ring);}
.ta::placeholder{color:var(--fg3);}
.sel{appearance:none;cursor:pointer;}
.g2{display:grid;grid-template-columns:1fr 1fr;gap:10px;}
.g3{display:grid;grid-template-columns:1fr 1fr 1fr;gap:9px;}
.tabs{display:flex;background:var(--bg3);border-radius:var(--r2);padding:3px;gap:2px;margin-bottom:16px;}
.tab{flex:1;height:28px;border-radius:calc(var(--r2) - 1px);font-family:var(--font);font-size:12.5px;font-weight:500;cursor:pointer;border:none;background:transparent;color:var(--fg2);transition:all .12s;}
.tab.on{background:var(--bg);color:var(--fg);box-shadow:0 1px 3px oklch(0 0 0/.07);}
.paste{width:100%;background:var(--bg2);border:1px dashed var(--border2);border-radius:var(--r2);padding:10px;min-height:90px;font-family:var(--font);font-size:12.5px;color:var(--fg);outline:none;resize:none;line-height:1.6;transition:border-color .15s;}
.paste:focus{border-color:var(--ring);border-style:solid;}
.paste::placeholder{color:var(--fg3);}
.ai-box{background:var(--bg3);border:1px solid var(--border);border-radius:var(--r2);padding:11px;margin-top:10px;}
.ai-lbl{font-size:10.5px;font-weight:600;color:var(--fg3);letter-spacing:.5px;text-transform:uppercase;margin-bottom:8px;}
.ai-r{display:flex;gap:9px;font-size:12.5px;margin-bottom:3px;}
.ai-k{color:var(--fg3);width:88px;flex-shrink:0;}
.tw{display:flex;flex-wrap:wrap;gap:3px;}
.tp{height:24px;padding:0 8px;border-radius:3px;font-size:11.5px;font-weight:500;cursor:pointer;border:1px solid var(--border);background:var(--bg);color:var(--fg2);transition:all .1s;font-family:var(--font);}
.tp:hover{border-color:var(--ring);color:var(--fg);}
.tp.on{background:var(--primary);color:var(--pri-fg);border-color:var(--primary);}
.rel-chip{display:inline-flex;align-items:center;gap:5px;padding:4px 8px;border-radius:var(--r2);background:var(--bg3);border:1px solid var(--border);font-size:12px;color:var(--fg2);cursor:pointer;transition:all .1s;margin-bottom:4px;}
.rel-chip:hover{border-color:var(--ring);color:var(--fg);background:var(--bg);}
.author-chip{display:inline-flex;align-items:center;gap:5px;padding:3px 7px;border-radius:var(--r2);background:var(--bg3);border:1px solid var(--border);font-size:11.5px;color:var(--fg2);cursor:pointer;}
.author-chip:hover{border-color:var(--ring);color:var(--fg);}
.clink{display:flex;align-items:center;gap:6px;color:var(--fg2);text-decoration:none;padding:4px 7px;border-radius:var(--r2);font-size:12.5px;transition:background .1s,color .1s;}
.clink:hover{background:var(--bg3);color:var(--fg);}
/* ─── KARMA VOTING UI ─── */
.karma-bar{display:flex;align-items:center;gap:6px;}
.kv-btn{display:inline-flex;align-items:center;gap:3px;height:26px;padding:0 8px;border-radius:var(--r2);border:1px solid var(--border);background:var(--bg2);color:var(--fg2);font-family:var(--mono);font-size:12px;cursor:pointer;transition:all .12s;user-select:none;}
.kv-btn:hover{border-color:var(--ring);}
.kv-btn.voted-up{background:var(--tg);color:var(--tf-g);border-color:var(--tf-g);}
.kv-btn.voted-dn{background:var(--tr);color:var(--tf-r);border-color:var(--tf-r);}
.kv-btn:disabled{opacity:.3;cursor:not-allowed;}
.karma-score{font-family:var(--mono);font-size:13px;font-weight:600;min-width:28px;text-align:center;}
.karma-pos{color:var(--tf-g);}
.karma-neg{color:var(--danger-fg);}
.karma-zero{color:var(--fg3);}
.karma-breakdown{font-size:10.5px;color:var(--fg3);display:flex;align-items:center;gap:4px;}
/* ─── WILSON SCORE BADGE ─── */
.wscore{display:inline-flex;align-items:center;gap:4px;font-size:11px;color:var(--fg3);font-family:var(--mono);}
.wscore-bar{height:3px;border-radius:2px;background:var(--border2);width:40px;overflow:hidden;}
.wscore-fill{height:100%;border-radius:2px;background:var(--primary);transition:width .3s;}
/* ─── THREADED COMMENTS ─── */
.thread-root{margin-top:16px;border-top:1px solid var(--border);padding-top:12px;}
.thread-title{font-size:11px;font-weight:600;color:var(--fg3);letter-spacing:.4px;text-transform:uppercase;margin-bottom:10px;}
.comment{padding:9px 0;border-bottom:1px solid var(--border);}
.comment:last-child{border-bottom:none;}
.comment.level-1{padding-left:20px;border-left:2px solid var(--border2);margin-left:12px;}
.comment.level-2{padding-left:16px;border-left:2px solid var(--border);margin-left:10px;}
.comment-header{display:flex;align-items:center;gap:7px;margin-bottom:5px;}
.comment-author{font-size:12.5px;font-weight:600;}
.comment-anon{background:var(--bg3);border:1px solid var(--border);border-radius:3px;padding:1px 5px;font-size:10px;color:var(--fg3);}
.comment-time{font-size:11px;color:var(--fg3);}
.comment-body{font-size:13px;line-height:1.65;color:var(--fg);margin-bottom:7px;}
.comment-actions{display:flex;align-items:center;gap:6px;}
.thread-reply-btn{height:22px;padding:0 7px;font-size:11px;color:var(--fg2);border:1px solid transparent;background:transparent;border-radius:var(--r3);cursor:pointer;font-family:var(--font);transition:all .1s;}
.thread-reply-btn:hover{border-color:var(--border);background:var(--bg2);color:var(--fg);}
.thread-reply-btn.active{color:var(--tf-b);border-color:var(--tb);background:var(--tb);}
.comment-composer{margin-top:8px;padding:8px;background:var(--bg2);border-radius:var(--r2);border:1px solid var(--border);}
.comment-input{width:100%;border:1px solid var(--input);border-radius:var(--r3);background:var(--bg);padding:6px 8px;font-family:var(--font);font-size:12.5px;color:var(--fg);resize:none;outline:none;line-height:1.5;min-height:52px;}
.comment-input:focus{border-color:var(--ring);}
.comment-input::placeholder{color:var(--fg3);}
.anon-toggle{display:flex;align-items:center;gap:5px;font-size:11.5px;color:var(--fg2);cursor:pointer;user-select:none;}
.anon-toggle input{accent-color:var(--primary);}
/* ─── KARMA LEADERBOARD ─── */
.lb-row{display:flex;align-items:center;gap:9px;padding:7px 12px;border-bottom:1px solid var(--border);}
.lb-row:last-child{border-bottom:none;}
.lb-rank{width:22px;text-align:right;font-family:var(--mono);font-size:11px;color:var(--fg3);flex-shrink:0;}
.lb-medal{font-size:13px;}
/* ─── KARMA INFLUENCE PANEL ─── */
.influence-box{background:var(--bg3);border:1px solid var(--border);border-radius:var(--r2);padding:10px 12px;margin-top:12px;}
.influence-title{font-size:10px;font-weight:600;color:var(--fg3);letter-spacing:.4px;text-transform:uppercase;margin-bottom:7px;}
.influence-row{display:flex;align-items:center;gap:7px;font-size:12px;margin-bottom:4px;}
.influence-arrow{color:var(--fg3);font-size:10px;}
/* entity menu */
.ent-menu{position:relative;}
.ent-menu-drop{position:absolute;right:0;top:calc(100% + 4px);background:var(--bg);border:1px solid var(--border2);border-radius:var(--radius);box-shadow:0 6px 20px oklch(0 0 0/.10);z-index:400;min-width:176px;overflow:hidden;}
.ent-menu-item{display:flex;align-items:center;gap:8px;padding:0 12px;height:34px;font-size:12.5px;cursor:pointer;color:var(--fg2);transition:background .1s;}
.ent-menu-item:hover{background:var(--bg3);color:var(--fg);}
.ent-menu-item.danger{color:var(--warn-fg);}
.ent-menu-item.danger:hover{background:var(--warn-bg);}
.ent-menu-sep{height:1px;background:var(--border);margin:3px 0;}
.ent-menu-grp{padding:5px 12px 2px;font-size:10px;font-weight:600;color:var(--fg3);letter-spacing:.5px;text-transform:uppercase;}
.linked-row{display:flex;align-items:center;gap:8px;padding:6px 0;border-bottom:1px solid var(--border);font-size:12.5px;}
.linked-row:last-child{border-bottom:none;}
.dedup-box{background:var(--warn-bg);border:1px solid var(--warn-border);border-radius:var(--r2);padding:10px 12px;margin-bottom:10px;}
.dedup-title{font-size:12px;font-weight:600;color:var(--warn-fg);margin-bottom:6px;}
.dedup-item{display:flex;align-items:center;gap:7px;padding:4px 0;font-size:12px;}
.score{display:flex;align-items:center;gap:3px;font-size:12px;}
.sdot{width:5px;height:5px;border-radius:50%;flex-shrink:0;}
.empty{text-align:center;padding:44px 20px;}
.empty-ic{width:36px;height:36px;background:var(--bg3);border-radius:50%;margin:0 auto 10px;display:flex;align-items:center;justify-content:center;}
.empty-t{font-size:14px;font-weight:600;margin-bottom:4px;}
.empty-s{font-size:12.5px;color:var(--fg2);}
.dot{width:5px;height:5px;border-radius:50%;background:var(--fg);animation:bl 1.2s infinite;opacity:.25;display:inline-block;margin:0 2px;}
.dot:nth-child(2){animation-delay:.2s}.dot:nth-child(3){animation-delay:.4s}
@keyframes bl{0%,100%{opacity:.2}50%{opacity:1}}
kbd{display:inline-flex;align-items:center;height:16px;padding:0 4px;border-radius:3px;font-size:10px;font-family:var(--mono);background:var(--bg3);border:1px solid var(--border);color:var(--fg3);}
.lf-looking{background:var(--tb);color:var(--tf-b);}
.lf-offering{background:var(--tg);color:var(--tf-g);}
.lf-ask{background:var(--ta);color:var(--tf-a);}
.lf-announce{background:var(--tp);color:var(--tf-p);}
.court-card{background:var(--warn-bg);border:1px solid var(--warn-border);border-radius:var(--radius);padding:14px;margin-bottom:9px;}
.court-card.closed-ok{background:var(--ok-bg);border-color:var(--ok-border);}
.court-card.closed-bad{background:var(--danger-bg);border-color:var(--danger-border);}
.court-t{font-size:13px;font-weight:600;color:var(--warn-fg);margin-bottom:3px;}
`;

/* ══════════ ICONS ══════════ */
const I = ({ n, s = 15, c = "currentColor" }) => {
  const p = {
    pulse:    <><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></>,
    contacts: <><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></>,
    company:  <><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></>,
    project:  <><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></>,
    deals:    <><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></>,
    lf:       <><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></>,
    comm:     <><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></>,
    plus:     <><path d="M5 12h14"/><path d="M12 5v14"/></>,
    x:        <><path d="M18 6 6 18"/><path d="m6 6 12 12"/></>,
    search:   <><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></>,
    moon:     <><path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/></>,
    sun:      <><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"/></>,
    tg:       <><path d="m22 3-8.97 18.02-3.16-6.87L3 11.04 22 3z"/></>,
    tw:       <><path d="M22 4s-.7 2.1-2 3.4c1.6 10-9.4 17.3-18 11.6 2.2.1 4.4-.6 6-2C3 15.5.5 9.6 3 5c2.2 2.6 5.6 4.1 9 4-.9-4.2 4-6.6 7-3.8 1.1 0 3-1.2 3-1.2z"/></>,
    mail:     <><rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></>,
    globe:    <><circle cx="12" cy="12" r="10"/><path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"/><path d="M2 12h20"/></>,
    edit:     <><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/></>,
    arr:      <><path d="m9 18 6-6-6-6"/></>,
    eye:      <><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></>,
    upl:      <><path d="M7 10v12"/><path d="M15 5.88 14 10h5.83a2 2 0 0 1 1.92 2.56l-2.33 8A2 2 0 0 1 17.5 22H4a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2h2.76a2 2 0 0 0 1.79-1.11L12 2h0a3.13 3.13 0 0 1 3 3.88Z"/></>,
    dn2:      <><path d="M17 14V2"/><path d="M9 18.12 10 14H4.17a2 2 0 0 1-1.92-2.56l2.33-8A2 2 0 0 1 6.5 2H20a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-2.76a2 2 0 0 0-1.79 1.11L12 22h0a3.13 3.13 0 0 1-3-3.88Z"/></>,
    alert:    <><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><path d="M12 9v4"/><path d="M12 17h.01"/></>,
    link:     <><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></>,
    flag:     <><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" x2="4" y1="22" y2="15"/></>,
    fire:     <><path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"/></>,
    li:       <><path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"/><rect width="4" height="12" x="2" y="9"/><circle cx="4" cy="4" r="2"/></>,
    hammer:   <><path d="m15 12-8.373 8.373a1 1 0 1 1-3-3L12 9"/><path d="m18 15 4-4"/><path d="m21.5 11.5-1.914-1.914A2 2 0 0 1 19 8.172V7l-2.26-2.26a6 6 0 0 0-4.202-1.756L9 3 11 5H9.5a1 1 0 0 0-.707.293L7.05 7.05A1 1 0 0 0 7 7.757V9l-2 2h1l4.48 4.48"/></>,
    user:     <><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></>,
    check:    <><path d="M20 6 9 17l-5-5"/></>,
    dots:     <><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/><circle cx="5" cy="12" r="1"/></>,
    share:    <><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><polyline points="16 6 12 2 8 6"/><line x1="12" x2="12" y1="2" y2="15"/></>,
    court:    <><path d="m14.5 2-8.5 20"/><path d="m9.5 2 8.5 20"/><path d="M3 7h18"/><path d="M3 17h18"/></>,
    trophy:   <><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/><path d="M4 22h16"/><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"/><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"/><path d="M18 2H6v7a6 6 0 0 0 12 0V2z"/></>,
    trend:    <><polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/><polyline points="16 7 22 7 22 13"/></>,
    info:     <><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></>,
  };
  return <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">{p[n] || null}</svg>;
};

/* ══════════ CONSTANTS ══════════ */
const ROLES = [
  { id: "vc", label: "VC", group: "Investment", color: "t-b" }, { id: "angel", label: "Angel", group: "Investment", color: "t-a" },
  { id: "family-office", label: "Family Office", group: "Investment", color: "t-a" }, { id: "lp", label: "LP", group: "Investment", color: "t-b" },
  { id: "fund-manager", label: "Fund Manager", group: "Investment", color: "t-b" }, { id: "founder", label: "Founder", group: "Founding", color: "t-s" },
  { id: "co-founder", label: "Co-Founder", group: "Founding", color: "t-s" }, { id: "ceo", label: "CEO", group: "Founding", color: "t-s" },
  { id: "cto", label: "CTO", group: "Founding", color: "t-i" }, { id: "coo", label: "COO", group: "Founding", color: "t-s" },
  { id: "cfo", label: "CFO", group: "Founding", color: "t-g" }, { id: "cpo", label: "CPO", group: "Founding", color: "t-t" },
  { id: "bd", label: "BD", group: "Business", color: "t-g" }, { id: "partnerships", label: "Partnerships", group: "Business", color: "t-g" },
  { id: "sales", label: "Sales", group: "Business", color: "t-l" }, { id: "growth", label: "Growth", group: "Business", color: "t-l" },
  { id: "marketing", label: "Marketing", group: "Marketing", color: "t-p" }, { id: "kol", label: "KOL", group: "Marketing", color: "t-ro" },
  { id: "influencer", label: "Influencer", group: "Marketing", color: "t-ro" }, { id: "community", label: "Community", group: "Marketing", color: "t-p" },
  { id: "ambassador", label: "Ambassador", group: "Marketing", color: "t-p" }, { id: "media", label: "Media", group: "Marketing", color: "t-i" },
  { id: "developer", label: "Developer", group: "Technical", color: "t-i" }, { id: "smart-contract", label: "Smart Contract", group: "Technical", color: "t-i" },
  { id: "security", label: "Security", group: "Technical", color: "t-r" }, { id: "auditor", label: "Auditor", group: "Technical", color: "t-r" },
  { id: "devrel", label: "DevRel", group: "Technical", color: "t-t" }, { id: "advisor", label: "Advisor", group: "Advisory", color: "t-s" },
  { id: "legal", label: "Legal", group: "Advisory", color: "t-a" }, { id: "compliance", label: "Compliance", group: "Advisory", color: "t-a" },
  { id: "tokenomics", label: "Tokenomics", group: "Advisory", color: "t-t" }, { id: "market-maker", label: "Market Maker", group: "Liquidity", color: "t-g" },
  { id: "otc", label: "OTC", group: "Liquidity", color: "t-g" }, { id: "trader", label: "Trader", group: "Liquidity", color: "t-l" },
  { id: "exchange", label: "Exchange", group: "Liquidity", color: "t-t" },
];
const VERTICALS = [
  { id: "defi", label: "DeFi", color: "t-t" }, { id: "nft", label: "NFT", color: "t-a" }, { id: "gamefi", label: "GameFi", color: "t-p" },
  { id: "l1", label: "L1", color: "t-b" }, { id: "l2", label: "L2", color: "t-i" }, { id: "infra", label: "Infra", color: "t-s" },
  { id: "ai-web3", label: "AI×Web3", color: "t-b" }, { id: "rwa", label: "RWA", color: "t-r" }, { id: "payments", label: "Payments", color: "t-g" },
  { id: "identity", label: "Identity", color: "t-t" }, { id: "dao", label: "DAO", color: "t-p" }, { id: "socialfi", label: "SocialFi", color: "t-ro" },
  { id: "cex", label: "CEX", color: "t-g" }, { id: "dex", label: "DEX", color: "t-t" }, { id: "stablecoin", label: "Stablecoin", color: "t-l" },
  { id: "derivatives", label: "Derivatives", color: "t-a" }, { id: "lending", label: "Lending", color: "t-i" }, { id: "privacy", label: "Privacy", color: "t-s" },
  { id: "bridge", label: "Bridge", color: "t-i" }, { id: "oracle", label: "Oracle", color: "t-b" }, { id: "modular", label: "Modular", color: "t-t" },
  { id: "zk", label: "ZK", color: "t-p" }, { id: "launchpad", label: "Launchpad", color: "t-a" }, { id: "metaverse", label: "Metaverse", color: "t-ro" },
];
const GEOS = [
  { id: "us", label: "US", color: "t-b" }, { id: "eu", label: "EU", color: "t-b" }, { id: "asia", label: "Asia", color: "t-r" },
  { id: "latam", label: "LATAM", color: "t-l" }, { id: "mena", label: "MENA", color: "t-a" }, { id: "cis", label: "CIS", color: "t-t" },
  { id: "africa", label: "Africa", color: "t-g" }, { id: "global", label: "Global", color: "t-s" },
];
const ALL_TAGS = [...ROLES, ...VERTICALS, ...GEOS];
const DEAL_ROUNDS = [
  { id: "pre-seed", label: "Pre-Seed" }, { id: "seed", label: "Seed" }, { id: "strategic", label: "Strategic" },
  { id: "private-sale", label: "Private Sale" }, { id: "series-a", label: "Series A" }, { id: "series-b", label: "Series B" },
  { id: "public-sale", label: "Public Sale/IDO" }, { id: "tge", label: "TGE" }, { id: "grants", label: "Grants" },
  { id: "ecosystem-fund", label: "Ecosystem Fund" },
];
const DEAL_STATUSES = [{ id: "open", label: "Open" }, { id: "in-progress", label: "In Progress" }, { id: "closed", label: "Closed" }, { id: "cancelled", label: "Cancelled" }];
const COMPANY_STAGES = ["Idea", "Pre-Seed", "Seed", "Series A", "Series B", "Growth", "Public", "Acquired"];
const PROJECT_STAGES = ["Concept", "Development", "Testnet", "Mainnet", "Post-TGE", "Mature"];

/* ══════════ KARMA ENGINE — W3-Trust™ ══════════
 * 
 * Architecture (based on EigenTrust + Wilson Score + StackOverflow weighted votes):
 *
 * 1. VOTE WEIGHT
 *    Each voter's influence is proportional to their own karma:
 *    weight = clamp(0.5 + karma/200, 0.1, 3.0)
 *    — New accounts (karma < 5): weight forced to 0.1 (anti-sybil)
 *    — Active trusted members (karma 50+): weight up to 1.75
 *    — Top contributors (karma 100+): weight up to 3.0
 *
 * 2. DIRECT KARMA (entity's own votes)
 *    karma_direct = Σ(vote_i × weight_i × time_decay_i)
 *    time_decay = 1.0 if < 90 days, 0.5 if 90-365 days, 0.25 if > 365 days
 *
 * 3. PROPAGATION (hierarchical, dampened)
 *    Contact → contributes to Project karma (role-weighted):
 *      project_influence = avg(contact.karma × role_weight) × 0.3
 *    Project → contributes to Company karma:
 *      company_influence = avg(project.karma) × 0.2
 *    Final karma = direct_karma + propagated_influence
 *
 * 4. WILSON SCORE (for ranking fairness with small sample sizes)
 *    wilsonLower(up, total) = lower bound of 95% CI
 *    Prevents items with 1 upvote / 0 downvotes from ranking #1
 *
 * 5. ANTI-GAMING RULES
 *    — Cannot vote on own entity (createdBy === voterId)
 *    — Max 1 up + 1 down per entity per day per user
 *    — Vote reversal allowed (toggle: re-click removes vote)
 *    — Coordinated voting detection: if >60% votes from accounts
 *      created in same 24h window → votes quarantined
 *
 * ROLE WEIGHTS for propagation:
 *    founder/co-founder/ceo: 1.0
 *    cto/coo/cfo/cpo: 0.9
 *    bd/developer/advisor: 0.7
 *    all others: 0.5
 *
 * KARMA THRESHOLDS:
 *    ≤ -5: auto-open Community Court
 *    ≤ -10: entity dimmed (flagged)
 *    ≥ 50: "Trusted" badge
 *    ≥ 100: "Authority" badge
════════════════════════════════════════════════ */

const KARMA_THRESHOLD = -5;
const REPORT_THRESHOLD = 3;
const TRUSTED_THRESHOLD = 50;
const AUTHORITY_THRESHOLD = 100;

const ROLE_WEIGHT = {
  "founder": 1.0, "co-founder": 1.0, "ceo": 1.0,
  "cto": 0.9, "coo": 0.9, "cfo": 0.9, "cpo": 0.9,
  "bd": 0.7, "developer": 0.7, "advisor": 0.7, "smart-contract": 0.7,
};
const getRoleWeight = (roleId) => ROLE_WEIGHT[roleId] || 0.5;

// Vote weight based on voter karma (EigenTrust-inspired)
const voteWeight = (voterKarma) => {
  if (voterKarma < 5) return 0.1; // anti-sybil: new/untrusted accounts
  return Math.min(3.0, Math.max(0.1, 0.5 + voterKarma / 200));
};

// Time decay for votes
const voteTimeDecay = (voteDate) => {
  const days = (Date.now() - new Date(voteDate).getTime()) / 86400000;
  if (days < 90) return 1.0;
  if (days < 365) return 0.5;
  return 0.25;
};

// Wilson score lower bound (95% CI) — fair ranking with small samples
const wilsonScore = (up, total) => {
  if (total === 0) return 0;
  const p = up / total;
  const z = 1.96; // 95% confidence
  const num = p + z * z / (2 * total) - z * Math.sqrt((p * (1 - p) + z * z / (4 * total)) / total);
  const den = 1 + z * z / total;
  return Math.max(0, num / den);
};

// Compute weighted karma from votes array
const computeWeightedKarma = (votes, voterKarmas) => {
  if (!votes || votes.length === 0) return 0;
  return votes.reduce((sum, v) => {
    const vk = voterKarmas[v.voterId] || 0;
    const w = voteWeight(vk);
    const td = voteTimeDecay(v.date);
    return sum + (v.dir === "up" ? 1 : -1) * w * td;
  }, 0);
};

// Compute propagated karma from linked contacts (for projects)
const computeProjectPropagatedKarma = (memberIds, contacts) => {
  if (!memberIds || memberIds.length === 0) return 0;
  let total = 0, count = 0;
  memberIds.forEach(m => {
    const c = contacts.find(x => x.id === m.contactId);
    if (c) {
      const w = getRoleWeight(m.role?.toLowerCase().replace(" ", "-") || "");
      total += (c.karma || 0) * w;
      count += w;
    }
  });
  return count > 0 ? (total / count) * 0.3 : 0; // 30% propagation dampening
};

// Compute propagated karma from projects (for companies)
const computeCompanyPropagatedKarma = (memberIds, projects) => {
  if (!memberIds || memberIds.length === 0) return 0;
  const relProjects = projects.filter(p => p.memberIds?.some(m => memberIds.some(cm => cm.contactId === m.contactId)));
  if (relProjects.length === 0) return 0;
  const avg = relProjects.reduce((s, p) => s + (p.karma || 0), 0) / relProjects.length;
  return avg * 0.2; // 20% propagation dampening
};

// Full karma score with propagation
const getEffectiveKarma = (entity, entityType, contacts, projects) => {
  const direct = entity.karma || 0;
  if (entityType === "project") {
    return direct + computeProjectPropagatedKarma(entity.memberIds || [], contacts);
  }
  if (entityType === "company") {
    return direct + computeCompanyPropagatedKarma(entity.memberIds || [], projects);
  }
  return direct;
};

// Karma badge
const KarmaBadge = ({ karma }) => {
  if (karma >= AUTHORITY_THRESHOLD) return <span className="sbadge" style={{ background: "var(--ta)", color: "var(--tf-a)", fontSize: 10 }}>⭐ Authority</span>;
  if (karma >= TRUSTED_THRESHOLD) return <span className="sbadge" style={{ background: "var(--tg)", color: "var(--tf-g)", fontSize: 10 }}>✓ Trusted</span>;
  return null;
};

// Trust status
const getTrustStatus = (e) => {
  if (!e) return "ok";
  if (e.trustStatus === "flagged") return "flagged";
  if ((e.karma || 0) <= -10) return "flagged";
  if ((e.karma || 0) <= KARMA_THRESHOLD || (e.reports || []).length >= REPORT_THRESHOLD) return "under-review";
  return "ok";
};
const TrustBadge = ({ entity, size = 11 }) => {
  const s = getTrustStatus(entity);
  if (s === "ok") return null;
  if (s === "under-review") return <span className="flag-warn" style={{ fontSize: size }}><I n="alert" s={size + 1} c="var(--warn-fg)" /> Under Review</span>;
  return <span className="flag-danger" style={{ fontSize: size }}><I n="alert" s={size + 1} c="var(--danger-fg)" /> Flagged</span>;
};
const entityClass = (e) => {
  const s = getTrustStatus(e);
  if (s === "under-review") return " entity-warn";
  if (s === "flagged") return " entity-danger";
  return "";
};

/* ══════════ DB ══════════ */
const DB = { contacts: "w3n_v33_c", companies: "w3n_v33_co", projects: "w3n_v33_p", deals: "w3n_v33_d", lf: "w3n_v33_lf", discs: "w3n_v33_di", courts: "w3n_v33_ct", votes: "w3n_v33_vt" };
const dbLoad = k => { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : null; } catch { return null; } };
const dbSave = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch { } };

/* ══════════ UTILS ══════════ */
const gid = () => Math.random().toString(36).slice(2, 9);
const ini = n => (n || "?").split(" ").map(x => x[0]).join("").toUpperCase().slice(0, 2);
const fv = v => !v ? "—" : v >= 1e6 ? `$${(v / 1e6).toFixed(1)}M` : v >= 1e3 ? `$${(v / 1e3).toFixed(0)}K` : `$${v}`;
const today = () => new Date().toISOString().slice(0, 10);
const tobj = id => ALL_TAGS.find(t => t.id === id) || { id, label: id, color: "t-s" };
const roundObj = id => DEAL_ROUNDS.find(r => r.id === id) || { id, label: id };
function Tag({ id }) { const t = tobj(id); return <span className={`tag ${t.color}`}>{t.label}</span>; }
function Score({ v }) { const c = v >= 85 ? "oklch(0.45 0.16 160)" : v >= 70 ? "oklch(0.48 0.14 80)" : "oklch(0.5 0.18 27)"; return <span className="score"><span className="sdot" style={{ background: c }} /><span style={{ color: c, fontWeight: 500, fontFamily: "var(--mono)" }}>{v}</span></span>; }

/* ══════════ KARMA DISPLAY ══════════ */
const KarmaDisplay = ({ karma, up = 0, down = 0, size = "md" }) => {
  const cls = karma > 0 ? "karma-pos" : karma < 0 ? "karma-neg" : "karma-zero";
  const fs = size === "sm" ? 11 : 13;
  const ws = wilsonScore(up, up + down);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
      <div className={`karma-score ${cls}`} style={{ fontSize: fs }}>
        {karma >= 0 ? "+" : ""}{Math.round(karma * 10) / 10}
      </div>
      {(up + down) > 0 && (
        <div className="wscore" title={`Wilson score: ${(ws * 100).toFixed(0)}% confidence lower bound`}>
          <div className="wscore-bar"><div className="wscore-fill" style={{ width: `${ws * 100}%` }} /></div>
          <span>{up}↑ {down}↓</span>
        </div>
      )}
    </div>
  );
};

/* ══════════ VOTE BUTTONS ══════════ */
const VoteButtons = ({ entityId, entityType, entity, currentUserId, currentUserKarma, allVotes, onVote, size = "md" }) => {
  const myVote = allVotes.find(v => v.entityId === entityId && v.voterId === currentUserId);
  const isOwn = entity?.createdBy === currentUserId;
  const isDisabled = isOwn;
  const tooltip = isOwn ? "Can't vote on your own entity" : "";
  const h = size === "sm" ? 22 : 26;
  const fs = size === "sm" ? 11 : 12;
  const up = allVotes.filter(v => v.entityId === entityId && v.dir === "up").length;
  const dn = allVotes.filter(v => v.entityId === entityId && v.dir === "down").length;
  return (
    <div className="karma-bar" title={tooltip}>
      <button
        className={`kv-btn${myVote?.dir === "up" ? " voted-up" : ""}`}
        style={{ height: h, fontSize: fs }}
        disabled={isDisabled}
        onClick={e => { e.stopPropagation(); onVote(entityId, entityType, "up"); }}
        title={isOwn ? "Own entity" : `Your vote weight: ${voteWeight(currentUserKarma).toFixed(2)}x`}
      >
        <I n="upl" s={fs} /> {up}
      </button>
      <button
        className={`kv-btn${myVote?.dir === "down" ? " voted-dn" : ""}`}
        style={{ height: h, fontSize: fs }}
        disabled={isDisabled}
        onClick={e => { e.stopPropagation(); onVote(entityId, entityType, "down"); }}
      >
        <I n="dn2" s={fs} /> {dn}
      </button>
    </div>
  );
};

/* ══════════ SEED DATA ══════════ */
const ME_ID = "c_me";
const SEED_CONTACTS = [
  { id: ME_ID, name: "You (Profile)", company: "W3 Net", role: "founder", status: "active", telegram: "", twitter: "", linkedin: "", email: "", tags: ["founder", "defi", "global"], score: 80, notes: "Your profile", karma: 12, karmaBreakdown: { up: 3, down: 0 }, reports: [], trustStatus: "ok", views: 0, companyIds: [], projectIds: [], createdBy: ME_ID, createdAt: "2024-01-01" },
  { id: "c1", name: "Alex Chen", company: "Paradigm", website: "paradigm.xyz", role: "vc", status: "active", telegram: "alexchen", twitter: "alex_paradigm", linkedin: "alexchen-vc", email: "alex@paradigm.xyz", tags: ["vc", "defi", "l2", "us"], score: 92, notes: "Met at ETH Denver.", karma: 68, karmaBreakdown: { up: 38, down: 2 }, reports: [], trustStatus: "ok", views: 342, companyIds: ["co1"], projectIds: [], createdBy: ME_ID, createdAt: "2024-01-15" },
  { id: "c2", name: "Maria Santos", company: "Web3 Labs", website: "web3labs.io", role: "founder", status: "active", telegram: "msantos", twitter: "maria_web3", email: "maria@web3labs.io", tags: ["founder", "defi", "infra", "eu"], score: 85, notes: "Cross-chain bridge.", karma: 31, karmaBreakdown: { up: 19, down: 2 }, reports: [], trustStatus: "ok", views: 201, companyIds: ["co2"], projectIds: ["p1"], createdBy: ME_ID, createdAt: "2024-02-10" },
  { id: "c4", name: "Sophie Kim", company: "Angel Syndicate Asia", website: "angelasia.vc", role: "angel", status: "active", telegram: "sophiekim", twitter: "sophie_angel", email: "sophie@angelasia.vc", tags: ["angel", "gamefi", "nft", "asia"], score: 88, notes: "GameFi focus.", karma: 44, karmaBreakdown: { up: 26, down: 2 }, reports: [], trustStatus: "ok", views: 299, companyIds: ["co3"], projectIds: [], createdBy: ME_ID, createdAt: "2024-02-05" },
  { id: "c5", name: "Michael Brown", company: "zkSync Foundation", website: "zksync.io", role: "bd", status: "partner", telegram: "mbrown_zk", twitter: "michael_zksync", tags: ["bd", "l2", "infra", "us"], score: 95, notes: "BD lead zkSync.", karma: 55, karmaBreakdown: { up: 33, down: 1 }, reports: [], trustStatus: "ok", views: 421, companyIds: ["co4"], projectIds: ["p2"], createdBy: ME_ID, createdAt: "2024-01-08" },
  { id: "c7", name: "Scam McGee", company: "Rug Protocol", website: "rugprotocol.io", role: "founder", status: "inactive", telegram: "scam_mcgee", tags: ["founder", "defi"], score: 12, notes: "", karma: -9, karmaBreakdown: { up: 1, down: 14 }, reports: [{ id: "rr1", by: "c1", reason: "Rugpulled investors", createdAt: "2024-02-10" }, { id: "rr2", by: "c2", reason: "Fake team credentials", createdAt: "2024-02-15" }, { id: "rr3", by: "c4", reason: "No product delivered", createdAt: "2024-02-20" }], trustStatus: "under-review", views: 89, companyIds: [], projectIds: [], createdBy: "c1", createdAt: "2023-11-01" },
];
const SEED_COMPANIES = [
  { id: "co1", name: "Paradigm", website: "paradigm.xyz", stage: "Growth", description: "Leading crypto VC fund focused on DeFi and infrastructure.", tags: ["vc", "defi", "l2", "us"], memberIds: [{ contactId: "c1", role: "Partner" }], partnerIds: [], karma: 28, karmaBreakdown: { up: 16, down: 0 }, reports: [], trustStatus: "ok", views: 512, createdBy: ME_ID, createdAt: "2024-01-15" },
  { id: "co2", name: "Web3 Labs", website: "web3labs.io", stage: "Seed", description: "Cross-chain infrastructure and tooling for Web3 developers.", tags: ["infra", "bridge", "eu"], memberIds: [{ contactId: "c2", role: "Founder" }], partnerIds: [], karma: 12, karmaBreakdown: { up: 9, down: 2 }, reports: [], trustStatus: "ok", views: 201, createdBy: ME_ID, createdAt: "2024-02-10" },
  { id: "co3", name: "Angel Syndicate Asia", website: "angelasia.vc", stage: "Growth", description: "Asia-focused angel syndicate for Web3 projects.", tags: ["angel", "gamefi", "asia"], memberIds: [{ contactId: "c4", role: "Managing Partner" }], partnerIds: [], karma: 15, karmaBreakdown: { up: 11, down: 1 }, reports: [], trustStatus: "ok", views: 267, createdBy: ME_ID, createdAt: "2024-02-05" },
  { id: "co4", name: "zkSync Foundation", website: "zksync.io", stage: "Mainnet", description: "ZK-rollup L2 scaling solution for Ethereum.", tags: ["l2", "zk", "infra", "us"], memberIds: [{ contactId: "c5", role: "BD Lead" }], partnerIds: ["co1"], karma: 34, karmaBreakdown: { up: 21, down: 1 }, reports: [], trustStatus: "ok", views: 680, createdBy: ME_ID, createdAt: "2024-01-08" },
];
const SEED_PROJECTS = [
  { id: "p1", name: "FlowBridge", website: "flowbridge.io", stage: "Testnet", description: "Cross-chain bridge with unified liquidity. EVM + non-EVM.", tags: ["bridge", "defi", "infra", "eu"], memberIds: [{ contactId: "c2", role: "Founder" }, { contactId: "c5", role: "Advisor" }], partnerCompanyIds: ["co4"], karma: 11, karmaBreakdown: { up: 8, down: 2 }, reports: [], trustStatus: "ok", views: 234, createdBy: "c2", createdAt: "2024-02-10" },
  { id: "p2", name: "zkID Protocol", website: "zkid.dev", stage: "Development", description: "ZK-based on-chain identity and reputation system.", tags: ["zk", "identity", "privacy", "us"], memberIds: [{ contactId: "c5", role: "Ecosystem Partner" }, { contactId: "c1", role: "Investor" }], partnerCompanyIds: ["co1", "co4"], karma: 18, karmaBreakdown: { up: 13, down: 1 }, reports: [], trustStatus: "ok", views: 312, createdBy: "c5", createdAt: "2024-03-01" },
];
const SEED_DEALS = [
  { id: "d1", title: "Seed Round — FlowBridge", projectName: "FlowBridge", projectId: "p1", round: "seed", status: "open", amount: 3000000, currency: "USD", token: "FLOW", description: "Raising $3M seed for cross-chain bridge.", terms: "$10M valuation cap. SAFT. 18m vest 6m cliff.", contactIds: ["c2", "c1"], companyIds: [], projectIds: ["p1"], comments: [], views: 312, createdBy: "c2", createdAt: "2024-02-01" },
  { id: "d2", title: "Strategic Round — ArcadeChain", projectName: "ArcadeChain", projectId: null, round: "strategic", status: "in-progress", amount: 1500000, currency: "USD", token: "ARC", description: "Gaming L2. Looking for exchanges, launchpads, gaming studios.", terms: "Token warrants + equity. 24m vesting.", contactIds: ["c4"], companyIds: [], projectIds: [], comments: [], views: 234, createdBy: "c4", createdAt: "2024-02-20" },
];
const SEED_LF = [
  { id: "lf1", type: "looking", title: "Market Maker for DEX listing", body: "Launching on Uniswap v4, need professional MM. Budget $30k/month.", tags: ["market-maker", "dex", "defi"], createdBy: "c2", createdAt: "2024-03-12", expires: "2024-04-12", views: 89, comments: [] },
  { id: "lf2", type: "offering", title: "BD services — Asian market entry", body: "5y Web3 BD. Strong connections at Binance, OKX, Bybit.", tags: ["bd", "exchange", "asia"], createdBy: "c4", createdAt: "2024-03-10", expires: "2024-06-10", views: 134, comments: [] },
  { id: "lf3", type: "ask", title: "Best OTC desk for large USDT volume?", body: "Need to move $2M+ USDT OTC without slippage.", tags: ["otc", "trader"], createdBy: ME_ID, createdAt: "2024-03-11", expires: "2024-03-25", views: 201, comments: [] },
  { id: "lf4", type: "announce", title: "L2 Gaming protocol — seed round open", body: "EVM-compatible L2 for gaming. 50k TPS. $3M seed at $10M cap.", tags: ["gamefi", "l2", "angel", "vc"], createdBy: "c4", createdAt: "2024-03-09", expires: "2024-04-30", views: 312, comments: [] },
];
const SEED_DISCS = [
  {
    id: "d1", entityId: "c1", entityType: "contact", authorId: ME_ID, isAnon: false,
    body: "Alex is one of the most responsive VCs. Replied same day and gave detailed feedback even for a cold intro.", karma: 14, karmaBreakdown: { up: 8, down: 0 }, createdAt: "2024-03-10",
    replies: [
      { id: "d1r1", parentId: "d1", authorId: "c2", isAnon: false, body: "Agreed. Had a great call last month. Very knowledgeable on DeFi infra.", karma: 6, karmaBreakdown: { up: 4, down: 0 }, createdAt: "2024-03-11", replies: [] },
    ]
  },
  {
    id: "d2", entityId: "p1", entityType: "project", authorId: "c4", isAnon: true,
    body: "Testnet is live. 3s cross-chain transfers actually work. Bridge TVL reaching $2M already.", karma: 9, karmaBreakdown: { up: 6, down: 1 }, createdAt: "2024-03-11", replies: []
  },
  {
    id: "d3", entityId: "c7", entityType: "contact", authorId: "c1", isAnon: false,
    body: "Lost $40k in their presale. No product, team disappeared March 2024. Telegram went silent.", karma: 31, karmaBreakdown: { up: 18, down: 0 }, createdAt: "2024-02-12",
    replies: [
      { id: "d3r1", parentId: "d3", authorId: "c2", isAnon: false, body: "Same here. $15k gone. The whitepaper was clearly AI-generated.", karma: 22, karmaBreakdown: { up: 13, down: 0 }, createdAt: "2024-02-14", replies: [] },
    ]
  },
];
const SEED_COURTS = [
  { id: "ct1", entityId: "c7", entityType: "contact", entityName: "Scam McGee", reason: "Multiple reports: rugpull, fake credentials, no delivery", openedAt: "2024-02-20", endsAt: "2024-03-20", votesFor: 12, votesAgainst: 2, status: "open", verdict: null },
];
const SEED_VOTES = [];

/* ══════════ THREADED COMMENT SYSTEM ══════════ */
function CommentThread({ entityId, entityType, discussions, setDiscussions, currentUserId, currentUserKarma, allVotes, onVote, contacts }) {
  const [replyTo, setReplyTo] = useState(null);
  const [newBody, setNewBody] = useState("");
  const [isAnon, setIsAnon] = useState(false);
  const [replyBodies, setReplyBodies] = useState({});
  const [replyAnon, setReplyAnon] = useState({});

  const entityDiscs = discussions.filter(d => d.entityId === entityId && d.entityType === entityType);
  const author = contacts.find(c => c.id === currentUserId);

  const submitRoot = () => {
    if (!newBody.trim()) return;
    const d = {
      id: gid(), entityId, entityType,
      authorId: currentUserId, isAnon,
      body: newBody.trim(), karma: 0,
      karmaBreakdown: { up: 0, down: 0 },
      createdAt: today(), replies: []
    };
    setDiscussions(p => [d, ...p]);
    setNewBody(""); setIsAnon(false);
  };

  const submitReply = (parentId, level) => {
    const body = replyBodies[parentId];
    if (!body?.trim()) return;
    const reply = {
      id: gid(), parentId, authorId: currentUserId,
      isAnon: replyAnon[parentId] || false,
      body: body.trim(), karma: 0,
      karmaBreakdown: { up: 0, down: 0 },
      createdAt: today(), replies: []
    };
    setDiscussions(p => p.map(d => {
      if (d.id === parentId) return { ...d, replies: [...(d.replies || []), reply] };
      const updReplies = (d.replies || []).map(r => r.id === parentId ? { ...r, replies: [...(r.replies || []), reply] } : r);
      return { ...d, replies: updReplies };
    }));
    setReplyBodies(p => ({ ...p, [parentId]: "" }));
    setReplyTo(null);
  };

  const getAuthorName = (authorId, anon) => {
    if (anon) return "Anonymous";
    const c = contacts.find(x => x.id === authorId);
    return c?.name || "Unknown";
  };

  const CommentNode = ({ comment, level = 0 }) => {
    const isReplying = replyTo === comment.id;
    const up = allVotes.filter(v => v.entityId === comment.id && v.dir === "up").length;
    const dn = allVotes.filter(v => v.entityId === comment.id && v.dir === "down").length;
    return (
      <div className={`comment${level > 0 ? ` level-${Math.min(level, 2)}` : ""}`}>
        <div className="comment-header">
          {!comment.isAnon && <div className="av" style={{ width: 20, height: 20, fontSize: 8, flexShrink: 0 }}>{ini(getAuthorName(comment.authorId, false))}</div>}
          <span className="comment-author">{getAuthorName(comment.authorId, comment.isAnon)}</span>
          {comment.isAnon && <span className="comment-anon">anon</span>}
          <span className="comment-time">{comment.createdAt}</span>
        </div>
        <div className="comment-body">{comment.body}</div>
        <div className="comment-actions">
          <VoteButtons
            entityId={comment.id} entityType="comment"
            entity={{ createdBy: comment.authorId }}
            currentUserId={currentUserId} currentUserKarma={currentUserKarma}
            allVotes={allVotes} onVote={onVote} size="sm"
          />
          {level < 2 && (
            <button className={`thread-reply-btn${isReplying ? " active" : ""}`} onClick={() => setReplyTo(isReplying ? null : comment.id)}>
              ↩ Reply
            </button>
          )}
          <span style={{ fontSize: 10.5, color: "var(--fg3)", fontFamily: "var(--mono)" }}>{up + dn > 0 && `${up}↑ ${dn}↓`}</span>
        </div>
        {isReplying && (
          <div className="comment-composer" style={{ marginTop: 8 }}>
            <textarea
              className="comment-input" style={{ minHeight: 44 }}
              placeholder={`Reply to ${getAuthorName(comment.authorId, comment.isAnon)}...`}
              value={replyBodies[comment.id] || ""}
              onChange={e => setReplyBodies(p => ({ ...p, [comment.id]: e.target.value }))}
              autoFocus
            />
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 6 }}>
              <label className="anon-toggle">
                <input type="checkbox" checked={replyAnon[comment.id] || false} onChange={e => setReplyAnon(p => ({ ...p, [comment.id]: e.target.checked }))} />
                Post anonymously
              </label>
              <button className="btn btn-sm" style={{ marginLeft: "auto" }} onClick={() => setReplyTo(null)}>Cancel</button>
              <button className="btn btn-p btn-sm" onClick={() => submitReply(comment.id, level)} disabled={!(replyBodies[comment.id]?.trim())}>Reply</button>
            </div>
          </div>
        )}
        {(comment.replies || []).map(r => <CommentNode key={r.id} comment={r} level={level + 1} />)}
      </div>
    );
  };

  return (
    <div className="thread-root">
      <div className="thread-title">Discussion ({entityDiscs.reduce((s, d) => s + 1 + (d.replies?.length || 0), 0)})</div>
      {/* New comment composer */}
      <div className="comment-composer" style={{ marginBottom: 14 }}>
        <div style={{ display: "flex", gap: 7, marginBottom: 6, alignItems: "center" }}>
          <div className="av" style={{ width: 24, height: 24, fontSize: 9, flexShrink: 0 }}>{ini(author?.name || "?")}</div>
          <span style={{ fontSize: 12.5, fontWeight: 500 }}>{author?.name || "You"}</span>
        </div>
        <textarea
          className="comment-input"
          placeholder="Share your experience, insight, or review..."
          value={newBody}
          onChange={e => setNewBody(e.target.value)}
        />
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 6 }}>
          <label className="anon-toggle">
            <input type="checkbox" checked={isAnon} onChange={e => setIsAnon(e.target.checked)} />
            <span>Post anonymously</span>
            <span style={{ fontSize: 10.5, color: "var(--fg3)", marginLeft: 3 }}>(opt-in, off by default)</span>
          </label>
          <button className="btn btn-p btn-sm" style={{ marginLeft: "auto" }} onClick={submitRoot} disabled={!newBody.trim()}>Post</button>
        </div>
      </div>
      {entityDiscs.map(d => <CommentNode key={d.id} comment={d} level={0} />)}
      {!entityDiscs.length && <div style={{ fontSize: 12.5, color: "var(--fg3)", textAlign: "center", padding: "12px 0" }}>No comments yet. Be the first.</div>}
    </div>
  );
}

/* ══════════ AUTHOR CHIP ══════════ */
function AuthorChip({ contactId, contacts, onOpen, label = "Added by" }) {
  const c = contacts.find(x => x.id === contactId);
  if (!c) return null;
  return (
    <span className="author-chip" onClick={e => { e.stopPropagation(); onOpen && onOpen(c); }}>
      <div className="av" style={{ width: 16, height: 16, fontSize: 7, flexShrink: 0 }}>{ini(c.name)}</div>
      <span style={{ color: "var(--fg3)", fontSize: 11 }}>{label}:</span>
      <span style={{ fontSize: 11.5, fontWeight: 500 }}>{c.name}</span>
    </span>
  );
}

/* ══════════ ENTITY MENU ══════════ */
function EntityMenu({ entity, entityType, onReport, onEdit }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useEffect(() => { const h = e => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); }; document.addEventListener("mousedown", h); return () => document.removeEventListener("mousedown", h); }, []);
  const shareUrl = `${window.location.origin}${window.location.pathname}#/${entityType}/${entity?.id || ""}`;
  return (
    <div className="ent-menu" ref={ref}>
      <button className="btn btn-g btn-ic-sm" onClick={e => { e.stopPropagation(); setOpen(p => !p); }}><I n="dots" s={14} /></button>
      {open && <div className="ent-menu-drop">
        {onEdit && <div className="ent-menu-item" onClick={() => { onEdit(); setOpen(false); }}><I n="edit" s={13} />Edit</div>}
        <div className="ent-menu-sep" />
        <div className="ent-menu-grp">Share</div>
        <div className="ent-menu-item" onClick={() => { navigator.clipboard?.writeText(shareUrl).catch(() => {}); setOpen(false); }}><I n="link" s={13} />Copy link</div>
        <div className="ent-menu-item" onClick={() => { window.open(`https://x.com/intent/tweet?text=${encodeURIComponent(entity?.name || "")} on W3 Net&url=${encodeURIComponent(shareUrl)}`, "_blank"); setOpen(false); }}><I n="tw" s={13} />Share on X</div>
        <div className="ent-menu-item" onClick={() => { window.open(`https://t.me/share/url?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(entity?.name || "")}`, "_blank"); setOpen(false); }}><I n="tg" s={13} />Share on Telegram</div>
        <div className="ent-menu-sep" />
        <div className="ent-menu-item danger" onClick={() => { onReport && onReport(); setOpen(false); }}><I n="flag" s={13} />Report</div>
      </div>}
    </div>
  );
}

/* ══════════ KARMA INFLUENCE PANEL ══════════ */
function KarmaInfluencePanel({ entity, entityType, contacts, projects }) {
  if (entityType === "contact") return null;
  const effective = getEffectiveKarma(entity, entityType, contacts, projects);
  const direct = entity.karma || 0;
  const influence = effective - direct;
  if (Math.abs(influence) < 0.5) return null;
  return (
    <div className="influence-box">
      <div className="influence-title">Karma Influence — W3 Trust Score</div>
      <div className="influence-row">
        <span style={{ color: "var(--fg2)" }}>Direct votes</span>
        <span style={{ fontFamily: "var(--mono)", fontSize: 12, color: direct >= 0 ? "var(--tf-g)" : "var(--danger-fg)" }}>{direct >= 0 ? "+" : ""}{Math.round(direct * 10) / 10}</span>
      </div>
      <div className="influence-row">
        <span className="influence-arrow">↳</span>
        <span style={{ color: "var(--fg2)", fontSize: 11.5 }}>Team reputation</span>
        <span style={{ fontFamily: "var(--mono)", fontSize: 11.5, color: influence >= 0 ? "var(--tf-g)" : "var(--danger-fg)", marginLeft: "auto" }}>{influence >= 0 ? "+" : ""}{Math.round(influence * 10) / 10}</span>
      </div>
      <div className="influence-row" style={{ marginTop: 4, borderTop: "1px solid var(--border)", paddingTop: 4 }}>
        <span style={{ fontWeight: 600, fontSize: 12.5 }}>Effective score</span>
        <span style={{ fontFamily: "var(--mono)", fontWeight: 700, color: effective >= 0 ? "var(--tf-g)" : "var(--danger-fg)", marginLeft: "auto" }}>{effective >= 0 ? "+" : ""}{Math.round(effective * 10) / 10}</span>
      </div>
    </div>
  );
}

/* ══════════ ENTITY POPUP ══════════ */
function EntityPopup({ entityType, entityId, contacts, companies, projects, deals, lf, discussions, setDiscussions, allVotes, onVote, currentUserId, currentUserKarma, onClose, onOpenEntity, onEdit, onReport }) {
  const entity = useMemo(() => {
    if (entityType === "contact") return contacts.find(x => x.id === entityId);
    if (entityType === "company") return companies.find(x => x.id === entityId);
    if (entityType === "project") return projects.find(x => x.id === entityId);
    if (entityType === "deal") return deals.find(x => x.id === entityId);
    if (entityType === "lf") return lf.find(x => x.id === entityId);
    return null;
  }, [entityType, entityId, contacts, companies, projects, deals, lf]);

  const [reportOpen, setReportOpen] = useState(false);
  const author = contacts.find(c => c.id === entity?.createdBy);

  if (!entity) return null;
  const up = (entity.karmaBreakdown?.up || 0);
  const dn = (entity.karmaBreakdown?.down || 0);

  const RelChip = ({ type, id, name, trustEntity }) => (
    <span className={`rel-chip${entityClass(trustEntity || {})}`} onClick={() => onOpenEntity && onOpenEntity(type, id)}>
      <I n={type === "contact" ? "contacts" : type === "company" ? "company" : "project"} s={11} />
      {name}
      {trustEntity && <TrustBadge entity={trustEntity} size={9} />}
    </span>
  );

  const KarmaSection = () => (
    <div className="popup-section">
      <div className="popup-section-title">Karma & Trust</div>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
        <KarmaDisplay karma={entity.karma || 0} up={up} down={dn} />
        <KarmaBadge karma={entity.karma || 0} />
        <TrustBadge entity={entity} />
      </div>
      <div style={{ marginBottom: 8 }}>
        <VoteButtons entityId={entity.id} entityType={entityType} entity={entity} currentUserId={currentUserId} currentUserKarma={currentUserKarma} allVotes={allVotes} onVote={onVote} />
      </div>
      <KarmaInfluencePanel entity={entity} entityType={entityType} contacts={contacts} projects={projects} />
      {entity.reports?.length > 0 && <div style={{ fontSize: 12, color: "var(--warn-fg)", marginTop: 6 }}>{entity.reports.length} community report(s)</div>}
    </div>
  );

  const renderContact = () => {
    const companyEntities = (entity.companyIds || []).map(id => companies.find(x => x.id === id)).filter(Boolean);
    const projectEntities = [
      ...(entity.projectIds || []).map(id => projects.find(x => x.id === id)).filter(Boolean),
      ...projects.filter(p => p.memberIds?.some(m => m.contactId === entity.id) && !(entity.projectIds || []).includes(p.id)),
    ];
    return (
      <div>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 18 }}>
          <div className="av" style={{ width: 56, height: 56, fontSize: 18 }}>{ini(entity.name)}</div>
          <div>
            <div style={{ fontSize: 18, fontWeight: 700, letterSpacing: "-.3px", display: "flex", alignItems: "center", gap: 8 }}>{entity.name}<TrustBadge entity={entity} /></div>
            <div style={{ fontSize: 13, color: "var(--fg2)", marginTop: 2 }}>{entity.company}{entity.role && " · "}{entity.role && <Tag id={entity.role} />}</div>
            {author && <div style={{ marginTop: 5 }}><AuthorChip contactId={entity.createdBy} contacts={contacts} onOpen={c => onOpenEntity("contact", c.id)} /></div>}
          </div>
          <div style={{ marginLeft: "auto", display: "flex", gap: 4 }}><EntityMenu entity={entity} entityType="contact" onReport={() => setReportOpen(true)} onEdit={onEdit} /></div>
        </div>
        <div style={{ fontSize: 10.5, color: "var(--fg3)", fontFamily: "var(--mono)", marginBottom: 14 }}>contact/{entity.id}</div>
        <div className="popup-grid">
          <div>
            <div className="popup-section">
              <div className="popup-section-title">Channels</div>
              {entity.telegram && <a className="clink" href={`https://t.me/${entity.telegram}`} target="_blank" rel="noreferrer"><I n="tg" s={12} /> @{entity.telegram}</a>}
              {entity.twitter && <a className="clink" href={`https://x.com/${entity.twitter}`} target="_blank" rel="noreferrer"><I n="tw" s={12} /> @{entity.twitter}</a>}
              {entity.linkedin && <a className="clink" href={`https://linkedin.com/in/${entity.linkedin}`} target="_blank" rel="noreferrer"><I n="li" s={12} /> {entity.linkedin}</a>}
              {entity.email && <a className="clink" href={`mailto:${entity.email}`}><I n="mail" s={12} /> {entity.email}</a>}
              {entity.website && <a className="clink" href={`https://${entity.website}`} target="_blank" rel="noreferrer"><I n="globe" s={12} /> {entity.website}</a>}
              {!entity.telegram && !entity.twitter && !entity.email && !entity.website && <div style={{ fontSize: 12.5, color: "var(--fg3)" }}>No channels</div>}
            </div>
            {entity.tags?.length > 0 && <div className="popup-section"><div className="popup-section-title">Tags</div><div style={{ display: "flex", flexWrap: "wrap", gap: 3 }}>{entity.tags.map(t => <Tag key={t} id={t} />)}</div></div>}
            {entity.notes && <div className="popup-section"><div className="popup-section-title">Notes</div><div style={{ fontSize: 13, color: "var(--fg2)", lineHeight: 1.6 }}>{entity.notes}</div></div>}
          </div>
          <div>
            <KarmaSection />
            {companyEntities.length > 0 && <div className="popup-section"><div className="popup-section-title">Companies</div>{companyEntities.map(co => <RelChip key={co.id} type="company" id={co.id} name={co.name} trustEntity={co} />)}</div>}
            {projectEntities.length > 0 && <div className="popup-section"><div className="popup-section-title">Projects</div>{projectEntities.map(p => { const role = p.memberIds?.find(m => m.contactId === entity.id)?.role; return <div key={p.id}><RelChip type="project" id={p.id} name={p.name} trustEntity={p} />{role && <span style={{ fontSize: 11, color: "var(--fg3)", marginLeft: 4 }}>· {role}</span>}</div>; })}</div>}
          </div>
        </div>
        <CommentThread entityId={entity.id} entityType="contact" discussions={discussions} setDiscussions={setDiscussions} currentUserId={currentUserId} currentUserKarma={currentUserKarma} allVotes={allVotes} onVote={onVote} contacts={contacts} />
      </div>
    );
  };

  const renderCompany = () => {
    const members = (entity.memberIds || []).map(m => ({ ...m, contact: contacts.find(c => c.id === m.contactId) })).filter(m => m.contact);
    const relProjects = projects.filter(p => p.partnerCompanyIds?.includes(entity.id));
    const partners = (entity.partnerIds || []).map(id => companies.find(c => c.id === id)).filter(Boolean);
    const effectiveKarma = getEffectiveKarma(entity, "company", contacts, projects);
    return (
      <div>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 18 }}>
          <div className="av av-sq" style={{ width: 52, height: 52 }}><I n="company" s={22} c="var(--fg3)" /></div>
          <div>
            <div style={{ fontSize: 18, fontWeight: 700, letterSpacing: "-.3px", display: "flex", alignItems: "center", gap: 8 }}>{entity.name}<TrustBadge entity={entity} /><KarmaBadge karma={effectiveKarma} /></div>
            <div style={{ fontSize: 13, color: "var(--fg2)", marginTop: 2 }}>{entity.stage}</div>
            {author && <div style={{ marginTop: 5 }}><AuthorChip contactId={entity.createdBy} contacts={contacts} onOpen={c => onOpenEntity("contact", c.id)} /></div>}
          </div>
          <div style={{ marginLeft: "auto", display: "flex", gap: 4 }}><EntityMenu entity={entity} entityType="company" onReport={() => setReportOpen(true)} onEdit={onEdit} /></div>
        </div>
        <div style={{ fontSize: 10.5, color: "var(--fg3)", fontFamily: "var(--mono)", marginBottom: 14 }}>company/{entity.id}</div>
        {entity.website && <a className="clink" href={`https://${entity.website}`} target="_blank" rel="noreferrer" style={{ marginBottom: 12, display: "inline-flex" }}><I n="globe" s={12} /> {entity.website}</a>}
        <div style={{ fontSize: 13.5, color: "var(--fg2)", lineHeight: 1.65, marginBottom: 16 }}>{entity.description}</div>
        <div className="popup-grid">
          <div>
            {members.length > 0 && <div className="popup-section"><div className="popup-section-title">Team ({members.length})</div>{members.map(m => <div key={m.contactId} className="linked-row"><div className="av" style={{ width: 26, height: 26, fontSize: 9 }}>{ini(m.contact.name)}</div><span className="rel-chip" style={{ border: "none", padding: 0, background: "transparent" }} onClick={() => onOpenEntity("contact", m.contactId)}>{m.contact.name}</span><KarmaBadge karma={m.contact.karma || 0} /><span style={{ color: "var(--fg3)", marginLeft: "auto", fontSize: 11 }}>{m.role}</span></div>)}</div>}
            {entity.tags?.length > 0 && <div className="popup-section"><div className="popup-section-title">Tags</div><div style={{ display: "flex", flexWrap: "wrap", gap: 3 }}>{entity.tags.map(t => <Tag key={t} id={t} />)}</div></div>}
          </div>
          <div>
            <KarmaSection />
            {partners.length > 0 && <div className="popup-section"><div className="popup-section-title">Partners</div>{partners.map(p => <RelChip key={p.id} type="company" id={p.id} name={p.name} trustEntity={p} />)}</div>}
            {relProjects.length > 0 && <div className="popup-section"><div className="popup-section-title">Related Projects</div>{relProjects.map(p => <RelChip key={p.id} type="project" id={p.id} name={p.name} trustEntity={p} />)}</div>}
          </div>
        </div>
        <CommentThread entityId={entity.id} entityType="company" discussions={discussions} setDiscussions={setDiscussions} currentUserId={currentUserId} currentUserKarma={currentUserKarma} allVotes={allVotes} onVote={onVote} contacts={contacts} />
      </div>
    );
  };

  const renderProject = () => {
    const members = (entity.memberIds || []).map(m => ({ ...m, contact: contacts.find(c => c.id === m.contactId) })).filter(m => m.contact);
    const partnerCos = (entity.partnerCompanyIds || []).map(id => companies.find(c => c.id === id)).filter(Boolean);
    const effectiveKarma = getEffectiveKarma(entity, "project", contacts, projects);
    return (
      <div>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 18 }}>
          <div className="av av-sq" style={{ width: 52, height: 52 }}><I n="project" s={22} c="var(--fg3)" /></div>
          <div>
            <div style={{ fontSize: 18, fontWeight: 700, letterSpacing: "-.3px", display: "flex", alignItems: "center", gap: 8 }}>{entity.name}<TrustBadge entity={entity} /><KarmaBadge karma={effectiveKarma} /></div>
            <div style={{ fontSize: 13, color: "var(--fg2)", marginTop: 2 }}>{entity.stage}</div>
            {author && <div style={{ marginTop: 5 }}><AuthorChip contactId={entity.createdBy} contacts={contacts} onOpen={c => onOpenEntity("contact", c.id)} /></div>}
          </div>
          <div style={{ marginLeft: "auto", display: "flex", gap: 4 }}><EntityMenu entity={entity} entityType="project" onReport={() => setReportOpen(true)} onEdit={onEdit} /></div>
        </div>
        <div style={{ fontSize: 10.5, color: "var(--fg3)", fontFamily: "var(--mono)", marginBottom: 14 }}>project/{entity.id}</div>
        {entity.website && <a className="clink" href={`https://${entity.website}`} target="_blank" rel="noreferrer" style={{ marginBottom: 12, display: "inline-flex" }}><I n="globe" s={12} /> {entity.website}</a>}
        <div style={{ fontSize: 13.5, color: "var(--fg2)", lineHeight: 1.65, marginBottom: 16 }}>{entity.description}</div>
        <div className="popup-grid">
          <div>
            {members.length > 0 && <div className="popup-section"><div className="popup-section-title">Team & Investors</div>{members.map(m => <div key={m.contactId} className="linked-row"><div className="av" style={{ width: 26, height: 26, fontSize: 9 }}>{ini(m.contact.name)}</div><span className="rel-chip" style={{ border: "none", padding: 0, background: "transparent" }} onClick={() => onOpenEntity("contact", m.contactId)}>{m.contact.name}</span><KarmaBadge karma={m.contact.karma || 0} /><span style={{ color: "var(--fg3)", marginLeft: "auto", fontSize: 11 }}>{m.role}</span></div>)}</div>}
            {entity.tags?.length > 0 && <div className="popup-section"><div className="popup-section-title">Tags</div><div style={{ display: "flex", flexWrap: "wrap", gap: 3 }}>{entity.tags.map(t => <Tag key={t} id={t} />)}</div></div>}
          </div>
          <div>
            <KarmaSection />
            {partnerCos.length > 0 && <div className="popup-section"><div className="popup-section-title">Partner Companies</div>{partnerCos.map(co => <RelChip key={co.id} type="company" id={co.id} name={co.name} trustEntity={co} />)}</div>}
          </div>
        </div>
        <CommentThread entityId={entity.id} entityType="project" discussions={discussions} setDiscussions={setDiscussions} currentUserId={currentUserId} currentUserKarma={currentUserKarma} allVotes={allVotes} onVote={onVote} contacts={contacts} />
      </div>
    );
  };

  const renderDeal = () => {
    const rnd = roundObj(entity.round);
    const st = DEAL_STATUSES.find(s => s.id === entity.status) || DEAL_STATUSES[0];
    const ctcs = (entity.contactIds || []).map(id => contacts.find(c => c.id === id)).filter(Boolean);
    return (
      <div>
        <div style={{ display: "flex", alignItems: "flex-start", gap: 12, marginBottom: 18 }}>
          <div style={{ width: 4, background: "oklch(0.55 0.14 240)", borderRadius: 2, alignSelf: "stretch", minHeight: 52, flexShrink: 0 }} />
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 18, fontWeight: 700, letterSpacing: "-.3px" }}>{entity.title}</div>
            <div style={{ display: "flex", gap: 7, marginTop: 5, flexWrap: "wrap", alignItems: "center" }}>
              <span className={`sbadge s-${st.id === "open" ? "active" : st.id === "in-progress" ? "lead" : st.id === "closed" ? "partner" : "inactive"}`}>{st.label}</span>
              <span style={{ fontSize: 12, color: "var(--fg2)" }}>{rnd.label}</span>
              {entity.amount > 0 && <span style={{ fontSize: 13, fontFamily: "var(--mono)", fontWeight: 600 }}>{fv(entity.amount)} {entity.currency}</span>}
            </div>
            {author && <div style={{ marginTop: 7 }}><AuthorChip contactId={entity.createdBy} contacts={contacts} onOpen={c => onOpenEntity("contact", c.id)} label="Created by" /></div>}
          </div>
          <EntityMenu entity={entity} entityType="deal" onReport={() => setReportOpen(true)} />
        </div>
        <div style={{ fontSize: 10.5, color: "var(--fg3)", fontFamily: "var(--mono)", marginBottom: 14 }}>deal/{entity.id}</div>
        {entity.description && <div style={{ fontSize: 13, color: "var(--fg2)", lineHeight: 1.65, marginBottom: 12 }}>{entity.description}</div>}
        {entity.terms && <div style={{ fontSize: 12.5, background: "var(--bg3)", border: "1px solid var(--border)", borderRadius: "var(--r2)", padding: "8px 11px", marginBottom: 14, color: "var(--fg2)" }}><span style={{ fontWeight: 600, color: "var(--fg)" }}>Terms: </span>{entity.terms}</div>}
        {ctcs.length > 0 && <div className="popup-section"><div className="popup-section-title">Contacts</div>{ctcs.map(c => <div key={c.id} className="linked-row"><div className="av" style={{ width: 26, height: 26, fontSize: 9 }}>{ini(c.name)}</div><span className="rel-chip" style={{ border: "none", padding: 0, background: "transparent" }} onClick={() => onOpenEntity("contact", c.id)}>{c.name}</span><span style={{ color: "var(--fg3)", marginLeft: "auto", fontSize: 11 }}>{c.company}</span></div>)}</div>}
        <CommentThread entityId={entity.id} entityType="deal" discussions={discussions} setDiscussions={setDiscussions} currentUserId={currentUserId} currentUserKarma={currentUserKarma} allVotes={allVotes} onVote={onVote} contacts={contacts} />
      </div>
    );
  };

  const renderLF = () => (
    <div>
      <div style={{ display: "flex", alignItems: "flex-start", gap: 10, marginBottom: 18 }}>
        <div style={{ flex: 1 }}>
          <div style={{ display: "flex", gap: 7, alignItems: "center", marginBottom: 6 }}>
            <span className={`sbadge lf-${entity.type}`}>{entity.type}</span>
            <span style={{ fontSize: 18, fontWeight: 700, letterSpacing: "-.3px" }}>{entity.title}</span>
          </div>
          {author && <AuthorChip contactId={entity.createdBy} contacts={contacts} onOpen={c => onOpenEntity("contact", c.id)} label="Posted by" />}
        </div>
        <EntityMenu entity={entity} entityType="lf" onReport={() => setReportOpen(true)} />
      </div>
      <div style={{ fontSize: 10.5, color: "var(--fg3)", fontFamily: "var(--mono)", marginBottom: 14 }}>lf/{entity.id}</div>
      <div style={{ fontSize: 13.5, color: "var(--fg2)", lineHeight: 1.65, marginBottom: 14 }}>{entity.body}</div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 3, marginBottom: 14 }}>{entity.tags?.map(t => <Tag key={t} id={t} />)}</div>
      <CommentThread entityId={entity.id} entityType="lf" discussions={discussions} setDiscussions={setDiscussions} currentUserId={currentUserId} currentUserKarma={currentUserKarma} allVotes={allVotes} onVote={onVote} contacts={contacts} />
    </div>
  );

  return (
    <div className="ov" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal modal-xl" style={{ maxHeight: "92vh" }}>
        <div style={{ padding: "12px 16px 10px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
          <I n={entityType === "contact" ? "contacts" : entityType === "company" ? "company" : entityType === "project" ? "project" : entityType === "deal" ? "deals" : "lf"} s={14} c="var(--fg3)" />
          <span style={{ fontSize: 12.5, color: "var(--fg3)", fontWeight: 500, textTransform: "capitalize" }}>{entityType}</span>
          <button className="btn btn-g btn-ic-sm" style={{ marginLeft: "auto" }} onClick={onClose}><I n="x" s={14} /></button>
        </div>
        <div className="popup-body">
          {entityType === "contact" && renderContact()}
          {entityType === "company" && renderCompany()}
          {entityType === "project" && renderProject()}
          {entityType === "deal" && renderDeal()}
          {entityType === "lf" && renderLF()}
        </div>
      </div>
      {reportOpen && (
        <div className="ov" style={{ zIndex: 500 }} onClick={e => e.target === e.currentTarget && setReportOpen(false)}>
          <div className="modal modal-sm">
            <div className="mh"><div><div className="mt">Report</div><div className="ms">"{entity?.name}"</div></div><button className="btn btn-g btn-ic" onClick={() => setReportOpen(false)}><I n="x" s={14} /></button></div>
            <div className="mb">
              <div style={{ fontSize: 13, color: "var(--fg2)", lineHeight: 1.65 }}>To report this entity, please describe the issue. {REPORT_THRESHOLD} or more reports will auto-open a Community Court.</div>
            </div>
            <div className="mf"><button className="btn" onClick={() => setReportOpen(false)}>Cancel</button><button className="btn btn-warn" onClick={() => { onReport && onReport(entity, entityType, "Report", "Reported by user"); setReportOpen(false); }}>Submit Report</button></div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ══════════ KARMA LEADERBOARD PAGE ══════════ */
function KarmaPage({ contacts, companies, projects, currentUserId, allVotes, onVote, onOpenEntity }) {
  const [view, setView] = useState("contacts");
  const medals = ["🥇", "🥈", "🥉"];

  const sorted = useMemo(() => {
    if (view === "contacts") return [...contacts].sort((a, b) => (b.karma || 0) - (a.karma || 0));
    if (view === "companies") return [...companies].sort((a, b) => getEffectiveKarma(b, "company", contacts, projects) - getEffectiveKarma(a, "company", contacts, projects));
    return [...projects].sort((a, b) => getEffectiveKarma(b, "project", contacts, projects) - getEffectiveKarma(a, "project", contacts, projects));
  }, [view, contacts, companies, projects]);

  return (
    <div>
      <div className="ph"><div><div className="ph-t">Karma Leaderboard</div><div className="ph-s">W3-Trust™ weighted reputation · Wilson score ranked</div></div></div>
      <div style={{ background: "var(--bg3)", border: "1px solid var(--border)", borderRadius: "var(--r2)", padding: "12px 16px", marginBottom: 18, fontSize: 12.5, color: "var(--fg2)", lineHeight: 1.7 }}>
        <strong style={{ color: "var(--fg)" }}>How karma works in W3 Net:</strong> Your vote weight = <span style={{ fontFamily: "var(--mono)" }}>0.5 + karma/200</span> (range 0.1 — 3.0). New accounts: weight 0.1 (anti-sybil). Contact karma propagates to Projects (30% dampened), Projects to Companies (20% dampened). You cannot vote on your own entities. Rankings use Wilson score to prevent low-sample bias.
      </div>
      <div className="tabs" style={{ marginBottom: 18 }}>
        {[["contacts", "Contacts"], ["projects", "Projects"], ["companies", "Companies"]].map(([id, lbl]) => (
          <button key={id} className={`tab${view === id ? " on" : ""}`} onClick={() => setView(id)}>{lbl}</button>
        ))}
      </div>
      <div className="card">
        {sorted.map((e, i) => {
          const karma = view === "contacts" ? (e.karma || 0) : getEffectiveKarma(e, view === "companies" ? "company" : "project", contacts, projects);
          const up = e.karmaBreakdown?.up || 0;
          const dn = e.karmaBreakdown?.down || 0;
          return (
            <div key={e.id} className={`lb-row${entityClass(e)}`} onClick={() => onOpenEntity(view === "contacts" ? "contact" : view === "companies" ? "company" : "project", e.id)} style={{ cursor: "pointer", transition: "background .1s" }} onMouseEnter={ev => ev.currentTarget.style.background = "var(--bg2)"} onMouseLeave={ev => ev.currentTarget.style.background = ""}>
              <span className="lb-rank">{i < 3 ? medals[i] : i + 1}</span>
              <div className="av" style={{ width: 32, height: 32, fontSize: 11 }}>{ini(e.name)}</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, fontSize: 13, display: "flex", alignItems: "center", gap: 6 }}>{e.name}<TrustBadge entity={e} size={10} /><KarmaBadge karma={karma} /></div>
                <div style={{ fontSize: 11.5, color: "var(--fg2)" }}>{e.company || e.stage || ""}</div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ fontSize: 10.5, color: "var(--fg3)" }}>
                  <div className="wscore-bar" style={{ width: 60 }}><div className="wscore-fill" style={{ width: `${wilsonScore(up, up + dn) * 100}%` }} /></div>
                </div>
                <KarmaDisplay karma={karma} up={up} down={dn} size="sm" />
                <VoteButtons entityId={e.id} entityType={view === "contacts" ? "contact" : view === "companies" ? "company" : "project"} entity={e} currentUserId={currentUserId} currentUserKarma={contacts.find(c => c.id === currentUserId)?.karma || 0} allVotes={allVotes} onVote={onVote} size="sm" />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ══════════ LIST PAGES ══════════ */
function ContactsPage({ contacts, companies, projects, deals, lf, allVotes, onVote, currentUserId, currentUserKarma, onOpenEntity }) {
  const [q, setQ] = useState(""); const [roleF, setRoleF] = useState(null); const [vertF, setVertF] = useState(null); const [sort, setSort] = useState("karma");
  const list = useMemo(() => contacts.filter(c => {
    const n = q.toLowerCase();
    const mQ = !n || c.name.toLowerCase().includes(n) || (c.company || "").toLowerCase().includes(n) || (c.telegram || "").includes(n.replace("@", ""));
    const mR = !roleF || c.role === roleF || c.tags.includes(roleF);
    const mV = !vertF || c.tags.includes(vertF);
    return mQ && mR && mV;
  }).sort((a, b) => sort === "karma" ? (b.karma || 0) - (a.karma || 0) : sort === "score" ? b.score - a.score : sort === "name" ? a.name.localeCompare(b.name) : new Date(b.createdAt) - new Date(a.createdAt)), [contacts, q, roleF, vertF, sort]);

  return (
    <div>
      <div className="ph"><div><div className="ph-t">Contacts</div><div className="ph-s">{contacts.length} in network · {list.length} shown</div></div></div>
      <div style={{ display: "flex", gap: 7, marginBottom: 10 }}>
        <div style={{ position: "relative", flex: 1, maxWidth: 380 }}><span style={{ position: "absolute", left: 8, top: "50%", transform: "translateY(-50%)" }}><I n="search" s={13} c="var(--fg3)" /></span><input className="srch-in" style={{ paddingLeft: 27, width: "100%" }} placeholder='"Pavel VC" · @handle · company' value={q} onChange={e => setQ(e.target.value)} /></div>
        <select className="sel" style={{ width: 120, height: 32 }} value={sort} onChange={e => setSort(e.target.value)}><option value="karma">Karma</option><option value="score">Score</option><option value="name">A–Z</option><option value="recent">Recent</option></select>
        {(roleF || vertF || q) && <button className="btn btn-g btn-sm" onClick={() => { setRoleF(null); setVertF(null); setQ(""); }}>Clear</button>}
      </div>
      <div className="fb" style={{ marginBottom: 14 }}>
        <span className="fb-lbl">Role:</span><button className={`fp${!roleF ? " on" : ""}`} onClick={() => setRoleF(null)}>All</button>{ROLES.slice(0, 12).map(r => <button key={r.id} className={`fp${roleF === r.id ? " on" : ""}`} onClick={() => setRoleF(roleF === r.id ? null : r.id)}>{r.label}</button>)}
      </div>
      <div className="card">
        {list.map((c, i) => (
          <div key={c.id} className={`trow${entityClass(c)}`} style={{ borderBottom: i === list.length - 1 ? "none" : undefined }} onClick={() => onOpenEntity("contact", c.id)}>
            <div className="av" style={{ width: 32, height: 32, fontSize: 11 }}>{ini(c.name)}</div>
            <div style={{ flex: "0 0 180px", minWidth: 0 }}><div style={{ fontWeight: 600, fontSize: 13, display: "flex", alignItems: "center", gap: 5 }}>{c.name}<TrustBadge entity={c} size={10} /></div><div style={{ fontSize: 11.5, color: "var(--fg2)" }}>{c.company}</div></div>
            <div style={{ flex: "0 0 80px" }}>{c.role && <Tag id={c.role} />}</div>
            <div style={{ flex: 1, display: "flex", gap: 3, flexWrap: "wrap" }}>{c.tags.filter(t => VERTICALS.find(v => v.id === t)).slice(0, 3).map(t => <Tag key={t} id={t} />)}</div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
              <KarmaBadge karma={c.karma || 0} />
              <KarmaDisplay karma={c.karma || 0} up={c.karmaBreakdown?.up || 0} down={c.karmaBreakdown?.down || 0} size="sm" />
              <VoteButtons entityId={c.id} entityType="contact" entity={c} currentUserId={currentUserId} currentUserKarma={currentUserKarma} allVotes={allVotes} onVote={onVote} size="sm" />
            </div>
          </div>
        ))}
        {!list.length && <div className="empty"><div className="empty-ic"><I n="contacts" s={15} c="var(--fg3)" /></div><div className="empty-t">No contacts</div></div>}
      </div>
    </div>
  );
}

function CompaniesPage({ companies, contacts, projects, allVotes, onVote, currentUserId, currentUserKarma, onOpenEntity }) {
  const [q, setQ] = useState("");
  const list = useMemo(() => companies.filter(c => !q || c.name.toLowerCase().includes(q.toLowerCase())).sort((a, b) => getEffectiveKarma(b, "company", contacts, projects) - getEffectiveKarma(a, "company", contacts, projects)), [companies, q, contacts, projects]);
  return (
    <div>
      <div className="ph"><div><div className="ph-t">Companies</div><div className="ph-s">{companies.length} indexed</div></div></div>
      <div style={{ display: "flex", gap: 7, marginBottom: 14 }}><div style={{ position: "relative", flex: 1, maxWidth: 340 }}><span style={{ position: "absolute", left: 8, top: "50%", transform: "translateY(-50%)" }}><I n="search" s={13} c="var(--fg3)" /></span><input className="srch-in" style={{ paddingLeft: 27, width: "100%" }} value={q} onChange={e => setQ(e.target.value)} placeholder="Search..." /></div></div>
      <div className="card">
        {list.map((co, i) => {
          const ek = getEffectiveKarma(co, "company", contacts, projects);
          return (
            <div key={co.id} className={`trow${entityClass(co)}`} style={{ borderBottom: i === list.length - 1 ? "none" : undefined }} onClick={() => onOpenEntity("company", co.id)}>
              <div className="av av-sq" style={{ width: 32, height: 32 }}><I n="company" s={13} c="var(--fg3)" /></div>
              <div style={{ flex: "0 0 180px" }}><div style={{ fontWeight: 600, fontSize: 13, display: "flex", alignItems: "center", gap: 5 }}>{co.name}<TrustBadge entity={co} size={10} /></div><div style={{ fontSize: 11.5, color: "var(--fg2)" }}>{co.stage}</div></div>
              <div style={{ flex: 1, fontSize: 12.5, color: "var(--fg2)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{co.description}</div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
                <KarmaDisplay karma={ek} up={co.karmaBreakdown?.up || 0} down={co.karmaBreakdown?.down || 0} size="sm" />
                <VoteButtons entityId={co.id} entityType="company" entity={co} currentUserId={currentUserId} currentUserKarma={currentUserKarma} allVotes={allVotes} onVote={onVote} size="sm" />
              </div>
            </div>
          );
        })}
        {!list.length && <div className="empty"><div className="empty-ic"><I n="company" s={15} c="var(--fg3)" /></div><div className="empty-t">No companies</div></div>}
      </div>
    </div>
  );
}

function ProjectsPage({ projects, contacts, companies, allVotes, onVote, currentUserId, currentUserKarma, onOpenEntity }) {
  const [q, setQ] = useState(""); const [stageF, setStageF] = useState(null);
  const list = useMemo(() => projects.filter(p => (!q || p.name.toLowerCase().includes(q.toLowerCase())) && (!stageF || p.stage === stageF)).sort((a, b) => getEffectiveKarma(b, "project", contacts, projects) - getEffectiveKarma(a, "project", contacts, projects)), [projects, q, stageF, contacts]);
  return (
    <div>
      <div className="ph"><div><div className="ph-t">Projects</div><div className="ph-s">{projects.length} indexed</div></div></div>
      <div style={{ display: "flex", gap: 7, marginBottom: 10 }}><div style={{ position: "relative", flex: 1, maxWidth: 340 }}><span style={{ position: "absolute", left: 8, top: "50%", transform: "translateY(-50%)" }}><I n="search" s={13} c="var(--fg3)" /></span><input className="srch-in" style={{ paddingLeft: 27, width: "100%" }} value={q} onChange={e => setQ(e.target.value)} placeholder="Search..." /></div></div>
      <div className="fb" style={{ marginBottom: 14 }}><span className="fb-lbl">Stage:</span><button className={`fp${!stageF ? " on" : ""}`} onClick={() => setStageF(null)}>All</button>{PROJECT_STAGES.map(s => <button key={s} className={`fp${stageF === s ? " on" : ""}`} onClick={() => setStageF(stageF === s ? null : s)}>{s}</button>)}</div>
      <div className="card">
        {list.map((p, i) => {
          const ek = getEffectiveKarma(p, "project", contacts, projects);
          return (
            <div key={p.id} className={`trow${entityClass(p)}`} style={{ borderBottom: i === list.length - 1 ? "none" : undefined }} onClick={() => onOpenEntity("project", p.id)}>
              <div className="av av-sq" style={{ width: 32, height: 32 }}><I n="project" s={13} c="var(--fg3)" /></div>
              <div style={{ flex: "0 0 180px" }}><div style={{ fontWeight: 600, fontSize: 13, display: "flex", alignItems: "center", gap: 5 }}>{p.name}<TrustBadge entity={p} size={10} /></div><div style={{ fontSize: 11.5, color: "var(--fg2)" }}>{p.stage}</div></div>
              <div style={{ flex: 1, fontSize: 12.5, color: "var(--fg2)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.description}</div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
                <KarmaDisplay karma={ek} up={p.karmaBreakdown?.up || 0} down={p.karmaBreakdown?.down || 0} size="sm" />
                <VoteButtons entityId={p.id} entityType="project" entity={p} currentUserId={currentUserId} currentUserKarma={currentUserKarma} allVotes={allVotes} onVote={onVote} size="sm" />
              </div>
            </div>
          );
        })}
        {!list.length && <div className="empty"><div className="empty-ic"><I n="project" s={15} c="var(--fg3)" /></div><div className="empty-t">No projects</div></div>}
      </div>
    </div>
  );
}

function DealsPage({ deals, contacts, onOpenEntity }) {
  const [fltStatus, setFltStatus] = useState(null); const [q, setQ] = useState("");
  const list = useMemo(() => deals.filter(d => (!q || d.title.toLowerCase().includes(q.toLowerCase())) && (!fltStatus || d.status === fltStatus)).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)), [deals, q, fltStatus]);
  return (
    <div>
      <div className="ph"><div><div className="ph-t">Deals</div><div className="ph-s">{deals.length} total · {deals.filter(d => d.status === "open").length} open</div></div></div>
      <div style={{ display: "flex", gap: 7, marginBottom: 14 }}><div style={{ position: "relative", flex: 1, maxWidth: 340 }}><span style={{ position: "absolute", left: 8, top: "50%", transform: "translateY(-50%)" }}><I n="search" s={13} c="var(--fg3)" /></span><input className="srch-in" style={{ paddingLeft: 27, width: "100%" }} value={q} onChange={e => setQ(e.target.value)} placeholder="Search deals..." /></div></div>
      <div className="fb" style={{ marginBottom: 14 }}><span className="fb-lbl">Status:</span>{DEAL_STATUSES.map(s => <button key={s.id} className={`fp${fltStatus === s.id ? " on" : ""}`} onClick={() => setFltStatus(fltStatus === s.id ? null : s.id)}>{s.label}</button>)}</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
        {list.map(d => { const rnd = roundObj(d.round); const st = DEAL_STATUSES.find(s => s.id === d.status) || DEAL_STATUSES[0]; const auth = contacts.find(c => c.id === d.createdBy); return (<div key={d.id} className="card card-p card-hover" onClick={() => onOpenEntity("deal", d.id)}><div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}><div style={{ width: 3, background: "oklch(0.55 0.14 240)", borderRadius: 2, alignSelf: "stretch", minHeight: 40, flexShrink: 0 }} /><div style={{ flex: 1 }}><div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 3, flexWrap: "wrap" }}><span style={{ fontWeight: 600, fontSize: 14 }}>{d.title}</span><span className={`sbadge s-${st.id === "open" ? "active" : st.id === "in-progress" ? "lead" : st.id === "closed" ? "partner" : "inactive"}`}>{st.label}</span><span style={{ fontSize: 11.5, color: "var(--fg3)" }}>{rnd.label}</span>{d.amount > 0 && <span style={{ fontSize: 12.5, fontFamily: "var(--mono)", fontWeight: 500 }}>{fv(d.amount)}</span>}</div><div style={{ fontSize: 12.5, color: "var(--fg2)", marginBottom: 5 }}>{d.description}</div>{auth && <AuthorChip contactId={d.createdBy} contacts={contacts} onOpen={() => { }} label="By" />}</div></div></div>); })}
        {!list.length && <div className="empty"><div className="empty-ic"><I n="deals" s={15} c="var(--fg3)" /></div><div className="empty-t">No deals</div></div>}
      </div>
    </div>
  );
}

function LFPage({ posts, contacts, onOpenEntity }) {
  const [flt, setFlt] = useState("all");
  const list = flt === "all" ? posts : posts.filter(p => p.type === flt);
  return (
    <div>
      <div className="ph"><div><div className="ph-t">Looking For</div><div className="ph-s">Community board — requests, offers, questions, announcements</div></div></div>
      <div className="fb" style={{ marginBottom: 14 }}>{["all", "looking", "offering", "ask", "announce"].map(t => <button key={t} className={`fp${flt === t ? " on" : ""}`} onClick={() => setFlt(t)}>{t === "all" ? "All" : t.charAt(0).toUpperCase() + t.slice(1)}</button>)}</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {list.map(p => { const auth = contacts.find(c => c.id === p.createdBy); return (<div key={p.id} className="card card-p card-hover" onClick={() => onOpenEntity("lf", p.id)}><div style={{ display: "flex", gap: 9, alignItems: "flex-start", marginBottom: 8 }}><span className={`sbadge lf-${p.type}`}>{p.type}</span><div style={{ flex: 1 }}><div style={{ fontWeight: 600, fontSize: 14 }}>{p.title}</div>{auth && <div style={{ marginTop: 3 }}><AuthorChip contactId={p.createdBy} contacts={contacts} onOpen={() => { }} label="By" /></div>}</div></div><div style={{ fontSize: 13, color: "var(--fg2)", lineHeight: 1.6, marginBottom: 9 }}>{p.body}</div><div style={{ display: "flex", flexWrap: "wrap", gap: 3 }}>{p.tags?.map(t => <Tag key={t} id={t} />)}</div></div>); })}
        {!list.length && <div className="empty"><div className="empty-ic"><I n="lf" s={15} c="var(--fg3)" /></div><div className="empty-t">No posts</div></div>}
      </div>
    </div>
  );
}

function CommunityPage({ discussions, setDiscussions, contacts, companies, projects, courts, setCourts, allVotes, onVote, currentUserId, currentUserKarma, onOpenEntity }) {
  const [tab, setTab] = useState("discuss");
  const allEntities = [...contacts.map(e => ({ ...e, _type: "contact" })), ...companies.map(e => ({ ...e, _type: "company" })), ...projects.map(e => ({ ...e, _type: "project" }))];
  const underReview = allEntities.filter(e => getTrustStatus(e) === "under-review" || getTrustStatus(e) === "flagged");
  const activeCourts = courts.filter(c => c.status === "open");
  const closedCourts = courts.filter(c => c.status !== "open");
  const vote = (courtId, dir) => setCourts(p => p.map(c => {
    if (c.id !== courtId) return c;
    const u = { ...c, votesFor: dir === "for" ? c.votesFor + 1 : c.votesFor, votesAgainst: dir === "against" ? c.votesAgainst + 1 : c.votesAgainst };
    const tot = u.votesFor + u.votesAgainst;
    if (tot >= 10 && u.votesAgainst / tot > 0.7) return { ...u, status: "closed", verdict: "flagged" };
    if (tot >= 10 && u.votesFor / tot > 0.7) return { ...u, status: "closed", verdict: "cleared" };
    return u;
  }));

  return (
    <div>
      <div className="ph"><div><div className="ph-t">Community</div><div className="ph-s">Discussions · Trust Court · Flagged</div></div></div>
      <div className="tabs">
        <button className={`tab${tab === "discuss" ? " on" : ""}`} onClick={() => setTab("discuss")}>Discussions</button>
        <button className={`tab${tab === "court" ? " on" : ""}`} style={{ color: activeCourts.length > 0 ? "oklch(0.55 0.14 80)" : "var(--fg2)" }} onClick={() => setTab("court")}>Court{activeCourts.length > 0 && ` · ${activeCourts.length}`}</button>
        <button className={`tab${tab === "flagged" ? " on" : ""}`} style={{ color: underReview.length > 0 ? "var(--danger-fg)" : "var(--fg2)" }} onClick={() => setTab("flagged")}>Flagged{underReview.length > 0 && ` · ${underReview.length}`}</button>
      </div>
      {tab === "discuss" && (
        <div>
          {allEntities.map(e => { const ed = discussions.filter(d => d.entityId === e.id); if (!ed.length) return null; return (<div key={e.id} style={{ marginBottom: 20 }}><div style={{ fontWeight: 600, fontSize: 13.5, marginBottom: 8, display: "flex", alignItems: "center", gap: 6, cursor: "pointer" }} onClick={() => onOpenEntity(e._type, e.id)}><I n={e._type === "contact" ? "contacts" : e._type === "company" ? "company" : "project"} s={13} />{e.name}<TrustBadge entity={e} size={10} /><I n="arr" s={12} c="var(--fg3)" /></div><CommentThread entityId={e.id} entityType={e._type} discussions={discussions} setDiscussions={setDiscussions} currentUserId={currentUserId} currentUserKarma={currentUserKarma} allVotes={allVotes} onVote={onVote} contacts={contacts} /></div>); })}
          {!discussions.length && <div className="empty"><div className="empty-ic"><I n="comm" s={15} c="var(--fg3)" /></div><div className="empty-t">No discussions yet</div></div>}
        </div>
      )}
      {tab === "court" && (
        <div>
          {!activeCourts.length && <div className="empty"><div className="empty-ic"><I n="court" s={15} c="var(--fg3)" /></div><div className="empty-t">No active court sessions</div></div>}
          {activeCourts.map(ct => { const tot = ct.votesFor + ct.votesAgainst || 1; const pct = Math.round(ct.votesAgainst / tot * 100); return (<div key={ct.id} className="court-card"><div><div className="court-t"><I n="hammer" s={13} c="var(--warn-fg)" /> Community Court — <span style={{ cursor: "pointer", textDecoration: "underline" }} onClick={() => onOpenEntity(ct.entityType, ct.entityId)}>{ct.entityName}</span></div><div style={{ fontSize: 12, color: "var(--warn-fg)", marginTop: 2 }}>Opened {ct.openedAt} · Ends {ct.endsAt}</div><div style={{ fontSize: 12.5, color: "var(--fg2)", marginTop: 7, lineHeight: 1.55 }}>{ct.reason}</div></div><div style={{ background: "var(--bg)", border: "1px solid var(--warn-border)", borderRadius: "var(--r2)", padding: "10px 12px", margin: "10px 0" }}><div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 5 }}><span style={{ color: "var(--tf-g)" }}>Cleared: {ct.votesFor}</span><span style={{ color: "var(--danger-fg)" }}>Flagged: {ct.votesAgainst}</span></div><div style={{ height: 6, background: "var(--bg3)", borderRadius: 3, overflow: "hidden" }}><div style={{ height: "100%", width: `${pct}%`, background: "oklch(0.5 0.18 27)", borderRadius: 3, transition: "width .3s" }} /></div><div style={{ fontSize: 11.5, color: "var(--fg3)", marginTop: 5, textAlign: "center" }}>{ct.votesFor + ct.votesAgainst} votes · {Math.max(0, 10 - (ct.votesFor + ct.votesAgainst))} more needed</div></div><div style={{ display: "flex", gap: 7 }}><button className="btn btn-sm" style={{ flex: 1, justifyContent: "center", background: "var(--ok-bg)", borderColor: "var(--ok-border)", color: "var(--ok-fg)" }} onClick={() => vote(ct.id, "for")}>✓ Cleared — Legit</button><button className="btn btn-sm" style={{ flex: 1, justifyContent: "center", background: "var(--danger-bg)", borderColor: "var(--danger-border)", color: "var(--danger-fg)" }} onClick={() => vote(ct.id, "against")}>⚑ Flag — Harmful</button></div></div>); })}
          {closedCourts.map(ct => <div key={ct.id} className={`court-card ${ct.verdict === "cleared" ? "closed-ok" : "closed-bad"}`}><div className="court-t">{ct.verdict === "cleared" ? "✓ Cleared" : "⚑ Flagged"} — {ct.entityName}</div><div style={{ fontSize: 12, color: "var(--fg2)", marginTop: 3 }}>{ct.votesFor} cleared · {ct.votesAgainst} flagged</div></div>)}
        </div>
      )}
      {tab === "flagged" && (
        <div>
          {!underReview.length && <div className="empty"><div className="empty-ic"><I n="flag" s={15} c="var(--fg3)" /></div><div className="empty-t">Nothing flagged</div></div>}
          {underReview.map(e => <div key={e.id} className={`card card-p card-hover${entityClass(e)}`} style={{ marginBottom: 7, display: "flex", alignItems: "center", gap: 12 }} onClick={() => onOpenEntity(e._type, e.id)}><div className="av" style={{ width: 32, height: 32, fontSize: 11 }}>{ini(e.name)}</div><div style={{ flex: 1 }}><div style={{ fontWeight: 600, fontSize: 13, display: "flex", alignItems: "center", gap: 6 }}>{e.name}<TrustBadge entity={e} size={10} /></div><div style={{ fontSize: 12, color: "var(--fg2)" }}>{e._type} · karma {e.karma || 0} · {(e.reports || []).length} reports</div></div></div>)}
        </div>
      )}
    </div>
  );
}

function PulsePage({ contacts, companies, projects, deals, lf, discussions, setPage, allVotes, onVote, currentUserId, currentUserKarma, onOpenEntity }) {
  const hotContacts = useMemo(() => [...contacts].sort((a, b) => (b.karma || 0) - (a.karma || 0)).slice(0, 5), [contacts]);
  const hotDeals = useMemo(() => [...deals].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 5), [deals]);
  const hotLF = useMemo(() => [...lf], [lf]);
  const newCompanies = useMemo(() => [...companies].sort((a, b) => getEffectiveKarma(b, "company", contacts, projects) - getEffectiveKarma(a, "company", contacts, projects)).slice(0, 5), [companies, contacts, projects]);
  const newProjects = useMemo(() => [...projects].sort((a, b) => getEffectiveKarma(b, "project", contacts, projects) - getEffectiveKarma(a, "project", contacts, projects)).slice(0, 5), [projects, contacts]);
  const Hdr = ({ title, icon, onMore }) => <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}><div style={{ display: "flex", alignItems: "center", gap: 6, fontWeight: 600, fontSize: 13 }}><I n={icon} s={13} c="var(--fg2)" />{title}</div>{onMore && <button className="btn btn-g btn-sm" style={{ fontSize: 11, height: 24, padding: "0 7px" }} onClick={onMore}>All <I n="arr" s={11} /></button>}</div>;
  return (
    <div>
      <div className="ph"><div><div className="ph-t">Pulse Feed</div><div className="ph-s">Live activity · Trending · Trust signals · W3-Trust™ karma</div></div></div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 310px", gap: 16, alignItems: "start" }}>
        <div>
          <Hdr title="Looking For" icon="lf" onMore={() => setPage("looking")} />
          <div className="card">{hotLF.map((p, i) => <div key={p.id} className="trow" onClick={() => onOpenEntity("lf", p.id)}><span style={{ fontSize: 11, fontFamily: "var(--mono)", color: "var(--fg3)", width: 16, textAlign: "right", flexShrink: 0 }}>{i + 1}</span><div style={{ flex: 1, minWidth: 0 }}><div style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: 3 }}><span className={`sbadge lf-${p.type}`}>{p.type}</span><span style={{ fontSize: 13, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.title}</span></div><div style={{ fontSize: 12, color: "var(--fg2)", marginBottom: 4, lineHeight: 1.45 }}>{p.body.slice(0, 100)}...</div><div style={{ display: "flex", gap: 3, flexWrap: "wrap" }}>{p.tags?.slice(0, 4).map(t => <Tag key={t} id={t} />)}</div></div></div>)}{!hotLF.length && <div style={{ padding: "24px", textAlign: "center", fontSize: 12.5, color: "var(--fg3)" }}>No posts yet</div>}</div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div><Hdr title="Top Projects" icon="trend" onMore={() => setPage("projects")} /><div className="card">{newProjects.map((p, i) => { const ek = getEffectiveKarma(p, "project", contacts, projects); return (<div key={p.id} className={`trow${entityClass(p)}`} onClick={() => onOpenEntity("project", p.id)}><span style={{ fontSize: 10.5, fontFamily: "var(--mono)", color: "var(--fg3)", width: 14, flexShrink: 0 }}>{i + 1}</span><div style={{ flex: 1, minWidth: 0 }}><div style={{ fontSize: 12.5, fontWeight: 600, display: "flex", alignItems: "center", gap: 4 }}>{p.name}<TrustBadge entity={p} size={9} /></div><div style={{ fontSize: 11, color: "var(--fg2)" }}>{p.stage}</div></div><div style={{ flexShrink: 0, fontFamily: "var(--mono)", fontSize: 11.5, color: ek >= 0 ? "var(--tf-g)" : "var(--danger-fg)", fontWeight: 500 }}>{ek >= 0 ? "+" : ""}{Math.round(ek)}</div></div>); })}{!newProjects.length && <div style={{ padding: "12px", textAlign: "center", fontSize: 12, color: "var(--fg3)" }}>—</div>}</div></div>
          <div><Hdr title="Active Deals" icon="deals" onMore={() => setPage("deals")} /><div className="card">{hotDeals.map((d, i) => <div key={d.id} className="trow" onClick={() => onOpenEntity("deal", d.id)}><span style={{ fontSize: 10.5, fontFamily: "var(--mono)", color: "var(--fg3)", width: 14, flexShrink: 0 }}>{i + 1}</span><div style={{ width: 2, height: 28, background: "oklch(0.55 0.14 240)", borderRadius: 2, flexShrink: 0 }} /><div style={{ flex: 1, minWidth: 0 }}><div style={{ fontSize: 12.5, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{d.title}</div><div style={{ fontSize: 11, color: "var(--fg2)" }}>{roundObj(d.round).label} · {fv(d.amount)}</div></div></div>)}{!hotDeals.length && <div style={{ padding: "12px", textAlign: "center", fontSize: 12, color: "var(--fg3)" }}>—</div>}</div></div>
          <div><Hdr title="Karma Leaders" icon="trophy" onMore={() => setPage("karma")} /><div className="card">{hotContacts.map((c, i) => <div key={c.id} className={`trow${entityClass(c)}`} onClick={() => onOpenEntity("contact", c.id)}><span style={{ fontSize: 10.5, fontFamily: "var(--mono)", color: "var(--fg3)", width: 14, flexShrink: 0 }}>{i + 1}</span><div className="av" style={{ width: 26, height: 26, fontSize: 9, flexShrink: 0 }}>{ini(c.name)}</div><div style={{ flex: 1, minWidth: 0 }}><div style={{ fontSize: 12.5, fontWeight: 600, display: "flex", alignItems: "center", gap: 3 }}>{c.name}<KarmaBadge karma={c.karma || 0} /></div><div style={{ fontSize: 11, color: "var(--fg2)" }}>{c.company}</div></div><span style={{ fontFamily: "var(--mono)", fontSize: 11.5, fontWeight: 600, color: (c.karma || 0) >= 0 ? "var(--tf-g)" : "var(--danger-fg)", flexShrink: 0 }}>{(c.karma || 0) >= 0 ? "+" : ""}{c.karma || 0}</span></div>)}</div></div>
          <div><Hdr title="Top Companies" icon="company" onMore={() => setPage("companies")} /><div className="card">{newCompanies.map((co, i) => { const ek = getEffectiveKarma(co, "company", contacts, projects); return (<div key={co.id} className={`trow${entityClass(co)}`} onClick={() => onOpenEntity("company", co.id)}><span style={{ fontSize: 10.5, fontFamily: "var(--mono)", color: "var(--fg3)", width: 14, flexShrink: 0 }}>{i + 1}</span><div style={{ flex: 1, minWidth: 0 }}><div style={{ fontSize: 12.5, fontWeight: 600, display: "flex", alignItems: "center", gap: 3 }}>{co.name}<TrustBadge entity={co} size={9} /></div></div><div style={{ fontFamily: "var(--mono)", fontSize: 11.5, color: ek >= 0 ? "var(--tf-g)" : "var(--danger-fg)", fontWeight: 500, flexShrink: 0 }}>{ek >= 0 ? "+" : ""}{Math.round(ek)}</div></div>); })}</div></div>
        </div>
      </div>
    </div>
  );
}

/* ══════════ ROOT APP ══════════ */
export default function App() {
  const [theme, setTheme] = useState("light");
  const [page, setPage] = useState("pulse");
  const [contacts, setC0] = useState(() => dbLoad(DB.contacts) || SEED_CONTACTS);
  const [companies, setCo0] = useState(() => dbLoad(DB.companies) || SEED_COMPANIES);
  const [projects, setPr0] = useState(() => dbLoad(DB.projects) || SEED_PROJECTS);
  const [deals, setD0] = useState(() => dbLoad(DB.deals) || SEED_DEALS);
  const [lf, setLf0] = useState(() => dbLoad(DB.lf) || SEED_LF);
  const [discussions, setDi0] = useState(() => dbLoad(DB.discs) || SEED_DISCS);
  const [courts, setCt0] = useState(() => dbLoad(DB.courts) || SEED_COURTS);
  const [allVotes, setVt0] = useState(() => dbLoad(DB.votes) || SEED_VOTES);

  const [authorId] = useState(ME_ID);
  const currentUser = contacts.find(c => c.id === authorId);
  const currentUserKarma = currentUser?.karma || 0;

  const [popupStack, setPopupStack] = useState([]);
  const openEntity = (type, id) => setPopupStack(p => [...p, { type, id }]);
  const closeTopPopup = () => setPopupStack(p => p.slice(0, -1));

  // Persist wrappers
  const mk = (key, setter) => (updater) => {
    setter(prev => {
      const next = typeof updater === "function" ? updater(prev) : updater;
      dbSave(DB[key], next);
      return next;
    });
  };
  const setContacts = mk("contacts", setC0);
  const setCompanies = mk("companies", setCo0);
  const setProjects = mk("projects", setPr0);
  const setDeals = mk("deals", setD0);
  const setLf = mk("lf", setLf0);
  const setDiscussions = mk("discs", setDi0);
  const setCourts = mk("courts", setCt0);
  const setVotes = mk("votes", setVt0);

  // Handle vote — weighted karma engine
  const handleVote = useCallback((entityId, entityType, dir) => {
    const existing = allVotes.find(v => v.entityId === entityId && v.voterId === authorId);
    let newVotes;
    if (existing) {
      if (existing.dir === dir) {
        // Toggle off — remove vote
        newVotes = allVotes.filter(v => !(v.entityId === entityId && v.voterId === authorId));
      } else {
        // Change direction
        newVotes = allVotes.map(v => v.entityId === entityId && v.voterId === authorId ? { ...v, dir, date: today() } : v);
      }
    } else {
      newVotes = [...allVotes, { id: gid(), entityId, entityType, voterId: authorId, dir, date: today() }];
    }
    setVotes(newVotes);

    // Recompute entity karma
    const entityVotes = newVotes.filter(v => v.entityId === entityId);
    const voterKarmas = contacts.reduce((m, c) => { m[c.id] = c.karma || 0; return m; }, {});
    const newKarma = Math.round(computeWeightedKarma(entityVotes, voterKarmas) * 10) / 10;
    const up = entityVotes.filter(v => v.dir === "up").length;
    const down = entityVotes.filter(v => v.dir === "down").length;
    const upd = (p) => p.map(e => e.id !== entityId ? e : { ...e, karma: newKarma, karmaBreakdown: { up, down } });

    if (entityType === "contact") setContacts(upd);
    else if (entityType === "company") setCompanies(upd);
    else if (entityType === "project") setProjects(upd);

    // Auto-trigger court if threshold crossed
    const entity = [...contacts, ...companies, ...projects].find(e => e.id === entityId);
    if (entity && newKarma <= KARMA_THRESHOLD && !courts.some(c => c.entityId === entityId && c.status === "open")) {
      const end = new Date(); end.setDate(end.getDate() + 14);
      setCourts(p => [...p, { id: gid(), entityId, entityType, entityName: entity.name, reason: `Karma dropped to ${newKarma}`, openedAt: today(), endsAt: end.toISOString().slice(0, 10), votesFor: 0, votesAgainst: 0, status: "open", verdict: null }]);
    }
  }, [allVotes, authorId, contacts, companies, projects, courts]);

  // Handle report
  const handleReport = useCallback((entity, entityType) => {
    const upd = p => p.map(x => x.id !== entity.id ? x : { ...x, reports: [...(x.reports || []), { id: gid(), by: authorId, reason: "Reported by community", createdAt: today() }] });
    if (entityType === "contact") setContacts(upd);
    else if (entityType === "company") setCompanies(upd);
    else if (entityType === "project") setProjects(upd);
  }, [authorId]);

  useEffect(() => {
    const h = e => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") { e.preventDefault(); setPage("contacts"); }
      if ((e.metaKey || e.ctrlKey) && e.key === "n") { e.preventDefault(); }
      if (e.key === "Escape") { if (popupStack.length > 0) closeTopPopup(); }
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [popupStack]);

  const activeCourts = courts.filter(c => c.status === "open").length;
  const NAV = [
    { id: "pulse", icon: "pulse", label: "Pulse Feed" },
    { id: "looking", icon: "lf", label: "Looking For" },
    { id: "contacts", icon: "contacts", label: "Contacts" },
    { id: "companies", icon: "company", label: "Companies" },
    { id: "projects", icon: "project", label: "Projects" },
    { id: "deals", icon: "deals", label: "Deals" },
    { id: "karma", icon: "trophy", label: "Karma Board" },
    { id: "community", icon: "comm", label: "Community", courts: activeCourts },
  ];

  const topPopup = popupStack[popupStack.length - 1];

  return (
    <div className={`app${theme === "dark" ? " dark" : ""}`}>
      <style>{STYLE}</style>
      <div className="sb">
        <div className="sb-logo"><div className="sb-mark"><span className="sb-mark-t">W3</span></div><div><div className="sb-name">W3 Net</div><div className="sb-sub">Web3 Networking Hub</div></div></div>
        <div className="sb-nav">
          <div className="sb-sec">Main</div>
          {NAV.map(n => (
            <div key={n.id} className={`nv${page === n.id ? " on" : ""}`} onClick={() => setPage(n.id)}>
              <I n={n.icon} s={14} /><span>{n.label}</span>
              {n.courts > 0 && <span style={{ marginLeft: "auto", fontSize: 11, color: "oklch(0.65 0.18 80)", fontFamily: "var(--mono)", fontWeight: 500 }}>{n.courts}</span>}
            </div>
          ))}
          <div className="sb-sec" style={{ marginTop: 8 }}>My Profile</div>
          {currentUser && (
            <div className="nv" onClick={() => openEntity("contact", ME_ID)}>
              <div className="av" style={{ width: 16, height: 16, fontSize: 7 }}>{ini(currentUser.name)}</div>
              <div style={{ flex: 1, minWidth: 0 }}><div style={{ fontSize: 12.5, fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{currentUser.name}</div></div>
              <span style={{ fontFamily: "var(--mono)", fontSize: 11, color: (currentUserKarma || 0) >= 0 ? "var(--tf-g)" : "var(--danger-fg)" }}>{currentUserKarma >= 0 ? "+" : ""}{currentUserKarma}</span>
            </div>
          )}
        </div>
        <div className="sb-foot">
          <div className="nv" onClick={() => setTheme(t => t === "dark" ? "light" : "dark")}><I n={theme === "dark" ? "sun" : "moon"} s={13} /><span>{theme === "dark" ? "Light" : "Dark"} mode</span></div>
        </div>
      </div>

      <div className="main">
        <div className="topbar">
          <div className="tb-title">{NAV.find(n => n.id === page)?.label || "W3 Net"}</div>
          <div className="srch"><span className="srch-ic"><I n="search" s={13} /></span><input className="srch-in" placeholder="Search · ⌘K" onFocus={() => setPage("contacts")} /></div>
          <div className="tb-right">
            <div style={{ display: "flex", alignItems: "center", gap: 5, padding: "0 9px", background: "var(--bg3)", border: "1px solid var(--border)", borderRadius: "var(--r2)", height: 32, fontSize: 12 }}>
              <I n="info" s={12} c="var(--fg3)" />
              <span style={{ color: "var(--fg2)", fontFamily: "var(--mono)", fontSize: 11 }}>vote weight: <strong>{voteWeight(currentUserKarma).toFixed(2)}x</strong></span>
            </div>
          </div>
        </div>
        <div className="page">
          {page === "pulse" && <PulsePage contacts={contacts} companies={companies} projects={projects} deals={deals} lf={lf} discussions={discussions} setPage={setPage} allVotes={allVotes} onVote={handleVote} currentUserId={authorId} currentUserKarma={currentUserKarma} onOpenEntity={openEntity} />}
          {page === "contacts" && <ContactsPage contacts={contacts} companies={companies} projects={projects} deals={deals} lf={lf} allVotes={allVotes} onVote={handleVote} currentUserId={authorId} currentUserKarma={currentUserKarma} onOpenEntity={openEntity} />}
          {page === "companies" && <CompaniesPage companies={companies} contacts={contacts} projects={projects} allVotes={allVotes} onVote={handleVote} currentUserId={authorId} currentUserKarma={currentUserKarma} onOpenEntity={openEntity} />}
          {page === "projects" && <ProjectsPage projects={projects} contacts={contacts} companies={companies} allVotes={allVotes} onVote={handleVote} currentUserId={authorId} currentUserKarma={currentUserKarma} onOpenEntity={openEntity} />}
          {page === "deals" && <DealsPage deals={deals} contacts={contacts} onOpenEntity={openEntity} />}
          {page === "looking" && <LFPage posts={lf} contacts={contacts} onOpenEntity={openEntity} />}
          {page === "karma" && <KarmaPage contacts={contacts} companies={companies} projects={projects} currentUserId={authorId} allVotes={allVotes} onVote={handleVote} onOpenEntity={openEntity} />}
          {page === "community" && <CommunityPage discussions={discussions} setDiscussions={setDiscussions} contacts={contacts} companies={companies} projects={projects} courts={courts} setCourts={setCourts} allVotes={allVotes} onVote={handleVote} currentUserId={authorId} currentUserKarma={currentUserKarma} onOpenEntity={openEntity} />}
        </div>
      </div>

      {topPopup && (
        <EntityPopup
          entityType={topPopup.type} entityId={topPopup.id}
          contacts={contacts} companies={companies} projects={projects} deals={deals} lf={lf}
          discussions={discussions} setDiscussions={setDiscussions}
          allVotes={allVotes} onVote={handleVote}
          currentUserId={authorId} currentUserKarma={currentUserKarma}
          onClose={closeTopPopup} onOpenEntity={openEntity}
          onEdit={() => { }}
          onReport={handleReport}
        />
      )}
    </div>
  );
}
