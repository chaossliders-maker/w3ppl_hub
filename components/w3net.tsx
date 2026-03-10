import { useState, useEffect, useRef, useMemo, useCallback } from "react";

const APP_VERSION = "v4.8";

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
/* sb-logo height = topbar height exactly (52px) so border lines up perfectly */
.sb-logo{height:52px;min-height:52px;padding:0 13px;border-bottom:1px solid var(--border);display:flex;align-items:center;gap:9px;}
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
@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}
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
    trash:    <><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></>,
  };
  return <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">{p[n] || null}</svg>;
};

/* ══════════ CONSTANTS ══════════ */
const ROLES = [
  // Investment
  { id: "vc", label: "VC", group: "Investment", color: "t-b" },
  { id: "angel", label: "Angel", group: "Investment", color: "t-a" },
  { id: "family-office", label: "Family Office", group: "Investment", color: "t-a" },
  { id: "lp", label: "LP", group: "Investment", color: "t-b" },
  { id: "fund-manager", label: "Fund Manager", group: "Investment", color: "t-b" },
  { id: "micro-vc", label: "Micro VC", group: "Investment", color: "t-b" },
  { id: "syndicate-lead", label: "Syndicate Lead", group: "Investment", color: "t-b" },
  { id: "scout", label: "Scout", group: "Investment", color: "t-a" },
  { id: "analyst", label: "Analyst", group: "Investment", color: "t-s" },
  { id: "crypto-fund", label: "Crypto Fund", group: "Investment", color: "t-b" },
  // Founding & C-Suite
  { id: "founder", label: "Founder", group: "Founding", color: "t-s" },
  { id: "co-founder", label: "Co-Founder", group: "Founding", color: "t-s" },
  { id: "ceo", label: "CEO", group: "Founding", color: "t-s" },
  { id: "cto", label: "CTO", group: "Founding", color: "t-i" },
  { id: "coo", label: "COO", group: "Founding", color: "t-s" },
  { id: "cfo", label: "CFO", group: "Founding", color: "t-g" },
  { id: "cpo", label: "CPO", group: "Founding", color: "t-t" },
  { id: "cmo", label: "CMO", group: "Founding", color: "t-p" },
  { id: "cso", label: "CSO", group: "Founding", color: "t-r" },
  { id: "cdo", label: "CDO", group: "Founding", color: "t-i" },
  // Business
  { id: "bd", label: "BD", group: "Business", color: "t-g" },
  { id: "partnerships", label: "Partnerships", group: "Business", color: "t-g" },
  { id: "sales", label: "Sales", group: "Business", color: "t-l" },
  { id: "growth", label: "Growth", group: "Business", color: "t-l" },
  { id: "product", label: "Product", group: "Business", color: "t-t" },
  { id: "ops", label: "Ops", group: "Business", color: "t-s" },
  { id: "hr", label: "HR", group: "Business", color: "t-s" },
  { id: "ecosystem", label: "Ecosystem", group: "Business", color: "t-g" },
  // Marketing & Community
  { id: "marketing", label: "Marketing", group: "Marketing", color: "t-p" },
  { id: "kol", label: "KOL", group: "Marketing", color: "t-ro" },
  { id: "influencer", label: "Influencer", group: "Marketing", color: "t-ro" },
  { id: "community", label: "Community", group: "Marketing", color: "t-p" },
  { id: "ambassador", label: "Ambassador", group: "Marketing", color: "t-p" },
  { id: "media", label: "Media", group: "Marketing", color: "t-i" },
  { id: "content", label: "Content", group: "Marketing", color: "t-p" },
  { id: "pr", label: "PR", group: "Marketing", color: "t-ro" },
  { id: "social-media", label: "Social Media", group: "Marketing", color: "t-p" },
  { id: "moderator", label: "Moderator", group: "Marketing", color: "t-s" },
  // Technical
  { id: "developer", label: "Developer", group: "Technical", color: "t-i" },
  { id: "blockchain-dev", label: "Blockchain Dev", group: "Technical", color: "t-i" },
  { id: "smart-contract", label: "Smart Contract", group: "Technical", color: "t-i" },
  { id: "frontend", label: "Frontend", group: "Technical", color: "t-i" },
  { id: "backend", label: "Backend", group: "Technical", color: "t-i" },
  { id: "fullstack", label: "Full Stack", group: "Technical", color: "t-i" },
  { id: "security", label: "Security", group: "Technical", color: "t-r" },
  { id: "auditor", label: "Auditor", group: "Technical", color: "t-r" },
  { id: "devrel", label: "DevRel", group: "Technical", color: "t-t" },
  { id: "data-scientist", label: "Data Science", group: "Technical", color: "t-b" },
  { id: "ai-engineer", label: "AI Engineer", group: "Technical", color: "t-b" },
  { id: "protocol-engineer", label: "Protocol Eng", group: "Technical", color: "t-i" },
  { id: "research", label: "Research", group: "Technical", color: "t-b" },
  // Advisory & Legal
  { id: "advisor", label: "Advisor", group: "Advisory", color: "t-s" },
  { id: "legal", label: "Legal", group: "Advisory", color: "t-a" },
  { id: "compliance", label: "Compliance", group: "Advisory", color: "t-a" },
  { id: "tokenomics", label: "Tokenomics", group: "Advisory", color: "t-t" },
  { id: "regulatory", label: "Regulatory", group: "Advisory", color: "t-a" },
  { id: "board", label: "Board Member", group: "Advisory", color: "t-s" },
  // Liquidity & Trading
  { id: "market-maker", label: "Market Maker", group: "Liquidity", color: "t-g" },
  { id: "otc", label: "OTC", group: "Liquidity", color: "t-g" },
  { id: "trader", label: "Trader", group: "Liquidity", color: "t-l" },
  { id: "exchange", label: "Exchange", group: "Liquidity", color: "t-t" },
  { id: "prop-trader", label: "Prop Trader", group: "Liquidity", color: "t-l" },
  { id: "quant", label: "Quant", group: "Liquidity", color: "t-l" },
  { id: "custody", label: "Custody", group: "Liquidity", color: "t-g" },
  // Media & Press
  { id: "journalist", label: "Journalist", group: "Media", color: "t-i" },
  { id: "podcast", label: "Podcast Host", group: "Media", color: "t-ro" },
  { id: "newsletter", label: "Newsletter", group: "Media", color: "t-i" },
  { id: "youtuber", label: "YouTuber", group: "Media", color: "t-r" },
  { id: "researcher-ind", label: "Independent Researcher", group: "Media", color: "t-b" },
];
const VERTICALS = [
  // Core DeFi
  { id: "defi", label: "DeFi", color: "t-t" },
  { id: "dex", label: "DEX", color: "t-t" },
  { id: "cex", label: "CEX", color: "t-g" },
  { id: "lending", label: "Lending", color: "t-i" },
  { id: "derivatives", label: "Derivatives", color: "t-a" },
  { id: "stablecoin", label: "Stablecoin", color: "t-l" },
  { id: "yield", label: "Yield", color: "t-g" },
  { id: "liquid-staking", label: "Liquid Staking", color: "t-t" },
  { id: "perps", label: "Perps", color: "t-a" },
  { id: "options", label: "Options", color: "t-a" },
  // Infrastructure
  { id: "l1", label: "L1", color: "t-b" },
  { id: "l2", label: "L2", color: "t-i" },
  { id: "l3", label: "L3 / AppChain", color: "t-i" },
  { id: "infra", label: "Infra", color: "t-s" },
  { id: "modular", label: "Modular", color: "t-t" },
  { id: "bridge", label: "Bridge", color: "t-i" },
  { id: "oracle", label: "Oracle", color: "t-b" },
  { id: "storage", label: "Storage", color: "t-s" },
  { id: "indexing", label: "Indexing", color: "t-b" },
  { id: "node", label: "Node Infra", color: "t-s" },
  { id: "mev", label: "MEV", color: "t-r" },
  // Privacy & ZK
  { id: "zk", label: "ZK", color: "t-p" },
  { id: "privacy", label: "Privacy", color: "t-s" },
  { id: "zkvm", label: "zkVM", color: "t-p" },
  { id: "fhe", label: "FHE", color: "t-p" },
  { id: "mpc", label: "MPC", color: "t-p" },
  // AI & Data
  { id: "ai-web3", label: "AI×Web3", color: "t-b" },
  { id: "depin", label: "DePIN", color: "t-b" },
  { id: "desci", label: "DeSci", color: "t-b" },
  { id: "deai", label: "DeAI", color: "t-b" },
  // Consumer & Social
  { id: "nft", label: "NFT", color: "t-a" },
  { id: "gamefi", label: "GameFi", color: "t-p" },
  { id: "socialfi", label: "SocialFi", color: "t-ro" },
  { id: "metaverse", label: "Metaverse", color: "t-ro" },
  { id: "creator", label: "Creator Economy", color: "t-ro" },
  { id: "music", label: "Music / Media", color: "t-ro" },
  // Real World & Compliance
  { id: "rwa", label: "RWA", color: "t-r" },
  { id: "payments", label: "Payments", color: "t-g" },
  { id: "cbdc", label: "CBDC", color: "t-g" },
  { id: "identity", label: "Identity", color: "t-t" },
  { id: "kyc", label: "KYC/AML", color: "t-a" },
  { id: "insurance", label: "Insurance", color: "t-s" },
  // Governance
  { id: "dao", label: "DAO", color: "t-p" },
  { id: "governance", label: "Governance", color: "t-p" },
  { id: "launchpad", label: "Launchpad", color: "t-a" },
  { id: "prediction", label: "Prediction Market", color: "t-l" },
  // Security
  { id: "security-vert", label: "Security", color: "t-r" },
  { id: "audit-firm", label: "Audit Firm", color: "t-r" },
  { id: "insurance-protocol", label: "Insurance Protocol", color: "t-s" },
];
const GEOS = [
  { id: "us", label: "US", color: "t-b" },
  { id: "uk", label: "UK", color: "t-b" },
  { id: "eu", label: "EU", color: "t-b" },
  { id: "sg", label: "Singapore", color: "t-r" },
  { id: "hk", label: "Hong Kong", color: "t-r" },
  { id: "asia", label: "Asia", color: "t-r" },
  { id: "dubai", label: "Dubai / UAE", color: "t-a" },
  { id: "mena", label: "MENA", color: "t-a" },
  { id: "latam", label: "LATAM", color: "t-l" },
  { id: "cis", label: "CIS", color: "t-t" },
  { id: "africa", label: "Africa", color: "t-g" },
  { id: "global", label: "Global / Remote", color: "t-s" },
  { id: "cayman", label: "Cayman / BVI", color: "t-s" },
  { id: "swiss", label: "Switzerland", color: "t-b" },
];
const ALL_TAGS = [...ROLES, ...VERTICALS, ...GEOS];
/* ══════════ DEAL TAXONOMY v2.0 ══════════
 * Based on: AngelList, Messari, The Block 2024 research
 * Web3-native: TGE/SAFT/vesting/cliff awareness
 ════════════════════════════════════════ */
/* ══════════════════════════════════════════════════════════════════
   DEALS TAXONOMY v2.0 — Bulletin Board Model
   "I'm seeking capital" ↔ "I'm deploying capital"
   Both sides have SYMMETRIC matching criteria
   Research: AngelList, Messari, ETHGlobal, Gitcoin, YC, a16z CSX
   ══════════════════════════════════════════════════════════════════ */

// All capital categories — seeking AND deploying
const DEAL_ROUNDS = [
  // Equity
  { id: "angels",        label: "Angels / FFF",      group: "💼 Equity",        desc: "Friends, family, angels — earliest checks" },
  { id: "pre-seed",      label: "Pre-Seed",           group: "💼 Equity",        desc: "First institutional money, typically <$1M" },
  { id: "seed",          label: "Seed",               group: "💼 Equity",        desc: "Core product built, $1–5M typical" },
  { id: "series-a",      label: "Series A",           group: "💼 Equity",        desc: "Scaling product-market fit, $5–20M" },
  { id: "series-b",      label: "Series B",           group: "💼 Equity",        desc: "Scaling operations, $20–100M" },
  { id: "series-c-plus", label: "Series C+",          group: "💼 Equity",        desc: "Growth / pre-IPO" },
  { id: "strategic",     label: "Strategic",          group: "💼 Equity",        desc: "Corporate/strategic investor, value-add beyond capital" },
  // Token
  { id: "private-sale",  label: "Private Sale",       group: "🪙 Token",         desc: "Early token allocation at discount, KOLs/VCs" },
  { id: "pre-tge",       label: "Pre-TGE",            group: "🪙 Token",         desc: "SAFT/warrant before token generation" },
  { id: "tge",           label: "TGE",                group: "🪙 Token",         desc: "Token Generation Event — public" },
  { id: "ido-ieo",       label: "IDO / IEO / IGO",   group: "🪙 Token",         desc: "Launchpad-led public token sale" },
  { id: "launchpad",     label: "Launchpad Deal",     group: "🪙 Token",         desc: "Structured launchpad partnership" },
  { id: "otc",           label: "OTC / Block Trade",  group: "🪙 Token",         desc: "Over-the-counter token trade, secondary" },
  { id: "lp-provision",  label: "Liquidity Provision",group: "🪙 Token",         desc: "DEX liquidity, market making" },
  // Debt
  { id: "safe",          label: "SAFE",               group: "📄 Debt / Hybrid", desc: "Simple Agreement for Future Equity" },
  { id: "saft",          label: "SAFT",               group: "📄 Debt / Hybrid", desc: "Simple Agreement for Future Tokens" },
  { id: "convertible",   label: "Convertible Note",   group: "📄 Debt / Hybrid", desc: "Debt converts to equity or tokens" },
  { id: "venture-debt",  label: "Venture Debt",       group: "📄 Debt / Hybrid", desc: "Non-dilutive debt financing" },
  { id: "rbf",           label: "Revenue-Based",      group: "📄 Debt / Hybrid", desc: "Revenue share repayment" },
  // Non-dilutive
  { id: "grant-web3",    label: "Web3 Foundation Grant", group: "🎁 Non-Dilutive", desc: "Polkadot/Ethereum/Solana/Near/Cosmos ecosystem grants" },
  { id: "grant-defi",    label: "DeFi Protocol Grant",   group: "🎁 Non-Dilutive", desc: "Arbitrum/Optimism/Uniswap/Compound grants" },
  { id: "grant-gov",     label: "Government Grant",      group: "🎁 Non-Dilutive", desc: "SBIR, EU Horizon, Singapore MAS, UAE grants" },
  { id: "gitcoin",       label: "Gitcoin Round",         group: "🎁 Non-Dilutive", desc: "Quadratic funding via Gitcoin" },
  { id: "retropgf",      label: "RetroPGF",              group: "🎁 Non-Dilutive", desc: "Optimism retroactive public goods funding" },
  { id: "ecosystem-fund",label: "Ecosystem Fund",        group: "🎁 Non-Dilutive", desc: "BNB Chain/Polygon/Chainlink ecosystem programs" },
  // Accelerators
  { id: "accelerator",   label: "Accelerator Program",  group: "🚀 Accelerator", desc: "YC, a16z CSX, Outlier Ventures, Alliance DAO" },
  { id: "incubator",     label: "Incubator",             group: "🚀 Accelerator", desc: "Early-stage incubation with equity+support" },
  { id: "launchhouse",   label: "Launchhouse / Studio",  group: "🚀 Accelerator", desc: "Venture studio co-building model" },
  // Hackathons
  { id: "hackathon",     label: "Hackathon Prize",       group: "🏆 Hackathon",   desc: "ETHGlobal, Chainlink, DoraHacks, Encode" },
  { id: "bounty",        label: "Bounty / Quest",        group: "🏆 Hackathon",   desc: "Protocol bounty or quest reward" },
  // Secondary
  { id: "secondary",     label: "Secondary / Tender",    group: "🔄 Secondary",   desc: "Secondary sale of existing shares/tokens" },
];

/* ── Unified statuses (bulletin board model, not Kanban) ── */
const DEAL_STATUSES = [
  { id: "active",   label: "Active",   icon: "●", color: "var(--tf-g)",      desc: "Actively seeking / accepting applications" },
  { id: "paused",   label: "Paused",   icon: "⏸", color: "var(--warn-fg)",   desc: "Temporarily on hold" },
  { id: "filled",   label: "Filled",   icon: "✓", color: "oklch(0.6 0.14 160)", desc: "Found what I was looking for" },
  { id: "expired",  label: "Expired",  icon: "⌛", color: "var(--fg3)",       desc: "Deadline passed" },
  { id: "draft",    label: "Draft",    icon: "○", color: "var(--fg3)",       desc: "Not yet published" },
];
// Keep backwards compat aliases
const DEAL_STATUSES_FUNDRAISING = DEAL_STATUSES;
const DEAL_STATUSES_INVESTING   = DEAL_STATUSES;

/* ── Seeking type (for "Seeking" side) ── */
const SEEKING_TYPES = [
  { id: "capital",      label: "💰 Capital",       desc: "Equity, token, or debt investment" },
  { id: "grant",        label: "🎁 Grant",          desc: "Non-dilutive grant funding" },
  { id: "hackathon",    label: "🏆 Hackathon",      desc: "Prize or hackathon reward" },
  { id: "accelerator",  label: "🚀 Accelerator",    desc: "Program with funding + support" },
  { id: "strategic",    label: "🤝 Strategic",      desc: "Partnership / ecosystem deal" },
  { id: "liquidity",    label: "💧 Liquidity",      desc: "Market maker / LP / OTC" },
  { id: "any",          label: "🔓 Any",            desc: "Open to all types" },
];

/* ── Instruments ── */
const INSTRUMENTS = [
  { id: "saft",          label: "SAFT",                desc: "Simple Agreement for Future Tokens" },
  { id: "safe",          label: "SAFE",                desc: "Simple Agreement for Future Equity" },
  { id: "safe-warrant",  label: "SAFE + Token Warrant",desc: "Equity + future token rights" },
  { id: "equity",        label: "Equity",              desc: "Traditional equity stake" },
  { id: "token",         label: "Token",               desc: "Direct token purchase" },
  { id: "convertible",   label: "Convertible Note",    desc: "Debt converting to equity/tokens" },
  { id: "venture-debt",  label: "Venture Debt",        desc: "Non-dilutive debt" },
  { id: "rbf",           label: "Revenue Share",       desc: "% of future revenue" },
  { id: "grant",         label: "Grant",               desc: "Non-dilutive grant" },
  { id: "otc",           label: "OTC",                 desc: "Over-the-counter trade" },
  { id: "lp",            label: "LP Interest",         desc: "Fund LP participation" },
  { id: "any",           label: "Any / Open",          desc: "Open to discuss" },
];

/* ── Currencies — fiat + crypto ── */
const CURRENCIES = [
  // Fiat
  { id: "USD",  label: "USD — US Dollar",       group: "Fiat" },
  { id: "EUR",  label: "EUR — Euro",            group: "Fiat" },
  { id: "GBP",  label: "GBP — British Pound",  group: "Fiat" },
  { id: "SGD",  label: "SGD — Singapore Dollar",group: "Fiat" },
  { id: "AED",  label: "AED — UAE Dirham",      group: "Fiat" },
  { id: "CHF",  label: "CHF — Swiss Franc",     group: "Fiat" },
  { id: "JPY",  label: "JPY — Japanese Yen",    group: "Fiat" },
  { id: "KRW",  label: "KRW — Korean Won",      group: "Fiat" },
  { id: "BRL",  label: "BRL — Brazilian Real",  group: "Fiat" },
  { id: "AUD",  label: "AUD — Australian Dollar",group: "Fiat" },
  // Stablecoins
  { id: "USDT", label: "USDT — Tether",         group: "Stablecoin" },
  { id: "USDC", label: "USDC — USD Coin",       group: "Stablecoin" },
  { id: "DAI",  label: "DAI — MakerDAO",        group: "Stablecoin" },
  // Crypto
  { id: "ETH",  label: "ETH — Ethereum",        group: "Crypto" },
  { id: "BTC",  label: "BTC — Bitcoin",         group: "Crypto" },
  { id: "SOL",  label: "SOL — Solana",          group: "Crypto" },
  { id: "BNB",  label: "BNB — BNB Chain",       group: "Crypto" },
  { id: "MATIC",label: "MATIC — Polygon",       group: "Crypto" },
  { id: "AVAX", label: "AVAX — Avalanche",      group: "Crypto" },
  { id: "ARB",  label: "ARB — Arbitrum",        group: "Crypto" },
  { id: "OP",   label: "OP — Optimism",         group: "Crypto" },
  // Special
  { id: "TOKEN",label: "Own Token",             group: "Other" },
  { id: "MIXED",label: "Mixed",                 group: "Other" },
];

/* ── Token types ── */
const TOKEN_TYPES = [
  { id: "utility",    label: "Utility" },
  { id: "governance", label: "Governance" },
  { id: "revenue",    label: "Revenue Share" },
  { id: "payment",    label: "Payment" },
  { id: "nft",        label: "NFT" },
  { id: "rwa",        label: "RWA Token" },
  { id: "none",       label: "No Token" },
];

/* ── Investor / Deployer types ── */
const INVESTOR_TYPES = [
  { id: "angel",         label: "Angel",             range: "$1K–$500K" },
  { id: "micro-vc",      label: "Micro VC",          range: "$50K–$2M" },
  { id: "vc",            label: "VC Fund",           range: "$500K–$50M" },
  { id: "crypto-fund",   label: "Crypto Fund",       range: "$100K–$20M" },
  { id: "family-office", label: "Family Office",     range: "$1M–$100M" },
  { id: "syndicate",     label: "Syndicate",         range: "$25K–$5M" },
  { id: "dao",           label: "DAO / Community",   range: "$10K–$5M" },
  { id: "ecosystem",     label: "Ecosystem Fund",    range: "$10K–$5M" },
  { id: "corporate-vc",  label: "Corporate VC",      range: "$500K–$50M" },
  { id: "hni",           label: "HNI / UHNWI",       range: "$500K–$50M" },
  { id: "foundation",    label: "Foundation",         range: "$10K–$10M" },
  { id: "accelerator",   label: "Accelerator",        range: "$50K–$500K" },
  { id: "launchpad",     label: "Launchpad",          range: "$100K–$2M" },
  { id: "grant-org",     label: "Grant Organization", range: "$10K–$5M" },
];

/* ── Value-add options for investors ── */
const VALUE_ADD = [
  { id: "tech",        label: "🛠 Tech / Dev" },
  { id: "marketing",   label: "📢 Marketing" },
  { id: "bd",          label: "🤝 BD / Partnerships" },
  { id: "exchange",    label: "📊 Exchange Listings" },
  { id: "legal",       label: "⚖️ Legal / Compliance" },
  { id: "tokenomics",  label: "🔢 Tokenomics" },
  { id: "liquidity",   label: "💧 Liquidity / MM" },
  { id: "community",   label: "👥 Community" },
  { id: "regulatory",  label: "🏛 Regulatory" },
  { id: "none",        label: "Capital only" },
];

/* ── Legal jurisdictions ── */
const JURISDICTIONS = [
  { id: "cayman",    label: "Cayman Islands" },
  { id: "bvi",       label: "BVI" },
  { id: "delaware",  label: "US Delaware" },
  { id: "singapore", label: "Singapore" },
  { id: "uae",       label: "UAE / ADGM" },
  { id: "swiss",     label: "Switzerland" },
  { id: "estonia",   label: "Estonia" },
  { id: "uk",        label: "UK" },
  { id: "other",     label: "Other" },
];

/* ── Stage order for synergy scoring ── */
const ROUND_STAGE_ORDER = [
  "angels","pre-seed","seed","series-a","series-b","series-c-plus","strategic",
  "private-sale","pre-tge","tge","ido-ieo","launchpad","otc","lp-provision",
  "safe","saft","convertible","venture-debt","rbf",
  "grant-web3","grant-defi","grant-gov","gitcoin","retropgf","ecosystem-fund",
  "accelerator","incubator","launchhouse",
  "hackathon","bounty","secondary",
];


/* ══════════ ENTITY GOVERNANCE ══════════
 * Architecture based on research:
 * - 1h grace period (silent edit, no history) — Twitter/Medium pattern
 * - 24h free edit window with public changelog — StackOverflow pattern
 * - After 24h: Status Updates always allowed (append-only, not overwrite)
 * - After 24h: Deep edits → Community Review (DAO governance)
 * - Soft delete only (karma history preserved) — Reddit pattern
 * - Ownership Claim: domain/telegram/twitter match → Community Court
 * 
 * KEY INSIGHT: karma is stored on entity independently from content.
 * Deleting/recreating entity does NOT reset karma — dedup auto-links history.
 * This makes karma gaming via recreation pointless.
 ════════════════════════════════════════ */
const GRACE_PERIOD_MS = 60 * 60 * 1000;       // 1 hour — silent edit, no changelog
const FREE_EDIT_WINDOW_MS = 24 * 60 * 60 * 1000; // 24 hours — edit with changelog

// Returns edit permission tier for an entity
// "silent"  — within grace period, no history entry
// "free"    — within 24h, changelog entry recorded
// "status"  — after 24h, only status/factual updates allowed
// "review"  — after 24h, deep edits need Community Review
// "none"    — not author, no permission
const getEditTier = (entity, currentUserId) => {
  if (!entity || !currentUserId) return "none";
  if (entity.createdBy !== currentUserId) return "none";
  const age = Date.now() - new Date(entity.createdAt).getTime();
  if (age <= GRACE_PERIOD_MS) return "silent";
  if (age <= FREE_EDIT_WINDOW_MS) return "free";
  return "status"; // always allowed: status-only updates after 24h
};

// Returns delete permission: only author, only within 24h, soft delete
const canDelete = (entity, currentUserId) => {
  if (!entity || !currentUserId) return false;
  if (entity.createdBy !== currentUserId) return false;
  const age = Date.now() - new Date(entity.createdAt).getTime();
  return age <= FREE_EDIT_WINDOW_MS;
};

// Format time remaining in edit window
const formatTimeLeft = (entity) => {
  const age = Date.now() - new Date(entity.createdAt).getTime();
  if (age > FREE_EDIT_WINDOW_MS) return null;
  const left = (age <= GRACE_PERIOD_MS ? GRACE_PERIOD_MS : FREE_EDIT_WINDOW_MS) - age;
  const h = Math.floor(left / 3600000);
  const m = Math.floor((left % 3600000) / 60000);
  if (h > 0) return `${h}h ${m}m left`;
  return `${m}m left`;
};

// STATUS UPDATE types — always allowed regardless of age
const STATUS_UPDATES = [
  { id: "left_company", label: "Left company / project", icon: "🚪" },
  { id: "role_changed", label: "Role changed", icon: "🔄" },
  { id: "deal_changed", label: "Deal terms changed", icon: "📝" },
  { id: "deal_closed", label: "Deal closed / cancelled", icon: "🔒" },
  { id: "project_sold", label: "Project sold / acquired", icon: "💼" },
  { id: "company_closed", label: "Company closed", icon: "⛔" },
  { id: "new_info", label: "New factual information", icon: "ℹ️" },
  { id: "correction", label: "Factual correction", icon: "✏️" },
];
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
const DB = { contacts: "w3n_v33_c", companies: "w3n_v33_co", projects: "w3n_v33_p", deals: "w3n_v33_d", lf: "w3n_v33_lf", discs: "w3n_v33_di", courts: "w3n_v33_ct", votes: "w3n_v33_vt", claims: "w3n_v43_claims", changelogs: "w3n_v43_logs" };
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

// TruncText — preserves original formatting (newlines, emoji, punctuation) like Telegram
// Shows `limit` chars then "Read more" / "Less" toggle
function TruncText({ text, limit = 220, style = {}, className = "" }) {
  const [expanded, setExpanded] = useState(false);
  if (!text) return null;
  const needsTrunc = text.length > limit;
  const shown = (!needsTrunc || expanded) ? text : text.slice(0, limit).trimEnd();
  return (
    <span className={className} style={{ whiteSpace: "pre-wrap", wordBreak: "break-word", ...style }}>
      {shown}
      {needsTrunc && !expanded && <span style={{ color: "var(--fg3)" }}>… </span>}
      {needsTrunc && (
        <button onClick={e => { e.stopPropagation(); setExpanded(p => !p); }}
          style={{ background: "none", border: "none", color: "oklch(0.55 0.14 265)", fontSize: "inherit", cursor: "pointer", padding: 0, fontWeight: 500 }}>
          {expanded ? "Less" : "Read more"}
        </button>
      )}
    </span>
  );
}

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
  { id: "d1", title: "Seed Round — FlowBridge", projectName: "FlowBridge", projectId: "p1", round: "seed", status: "active", seekingType: "capital", amount: 3000000, currency: "USD", token: "FLOW", tokenType: "utility", instrument: "saft", valuationCap: 10000000, fdv: null, cliffMonths: 6, vestingMonths: 18, tgeUnlockPct: 10, description: "Raising $3M seed for cross-chain bridge.", terms: "$10M valuation cap. SAFT. 18m vest 6m cliff.", leadRequired: true, proRata: true, kycRequired: false, geoRestrictions: [], deckUrl: "", dataroomUrl: "", traction: "1200 waitlist, $850K TVL testnet", existingInvestors: "", closeDate: "2024-06-01", tags: ["bridge","defi","l2","sg"], contactIds: ["c2","c1"], companyIds: [], projectIds: ["p1"], comments: [], views: 312, createdBy: "c2", createdAt: "2024-02-01" },
  { id: "d2", title: "Strategic Round — ArcadeChain", projectName: "ArcadeChain", projectId: null, round: "strategic", status: "active", seekingType: "strategic", amount: 1500000, currency: "USD", token: "ARC", tokenType: "governance", instrument: "safe-warrant", valuationCap: 8000000, fdv: 40000000, cliffMonths: 12, vestingMonths: 24, tgeUnlockPct: 5, description: "Gaming L2. Looking for exchanges, launchpads, gaming studios.", terms: "Token warrants + equity. 24m vesting.", leadRequired: false, proRata: false, kycRequired: false, geoRestrictions: [], deckUrl: "", dataroomUrl: "", traction: "50K TPS testnet, 3 studios LOI", existingInvestors: "Spartan Group", closeDate: "", tags: ["gamefi","l2","sg","asia"], contactIds: ["c4"], companyIds: [], projectIds: [], comments: [], views: 234, createdBy: "c4", createdAt: "2024-02-20" },
  { id: "d3", title: "Ecosystem Grant — zkID Protocol", projectName: "zkID Protocol", projectId: "p2", round: "grant-web3", status: "active", seekingType: "grant", amount: 150000, amountMin: 50000, currency: "USD", instrument: "grant", description: "Applying for Ethereum Foundation grants for ZK identity research. Open to Polygon, Near, Arbitrum ecosystem grants too.", traction: "4 academic papers, 2 university partnerships, ETHGlobal finalist", tags: ["zk","identity","privacy","research"], contactIds: ["c5"], companyIds: [], projectIds: ["p2"], comments: [], views: 88, createdBy: "c5", createdAt: "2024-03-01" },
  { id: "d4", title: "Hackathon Team — ETHGlobal Bangkok", projectName: "", round: "hackathon", status: "active", seekingType: "hackathon", amount: 10000, currency: "USD", instrument: "grant", description: "Looking for a ZK engineer and frontend dev to build a DeFi risk dashboard at ETHGlobal Bangkok. 3-person team.", traction: "2 previous ETHGlobal prizes", tags: ["zk","defi","hackathon","apac"], contactIds: [ME_ID], companyIds: [], projectIds: [], comments: [], views: 45, createdBy: ME_ID, createdAt: "2024-03-08" },
  { id: "d5", title: "Spartan Capital — Deploying $50K–$500K", dealMode: "investing", title: "Spartan Capital — Seed & Pre-TGE", investorType: "crypto-fund", status: "active", minTicket: 50000, maxTicket: 500000, currency: "USD", preferredStages: ["seed","pre-seed","private-sale","pre-tge"], preferredInstruments: ["saft","safe-warrant","token"], preferredVerticals: ["defi","l2","bridge","infra"], preferredGeos: ["global"], coInvestOk: true, leadOnly: false, kycOk: true, proRataReq: true, valueAdd: ["exchange","bd","liquidity"], description: "Crypto-native fund. $50K–$500K tickets. Focus: DeFi, L2, infrastructure. Strong exchange relationships.", maxCliffMonths: 12, minVestingMonths: 12, maxVestingMonths: 36, contactIds: ["c1"], companyIds: ["co1"], projectIds: [], comments: [], views: 189, createdBy: "c1", createdAt: "2024-01-15" },

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

// Ownership Claims — "I am this entity, transfer ownership to me"
// status: "pending" | "approved" | "rejected" | "disputed"
// Evidence: domain match, telegram match, twitter match
const SEED_CLAIMS = [];

