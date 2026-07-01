// ChatGPT UI components for the value-add layer, served as MCP resources.
//
// These are a ChatGPT-only ENHANCEMENT. Claude (and any non-Apps client) ignores the tool result's
// `_meta["openai/outputTemplate"]` and renders the clean `content` text instead — identical workflow,
// no widget. The widgets are dependency-free vanilla JS (no bundler), build their DOM with
// createElement + textContent (XSS-safe for user data), and read window.openai.toolOutput
// (= the tool's structuredContent). The Save action calls window.openai.callTool('create_playlist').
//
// Note on branding: we display quality as plain descriptive text ("Lossless" / "Hi-Res Lossless"),
// not Tidal's trademarked badge/logo — see the Tidal brand constraints in the resubmission notes.

import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

export const LIBRARY_INSIGHTS_URI = 'ui://tidal/library-insights';
export const PLAYLIST_PREVIEW_URI = 'ui://tidal/playlist-preview';

// Apps SDK resource MIME type (verified against developers.openai.com/apps-sdk).
export const RESOURCE_MIME = 'text/html;profile=mcp-app';

// Shared boot helper: resolve window.openai.toolOutput robustly across Apps SDK readiness signals.
const BOOT = `
function getData(){ try { return (window.openai && window.openai.toolOutput) || null; } catch(e){ return null; } }
function getTheme(){ try { return (window.openai && window.openai.theme) || ''; } catch(e){ return ''; } }
function onReady(render){
  var done=false;
  function attempt(){ if(done) return; var d=getData(); if(d){ done=true; render(d); } }
  document.addEventListener('DOMContentLoaded', attempt);
  window.addEventListener('openai:set_globals', attempt);
  attempt();
  var n=0; var iv=setInterval(function(){ if(done||n++>50){clearInterval(iv);return;} attempt(); }, 100);
}
function el(tag, cls, text){ var e=document.createElement(tag); if(cls) e.className=cls; if(text!=null) e.textContent=String(text); return e; }
function fmtDur(sec){ if(sec==null) return ''; var m=Math.floor(sec/60), s=sec%60; return m+':'+(s<10?'0':'')+s; }
function qualityLabel(q){ if(q==='HI_RES_LOSSLESS') return 'Hi-Res Lossless'; if(q==='LOSSLESS') return 'Lossless'; if(q==='HIGH') return 'High'; return 'Unknown'; }
`;

const BASE_CSS = `
:root { color-scheme: light dark; }
* { box-sizing: border-box; }
body { margin:0; font: 14px/1.45 -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  color: #1c1c1e; background: transparent; }
@media (prefers-color-scheme: dark){ body { color:#f2f2f7; } }
.wrap { padding: 4px 2px; }
.h { font-weight:600; font-size:15px; margin:0 0 8px; }
.sub { opacity:.7; font-size:12px; }
.card { border:1px solid rgba(127,127,127,.25); border-radius:12px; padding:12px 14px; margin-bottom:10px; }
.row { display:flex; align-items:center; gap:10px; padding:7px 0; border-bottom:1px solid rgba(127,127,127,.14); }
.row:last-child { border-bottom:none; }
.grow { flex:1; min-width:0; }
.title { font-weight:500; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
.meta { font-size:12px; opacity:.65; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
.chip { display:inline-block; font-size:11px; padding:2px 7px; border-radius:999px; border:1px solid rgba(127,127,127,.35); margin:2px 4px 2px 0; }
.badge { font-size:11px; padding:2px 7px; border-radius:6px; background:rgba(99,102,241,.16); color:#4f46e5; white-space:nowrap; }
@media (prefers-color-scheme: dark){ .badge{ color:#a5b4fc; } }
.badge.hi { background:rgba(16,185,129,.18); color:#059669; }
@media (prefers-color-scheme: dark){ .badge.hi{ color:#6ee7b7; } }
.stats { display:flex; flex-wrap:wrap; gap:14px; margin-bottom:10px; }
.stat b { display:block; font-size:20px; font-weight:600; }
.stat span { font-size:12px; opacity:.7; }
.bar { height:8px; border-radius:4px; background:rgba(99,102,241,.7); }
.btn { font:inherit; font-weight:600; border:none; border-radius:10px; padding:9px 16px; cursor:pointer;
  background:#4f46e5; color:#fff; }
.btn:disabled { opacity:.6; cursor:default; }
.iconbtn { border:none; background:transparent; cursor:pointer; font-size:15px; opacity:.6; padding:2px 6px; color:inherit; }
.iconbtn:hover { opacity:1; }
.name { font:inherit; font-weight:600; width:100%; padding:8px 10px; border-radius:9px;
  border:1px solid rgba(127,127,127,.35); background:transparent; color:inherit; margin-bottom:10px; }
.note { font-size:12px; opacity:.7; margin-top:8px; }
.foot { display:flex; align-items:center; justify-content:space-between; gap:10px; margin-top:12px; }
.empty { opacity:.7; padding:14px 0; }
`;

function doc(title: string, body: string, script: string): string {
  return (
    '<!doctype html><html><head><meta charset="utf-8">' +
    '<meta name="viewport" content="width=device-width, initial-scale=1">' +
    '<title>' + title + '</title><style>' + BASE_CSS + '</style></head><body>' +
    '<div class="wrap" id="root"></div>' +
    '<script>' + BOOT + script + '</script></body></html>'
  );
}

// ---- library-insights (read-only) ----
const LIBRARY_INSIGHTS_SCRIPT = `
onReady(function(d){
  var root = document.getElementById('root');
  root.innerHTML = '';
  var t = d.totals || {}, p = d.playlists || {};

  root.appendChild(el('div','h','Your Tidal library'));

  var stats = el('div','stats');
  function stat(n,label){ var s=el('div','stat'); s.appendChild(el('b',null,n==null?'0':n)); s.appendChild(el('span',null,label)); return s; }
  stats.appendChild(stat(t.ownedPlaylists,'playlists'));
  stats.appendChild(stat(p.totalTracks,'tracks'));
  stats.appendChild(stat(t.savedForLaterItems,'saved'));
  if (d.forgottenGems) stats.appendChild(stat(d.forgottenGems.count,'forgotten gems'));
  if (d.duplicates) stats.appendChild(stat(d.duplicates.count,'cross-playlist dupes'));
  root.appendChild(stats);

  // saved-by-type bars
  var byType = t.savedByType || {};
  var keys = Object.keys(byType);
  if (keys.length){
    var c = el('div','card'); c.appendChild(el('div','sub','Saved by type'));
    var max = Math.max.apply(null, keys.map(function(k){return byType[k];}));
    keys.forEach(function(k){
      var r = el('div','row');
      r.appendChild(el('div','grow', k));
      var barWrap = el('div','grow');
      var bar = el('div','bar'); bar.style.width = Math.max(6, Math.round(byType[k]/max*100)) + '%';
      barWrap.appendChild(bar);
      r.appendChild(barWrap);
      r.appendChild(el('div','meta', byType[k]));
      c.appendChild(r);
    });
    root.appendChild(c);
  }

  if (d.savedArtists && d.savedArtists.length){
    var ac = el('div','card'); ac.appendChild(el('div','sub','Saved artists'));
    var chips = el('div'); d.savedArtists.slice(0,16).forEach(function(a){ chips.appendChild(el('span','chip',a)); });
    ac.appendChild(chips); root.appendChild(ac);
  }

  if (p.stalest && p.stalest.length){
    var sc = el('div','card'); sc.appendChild(el('div','sub','Stalest playlists'));
    p.stalest.slice(0,5).forEach(function(s){
      var r=el('div','row'); r.appendChild(el('div','grow title', s.name));
      var months=Math.floor((s.daysSinceModified||0)/30);
      r.appendChild(el('div','meta', months>=1?('~'+months+'mo'):'recent'));
      sc.appendChild(r);
    });
    root.appendChild(sc);
  }

  if (d.forgottenGems && d.forgottenGems.items && d.forgottenGems.items.length){
    var gc = el('div','card'); gc.appendChild(el('div','sub','Forgotten gems (saved, in no playlist)'));
    d.forgottenGems.items.slice(0,12).forEach(function(g){
      var r=el('div','row'); r.appendChild(el('div','grow title', g.title)); gc.appendChild(r);
    });
    root.appendChild(gc);
  }

  if (d.duplicates && d.duplicates.items && d.duplicates.items.length){
    var dc = el('div','card'); dc.appendChild(el('div','sub','In multiple playlists'));
    d.duplicates.items.slice(0,12).forEach(function(x){
      var r=el('div','row'); r.appendChild(el('div','grow title', x.title));
      r.appendChild(el('div','meta', (x.inPlaylists||[]).length + ' playlists'));
      dc.appendChild(r);
    });
    root.appendChild(dc);
  }

  (d.notes||[]).forEach(function(n){ root.appendChild(el('div','note', n)); });
});
`;