// Changelogs — public edit history (after grace period)
// type: "edit" | "status_update" | "soft_delete" | "restore"
const SEED_CHANGELOGS = [];

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
function EntityMenu({ entity, entityType, onReport, onEdit, onStatusUpdate, onClaimOwnership, onSoftDelete, currentUserId }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useEffect(() => { const h = e => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); }; document.addEventListener("mousedown", h); return () => document.removeEventListener("mousedown", h); }, []);
  const shareUrl = `${window.location.origin}${window.location.pathname}#/${entityType}/${entity?.id || ""}`;
  const isAuthor = entity?.createdBy === currentUserId;
  const canDel = isAuthor && canDelete(entity, currentUserId);
  const tier = entity ? getEditTier(entity, currentUserId) : "none";
  const timeLeft = entity ? formatTimeLeft(entity) : null;

  return (
    <div className="ent-menu" ref={ref}>
      <button className="btn btn-g btn-ic-sm" onClick={e => { e.stopPropagation(); setOpen(p => !p); }}><I n="dots" s={14} /></button>
      {open && <div className="ent-menu-drop">
        {/* Edit section — shows tier-aware label */}
        {onEdit && (
          <div className="ent-menu-item" onClick={() => { onEdit(entity, entityType); setOpen(false); }}>
            <I n="edit" s={13} />
            {tier === "silent" ? "Edit (silent)" : tier === "free" ? `Edit${timeLeft ? ` · ${timeLeft}` : ""}` : "View edit rules"}
          </div>
        )}
        {/* Status Update — always available to author */}
        {isAuthor && onStatusUpdate && (
          <div className="ent-menu-item" onClick={() => { onStatusUpdate(entity, entityType); setOpen(false); }}>
            <span style={{ fontSize: 13, marginRight: 4 }}>📋</span>Post Status Update
          </div>
        )}
        {/* Claim Ownership — for non-authors */}
        {!isAuthor && onClaimOwnership && (
          <div className="ent-menu-item" onClick={() => { onClaimOwnership(entity, entityType); setOpen(false); }}>
            <span style={{ fontSize: 13, marginRight: 4 }}>🏷️</span>Claim Ownership
          </div>
        )}
        <div className="ent-menu-sep" />
        <div className="ent-menu-grp">Share</div>
        <div className="ent-menu-item" onClick={() => { navigator.clipboard?.writeText(shareUrl).catch(() => {}); setOpen(false); }}><I n="link" s={13} />Copy link</div>
        <div className="ent-menu-item" onClick={() => { window.open(`https://x.com/intent/tweet?text=${encodeURIComponent(entity?.name || "")} on W3 Net&url=${encodeURIComponent(shareUrl)}`, "_blank"); setOpen(false); }}><I n="tw" s={13} />Share on X</div>
        <div className="ent-menu-item" onClick={() => { window.open(`https://t.me/share/url?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(entity?.name || "")}`, "_blank"); setOpen(false); }}><I n="tg" s={13} />Share on Telegram</div>
        <div className="ent-menu-sep" />
        {canDel && onSoftDelete && (
          <div className="ent-menu-item danger" onClick={() => { if (window.confirm("Delete this entity? It will be hidden but karma history is preserved.")) { onSoftDelete(entity, entityType); setOpen(false); } }}><I n="trash" s={13} />Delete <span style={{ fontSize: 10, opacity: 0.7 }}>· 24h window</span></div>
        )}
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
function EntityPopup({ entityType, entityId, contacts, companies, projects, deals, lf, discussions, setDiscussions, allVotes, onVote, currentUserId, currentUserKarma, onClose, onOpenEntity, onEdit, onReport, onStatusUpdate, onClaimOwnership, onSoftDelete, claims, canGoBack, onGoBack }) {
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
          <div style={{ marginLeft: "auto", display: "flex", gap: 4 }}><EntityMenu entity={entity} entityType="contact" onReport={() => setReportOpen(true)} onEdit={onEdit} onStatusUpdate={onStatusUpdate} onClaimOwnership={onClaimOwnership} onSoftDelete={onSoftDelete} currentUserId={currentUserId} /></div>
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
            {entity.notes && <div className="popup-section"><div className="popup-section-title">Notes</div><pre style={{ whiteSpace: "pre-wrap", wordBreak: "break-word", fontFamily: "inherit", fontSize: 13, color: "var(--fg2)", lineHeight: 1.6, margin: 0, padding: 0, background: "none", border: "none" }}>{entity.notes}</pre></div>}
          </div>
          <div>
            <KarmaSection />
            {companyEntities.length > 0 && <div className="popup-section"><div className="popup-section-title">Companies</div>{companyEntities.map(co => <RelChip key={co.id} type="company" id={co.id} name={co.name} trustEntity={co} />)}</div>}
            {projectEntities.length > 0 && <div className="popup-section"><div className="popup-section-title">Projects</div>{projectEntities.map(p => { const role = p.memberIds?.find(m => m.contactId === entity.id)?.role; return <div key={p.id}><RelChip type="project" id={p.id} name={p.name} trustEntity={p} />{role && <span style={{ fontSize: 11, color: "var(--fg3)", marginLeft: 4 }}>· {role}</span>}</div>; })}</div>}
          </div>
        </div>
        <StatusUpdatesBadge entity={entity} />
        <EntityChangelogPanel entity={entity} contacts={contacts} />
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
          <div style={{ marginLeft: "auto", display: "flex", gap: 4 }}><EntityMenu entity={entity} entityType="company" onReport={() => setReportOpen(true)} onEdit={onEdit} onStatusUpdate={onStatusUpdate} onClaimOwnership={onClaimOwnership} onSoftDelete={onSoftDelete} currentUserId={currentUserId} /></div>
        </div>
        <div style={{ fontSize: 10.5, color: "var(--fg3)", fontFamily: "var(--mono)", marginBottom: 14 }}>company/{entity.id}</div>
        {entity.website && <a className="clink" href={`https://${entity.website}`} target="_blank" rel="noreferrer" style={{ marginBottom: 12, display: "inline-flex" }}><I n="globe" s={12} /> {entity.website}</a>}
        <pre style={{ whiteSpace: "pre-wrap", wordBreak: "break-word", fontFamily: "inherit", fontSize: 13.5, color: "var(--fg2)", lineHeight: 1.65, margin: "0 0 16px", padding: 0, background: "none", border: "none" }}>{entity.description}</pre>
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
        <StatusUpdatesBadge entity={entity} />
        <EntityChangelogPanel entity={entity} contacts={contacts} />
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
          <div style={{ marginLeft: "auto", display: "flex", gap: 4 }}><EntityMenu entity={entity} entityType="project" onReport={() => setReportOpen(true)} onEdit={onEdit} onStatusUpdate={onStatusUpdate} onClaimOwnership={onClaimOwnership} onSoftDelete={onSoftDelete} currentUserId={currentUserId} /></div>
        </div>
        <div style={{ fontSize: 10.5, color: "var(--fg3)", fontFamily: "var(--mono)", marginBottom: 14 }}>project/{entity.id}</div>
        {entity.website && <a className="clink" href={`https://${entity.website}`} target="_blank" rel="noreferrer" style={{ marginBottom: 12, display: "inline-flex" }}><I n="globe" s={12} /> {entity.website}</a>}
        <pre style={{ whiteSpace: "pre-wrap", wordBreak: "break-word", fontFamily: "inherit", fontSize: 13.5, color: "var(--fg2)", lineHeight: 1.65, margin: "0 0 16px", padding: 0, background: "none", border: "none" }}>{entity.description}</pre>
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
        <StatusUpdatesBadge entity={entity} />
        <EntityChangelogPanel entity={entity} contacts={contacts} />
        <CommentThread entityId={entity.id} entityType="project" discussions={discussions} setDiscussions={setDiscussions} currentUserId={currentUserId} currentUserKarma={currentUserKarma} allVotes={allVotes} onVote={onVote} contacts={contacts} />
      </div>
    );
  };

  const renderDeal = () => {
    const isInv = entity.dealMode === "investing";
    const rnd = DEAL_ROUNDS.find(r => r.id === entity.round);
    const st  = DEAL_STATUSES.find(s => s.id === entity.status) || DEAL_STATUSES[0];
    const instr = INSTRUMENTS.find(i => i.id === entity.instrument);
    const seekingType = SEEKING_TYPES.find(s => s.id === entity.seekingType);
    const currency = entity.currency || "USD";
    const accentColor = isInv ? "oklch(0.55 0.16 160)" : "oklch(0.55 0.16 240)";
    const ctcs = (entity.contactIds || []).map((id: string) => contacts.find(c => c.id === id)).filter(Boolean);
    return (
      <div>
        {/* Header */}
        <div style={{ display: "flex", alignItems: "flex-start", gap: 12, marginBottom: 16 }}>
          <div style={{ width: 4, background: accentColor, borderRadius: 2, alignSelf: "stretch", minHeight: 52, flexShrink: 0 }} />
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: accentColor, textTransform: "uppercase", letterSpacing: ".6px", marginBottom: 4 }}>
              {isInv ? "💰 Deploying Capital" : seekingType ? seekingType.label : "📈 Seeking Capital"}
            </div>
            <div style={{ fontSize: 17, fontWeight: 800, letterSpacing: "-.3px", lineHeight: 1.2 }}>{entity.title}</div>
            <div style={{ display: "flex", gap: 6, marginTop: 7, flexWrap: "wrap", alignItems: "center" }}>
              <span style={{ fontSize: 11.5, color: st.color, background: "var(--bg3)", border: `1px solid ${st.color}33`, borderRadius: 4, padding: "2px 7px", fontWeight: 600 }}>
                {st.icon} {st.label}
              </span>
              {rnd && <span style={{ fontSize: 12, color: "var(--fg2)", background: "var(--bg3)", padding: "2px 7px", borderRadius: 4 }}>{rnd.label}</span>}
              {!isInv && entity.amount > 0 && (
                <span style={{ fontSize: 14, fontFamily: "var(--mono)", fontWeight: 800, color: "var(--tf-g)" }}>
                  {entity.amountMin > 0 ? `${fv(entity.amountMin)}–` : ""}{fv(entity.amount)} <span style={{ fontSize: 11, fontWeight: 500 }}>{currency}</span>
                </span>
              )}
              {isInv && (entity.minTicket > 0 || entity.maxTicket > 0) && (
                <span style={{ fontSize: 13, fontFamily: "var(--mono)", fontWeight: 700, color: "var(--tf-g)" }}>
                  {fv(entity.minTicket||0)} – {entity.maxTicket > 0 ? fv(entity.maxTicket) : "∞"} <span style={{ fontSize: 11, fontWeight: 500 }}>{currency}</span>
                </span>
              )}
              {instr && <span style={{ fontSize: 11, background: "var(--bg3)", padding: "2px 6px", borderRadius: 4, color: "var(--fg2)" }}>🔑 {instr.label}</span>}
            </div>
          </div>
          <EntityMenu entity={entity} entityType="deal" onReport={() => setReportOpen(true)} onEdit={onEdit} onStatusUpdate={onStatusUpdate} onClaimOwnership={onClaimOwnership} onSoftDelete={onSoftDelete} currentUserId={currentUserId} />
        </div>

        {/* Key metrics grid */}
        {!isInv && (entity.cliffMonths || entity.vestingMonths || entity.tgeUnlockPct || entity.valuationCap || entity.fdv) && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(100px,1fr))", gap: 6, marginBottom: 14 }}>
            {[
              entity.valuationCap > 0 && { label: "Valuation Cap", val: fv(entity.valuationCap), icon: "📊" },
              entity.fdv > 0         && { label: "FDV",            val: fv(entity.fdv),           icon: "💎" },
              entity.cliffMonths > 0 && { label: "Cliff",          val: `${entity.cliffMonths}m`,  icon: "🔒" },
              entity.vestingMonths > 0 && { label: "Vesting",      val: `${entity.vestingMonths}m`, icon: "📅" },
              entity.tgeUnlockPct > 0  && { label: "TGE Unlock",   val: `${entity.tgeUnlockPct}%`,  icon: "🔓" },
            ].filter(Boolean).map((m: any) => (
              <div key={m.label} style={{ background: "var(--bg3)", border: "1px solid var(--border)", borderRadius: 7, padding: "8px 10px", textAlign: "center" }}>
                <div style={{ fontSize: 11, color: "var(--fg3)" }}>{m.icon} {m.label}</div>
                <div style={{ fontSize: 14, fontFamily: "var(--mono)", fontWeight: 700, color: "var(--fg)", marginTop: 2 }}>{m.val}</div>
              </div>
            ))}
          </div>
        )}

        {/* Investor criteria grid */}
        {isInv && (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 14 }}>
            {entity.preferredStages?.length > 0 && (
              <div style={{ background: "var(--bg3)", border: "1px solid var(--border)", borderRadius: 7, padding: "8px 10px" }}>
                <div style={{ fontSize: 10.5, color: "var(--fg3)", marginBottom: 5 }}>Preferred Stages</div>
                <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                  {entity.preferredStages.map((s: string) => <span key={s} style={{ fontSize: 11, background: "var(--bg2)", border: "1px solid var(--border)", borderRadius: 3, padding: "1px 5px" }}>{DEAL_ROUNDS.find(r=>r.id===s)?.label||s}</span>)}
                </div>
              </div>
            )}
            {(entity.preferredInstruments?.length > 0 || entity.instrument) && (
              <div style={{ background: "var(--bg3)", border: "1px solid var(--border)", borderRadius: 7, padding: "8px 10px" }}>
                <div style={{ fontSize: 10.5, color: "var(--fg3)", marginBottom: 5 }}>Instruments</div>
                <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                  {(entity.preferredInstruments || [entity.instrument]).filter(Boolean).map((id: string) => <span key={id} style={{ fontSize: 11, background: "var(--bg2)", border: "1px solid var(--border)", borderRadius: 3, padding: "1px 5px" }}>{INSTRUMENTS.find(i=>i.id===id)?.label||id}</span>)}
                </div>
              </div>
            )}
            {(entity.maxCliffMonths || entity.minVestingMonths || entity.maxVestingMonths) && (
              <div style={{ background: "var(--bg3)", border: "1px solid var(--border)", borderRadius: 7, padding: "8px 10px" }}>
                <div style={{ fontSize: 10.5, color: "var(--fg3)", marginBottom: 5 }}>Terms Preference</div>
                <div style={{ fontSize: 12, color: "var(--fg2)", display: "flex", flexDirection: "column", gap: 2 }}>
                  {entity.maxCliffMonths != null && <span>Max cliff: {entity.maxCliffMonths}m</span>}
                  {entity.minVestingMonths != null && <span>Vest: {entity.minVestingMonths}–{entity.maxVestingMonths||"∞"}m</span>}
                  {entity.targetRoiX && <span>Target ROI: {entity.targetRoiX}×</span>}
                </div>
              </div>
            )}
            {(entity.coInvestOk || entity.leadOnly || entity.kycOk || entity.proRataReq) && (
              <div style={{ background: "var(--bg3)", border: "1px solid var(--border)", borderRadius: 7, padding: "8px 10px" }}>
                <div style={{ fontSize: 10.5, color: "var(--fg3)", marginBottom: 5 }}>Flags</div>
                <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                  {entity.coInvestOk   && <span style={{ fontSize: 11, color: "var(--tf-g)" }}>🤝 Co-invest OK</span>}
                  {entity.leadOnly     && <span style={{ fontSize: 11, color: "var(--warn-fg)" }}>⚡ Lead only</span>}
                  {entity.kycOk        && <span style={{ fontSize: 11, color: "var(--fg2)" }}>🪪 KYC ready</span>}
                  {entity.proRataReq   && <span style={{ fontSize: 11, color: "var(--fg2)" }}>📋 Pro-rata req.</span>}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Tags */}
        {(isInv ? entity.preferredVerticals : entity.tags)?.length > 0 && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 3, marginBottom: 12 }}>
            {(isInv ? entity.preferredVerticals : entity.tags).map((t: string) => <Tag key={t} id={t} />)}
          </div>
        )}

        {/* Description */}
        {entity.description && <pre style={{ whiteSpace: "pre-wrap", wordBreak: "break-word", fontFamily: "inherit", fontSize: 13, color: "var(--fg2)", lineHeight: 1.7, margin: "0 0 12px", padding: 0, background: "none", border: "none" }}>{entity.description}</pre>}

        {/* Traction */}
        {entity.traction && <div style={{ fontSize: 12.5, background: "oklch(0.18 0.04 160)", border: "1px solid oklch(0.35 0.1 160)", borderRadius: 7, padding: "8px 11px", marginBottom: 12, color: "var(--tf-g)" }}>📈 <strong>Traction:</strong> {entity.traction}</div>}

        {/* Existing investors */}
        {entity.existingInvestors && <div style={{ fontSize: 12.5, color: "var(--fg2)", marginBottom: 10 }}>👥 <strong>Existing investors:</strong> {entity.existingInvestors}</div>}

        {/* Terms box */}
        {entity.terms && <div style={{ fontSize: 12.5, background: "var(--bg3)", border: "1px solid var(--border)", borderRadius: 7, padding: "9px 12px", marginBottom: 14 }}><span style={{ fontWeight: 600, color: "var(--fg)" }}>📋 Terms / Notes:</span><pre style={{ whiteSpace: "pre-wrap", wordBreak: "break-word", fontFamily: "inherit", fontSize: 12.5, color: "var(--fg2)", lineHeight: 1.6, margin: "4px 0 0", padding: 0, background: "none", border: "none" }}>{entity.terms}</pre></div>}

        {/* Close date */}
        {entity.closeDate && <div style={{ fontSize: 12, color: "var(--fg3)", marginBottom: 12 }}>⏰ Close date: <strong style={{ color: "var(--fg)" }}>{entity.closeDate}</strong></div>}

        {/* Flags row — seeking side */}
        {!isInv && (entity.leadRequired || entity.proRata || entity.kycRequired || entity.boardSeatOk || entity.audited || entity.doxxed) && (
          <div style={{ display: "flex", gap: 6, marginBottom: 14, flexWrap: "wrap" }}>
            {entity.leadRequired && <span style={{ fontSize: 11.5, color: "var(--warn-fg)", background: "var(--warn-bg)", border: "1px solid var(--warn-border)", borderRadius: 4, padding: "3px 8px" }}>⚡ Lead sought</span>}
            {entity.proRata      && <span style={{ fontSize: 11.5, background: "var(--bg3)", border: "1px solid var(--border)", borderRadius: 4, padding: "3px 8px" }}>📋 Pro-rata</span>}
            {entity.kycRequired  && <span style={{ fontSize: 11.5, background: "var(--bg3)", border: "1px solid var(--border)", borderRadius: 4, padding: "3px 8px" }}>🪪 KYC required</span>}
            {entity.boardSeatOk  && <span style={{ fontSize: 11.5, background: "var(--bg3)", border: "1px solid var(--border)", borderRadius: 4, padding: "3px 8px" }}>🪑 Board seat OK</span>}
            {entity.audited      && <span style={{ fontSize: 11.5, color: "var(--tf-g)", background: "var(--bg3)", border: "1px solid var(--border)", borderRadius: 4, padding: "3px 8px" }}>✅ Audited</span>}
            {entity.doxxed       && <span style={{ fontSize: 11.5, background: "var(--bg3)", border: "1px solid var(--border)", borderRadius: 4, padding: "3px 8px" }}>👤 Doxxed team</span>}
          </div>
        )}
        {/* Legal jurisdiction */}
        {entity.jurisdiction && (
          <div style={{ fontSize: 12, color: "var(--fg3)", marginBottom: 10 }}>
            ⚖️ Jurisdiction: <strong style={{ color: "var(--fg)" }}>{JURISDICTIONS.find(j => j.id === entity.jurisdiction)?.label || entity.jurisdiction}</strong>
          </div>
        )}
        {/* Value-add (deploying side) */}
        {isInv && entity.valueAdd?.length > 0 && (
          <div style={{ fontSize: 12.5, marginBottom: 12 }}>
            <span style={{ color: "var(--fg3)", marginRight: 6 }}>Value-add:</span>
            {entity.valueAdd.map((v: string) => <span key={v} style={{ fontSize: 11.5, background: "var(--bg3)", border: "1px solid var(--border)", borderRadius: 4, padding: "2px 7px", marginRight: 4 }}>{VALUE_ADD.find(x=>x.id===v)?.label||v}</span>)}
          </div>
        )}

        {/* Contacts */}
        {ctcs.length > 0 && <div className="popup-section"><div className="popup-section-title">Contacts</div>{ctcs.map((c: any) => <div key={c.id} className="linked-row"><div className="av" style={{ width: 26, height: 26, fontSize: 9 }}>{ini(c.name)}</div><span className="rel-chip" style={{ border: "none", padding: 0, background: "transparent" }} onClick={() => onOpenEntity("contact", c.id)}>{c.name}</span><span style={{ color: "var(--fg3)", marginLeft: "auto", fontSize: 11 }}>{c.company}</span></div>)}</div>}

        <div style={{ fontSize: 10.5, color: "var(--fg3)", fontFamily: "var(--mono)", marginBottom: 14 }}>deal/{entity.id}</div>
        {author && <div style={{ marginBottom: 14 }}><AuthorChip contactId={entity.createdBy} contacts={contacts} onOpen={(c: any) => onOpenEntity("contact", c.id)} label="Created by" /></div>}
        <StatusUpdatesBadge entity={entity} />
        <EntityChangelogPanel entity={entity} contacts={contacts} />
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
        <EntityMenu entity={entity} entityType="lf" onReport={() => setReportOpen(true)} onEdit={onEdit} onStatusUpdate={onStatusUpdate} onClaimOwnership={onClaimOwnership} onSoftDelete={onSoftDelete} currentUserId={currentUserId} />
      </div>
      <div style={{ fontSize: 10.5, color: "var(--fg3)", fontFamily: "var(--mono)", marginBottom: 14 }}>lf/{entity.id}</div>
      <pre style={{ whiteSpace: "pre-wrap", wordBreak: "break-word", fontFamily: "inherit", fontSize: 13.5, color: "var(--fg2)", lineHeight: 1.65, margin: "0 0 14px", padding: 0, background: "none", border: "none" }}>{entity.body}</pre>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 3, marginBottom: 14 }}>{entity.tags?.map(t => <Tag key={t} id={t} />)}</div>
      <StatusUpdatesBadge entity={entity} />
        <EntityChangelogPanel entity={entity} contacts={contacts} />
        <CommentThread entityId={entity.id} entityType="lf" discussions={discussions} setDiscussions={setDiscussions} currentUserId={currentUserId} currentUserKarma={currentUserKarma} allVotes={allVotes} onVote={onVote} contacts={contacts} />
    </div>
  );

  return (
    <div className="ov" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal modal-xl" style={{ maxHeight: "92vh" }}>
        <div style={{ padding: "12px 16px 10px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
          {canGoBack ? (
            <button className="btn btn-g btn-ic-sm" style={{ flexShrink: 0 }} onClick={onGoBack} title="Go back">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
            </button>
          ) : null}
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

/* ══════════ FILTER BAR ══════════ */
const ROLE_GROUPS_LIST = [...new Set(ROLES.map(r => r.group))];

function FilterDropdown({ label, options, selected, onToggle, onClear }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const count = selected.length;
  useEffect(() => {
    const h = e => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);
  const hasGroups = !!options[0]?.group;
  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button onClick={() => setOpen(p => !p)} style={{ height: 28, padding: "0 10px", borderRadius: "var(--r2)", border: `1px solid ${count > 0 ? "var(--border2)" : "var(--border)"}`, background: count > 0 ? "var(--bg3)" : "var(--bg)", color: count > 0 ? "var(--fg)" : "var(--fg2)", fontFamily: "var(--font)", fontSize: 12.5, fontWeight: count > 0 ? 600 : 500, cursor: "pointer", display: "flex", alignItems: "center", gap: 5, transition: "all .1s", whiteSpace: "nowrap" }}>
        {label}
        {count > 0 && <span style={{ background: "var(--primary)", color: "var(--pri-fg)", borderRadius: 99, fontSize: 10, fontWeight: 700, minWidth: 16, height: 16, display: "inline-flex", alignItems: "center", justifyContent: "center", padding: "0 4px" }}>{count}</span>}
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" style={{ transform: open ? "rotate(180deg)" : "none", transition: "transform .15s" }}><polyline points="6 9 12 15 18 9"/></svg>
      </button>
      {open && (
        <div style={{ position: "absolute", top: "calc(100% + 5px)", left: 0, zIndex: 500, background: "var(--bg)", border: "1px solid var(--border2)", borderRadius: "var(--radius)", boxShadow: "0 8px 24px oklch(0 0 0/.12)", minWidth: 200, maxWidth: 280, maxHeight: 340, overflowY: "auto", padding: "4px 0" }}>
          {count > 0 && (
            <button onClick={() => { onClear(); setOpen(false); }} style={{ width: "100%", padding: "6px 12px", textAlign: "left", background: "none", border: "none", cursor: "pointer", fontFamily: "var(--font)", fontSize: 12, color: "var(--fg3)", display: "flex", alignItems: "center", gap: 6, borderBottom: "1px solid var(--border)" }}>
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg> Clear {count}
            </button>
          )}
          {hasGroups ? ROLE_GROUPS_LIST.map(grp => {
            const grpOpts = options.filter(o => o.group === grp);
            if (!grpOpts.length) return null;
            return (
              <div key={grp}>
                <div style={{ padding: "8px 12px 3px", fontSize: 10, fontWeight: 700, color: "var(--fg3)", letterSpacing: ".5px", textTransform: "uppercase" }}>{grp}</div>
                {grpOpts.map(opt => (
                  <div key={opt.id} onClick={() => onToggle(opt.id)} style={{ display: "flex", alignItems: "center", gap: 8, padding: "5px 12px", cursor: "pointer", background: selected.includes(opt.id) ? "var(--bg3)" : "none" }}
                    onMouseEnter={e => { if (!selected.includes(opt.id)) e.currentTarget.style.background = "var(--bg2)"; }}
                    onMouseLeave={e => { e.currentTarget.style.background = selected.includes(opt.id) ? "var(--bg3)" : "none"; }}>
                    <div style={{ width: 13, height: 13, borderRadius: 3, border: `1.5px solid ${selected.includes(opt.id) ? "var(--primary)" : "var(--border2)"}`, background: selected.includes(opt.id) ? "var(--primary)" : "none", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      {selected.includes(opt.id) && <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="var(--pri-fg)" strokeWidth="3.5" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>}
                    </div>
                    <span className={`tag ${opt.color}`} style={{ fontSize: 11 }}>{opt.label}</span>
                  </div>
                ))}
              </div>
            );
          }) : options.map(opt => (
            <div key={opt.id} onClick={() => onToggle(opt.id)} style={{ display: "flex", alignItems: "center", gap: 8, padding: "5px 12px", cursor: "pointer", background: selected.includes(opt.id) ? "var(--bg3)" : "none" }}
              onMouseEnter={e => { if (!selected.includes(opt.id)) e.currentTarget.style.background = "var(--bg2)"; }}
              onMouseLeave={e => { e.currentTarget.style.background = selected.includes(opt.id) ? "var(--bg3)" : "none"; }}>
              <div style={{ width: 13, height: 13, borderRadius: 3, border: `1.5px solid ${selected.includes(opt.id) ? "var(--primary)" : "var(--border2)"}`, background: selected.includes(opt.id) ? "var(--primary)" : "none", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                {selected.includes(opt.id) && <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="var(--pri-fg)" strokeWidth="3.5" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>}
              </div>
              <span className={`tag ${opt.color}`} style={{ fontSize: 11 }}>{opt.label}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ActiveChips({ roles, verticals, geos, onRemoveRole, onRemoveVertical, onRemoveGeo, onClearAll }) {
  const total = roles.length + verticals.length + geos.length;
  if (!total) return null;
  const Chip = ({ id, onRemove }) => { const t = tobj(id); return (
    <button onClick={() => onRemove(id)} style={{ display: "inline-flex", alignItems: "center", gap: 4, height: 22, padding: "0 7px 0 5px", borderRadius: 99, border: "1px solid var(--border2)", background: "var(--bg3)", fontFamily: "var(--font)", fontSize: 11.5, cursor: "pointer", color: "var(--fg)", gap: 4 }}>
      <span className={`tag ${t.color}`} style={{ fontSize: 10.5, padding: "0 4px" }}>{t.label}</span>
      <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="var(--fg3)" strokeWidth="3" strokeLinecap="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
    </button>
  ); };
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 4, alignItems: "center", margin: "7px 0 2px" }}>
      <span style={{ fontSize: 11, color: "var(--fg3)", flexShrink: 0 }}>Filters:</span>
      {roles.map(id => <Chip key={id} id={id} onRemove={onRemoveRole} />)}
      {verticals.map(id => <Chip key={id} id={id} onRemove={onRemoveVertical} />)}
      {geos.map(id => <Chip key={id} id={id} onRemove={onRemoveGeo} />)}
      {total > 1 && <button onClick={onClearAll} style={{ height: 22, padding: "0 8px", borderRadius: 99, border: "1px solid var(--border)", background: "none", fontFamily: "var(--font)", fontSize: 11, cursor: "pointer", color: "var(--fg3)" }}>Clear all</button>}
    </div>
  );
}

function ViewToggle({ view, setView, storageKey }) {
  const handleSet = v => { setView(v); try { localStorage.setItem(storageKey, v); } catch {} };
  const S = active => ({ width: 30, height: 28, border: `1px solid ${active ? "var(--border2)" : "var(--border)"}`, borderRadius: "var(--r2)", background: active ? "var(--bg3)" : "var(--bg)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: active ? "var(--fg)" : "var(--fg3)", transition: "all .1s" });
  return (
    <div style={{ display: "flex", gap: 3 }}>
      <button style={S(view === "list")} onClick={() => handleSet("list")} title="List">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/></svg>
      </button>
      <button style={S(view === "grid")} onClick={() => handleSet("grid")} title="Grid">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg>
      </button>
    </div>
  );
}

/* ══════════ LIST PAGES ══════════ */
function ContactsPage({ contacts, companies, projects, deals, lf, allVotes, onVote, currentUserId, currentUserKarma, onOpenEntity, onCreate }) {
  const [q, setQ] = useState("");
  const [roleFs, setRoleFs] = useState([]);
  const [vertFs, setVertFs] = useState([]);
  const [geoFs, setGeoFs] = useState([]);
  const [sort, setSort] = useState("karma");
  const [creating, setCreating] = useState(false);
  const [view, setView] = useState(() => { try { return localStorage.getItem("w3n_view_contacts") || "list"; } catch { return "list"; } });

  const list = useMemo(() => contacts.filter(c => {
    const n = q.toLowerCase();
    const mQ = !n || c.name.toLowerCase().includes(n) || (c.company || "").toLowerCase().includes(n) || (c.role || "").toLowerCase().includes(n);
    const mR = !roleFs.length || roleFs.some(r => c.role === r || c.tags?.includes(r));
    const mV = !vertFs.length || vertFs.some(v => c.tags?.includes(v));
    const mG = !geoFs.length || geoFs.some(g => c.tags?.includes(g));
    return mQ && mR && mV && mG;
  }).sort((a, b) => sort === "karma" ? (b.karma || 0) - (a.karma || 0) : sort === "name" ? a.name.localeCompare(b.name) : new Date(b.createdAt) - new Date(a.createdAt)), [contacts, q, roleFs, vertFs, geoFs, sort]);

  return (
    <div>
      <div className="ph">
        <div><div className="ph-t">Contacts</div><div className="ph-s">{contacts.length} in network · {list.length} shown</div></div>
        <button className="btn btn-p" onClick={() => setCreating(true)}><I n="plus" s={13} /> Add Contact</button>
      </div>
      <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
        <div style={{ position: "relative", flex: 1, minWidth: 180, maxWidth: 320 }}>
          <span style={{ position: "absolute", left: 8, top: "50%", transform: "translateY(-50%)" }}><I n="search" s={13} c="var(--fg3)" /></span>
          <input className="srch-in" style={{ paddingLeft: 27, width: "100%", height: 28 }} placeholder="Name, company…" value={q} onChange={e => setQ(e.target.value)} />
        </div>
        <FilterDropdown label="Role" options={ROLES} selected={roleFs} onToggle={id => setRoleFs(p => p.includes(id) ? p.filter(x => x !== id) : [...p, id])} onClear={() => setRoleFs([])} />
        <FilterDropdown label="Vertical" options={VERTICALS} selected={vertFs} onToggle={id => setVertFs(p => p.includes(id) ? p.filter(x => x !== id) : [...p, id])} onClear={() => setVertFs([])} />
        <FilterDropdown label="Geo" options={GEOS} selected={geoFs} onToggle={id => setGeoFs(p => p.includes(id) ? p.filter(x => x !== id) : [...p, id])} onClear={() => setGeoFs([])} />
        <select className="sel" style={{ width: 100, height: 28, flexShrink: 0 }} value={sort} onChange={e => setSort(e.target.value)}>
          <option value="karma">Karma ↓</option>
          <option value="name">Name A–Z</option>
          <option value="recent">Recent</option>
        </select>
        <ViewToggle view={view} setView={setView} storageKey="w3n_view_contacts" />
      </div>
      <ActiveChips roles={roleFs} verticals={vertFs} geos={geoFs} onRemoveRole={id => setRoleFs(p => p.filter(x => x !== id))} onRemoveVertical={id => setVertFs(p => p.filter(x => x !== id))} onRemoveGeo={id => setGeoFs(p => p.filter(x => x !== id))} onClearAll={() => { setRoleFs([]); setVertFs([]); setGeoFs([]); }} />

      {view === "list" && (
        <div className="card" style={{ marginTop: 10 }}>
          {list.map((c, i) => (
            <div key={c.id} className={`trow${entityClass(c)}`} style={{ borderBottom: i === list.length - 1 ? "none" : undefined }} onClick={() => onOpenEntity("contact", c.id)}>
              <div className="av" style={{ width: 32, height: 32, fontSize: 11 }}>{ini(c.name)}</div>
              <div style={{ flex: "0 0 190px", minWidth: 0 }}>
                <div style={{ fontWeight: 600, fontSize: 13, display: "flex", alignItems: "center", gap: 5 }}>{c.name}<TrustBadge entity={c} size={10} /></div>
                <div style={{ fontSize: 11.5, color: "var(--fg2)" }}>{c.company}</div>
              </div>
              <div style={{ flex: "0 0 90px" }}>{c.role && <Tag id={c.role} />}</div>
              <div style={{ flex: 1, display: "flex", gap: 3, flexWrap: "wrap" }}>
                {c.tags?.filter(t => VERTICALS.find(v => v.id === t)).slice(0, 3).map(t => <Tag key={t} id={t} />)}
                {c.tags?.filter(t => GEOS.find(g => g.id === t)).slice(0, 1).map(t => <Tag key={t} id={t} />)}
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
                <KarmaBadge karma={c.karma || 0} />
                <KarmaDisplay karma={c.karma || 0} up={c.karmaBreakdown?.up || 0} down={c.karmaBreakdown?.down || 0} size="sm" />
                <VoteButtons entityId={c.id} entityType="contact" entity={c} currentUserId={currentUserId} currentUserKarma={currentUserKarma} allVotes={allVotes} onVote={onVote} size="sm" />
              </div>
            </div>
          ))}
          {!list.length && <div className="empty"><div className="empty-ic"><I n="contacts" s={15} c="var(--fg3)" /></div><div className="empty-t">No contacts match</div><div className="empty-s">Try clearing filters</div></div>}
        </div>
      )}

      {view === "grid" && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(210px, 1fr))", gap: 9, marginTop: 10 }}>
          {list.map(c => (
            <div key={c.id} className={`card card-hover${entityClass(c)}`} style={{ padding: "13px 15px", cursor: "pointer" }} onClick={() => onOpenEntity("contact", c.id)}>
              <div style={{ display: "flex", alignItems: "center", gap: 9, marginBottom: 9 }}>
                <div className="av" style={{ width: 36, height: 36, fontSize: 12, flexShrink: 0 }}>{ini(c.name)}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: 13, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.name}</div>
                  <div style={{ fontSize: 11.5, color: "var(--fg2)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.company}</div>
                </div>
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 3, marginBottom: 7, minHeight: 20 }}>
                {c.role && <Tag id={c.role} />}
                {c.tags?.filter(t => VERTICALS.find(v => v.id === t)).slice(0, 2).map(t => <Tag key={t} id={t} />)}
              </div>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", borderTop: "1px solid var(--border)", paddingTop: 7, marginTop: 2 }}>
                <KarmaDisplay karma={c.karma || 0} up={c.karmaBreakdown?.up || 0} down={c.karmaBreakdown?.down || 0} size="sm" />
                <VoteButtons entityId={c.id} entityType="contact" entity={c} currentUserId={currentUserId} currentUserKarma={currentUserKarma} allVotes={allVotes} onVote={onVote} size="sm" />
              </div>
            </div>
          ))}
          {!list.length && <div className="empty" style={{ gridColumn: "1/-1" }}><div className="empty-ic"><I n="contacts" s={15} c="var(--fg3)" /></div><div className="empty-t">No contacts match</div></div>}
        </div>
      )}

      {creating && <CreateModal type="contact" onClose={() => setCreating(false)} onSave={onCreate} contacts={contacts} companies={companies} projects={projects} authorId={currentUserId} />}
    </div>
  );
}

function CompaniesPage({ companies, contacts, projects, allVotes, onVote, currentUserId, currentUserKarma, onOpenEntity, onCreate }) {
  const [q, setQ] = useState("");
  const [vertFs, setVertFs] = useState([]);
  const [geoFs, setGeoFs] = useState([]);
  const [creating, setCreating] = useState(false);
  const [view, setView] = useState(() => { try { return localStorage.getItem("w3n_view_companies") || "list"; } catch { return "list"; } });
  const list = useMemo(() => companies.filter(c => {
    const mQ = !q || c.name.toLowerCase().includes(q.toLowerCase()) || (c.description || "").toLowerCase().includes(q.toLowerCase());
    const mV = !vertFs.length || vertFs.some(v => c.tags?.includes(v));
    const mG = !geoFs.length || geoFs.some(g => c.tags?.includes(g));
    return mQ && mV && mG;
  }).sort((a, b) => getEffectiveKarma(b, "company", contacts, projects) - getEffectiveKarma(a, "company", contacts, projects)), [companies, q, vertFs, geoFs, contacts, projects]);
  return (
    <div>
      <div className="ph">
        <div><div className="ph-t">Companies</div><div className="ph-s">{companies.length} indexed · {list.length} shown</div></div>
        <button className="btn btn-p" onClick={() => setCreating(true)}><I n="plus" s={13} /> Add Company</button>
      </div>
      <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
        <div style={{ position: "relative", flex: 1, minWidth: 180, maxWidth: 300 }}>
          <span style={{ position: "absolute", left: 8, top: "50%", transform: "translateY(-50%)" }}><I n="search" s={13} c="var(--fg3)" /></span>
          <input className="srch-in" style={{ paddingLeft: 27, width: "100%", height: 28 }} value={q} onChange={e => setQ(e.target.value)} placeholder="Company name…" />
        </div>
        <FilterDropdown label="Vertical" options={VERTICALS} selected={vertFs} onToggle={id => setVertFs(p => p.includes(id) ? p.filter(x => x !== id) : [...p, id])} onClear={() => setVertFs([])} />
        <FilterDropdown label="Geo" options={GEOS} selected={geoFs} onToggle={id => setGeoFs(p => p.includes(id) ? p.filter(x => x !== id) : [...p, id])} onClear={() => setGeoFs([])} />
        <ViewToggle view={view} setView={setView} storageKey="w3n_view_companies" />
      </div>
      <ActiveChips roles={[]} verticals={vertFs} geos={geoFs} onRemoveRole={() => {}} onRemoveVertical={id => setVertFs(p => p.filter(x => x !== id))} onRemoveGeo={id => setGeoFs(p => p.filter(x => x !== id))} onClearAll={() => { setVertFs([]); setGeoFs([]); }} />
      {view === "list" && (
        <div className="card" style={{ marginTop: 10 }}>
          {list.map((co, i) => { const ek = getEffectiveKarma(co, "company", contacts, projects); return (
            <div key={co.id} className={`trow${entityClass(co)}`} style={{ borderBottom: i === list.length - 1 ? "none" : undefined }} onClick={() => onOpenEntity("company", co.id)}>
              <div className="av av-sq" style={{ width: 32, height: 32 }}><I n="company" s={13} c="var(--fg3)" /></div>
              <div style={{ flex: "0 0 180px" }}><div style={{ fontWeight: 600, fontSize: 13 }}>{co.name}</div><div style={{ fontSize: 11.5, color: "var(--fg2)" }}>{co.stage}</div></div>
              <div style={{ flex: 1, display: "flex", gap: 3, flexWrap: "wrap", alignItems: "center" }}>{co.tags?.slice(0, 4).map(t => <Tag key={t} id={t} />)}</div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
                <KarmaDisplay karma={ek} up={co.karmaBreakdown?.up || 0} down={co.karmaBreakdown?.down || 0} size="sm" />
                <VoteButtons entityId={co.id} entityType="company" entity={co} currentUserId={currentUserId} currentUserKarma={currentUserKarma} allVotes={allVotes} onVote={onVote} size="sm" />
              </div>
            </div>
          ); })}
          {!list.length && <div className="empty"><div className="empty-ic"><I n="company" s={15} c="var(--fg3)" /></div><div className="empty-t">No companies</div></div>}
        </div>
      )}
      {view === "grid" && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(210px, 1fr))", gap: 9, marginTop: 10 }}>
          {list.map(co => { const ek = getEffectiveKarma(co, "company", contacts, projects); return (
            <div key={co.id} className={`card card-hover${entityClass(co)}`} style={{ padding: "13px 15px", cursor: "pointer" }} onClick={() => onOpenEntity("company", co.id)}>
              <div style={{ display: "flex", alignItems: "center", gap: 9, marginBottom: 8 }}>
                <div className="av av-sq" style={{ width: 34, height: 34, flexShrink: 0 }}><I n="company" s={14} c="var(--fg3)" /></div>
                <div><div style={{ fontWeight: 600, fontSize: 13 }}>{co.name}</div><div style={{ fontSize: 11.5, color: "var(--fg2)" }}>{co.stage}</div></div>
              </div>
              <div style={{ fontSize: 12, color: "var(--fg2)", marginBottom: 8, overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}>{co.description}</div>
              <div style={{ display: "flex", gap: 3, flexWrap: "wrap", marginBottom: 8 }}>{co.tags?.slice(0, 3).map(t => <Tag key={t} id={t} />)}</div>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", borderTop: "1px solid var(--border)", paddingTop: 7 }}>
                <KarmaDisplay karma={ek} up={co.karmaBreakdown?.up || 0} down={co.karmaBreakdown?.down || 0} size="sm" />
                <VoteButtons entityId={co.id} entityType="company" entity={co} currentUserId={currentUserId} currentUserKarma={currentUserKarma} allVotes={allVotes} onVote={onVote} size="sm" />
              </div>
            </div>
          ); })}
          {!list.length && <div className="empty" style={{ gridColumn: "1/-1" }}><div className="empty-ic"><I n="company" s={15} c="var(--fg3)" /></div><div className="empty-t">No companies</div></div>}
        </div>
      )}
      {creating && <CreateModal type="company" onClose={() => setCreating(false)} onSave={onCreate} contacts={contacts} companies={companies} projects={projects} authorId={currentUserId} />}
    </div>
  );
}

function ProjectsPage({ projects, contacts, companies, allVotes, onVote, currentUserId, currentUserKarma, onOpenEntity, onCreate }) {
  const [q, setQ] = useState("");
  const [stageFs, setStageFs] = useState([]);
  const [vertFs, setVertFs] = useState([]);
  const [geoFs, setGeoFs] = useState([]);
  const [creating, setCreating] = useState(false);
  const [view, setView] = useState(() => { try { return localStorage.getItem("w3n_view_projects") || "list"; } catch { return "list"; } });
  const STAGE_OPTIONS = PROJECT_STAGES.map(s => ({ id: s, label: s, color: "t-s" }));
  const list = useMemo(() => projects.filter(p => {
    const mQ = !q || p.name.toLowerCase().includes(q.toLowerCase()) || (p.description || "").toLowerCase().includes(q.toLowerCase());
    const mS = !stageFs.length || stageFs.includes(p.stage);
    const mV = !vertFs.length || vertFs.some(v => p.tags?.includes(v));
    const mG = !geoFs.length || geoFs.some(g => p.tags?.includes(g));
    return mQ && mS && mV && mG;
  }).sort((a, b) => getEffectiveKarma(b, "project", contacts, projects) - getEffectiveKarma(a, "project", contacts, projects)), [projects, q, stageFs, vertFs, geoFs, contacts]);
  return (
    <div>
      <div className="ph">
        <div><div className="ph-t">Projects</div><div className="ph-s">{projects.length} indexed · {list.length} shown</div></div>
        <button className="btn btn-p" onClick={() => setCreating(true)}><I n="plus" s={13} /> Add Project</button>
      </div>
      <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
        <div style={{ position: "relative", flex: 1, minWidth: 180, maxWidth: 300 }}>
          <span style={{ position: "absolute", left: 8, top: "50%", transform: "translateY(-50%)" }}><I n="search" s={13} c="var(--fg3)" /></span>
          <input className="srch-in" style={{ paddingLeft: 27, width: "100%", height: 28 }} value={q} onChange={e => setQ(e.target.value)} placeholder="Project name…" />
        </div>
        <FilterDropdown label="Stage" options={STAGE_OPTIONS} selected={stageFs} onToggle={id => setStageFs(p => p.includes(id) ? p.filter(x => x !== id) : [...p, id])} onClear={() => setStageFs([])} />
        <FilterDropdown label="Vertical" options={VERTICALS} selected={vertFs} onToggle={id => setVertFs(p => p.includes(id) ? p.filter(x => x !== id) : [...p, id])} onClear={() => setVertFs([])} />
        <FilterDropdown label="Geo" options={GEOS} selected={geoFs} onToggle={id => setGeoFs(p => p.includes(id) ? p.filter(x => x !== id) : [...p, id])} onClear={() => setGeoFs([])} />
        <ViewToggle view={view} setView={setView} storageKey="w3n_view_projects" />
      </div>
      <ActiveChips roles={stageFs.map(s => ({ id: s, label: s, color: "t-s" })).map(x => x.id)} verticals={vertFs} geos={geoFs} onRemoveRole={id => setStageFs(p => p.filter(x => x !== id))} onRemoveVertical={id => setVertFs(p => p.filter(x => x !== id))} onRemoveGeo={id => setGeoFs(p => p.filter(x => x !== id))} onClearAll={() => { setStageFs([]); setVertFs([]); setGeoFs([]); }} />
      {view === "list" && (
        <div className="card" style={{ marginTop: 10 }}>
          {list.map((p, i) => { const ek = getEffectiveKarma(p, "project", contacts, projects); return (
            <div key={p.id} className={`trow${entityClass(p)}`} style={{ borderBottom: i === list.length - 1 ? "none" : undefined }} onClick={() => onOpenEntity("project", p.id)}>
              <div className="av av-sq" style={{ width: 32, height: 32 }}><I n="project" s={13} c="var(--fg3)" /></div>
              <div style={{ flex: "0 0 180px" }}><div style={{ fontWeight: 600, fontSize: 13 }}>{p.name}</div><div style={{ fontSize: 11.5, color: "var(--fg2)" }}>{p.stage}</div></div>
              <div style={{ flex: 1, display: "flex", gap: 3, flexWrap: "wrap", alignItems: "center" }}>{p.tags?.slice(0, 4).map(t => <Tag key={t} id={t} />)}</div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
                <KarmaDisplay karma={ek} up={p.karmaBreakdown?.up || 0} down={p.karmaBreakdown?.down || 0} size="sm" />
                <VoteButtons entityId={p.id} entityType="project" entity={p} currentUserId={currentUserId} currentUserKarma={currentUserKarma} allVotes={allVotes} onVote={onVote} size="sm" />
              </div>
            </div>
          ); })}
          {!list.length && <div className="empty"><div className="empty-ic"><I n="project" s={15} c="var(--fg3)" /></div><div className="empty-t">No projects match</div></div>}
        </div>
      )}
      {view === "grid" && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(210px, 1fr))", gap: 9, marginTop: 10 }}>
          {list.map(p => { const ek = getEffectiveKarma(p, "project", contacts, projects); return (
            <div key={p.id} className={`card card-hover${entityClass(p)}`} style={{ padding: "13px 15px", cursor: "pointer" }} onClick={() => onOpenEntity("project", p.id)}>
              <div style={{ display: "flex", alignItems: "center", gap: 9, marginBottom: 8 }}>
                <div className="av av-sq" style={{ width: 34, height: 34, flexShrink: 0 }}><I n="project" s={14} c="var(--fg3)" /></div>
                <div><div style={{ fontWeight: 600, fontSize: 13 }}>{p.name}</div><div style={{ fontSize: 11.5, color: "var(--fg2)" }}>{p.stage}</div></div>
              </div>
              <div style={{ fontSize: 12, color: "var(--fg2)", marginBottom: 8, overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}>{p.description}</div>
              <div style={{ display: "flex", gap: 3, flexWrap: "wrap", marginBottom: 8 }}>{p.tags?.slice(0, 3).map(t => <Tag key={t} id={t} />)}</div>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", borderTop: "1px solid var(--border)", paddingTop: 7 }}>
                <KarmaDisplay karma={ek} up={p.karmaBreakdown?.up || 0} down={p.karmaBreakdown?.down || 0} size="sm" />
                <VoteButtons entityId={p.id} entityType="project" entity={p} currentUserId={currentUserId} currentUserKarma={currentUserKarma} allVotes={allVotes} onVote={onVote} size="sm" />
              </div>
            </div>
          ); })}
          {!list.length && <div className="empty" style={{ gridColumn: "1/-1" }}><div className="empty-ic"><I n="project" s={15} c="var(--fg3)" /></div><div className="empty-t">No projects match</div></div>}
        </div>
      )}
      {creating && <CreateModal type="project" onClose={() => setCreating(false)} onSave={onCreate} contacts={contacts} companies={companies} projects={projects} authorId={currentUserId} />}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════
   SYNERGY ENGINE v1.0  —  Web3 Deal-Investor Matching
   ─────────────────────────────────────────────────────────────────
   Algorithm: Weighted Composite Score (Jaccard + rule-based)
   Based on: Gale-Shapley stable matching principles,
             AngelList/YC matching weights research,
             Web3 deal practice data (Messari/The Block 2024)

   Score Formula:
   S = 0.35 * vertical_jaccard
     + 0.30 * stage_match
     + 0.20 * ticket_fit
     + 0.10 * geo_jaccard
     + 0.05 * instrument_match
   ══════════════════════════════════════════════════════════════════ */

/* ══════════════════════════════════════════════════════════════════
   SYNERGY ENGINE v2.0  —  Web3 Deal-Investor Matching
   ─────────────────────────────────────────────────────────────────
   Research basis:
   · AngelList matching weights (2024)
   · Messari deal data analysis (2024)
   · Gale-Shapley stable matching theory (Nobel 2012)
   · Progressive scoring: hard gates → weighted composite

   Score Formula (v2):
   S = 0.30 * vertical_jaccard
     + 0.25 * stage_compatibility      ← upgraded from 0.30
     + 0.20 * ticket_overlap
     + 0.10 * instrument_compat
     + 0.08 * geo_match                ← upgraded from 0.10
     + 0.04 * terms_compat             ← NEW: cliff/vesting fit
     + 0.03 * kyc_geo_hard             ← NEW: hard constraint

   HARD GATES (score = 0 if any triggered):
   · KYC required but investor won't KYC
   · Geo restriction blocks investor's geo
   · Lead required but investor is follow-only
   · Ticket max < 2% of round (can't write meaningful check)
   ══════════════════════════════════════════════════════════════════ */

function jaccardSimilarity(a: string[], b: string[]): number {
  if (!a?.length || !b?.length) return 0;
  const setA = new Set(a);
  const setB = new Set(b);
  const intersection = [...setA].filter(x => setB.has(x)).length;
  const union = new Set([...setA, ...setB]).size;
  return union === 0 ? 0 : intersection / union;
}

// v2: smarter ticket fit with investor type awareness
function ticketFit(amount: number, minTicket: number, maxTicket: number): number {
  if (!amount || amount <= 0) return 0.5;
  const min = minTicket || 0;
  const max = maxTicket > 0 ? maxTicket : Infinity;
  // Investor typically writes 3-30% of round
  const targetMin = amount * 0.03;
  const targetMax = amount * 0.40;
  // Perfect zone: investor's max covers at least targetMin
  if (max >= targetMin && (min === 0 || min <= targetMax)) {
    // How well centered? Full score if comfortably in range
    const overlapLow = Math.max(min, targetMin);
    const overlapHigh = Math.min(max, targetMax);
    if (overlapLow <= overlapHigh) {
      const overlapRatio = (overlapHigh - overlapLow) / (targetMax - targetMin + 1);
      return Math.min(1, 0.5 + overlapRatio * 0.5);
    }
    return 0.45;
  }
  // Investor too small: max check < 2% of round → hard gate candidate
  if (max < amount * 0.02) return 0.1;
  // Investor too large: min check > 60% of round (likely too big)
  if (min > amount * 0.60) return 0.25;
  return 0.3;
}

// v2: Web3-aware instrument compatibility matrix
function instrumentCompat(fInstrument: string, fRound: string, iInstruments: string[]): number {
  if (!iInstruments?.length || iInstruments.includes("any")) return 1.0;
  // Direct match: fInstrument in investor preferred
  if (fInstrument && iInstruments.includes(fInstrument)) return 1.0;
  // Compatibility pairs (common Web3 deal practice)
  const compat: Record<string, string[]> = {
    "saft":          ["saft", "safe-warrant", "token", "any"],
    "safe":          ["safe", "safe-warrant", "equity", "convertible", "any"],
    "safe-warrant":  ["saft", "safe", "safe-warrant", "token", "any"],
    "equity":        ["equity", "safe", "convertible", "lp", "any"],
    "token":         ["token", "saft", "safe-warrant", "any"],
    "convertible":   ["convertible", "safe", "equity", "any"],
    "venture-debt":  ["venture-debt", "convertible", "rbf", "any"],
    "rbf":           ["rbf", "venture-debt", "any"],
    "otc":           ["otc", "token", "any"],
    "grant":         ["grant", "any"],
    "revenue-share": ["revenue-share", "rbf", "any"],
    "lp":            ["lp", "equity", "any"],
  };
  const compatList = compat[fInstrument] || [];
  const matches = iInstruments.filter(i => compatList.includes(i));
  if (matches.length > 0) return 0.65;
  // Stage-based fallback if no instrument specified on fundraiser
  if (!fInstrument) {
    const tokenStages = ["pre-tge","tge","private-sale","ido-ieo","launchpad","lp-provision"];
    const equityStages = ["series-a","series-b","series-c-plus","strategic"];
    const earlyStages = ["angels","pre-seed","seed"];
    const grantStages = ["grant-web3","grant-defi","grant-gov","gitcoin","retropgf","ecosystem-fund","hackathon","bounty"];
    const debtStages = ["safe","saft","convertible","venture-debt","rbf"];
    if (grantStages.includes(fRound) && iInstruments.some(i => ["grant","any"].includes(i))) return 0.9;
    if (tokenStages.includes(fRound) && iInstruments.some(i => ["saft","token","safe-warrant"].includes(i))) return 0.7;
    if (equityStages.includes(fRound) && iInstruments.some(i => ["equity","safe","convertible"].includes(i))) return 0.7;
    if (earlyStages.includes(fRound) && iInstruments.some(i => ["safe","safe-warrant","saft"].includes(i))) return 0.7;
    if (debtStages.includes(fRound) && iInstruments.some(i => ["convertible","safe","saft"].includes(i))) return 0.7;
    return 0.4;
  }
  return 0.2;
}

// v2: terms compatibility (cliff/vesting preference)
function termsCompat(fundraiser: any, investor: any): number {
  let score = 1.0;
  const fCliff = fundraiser.cliffMonths || 0;
  const fVest = fundraiser.vestingMonths || 0;
  const iMaxCliff = investor.maxCliffMonths;
  const iMinVest = investor.minVestingMonths;
  const iMaxVest = investor.maxVestingMonths;
  // Cliff check
  if (iMaxCliff != null && fCliff > iMaxCliff) score *= 0.5;
  // Vesting range
  if (iMinVest != null && fVest < iMinVest) score *= 0.7;
  if (iMaxVest != null && fVest > iMaxVest) score *= 0.7;
  return score;
}

interface SynergyScore {
  total: number;
  vertical: number;
  stage: number;
  ticket: number;
  geo: number;
  instrument: number;
  terms: number;
  hardBlocked: boolean;
  blockReason: string;
  tier: "hot" | "good" | "potential" | "none";
  label: string;
  color: string;
  missingData: string[];
  highlights: string[];   // positive match reasons
  concerns: string[];     // mismatch warnings
}

function computeSynergy(fundraiser: any, investor: any): SynergyScore {
  const missingData: string[] = [];
  const highlights: string[] = [];
  const concerns: string[] = [];

  // ── HARD GATE CHECKS ──────────────────────────────────────────
  let hardBlocked = false;
  let blockReason = "";

  // Gate 1: KYC
  if (fundraiser.kycRequired && investor.kycOk === false) {
    hardBlocked = true; blockReason = "Deal requires KYC, investor opted out";
  }
  // Gate 2: Geo restriction
  const fGeoRestrict: string[] = fundraiser.geoRestrictions || [];
  const iGeos: string[] = investor.preferredGeos || [];
  if (!hardBlocked && fGeoRestrict.length > 0 && iGeos.length > 0) {
    const geoOk = iGeos.some(g => fGeoRestrict.includes(g) || g === "global" || fGeoRestrict.includes("global"));
    if (!geoOk) { hardBlocked = true; blockReason = "Geo restriction — investor jurisdiction not allowed"; }
  }
  // Gate 3: Lead required
  if (!hardBlocked && fundraiser.leadRequired && investor.leadOnly === false) {
    concerns.push("Deal seeks lead investor — confirm if you lead");
  }
  // Gate 4: Ticket too small
  const iMax = investor.maxTicket || 0;
  const fAmount = fundraiser.amount || 0;
  if (!hardBlocked && fAmount > 0 && iMax > 0 && iMax < fAmount * 0.02) {
    hardBlocked = true; blockReason = `Max check ${fv(iMax)} too small for ${fv(fAmount)} round`;
  }

  if (hardBlocked) {
    return { total: 0, vertical: 0, stage: 0, ticket: 0, geo: 0, instrument: 0, terms: 0,
      hardBlocked, blockReason, tier: "none", label: "⛔ Blocked", color: "var(--danger-fg)",
      missingData, highlights, concerns };
  }

  // ── SOFT SCORING ────────────────────────────────────────────
  // 1. Vertical (30%)
  const fVerticals = (fundraiser.tags || []).filter((t: string) => VERTICALS.find(v => v.id === t));
  const iVerticals = investor.preferredVerticals || [];
  if (!fVerticals.length) missingData.push("fundraiser verticals");
  if (!iVerticals.length) missingData.push("investor verticals");
  const vertScore = jaccardSimilarity(fVerticals, iVerticals);
  const commonVerts = fVerticals.filter((v: string) => iVerticals.includes(v));
  if (commonVerts.length) highlights.push(`Vertical match: ${commonVerts.slice(0,2).map((v: string) => VERTICALS.find(x=>x.id===v)?.label||v).join(", ")}`);

  // 2. Stage (25%)
  const fRound = fundraiser.round || "";
  const iStages: string[] = investor.preferredStages || [];
  if (!fRound) missingData.push("fundraiser stage");
  if (!iStages.length) missingData.push("investor stages");
  let stageScore = 0.5;
  if (iStages.length > 0 && fRound) {
    if (iStages.includes(fRound)) {
      stageScore = 1.0;
      highlights.push(`Stage match: ${DEAL_ROUNDS.find(r=>r.id===fRound)?.label}`);
    } else {
      const fi = ROUND_STAGE_ORDER.indexOf(fRound);
      const closest = iStages.reduce((best: number, s: string) => {
        const si = ROUND_STAGE_ORDER.indexOf(s);
        return Math.min(best, fi >= 0 && si >= 0 ? Math.abs(fi - si) : 99);
      }, 99);
      stageScore = closest === 1 ? 0.55 : closest === 2 ? 0.3 : 0.1;
      if (closest <= 2) concerns.push("Stage is adjacent — may still work");
      else concerns.push(`Stage mismatch: investor focuses on ${iStages.slice(0,2).map(s=>DEAL_ROUNDS.find(r=>r.id===s)?.label||s).join(", ")}`);
    }
  }

  // 3. Ticket (20%)
  const iMin = investor.minTicket || 0;
  if (!fAmount) missingData.push("fundraiser amount");
  if (!iMin && !iMax) missingData.push("investor ticket range");
  const tktScore = ticketFit(fAmount, iMin, iMax);
  if (tktScore > 0.7) highlights.push(`Check fits round: ${iMax > 0 ? fv(iMin)+"–"+fv(iMax) : "flexible size"}`);
  else if (tktScore < 0.3) concerns.push("Ticket size may not align with round");

  // 4. Instrument (10%)
  const fInstrument = fundraiser.instrument || "";
  const iInstruments: string[] = investor.preferredInstruments || (investor.instrument ? [investor.instrument] : []);
  const instrScore = instrumentCompat(fInstrument, fRound, iInstruments);
  if (instrScore === 1.0 && fInstrument) highlights.push(`Instrument: ${INSTRUMENTS.find(i=>i.id===fInstrument)?.label||fInstrument}`);
  else if (instrScore < 0.5) concerns.push(`Instrument mismatch: ${fInstrument} vs ${iInstruments.join("/")}`);

  // 5. Geo (8%)
  const fGeos = (fundraiser.tags || []).filter((t: string) => GEOS.find(g => g.id === t));
  const geoScore = iGeos.includes("global") || fGeos.includes("global") ? 1.0 :
    !fGeos.length || !iGeos.length ? 0.5 :
    jaccardSimilarity(fGeos, iGeos);
  if (geoScore < 0.3 && fGeos.length && iGeos.length) concerns.push("Geo preference mismatch");

  // 6. Terms (4%)
  const termsScore = termsCompat(fundraiser, investor);
  if (termsScore < 0.6) concerns.push("Vesting/cliff terms may not align");

  // 7. KYC soft signal (3%)
  const kycScore = (!fundraiser.kycRequired || investor.kycOk !== false) ? 1.0 : 0.5;

  // ── WEIGHTED COMPOSITE ────────────────────────────────────
  const rawScore =
    vertScore   * 0.30 +
    stageScore  * 0.25 +
    tktScore    * 0.20 +
    instrScore  * 0.10 +
    geoScore    * 0.08 +
    termsScore  * 0.04 +
    kycScore    * 0.03;

  const total100 = Math.round(rawScore * 100);
  // Confidence adjustment: missing key data → penalty
  const confPenalty = Math.min(20, missingData.length * 4);
  const total = Math.max(0, total100 - confPenalty);

  const tier: SynergyScore["tier"] =
    total >= 72 ? "hot" :
    total >= 50 ? "good" :
    total >= 28 ? "potential" : "none";

  const label = tier === "hot" ? "🔥 Hot Match" :
    tier === "good" ? "✅ Good Match" :
    tier === "potential" ? "💡 Potential" : "—";

  const color = tier === "hot" ? "var(--warn-fg)" :
    tier === "good" ? "var(--tf-g)" :
    tier === "potential" ? "var(--acc)" : "var(--fg3)";

  return { total, vertical: vertScore, stage: stageScore, ticket: tktScore,
    geo: geoScore, instrument: instrScore, terms: termsScore,
    hardBlocked, blockReason, tier, label, color, missingData, highlights, concerns };
}

/* AI-powered synergy reasoning — routes through Next.js /api/parse proxy */
async function fetchSynergyInsight(fundraiser: any, investor: any, score: SynergyScore): Promise<string> {
  try {
    const prompt = `You are a Web3 deal analyst. Analyze this fundraiser-investor match and give a SHORT (3-4 sentences) deal insight in English. Be specific about what aligns and what doesn't. Be direct and practical — no fluff.

FUNDRAISER: ${JSON.stringify({
  title: fundraiser.title,
  round: fundraiser.round,
  amount: fundraiser.amount,
  verticals: (fundraiser.tags||[]).filter((t:string)=>VERTICALS.find(v=>v.id===t)),
  geos: (fundraiser.tags||[]).filter((t:string)=>GEOS.find(g=>g.id===t)),
  description: fundraiser.description?.slice(0,200),
})}

INVESTOR: ${JSON.stringify({
  title: investor.title,
  minTicket: investor.minTicket,
  maxTicket: investor.maxTicket,
  preferredStages: investor.preferredStages,
  preferredVerticals: investor.preferredVerticals,
  preferredGeos: investor.preferredGeos,
  instrument: investor.instrument,
  description: investor.description?.slice(0,200),
})}

MATCH SCORE: ${score.total}% (vertical: ${Math.round(score.vertical*100)}%, stage: ${Math.round(score.stage*100)}%, ticket: ${Math.round(score.ticket*100)}%, geo: ${Math.round(score.geo*100)}%)

Reply with ONLY the analysis paragraph, no headers, no bullet points, no JSON.`;

    const resp = await fetch("/api/parse", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "synergy_insight", text: prompt }),
    });
    if (!resp.ok) throw new Error("API " + resp.status);
    const data = await resp.json();
    // api/parse returns { result } for free-form calls
    return data.result || data.insight || "Unable to generate insight.";
  } catch (e) {
    return "AI insight unavailable — check API key in Vercel environment variables.";
  }
}

/* ── Synergy Card Component ──────────────────────────────────────── */
function SynergyCard({ fundraiser, investor, onOpen }: { fundraiser: any; investor: any; onOpen: (type: string, id: string) => void }) {
  const score = useMemo(() => computeSynergy(fundraiser, investor), [fundraiser, investor]);
  const [insight, setInsight] = useState<string | null>(null);
  const [loadingInsight, setLoadingInsight] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const loadInsight = async () => {
    if (insight) { setExpanded(e => !e); return; }
    setExpanded(true); setLoadingInsight(true);
    const text = await fetchSynergyInsight(fundraiser, investor, score);
    setInsight(text); setLoadingInsight(false);
  };

  const ScoreBar = ({ value, label, color }: { value: number; label: string; color: string }) => (
    <div style={{ marginBottom: 5 }}>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10.5, marginBottom: 2 }}>
        <span style={{ color: "var(--fg3)" }}>{label}</span>
        <span style={{ fontFamily: "var(--mono)", color, fontWeight: 600 }}>{Math.round(value * 100)}%</span>
      </div>
      <div style={{ height: 4, background: "var(--bg3)", borderRadius: 3 }}>
        <div style={{ height: "100%", width: `${value * 100}%`, background: color, borderRadius: 3, transition: "width .5s ease" }} />
      </div>
    </div>
  );

  // Hard blocked — show compact blocked card
  if (score.hardBlocked) {
    return (
      <div className="card card-p" style={{ marginBottom: 8, opacity: 0.65, border: "1px solid var(--danger-border)" }}>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <span style={{ fontSize: 18 }}>⛔</span>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 600, fontSize: 13 }}>{fundraiser.title} × {investor.title}</div>
            <div style={{ fontSize: 11.5, color: "var(--danger-fg)", marginTop: 2 }}>{score.blockReason}</div>
          </div>
          <span style={{ fontSize: 11, color: "var(--fg3)", fontFamily: "var(--mono)" }}>Blocked</span>
        </div>
      </div>
    );
  }

  const fInstrLabel = INSTRUMENTS.find(i => i.id === fundraiser.instrument)?.label;
  const iInstrLabels = (investor.preferredInstruments || (investor.instrument ? [investor.instrument] : []))
    .map((id: string) => INSTRUMENTS.find(i => i.id === id)?.label || id).join(", ");

  return (
    <div className="card card-p" style={{ marginBottom: 8 }}>
      {/* Two-panel header */}
      <div style={{ display: "flex", gap: 8, alignItems: "stretch", marginBottom: 10 }}>
        {/* Fundraiser panel */}
        <div style={{ flex: 1, background: "var(--bg2)", borderRadius: 8, padding: "9px 11px", cursor: "pointer", border: "1px solid oklch(0.4 0.08 240 / 0.4)" }}
          onClick={() => onOpen("deal", fundraiser.id)}>
          <div style={{ fontSize: 9.5, fontWeight: 700, color: "oklch(0.6 0.14 240)", textTransform: "uppercase", letterSpacing: ".6px", marginBottom: 4 }}>📈 Fundraiser</div>
          <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 3, lineHeight: 1.2 }}>{fundraiser.title}</div>
          <div style={{ fontSize: 11.5, color: "var(--fg2)", marginBottom: 4 }}>
            {DEAL_ROUNDS.find(r => r.id === fundraiser.round)?.label || "—"}
            {fundraiser.amount > 0 && <span style={{ fontFamily: "var(--mono)", marginLeft: 5, color: "var(--tf-g)", fontWeight: 600 }}>{fv(fundraiser.amount)}</span>}
          </div>
          {fInstrLabel && <div style={{ fontSize: 10.5, color: "var(--fg3)", marginBottom: 4 }}>🔑 {fInstrLabel}{fundraiser.cliffMonths ? ` · ${fundraiser.cliffMonths}m cliff` : ""}{fundraiser.vestingMonths ? ` · ${fundraiser.vestingMonths}m vest` : ""}</div>}
          <div style={{ display: "flex", gap: 3, flexWrap: "wrap" }}>
            {(fundraiser.tags || []).filter((t: string) => VERTICALS.find(v => v.id === t)).slice(0, 3).map((t: string) => <Tag key={t} id={t} />)}
          </div>
        </div>

        {/* Score column */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minWidth: 62, gap: 3 }}>
          <div style={{ fontSize: 26, fontWeight: 900, fontFamily: "var(--mono)", color: score.color, lineHeight: 1 }}>{score.total}</div>
          <div style={{ fontSize: 8.5, color: "var(--fg3)", textTransform: "uppercase", letterSpacing: ".4px" }}>score</div>
          <div style={{ fontSize: 10, fontWeight: 700, color: score.color, textAlign: "center", whiteSpace: "nowrap" }}>{score.label}</div>
        </div>

        {/* Investor panel */}
        <div style={{ flex: 1, background: "var(--bg2)", borderRadius: 8, padding: "9px 11px", cursor: "pointer", border: "1px solid oklch(0.4 0.08 160 / 0.4)" }}
          onClick={() => onOpen("deal", investor.id)}>
          <div style={{ fontSize: 9.5, fontWeight: 700, color: "oklch(0.6 0.14 160)", textTransform: "uppercase", letterSpacing: ".6px", marginBottom: 4 }}>💰 Investor</div>
          <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 3, lineHeight: 1.2 }}>{investor.title}</div>
          <div style={{ fontSize: 11.5, color: "var(--fg2)", marginBottom: 4 }}>
            {investor.minTicket > 0 || investor.maxTicket > 0
              ? <span style={{ fontFamily: "var(--mono)", color: "var(--tf-g)", fontWeight: 600 }}>{fv(investor.minTicket || 0)}–{investor.maxTicket > 0 ? fv(investor.maxTicket) : "∞"}</span>
              : <span style={{ color: "var(--fg3)" }}>Any size</span>}
          </div>
          {iInstrLabels && <div style={{ fontSize: 10.5, color: "var(--fg3)", marginBottom: 4 }}>🔑 {iInstrLabels}</div>}
          <div style={{ display: "flex", gap: 3, flexWrap: "wrap" }}>
            {(investor.preferredVerticals || []).slice(0, 3).map((t: string) => <Tag key={t} id={t} />)}
          </div>
        </div>
      </div>

      {/* Score bars — 6 dimensions */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1px 18px", marginBottom: 8 }}>
        <ScoreBar value={score.vertical}    label="Vertical"    color="oklch(0.58 0.16 240)" />
        <ScoreBar value={score.stage}       label="Stage"       color="oklch(0.58 0.16 150)" />
        <ScoreBar value={score.ticket}      label="Ticket Fit"  color="oklch(0.58 0.16 80)"  />
        <ScoreBar value={score.instrument}  label="Instrument"  color="oklch(0.58 0.16 300)" />
        <ScoreBar value={score.geo}         label="Geo"         color="oklch(0.58 0.12 200)" />
        <ScoreBar value={score.terms}       label="Terms Fit"   color="oklch(0.58 0.12 40)"  />
      </div>

      {/* Highlights & Concerns */}
      {(score.highlights.length > 0 || score.concerns.length > 0) && (
        <div style={{ display: "flex", gap: 6, marginBottom: 8 }}>
          {score.highlights.length > 0 && (
            <div style={{ flex: 1, background: "var(--ok-bg)", border: "1px solid var(--ok-border)", borderRadius: 6, padding: "6px 9px" }}>
              {score.highlights.map((h, i) => (
                <div key={i} style={{ fontSize: 11, color: "var(--ok-fg)", lineHeight: 1.5 }}>✓ {h}</div>
              ))}
            </div>
          )}
          {score.concerns.length > 0 && (
            <div style={{ flex: 1, background: "var(--warn-bg)", border: "1px solid var(--warn-border)", borderRadius: 6, padding: "6px 9px" }}>
              {score.concerns.map((c, i) => (
                <div key={i} style={{ fontSize: 11, color: "var(--warn-fg)", lineHeight: 1.5 }}>⚠ {c}</div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Missing data */}
      {score.missingData.length > 0 && (
        <div style={{ fontSize: 11, color: "var(--fg3)", marginBottom: 8, padding: "4px 8px", background: "var(--bg3)", borderRadius: 5 }}>
          💡 Enrich: {score.missingData.join(" · ")} → better score accuracy
        </div>
      )}

      {/* AI Insight button */}
      <button className="btn btn-sm" style={{ width: "100%", justifyContent: "center", fontSize: 12 }} onClick={loadInsight}>
        {loadingInsight
          ? <><svg style={{ animation: "spin 0.8s linear infinite" }} width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M21 12a9 9 0 1 1-6.219-8.56" /></svg> AI analyzing…</>
          : expanded ? "▲ Hide Insight" : "✦ AI Deal Insight"}
      </button>
      {expanded && insight && (
        <div style={{ marginTop: 8, background: "var(--bg3)", border: "1px solid var(--border)", borderRadius: 7, padding: "11px 13px", fontSize: 12.5, color: "var(--fg2)", lineHeight: 1.7 }}>
          <span style={{ fontSize: 9.5, fontWeight: 800, color: "var(--acc)", textTransform: "uppercase", letterSpacing: ".5px", display: "block", marginBottom: 5 }}>✦ AI Deal Insight</span>
          {insight}
        </div>
      )}
    </div>
  );
}

/* ── Synergy Tab ──────────────────────────────────────────────────── */
function SynergyTab({ deals, onOpen, onSwitchTab }: { deals: any[]; onOpen: (type: string, id: string) => void; onSwitchTab: (tab: string) => void }) {
  const ACTIVE_F = ["active","draft"];
  const ACTIVE_I = ["active","draft"];
  const fundraisers = deals.filter(d => d.dealMode !== "investing" && ACTIVE_F.includes(d.status));
  const investors   = deals.filter(d => d.dealMode === "investing"  && ACTIVE_I.includes(d.status));

  const [sortBy, setSortBy] = useState<"score"|"stage"|"vertical"|"ticket">("score");
  const [filterTier, setFilterTier] = useState<"all"|"hot"|"good"|"potential">("all");
  const [showBlocked, setShowBlocked] = useState(false);

  // All pairs including blocked
  const allPairs = useMemo(() => {
    const result: { fundraiser: any; investor: any; score: SynergyScore }[] = [];
    for (const f of fundraisers) for (const inv of investors) {
      const score = computeSynergy(f, inv);
      result.push({ fundraiser: f, investor: inv, score });
    }
    return result;
  }, [fundraisers, investors]);

  const blockedPairs = allPairs.filter(p => p.score.hardBlocked);
  const activePairs = allPairs
    .filter(p => !p.score.hardBlocked && p.score.total >= 25)
    .filter(p => filterTier === "all" ? true : p.score.tier === filterTier)
    .sort((a, b) => {
      if (sortBy === "score")    return b.score.total - a.score.total;
      if (sortBy === "stage")    return b.score.stage - a.score.stage;
      if (sortBy === "vertical") return b.score.vertical - a.score.vertical;
      if (sortBy === "ticket")   return b.score.ticket - a.score.ticket;
      return 0;
    });

  const hotCount  = allPairs.filter(p => !p.score.hardBlocked && p.score.tier === "hot").length;
  const goodCount = allPairs.filter(p => !p.score.hardBlocked && p.score.tier === "good").length;

  /* ── Empty state: both missing ── */
  if (fundraisers.length === 0 && investors.length === 0) return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "50px 24px", textAlign: "center", gap: 16 }}>
      <div style={{ fontSize: 44 }}>🤝</div>
      <div style={{ fontSize: 16, fontWeight: 800 }}>Create deals to unlock Synergy</div>
      <div style={{ fontSize: 13, color: "var(--fg3)", maxWidth: 360, lineHeight: 1.7 }}>
        Post what you're <strong>seeking</strong> (capital, grant, accelerator) or what you're <strong>deploying</strong> (investment, grant, prize) — Synergy automatically matches both sides by vertical, stage, ticket, instrument, geo & terms.
      </div>
      <div style={{ display: "flex", gap: 10, marginTop: 4 }}>
        <button className="btn btn-p" style={{ padding: "9px 20px", fontSize: 13, fontWeight: 700 }} onClick={() => onSwitchTab("fundraising")}>
          📣 I'm Seeking
        </button>
        <button className="btn btn-p" style={{ padding: "9px 20px", fontSize: 13, fontWeight: 700 }} onClick={() => onSwitchTab("investing")}>
          💰 I'm Deploying
        </button>
      </div>
    </div>
  );

  /* ── Empty state: one side missing ── */
  if (fundraisers.length === 0 || investors.length === 0) {
    const missingMode = fundraisers.length === 0 ? "fundraising" : "investing";
    const missingLabel = missingMode === "fundraising" ? "Seeking post" : "Deploying post";
    const missingIcon  = missingMode === "fundraising" ? "📣" : "💰";
    const existingLabel = missingMode === "fundraising"
      ? `${investors.length} deploying post${investors.length > 1 ? "s" : ""} active`
      : `${fundraisers.length} seeking post${fundraisers.length > 1 ? "s" : ""} active`;
    return (
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "46px 24px", textAlign: "center", gap: 12 }}>
        <div style={{ fontSize: 36 }}>⚡</div>
        <div style={{ fontSize: 15, fontWeight: 800 }}>Almost there</div>
        <div style={{ background: "var(--bg2)", border: "1px solid var(--border)", borderRadius: 10, padding: "12px 18px", width: "100%", maxWidth: 360 }}>
          <div style={{ fontSize: 12, color: "var(--tf-g)", marginBottom: 3 }}>✓ {existingLabel}</div>
          <div style={{ fontSize: 12, color: "var(--fg3)" }}>{missingIcon} Add a <strong>{missingLabel}</strong> to start matching</div>
        </div>
        <button className="btn btn-p" style={{ padding: "9px 20px", fontSize: 13, fontWeight: 700 }} onClick={() => onSwitchTab(missingMode)}>
          {missingIcon} Post {missingLabel}
        </button>
        <div style={{ fontSize: 11.5, color: "var(--fg3)" }}>
          Or browse existing {missingMode === "fundraising"
            ? <span style={{ cursor: "pointer", textDecoration: "underline" }} onClick={() => onSwitchTab("investing")}>Deploying posts →</span>
            : <span style={{ cursor: "pointer", textDecoration: "underline" }} onClick={() => onSwitchTab("fundraising")}>Seeking posts →</span>}
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Stats strip */}
      <div style={{ display: "flex", gap: 6, marginBottom: 12 }}>
        {[
          { label: "🔥 Hot",        val: hotCount,          color: "var(--warn-fg)",         bg: "var(--warn-bg)",  border: "var(--warn-border)" },
          { label: "✅ Good",        val: goodCount,          color: "var(--tf-g)",            bg: "var(--ok-bg)",   border: "var(--ok-border)" },
          { label: "📣 Seeking",    val: fundraisers.length, color: "oklch(0.6 0.14 240)",    bg: "var(--bg2)",     border: "var(--border)" },
          { label: "💰 Deploying",  val: investors.length,   color: "oklch(0.6 0.14 160)",    bg: "var(--bg2)",     border: "var(--border)" },
        ].map(s => (
          <div key={s.label} style={{ flex: 1, background: s.bg, border: `1px solid ${s.border}`, borderRadius: 7, padding: "7px 8px", textAlign: "center" }}>
            <div style={{ fontFamily: "var(--mono)", fontSize: 17, fontWeight: 800, color: s.color, lineHeight: 1 }}>{s.val}</div>
            <div style={{ fontSize: 10, color: "var(--fg3)", marginTop: 2 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Algorithm legend */}
      <div style={{ background: "var(--bg3)", border: "1px solid var(--border)", borderRadius: 7, padding: "8px 12px", marginBottom: 12, fontSize: 11, color: "var(--fg3)", lineHeight: 1.6 }}>
        <strong style={{ color: "var(--fg)" }}>Synergy Score™ v2</strong> · Vertical 30% · Stage 25% · Ticket 20% · Instrument 10% · Geo 8% · Terms 4% · Hard gates: KYC / Geo restrictions / Ticket size
      </div>

      {/* Filters */}
      <div className="fb" style={{ marginBottom: 10, flexWrap: "wrap", gap: 5 }}>
        <span className="fb-lbl">Show:</span>
        {[{id:"all",label:"All"},{id:"hot",label:"🔥 Hot"},{id:"good",label:"✅ Good"},{id:"potential",label:"💡 Potential"}].map(f => (
          <button key={f.id} className={`fp${filterTier === f.id ? " on" : ""}`} onClick={() => setFilterTier(f.id as any)}>{f.label}</button>
        ))}
        <span className="fb-lbl" style={{ marginLeft: 6 }}>Sort:</span>
        {[{id:"score",label:"Score"},{id:"vertical",label:"Vertical"},{id:"stage",label:"Stage"},{id:"ticket",label:"Ticket"}].map(s => (
          <button key={s.id} className={`fp${sortBy === s.id ? " on" : ""}`} onClick={() => setSortBy(s.id as any)}>{s.label}</button>
        ))}
      </div>

      {/* Active pairs */}
      {activePairs.length === 0 ? (
        <div className="empty">
          <div className="empty-ic"><I n="deals" s={15} c="var(--fg3)" /></div>
          <div className="empty-t">No matches for this filter</div>
          <div style={{ fontSize: 12, color: "var(--fg3)", marginTop: 4 }}>Add verticals, stage, and ticket size to your deals for better results</div>
        </div>
      ) : activePairs.map(p => (
        <SynergyCard key={`${p.fundraiser.id}-${p.investor.id}`} fundraiser={p.fundraiser} investor={p.investor} onOpen={onOpen} />
      ))}

      {/* Blocked pairs toggle */}
      {blockedPairs.length > 0 && (
        <div style={{ marginTop: 12 }}>
          <button className="btn btn-g btn-sm" style={{ width: "100%", justifyContent: "center", fontSize: 11.5 }}
            onClick={() => setShowBlocked(b => !b)}>
            {showBlocked ? "▲ Hide" : "▼ Show"} {blockedPairs.length} blocked pair{blockedPairs.length > 1 ? "s" : ""} (hard gate violations)
          </button>
          {showBlocked && blockedPairs.map(p => (
            <SynergyCard key={`blocked-${p.fundraiser.id}-${p.investor.id}`} fundraiser={p.fundraiser} investor={p.investor} onOpen={onOpen} />
          ))}
        </div>
      )}
    </div>
  );
}


function DealsPage({ deals, contacts, onOpenEntity, onCreate, currentUserId }) {
  const [tab, setTab] = useState("fundraising"); // "fundraising" | "investing" | "synergy"
  const [q, setQ] = useState("");
  const [viewMode, setViewMode] = useState<"list"|"grid">("list");
  const [creating, setCreating] = useState(false);
  const [creatingType, setCreatingType] = useState("fundraising");

  // ── Filters ──
  const [fltStatus,     setFltStatus]     = useState<string|null>(null);
  const [fltType,       setFltType]       = useState<string|null>(null); // seeking type / capital type
  const [fltVerticals,  setFltVerticals]  = useState<string[]>([]);
  const [fltRound,      setFltRound]      = useState<string|null>(null);
  const [fltInstrument, setFltInstrument] = useState<string|null>(null);
  const [fltGeo,        setFltGeo]        = useState<string|null>(null);
  const [fltAmountMin,  setFltAmountMin]  = useState<number>(0);
  const [sortBy,        setSortBy]        = useState<"newest"|"amount"|"active">("newest");
  const [showFilters,   setShowFilters]   = useState(false);

  const clearFilters = () => {
    setFltStatus(null); setFltType(null); setFltVerticals([]);
    setFltRound(null); setFltInstrument(null); setFltGeo(null);
    setFltAmountMin(0); setSortBy("newest");
  };
  const activeFilterCount = [fltStatus, fltType, fltRound, fltInstrument, fltGeo]
    .filter(Boolean).length + fltVerticals.length + (fltAmountMin > 0 ? 1 : 0);

  const fundraisingDeals = useMemo(() => deals.filter(d => d.dealMode !== "investing"), [deals]);
  const investingDeals   = useMemo(() => deals.filter(d => d.dealMode === "investing"),  [deals]);
  const activeList = tab === "fundraising" ? fundraisingDeals : investingDeals;

  const filtered = useMemo(() => {
    let list = activeList.filter(d => {
      if (q && !d.title?.toLowerCase().includes(q.toLowerCase()) &&
               !d.description?.toLowerCase().includes(q.toLowerCase())) return false;
      if (fltStatus && d.status !== fltStatus) return false;
      if (fltType) {
        if (tab === "fundraising" && d.seekingType !== fltType) return false;
        if (tab === "investing"   && d.investorType !== fltType) return false;
      }
      if (fltRound) {
        if (tab === "fundraising" && d.round !== fltRound) return false;
        if (tab === "investing"   && !(d.preferredStages||[]).includes(fltRound)) return false;
      }
      if (fltInstrument) {
        if (tab === "fundraising" && d.instrument && d.instrument !== fltInstrument) return false;
        if (tab === "investing"   && !(d.preferredInstruments||[]).includes(fltInstrument)) return false;
      }
      if (fltGeo) {
        const dGeos = tab === "fundraising" ? (d.geoRestrictions||[]) : (d.preferredGeos||[]);
        if (dGeos.length > 0 && !dGeos.includes(fltGeo) && !dGeos.includes("global")) return false;
      }
      if (fltVerticals.length > 0) {
        const dVerts = tab === "fundraising" ? (d.tags||[]) : (d.preferredVerticals||[]);
        if (!fltVerticals.some(v => dVerts.includes(v))) return false;
      }
      if (fltAmountMin > 0) {
        const amt = tab === "fundraising" ? (d.amount||0) : (d.maxTicket||0);
        if (amt < fltAmountMin) return false;
      }
      return true;
    });
    if (sortBy === "newest") list = list.sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    if (sortBy === "amount") list = list.sort((a,b) => ((b.amount||b.maxTicket||0) - (a.amount||a.maxTicket||0)));
    if (sortBy === "active") list = list.sort((a,b) => (a.status === "active" ? -1 : 1));
    return list;
  }, [activeList, q, fltStatus, fltType, fltRound, fltInstrument, fltGeo, fltVerticals, fltAmountMin, sortBy, tab]);

  // Vertical options used in current list
  const usedVerticals = useMemo(() => {
    const all = activeList.flatMap(d => tab === "fundraising" ? (d.tags||[]) : (d.preferredVerticals||[]));
    return VERTICALS.filter(v => all.includes(v.id));
  }, [activeList, tab]);


  return (
    <div>
      <div className="ph">
        <div>
          <div className="ph-t">Deals</div>
          <div className="ph-s">{fundraisingDeals.length} seeking · {investingDeals.length} deploying</div>
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          {tab !== "synergy" && (
            <button className="btn btn-p" onClick={() => { setCreatingType(tab === "investing" ? "investing" : "fundraising"); setCreating(true); }}>
              <I n="plus" s={13} /> {tab === "investing" ? "💰 I'm Deploying" : "📣 I'm Seeking"}
            </button>
          )}
        </div>
      </div>

      {/* Three main tabs */}
      <div className="tabs" style={{ marginBottom: 14 }}>
        <button
          className={`tab${tab === "fundraising" ? " on" : ""}`}
          onClick={() => { setTab("fundraising"); clearFilters(); setQ(""); }}
        >
          📣 Seeking
          {fundraisingDeals.filter(d => d.status === "active").length > 0 &&
            <span style={{ marginLeft: 5, fontSize: 11, fontFamily: "var(--mono)", opacity: .7 }}>
              {fundraisingDeals.filter(d => d.status === "active").length}
            </span>
          }
        </button>
        <button
          className={`tab${tab === "investing" ? " on" : ""}`}
          onClick={() => { setTab("investing"); clearFilters(); setQ(""); }}
        >
          💰 Deploying
          {investingDeals.filter(d => d.status === "active").length > 0 &&
            <span style={{ marginLeft: 5, fontSize: 11, fontFamily: "var(--mono)", opacity: .7 }}>
              {investingDeals.filter(d => d.status === "active").length}
            </span>
          }
        </button>
        <button
          className={`tab${tab === "synergy" ? " on" : ""}`}
          onClick={() => { setTab("synergy"); setFltStatus(null); setQ(""); }}
          style={tab === "synergy" ? {} : { color: "oklch(0.6 0.15 280)" }}
        >
          🤝 Synergy
          {(() => {
            const f = deals.filter(d => d.dealMode !== "investing" && d.status === "active");
            const inv = deals.filter(d => d.dealMode === "investing" && d.status === "active");
            let hot = 0;
            for (const fr of f) for (const iv of inv) { if (computeSynergy(fr, iv).tier === "hot") hot++; }
            return hot > 0 ? <span style={{ marginLeft: 5, fontSize: 11, fontFamily: "var(--mono)", color: "var(--warn-fg)", fontWeight: 700 }}>🔥{hot}</span> : null;
          })()}
        </button>
      </div>

      {/* Synergy tab render */}
      {tab === "synergy" && <SynergyTab deals={deals} onOpen={onOpenEntity} onSwitchTab={(t) => { setTab(t); clearFilters(); setQ(""); }} />}

      {/* ── Search + toolbar ── */}
      {tab !== "synergy" && (<>
        <div style={{ display: "flex", gap: 7, marginBottom: 8, alignItems: "center" }}>
          {/* Search */}
          <div style={{ position: "relative", flex: 1 }}>
            <span style={{ position: "absolute", left: 8, top: "50%", transform: "translateY(-50%)" }}>
              <I n="search" s={13} c="var(--fg3)" />
            </span>
            <input className="srch-in" style={{ paddingLeft: 27, width: "100%" }}
              value={q} onChange={e => setQ(e.target.value)}
              placeholder={tab === "fundraising" ? "Search seeking posts..." : "Search deploying posts..."} />
          </div>
          {/* Filter toggle */}
          <button className={`btn btn-g btn-sm${showFilters ? " on" : ""}`}
            style={activeFilterCount > 0 ? { borderColor: "var(--accent)", color: "var(--accent)" } : {}}
            onClick={() => setShowFilters(f => !f)}>
            ⚙ Filters{activeFilterCount > 0 ? ` (${activeFilterCount})` : ""}
          </button>
          {/* Sort */}
          <select className="sel" style={{ fontSize: 12, padding: "5px 8px", width: "auto" }}
            value={sortBy} onChange={e => setSortBy(e.target.value as any)}>
            <option value="newest">🕐 Newest</option>
            <option value="amount">💰 By Amount</option>
            <option value="active">● Active first</option>
          </select>
          {/* List / Grid toggle */}
          <div style={{ display: "flex", border: "1px solid var(--border)", borderRadius: 6, overflow: "hidden" }}>
            <button onClick={() => setViewMode("list")}
              style={{ padding: "5px 9px", background: viewMode === "list" ? "var(--bg3)" : "transparent", border: "none", cursor: "pointer", color: viewMode === "list" ? "var(--fg)" : "var(--fg3)", fontSize: 13 }}>
              ☰
            </button>
            <button onClick={() => setViewMode("grid")}
              style={{ padding: "5px 9px", background: viewMode === "grid" ? "var(--bg3)" : "transparent", border: "none", cursor: "pointer", color: viewMode === "grid" ? "var(--fg)" : "var(--fg3)", fontSize: 13, borderLeft: "1px solid var(--border)" }}>
              ⊞
            </button>
          </div>
        </div>

        {/* ── Expanded filter panel ── */}
        {showFilters && (
          <div style={{ background: "var(--bg2)", border: "1px solid var(--border)", borderRadius: 9, padding: "12px 14px", marginBottom: 12 }}>
            {/* Row 1: Status + Type */}
            <div style={{ display: "flex", gap: 14, flexWrap: "wrap", marginBottom: 10 }}>
              <div>
                <div style={{ fontSize: 10.5, color: "var(--fg3)", fontWeight: 600, marginBottom: 5, textTransform: "uppercase", letterSpacing: ".4px" }}>Status</div>
                <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                  {[{ id: null, label: "All" }, ...DEAL_STATUSES].map(s => (
                    <button key={s.id ?? "all"} className={`fp${fltStatus === s.id ? " on" : ""}`}
                      onClick={() => setFltStatus(fltStatus === s.id ? null : s.id)}>
                      {s.id === "active" ? "● " : s.id === "paused" ? "⏸ " : s.id === "filled" ? "✓ " : ""}{s.label ?? "All"}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <div style={{ fontSize: 10.5, color: "var(--fg3)", fontWeight: 600, marginBottom: 5, textTransform: "uppercase", letterSpacing: ".4px" }}>
                  {tab === "fundraising" ? "Seeking Type" : "Investor Type"}
                </div>
                <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                  {(tab === "fundraising" ? SEEKING_TYPES : INVESTOR_TYPES.slice(0, 8)).map((t: any) => (
                    <button key={t.id} className={`fp${fltType === t.id ? " on" : ""}`}
                      onClick={() => setFltType(fltType === t.id ? null : t.id)}>
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            {/* Row 2: Round/Stage + Instrument */}
            <div style={{ display: "flex", gap: 14, flexWrap: "wrap", marginBottom: 10 }}>
              <div>
                <div style={{ fontSize: 10.5, color: "var(--fg3)", fontWeight: 600, marginBottom: 5, textTransform: "uppercase", letterSpacing: ".4px" }}>Stage / Round</div>
                <div style={{ display: "flex", gap: 4, flexWrap: "wrap", maxWidth: 420 }}>
                  {[null, ...DEAL_ROUNDS.slice(0, 14)].map((r: any) => (
                    <button key={r?.id ?? "all"} className={`fp${fltRound === (r?.id ?? null) ? " on" : ""}`}
                      onClick={() => setFltRound(fltRound === (r?.id ?? null) ? null : (r?.id ?? null))}>
                      {r ? r.label : "All"}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <div style={{ fontSize: 10.5, color: "var(--fg3)", fontWeight: 600, marginBottom: 5, textTransform: "uppercase", letterSpacing: ".4px" }}>Instrument</div>
                <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                  {[null, ...INSTRUMENTS].map((i: any) => (
                    <button key={i?.id ?? "all"} className={`fp${fltInstrument === (i?.id ?? null) ? " on" : ""}`}
                      onClick={() => setFltInstrument(fltInstrument === (i?.id ?? null) ? null : (i?.id ?? null))}>
                      {i ? i.label : "All"}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            {/* Row 3: Verticals */}
            {usedVerticals.length > 0 && (
              <div style={{ marginBottom: 10 }}>
                <div style={{ fontSize: 10.5, color: "var(--fg3)", fontWeight: 600, marginBottom: 5, textTransform: "uppercase", letterSpacing: ".4px" }}>Verticals</div>
                <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                  {usedVerticals.map(v => (
                    <button key={v.id} className={`fp${fltVerticals.includes(v.id) ? " on" : ""}`}
                      onClick={() => setFltVerticals(prev => prev.includes(v.id) ? prev.filter(x => x !== v.id) : [...prev, v.id])}>
                      {v.label}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {/* Row 4: Geo + clear */}
            <div style={{ display: "flex", gap: 14, flexWrap: "wrap", alignItems: "flex-end" }}>
              <div>
                <div style={{ fontSize: 10.5, color: "var(--fg3)", fontWeight: 600, marginBottom: 5, textTransform: "uppercase", letterSpacing: ".4px" }}>Geography</div>
                <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                  {[null, ...GEOS].map((g: any) => (
                    <button key={g?.id ?? "all"} className={`fp${fltGeo === (g?.id ?? null) ? " on" : ""}`}
                      onClick={() => setFltGeo(fltGeo === (g?.id ?? null) ? null : (g?.id ?? null))}>
                      {g ? g.label : "All"}
                    </button>
                  ))}
                </div>
              </div>
              {activeFilterCount > 0 && (
                <button className="btn btn-g btn-sm" style={{ marginLeft: "auto", fontSize: 11 }} onClick={clearFilters}>
                  ✕ Clear all filters
                </button>
              )}
            </div>
          </div>
        )}

        {/* Results count */}
        <div style={{ fontSize: 11.5, color: "var(--fg3)", marginBottom: 8 }}>
          {filtered.length} post{filtered.length !== 1 ? "s" : ""}
          {activeFilterCount > 0 && <span style={{ color: "var(--accent)" }}> · {activeFilterCount} filter{activeFilterCount > 1 ? "s" : ""} active</span>}
        </div>

        {/* ── Deal cards: LIST view ── */}
        {viewMode === "list" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {filtered.map(d => {
              const rnd = roundObj(d.round);
              const st = DEAL_STATUSES.find(s => s.id === d.status) || DEAL_STATUSES[0];
              const isInvesting = d.dealMode === "investing";
              return (
                <div key={d.id} className="card card-p card-hover" onClick={() => onOpenEntity("deal", d.id)}
                  style={{ padding: "10px 13px" }}>
                  <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                    <div style={{ width: 3, background: isInvesting ? "var(--tf-g)" : "oklch(0.55 0.14 240)", borderRadius: 2, alignSelf: "stretch", minHeight: 36, flexShrink: 0 }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      {/* Title row */}
                      <div style={{ display: "flex", alignItems: "center", gap: 5, flexWrap: "wrap", marginBottom: 3 }}>
                        <span style={{ fontWeight: 700, fontSize: 13 }}>{d.title}</span>
                        <span style={{ fontSize: 10.5, color: st.color, background: "var(--bg3)", padding: "1px 5px", borderRadius: 3, fontWeight: 500 }}>
                          {st.id === "active" ? "●" : st.id === "paused" ? "⏸" : st.id === "filled" ? "✓" : "○"} {st.label}
                        </span>
                        {!isInvesting && rnd.label && <span style={{ fontSize: 10.5, color: "var(--fg3)", background: "var(--bg3)", padding: "1px 5px", borderRadius: 3 }}>{rnd.label}</span>}
                        {!isInvesting && d.amount > 0 && <span style={{ fontSize: 12, fontFamily: "var(--mono)", fontWeight: 700, color: "var(--tf-g)" }}>{fv(d.amount)} {d.currency || "USD"}</span>}
                        {isInvesting && (d.minTicket > 0 || d.maxTicket > 0) && <span style={{ fontSize: 11.5, fontFamily: "var(--mono)", color: "var(--tf-g)", fontWeight: 600 }}>{fv(d.minTicket||0)}–{d.maxTicket > 0 ? fv(d.maxTicket) : "∞"} {d.currency||"USD"}</span>}
                        {!isInvesting && d.instrument && d.instrument !== "any" && <span style={{ fontSize: 10, color: "var(--fg3)", background: "var(--bg3)", padding: "1px 4px", borderRadius: 3 }}>{INSTRUMENTS.find(i=>i.id===d.instrument)?.label||d.instrument}</span>}
                      </div>
                      {/* Meta row */}
                      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
                        {!isInvesting && d.traction && <span style={{ fontSize: 11, color: "var(--tf-g)" }}>📈 {d.traction}</span>}
                        {!isInvesting && d.cliffMonths > 0 && <span style={{ fontSize: 10.5, color: "var(--fg3)" }}>🔒{d.cliffMonths}m cliff</span>}
                        {!isInvesting && d.vestingMonths > 0 && <span style={{ fontSize: 10.5, color: "var(--fg3)" }}>📅{d.vestingMonths}m vest</span>}
                        {isInvesting && d.preferredStages?.slice(0,3).map((s:string) => <span key={s} style={{ fontSize: 10.5, background: "var(--bg3)", padding: "1px 4px", borderRadius: 3, color: "var(--fg3)" }}>{DEAL_ROUNDS.find(r=>r.id===s)?.label||s}</span>)}
                        {(isInvesting ? (d.preferredVerticals||[]) : (d.tags||[]).filter((t:string)=>VERTICALS.find(v=>v.id===t))).slice(0,3).map((t:string) => <Tag key={t} id={t} />)}
                      </div>
                    </div>
                    <AuthorChip contactId={d.createdBy} contacts={contacts} onOpen={()=>{}} label="" />
                  </div>
                </div>
              );
            })}
            {!filtered.length && <div className="empty"><div className="empty-ic"><I n="deals" s={15} c="var(--fg3)" /></div><div className="empty-t">{tab === "fundraising" ? "No seeking posts" : "No deploying posts"}</div></div>}
          </div>
        )}

        {/* ── Deal cards: GRID view ── */}
        {viewMode === "grid" && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 10 }}>
            {filtered.map(d => {
              const rnd = roundObj(d.round);
              const st = DEAL_STATUSES.find(s => s.id === d.status) || DEAL_STATUSES[0];
              const isInvesting = d.dealMode === "investing";
              const accentColor = isInvesting ? "var(--tf-g)" : "oklch(0.55 0.14 240)";
              return (
                <div key={d.id} className="card card-p card-hover" onClick={() => onOpenEntity("deal", d.id)}
                  style={{ padding: "14px", display: "flex", flexDirection: "column", gap: 8 }}>
                  {/* Card header */}
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 6 }}>
                    <div style={{ fontSize: 10, fontWeight: 700, color: accentColor, textTransform: "uppercase", letterSpacing: ".5px" }}>
                      {isInvesting ? "💰 Deploying" : "📣 " + (SEEKING_TYPES.find(s=>s.id===d.seekingType)?.label || "Seeking")}
                    </div>
                    <span style={{ fontSize: 10.5, color: st.color, background: "var(--bg3)", padding: "2px 6px", borderRadius: 3, fontWeight: 600, flexShrink: 0 }}>
                      {st.id === "active" ? "●" : st.id === "filled" ? "✓" : "⏸"} {st.label}
                    </span>
                  </div>
                  {/* Title */}
                  <div style={{ fontWeight: 700, fontSize: 13.5, lineHeight: 1.3 }}>{d.title}</div>
                  {/* Amount / ticket */}
                  {!isInvesting && d.amount > 0 && (
                    <div style={{ fontSize: 18, fontFamily: "var(--mono)", fontWeight: 800, color: "var(--tf-g)" }}>
                      {fv(d.amount)} <span style={{ fontSize: 12, fontWeight: 500, color: "var(--fg3)" }}>{d.currency||"USD"}</span>
                    </div>
                  )}
                  {isInvesting && (d.minTicket > 0 || d.maxTicket > 0) && (
                    <div style={{ fontSize: 14, fontFamily: "var(--mono)", fontWeight: 800, color: "var(--tf-g)" }}>
                      {fv(d.minTicket||0)} – {d.maxTicket > 0 ? fv(d.maxTicket) : "∞"} <span style={{ fontSize: 11, fontWeight: 500, color: "var(--fg3)" }}>{d.currency||"USD"}</span>
                    </div>
                  )}
                  {/* Round + instrument */}
                  <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
                    {!isInvesting && rnd.label && <span style={{ fontSize: 11, background: "var(--bg3)", border: "1px solid var(--border)", padding: "2px 6px", borderRadius: 4, color: "var(--fg2)" }}>{rnd.label}</span>}
                    {!isInvesting && d.instrument && d.instrument !== "any" && <span style={{ fontSize: 11, background: "var(--bg3)", border: "1px solid var(--border)", padding: "2px 6px", borderRadius: 4, color: "var(--fg2)" }}>{INSTRUMENTS.find(i=>i.id===d.instrument)?.label}</span>}
                    {isInvesting && d.preferredStages?.slice(0,2).map((s:string) => <span key={s} style={{ fontSize: 11, background: "var(--bg3)", border: "1px solid var(--border)", padding: "2px 6px", borderRadius: 4, color: "var(--fg2)" }}>{DEAL_ROUNDS.find(r=>r.id===s)?.label||s}</span>)}
                  </div>
                  {/* Description */}
                  <div style={{ fontSize: 12, color: "var(--fg2)", lineHeight: 1.5, overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical" }}>{d.description}</div>
                  {/* Traction */}
                  {!isInvesting && d.traction && <div style={{ fontSize: 11, color: "var(--tf-g)", background: "oklch(0.18 0.04 160)", padding: "4px 8px", borderRadius: 5 }}>📈 {d.traction}</div>}
                  {/* Vesting row */}
                  {!isInvesting && (d.cliffMonths || d.vestingMonths || d.tgeUnlockPct) && (
                    <div style={{ display: "flex", gap: 6, fontSize: 10.5, color: "var(--fg3)" }}>
                      {d.cliffMonths > 0 && <span>🔒 {d.cliffMonths}m cliff</span>}
                      {d.vestingMonths > 0 && <span>📅 {d.vestingMonths}m vest</span>}
                      {d.tgeUnlockPct > 0 && <span>🔓 {d.tgeUnlockPct}% TGE</span>}
                    </div>
                  )}
                  {/* Tags */}
                  <div style={{ display: "flex", gap: 3, flexWrap: "wrap" }}>
                    {(isInvesting ? (d.preferredVerticals||[]) : (d.tags||[]).filter((t:string)=>VERTICALS.find(v=>v.id===t))).slice(0,4).map((t:string) => <Tag key={t} id={t} />)}
                  </div>
                  {/* Footer */}
                  <div style={{ marginTop: "auto", paddingTop: 6, borderTop: "1px solid var(--border)" }}>
                    <AuthorChip contactId={d.createdBy} contacts={contacts} onOpen={()=>{}} label="by" />
                  </div>
                </div>
              );
            })}
            {!filtered.length && <div className="empty" style={{ gridColumn: "1/-1" }}><div className="empty-ic"><I n="deals" s={15} c="var(--fg3)" /></div><div className="empty-t">{tab === "fundraising" ? "No seeking posts" : "No deploying posts"}</div></div>}
          </div>
        )}
      </>)}


      {creating && (
        <CreateModal
          type="deal"
          dealMode={creatingType}
          onClose={() => setCreating(false)}
          onSave={onCreate}
          contacts={contacts}
          companies={[]}
          projects={[]}
          deals={deals}
          authorId={currentUserId}
        />
      )}
    </div>
  );
}

function LFPage({ posts, contacts, onOpenEntity, onCreate, currentUserId }) {
  const [flt, setFlt] = useState("all");
  const [creating, setCreating] = useState(false);
  const list = flt === "all" ? posts : posts.filter(p => p.type === flt);
  return (
    <div>
      <div className="ph">
        <div><div className="ph-t">Looking For</div><div className="ph-s">Community board — requests, offers, questions, announcements</div></div>
        <button className="btn btn-p" onClick={() => setCreating(true)}><I n="plus" s={13} /> New Post</button>
      </div>
      <div className="fb" style={{ marginBottom: 14 }}>{["all", "looking", "offering", "ask", "announce"].map(t => <button key={t} className={`fp${flt === t ? " on" : ""}`} onClick={() => setFlt(t)}>{t === "all" ? "All" : t.charAt(0).toUpperCase() + t.slice(1)}</button>)}</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {list.map(p => { const auth = contacts.find(c => c.id === p.createdBy); return (<div key={p.id} className="card card-p card-hover" onClick={() => onOpenEntity("lf", p.id)}><div style={{ display: "flex", gap: 9, alignItems: "flex-start", marginBottom: 8 }}><span className={`sbadge lf-${p.type}`}>{p.type}</span><div style={{ flex: 1 }}><div style={{ fontWeight: 600, fontSize: 14 }}>{p.title}</div>{auth && <div style={{ marginTop: 3 }}><AuthorChip contactId={p.createdBy} contacts={contacts} onOpen={() => { }} label="By" /></div>}</div></div><TruncText text={p.body} limit={180} style={{ fontSize: 13, color: "var(--fg2)", lineHeight: 1.6, display: "block", marginBottom: 9 }} /><div style={{ display: "flex", flexWrap: "wrap", gap: 3 }}>{p.tags?.map(t => <Tag key={t} id={t} />)}</div></div>); })}
        {!list.length && <div className="empty"><div className="empty-ic"><I n="lf" s={15} c="var(--fg3)" /></div><div className="empty-t">No posts</div></div>}
      </div>
      {creating && <CreateModal type="lf" onClose={() => setCreating(false)} onSave={onCreate} contacts={contacts} companies={[]} projects={[]} authorId={currentUserId} />}
    </div>
  );
}

function CommunityPage({ discussions, setDiscussions, contacts, companies, projects, courts, setCourts, allVotes, onVote, currentUserId, currentUserKarma, onOpenEntity }) {
  const [tab, setTab] = useState("discuss");
  const allEntities = [...contacts.map(e => ({ ...e, _type: "contact" })), ...companies.map(e => ({ ...e, _type: "company" })), ...projects.map(e => ({ ...e, _type: "project" }))];
  const underReview = allEntities.filter(e => getTrustStatus(e) === "under-review" || getTrustStatus(e) === "flagged");
  const activeCourts = courts.filter(c => c.status === "open");
  const closedCourts = courts.filter(c => c.status !== "open");
  const [kbView, setKbView] = useState("contacts");
  const medals = ["🥇", "🥈", "🥉"];

  const vote = (courtId, dir) => setCourts(p => p.map(c => {
    if (c.id !== courtId) return c;
    const u = { ...c, votesFor: dir === "for" ? c.votesFor + 1 : c.votesFor, votesAgainst: dir === "against" ? c.votesAgainst + 1 : c.votesAgainst };
    const tot = u.votesFor + u.votesAgainst;
    if (tot >= 10 && u.votesAgainst / tot > 0.7) return { ...u, status: "closed", verdict: "flagged" };
    if (tot >= 10 && u.votesFor / tot > 0.7) return { ...u, status: "closed", verdict: "cleared" };
    return u;
  }));

  const kbSorted = useMemo(() => {
    if (kbView === "contacts") return [...contacts].sort((a, b) => (b.karma || 0) - (a.karma || 0));
    if (kbView === "companies") return [...companies].sort((a, b) => getEffectiveKarma(b, "company", contacts, projects) - getEffectiveKarma(a, "company", contacts, projects));
    return [...projects].sort((a, b) => getEffectiveKarma(b, "project", contacts, projects) - getEffectiveKarma(a, "project", contacts, projects));
  }, [kbView, contacts, companies, projects]);

  return (
    <div>
      <div className="ph"><div><div className="ph-t">Community</div><div className="ph-s">Discussions · Trust Court · Flagged · Karma Board</div></div></div>
      <div className="tabs">
        <button className={`tab${tab === "discuss" ? " on" : ""}`} onClick={() => setTab("discuss")}>Discussions</button>
        <button className={`tab${tab === "court" ? " on" : ""}`} style={{ color: activeCourts.length > 0 ? "oklch(0.55 0.14 80)" : undefined }} onClick={() => setTab("court")}>Court{activeCourts.length > 0 && ` · ${activeCourts.length}`}</button>
        <button className={`tab${tab === "flagged" ? " on" : ""}`} style={{ color: underReview.length > 0 ? "var(--danger-fg)" : undefined }} onClick={() => setTab("flagged")}>Flagged{underReview.length > 0 && ` · ${underReview.length}`}</button>
        <button className={`tab${tab === "karma" ? " on" : ""}`} onClick={() => setTab("karma")}><I n="trophy" s={12} /> Karma</button>
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

      {tab === "karma" && (
        <div>
          <div style={{ background: "var(--bg3)", border: "1px solid var(--border)", borderRadius: "var(--r2)", padding: "10px 14px", marginBottom: 14, fontSize: 12.5, color: "var(--fg2)", lineHeight: 1.65 }}>
            <strong style={{ color: "var(--fg)" }}>W3-Trust™:</strong> Vote weight = <span style={{ fontFamily: "var(--mono)" }}>0.5 + karma/200</span> · Range 0.1–3.0 · Anti-sybil: karma&lt;5 → weight 0.1 · Contacts→Projects (30%) → Companies (20%) · Wilson score ranking
          </div>
          <div style={{ display: "flex", gap: 5, marginBottom: 14 }}>
            {[["contacts", "Contacts"], ["projects", "Projects"], ["companies", "Companies"]].map(([id, lbl]) => (
              <button key={id} className={`fp${kbView === id ? " on" : ""}`} onClick={() => setKbView(id)}>{lbl}</button>
            ))}
          </div>
          <div className="card">
            {kbSorted.map((e, i) => {
              const karma = kbView === "contacts" ? (e.karma || 0) : getEffectiveKarma(e, kbView === "companies" ? "company" : "project", contacts, projects);
              const up = e.karmaBreakdown?.up || 0;
              const dn = e.karmaBreakdown?.down || 0;
              const type = kbView === "contacts" ? "contact" : kbView === "companies" ? "company" : "project";
              return (
                <div key={e.id} className={`lb-row${entityClass(e)}`} onClick={() => onOpenEntity(type, e.id)} style={{ cursor: "pointer" }} onMouseEnter={ev => ev.currentTarget.style.background = "var(--bg2)"} onMouseLeave={ev => ev.currentTarget.style.background = ""}>
                  <span className="lb-rank">{i < 3 ? medals[i] : i + 1}</span>
                  <div className="av" style={{ width: 30, height: 30, fontSize: 10 }}>{ini(e.name)}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, fontSize: 13, display: "flex", alignItems: "center", gap: 5 }}>{e.name}<TrustBadge entity={e} size={10} /><KarmaBadge karma={karma} /></div>
                    <div style={{ fontSize: 11.5, color: "var(--fg2)" }}>{e.company || e.stage || ""}</div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <div className="wscore-bar" style={{ width: 50 }}><div className="wscore-fill" style={{ width: `${wilsonScore(up, up + dn) * 100}%` }} /></div>
                    <KarmaDisplay karma={karma} up={up} down={dn} size="sm" />
                    <VoteButtons entityId={e.id} entityType={type} entity={e} currentUserId={currentUserId} currentUserKarma={currentUserKarma} allVotes={allVotes} onVote={onVote} size="sm" />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

/* ══════════ CREATE MODALS ══════════ */

/* ══════════════════════════════════════════════════════════════════
   SMART CREATE MODAL v2.0  —  AI-powered entity creator
   ─────────────────────────────────────────────────────────────────
   Flow:
   1. User opens modal (type already known from context)
   2. Smart Paste tab is default — textarea focused
   3. As user types/pastes → local NLP fires instantly (0ms, free)
   4. If local parse confidence < 0.8 → AI enrichment via /api/parse
      (haiku for simple, sonnet for complex — decided server-side)
   5. Fields fill in real-time with streaming animation
   6. Dedup check against existing entities (fuzzy 80%)
   7. LinkedEntities preview — related contacts/companies/projects
   8. Review & confirm — all fields editable before save
   ══════════════════════════════════════════════════════════════════ */

/* ── Local NLP Parser (free, instant) ─────────────────────────── */
function localNLP(text, type, { contacts, companies, projects }) {
  const t = text.toLowerCase();
  const result = {};
  let confidence = 0;

  // ── All URLs — collect all, pick best as website ──
  const allUrls = [...text.matchAll(/https?:\/\/([^\s,)\]>]+)/gi)].map(m => m[0]);
  const docUrls = allUrls.filter(u => u.includes('docsend') || u.includes('drive.google') || u.includes('notion.so') || u.includes('pitch.com'));
  const calUrls = allUrls.filter(u => u.includes('calendly') || u.includes('cal.com'));
  const siteUrl = allUrls.find(u => !docUrls.includes(u) && !calUrls.includes(u));
  if (siteUrl) { result.website = siteUrl.replace(/^https?:\/\//, '').replace(/\/$/, ''); confidence += 0.15; }
  // Also try bare domain if no full URL
  if (!result.website) {
    const domainMatch = text.match(/\b([\w-]+\.(xyz|io|com|finance|network|protocol|app|dev|gg|ai|club|pro|fund|capital|ventures|vc|chain|wtf))\b/i);
    if (domainMatch) { result.website = domainMatch[1]; confidence += 0.1; }
  }

  // ── Email ──
  const emailMatch = text.match(/[\w.+-]+@[\w-]+\.[a-z]{2,}/i);
  if (emailMatch) { result.email = emailMatch[0]; confidence += 0.1; }

  // ── Telegram ──
  const tgMatch = text.match(/(?:t\.me\/|telegram[:\s]+@?|tg[:\s]+@?)([a-z0-9_]{4,32})/i);
  if (tgMatch) { result.telegram = tgMatch[1]; confidence += 0.1; }

  // ── Twitter ──
  const twMatch = text.match(/(?:twitter\.com\/|x\.com\/|tw[:\s]+@?)([a-zA-Z0-9_]{1,15})/i);
  if (twMatch) { result.twitter = twMatch[1]; confidence += 0.1; }

  // ── LinkedIn ──
  const liMatch = text.match(/linkedin\.com\/in\/([a-zA-Z0-9-]+)/i);
  if (liMatch) { result.linkedin = liMatch[1]; confidence += 0.1; }

  // ── Money — find LARGEST amount (for target raise, not ticket size) ──
  if (type === 'deal') {
    // Match all $ amounts in text
    const allAmounts = [];
    const amtRe = /\$\s*([\d,.]+)\s*(m|k|b|million|thousand|billion)?/gi;
    let amtMatch;
    while ((amtMatch = amtRe.exec(text)) !== null) {
      let v = parseFloat(amtMatch[1].replace(/,/g, ''));
      const u = (amtMatch[2] || '').toLowerCase();
      if (u === 'm' || u === 'million') v *= 1_000_000;
      else if (u === 'k' || u === 'thousand') v *= 1_000;
      else if (u === 'b' || u === 'billion') v *= 1_000_000_000;
      allAmounts.push(v);
    }
    // Also handle "X–YM" or "X-YM" range patterns
    const rangeRe = /\$?([\d,.]+)\s*[–\-]\s*\$?([\d,.]+)\s*(m|k|b|million|thousand|billion)/gi;
    let rMatch;
    while ((rMatch = rangeRe.exec(text)) !== null) {
      let lo = parseFloat(rMatch[1].replace(/,/g, ''));
      let hi = parseFloat(rMatch[2].replace(/,/g, ''));
      const u = (rMatch[3] || '').toLowerCase();
      if (u === 'm' || u === 'million') { lo *= 1_000_000; hi *= 1_000_000; }
      else if (u === 'k' || u === 'thousand') { lo *= 1_000; hi *= 1_000; }
      // Use midpoint for range, and add both so max picks correctly
      allAmounts.push(lo, hi, (lo + hi) / 2);
    }
    if (allAmounts.length > 0) {
      // Use midpoint of largest range as primary amount
      result.amount = Math.max(...allAmounts);
      confidence += 0.15;
    }

    // Token ticker — look for COT, USDC, ETH etc near "token"
    const tokenMatch = text.match(/\b(?:token[:\s]+|ticker[:\s]+|\()([A-Z]{2,6})\b/);
    if (tokenMatch) { result.token = tokenMatch[1]; confidence += 0.05; }

    // Terms — extract instrument/vesting info
    const termsLines = [];
    if (t.includes('saft')) termsLines.push('SAFT');
    if (t.includes('token')) termsLines.push('Token instrument');
    const ticketMatch = text.match(/[Tt]icket[^:]*:\s*([^\n]+)/);
    if (ticketMatch) termsLines.push('Ticket: ' + ticketMatch[1].trim());
    const instrMatch = text.match(/[Ii]nstrument[^:]*:\s*([^\n]+)/);
    if (instrMatch) termsLines.push('Instrument: ' + instrMatch[1].trim());
    if (termsLines.length > 0) { result.terms = termsLines.join('. '); confidence += 0.05; }
  }

  // ── Deal/Project title ──
  if (type === 'deal') {
    // Look for project name: prefer explicit "Project:" line, or first short capitalized line
    let projectName = '';
    // Try "Launching X," or "we are launching X," pattern
    const launchMatch = text.match(/launching\s+([A-Z][A-Za-z0-9]+(?:\s+[A-Z][A-Za-z0-9]+)?)\s*[,\-–—]/i);
    if (launchMatch) projectName = launchMatch[1].trim();
    // Try first line that looks like a project name (short, capitalized, no URLs)
    if (!projectName) {
      const firstLine = text.split('\n').find(l => {
        const t = l.trim();
        return t.length >= 3 && t.length <= 60 && !t.startsWith('http') && /[A-Z]/.test(t[0]) && !/^(We|Our|The|After|Round|Instrument|Ticket|Next|Live|Why|Let|Intro|Co-|Tim)/.test(t);
      });
      if (firstLine) projectName = firstLine.split(/[-–—]/)[0].trim().replace(/[🔹✅💸📄📞]/g, '').trim();
    }
    if (projectName) {
      // Build rich title: "ProjectName — Round · $Amount"
      const roundLabel = DEAL_ROUNDS.find(r => r.id === result.round)?.label || (result.round ? result.round.charAt(0).toUpperCase() + result.round.slice(1) : 'Deal');
      const amtStr = result.amount > 0 ? ` · $${result.amount >= 1e6 ? (result.amount/1e6).toFixed(0)+'M' : (result.amount/1e3).toFixed(0)+'K'}` : '';
      result.title = `${projectName} — ${roundLabel}${amtStr}`;
      result.projectName = projectName;
      confidence += 0.15;
    }
    result.status = 'active';
    confidence += 0.05;
  }

  // ── Description — preserve full raw text (like Telegram), strip only contact/link tail ──
  if (['company', 'project', 'deal'].includes(type) && !result.description) {
    // Find where links/contacts section starts — keep everything before it
    const linkStart = text.search(/\n[📄📞🔗]|\nhttps?:\/\/|\nIntro Deck|\nLet'?s connect|\nDeck:|\nCalendly/i);
    const rawDesc = linkStart > 0 ? text.slice(0, linkStart).trim() : text.trim();
    if (rawDesc.length > 20) {
      result.description = rawDesc;
      confidence += 0.1;
    }
  }

  // ── Tags — scan ALL_TAGS keywords ──
  const foundTags = [];
  const allTagIds = [...ROLES, ...VERTICALS, ...GEOS];
  allTagIds.forEach(tag => {
    const kw = tag.label.toLowerCase().replace('×', '').replace('/', '');
    if (t.includes(kw) || t.includes(tag.id.replace(/-/g, ' '))) foundTags.push(tag.id);
  });
  const kwMap = {
    'zero knowledge': 'zk', 'zero-knowledge': 'zk', 'rollup': 'l2', 'layer 2': 'l2', 'layer2': 'l2',
    'layer 1': 'l1', 'layer1': 'l1', 'yield': 'defi', 'swap': 'defi', 'amm': 'defi', 'liquidity': 'defi',
    'venture': 'vc', 'fund': 'vc', 'audit': 'auditor', 'smart contract': 'smart-contract',
    'russia': 'cis', 'ukraine': 'cis', 'europe': 'eu', 'america': 'us', 'international': 'global',
    'singapore': 'asia', 'dubai': 'mena', 'korea': 'asia', 'japan': 'asia', 'china': 'asia',
    'decentralized': 'infra', 'infrastructure': 'infra', 'protocol': 'infra',
    'wallet': 'infra', 'explorer': 'infra', 'ieo': 'launchpad', 'ido': 'launchpad',
    'cex listing': 'cex', 'dex listing': 'dex', 'compute': 'ai-web3', 'ai': 'ai-web3',
    'stable': 'stablecoin', 'peg': 'stablecoin', 'emission': 'defi',
  };
  Object.entries(kwMap).forEach(([kw, tagId]) => {
    if (t.includes(kw) && !foundTags.includes(tagId)) foundTags.push(tagId);
  });
  if (foundTags.length > 0) { result.tags = [...new Set(foundTags)]; confidence += 0.1; }

  // ── Role detection (contact) ──
  if (type === 'contact') {
    const roleMap = {
      'co-founder': 'co-founder', 'cofounder': 'co-founder', 'co founder': 'co-founder',
      'founder': 'founder', 'ceo': 'ceo', 'cto': 'cto', 'coo': 'coo', 'cfo': 'cfo',
      'cpo': 'cpo', 'bd': 'bd', 'business development': 'bd', 'advisor': 'advisor',
      'investor': 'angel', 'vc': 'vc', 'developer': 'developer', 'engineer': 'developer',
      'marketing': 'marketing', 'community': 'community',
    };
    for (const [kw, roleId] of Object.entries(roleMap)) {
      if (t.includes(kw)) { result.role = roleId; confidence += 0.1; break; }
    }
  }

  // ── Stage detection ──
  if (type === 'project') {
    const stageKw = { 'testnet': 'Testnet', 'mainnet': 'Mainnet', 'concept': 'Concept', 'development': 'Development', 'post-tge': 'Post-TGE', 'tge': 'Post-TGE', 'mature': 'Mature' };
    for (const [kw, s] of Object.entries(stageKw)) { if (t.includes(kw)) { result.stage = s; confidence += 0.1; break; } }
  }
  if (type === 'company') {
    for (const s of COMPANY_STAGES) { if (t.includes(s.toLowerCase())) { result.stage = s; confidence += 0.05; break; } }
  }

  // ── Deal round ──
  if (type === 'deal') {
    const roundKw = {
      'angels': 'angels', 'angel round': 'angels',
      'pre-seed': 'pre-seed', 'pre seed': 'pre-seed', 'preseed': 'pre-seed',
      'series a': 'series-a', 'series b': 'series-b',
      'private sale': 'private-sale', 'public sale': 'public-sale',
      'pre-tge': 'pre-tge', 'pre tge': 'pre-tge',
      'strategic': 'strategic', 'tge': 'tge', 'otc': 'otc',
      'grants': 'grants', 'ecosystem': 'ecosystem-fund',
      'seed': 'seed',
    };
    for (const [kw, roundId] of Object.entries(roundKw)) {
      if (t.includes(kw)) { result.round = roundId; confidence += 0.1; break; }
    }
  }

  // ── LF type ──
  if (type === 'lf') {
    if (t.includes('looking for') || t.includes('seeking') || t.includes('needed')) result.type = 'looking';
    else if (t.includes('offer') || t.includes('providing') || t.includes('available')) result.type = 'offering';
    else if (t.includes('announc') || t.includes('launching')) result.type = 'announce';
    else if (t.includes('question') || t.includes('advice') || t.includes('ask')) result.type = 'ask';
  }

  // ── Contact name from signature ──
  if (type === 'contact' || type === 'deal') {
    // Look for name in last few lines (signature pattern)
    const lines = text.trim().split('\n').map(l => l.trim()).filter(Boolean);
    const lastLines = lines.slice(-5);
    for (const line of lastLines) {
      // Single short line that looks like a name (no URLs, no emojis, Title Case)
      if (line.length < 40 && /^[A-Z][a-z]+(\s+[A-Z][a-z]+)?$/.test(line)) {
        if (type === 'contact') result.name = line;
        result._contactName = line;
        break;
      }
    }
  }

  // ── Dedup check — multi-signal weighted scoring ──
  const dedupCandidates = [];
  const candidate = {
    name: result._contactName || result.name || result.projectName || result.title || "",
    website: result.website || "",
    telegram: result.telegram || "",
    twitter: result.twitter || "",
    token: result.token || "",
  };
  if (candidate.name || candidate.website || candidate.telegram || candidate.twitter) {
    contacts.forEach(c => {
      const match = entityMatchScore(candidate, c);
      if (match.score >= 0.55) dedupCandidates.push({ entity: c, score: match.score, zone: match.zone, signals: match.signals, type: "contact" });
    });
    companies.forEach(e => {
      const match = entityMatchScore(candidate, e);
      if (match.score >= 0.55) dedupCandidates.push({ entity: e, score: match.score, zone: match.zone, signals: match.signals, type: "company" });
    });
    projects.forEach(e => {
      const match = entityMatchScore(candidate, e);
      if (match.score >= 0.55) dedupCandidates.push({ entity: e, score: match.score, zone: match.zone, signals: match.signals, type: "project" });
    });
    dedupCandidates.sort((a, b) => b.score - a.score);
  }
  result._dedup = dedupCandidates;

  // ── Linked entity detection ──
  const linked = [];
  contacts.forEach(c => {
    if (c.name !== 'You (Profile)' && text.toLowerCase().includes(c.name.toLowerCase()))
      linked.push({ type: 'contact', id: c.id, name: c.name });
  });
  companies.forEach(co => {
    if (text.toLowerCase().includes(co.name.toLowerCase()))
      linked.push({ type: 'company', id: co.id, name: co.name });
  });
  projects.forEach(p => {
    if (text.toLowerCase().includes(p.name.toLowerCase()))
      linked.push({ type: 'project', id: p.id, name: p.name });
  });
  result._linked = linked.slice(0, 6);

  // Clean internal keys from returned fields
  const { _possibleName, _contactName, _dedup, _linked, ...cleanResult } = result;
  return {
    fields: cleanResult,
    _dedup: dedupCandidates,
    _linked: linked.slice(0, 6),
    _contactName: result._contactName,
    confidence: Math.min(confidence, 1.0),
  };
}

/* ══════════ ENTITY MATCH ENGINE v2 ══════════
 * Multi-signal weighted scoring — research-backed:
 * 
 * Signals (weighted sum):
 *   1. Exact name match            → 1.0  (weight 0.45)
 *   2. Normalized name similarity  → Jaro-Winkler (weight 0.30)
 *   3. Domain / website match      → binary (weight 0.20)
 *   4. Handle match (tg/twitter)   → binary (weight 0.15)
 *   5. Token/ticker match          → binary (weight 0.10)
 *
 * Normalization: strip legal suffixes (Protocol, Labs, Finance…),
 *   lowercase, trim, remove punctuation.
 *
 * Three-zone dedup gate:
 *   score < 0.70   → GREEN  — create freely
 *   score 0.70–0.89 → YELLOW — warn, user can override
 *   score ≥ 0.90   → RED    — HARD BLOCK, must merge or cancel
 *
 * Source: Salesforce dedup research (2025), Data Ladder fuzzy guide (2026),
 *   WinPure dedup guide (2025), fuzzy matching 5-category taxonomy.
 ════════════════════════════════════════════ */

const LEGAL_SUFFIXES = /\b(protocol|labs|finance|network|foundation|dao|ventures|capital|fund|tech|technologies|digital|solutions|inc|ltd|llc|corp|limited|co)\b\.?/gi;

function normalizeName(s) {
  if (!s) return "";
  return s.toLowerCase()
    .replace(LEGAL_SUFFIXES, "")
    .replace(/[^a-z0-9\s]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

// Jaro similarity (proven for name matching)
function jaroSim(s1, s2) {
  if (s1 === s2) return 1;
  if (!s1 || !s2) return 0;
  const len1 = s1.length, len2 = s2.length;
  const matchDist = Math.floor(Math.max(len1, len2) / 2) - 1;
  if (matchDist < 0) return 0;
  const s1m = new Array(len1).fill(false);
  const s2m = new Array(len2).fill(false);
  let matches = 0;
  for (let i = 0; i < len1; i++) {
    const lo = Math.max(0, i - matchDist);
    const hi = Math.min(i + matchDist + 1, len2);
    for (let j = lo; j < hi; j++) {
      if (!s2m[j] && s1[i] === s2[j]) { s1m[i] = s2m[j] = true; matches++; break; }
    }
  }
  if (matches === 0) return 0;
  let transpositions = 0;
  let k = 0;
  for (let i = 0; i < len1; i++) {
    if (s1m[i]) {
      while (!s2m[k]) k++;
      if (s1[i] !== s2[k]) transpositions++;
      k++;
    }
  }
  return (matches / len1 + matches / len2 + (matches - transpositions / 2) / matches) / 3;
}

// Jaro-Winkler (boosts score for common prefix — better for project names)
function jaroWinkler(s1, s2, p = 0.1) {
  const jaro = jaroSim(s1, s2);
  let prefix = 0;
  for (let i = 0; i < Math.min(4, s1.length, s2.length); i++) {
    if (s1[i] === s2[i]) prefix++;
    else break;
  }
  return jaro + prefix * p * (1 - jaro);
}

// Token-overlap (Jaccard on word sets) — for multi-word names
function tokenOverlap(a, b) {
  const sa = new Set(a.split(/\s+/).filter(Boolean));
  const sb = new Set(b.split(/\s+/).filter(Boolean));
  if (!sa.size || !sb.size) return 0;
  const intersection = [...sa].filter(x => sb.has(x)).length;
  return intersection / (sa.size + sb.size - intersection);
}

// Substring containment bonus: "FlowBridge" matches "flow bridge protocol"
function containmentScore(a, b) {
  if (!a || !b) return 0;
  if (a === b) return 1;
  if (a.includes(b) || b.includes(a)) return 0.9;
  return 0;
}

// Main multi-signal scorer — returns {score, signals, zone}
function entityMatchScore(candidate, existing) {
  // candidate: { name, website, telegram, twitter, token }
  // existing: same shape (entity from DB)
  const signals = {};

  // 1. Name signals (most important) — weight 0.45
  const cName = normalizeName(candidate.name);
  const eName = normalizeName(existing.name || existing.title || "");
  if (cName && eName) {
    const exact = cName === eName ? 1 : 0;
    const jw = jaroWinkler(cName, eName);
    const tok = tokenOverlap(cName, eName);
    const cont = containmentScore(cName, eName);
    signals.name = Math.max(exact, jw, tok, cont);
  } else {
    signals.name = 0;
  }

  // 2. Domain/website match — weight 0.20 (strong identifier)
  const normDomain = (u) => (u || "").toLowerCase().replace(/^https?:\/\//, "").replace(/^www\./, "").split("/")[0].trim();
  const cDomain = normDomain(candidate.website);
  const eDomain = normDomain(existing.website);
  signals.domain = (cDomain && eDomain && cDomain === eDomain) ? 1 : 0;

  // 3. Telegram match — weight 0.15
  const normHandle = h => (h || "").toLowerCase().replace("@", "").trim();
  signals.telegram = (candidate.telegram && existing.telegram && normHandle(candidate.telegram) === normHandle(existing.telegram)) ? 1 : 0;

  // 4. Twitter match — weight 0.15
  signals.twitter = (candidate.twitter && existing.twitter && normHandle(candidate.twitter) === normHandle(existing.twitter)) ? 1 : 0;

  // 5. Token ticker match (for projects/deals) — weight 0.10
  const normTicker = t => (t || "").toUpperCase().trim();
  signals.token = (candidate.token && existing.token && normTicker(candidate.token) === normTicker(existing.token)) ? 1 : 0;

  // Weighted composite score
  const weights = { name: 0.45, domain: 0.20, telegram: 0.15, twitter: 0.15, token: 0.05 };
  let totalWeight = 0;
  let weightedSum = 0;
  for (const [key, weight] of Object.entries(weights)) {
    if (signals[key] !== undefined) {
      weightedSum += signals[key] * weight;
      totalWeight += weight;
    }
  }
  // Handle identifier override: if domain OR both handles match → floor at 0.85
  const identifierMatch = signals.domain === 1 || (signals.telegram === 1 && signals.twitter === 1);
  const baseScore = totalWeight > 0 ? weightedSum / totalWeight : 0;
  const score = identifierMatch ? Math.max(baseScore, 0.85) : baseScore;

  // Three-zone classification
  const zone = score >= 0.90 ? "block" : score >= 0.70 ? "warn" : "free";

  return { score: Math.min(score, 1.0), signals, zone };
}

// Batch dedup check: find best match and its zone across all entities
function findDuplicates(candidate, { contacts, companies, projects, deals }) {
  const results = [];
  const allEntities = [
    ...contacts.map(e => ({ ...e, _etype: "contact" })),
    ...companies.map(e => ({ ...e, _etype: "company" })),
    ...projects.map(e => ({ ...e, _etype: "project" })),
    ...deals.map(e => ({ ...e, _etype: "deal" })),
  ];
  for (const entity of allEntities) {
    const match = entityMatchScore(candidate, entity);
    if (match.score >= 0.55) {
      results.push({ entity, type: entity._etype, ...match });
    }
  }
  results.sort((a, b) => b.score - a.score);
  return results.slice(0, 3);
}

// Legacy simple fuzzyScore — kept for backward compat
function fuzzyScore(a, b) {
  if (!a || !b) return 0;
  return jaroWinkler(normalizeName(a), normalizeName(b));
}

/* ── SmartCreateModal Component ───────────────────────────────── */
function CreateModal({ type, dealMode, onClose, onSave, contacts, companies, projects, deals, authorId }) {
  // expose dealMode as props.dealMode alias for JSX below
  const props = { dealMode };
  const blank = {
    contact: { name: "", company: "", website: "", role: "founder", status: "active", telegram: "", twitter: "", linkedin: "", email: "", tags: [], score: 70, notes: "", karma: 0, karmaBreakdown: { up: 0, down: 0 }, reports: [], trustStatus: "ok", views: 0, companyIds: [], projectIds: [], createdBy: authorId, createdAt: today() },
    company: { name: "", website: "", stage: "Seed", description: "", tags: [], memberIds: [], partnerIds: [], karma: 0, karmaBreakdown: { up: 0, down: 0 }, reports: [], trustStatus: "ok", views: 0, createdBy: authorId, createdAt: today() },
    project: { name: "", website: "", stage: "Development", description: "", tags: [], memberIds: [], partnerCompanyIds: [], karma: 0, karmaBreakdown: { up: 0, down: 0 }, reports: [], trustStatus: "ok", views: 0, createdBy: authorId, createdAt: today() },
    deal: { title: "", projectName: "", projectId: null, round: "seed", status: "active", amount: 0, currency: "USD", token: "", description: "", terms: "", seekingType: "capital", contactIds: [], companyIds: [], projectIds: [], comments: [], views: 0, createdBy: authorId, createdAt: today() },
    lf: { type: "looking", title: "", body: "", tags: [], expires: "", views: 0, comments: [], createdBy: authorId, createdAt: today() },
  };

  const [tab, setTab] = useState("smart"); // "smart" | "manual"
  const [pasteText, setPasteText] = useState("");
  const [form, setForm] = useState(() => ({
    ...blank[type],
    id: gid(),
    ...(type === "deal" && dealMode === "investing" ? {
      dealMode: "investing",
      minTicket: 0,
      maxTicket: 0,
      preferredStages: [],
      preferredVerticals: [],
      preferredGeos: [],
      instrument: "any",
    } : {}),
  }));
  const [aiStatus, setAiStatus] = useState("idle"); // idle | parsing | done | error | enriching
  const [aiFields, setAiFields] = useState({}); // fields highlighted as AI-filled
  const [linkedEntities, setLinkedEntities] = useState([]);
  const [dismissedLinked, setDismissedLinked] = useState([]);
  const [dedupMatches, setDedupMatches] = useState([]); // [{entity, score, zone, signals, type}]
  const [dedupDismissed, setDedupDismissed] = useState(false);
  const [subEntityConfirm, setSubEntityConfirm] = useState(null); // null | {entities:[...], confirmed:[]}
  const [localConfidence, setLocalConfidence] = useState(0);
  const parseTimerRef = useRef(null);
  const textareaRef = useRef(null);

  const titles = { contact: "New Contact", company: "New Company", project: "New Project", deal: dealMode === "investing" ? "Deploy Capital" : "New Deal", lf: "New Post" };
  const icons = { contact: "contacts", company: "company", project: "project", deal: "deals", lf: "lf" };
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  // Dedup gate helper — best match above threshold
  const topDedup = dedupMatches[0] || null;
  const isBlocked = !dedupDismissed && topDedup?.zone === "block";
  const isWarned = !dedupDismissed && topDedup?.zone === "warn";
  const toggleTag = (id) => setForm(p => ({ ...p, tags: p.tags.includes(id) ? p.tags.filter(t => t !== id) : [...p.tags, id] }));
  const canSave = true; // Never block — user can always create and edit later
  const authorC = contacts.find(c => c.id === authorId);

  // Auto-focus textarea on open
  useEffect(() => { if (tab === "smart" && textareaRef.current) textareaRef.current.focus(); }, [tab]);

  // Keyboard shortcuts
  useEffect(() => {
    const h = e => {
      if ((e.metaKey || e.ctrlKey) && e.key === "Enter") { e.preventDefault(); if (pasteText.trim()) triggerParse(pasteText); }
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [pasteText]);

  // Dedup check helper — multi-signal, runs after every parse
  const runDedupCheck = (fields, _dedup) => {
    const candidate = {
      name: fields._contactName || fields.name || fields.projectName || fields.title || "",
      website: fields.website || "",
      telegram: fields.telegram || "",
      twitter: fields.twitter || "",
      token: fields.token || "",
    };
    const directMatches = (candidate.name || candidate.website || candidate.telegram || candidate.twitter)
      ? findDuplicates(candidate, { contacts, companies, projects, deals: deals || [] })
      : [];
    if (type === "deal" && fields.projectName && deals?.length > 0) {
      deals.forEach(d => {
        const m = entityMatchScore({ name: fields.projectName }, d);
        if (m.score >= 0.55 && !directMatches.find(x => x.entity.id === d.id)) {
          directMatches.push({ entity: d, score: m.score, zone: m.zone, signals: m.signals, type: "deal" });
        }
      });
      directMatches.sort((a, b) => b.score - a.score);
    }
    const merged = [...directMatches];
    (_dedup || []).forEach(d => { if (!merged.find(x => x.entity.id === d.entity?.id)) merged.push(d); });
    merged.sort((a, b) => b.score - a.score);
    if (merged.length > 0) { setDedupMatches(merged.slice(0, 3)); setDedupDismissed(false); }
  };

  // Debounced local NLP as user types
  const handlePasteChange = (val) => {
    setPasteText(val);
    if (parseTimerRef.current) clearTimeout(parseTimerRef.current);
    if (val.trim().length < 10) return;
    parseTimerRef.current = setTimeout(() => {
      const nlp = localNLP(val, type, { contacts, companies, projects });
      const { fields, _dedup, _linked, confidence } = nlp;
      setLocalConfidence(confidence);
      const newAiFields = {};
      const updates = {};
      Object.entries(fields).forEach(([k, v]) => { updates[k] = v; newAiFields[k] = "local"; });
      if (Object.keys(updates).length > 0) { setForm(p => ({ ...p, ...updates })); setAiFields(prev => ({ ...prev, ...newAiFields })); }
      runDedupCheck(fields, _dedup);
      if (_linked?.length > 0) setLinkedEntities(_linked);
      triggerAI(val, fields);
    }, 350);
  };

  const triggerParse = (text) => {
    const nlp = localNLP(text, type, { contacts, companies, projects });
    const { fields, _dedup, _linked } = nlp;
    const updates = {};
    const newAiFields = {};
    Object.entries(fields).forEach(([k, v]) => { updates[k] = v; newAiFields[k] = "local"; });
    setForm(p => ({ ...p, ...updates }));
    setAiFields(prev => ({ ...prev, ...newAiFields }));
    runDedupCheck(fields, _dedup);
    if (_linked?.length > 0) setLinkedEntities(_linked);
    triggerAI(text, fields);
  };

  const triggerAI = async (text, localFields) => {
    setAiStatus("parsing");
    try {
      const TAG_LIST = "defi,nft,gamefi,l1,l2,infra,ai-web3,rwa,payments,identity,dao,socialfi,cex,dex,stablecoin,derivatives,lending,privacy,bridge,oracle,modular,zk,launchpad,metaverse,us,eu,asia,latam,mena,cis,africa,global";
      const ROLE_LIST = "vc,angel,founder,co-founder,ceo,cto,coo,cfo,bd,advisor,developer,marketing,community,legal,tokenomics,market-maker";
      // URL enrichment detection — LinkedIn/Twitter/CryptoRank/CoinGecko/CMC
      const urlPatterns = {
        linkedin: /linkedin\.com\/in\/([a-zA-Z0-9-]+)/i,
        twitter: /(?:twitter|x)\.com\/([a-zA-Z0-9_]+)/i,
        cryptorank: /cryptorank\.io\/currencies\/([a-zA-Z0-9-]+)/i,
        coinmarketcap: /coinmarketcap\.com\/currencies\/([a-zA-Z0-9-]+)/i,
        coingecko: /coingecko\.com\/en\/coins\/([a-zA-Z0-9-]+)/i,
      };
      const detectedUrls = {};
      for (const [platform, re] of Object.entries(urlPatterns)) {
        const m = text.match(re);
        if (m) detectedUrls[platform] = m[0];
      }
      const hasEnrichableUrl = Object.keys(detectedUrls).length > 0;
      const enrichmentContext = hasEnrichableUrl
        ? `ENRICHMENT REQUIRED: User provided these URLs: ${JSON.stringify(detectedUrls)}.
Use web_search to find current info about this person/project from public sources:
- Role, current company/projects, Web3 involvement, fundraising history, token info
- Social handles, website, investors, co-founders
Search: "${Object.values(detectedUrls)[0]}", "[name] web3 founder", "site:cryptorank.io [name]"
Fill ALL schema fields from this research. Add source info to notes: "Auto-enriched from [platform]".`
        : "";
      const schemas = {
        contact: `{"name":str,"company":str,"website":str,"role":"one of roles","status":"active|partner|inactive","telegram":str,"twitter":str,"linkedin":str,"email":str,"notes":str,"tags":str[],"subEntities":[{"type":"company|project","data":{fields}}],"dedup":{"entity":{"id":str,"name":str},"score":0-1}|null}`,
        company: `{"name":str,"website":str,"stage":"Idea|Pre-Seed|Seed|Series A|Series B|Growth|Public|Acquired","description":str,"tags":str[],"subEntities":[{"type":"contact","data":{"name":str,"role":str}}],"dedup":null}`,
        project: `{"name":str,"website":str,"stage":"Concept|Development|Testnet|Mainnet|Post-TGE|Mature","description":str,"tags":str[],"subEntities":[{"type":"contact","data":{"name":str,"role":str}}],"dedup":null}`,
        deal: `{"title":str,"projectName":str,"seekingType":"capital|grant|hackathon|accelerator|strategic|liquidity|any","round":"angels|pre-seed|seed|series-a|series-b|series-c-plus|strategic|private-sale|pre-tge|tge|ido-ieo|otc|grant-web3|grant-defi|grant-gov|gitcoin|retropgf|ecosystem-fund|accelerator|incubator|hackathon|bounty|safe|saft|convertible","status":"active|paused|filled|expired|draft","amount":number,"amountMin":number,"currency":"USD|EUR|USDT|USDC|ETH|BTC|SOL|BNB|MATIC|AVAX|ARB|OP|GBP|SGD|AED|TOKEN|MIXED","instrument":"saft|safe|safe-warrant|equity|token|convertible|venture-debt|rbf|grant|otc|lp|any","token":str,"tokenType":"utility|governance|revenue|payment|nft|rwa|none","tokenExists":"yes|planned|no","valuationCap":number,"fdv":number,"cliffMonths":number,"vestingMonths":number,"tgeUnlockPct":number,"description":str,"traction":str,"existingInvestors":str,"closeDate":str,"deckUrl":str,"dataroomUrl":str,"jurisdiction":"cayman|bvi|delaware|singapore|uae|swiss|estonia|uk|other","leadRequired":bool,"proRata":bool,"kycRequired":bool,"boardSeatOk":bool,"audited":bool,"doxxed":bool,"geoRestrictions":str[],"idealInvestorTypes":str[],"terms":str,"tags":str[],"subEntities":[{"type":"contact","data":{"name":str,"role":str,"telegram":str}},{"type":"project","data":{"name":str,"website":str,"stage":str,"description":str,"tags":str[]}}],"dedup":null}`,
        lf: `{"type":"looking|offering|ask|announce","title":str,"body":str,"tags":str[],"subEntities":[],"dedup":null}`,
      };
      const existingCtx = "Contacts:" + JSON.stringify(contacts.slice(0,15).map(c=>({id:c.id,name:c.name}))) +
        " Companies:" + JSON.stringify(companies.slice(0,10).map(c=>({id:c.id,name:c.name}))) +
        " Projects:" + JSON.stringify(projects.slice(0,10).map(p=>({id:p.id,name:p.name})));
      const userPrompt = `Extract a ${type.toUpperCase()} entity. Fill EVERY field you can determine.
CRITICAL for description/body/notes: copy verbatim from TEXT. Preserve ALL newlines, emoji, bullets.
For deals (seeking mode — project/team looking for capital, grant, or support): dealMode = "seeking" (or omit). Extract: title ("ProjectName — RoundLabel · $Amount" or grant/hackathon equivalent), seekingType (capital/grant/hackathon/accelerator/strategic/liquidity/any), round (from: angels,pre-seed,seed,series-a,series-b,series-c-plus,strategic,private-sale,pre-tge,tge,ido-ieo,launchpad,otc,lp-provision,safe,saft,convertible,venture-debt,rbf,grant-web3,grant-defi,grant-gov,gitcoin,retropgf,ecosystem-fund,accelerator,incubator,hackathon,bounty,secondary), status (active/paused/filled/expired/draft), amount (number, max/target), amountMin (number, min), currency (USD/EUR/USDT/USDC/ETH/BTC/SOL/etc), instrument (saft/safe/safe-warrant/equity/token/convertible/venture-debt/rbf/grant/otc/lp/any), token (ticker), tokenType (utility/governance/revenue/payment/nft/rwa/none), tokenExists (yes/planned/no), valuationCap (number), fdv (number), cliffMonths (int), vestingMonths (int), tgeUnlockPct (int 0-100), projectName, description, traction, existingInvestors, closeDate (YYYY-MM-DD), deckUrl, dataroomUrl, jurisdiction (cayman/bvi/delaware/singapore/uae/swiss/estonia/uk/other), idealInvestorTypes (array), leadRequired (bool), proRata (bool), kycRequired (bool), boardSeatOk (bool), audited (bool), doxxed (bool), geoRestrictions (array). REQUIRED: subEntities MUST include the funded project AND named people.
For deals (investing/deploy capital mode): dealMode = "investing". Extract: title (investor/fund name), description (strategy), minTicket (number, USD, min 0.10), maxTicket (0 = unlimited), currency (USD/EUR/GBP/USDT/USDC/ETH/BTC/SOL/etc), preferredStages (array of round ids from: angels,pre-seed,seed,series-a,series-b,series-c-plus,strategic,private-sale,pre-tge,tge,ido-ieo,launchpad,otc,lp-provision,safe,saft,convertible,venture-debt,rbf,grant-web3,grant-defi,grant-gov,gitcoin,retropgf,ecosystem-fund,accelerator,incubator,hackathon,bounty,secondary), preferredVerticals (array), preferredGeos (array), preferredInstruments (array: saft/safe/safe-warrant/equity/token/convertible/venture-debt/rbf/grant/otc/lp/any), investorType (angel/micro-vc/vc/crypto-fund/family-office/syndicate/dao/ecosystem/corporate-vc/hni/foundation/accelerator/launchpad/grant-org), valueAdd (array: tech/marketing/bd/exchange/legal/tokenomics/liquidity/community/regulatory/none), coInvestOk, leadOnly, kycOk, proRataReq, boardSeatReq, terms (additional criteria).
Dedup: if name/projectName closely matches existing DB entity, return dedup:{entity:{id,name},score}.
Tags:[${TAG_LIST}] Roles:[${ROLE_LIST}]
${existingCtx}
${enrichmentContext}
TEXT:"""${text}"""
Already extracted:${JSON.stringify(localFields)}
Return ONLY raw JSON:${schemas[type]||schemas.contact}`;
      const tools = hasEnrichableUrl ? [{ type: "web_search_20250305", name: "web_search" }] : undefined;
      const resp = await fetch("/api/parse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type,
          dealMode: dealMode || null,
          text,
          localFields,
          enrichmentContext,
          existingContacts: contacts.slice(0, 15).map(c => ({ id: c.id, name: c.name })),
          existingCompanies: companies.slice(0, 10).map(c => ({ id: c.id, name: c.name })),
          existingProjects: projects.slice(0, 10).map(p => ({ id: p.id, name: p.name })),
          existingDeals: (deals || []).slice(0, 10).map(d => ({ id: d.id, title: d.title })),
          hasEnrichableUrl,
          tools,
        }),
      });
      if (!resp.ok) throw new Error("API " + resp.status);
      const data = await resp.json();
      if (data.error) throw new Error(data.error);
      // /api/parse returns { fields, overwrite, linked, subEntities, dedup }
      const rawAiFields = data.fields || {};
      const subEntities = data.subEntities || [];
      const dedup = data.dedup || null;
      const newMarked = {};
      setForm(p => {
        const updated = { ...p };
        Object.entries(rawAiFields).forEach(([k, v]) => {
          if (v === null || v === undefined || v === "") return;
          if (Array.isArray(v) && v.length === 0) return;
          updated[k] = v; newMarked[k] = "ai";
        });
        return updated;
      });
      setAiFields(prev => ({ ...prev, ...newMarked }));
      // Sub-entity confirmation: show dialog instead of silently adding to list
      if (subEntities?.length > 0) {
        const newSubs = subEntities.filter(e => e?.data?.name).map(e => {
          const candidate = { name: e.data.name, website: e.data.website || "", telegram: e.data.telegram || "", twitter: e.data.twitter || "" };
          const matches = findDuplicates(candidate, { contacts, companies, projects, deals: deals || [] });
          return { type: e.type, id: "_new_" + e.data.name.replace(/\s/g, "_"), name: e.data.name, isNew: true, data: e.data, confirmed: true, dedupMatch: matches[0] || null };
        });
        if (newSubs.length > 0) setSubEntityConfirm({ entities: newSubs });
        setLinkedEntities(prev => { const ids = new Set(prev.map(e => e.id)); return [...prev, ...newSubs.filter(e => !ids.has(e.id))]; });
      }
      // AI dedup merge
      if (dedup?.entity) {
        const aiM = { entity: contacts.find(c=>c.id===dedup.entity.id)||companies.find(c=>c.id===dedup.entity.id)||projects.find(p=>p.id===dedup.entity.id)||dedup.entity, score: dedup.score||0.9, zone: (dedup.score||0.9)>=0.90?"block":(dedup.score||0.9)>=0.70?"warn":"free", signals:{}, type:"contact" };
        setDedupMatches(prev => { const exists=prev.find(x=>x.entity.id===aiM.entity.id); return exists?prev:[aiM,...prev].sort((a,b)=>b.score-a.score).slice(0,3); });
        setDedupDismissed(false);
      }
      setAiStatus(hasEnrichableUrl ? "enriched" : "done");
    } catch (err) {
      console.warn("AI parse:", err);
      setAiStatus("error");
    }
  };

  const fieldStyle = (key) => {
    if (aiFields[key] === "ai") return { borderColor: "oklch(0.55 0.14 265)", background: "oklch(0.18 0.04 265)" };
    if (aiFields[key] === "local") return { borderColor: "oklch(0.55 0.14 160)", background: "oklch(0.18 0.04 160)" };
    return {};
  };

  const visibleLinked = linkedEntities.filter(e => !dismissedLinked.includes(e.id));

  return (
    <div className="ov" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal modal-lg">
        {/* Header */}
        <div className="mh">
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <I n={icons[type]} s={16} c="var(--fg2)" />
            <div>
              <div className="mt">{titles[type]}</div>
              <div className="ms" style={{ display: "flex", alignItems: "center", gap: 5 }}>
                <I n="user" s={11} c="var(--fg3)" />
                Creating as: <strong>{authorC?.name || "You"}</strong>
              </div>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            {/* AI status indicator */}
            {aiStatus === "parsing" && (
              <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11.5, color: "oklch(0.55 0.14 265)", fontFamily: "var(--mono)" }}>
                <span style={{ animation: "spin 1s linear infinite", display: "inline-block" }}>⟳</span> AI parsing…
              </div>
            )}
            {aiStatus === "enriched" && (
              <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11, color: "oklch(0.65 0.14 160)", fontFamily: "var(--mono)" }}>
                <span>🌐</span> Enriched from web
              </div>
            )}
            {(aiStatus === "done" || aiStatus === "enriched") && Object.keys(aiFields).length > 0 && aiStatus !== "enriched" && (
              <div style={{ fontSize: 11, color: "oklch(0.55 0.14 160)", fontFamily: "var(--mono)" }}>
                ✓ {Object.keys(aiFields).length} fields filled
              </div>
            )}
            <button className="btn btn-g btn-ic" onClick={onClose}><I n="x" s={14} /></button>
          </div>
        </div>

        {/* Tab switcher */}
        <div style={{ display: "flex", borderBottom: "1px solid var(--border)", padding: "0 18px", gap: 0 }}>
          {[
            { id: "smart", label: "✦ Smart Paste", desc: "Paste any text — AI fills the form" },
            { id: "manual", label: "Manual", desc: "Fill fields yourself" },
          ].map(t => (
            <button key={t.id} onClick={() => setTab(t.id)} style={{
              padding: "9px 14px", fontSize: 12.5, fontWeight: tab === t.id ? 600 : 400,
              color: tab === t.id ? "var(--fg)" : "var(--fg3)",
              borderBottom: tab === t.id ? "2px solid oklch(0.55 0.14 265)" : "2px solid transparent",
              background: "none", border: "none", borderBottom: tab === t.id ? "2px solid oklch(0.55 0.14 265)" : "2px solid transparent",
              cursor: "pointer", transition: "all .15s", marginBottom: -1,
            }}>{t.label}</button>
          ))}
        </div>

        <div className="mb">
          {/* ── SMART PASTE TAB ── */}
          {tab === "smart" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div>
                <label className="lbl">
                  <span>Paste anything — the more the better: links, docs, LinkedIn bio, Telegram post, pitch deck, deal memo, tweet, website</span>
                </label>
                <textarea
                  ref={textareaRef}
                  className="paste"
                  style={{ minHeight: 110, width: "100%", boxSizing: "border-box" }}
                  placeholder={
                    type === "contact" ? "e.g. Pavel Durov, CEO at TON Foundation. Builder of Telegram. @durov on TG. Focused on L1, privacy, messaging. Based in Dubai." :
                    type === "company" ? "e.g. Paradigm is a leading crypto VC based in the US, focused on DeFi and infrastructure. $2.5B AUM. paradigm.xyz" :
                    type === "project" ? "e.g. zkSync is a ZK-rollup L2 scaling solution for Ethereum. Currently on Mainnet. zksync.io — infra, zk, l2" :
                    type === "deal" && dealMode !== "investing" ? "e.g. Seed round, $3M at $15M valuation cap. SAFT. Token: FLOW. 18 month vest, 6 month cliff. Open." :
                    type === "deal" && dealMode === "investing" ? "e.g. Angel investor, deploying $10K–$100K per deal. Focus: DeFi, Infrastructure. Pre-seed & Seed only. SAFT or Equity. Global. Looking for strong founders." :
                    "e.g. Looking for a Market Maker for DEX listing. Token TGE in Q2. Budget available. DM @handle"
                  }
                  value={pasteText}
                  onChange={e => handlePasteChange(e.target.value)}
                />
              </div>

              {/* AI parsing status — prominent, inside tab */}
              {aiStatus === "parsing" && (
                <div style={{ background: "oklch(0.16 0.04 265)", border: "1px solid oklch(0.35 0.1 265)", borderRadius: "var(--r2)", padding: "12px 14px", display: "flex", alignItems: "center", gap: 10 }}>
                  <svg style={{ animation: "spin 0.8s linear infinite", flexShrink: 0 }} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="oklch(0.65 0.14 265)" strokeWidth="2.5" strokeLinecap="round"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>
                  <div>
                    <div style={{ fontSize: 12.5, fontWeight: 600, color: "oklch(0.75 0.1 265)" }}>AI is analyzing…</div>
                    <div style={{ fontSize: 11.5, color: "var(--fg3)", marginTop: 2 }}>Extracting all fields, detecting related entities</div>
                  </div>
                </div>
              )}
              {aiStatus === "done" && Object.keys(aiFields).length > 0 && (
                <div style={{ background: "oklch(0.16 0.04 160)", border: "1px solid oklch(0.35 0.1 160)", borderRadius: "var(--r2)", padding: "10px 14px", display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontSize: 14 }}>✓</span>
                  <span style={{ fontSize: 12.5, color: "oklch(0.75 0.1 160)", fontWeight: 500 }}>AI filled {Object.keys(aiFields).length} fields — review in Manual tab or create now</span>
                </div>
              )}
              {aiStatus === "error" && (
                <div style={{ background: "oklch(0.16 0.04 27)", border: "1px solid oklch(0.35 0.1 27)", borderRadius: "var(--r2)", padding: "10px 14px", fontSize: 12.5, color: "oklch(0.7 0.14 27)" }}>
                  ⚠ AI unavailable — local parser only. Some fields may be incomplete.
                </div>
              )}
              {pasteText.trim().length > 10 && (
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontSize: 11, color: "var(--fg3)", whiteSpace: "nowrap" }}>Parse confidence</span>
                  <div style={{ flex: 1, height: 4, background: "var(--bg3)", borderRadius: 2, overflow: "hidden" }}>
                    <div style={{
                      height: "100%", borderRadius: 2, transition: "width .4s ease",
                      width: `${Math.round(localConfidence * 100)}%`,
                      background: localConfidence > 0.7 ? "oklch(0.55 0.14 160)" : localConfidence > 0.4 ? "oklch(0.55 0.14 80)" : "oklch(0.55 0.14 27)",
                    }} />
                  </div>
                  <span style={{ fontSize: 11, color: "var(--fg3)", fontFamily: "var(--mono)", minWidth: 28 }}>{Math.round(localConfidence * 100)}%</span>
                </div>
              )}

              {/* ═══ DEDUP GATE — three-zone system ═══
               * GREEN  (<70%): no banner shown
               * YELLOW (70-89%): warning, user can override
               * RED    (≥90%): hard block, cannot create
               */}
              {!dedupDismissed && dedupMatches.length > 0 && dedupMatches[0].zone !== "free" && (() => {
                const top = dedupMatches[0];
                const pct = Math.round(top.score * 100);
                const isBlock = top.zone === "block";
                const signalLabels = Object.entries(top.signals || {}).filter(([,v])=>v>=0.8).map(([k])=>k).join(", ");
                return (
                  <div style={{ background: isBlock ? "rgba(239,68,68,0.1)" : "rgba(245,158,11,0.08)", border: `1px solid ${isBlock ? "rgba(239,68,68,0.4)" : "rgba(245,158,11,0.35)"}`, borderRadius: 10, padding: "12px 14px" }}>
                    <div style={{ display: "flex", alignItems: "flex-start", gap: 10, marginBottom: 10 }}>
                      <span style={{ fontSize: 20, flexShrink: 0 }}>{isBlock ? "🚫" : "⚠️"}</span>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 13, fontWeight: 700, color: isBlock ? "#f87171" : "#f59e0b", marginBottom: 3 }}>
                          {isBlock ? `Duplicate blocked — ${pct}% match` : `Possible duplicate — ${pct}% match`}
                        </div>
                        <div style={{ fontSize: 12, color: "var(--fg2)", lineHeight: 1.5 }}>
                          <strong>"{top.entity?.name || top.entity?.title}"</strong> already exists in your {top.type}s.
                          {signalLabels && <span style={{ color: "var(--fg3)" }}> Matched on: {signalLabels}.</span>}
                        </div>
                        {isBlock && (
                          <div style={{ marginTop: 6, fontSize: 11.5, color: "var(--fg3)", lineHeight: 1.5 }}>
                            A ≥90% match is treated as the same entity. Creating a duplicate would fragment karma history. 
                            Open the existing entity to update it instead.
                          </div>
                        )}
                      </div>
                    </div>
                    {/* Match score bar */}
                    <div style={{ marginBottom: 10 }}>
                      <div style={{ height: 4, background: "var(--b2)", borderRadius: 2, overflow: "hidden" }}>
                        <div style={{ height: "100%", width: `${pct}%`, background: isBlock ? "#ef4444" : "#f59e0b", borderRadius: 2, transition: "width 0.4s" }} />
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 3 }}>
                        <span style={{ fontSize: 10, color: "var(--fg4)" }}>0%</span>
                        <span style={{ fontSize: 10, color: "var(--fg4)" }}>70% warn</span>
                        <span style={{ fontSize: 10, color: "var(--fg4)" }}>90% block</span>
                        <span style={{ fontSize: 10, color: "var(--fg4)" }}>100%</span>
                      </div>
                    </div>
                    {/* Other matches if any */}
                    {dedupMatches.length > 1 && (
                      <div style={{ fontSize: 11, color: "var(--fg3)", marginBottom: 8 }}>
                        Also similar: {dedupMatches.slice(1).map(m => `"${m.entity?.name}" (${Math.round(m.score*100)}%)`).join(", ")}
                      </div>
                    )}
                    <div style={{ display: "flex", gap: 6 }}>
                      {!isBlock && (
                        <button className="btn btn-warn" style={{ fontSize: 11.5 }} onClick={() => setDedupDismissed(true)}>
                          Create anyway (not a duplicate)
                        </button>
                      )}
                      <button className="btn btn-g" style={{ fontSize: 11.5 }} onClick={onClose}>
                        {isBlock ? "Go back" : "Cancel"}
                      </button>
                    </div>
                  </div>
                );
              })()}

              {/* Linked entities preview */}
              {visibleLinked.length > 0 && (
                <div style={{ background: "var(--bg2)", border: "1px solid var(--border)", borderRadius: "var(--r2)", padding: "10px 12px" }}>
                  <div style={{ fontSize: 11.5, color: "var(--fg3)", marginBottom: 7, fontWeight: 500 }}>🔗 Detected related entities</div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                    {visibleLinked.map(e => (
                      <div key={e.id} style={{ display: "flex", alignItems: "center", gap: 5, background: "var(--bg3)", borderRadius: 6, padding: "3px 8px 3px 6px", fontSize: 12 }}>
                        <I n={e.type === "contact" ? "user" : e.type === "company" ? "company" : "project"} s={11} c="var(--fg3)" />
                        <span style={{ color: "var(--fg2)" }}>{e.name}</span>
                        {e.isNew && <span style={{ fontSize: 10, color: "oklch(0.55 0.14 160)", fontFamily: "var(--mono)" }}>+ new</span>}
                        <button onClick={() => setDismissedLinked(p => [...p, e.id])} style={{ background: "none", border: "none", color: "var(--fg3)", cursor: "pointer", padding: 0, fontSize: 12, lineHeight: 1, marginLeft: 2 }}>×</button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Preview of filled fields — shows up as soon as something is parsed */}
              {Object.keys(aiFields).length > 0 && (
                <div style={{ background: "var(--bg2)", border: "1px solid var(--border)", borderRadius: "var(--r2)", padding: "12px 14px" }}>
                  <div style={{ fontSize: 11.5, color: "var(--fg3)", marginBottom: 8, fontWeight: 500, display: "flex", alignItems: "center", gap: 6 }}>
                    <span style={{ width: 8, height: 8, borderRadius: "50%", background: "oklch(0.55 0.14 160)", display: "inline-block" }} />
                    Auto-filled — review before saving
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px 12px" }}>
                    {Object.entries(aiFields).map(([k, src]) => {
                      const v = form[k];
                      if (!v || (Array.isArray(v) && v.length === 0) || v === 0) return null;
                      const display = Array.isArray(v) ? v.join(", ") : String(v);
                      return (
                        <div key={k} style={{ display: "flex", gap: 6, alignItems: "baseline", fontSize: 12 }}>
                          <span style={{ color: "var(--fg3)", minWidth: 70 }}>{k}</span>
                          <span style={{ color: src === "ai" ? "oklch(0.75 0.1 265)" : "oklch(0.75 0.1 160)", fontFamily: "var(--mono)", fontSize: 11.5, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 160 }}>{display}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* CTA to switch to review */}
              {Object.keys(aiFields).length > 0 && (
                <button className="btn btn-g" style={{ alignSelf: "flex-start", fontSize: 12 }} onClick={() => setTab("manual")}>
                  <I n="check" s={12} /> Review &amp; edit all fields →
                </button>
              )}
            </div>
          )}

          {/* ── MANUAL / REVIEW TAB ── */}
          {tab === "manual" && (
            <>
              {/* CONTACT */}
              {type === "contact" && (<>
                <div className="g2">
                  <div className="fg0"><label className="lbl">Full Name *</label><input className="inp" style={fieldStyle("name")} placeholder="Pavel Ivanov" value={form.name} onChange={e => set("name", e.target.value)} autoFocus /></div>
                  <div className="fg0"><label className="lbl">Company</label><input className="inp" style={fieldStyle("company")} placeholder="Paradigm" value={form.company} onChange={e => set("company", e.target.value)} /></div>
                </div>
                <div className="g2">
                  <div className="fg0"><label className="lbl">Role</label><select className="sel" style={fieldStyle("role")} value={form.role} onChange={e => set("role", e.target.value)}>{ROLES.map(r => <option key={r.id} value={r.id}>{r.label}</option>)}</select></div>
                  <div className="fg0"><label className="lbl">Status</label><select className="sel" value={form.status} onChange={e => set("status", e.target.value)}><option value="active">Active</option><option value="partner">Partner</option><option value="inactive">Inactive</option></select></div>
                </div>
                <div className="g3">
                  <div className="fg0"><label className="lbl">Telegram</label><input className="inp" style={fieldStyle("telegram")} placeholder="@handle" value={form.telegram} onChange={e => set("telegram", e.target.value.replace("@", ""))} /></div>
                  <div className="fg0"><label className="lbl">Twitter / X</label><input className="inp" style={fieldStyle("twitter")} placeholder="@handle" value={form.twitter} onChange={e => set("twitter", e.target.value.replace("@", ""))} /></div>
                  <div className="fg0"><label className="lbl">LinkedIn</label><input className="inp" style={fieldStyle("linkedin")} placeholder="username" value={form.linkedin} onChange={e => set("linkedin", e.target.value)} /></div>
                </div>
                <div className="g2">
                  <div className="fg0"><label className="lbl">Email</label><input className="inp" style={fieldStyle("email")} type="email" placeholder="email@domain.com" value={form.email} onChange={e => set("email", e.target.value)} /></div>
                  <div className="fg0"><label className="lbl">Website</label><input className="inp" style={fieldStyle("website")} placeholder="domain.com" value={form.website} onChange={e => set("website", e.target.value)} /></div>
                </div>
                <div className="fg0"><label className="lbl">Notes</label><textarea className="ta" placeholder="Private notes..." value={form.notes} onChange={e => set("notes", e.target.value)} /></div>
                <div className="fg0">
                  <label className="lbl">Tags {aiFields.tags && <span style={{ fontSize: 10.5, color: "oklch(0.55 0.14 160)", marginLeft: 4 }}>✓ AI tagged</span>}</label>
                  <div style={{ marginBottom: 5 }}><span style={{ fontSize: 11, color: "var(--fg3)", fontWeight: 500 }}>Verticals</span></div>
                  <div className="tw">{VERTICALS.map(t => <button key={t.id} className={`tp${form.tags.includes(t.id) ? " on" : ""}`} onClick={() => toggleTag(t.id)}>{t.label}</button>)}</div>
                  <div style={{ marginTop: 5, marginBottom: 4 }}><span style={{ fontSize: 11, color: "var(--fg3)", fontWeight: 500 }}>Geo</span></div>
                  <div className="tw">{GEOS.map(t => <button key={t.id} className={`tp${form.tags.includes(t.id) ? " on" : ""}`} onClick={() => toggleTag(t.id)}>{t.label}</button>)}</div>
                </div>
              </>)}

              {/* COMPANY */}
              {type === "company" && (<>
                <div className="g2">
                  <div className="fg0"><label className="lbl">Company Name *</label><input className="inp" style={fieldStyle("name")} placeholder="Paradigm" value={form.name} onChange={e => set("name", e.target.value)} autoFocus /></div>
                  <div className="fg0"><label className="lbl">Website</label><input className="inp" style={fieldStyle("website")} placeholder="paradigm.xyz" value={form.website} onChange={e => set("website", e.target.value)} /></div>
                </div>
                <div className="fg0"><label className="lbl">Stage</label><select className="sel" style={fieldStyle("stage")} value={form.stage} onChange={e => set("stage", e.target.value)}>{COMPANY_STAGES.map(s => <option key={s} value={s}>{s}</option>)}</select></div>
                <div className="fg0"><label className="lbl">Description</label><textarea className="ta" style={fieldStyle("description")} placeholder="What does this company do?" value={form.description} onChange={e => set("description", e.target.value)} /></div>
                <div className="fg0">
                  <label className="lbl">Tags</label>
                  <div className="tw" style={{ marginBottom: 5 }}>{VERTICALS.map(t => <button key={t.id} className={`tp${form.tags.includes(t.id) ? " on" : ""}`} onClick={() => toggleTag(t.id)}>{t.label}</button>)}</div>
                  <div className="tw">{GEOS.map(t => <button key={t.id} className={`tp${form.tags.includes(t.id) ? " on" : ""}`} onClick={() => toggleTag(t.id)}>{t.label}</button>)}</div>
                </div>
              </>)}

              {/* PROJECT */}
              {type === "project" && (<>
                <div className="g2">
                  <div className="fg0"><label className="lbl">Project Name *</label><input className="inp" style={fieldStyle("name")} placeholder="FlowBridge" value={form.name} onChange={e => set("name", e.target.value)} autoFocus /></div>
                  <div className="fg0"><label className="lbl">Website</label><input className="inp" style={fieldStyle("website")} placeholder="flowbridge.io" value={form.website} onChange={e => set("website", e.target.value)} /></div>
                </div>
                <div className="fg0"><label className="lbl">Stage</label><select className="sel" style={fieldStyle("stage")} value={form.stage} onChange={e => set("stage", e.target.value)}>{PROJECT_STAGES.map(s => <option key={s} value={s}>{s}</option>)}</select></div>
                <div className="fg0"><label className="lbl">Description</label><textarea className="ta" style={fieldStyle("description")} placeholder="What does this project do?" value={form.description} onChange={e => set("description", e.target.value)} /></div>
                <div className="fg0">
                  <label className="lbl">Tags</label>
                  <div className="tw" style={{ marginBottom: 5 }}>{VERTICALS.map(t => <button key={t.id} className={`tp${form.tags.includes(t.id) ? " on" : ""}`} onClick={() => toggleTag(t.id)}>{t.label}</button>)}</div>
                  <div className="tw">{GEOS.map(t => <button key={t.id} className={`tp${form.tags.includes(t.id) ? " on" : ""}`} onClick={() => toggleTag(t.id)}>{t.label}</button>)}</div>
                </div>
              </>)}

              {/* ── SEEKING (📈 I need capital/grant/support) ── */}
              {type === "deal" && props.dealMode !== "investing" && (<>
                {/* What are you seeking? */}
                <div className="fg0">
                  <label className="lbl">What are you seeking? *</label>
                  <div className="tw">
                    {SEEKING_TYPES.map(s => (
                      <button key={s.id} title={s.desc}
                        className={`tp${(form.seekingType||"capital") === s.id ? " on" : ""}`}
                        onClick={() => set("seekingType", s.id)}>
                        {s.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="fg0"><label className="lbl">Title *</label>
                  <input className="inp" style={fieldStyle("title")} autoFocus
                    placeholder="e.g. Seed Round — FlowBridge · $2M · SAFT"
                    value={form.title||""} onChange={e => set("title", e.target.value)} />
                </div>

                <div className="g2">
                  <div className="fg0">
                    <label className="lbl">Category / Round</label>
                    <select className="sel" style={fieldStyle("round")} value={form.round||""} onChange={e => set("round", e.target.value)}>
                      <option value="">— Select —</option>
                      {Object.entries(DEAL_ROUNDS.reduce((g: any, r) => { (g[r.group]=g[r.group]||[]).push(r); return g; }, {})).map(([grp, items]: any) => (
                        <optgroup key={grp} label={grp}>{items.map((r: any) => <option key={r.id} value={r.id} title={r.desc}>{r.label}</option>)}</optgroup>
                      ))}
                    </select>
                  </div>
                  <div className="fg0">
                    <label className="lbl">Status</label>
                    <select className="sel" style={fieldStyle("status")} value={form.status||"active"} onChange={e => set("status", e.target.value)}>
                      {DEAL_STATUSES.map(s => <option key={s.id} value={s.id}>{s.icon} {s.label} — {s.desc}</option>)}
                    </select>
                  </div>
                </div>

                {/* Amount range + currency */}
                <div style={{ background: "var(--bg3)", border: "1px solid var(--border)", borderRadius: 7, padding: "10px 12px", marginBottom: 8 }}>
                  <div style={{ fontSize: 11.5, fontWeight: 600, color: "var(--fg2)", marginBottom: 8 }}>💰 Amount</div>
                  <div className="g3">
                    <div className="fg0">
                      <label className="lbl">Min Amount</label>
                      <input className="inp" type="number" placeholder="0" value={form.amountMin||""} onChange={e => set("amountMin", Number(e.target.value))} />
                    </div>
                    <div className="fg0">
                      <label className="lbl">Max / Target Amount *</label>
                      <input className="inp" style={fieldStyle("amount")} type="number" placeholder="3000000" value={form.amount||""} onChange={e => set("amount", Number(e.target.value))} />
                    </div>
                    <div className="fg0">
                      <label className="lbl">Currency</label>
                      <select className="sel" style={fieldStyle("currency")} value={form.currency||"USD"} onChange={e => set("currency", e.target.value)}>
                        {Object.entries(CURRENCIES.reduce((g: any, c) => { (g[c.group]=g[c.group]||[]).push(c); return g; }, {})).map(([grp, items]: any) => (
                          <optgroup key={grp} label={grp}>{items.map((c: any) => <option key={c.id} value={c.id}>{c.id} — {c.label.split("—")[1]?.trim()||c.label}</option>)}</optgroup>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                {/* Instrument */}
                <div className="fg0">
                  <label className="lbl">Instrument / Structure</label>
                  <div className="tw">
                    {INSTRUMENTS.map(i => (
                      <button key={i.id} title={i.desc}
                        className={`tp${(form.instrument||"any") === i.id ? " on" : ""}`}
                        onClick={() => set("instrument", i.id)}>
                        {i.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Token details */}
                <div className="g3">
                  <div className="fg0"><label className="lbl">Token Ticker</label><input className="inp" style={fieldStyle("token")} placeholder="FLOW" value={form.token||""} onChange={e => set("token", e.target.value)} /></div>
                  <div className="fg0">
                    <label className="lbl">Token Type</label>
                    <select className="sel" value={form.tokenType||""} onChange={e => set("tokenType", e.target.value)}>
                      <option value="">—</option>
                      {TOKEN_TYPES.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
                    </select>
                  </div>
                  <div className="fg0">
                    <label className="lbl">Token Exists?</label>
                    <select className="sel" value={form.tokenExists||""} onChange={e => set("tokenExists", e.target.value)}>
                      <option value="">—</option>
                      <option value="yes">Yes — live</option>
                      <option value="planned">Planned</option>
                      <option value="no">No token</option>
                    </select>
                  </div>
                </div>

                {/* Valuation */}
                <div className="g2">
                  <div className="fg0"><label className="lbl">Valuation Cap / Pre-Money</label><input className="inp" type="number" placeholder="10000000" value={form.valuationCap||""} onChange={e => set("valuationCap", Number(e.target.value))} /></div>
                  <div className="fg0"><label className="lbl">FDV (token deals)</label><input className="inp" type="number" placeholder="50000000" value={form.fdv||""} onChange={e => set("fdv", Number(e.target.value))} /></div>
                </div>

                {/* Vesting */}
                <div style={{ background: "var(--bg3)", border: "1px solid var(--border)", borderRadius: 7, padding: "10px 12px", marginBottom: 8 }}>
                  <div style={{ fontSize: 11.5, fontWeight: 600, color: "var(--fg2)", marginBottom: 8 }}>🔒 Vesting / Lock-up <span style={{ fontWeight: 400, color: "var(--fg3)", fontSize: 11 }}>(leave blank if not applicable)</span></div>
                  <div className="g3">
                    <div className="fg0"><label className="lbl">Cliff (months)</label><input className="inp" type="number" placeholder="6" min="0" max="36" value={form.cliffMonths||""} onChange={e => set("cliffMonths", Number(e.target.value))} /></div>
                    <div className="fg0"><label className="lbl">Vesting (months)</label><input className="inp" type="number" placeholder="18" min="0" max="60" value={form.vestingMonths||""} onChange={e => set("vestingMonths", Number(e.target.value))} /></div>
                    <div className="fg0"><label className="lbl">TGE Unlock %</label><input className="inp" type="number" placeholder="10" min="0" max="100" value={form.tgeUnlockPct||""} onChange={e => set("tgeUnlockPct", Number(e.target.value))} /></div>
                  </div>
                </div>

                <div className="fg0"><label className="lbl">Project / Company Name</label><input className="inp" style={fieldStyle("projectName")} placeholder="FlowBridge" value={form.projectName||""} onChange={e => set("projectName", e.target.value)} /></div>
                <div className="fg0"><label className="lbl">Description *</label><textarea className="ta" rows={3} style={fieldStyle("description")} placeholder="What does your project do? What problem does it solve? Why now?" value={form.description||""} onChange={e => set("description", e.target.value)} /></div>
                <div className="fg0"><label className="lbl">Traction / Metrics</label><input className="inp" style={fieldStyle("traction")} placeholder="1200 waitlist, $850K TVL, 3 LOIs, 50K users" value={form.traction||""} onChange={e => set("traction", e.target.value)} /></div>

                <div className="fg0">
                  <label className="lbl">Ideal Investor Type <span style={{ fontWeight: 400, color: "var(--fg3)" }}>(multi-select)</span></label>
                  <div className="tw">
                    {INVESTOR_TYPES.map(t => (
                      <button key={t.id} title={t.range}
                        className={`tp${(form.idealInvestorTypes||[]).includes(t.id) ? " on" : ""}`}
                        onClick={() => { const c = form.idealInvestorTypes||[]; set("idealInvestorTypes", c.includes(t.id) ? c.filter((x:string)=>x!==t.id) : [...c, t.id]); }}>
                        {t.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="g2">
                  <div className="fg0"><label className="lbl">Existing Investors</label><input className="inp" placeholder="Spartan Group, Animoca..." value={form.existingInvestors||""} onChange={e => set("existingInvestors", e.target.value)} /></div>
                  <div className="fg0"><label className="lbl">Close Deadline</label><input className="inp" type="date" value={form.closeDate||""} onChange={e => set("closeDate", e.target.value)} /></div>
                </div>
                <div className="g2">
                  <div className="fg0"><label className="lbl">Pitch Deck URL</label><input className="inp" placeholder="https://docsend.com/..." value={form.deckUrl||""} onChange={e => set("deckUrl", e.target.value)} /></div>
                  <div className="fg0"><label className="lbl">Data Room URL</label><input className="inp" placeholder="https://..." value={form.dataroomUrl||""} onChange={e => set("dataroomUrl", e.target.value)} /></div>
                </div>

                <div className="fg0">
                  <label className="lbl">Legal Jurisdiction</label>
                  <select className="sel" value={form.jurisdiction||""} onChange={e => set("jurisdiction", e.target.value)}>
                    <option value="">— Not specified —</option>
                    {JURISDICTIONS.map(j => <option key={j.id} value={j.id}>{j.label}</option>)}
                  </select>
                </div>

                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  {[
                    { key: "leadRequired", label: "⚡ Lead investor sought" },
                    { key: "proRata",      label: "📋 Pro-rata offered" },
                    { key: "kycRequired",  label: "🪪 KYC required" },
                    { key: "boardSeatOk",  label: "🪑 Board seat OK" },
                    { key: "audited",      label: "✅ Audited" },
                    { key: "doxxed",       label: "👤 Doxxed team" },
                  ].map(f => (
                    <button key={f.key} className={`tp${form[f.key] ? " on" : ""}`} onClick={() => set(f.key, !form[f.key])}>
                      {f.label}
                    </button>
                  ))}
                </div>

                <div className="fg0">
                  <label className="lbl">Accepted Investor Geos <span style={{ fontWeight: 400, color: "var(--fg3)" }}>(empty = global)</span></label>
                  <div className="tw">{GEOS.map(g => (
                    <button key={g.id} className={`tp${(form.geoRestrictions||[]).includes(g.id) ? " on" : ""}`}
                      onClick={() => { const c = form.geoRestrictions||[]; set("geoRestrictions", c.includes(g.id) ? c.filter((x:string)=>x!==g.id) : [...c, g.id]); }}>
                      {g.label}
                    </button>
                  ))}</div>
                </div>

                <div className="fg0"><label className="lbl">Additional Notes / Terms</label><textarea className="ta" style={fieldStyle("terms")} placeholder="Anything else: co-invest welcome, board seat needed, specific ecosystem..." value={form.terms||""} onChange={e => set("terms", e.target.value)} /></div>
              </>)}

                            {/* ── DEPLOYING (💰 I have capital to deploy) ── */}
              {type === "deal" && props.dealMode === "investing" && (<>

                <div className="fg0">
                  <label className="lbl">Investor / Fund Name *</label>
                  <input className="inp" style={fieldStyle("title")} autoFocus
                    placeholder="e.g. Spartan Capital · John Doe Angel"
                    value={form.title||""} onChange={e => set("title", e.target.value)} />
                </div>

                <div className="g2">
                  <div className="fg0">
                    <label className="lbl">Investor Type</label>
                    <select className="sel" value={form.investorType||""} onChange={e => set("investorType", e.target.value)}>
                      <option value="">— Select type —</option>
                      {INVESTOR_TYPES.map(t => <option key={t.id} value={t.id}>{t.label} ({t.range})</option>)}
                    </select>
                  </div>
                  <div className="fg0">
                    <label className="lbl">Status</label>
                    <select className="sel" value={form.status||"active"} onChange={e => set("status", e.target.value)}>
                      {DEAL_STATUSES.map(s => <option key={s.id} value={s.id}>{s.icon} {s.label} — {s.desc}</option>)}
                    </select>
                  </div>
                </div>

                <div className="fg0">
                  <label className="lbl">Strategy & About</label>
                  <textarea className="ta" rows={3} style={fieldStyle("description")}
                    placeholder="Who you are, what sectors you focus on, value-add beyond capital, notable portfolio..."
                    value={form.description||""} onChange={e => set("description", e.target.value)} />
                </div>

                {/* Check size + currency */}
                <div style={{ background: "var(--bg3)", border: "1px solid var(--border)", borderRadius: 7, padding: "10px 12px", marginBottom: 8 }}>
                  <div style={{ fontSize: 11.5, fontWeight: 600, color: "var(--fg2)", marginBottom: 8 }}>💰 Check Size per Deal</div>
                  <div className="g3">
                    <div className="fg0">
                      <label className="lbl">Min Ticket</label>
                      <input className="inp" type="number" style={fieldStyle("minTicket")} placeholder="25000" step="1000" value={form.minTicket||""} onChange={e => set("minTicket", Number(e.target.value))} />
                      <div style={{ fontSize: 10.5, color: "var(--fg3)", marginTop: 2 }}>From $0.10 — no minimum</div>
                    </div>
                    <div className="fg0">
                      <label className="lbl">Max Ticket</label>
                      <input className="inp" type="number" style={fieldStyle("maxTicket")} placeholder="500000" step="1000" value={form.maxTicket||""} onChange={e => set("maxTicket", Number(e.target.value))} />
                      <div style={{ fontSize: 10.5, color: "var(--fg3)", marginTop: 2 }}>0 = unlimited</div>
                    </div>
                    <div className="fg0">
                      <label className="lbl">Currency</label>
                      <select className="sel" value={form.currency||"USD"} onChange={e => set("currency", e.target.value)}>
                        {Object.entries(CURRENCIES.reduce((g: any, c) => { (g[c.group]=g[c.group]||[]).push(c); return g; }, {})).map(([grp, items]: any) => (
                          <optgroup key={grp} label={grp}>{items.map((c: any) => <option key={c.id} value={c.id}>{c.id}</option>)}</optgroup>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                {/* What I deploy into */}
                <div className="fg0">
                  <label className="lbl">I deploy into <span style={{ fontWeight: 400, color: "var(--fg3)" }}>(categories)</span></label>
                  <div style={{ marginBottom: 6 }}>
                    {Object.entries(DEAL_ROUNDS.reduce((g: any, r) => { (g[r.group]=g[r.group]||[]).push(r); return g; }, {})).map(([grp, items]: any) => (
                      <div key={grp} style={{ marginBottom: 8 }}>
                        <div style={{ fontSize: 10, color: "var(--fg3)", textTransform: "uppercase", letterSpacing: ".5px", marginBottom: 4 }}>{grp}</div>
                        <div className="tw">
                          {items.map((r: any) => (
                            <button key={r.id} title={r.desc}
                              className={`tp${(form.preferredStages||[]).includes(r.id) ? " on" : ""}`}
                              onClick={() => { const c = form.preferredStages||[]; set("preferredStages", c.includes(r.id) ? c.filter((x:string)=>x!==r.id) : [...c, r.id]); }}>
                              {r.label}
                            </button>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Preferred instruments */}
                <div className="fg0">
                  <label className="lbl">Preferred Instruments <span style={{ fontWeight: 400, color: "var(--fg3)" }}>(multi-select)</span></label>
                  <div className="tw">
                    {INSTRUMENTS.map(i => (
                      <button key={i.id} title={i.desc}
                        className={`tp${(form.preferredInstruments||[]).includes(i.id) ? " on" : ""}`}
                        onClick={() => { const c = form.preferredInstruments||[]; set("preferredInstruments", c.includes(i.id) ? c.filter((x:string)=>x!==i.id) : [...c, i.id]); }}>
                        {i.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Preferred verticals */}
                <div className="fg0">
                  <label className="lbl">Preferred Verticals</label>
                  <div className="tw">
                    {VERTICALS.map(v => (
                      <button key={v.id}
                        className={`tp${(form.preferredVerticals||[]).includes(v.id) ? " on" : ""}`}
                        onClick={() => { const c = form.preferredVerticals||[]; set("preferredVerticals", c.includes(v.id) ? c.filter((x:string)=>x!==v.id) : [...c, v.id]); }}>
                        {v.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Preferred geos */}
                <div className="fg0">
                  <label className="lbl">Preferred Geographies</label>
                  <div className="tw">
                    {GEOS.map(g => (
                      <button key={g.id}
                        className={`tp${(form.preferredGeos||[]).includes(g.id) ? " on" : ""}`}
                        onClick={() => { const c = form.preferredGeos||[]; set("preferredGeos", c.includes(g.id) ? c.filter((x:string)=>x!==g.id) : [...c, g.id]); }}>
                        {g.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Terms preferences */}
                <div style={{ background: "var(--bg3)", border: "1px solid var(--border)", borderRadius: 7, padding: "10px 12px", marginBottom: 8 }}>
                  <div style={{ fontSize: 11.5, fontWeight: 600, color: "var(--fg2)", marginBottom: 8 }}>📋 Terms Preferences <span style={{ fontWeight: 400, color: "var(--fg3)", fontSize: 11 }}>(optional — improves synergy matching)</span></div>
                  <div className="g3">
                    <div className="fg0"><label className="lbl">Max Cliff (months)</label><input className="inp" type="number" placeholder="12" min="0" max="36" value={form.maxCliffMonths||""} onChange={e => set("maxCliffMonths", Number(e.target.value))} /></div>
                    <div className="fg0"><label className="lbl">Min Vesting (months)</label><input className="inp" type="number" placeholder="12" min="0" max="60" value={form.minVestingMonths||""} onChange={e => set("minVestingMonths", Number(e.target.value))} /></div>
                    <div className="fg0"><label className="lbl">Max Vesting (months)</label><input className="inp" type="number" placeholder="36" min="0" max="60" value={form.maxVestingMonths||""} onChange={e => set("maxVestingMonths", Number(e.target.value))} /></div>
                  </div>
                  <div className="g2" style={{ marginTop: 8 }}>
                    <div className="fg0"><label className="lbl">Min TGE Unlock %</label><input className="inp" type="number" placeholder="5" min="0" max="100" value={form.minTgeUnlockPct||""} onChange={e => set("minTgeUnlockPct", Number(e.target.value))} /></div>
                    <div className="fg0"><label className="lbl">Target ROI (×)</label><input className="inp" type="number" placeholder="10" step="0.5" value={form.targetRoiX||""} onChange={e => set("targetRoiX", Number(e.target.value))} /></div>
                  </div>
                </div>

                {/* Value-add */}
                <div className="fg0">
                  <label className="lbl">Value-add I provide</label>
                  <div className="tw">
                    {VALUE_ADD.map(v => (
                      <button key={v.id}
                        className={`tp${(form.valueAdd||[]).includes(v.id) ? " on" : ""}`}
                        onClick={() => { const c = form.valueAdd||[]; set("valueAdd", c.includes(v.id) ? c.filter((x:string)=>x!==v.id) : [...c, v.id]); }}>
                        {v.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Flags */}
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  {[
                    { key: "coInvestOk",  label: "🤝 Co-invest OK" },
                    { key: "leadOnly",    label: "⚡ Lead rounds only" },
                    { key: "kycOk",       label: "🪪 KYC / AML ready" },
                    { key: "proRataReq",  label: "📋 Pro-rata required" },
                    { key: "boardSeatReq",label: "🪑 Board seat required" },
                  ].map(f => (
                    <button key={f.key} className={`tp${form[f.key] ? " on" : ""}`} onClick={() => set(f.key, !form[f.key])}>
                      {f.label}
                    </button>
                  ))}
                </div>

                <div className="fg0">
                  <label className="lbl">Additional Criteria / Notes</label>
                  <textarea className="ta" rows={2} style={fieldStyle("terms")}
                    placeholder="Must have token, known team, B2B focus, open to syndicate lead, board seat, specific ecosystem..."
                    value={form.terms||""} onChange={e => set("terms", e.target.value)} />
                </div>
              </>)}

                            {/* LF POST */}
              {type === "lf" && (<>
                <div className="g2">
                  <div className="fg0">
                    <label className="lbl">Post Type</label>
                    <div className="tw">{["looking", "offering", "ask", "announce"].map(t => <button key={t} className={`tp${form.type === t ? " on" : ""}`} onClick={() => set("type", t)}>{t.charAt(0).toUpperCase() + t.slice(1)}</button>)}</div>
                  </div>
                  <div className="fg0"><label className="lbl">Expires</label><input className="inp" type="date" value={form.expires} onChange={e => set("expires", e.target.value)} /></div>
                </div>
                <div className="fg0"><label className="lbl">Title *</label><input className="inp" style={fieldStyle("title")} placeholder="Looking for Market Maker for DEX listing" value={form.title} onChange={e => set("title", e.target.value)} autoFocus /></div>
                <div className="fg0"><label className="lbl">Body</label><textarea className="ta" style={{ minHeight: 90, ...fieldStyle("body") }} placeholder="Describe what you need or offer in detail..." value={form.body} onChange={e => set("body", e.target.value)} /></div>
                <div className="fg0">
                  <label className="lbl">Tags</label>
                  <div className="tw" style={{ marginBottom: 5 }}>{ROLES.slice(0, 15).map(t => <button key={t.id} className={`tp${form.tags.includes(t.id) ? " on" : ""}`} onClick={() => toggleTag(t.id)}>{t.label}</button>)}</div>
                  <div className="tw">{VERTICALS.slice(0, 12).map(t => <button key={t.id} className={`tp${form.tags.includes(t.id) ? " on" : ""}`} onClick={() => toggleTag(t.id)}>{t.label}</button>)}</div>
                </div>
              </>)}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="mf" style={{ justifyContent: "flex-end" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flex: 1 }}>
            {/* Sub-entity pending indicator */}
            {subEntityConfirm?.entities?.length > 0 && (
              <div style={{ fontSize: 11.5, color: "var(--acc)", display: "flex", alignItems: "center", gap: 4 }}>
                <span>✨</span>
                <span>{subEntityConfirm.entities.filter(e=>e.confirmed).length} sub-entit{subEntityConfirm.entities.filter(e=>e.confirmed).length===1?"y":"ies"} will be created</span>
              </div>
            )}
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button className="btn btn-g" onClick={onClose}>Cancel</button>
            <button className="btn btn-p"
              disabled={isBlocked || aiStatus === "parsing"}
              title={isBlocked ? "Cannot create: duplicate detected (≥90% match)" : ""}
              onClick={() => {
                if (isBlocked) return;
                // Atomic save: main entity + confirmed sub-entities
                const confirmedSubs = (subEntityConfirm?.entities || []).filter(e => e.confirmed && e.zone !== "block");
                onSave(form, confirmedSubs);
                onClose();
              }}
              style={isBlocked ? { opacity: 0.4, cursor: "not-allowed" } : aiStatus === "parsing" ? { opacity: 0.7 } : {}}>
              {isBlocked
                ? <><span style={{ fontSize: 12 }}>🚫</span> Blocked (duplicate)</>
                : aiStatus === "parsing"
                  ? <><svg style={{ animation: "spin 0.8s linear infinite" }} width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg> Analyzing…</>
                  : aiStatus === "enriched"
                    ? <><I n="plus" s={13} /> Create (enriched)</>
                    : <><I n="plus" s={13} /> Create {type.charAt(0).toUpperCase() + type.slice(1)}</>
              }
            </button>
          </div>
        </div>

        {/* Sub-entity confirmation modal — shown as overlay inside CreateModal */}
        {subEntityConfirm?.entities?.length > 0 && (
          <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.6)", borderRadius: "var(--r3)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 10 }}>
            <div style={{ background: "var(--bg1)", border: "1px solid var(--b2)", borderRadius: 12, padding: "20px 22px", maxWidth: 420, width: "100%", margin: "0 16px" }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: "var(--fg1)", marginBottom: 6 }}>✨ New entities detected</div>
              <div style={{ fontSize: 12, color: "var(--fg3)", marginBottom: 14, lineHeight: 1.5 }}>
                The AI found {subEntityConfirm.entities.length} new entit{subEntityConfirm.entities.length===1?"y":"ies"} in the text. 
                Choose which to create automatically when you save:
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 16 }}>
                {subEntityConfirm.entities.map((sub, i) => {
                  const subBlocked = sub.dedupMatch?.zone === "block";
                  return (
                    <div key={sub.id} style={{ display: "flex", alignItems: "flex-start", gap: 10, padding: "10px 12px", background: subBlocked ? "rgba(239,68,68,0.06)" : "var(--bg2)", border: `1px solid ${subBlocked ? "rgba(239,68,68,0.25)" : sub.confirmed ? "var(--acc)" : "var(--b2)"}`, borderRadius: 8, cursor: subBlocked ? "default" : "pointer" }}
                      onClick={() => !subBlocked && setSubEntityConfirm(prev => ({ entities: prev.entities.map((e,j) => j===i ? {...e, confirmed: !e.confirmed} : e) }))}>
                      <div style={{ width: 16, height: 16, marginTop: 1, borderRadius: 3, border: `2px solid ${subBlocked ? "var(--red)" : sub.confirmed ? "var(--acc)" : "var(--fg3)"}`, background: sub.confirmed && !subBlocked ? "var(--acc)" : "transparent", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
                        {sub.confirmed && !subBlocked && <span style={{ fontSize: 10, color: "#fff", lineHeight: 1 }}>✓</span>}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                          <I n={sub.type === "contact" ? "user" : sub.type === "company" ? "company" : "project"} s={12} c="var(--fg2)" />
                          <span style={{ fontSize: 13, fontWeight: 600, color: "var(--fg1)" }}>{sub.name}</span>
                          <span style={{ fontSize: 10, color: "var(--fg3)", background: "var(--bg3)", padding: "1px 5px", borderRadius: 4 }}>{sub.type}</span>
                          {subBlocked && <span style={{ fontSize: 10, color: "#f87171", fontWeight: 600 }}>🚫 duplicate</span>}
                        </div>
                        {sub.dedupMatch && !subBlocked && (
                          <div style={{ fontSize: 11, color: "#f59e0b", marginTop: 2 }}>⚠ Similar to "{sub.dedupMatch.entity?.name}" ({Math.round(sub.dedupMatch.score*100)}%)</div>
                        )}
                        {sub.data?.role && <div style={{ fontSize: 11, color: "var(--fg3)", marginTop: 1 }}>{sub.data.role}</div>}
                        {sub.data?.description && <div style={{ fontSize: 11, color: "var(--fg3)", marginTop: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{sub.data.description}</div>}
                      </div>
                    </div>
                  );
                })}
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <button className="btn btn-g" style={{ flex: 1 }} onClick={() => setSubEntityConfirm(null)}>
                  Skip all
                </button>
                <button className="btn btn-p" style={{ flex: 1 }} onClick={() => { /* just close confirmation — entities already set */ setSubEntityConfirm(null); }}>
                  Confirm selection
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}


/* ══════════ STATUS UPDATE MODAL ══════════
 * Always available to author regardless of entity age.
 * Append-only: creates a StatusUpdate record, does NOT overwrite original.
 * Shows the update as a visible badge on the entity card.
 ════════════════════════════════════════ */
function StatusUpdateModal({ entity, entityType, onClose, onSave, currentUserId }) {
  const [updateType, setUpdateType] = useState(STATUS_UPDATES[0].id);
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);

  const handleSave = () => {
    if (!note.trim()) return;
    setSaving(true);
    const su = STATUS_UPDATES.find(s => s.id === updateType);
    const update = {
      id: "su_" + Date.now(),
      entityId: entity.id,
      entityType,
      updateType,
      label: su?.label || updateType,
      note: note.trim(),
      createdBy: currentUserId,
      createdAt: new Date().toISOString(),
    };
    // Append update to entity's statusUpdates array (never replaces original)
    const updated = {
      ...entity,
      statusUpdates: [...(entity.statusUpdates || []), update],
      lastStatusUpdate: update,
    };
    setTimeout(() => { onSave(updated, update); setSaving(false); onClose(); }, 300);
  };

  const su = STATUS_UPDATES.find(s => s.id === updateType);

  return (
    <div className="ov" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: 480 }}>
        <div className="mh">
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 18 }}>📋</span>
            <div>
              <div className="mt">Status Update</div>
              <div className="ms" style={{ fontSize: 11, color: "var(--fg3)" }}>Appends to entity history · Original data preserved</div>
            </div>
          </div>
          <button className="btn btn-g btn-ic" onClick={onClose}><I n="x" s={14} /></button>
        </div>
        <div className="mb" style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {/* Info banner */}
          <div style={{ background: "rgba(99,102,241,0.08)", border: "1px solid rgba(99,102,241,0.2)", borderRadius: 8, padding: "10px 12px", display: "flex", gap: 8, alignItems: "flex-start" }}>
            <span style={{ fontSize: 14 }}>ℹ️</span>
            <div style={{ fontSize: 12, color: "var(--fg2)", lineHeight: 1.5 }}>
              Status updates are <strong>appended</strong>, not overwritten. The original entity data and its karma history remain intact. This prevents karma gaming through recreation.
            </div>
          </div>
          {/* Update type */}
          <div>
            <label className="lbl">What changed?</label>
            <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 6 }}>
              {STATUS_UPDATES.map(s => (
                <button key={s.id} onClick={() => setUpdateType(s.id)}
                  style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 12px", borderRadius: 8, border: `1px solid ${updateType === s.id ? "var(--acc)" : "var(--b2)"}`, background: updateType === s.id ? "rgba(99,102,241,0.1)" : "var(--bg2)", cursor: "pointer", textAlign: "left" }}>
                  <span style={{ fontSize: 16 }}>{s.icon}</span>
                  <span style={{ fontSize: 13, color: updateType === s.id ? "var(--acc)" : "var(--fg1)", fontWeight: updateType === s.id ? 500 : 400 }}>{s.label}</span>
                </button>
              ))}
            </div>
          </div>
          {/* Note */}
          <div>
            <label className="lbl">Details <span style={{ color: "var(--red)" }}>*</span></label>
            <textarea className="ta" style={{ minHeight: 80 }} placeholder={`Describe what changed about "${entity.name || entity.title}"…`} value={note} onChange={e => setNote(e.target.value)} autoFocus />
          </div>
          {/* Preview */}
          {note.trim() && (
            <div style={{ background: "var(--bg2)", border: "1px solid var(--b2)", borderRadius: 8, padding: "10px 12px" }}>
              <div style={{ fontSize: 11, color: "var(--fg3)", marginBottom: 6, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}>Preview</div>
              <div style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
                <span style={{ fontSize: 15 }}>{su?.icon}</span>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: "var(--fg1)" }}>{su?.label}</div>
                  <div style={{ fontSize: 12, color: "var(--fg2)", marginTop: 2 }}>{note.trim()}</div>
                </div>
              </div>
            </div>
          )}
        </div>
        <div className="mf">
          <button className="btn btn-g" onClick={onClose}>Cancel</button>
          <button className="btn btn-p" onClick={handleSave} disabled={!note.trim() || saving}>
            {saving ? "Saving…" : "Post Update"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ══════════ ENTITY CHANGELOG PANEL ══════════
 * Shows append-only history of edits and status updates.
 * Visible to all users on entity popup.
 ════════════════════════════════════════ */
/* ══════════ STATUS UPDATES BADGE ══════════
 * Shows latest status update as a dismissible banner in the entity popup.
 * Draws attention to factual changes without altering original karma.
 ════════════════════════════════════════ */
function StatusUpdatesBadge({ entity }) {
  const updates = entity?.statusUpdates;
  if (!updates?.length) return null;
  const latest = [...updates].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))[0];
  const su = STATUS_UPDATES.find(s => s.id === latest.updateType);
  const allCount = updates.length;

  return (
    <div style={{ margin: "0 0 12px 0", padding: "10px 13px", background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.28)", borderRadius: 9, display: "flex", gap: 10, alignItems: "flex-start" }}>
      <span style={{ fontSize: 16 }}>{su?.icon || "📋"}</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 3 }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: "#d97706" }}>{su?.label || latest.updateType}</span>
          <span style={{ fontSize: 10, color: "var(--fg3)" }}>
            {new Date(latest.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
            {allCount > 1 && ` · ${allCount} updates`}
          </span>
        </div>
        <div style={{ fontSize: 12, color: "var(--fg2)", lineHeight: 1.5 }}>{latest.note}</div>
      </div>
    </div>
  );
}

function EntityChangelogPanel({ entity, contacts }) {
  const all = [
    ...(entity.statusUpdates || []).map(u => ({ ...u, _kind: "status" })),
    ...(entity.editLog || []).map(e => ({ ...e, _kind: "edit" })),
  ].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  if (!all.length) return null;

  const getAuthorName = (id) => contacts?.find(c => c.id === id)?.name || "Unknown";

  const kindIcon = { status: "📋", edit: "✏️" };
  const kindLabel = { status: "Status Update", edit: "Edit" };
  const kindColor = { status: "rgba(99,102,241,0.15)", edit: "rgba(16,185,129,0.12)" };

  return (
    <div style={{ marginTop: 16 }}>
      <div style={{ fontSize: 12, fontWeight: 600, color: "var(--fg3)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 10 }}>Change History</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {all.map((entry, i) => (
          <div key={entry.id || i} style={{ background: kindColor[entry._kind] || "var(--bg2)", border: "1px solid var(--b2)", borderRadius: 8, padding: "10px 12px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
              <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                <span style={{ fontSize: 13 }}>{kindIcon[entry._kind]}</span>
                <span style={{ fontSize: 11, fontWeight: 600, color: "var(--fg2)" }}>{entry.label || kindLabel[entry._kind]}</span>
              </div>
              <span style={{ fontSize: 10, color: "var(--fg3)" }}>
                {new Date(entry.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                {" · "}{getAuthorName(entry.createdBy)}
              </span>
            </div>
            {entry.note && <div style={{ fontSize: 12, color: "var(--fg2)", lineHeight: 1.5 }}>{entry.note}</div>}
            {entry.summary && <div style={{ fontSize: 12, color: "var(--fg2)", lineHeight: 1.5 }}>{entry.summary}</div>}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ══════════ OWNERSHIP CLAIM MODAL ══════════
 * Lets a real person claim ownership of an entity created by someone else.
 * Evidence: domain match, Telegram handle match, Twitter/X handle match.
 * If claimant provides 2+ evidence → auto-approved after 72h if no contest.
 * If contested → Community Court.
 * On approval → createdBy changes, original creator stays in contributors[].
 ════════════════════════════════════════ */
function OwnershipClaimModal({ entity, entityType, onClose, onSubmitClaim, currentUserId, existingClaim }) {
  const [telegram, setTelegram] = useState("");
  const [twitter, setTwitter] = useState("");
  const [domain, setDomain] = useState("");
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);

  const entityTelegram = entity.telegram || "";
  const entityTwitter = entity.twitter || "";
  const entityDomain = (entity.website || "").replace(/^https?:\/\//, "").replace(/\/$/, "").toLowerCase();

  const telegramMatch = telegram.trim() && telegram.replace("@", "").toLowerCase() === entityTelegram.replace("@", "").toLowerCase();
  const twitterMatch = twitter.trim() && twitter.replace("@", "").toLowerCase() === entityTwitter.replace("@", "").toLowerCase();
  const domainMatch = domain.trim() && domain.replace(/^https?:\/\//, "").replace(/\/$/, "").toLowerCase() === entityDomain;

  const evidenceCount = [telegramMatch, twitterMatch, domainMatch].filter(Boolean).length;
  const autoApproveEligible = evidenceCount >= 2;

  const handleSubmit = () => {
    if (!reason.trim()) return;
    setSaving(true);
    const claim = {
      id: "cl_" + Date.now(),
      entityId: entity.id,
      entityType,
      entityName: entity.name || entity.title,
      claimantId: currentUserId,
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 72 * 60 * 60 * 1000).toISOString(), // 72h to contest
      reason: reason.trim(),
      evidence: {
        telegram: telegramMatch ? telegram.replace("@", "") : null,
        twitter: twitterMatch ? twitter.replace("@", "") : null,
        domain: domainMatch ? domain : null,
      },
      evidenceCount,
      autoApproveEligible,
      status: "pending",
      contestedBy: null,
    };
    setTimeout(() => { onSubmitClaim(claim); setSaving(false); onClose(); }, 400);
  };

  if (existingClaim) {
    const hoursLeft = Math.max(0, Math.round((new Date(existingClaim.expiresAt) - Date.now()) / 3600000));
    return (
      <div className="ov" onClick={e => e.target === e.currentTarget && onClose()}>
        <div className="modal" style={{ maxWidth: 460 }}>
          <div className="mh">
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 18 }}>🏷️</span>
              <div className="mt">Claim Pending</div>
            </div>
            <button className="btn btn-g btn-ic" onClick={onClose}><I n="x" s={14} /></button>
          </div>
          <div className="mb">
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div style={{ background: "rgba(245,158,11,0.1)", border: "1px solid rgba(245,158,11,0.3)", borderRadius: 8, padding: "12px 14px" }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: "#f59e0b", marginBottom: 4 }}>⏳ Review in progress</div>
                <div style={{ fontSize: 12, color: "var(--fg2)", lineHeight: 1.6 }}>
                  Your claim is pending. {hoursLeft > 0 ? `${hoursLeft}h left for the current owner to contest.` : "Auto-approval window has passed, awaiting review."}<br />
                  {existingClaim.autoApproveEligible ? "You provided sufficient evidence — will auto-approve if uncontested." : "Going to Community Court for review."}
                </div>
              </div>
              <div style={{ fontSize: 12, color: "var(--fg3)" }}>Evidence submitted: {[existingClaim.evidence.telegram && "Telegram", existingClaim.evidence.twitter && "Twitter/X", existingClaim.evidence.domain && "Domain"].filter(Boolean).join(", ") || "None"}</div>
            </div>
          </div>
          <div className="mf"><button className="btn btn-g" onClick={onClose}>Close</button></div>
        </div>
      </div>
    );
  }

  return (
    <div className="ov" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: 500 }}>
        <div className="mh">
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 18 }}>🏷️</span>
            <div>
              <div className="mt">Claim Ownership</div>
              <div className="ms" style={{ fontSize: 11, color: "var(--fg3)" }}>This entity belongs to you? Prove it.</div>
            </div>
          </div>
          <button className="btn btn-g btn-ic" onClick={onClose}><I n="x" s={14} /></button>
        </div>
        <div className="mb" style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {/* Explanation */}
          <div style={{ background: "rgba(99,102,241,0.08)", border: "1px solid rgba(99,102,241,0.2)", borderRadius: 8, padding: "11px 13px", fontSize: 12, color: "var(--fg2)", lineHeight: 1.6 }}>
            <strong>How it works:</strong><br />
            1. Provide matching evidence below (Telegram, Twitter, or domain)<br />
            2. Current creator has <strong>72 hours</strong> to contest<br />
            3. With 2+ evidence matches → auto-approved if uncontested<br />
            4. With less evidence or contested → goes to Community Court<br />
            5. On approval: you become owner, original creator stays in contributors
          </div>

          {/* Evidence fields */}
          <div>
            <label className="lbl" style={{ marginBottom: 8, display: "block" }}>Provide Evidence <span style={{ color: "var(--fg3)", fontWeight: 400 }}>(match at least 2 for auto-approval)</span></label>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {/* Telegram */}
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <div style={{ flex: 1, position: "relative" }}>
                  <input className="inp" placeholder="Your Telegram @handle" value={telegram} onChange={e => setTelegram(e.target.value)} style={{ paddingRight: 32 }} />
                  {telegram.trim() && (
                    <span style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", fontSize: 14 }}>{telegramMatch ? "✅" : "❌"}</span>
                  )}
                </div>
                <div style={{ fontSize: 11, color: "var(--fg3)", whiteSpace: "nowrap" }}>
                  Entity: {entityTelegram ? `@${entityTelegram}` : <span style={{ color: "var(--fg4)" }}>not set</span>}
                </div>
              </div>
              {/* Twitter */}
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <div style={{ flex: 1, position: "relative" }}>
                  <input className="inp" placeholder="Your Twitter/X @handle" value={twitter} onChange={e => setTwitter(e.target.value)} style={{ paddingRight: 32 }} />
                  {twitter.trim() && (
                    <span style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", fontSize: 14 }}>{twitterMatch ? "✅" : "❌"}</span>
                  )}
                </div>
                <div style={{ fontSize: 11, color: "var(--fg3)", whiteSpace: "nowrap" }}>
                  Entity: {entityTwitter ? `@${entityTwitter}` : <span style={{ color: "var(--fg4)" }}>not set</span>}
                </div>
              </div>
              {/* Domain */}
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <div style={{ flex: 1, position: "relative" }}>
                  <input className="inp" placeholder="Your company domain (e.g. acme.xyz)" value={domain} onChange={e => setDomain(e.target.value)} style={{ paddingRight: 32 }} />
                  {domain.trim() && (
                    <span style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", fontSize: 14 }}>{domainMatch ? "✅" : "❌"}</span>
                  )}
                </div>
                <div style={{ fontSize: 11, color: "var(--fg3)", whiteSpace: "nowrap" }}>
                  Entity: {entityDomain || <span style={{ color: "var(--fg4)" }}>not set</span>}
                </div>
              </div>
            </div>
          </div>

          {/* Evidence score */}
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <div style={{ flex: 1, height: 6, background: "var(--b2)", borderRadius: 3, overflow: "hidden" }}>
              <div style={{ height: "100%", width: `${(evidenceCount / 3) * 100}%`, background: evidenceCount >= 2 ? "var(--gr)" : evidenceCount === 1 ? "#f59e0b" : "var(--b2)", borderRadius: 3, transition: "width 0.3s, background 0.3s" }} />
            </div>
            <span style={{ fontSize: 11, fontWeight: 600, color: evidenceCount >= 2 ? "var(--gr)" : evidenceCount === 1 ? "#f59e0b" : "var(--fg4)", whiteSpace: "nowrap" }}>
              {evidenceCount}/3 · {autoApproveEligible ? "Auto-approve eligible ✅" : "Will go to Community Court"}
            </span>
          </div>

          {/* Reason */}
          <div>
            <label className="lbl">Your statement <span style={{ color: "var(--red)" }}>*</span></label>
            <textarea className="ta" style={{ minHeight: 70 }} placeholder="Explain why this entity belongs to you and how it ended up created by someone else (e.g. AI parser auto-created it from a post)…" value={reason} onChange={e => setReason(e.target.value)} />
          </div>
        </div>
        <div className="mf">
          <button className="btn btn-g" onClick={onClose}>Cancel</button>
          <button className="btn btn-p" onClick={handleSubmit} disabled={!reason.trim() || saving}>
            {saving ? "Submitting…" : "Submit Claim"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ══════════ EDIT MODAL ══════════ */
function EditModal({ type, entity, onClose, onSave, contacts, companies, projects, authorId }) {
  const [form, setForm] = useState({ ...entity });
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));
  const toggleTag = (id) => setForm(p => ({ ...p, tags: p.tags?.includes(id) ? p.tags.filter(t => t !== id) : [...(p.tags || []), id] }));
  const titles = { contact: "Edit Contact", company: "Edit Company", project: "Edit Project", deal: "Edit Deal", lf: "Edit Post" };
  const icons = { contact: "contacts", company: "company", project: "project", deal: "deals", lf: "lf" };

  const tier = getEditTier(entity, authorId);
  const timeLeft = formatTimeLeft(entity);

  // Tier banners
  const tierBanner = {
    silent: { bg: "rgba(16,185,129,0.08)", border: "rgba(16,185,129,0.25)", icon: "🔇", text: `Silent edit — no changelog entry. ${timeLeft ? `${timeLeft} in grace window.` : ""}` },
    free: { bg: "rgba(99,102,241,0.08)", border: "rgba(99,102,241,0.2)", icon: "✏️", text: `Free edit window. ${timeLeft ? `${timeLeft} remaining.` : ""} Edit will be logged in change history.` },
    status: { bg: "rgba(245,158,11,0.08)", border: "rgba(245,158,11,0.25)", icon: "📋", text: "Edit window expired. Use Status Update to append factual changes. Karma history is preserved." },
    none: { bg: "rgba(239,68,68,0.08)", border: "rgba(239,68,68,0.2)", icon: "🔒", text: "You are not the creator of this entity. You can add a Status Update if you have new info." },
  };
  const banner = tierBanner[tier];

  const handleSave = () => {
    // Build changelog entry for "free" tier
    const logEntry = tier === "free" ? {
      id: "el_" + Date.now(),
      entityId: entity.id,
      entityType: type,
      _kind: "edit",
      label: "Edit",
      summary: "Content updated by author",
      createdBy: authorId,
      createdAt: new Date().toISOString(),
    } : null;
    const updated = {
      ...form,
      editLog: logEntry ? [...(entity.editLog || []), logEntry] : (entity.editLog || []),
    };
    onSave(updated);
  };

  // If status/none tier, show limited view with redirect to StatusUpdate
  if (tier === "status" || tier === "none") {
    return (
      <div className="ov" onClick={e => e.target === e.currentTarget && onClose()}>
        <div className="modal" style={{ maxWidth: 440 }}>
          <div className="mh">
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <I n={icons[type] || "edit"} s={16} c="var(--fg2)" />
              <div className="mt">{titles[type] || "Edit"}</div>
            </div>
            <button className="btn btn-g btn-ic" onClick={onClose}><I n="x" s={14} /></button>
          </div>
          <div className="mb">
            <div style={{ background: banner.bg, border: `1px solid ${banner.border}`, borderRadius: 10, padding: "14px 16px", display: "flex", gap: 10, alignItems: "flex-start" }}>
              <span style={{ fontSize: 20 }}>{banner.icon}</span>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: "var(--fg1)", marginBottom: 4 }}>
                  {tier === "status" ? "Edit window closed" : "Not your entity"}
                </div>
                <div style={{ fontSize: 12, color: "var(--fg2)", lineHeight: 1.6 }}>{banner.text}</div>
              </div>
            </div>
            <div style={{ marginTop: 16, padding: "12px 14px", background: "var(--bg2)", border: "1px solid var(--b2)", borderRadius: 8 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: "var(--fg2)", marginBottom: 6 }}>Why can't I edit freely?</div>
              <div style={{ fontSize: 12, color: "var(--fg3)", lineHeight: 1.6 }}>
                To prevent karma gaming through recreation, all entities have a 24h free edit window. After that, use <strong>Status Update</strong> to append factual changes — the original entity and its karma score remain intact forever.<br /><br />
                If this entity truly belongs to you, use <strong>Claim Ownership</strong> to transfer it.
              </div>
            </div>
          </div>
          <div className="mf">
            <button className="btn btn-g" onClick={onClose}>Close</button>
            {tier === "status" && <button className="btn btn-p" onClick={onClose}>Use Status Update ↑</button>}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="ov" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal modal-lg">
        <div className="mh">
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <I n={icons[type] || "edit"} s={16} c="var(--fg2)" />
            <div>
              <div className="mt">{titles[type] || "Edit"}</div>
              <div className="ms" style={{ fontSize: 11, color: "var(--fg3)" }}>
                {tier === "silent" ? "🔇 Grace period — no changelog" : "✏️ Edit logged in change history"}
                {timeLeft && ` · ${timeLeft}`}
              </div>
            </div>
          </div>
          <button className="btn btn-g btn-ic" onClick={onClose}><I n="x" s={14} /></button>
        </div>
        {/* Tier banner */}
        <div style={{ margin: "0 20px 0", padding: "8px 12px", background: banner.bg, border: `1px solid ${banner.border}`, borderRadius: 7, fontSize: 11.5, color: "var(--fg2)", display: "flex", gap: 7, alignItems: "center" }}>
          <span>{banner.icon}</span><span>{banner.text}</span>
        </div>
        <div className="mb">
          {/* CONTACT */}
          {type === "contact" && (<>
            <div className="g2">
              <div className="fg0"><label className="lbl">Full Name</label><input className="inp" value={form.name || ""} onChange={e => set("name", e.target.value)} autoFocus /></div>
              <div className="fg0"><label className="lbl">Company</label><input className="inp" value={form.company || ""} onChange={e => set("company", e.target.value)} /></div>
            </div>
            <div className="g2">
              <div className="fg0"><label className="lbl">Role</label><select className="sel" value={form.role || "founder"} onChange={e => set("role", e.target.value)}>{ROLES.map(r => <option key={r.id} value={r.id}>{r.label}</option>)}</select></div>
              <div className="fg0"><label className="lbl">Status</label><select className="sel" value={form.status || "active"} onChange={e => set("status", e.target.value)}><option value="active">Active</option><option value="partner">Partner</option><option value="inactive">Inactive</option></select></div>
            </div>
            <div className="g3">
              <div className="fg0"><label className="lbl">Telegram</label><input className="inp" placeholder="handle" value={form.telegram || ""} onChange={e => set("telegram", e.target.value.replace("@", ""))} /></div>
              <div className="fg0"><label className="lbl">Twitter / X</label><input className="inp" placeholder="handle" value={form.twitter || ""} onChange={e => set("twitter", e.target.value.replace("@", ""))} /></div>
              <div className="fg0"><label className="lbl">LinkedIn</label><input className="inp" placeholder="username" value={form.linkedin || ""} onChange={e => set("linkedin", e.target.value)} /></div>
            </div>
            <div className="g2">
              <div className="fg0"><label className="lbl">Email</label><input className="inp" type="email" value={form.email || ""} onChange={e => set("email", e.target.value)} /></div>
              <div className="fg0"><label className="lbl">Website</label><input className="inp" value={form.website || ""} onChange={e => set("website", e.target.value)} /></div>
            </div>
            <div className="fg0"><label className="lbl">Notes</label><textarea className="ta" value={form.notes || ""} onChange={e => set("notes", e.target.value)} /></div>
            <div className="fg0">
              <label className="lbl">Tags</label>
              <div style={{ marginBottom: 5 }}><span style={{ fontSize: 11, color: "var(--fg3)", fontWeight: 500 }}>Verticals</span></div>
              <div className="tw">{VERTICALS.map(t => <button key={t.id} className={`tp${(form.tags || []).includes(t.id) ? " on" : ""}`} onClick={() => toggleTag(t.id)}>{t.label}</button>)}</div>
              <div style={{ marginTop: 5, marginBottom: 4 }}><span style={{ fontSize: 11, color: "var(--fg3)", fontWeight: 500 }}>Geo</span></div>
              <div className="tw">{GEOS.map(t => <button key={t.id} className={`tp${(form.tags || []).includes(t.id) ? " on" : ""}`} onClick={() => toggleTag(t.id)}>{t.label}</button>)}</div>
            </div>
          </>)}
          {/* COMPANY */}
          {type === "company" && (<>
            <div className="g2">
              <div className="fg0"><label className="lbl">Company Name</label><input className="inp" value={form.name || ""} onChange={e => set("name", e.target.value)} autoFocus /></div>
              <div className="fg0"><label className="lbl">Website</label><input className="inp" value={form.website || ""} onChange={e => set("website", e.target.value)} /></div>
            </div>
            <div className="fg0"><label className="lbl">Stage</label><select className="sel" value={form.stage || "Seed"} onChange={e => set("stage", e.target.value)}>{COMPANY_STAGES.map(s => <option key={s} value={s}>{s}</option>)}</select></div>
            <div className="fg0"><label className="lbl">Description</label><textarea className="ta" value={form.description || ""} onChange={e => set("description", e.target.value)} /></div>
            <div className="fg0">
              <label className="lbl">Tags</label>
              <div className="tw" style={{ marginBottom: 5 }}>{VERTICALS.map(t => <button key={t.id} className={`tp${(form.tags || []).includes(t.id) ? " on" : ""}`} onClick={() => toggleTag(t.id)}>{t.label}</button>)}</div>
              <div className="tw">{GEOS.map(t => <button key={t.id} className={`tp${(form.tags || []).includes(t.id) ? " on" : ""}`} onClick={() => toggleTag(t.id)}>{t.label}</button>)}</div>
            </div>
          </>)}
          {/* PROJECT */}
          {type === "project" && (<>
            <div className="g2">
              <div className="fg0"><label className="lbl">Project Name</label><input className="inp" value={form.name || ""} onChange={e => set("name", e.target.value)} autoFocus /></div>
              <div className="fg0"><label className="lbl">Website</label><input className="inp" value={form.website || ""} onChange={e => set("website", e.target.value)} /></div>
            </div>
            <div className="fg0"><label className="lbl">Stage</label><select className="sel" value={form.stage || "Development"} onChange={e => set("stage", e.target.value)}>{PROJECT_STAGES.map(s => <option key={s} value={s}>{s}</option>)}</select></div>
            <div className="fg0"><label className="lbl">Description</label><textarea className="ta" value={form.description || ""} onChange={e => set("description", e.target.value)} /></div>
            <div className="fg0">
              <label className="lbl">Tags</label>
              <div className="tw" style={{ marginBottom: 5 }}>{VERTICALS.map(t => <button key={t.id} className={`tp${(form.tags || []).includes(t.id) ? " on" : ""}`} onClick={() => toggleTag(t.id)}>{t.label}</button>)}</div>
              <div className="tw">{GEOS.map(t => <button key={t.id} className={`tp${(form.tags || []).includes(t.id) ? " on" : ""}`} onClick={() => toggleTag(t.id)}>{t.label}</button>)}</div>
            </div>
          </>)}
          {/* DEAL */}
          {type === "deal" && (<>
            <div className="fg0"><label className="lbl">Deal Title</label><input className="inp" value={form.title || ""} onChange={e => set("title", e.target.value)} autoFocus /></div>
            <div className="g2">
              <div className="fg0"><label className="lbl">Round</label><select className="sel" value={form.round || "seed"} onChange={e => set("round", e.target.value)}>{DEAL_ROUNDS.map(r => <option key={r.id} value={r.id}>{r.label}</option>)}</select></div>
              <div className="fg0"><label className="lbl">Status</label><select className="sel" value={form.status || "active"} onChange={e => set("status", e.target.value)}>{DEAL_STATUSES.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}</select></div>
            </div>
            <div className="g3">
              <div className="fg0"><label className="lbl">Amount (USD)</label><input className="inp" type="number" value={form.amount || ""} onChange={e => set("amount", Number(e.target.value))} /></div>
              <div className="fg0"><label className="lbl">Currency</label><input className="inp" value={form.currency || "USD"} onChange={e => set("currency", e.target.value)} /></div>
              <div className="fg0"><label className="lbl">Token</label><input className="inp" value={form.token || ""} onChange={e => set("token", e.target.value)} /></div>
            </div>
            <div className="fg0"><label className="lbl">Project Name</label><input className="inp" value={form.projectName || ""} onChange={e => set("projectName", e.target.value)} /></div>
            <div className="fg0"><label className="lbl">Description</label><textarea className="ta" value={form.description || ""} onChange={e => set("description", e.target.value)} /></div>
            <div className="fg0"><label className="lbl">Terms</label><textarea className="ta" value={form.terms || ""} onChange={e => set("terms", e.target.value)} /></div>
          </>)}
          {/* LF */}
          {type === "lf" && (<>
            <div className="g2">
              <div className="fg0">
                <label className="lbl">Post Type</label>
                <div className="tw">{["looking","offering","ask","announce"].map(t => <button key={t} className={`tp${form.type === t ? " on" : ""}`} onClick={() => set("type", t)}>{t.charAt(0).toUpperCase()+t.slice(1)}</button>)}</div>
              </div>
              <div className="fg0"><label className="lbl">Expires</label><input className="inp" type="date" value={form.expires || ""} onChange={e => set("expires", e.target.value)} /></div>
            </div>
            <div className="fg0"><label className="lbl">Title</label><input className="inp" value={form.title || ""} onChange={e => set("title", e.target.value)} autoFocus /></div>
            <div className="fg0"><label className="lbl">Body</label><textarea className="ta" style={{ minHeight: 90 }} value={form.body || ""} onChange={e => set("body", e.target.value)} /></div>
            <div className="fg0">
              <label className="lbl">Tags</label>
              <div className="tw" style={{ marginBottom: 5 }}>{ROLES.slice(0,15).map(t => <button key={t.id} className={`tp${(form.tags||[]).includes(t.id)?" on":""}`} onClick={() => toggleTag(t.id)}>{t.label}</button>)}</div>
              <div className="tw">{VERTICALS.slice(0,12).map(t => <button key={t.id} className={`tp${(form.tags||[]).includes(t.id)?" on":""}`} onClick={() => toggleTag(t.id)}>{t.label}</button>)}</div>
            </div>
          </>)}
        </div>
        <div className="mf">
          <button className="btn btn-g" onClick={onClose}>Cancel</button>
          <button className="btn btn-p" onClick={() => { handleSave(); onClose(); }}>
            <I n="check" s={13} /> {tier === "silent" ? "Save (Silent)" : "Save & Log"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ══════════ PROFILE PAGE ══════════ */
function ProfilePage({ contact, contacts, companies, projects, deals, lf, allVotes, onVote, currentUserId, currentUserKarma, onOpenEntity, voteWeight: myVoteWeight }) {
  if (!contact) return <div className="empty"><div className="empty-t">No profile</div></div>;

  const myCompanies = companies.filter(co => co.createdBy === currentUserId || co.memberIds?.some(m => m.contactId === currentUserId));
  const myProjects = projects.filter(p => p.createdBy === currentUserId || p.memberIds?.some(m => m.contactId === currentUserId));
  const myDeals = deals.filter(d => d.createdBy === currentUserId || d.contactIds?.includes(currentUserId));
  const myLF = lf.filter(p => p.createdBy === currentUserId);
  const myVotes = allVotes.filter(v => v.voterId === currentUserId);
  const up = contact.karmaBreakdown?.up || 0;
  const dn = contact.karmaBreakdown?.down || 0;

  const Section = ({ title, children, empty }) => (
    <div className="popup-section">
      <div className="popup-section-title">{title}</div>
      {children || <span style={{ fontSize: 12, color: "var(--fg3)" }}>{empty || "Nothing yet"}</span>}
    </div>
  );

  return (
    <div style={{ maxWidth: 860, margin: "0 auto" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 24, padding: "18px 20px", background: "var(--bg)", border: "1px solid var(--border)", borderRadius: "var(--radius)" }}>
        <div className="av" style={{ width: 56, height: 56, fontSize: 18, flexShrink: 0 }}>{ini(contact.name)}</div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 20, fontWeight: 700, letterSpacing: "-.3px", display: "flex", alignItems: "center", gap: 8 }}>
            {contact.name}
            <KarmaBadge karma={currentUserKarma} />
          </div>
          <div style={{ fontSize: 13, color: "var(--fg2)", marginTop: 2 }}>
            {contact.company && <span>{contact.company}</span>}
            {contact.role && <><span style={{ color: "var(--fg3)" }}> · </span><Tag id={contact.role} /></>}
          </div>
        </div>
        {/* Karma stat */}
        <div style={{ textAlign: "center", padding: "10px 16px", background: "var(--bg3)", border: "1px solid var(--border)", borderRadius: "var(--r2)", minWidth: 100 }}>
          <div style={{ fontSize: 11, color: "var(--fg3)", fontWeight: 600, letterSpacing: ".4px", textTransform: "uppercase", marginBottom: 4 }}>Karma</div>
          <div style={{ fontSize: 22, fontWeight: 700, fontFamily: "var(--mono)", color: currentUserKarma >= 0 ? "var(--tf-g)" : "var(--danger-fg)" }}>
            {currentUserKarma >= 0 ? "+" : ""}{currentUserKarma}
          </div>
          <div style={{ fontSize: 10.5, color: "var(--fg3)", marginTop: 3 }}>{up}↑ {dn}↓</div>
        </div>
        {/* Vote weight */}
        <div style={{ textAlign: "center", padding: "10px 16px", background: "var(--bg3)", border: "1px solid var(--border)", borderRadius: "var(--r2)", minWidth: 100 }}>
          <div style={{ fontSize: 11, color: "var(--fg3)", fontWeight: 600, letterSpacing: ".4px", textTransform: "uppercase", marginBottom: 4 }}>Vote Weight</div>
          <div style={{ fontSize: 22, fontWeight: 700, fontFamily: "var(--mono)", color: "var(--fg)" }}>{myVoteWeight.toFixed(2)}x</div>
          <div style={{ fontSize: 10.5, color: "var(--fg3)", marginTop: 3 }}>W3-Trust™</div>
        </div>
        {/* Wilson bar */}
        <div style={{ textAlign: "center", padding: "10px 16px", background: "var(--bg3)", border: "1px solid var(--border)", borderRadius: "var(--r2)", minWidth: 100 }}>
          <div style={{ fontSize: 11, color: "var(--fg3)", fontWeight: 600, letterSpacing: ".4px", textTransform: "uppercase", marginBottom: 6 }}>Trust Score</div>
          <div className="wscore-bar" style={{ width: "100%", height: 5 }}><div className="wscore-fill" style={{ width: `${wilsonScore(up, up + dn) * 100}%` }} /></div>
          <div style={{ fontSize: 10.5, color: "var(--fg3)", marginTop: 4 }}>{Math.round(wilsonScore(up, up + dn) * 100)}% confidence</div>
        </div>
      </div>

      <div className="popup-grid">
        <div>
          {/* Contact info */}
          <Section title="Contact Info">
            {contact.telegram && <a className="clink" href={`https://t.me/${contact.telegram}`} target="_blank" rel="noreferrer"><I n="tg" s={12} /> @{contact.telegram}</a>}
            {contact.twitter && <a className="clink" href={`https://x.com/${contact.twitter}`} target="_blank" rel="noreferrer"><I n="tw" s={12} /> @{contact.twitter}</a>}
            {contact.email && <a className="clink" href={`mailto:${contact.email}`}><I n="mail" s={12} /> {contact.email}</a>}
            {contact.website && <a className="clink" href={`https://${contact.website}`} target="_blank" rel="noreferrer"><I n="globe" s={12} /> {contact.website}</a>}
            {!contact.telegram && !contact.twitter && !contact.email && !contact.website && <span style={{ fontSize: 12, color: "var(--fg3)" }}>No channels added</span>}
          </Section>

          {/* My Companies */}
          <Section title={`My Companies (${myCompanies.length})`} empty="Not linked to any company yet">
            {myCompanies.map(co => (
              <div key={co.id} className="linked-row" onClick={() => onOpenEntity("company", co.id)} style={{ cursor: "pointer" }}>
                <div className="av av-sq" style={{ width: 26, height: 26 }}><I n="company" s={11} c="var(--fg3)" /></div>
                <span style={{ fontSize: 13, fontWeight: 500 }}>{co.name}</span>
                <span style={{ fontSize: 11, color: "var(--fg3)", marginLeft: "auto" }}>{co.stage}</span>
              </div>
            ))}
          </Section>

          {/* My Projects */}
          <Section title={`My Projects (${myProjects.length})`} empty="Not linked to any project yet">
            {myProjects.map(p => (
              <div key={p.id} className="linked-row" onClick={() => onOpenEntity("project", p.id)} style={{ cursor: "pointer" }}>
                <div className="av av-sq" style={{ width: 26, height: 26 }}><I n="project" s={11} c="var(--fg3)" /></div>
                <span style={{ fontSize: 13, fontWeight: 500 }}>{p.name}</span>
                <span style={{ fontSize: 11, color: "var(--fg3)", marginLeft: "auto" }}>{p.stage}</span>
              </div>
            ))}
          </Section>
        </div>

        <div>
          {/* My Deals */}
          <Section title={`My Deals (${myDeals.length})`} empty="No deals yet">
            {myDeals.map(d => {
              const st = DEAL_STATUSES.find(s => s.id === d.status) || DEAL_STATUSES[0];
              return (
                <div key={d.id} className="linked-row" onClick={() => onOpenEntity("deal", d.id)} style={{ cursor: "pointer" }}>
                  <div style={{ width: 3, height: 28, background: "oklch(0.55 0.14 240)", borderRadius: 2, flexShrink: 0 }} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 12.5, fontWeight: 500 }}>{d.title}</div>
                    <span className={`sbadge s-${st.id === "open" ? "active" : "lead"}`} style={{ fontSize: 10 }}>{st.label}</span>
                  </div>
                </div>
              );
            })}
          </Section>

          {/* My LF Posts */}
          <Section title={`My Posts (${myLF.length})`} empty="No posts yet">
            {myLF.map(p => (
              <div key={p.id} className="linked-row" onClick={() => onOpenEntity("lf", p.id)} style={{ cursor: "pointer" }}>
                <span className={`sbadge lf-${p.type}`} style={{ fontSize: 10, flexShrink: 0 }}>{p.type}</span>
                <span style={{ fontSize: 12.5, fontWeight: 500 }}>{p.title}</span>
              </div>
            ))}
          </Section>

          {/* Voting activity */}
          <Section title="Voting Activity">
            <div style={{ display: "flex", gap: 12 }}>
              <div style={{ textAlign: "center" }}>
                <div style={{ fontSize: 18, fontWeight: 700, fontFamily: "var(--mono)", color: "var(--tf-g)" }}>{myVotes.filter(v => v.dir === "up").length}</div>
                <div style={{ fontSize: 11, color: "var(--fg3)" }}>Upvotes given</div>
              </div>
              <div style={{ textAlign: "center" }}>
                <div style={{ fontSize: 18, fontWeight: 700, fontFamily: "var(--mono)", color: "var(--danger-fg)" }}>{myVotes.filter(v => v.dir === "down").length}</div>
                <div style={{ fontSize: 11, color: "var(--fg3)" }}>Downvotes given</div>
              </div>
              <div style={{ textAlign: "center" }}>
                <div style={{ fontSize: 18, fontWeight: 700, fontFamily: "var(--mono)", color: "var(--fg)" }}>{myVotes.length}</div>
                <div style={{ fontSize: 11, color: "var(--fg3)" }}>Total votes</div>
              </div>
            </div>
          </Section>

          {contact.tags?.length > 0 && (
            <Section title="Tags">
              <div style={{ display: "flex", flexWrap: "wrap", gap: 3 }}>{contact.tags.map(t => <Tag key={t} id={t} />)}</div>
            </Section>
          )}
        </div>
      </div>
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
/* ══════════ ATOMIC SUB-ENTITY SAVE ══════════
 * Called after main entity save to atomically create sub-entities
 * that were confirmed in the sub-entity confirmation step.
 * Each sub-entity is assigned a real ID, createdAt, and authorId.
 * Dedup-blocked subs are skipped (zone==="block" already filtered in UI).
 ════════════════════════════════════════════ */
function atomicSaveSubs(subs, authorId, setContacts, setCompanies, setProjects) {
  if (!subs?.length) return;
  const newContacts = [];
  const newCompanies = [];
  const newProjects = [];
  const base = { karma: 0, karmaBreakdown: { up: 0, down: 0 }, reports: [], trustStatus: "ok", views: 0, createdBy: authorId, createdAt: new Date().toISOString().slice(0, 10) };
  subs.forEach(sub => {
    if (!sub?.data?.name) return;
    const id = "auto_" + Date.now() + "_" + Math.random().toString(36).slice(2, 6);
    if (sub.type === "contact") {
      newContacts.push({ ...base, id, name: sub.data.name, company: sub.data.company || "", role: sub.data.role || "founder", status: "active", telegram: sub.data.telegram || "", twitter: sub.data.twitter || "", linkedin: "", email: "", tags: sub.data.tags || [], score: 70, notes: sub.data.notes || "(Auto-created from deal parser)", companyIds: [], projectIds: [] });
    } else if (sub.type === "company") {
      newCompanies.push({ ...base, id, name: sub.data.name, website: sub.data.website || "", stage: sub.data.stage || "Seed", description: sub.data.description || "", tags: sub.data.tags || [], memberIds: [], partnerIds: [] });
    } else if (sub.type === "project") {
      newProjects.push({ ...base, id, name: sub.data.name, website: sub.data.website || "", stage: sub.data.stage || "Development", description: sub.data.description || "", tags: sub.data.tags || [], memberIds: [], partnerCompanyIds: [] });
    }
  });
  if (newContacts.length) setContacts(p => [...newContacts, ...p]);
  if (newCompanies.length) setCompanies(p => [...newCompanies, ...p]);
  if (newProjects.length) setProjects(p => [...newProjects, ...p]);
}

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
  const [claims, setClaims0] = useState(() => dbLoad(DB.claims) || SEED_CLAIMS);

  const [authorId] = useState(ME_ID);
  const currentUser = contacts.find(c => c.id === authorId);
  const currentUserKarma = currentUser?.karma || 0;

  const [popupStack, setPopupStack] = useState([]);
  const [editTarget, setEditTarget] = useState(null); // { type, entity }
  const [statusUpdateTarget, setStatusUpdateTarget] = useState(null); // { type, entity }
  const [claimTarget, setClaimTarget] = useState(null); // { type, entity }
  const openEntity = (type, id) => setPopupStack(p => [...p, { type, id }]);

  const handleEdit = useCallback((entity, entityType) => {
    setEditTarget({ type: entityType, entity });
  }, []);

  // Status Update: always append, never overwrite karma or original data
  const handleStatusUpdate = useCallback((entity, entityType) => {
    setStatusUpdateTarget({ type: entityType, entity });
  }, []);

  const handleSaveStatusUpdate = useCallback((updatedEntity, updateRecord) => {
    const { type } = statusUpdateTarget;
    const updater = arr => arr.map(e => e.id === updatedEntity.id ? updatedEntity : e);
    if (type === "contact") setContacts(updater);
    else if (type === "company") setCompanies(updater);
    else if (type === "project") setProjects(updater);
    else if (type === "deal") setDeals(updater);
    else if (type === "lf") setLf(updater);
    setStatusUpdateTarget(null);
  }, [statusUpdateTarget]);

  // Ownership Claim
  const handleClaimOwnership = useCallback((entity, entityType) => {
    setClaimTarget({ type: entityType, entity });
  }, []);

  const handleSubmitClaim = useCallback((claim) => {
    const newClaims = [...claims, claim];
    setClaims0(newClaims);
    try { localStorage.setItem(DB.claims, JSON.stringify(newClaims)); } catch (e) {}

    // If auto-approve eligible AND current owner hasn't been set yet, schedule transfer
    // (In production this would be server-side. Here we simulate 72h as instant for demo
    //  and require manual approval via Community page)
    if (claim.autoApproveEligible) {
      // Open a court case for visibility even for auto-approve
      const courtCase = {
        id: "ct_claim_" + Date.now(),
        entityId: claim.entityId,
        entityType: claim.entityType,
        entityName: claim.entityName,
        reason: `Ownership Claim by user. Evidence: ${Object.entries(claim.evidence).filter(([,v])=>v).map(([k])=>k).join(", ")}. Auto-approve eligible (${claim.evidenceCount}/3 matches).`,
        openedAt: new Date().toISOString(),
        endsAt: claim.expiresAt,
        votesFor: 0, votesAgainst: 0,
        status: "ownership_claim",
        claimId: claim.id,
        verdict: null,
      };
      setCourts(p => [...p, courtCase]);
    } else {
      // Not enough evidence → standard court case
      const courtCase = {
        id: "ct_claim_" + Date.now(),
        entityId: claim.entityId,
        entityType: claim.entityType,
        entityName: claim.entityName,
        reason: `Ownership Claim (insufficient auto-approve evidence: ${claim.evidenceCount}/3). Community vote required.\n\nClaimant statement: "${claim.reason}"`,
        openedAt: new Date().toISOString(),
        endsAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        votesFor: 0, votesAgainst: 0,
        status: "ownership_claim",
        claimId: claim.id,
        verdict: null,
      };
      setCourts(p => [...p, courtCase]);
    }
    setClaimTarget(null);
  }, [claims]);

  // Soft delete — only within 24h, karma preserved
  const handleSoftDelete = useCallback((entity, entityType) => {
    if (!canDelete(entity, authorId)) return;
    const softDeleted = { ...entity, deletedAt: new Date().toISOString(), deletedBy: authorId, _softDeleted: true };
    const updater = arr => arr.map(e => e.id === entity.id ? softDeleted : e);
    if (entityType === "contact") setContacts(updater);
    else if (entityType === "company") setCompanies(updater);
    else if (entityType === "project") setProjects(updater);
    else if (entityType === "deal") setDeals(updater);
    else if (entityType === "lf") setLf(updater);
    // Close popup if open
    setPopupStack(p => p.filter(x => !(x.type === entityType && x.id === entity.id)));
  }, [authorId]);

  const handleSaveEdit = useCallback((updated) => {
    const { type } = editTarget;
    const updater = arr => arr.map(e => e.id === updated.id ? updated : e);
    if (type === "contact") setContacts(updater);
    else if (type === "company") setCompanies(updater);
    else if (type === "project") setProjects(updater);
    else if (type === "deal") setDeals(updater);
    else if (type === "lf") setLf(updater);
    setEditTarget(null);
  }, [editTarget]);
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
    { id: "community", icon: "comm", label: "Community", courts: activeCourts },
  ];

  const ALL_PAGES_LABEL = { ...Object.fromEntries(NAV.map(n => [n.id, n.label])), profile: "My Profile" };
  const topPopup = popupStack[popupStack.length - 1];

  return (
    <div className={`app${theme === "dark" ? " dark" : ""}`}>
      <style>{STYLE}</style>
      <div className="sb">
        <div className="sb-logo">
          <div
            className="sb-mark"
            title={`W3 NET ${APP_VERSION}`}
            onClick={() => alert(`W3 NET ${APP_VERSION}`)}
            style={{ cursor: "pointer", flexShrink: 0 }}
          >
            <span className="sb-mark-t">W3</span>
          </div>
          <div>
            <div className="sb-name">W3 Net</div>
            <div className="sb-sub">Web3 Networking Hub</div>
          </div>
        </div>
        <div className="sb-nav">
          <div className="sb-sec">Main</div>
          {NAV.map(n => (
            <div key={n.id} className={`nv${page === n.id ? " on" : ""}`} onClick={() => setPage(n.id)}>
              <I n={n.icon} s={14} /><span>{n.label}</span>
              {n.courts > 0 && <span style={{ marginLeft: "auto", fontSize: 11, color: "oklch(0.65 0.18 80)", fontFamily: "var(--mono)", fontWeight: 500 }}>{n.courts}</span>}
            </div>
          ))}
        </div>
        <div className="sb-foot">
          {/* Profile section */}
          {currentUser && (
            <div
              className={`nv${page === "profile" ? " on" : ""}`}
              style={{ borderTop: "1px solid var(--border)", borderBottom: "1px solid var(--border)", padding: "8px 9px", marginBottom: 2 }}
              onClick={() => setPage("profile")}
            >
              <div className="av" style={{ width: 22, height: 22, fontSize: 8, flexShrink: 0 }}>{ini(currentUser.name)}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12.5, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{currentUser.name}</div>
                <div style={{ fontSize: 10.5, color: "var(--fg3)" }}>{currentUser.company}</div>
              </div>
              <span style={{ fontFamily: "var(--mono)", fontSize: 11, fontWeight: 600, color: (currentUserKarma || 0) >= 0 ? "var(--tf-g)" : "var(--danger-fg)", flexShrink: 0 }}>
                {currentUserKarma >= 0 ? "+" : ""}{currentUserKarma}
              </span>
            </div>
          )}
          <div className="nv" onClick={() => setTheme(t => t === "dark" ? "light" : "dark")}><I n={theme === "dark" ? "sun" : "moon"} s={13} /><span>{theme === "dark" ? "Light" : "Dark"} mode</span></div>
        </div>
      </div>

      <div className="main">
        <div className="topbar">
          <div className="tb-right" />
        </div>
        <div className="page">
          {page === "pulse" && <PulsePage contacts={contacts} companies={companies} projects={projects} deals={deals} lf={lf} discussions={discussions} setPage={setPage} allVotes={allVotes} onVote={handleVote} currentUserId={authorId} currentUserKarma={currentUserKarma} onOpenEntity={openEntity} />}
          {page === "contacts" && <ContactsPage contacts={contacts} companies={companies} projects={projects} deals={deals} lf={lf} allVotes={allVotes} onVote={handleVote} currentUserId={authorId} currentUserKarma={currentUserKarma} onOpenEntity={openEntity} onCreate={(c, subs) => {
            setContacts(p => [c, ...p]);
            atomicSaveSubs(subs, authorId, setContacts, setCompanies, setProjects);
          }} />}
          {page === "companies" && <CompaniesPage companies={companies} contacts={contacts} projects={projects} allVotes={allVotes} onVote={handleVote} currentUserId={authorId} currentUserKarma={currentUserKarma} onOpenEntity={openEntity} onCreate={(c, subs) => {
            setCompanies(p => [c, ...p]);
            atomicSaveSubs(subs, authorId, setContacts, setCompanies, setProjects);
          }} />}
          {page === "projects" && <ProjectsPage projects={projects} contacts={contacts} companies={companies} allVotes={allVotes} onVote={handleVote} currentUserId={authorId} currentUserKarma={currentUserKarma} onOpenEntity={openEntity} onCreate={(p, subs) => {
            setProjects(prev => [p, ...prev]);
            atomicSaveSubs(subs, authorId, setContacts, setCompanies, setProjects);
          }} />}
          {page === "deals" && <DealsPage deals={deals} contacts={contacts} onOpenEntity={openEntity} currentUserId={authorId} onCreate={(d, subs) => {
            setDeals(p => [d, ...p]);
            atomicSaveSubs(subs, authorId, setContacts, setCompanies, setProjects);
          }} />}
          {page === "looking" && <LFPage posts={lf} contacts={contacts} onOpenEntity={openEntity} currentUserId={authorId} onCreate={(p, subs) => {
            setLf(prev => [p, ...prev]);
            atomicSaveSubs(subs, authorId, setContacts, setCompanies, setProjects);
          }} />}
          {page === "community" && <CommunityPage discussions={discussions} setDiscussions={setDiscussions} contacts={contacts} companies={companies} projects={projects} courts={courts} setCourts={setCourts} allVotes={allVotes} onVote={handleVote} currentUserId={authorId} currentUserKarma={currentUserKarma} onOpenEntity={openEntity} />}
          {page === "profile" && <ProfilePage contact={currentUser} contacts={contacts} companies={companies} projects={projects} deals={deals} lf={lf} allVotes={allVotes} onVote={handleVote} currentUserId={authorId} currentUserKarma={currentUserKarma} onOpenEntity={openEntity} voteWeight={voteWeight(currentUserKarma)} />}
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
          canGoBack={popupStack.length > 1} onGoBack={() => setPopupStack(p => p.slice(0, -1))}
          onEdit={(entity, entityType) => handleEdit(entity, entityType)}
          onReport={handleReport}
          onStatusUpdate={handleStatusUpdate}
          onClaimOwnership={handleClaimOwnership}
          onSoftDelete={handleSoftDelete}
          claims={claims}
          currentUserId={authorId}
        />
      )}

      {editTarget && (
        <EditModal
          type={editTarget.type}
          entity={editTarget.entity}
          onClose={() => setEditTarget(null)}
          onSave={handleSaveEdit}
          contacts={contacts} companies={companies} projects={projects}
          authorId={authorId}
        />
      )}

      {statusUpdateTarget && (
        <StatusUpdateModal
          entity={statusUpdateTarget.entity}
          entityType={statusUpdateTarget.type}
          onClose={() => setStatusUpdateTarget(null)}
          onSave={handleSaveStatusUpdate}
          currentUserId={authorId}
        />
      )}

      {claimTarget && (
        <OwnershipClaimModal
          entity={claimTarget.entity}
          entityType={claimTarget.type}
          onClose={() => setClaimTarget(null)}
          onSubmitClaim={handleSubmitClaim}
          currentUserId={authorId}
          existingClaim={claims.find(cl => cl.entityId === claimTarget.entity.id && cl.claimantId === authorId && cl.status === "pending")}
        />
      )}
    </div>
  );
}