// ---- playlist-preview (editable, with Save) ----
const PLAYLIST_PREVIEW_SCRIPT = `
onReady(function(d){
  var root = document.getElementById('root');
  var state = { tracks: (d.tracks||[]).slice() };

  function render(){
    root.innerHTML = '';
    var modeNote = d.mode && d.mode!=='plain' ? ' · ' + String(d.mode).replace('_',' ') : '';
    root.appendChild(el('div','h','Playlist preview' + modeNote));

    var name = el('input','name'); name.type='text';
    name.value = d.suggestedName || ''; name.placeholder = 'Playlist name';
    root.appendChild(name);

    if (!state.tracks.length){
      root.appendChild(el('div','empty','No tracks to save.'));
    } else {
      var list = el('div','card');
      state.tracks.forEach(function(tr, i){
        var r = el('div','row');
        var up = el('button','iconbtn','↑'); up.title='Move up';
        up.onclick=function(){ if(i>0){ var x=state.tracks[i-1]; state.tracks[i-1]=state.tracks[i]; state.tracks[i]=x; render(); } };
        var down = el('button','iconbtn','↓'); down.title='Move down';
        down.onclick=function(){ if(i<state.tracks.length-1){ var x=state.tracks[i+1]; state.tracks[i+1]=state.tracks[i]; state.tracks[i]=x; render(); } };
        r.appendChild(up); r.appendChild(down);

        var g = el('div','grow');
        g.appendChild(el('div','title', tr.title || '(unknown)'));
        var sub = (tr.artists||[]).join(', ');
        g.appendChild(el('div','meta', sub));
        r.appendChild(g);

        if (tr.quality && tr.quality!=='UNKNOWN'){
          var b = el('span', tr.quality==='HI_RES_LOSSLESS' ? 'badge hi' : 'badge', qualityLabel(tr.quality));
          r.appendChild(b);
        }
        if (tr.durationSeconds!=null) r.appendChild(el('div','meta', fmtDur(tr.durationSeconds)));

        var rm = el('button','iconbtn','✕'); rm.title='Remove';
        rm.onclick=function(){ state.tracks.splice(i,1); render(); };
        r.appendChild(rm);
        list.appendChild(r);
      });
      root.appendChild(list);
    }

    if (d.filteredOut && d.filteredOut.length) root.appendChild(el('div','note', d.filteredOut.length + ' excluded by the filter.'));
    if (d.notFound && d.notFound.length) root.appendChild(el('div','note', d.notFound.length + ' not found on Tidal.'));
    (d.notes||[]).forEach(function(n){ root.appendChild(el('div','note', n)); });

    var foot = el('div','foot');
    var count = el('div','sub', state.tracks.length + ' track' + (state.tracks.length===1?'':'s'));
    var save = el('button','btn','Save to Tidal');
    save.disabled = !state.tracks.length;
    save.onclick = function(){
      if (!(window.openai && window.openai.callTool)) { count.textContent='Saving needs ChatGPT.'; return; }
      save.disabled = true; save.textContent = 'Saving…';
      var ids = state.tracks.map(function(t){ return t.trackId; });
      window.openai.callTool('create_playlist', { name: name.value || d.suggestedName || 'New Playlist', trackIds: ids })
        .then(function(){ save.textContent = 'Saved to Tidal ✓'; })
        .catch(function(){ save.disabled=false; save.textContent='Save to Tidal'; count.textContent='Save failed — try again.'; });
    };
    foot.appendChild(count); foot.appendChild(save);
    root.appendChild(foot);
  }

  render();
});
`;

export const LIBRARY_INSIGHTS_HTML = doc('Tidal Library Insights', '', LIBRARY_INSIGHTS_SCRIPT);
export const PLAYLIST_PREVIEW_HTML = doc('Tidal Playlist Preview', '', PLAYLIST_PREVIEW_SCRIPT);

/** Register the UI component resources. Harmless on non-ChatGPT clients (they never fetch them). */
export function registerCurationResources(server: McpServer): void {
  server.registerResource(
    'tidal-library-insights',
    LIBRARY_INSIGHTS_URI,
    { title: 'Tidal Library Insights', description: 'Interactive view of a Tidal library analysis', mimeType: RESOURCE_MIME },
    async (uri: any) => ({ contents: [{ uri: uri.href ?? LIBRARY_INSIGHTS_URI, mimeType: RESOURCE_MIME, text: LIBRARY_INSIGHTS_HTML }] }),
  );
  server.registerResource(
    'tidal-playlist-preview',
    PLAYLIST_PREVIEW_URI,
    { title: 'Tidal Playlist Preview', description: 'Editable playlist preview with Save to Tidal', mimeType: RESOURCE_MIME },
    async (uri: any) => ({ contents: [{ uri: uri.href ?? PLAYLIST_PREVIEW_URI, mimeType: RESOURCE_MIME, text: PLAYLIST_PREVIEW_HTML }] }),
  );
}
