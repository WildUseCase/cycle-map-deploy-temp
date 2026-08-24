
const SITE_ORIGIN = "https://raw.githubusercontent.com/WildUseCase/cycle-map-deploy-temp/382d2292c7ee9a4e81d5ed25fc1158d7d9081662/";
function __name(fn, n){ try { Object.defineProperty(fn, "name", { value: n, configurable: true }); } catch(e) {} return fn; }
async function loadPage(env){
  try {
    if (env.SITE) {
      const cached = await env.SITE.get("page.html.v122");
      if (cached) return cached;
    }
  } catch (e) {}
  const r = await fetch(SITE_ORIGIN + "page.html", { cf: { cacheTtl: 0 } });
  if (!r.ok) return "<!doctype html><title>Cycle Map</title><p>Could not load the page (" + r.status + ").</p>";
  const html = await r.text();
  try { if (env.SITE) await env.SITE.put("page.html.v122", html); } catch (e) {}
  return html;
}
async function proxyAsset(env, name, type){
  try {
    if (env.SITE) {
      const cached = await env.SITE.get(name, { type: "arrayBuffer" });
      if (cached) return new Response(cached, { headers: { "content-type": type, "cache-control": "private, max-age=86400" } });
    }
  } catch (e) {}
  const r = await fetch(SITE_ORIGIN + name, { cf: { cacheTtl: 86400 } });
  if (!r.ok) return new Response("missing", { status: 404 });
  const buf = await r.arrayBuffer();
  try { if (env.SITE) await env.SITE.put(name, buf); } catch (e) {}
  return new Response(buf, { headers: { "content-type": type, "cache-control": "private, max-age=86400" } });
}

var JSON_HEADERS = {
  "content-type": "application/json; charset=utf-8",
  "cache-control": "no-store"
};
var COOKIE = "cm_auth";
async function tokenFor(pass) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode("cyclemap:" + pass));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
}
__name(tokenFor, "tokenFor");
function readCookie(request, name) {
  const raw = request.headers.get("cookie") || "";
  for (const part of raw.split(";")) {
    const [k, ...v] = part.trim().split("=");
    if (k === name) return v.join("=");
  }
  return null;
}
__name(readCookie, "readCookie");
function sameToken(a, b) {
  if (!a || !b || a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}
__name(sameToken, "sameToken");
async function isAuthed(request, env) {
  if (!env.PASSCODE) return true;
  return sameToken(readCookie(request, COOKIE), await tokenFor(env.PASSCODE));
}
__name(isAuthed, "isAuthed");
var LOCK = `<title>Cycle Map</title>
<style>
:root{color-scheme:light;--bg:#EDEEEA;--surface:#F8F8F5;--ink:#1E2422;--soft:#525D58;
--faint:#89938D;--line:#D2D6CD;--brass:#9C6B20;--danger:#A5432F}
*{box-sizing:border-box}
body{margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;
padding:24px;background:var(--bg);color:var(--ink);
font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif}
.box{width:100%;max-width:360px}
h1{margin:0 0 6px;font-family:ui-serif,"New York","Iowan Old Style",Palatino,Georgia,serif;
font-size:1.6rem;font-weight:600;letter-spacing:-.015em}
p{margin:0 0 22px;font-size:.85rem;color:var(--soft)}
label{display:block;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:.66rem;
letter-spacing:.14em;text-transform:uppercase;color:var(--faint);margin-bottom:7px}
input{width:100%;padding:10px 12px;font-size:1rem;background:var(--surface);
border:1px solid var(--line);border-radius:2px;color:inherit}
input:focus{outline:none;border-color:var(--brass);background:#fff}
button{width:100%;margin-top:12px;padding:10px;font:inherit;font-size:.9rem;cursor:pointer;
background:var(--ink);color:var(--bg);border:1px solid var(--ink);border-radius:2px}
button:hover{opacity:.88}
.err{margin-top:12px;font-size:.82rem;color:var(--danger);min-height:1.2em}
</style>
<div class="box">
  <h1>Cycle Map</h1>
  <p>This timeline is private. Enter the passcode to open it.</p>
  <form id="f">
    <label for="p">Passcode</label>
    <input id="p" type="password" autocomplete="current-password" autofocus>
    <button type="submit">Open</button>
    <div class="err" id="e"></div>
  </form>
</div>
<script>
document.getElementById("f").addEventListener("submit", function(ev){
  ev.preventDefault();
  var e = document.getElementById("e");
  e.textContent = "";
  fetch("api/login", {
    method: "POST",
    headers: {"content-type": "application/json"},
    body: JSON.stringify({p: document.getElementById("p").value})
  }).then(function(r){
    if (r.ok) { location.reload(); return; }
    e.textContent = "That passcode does not match. Try again.";
    document.getElementById("p").select();
  }).catch(function(){ e.textContent = "Could not reach the server. Check your connection."; });
});
<\/script>`;
async function ensureTable(env) {
  await env.DB.prepare(
    "CREATE TABLE IF NOT EXISTS timeline (id INTEGER PRIMARY KEY, v INTEGER NOT NULL, t TEXT NOT NULL, by_id TEXT, data TEXT NOT NULL)"
  ).run();
  await env.DB.prepare(
    "CREATE TABLE IF NOT EXISTS history (id INTEGER PRIMARY KEY AUTOINCREMENT, t TEXT NOT NULL, by_id TEXT, steps INTEGER, day1 TEXT, title TEXT, data TEXT NOT NULL)"
  ).run();
  await env.DB.prepare(
    "CREATE TABLE IF NOT EXISTS apod (day TEXT PRIMARY KEY, fetched TEXT NOT NULL, payload TEXT NOT NULL)"
  ).run();
  await env.DB.prepare(
    "CREATE TABLE IF NOT EXISTS skyimg (src TEXT PRIMARY KEY, fetched TEXT NOT NULL, payload TEXT NOT NULL)"
  ).run();
  // Letters of Love. Its own table - nothing here reads or writes `timeline`.
  await env.DB.prepare(
    "CREATE TABLE IF NOT EXISTS letters (id TEXT PRIMARY KEY, created TEXT NOT NULL, payload TEXT NOT NULL)"
  ).run();
  // Your Family. Also its own table; the timeline is never touched.
  await env.DB.prepare(
    "CREATE TABLE IF NOT EXISTS family (id TEXT PRIMARY KEY, kind TEXT NOT NULL, " +
    "created TEXT NOT NULL, sortkey TEXT, payload TEXT NOT NULL)"
  ).run();
  await seedFamily(env);
}

/* ============================================================================
   YOUR FAMILY  --  owner-writable, everyone-readable

   ACCESS CONTROL, HONESTLY. This app has never had accounts. It has one shared
   passcode, and until now everyone holding it had identical, full access. There
   is no "my account" to bind this to, so this adds a SECOND, separate secret:

       npx wrangler secret put OWNER_PASSCODE

   PASSCODE  -> can see the app at all        (unchanged)
   OWNER_PASSCODE -> can add/edit/delete here (new, checked on the server)

   If OWNER_PASSCODE is not set, editing stays open to anyone who can see the
   app - the same as every other tab - and the UI says so plainly rather than
   pretending to be locked. Set the secret and the lock switches on.

   RECORD SHAPE IS A CONTRACT, same as Letters of Love, for the same reason -
   the export file and the eventual GitHub commit both use it verbatim:

     photo   { schema, kind:"photo",   id, created, date, caption, image{name,type,bytes,dataUri} }
     excerpt { schema, kind:"excerpt", id, created, title, body, source }
     book    { schema, kind:"book",    id, created, title, author, note }

   One item becomes one file at family/<kind>/<id>.json. See syncToGitHub.
   ============================================================================ */

const FAMILY_SCHEMA = "your-family/v1";
const FAMILY_MAX_BYTES = 900000;
const OWNER_COOKIE = "cm_owner";

async function isOwner(request, env) {
  if (!env.OWNER_PASSCODE) return true;          // lock not configured yet
  return sameToken(readCookie(request, OWNER_COOKIE), await tokenFor(env.OWNER_PASSCODE));
}

/* The opening reflection now lives in the page itself, at the top of Your Family,
   rather than as a seeded entry - it was appearing twice otherwise. Family Quotes
   starts empty so Kayla fills it herself. Kept as a no-op so the call site and any
   existing tombstone row stay valid. */
const FAMILY_SEED_ID = "exc-opening-reflection";
async function seedFamily(env) { return; }

function famClean(v, max) {
  return String(v == null ? "" : v).replace(/\r\n/g, "\n").trim().slice(0, max);
}

// Build a stored record from whatever the form sent. Unknown kinds are refused.
function famRecord(kind, b, existing) {
  const base = existing || {
    schema: FAMILY_SCHEMA, kind,
    id: kind.slice(0, 3) + "-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 8),
    created: new Date().toISOString()
  };
  if (kind === "photo") {
    let image = existing ? existing.image : null;
    if (b.image && typeof b.image.dataUri === "string" && b.image.dataUri.startsWith("data:image/")) {
      image = { name: famClean(b.image.name, 200), type: famClean(b.image.type, 60),
                bytes: Number(b.image.bytes) || b.image.dataUri.length, dataUri: b.image.dataUri };
    }
    if (!image) return { error: "A photo needs an image" };
    return { ...base, kind: "photo", date: famClean(b.date, 20),
             caption: famClean(b.caption, 2000), image };
  }
  if (kind === "excerpt") {
    const body = famClean(b.body, 20000);
    if (!body) return { error: "An excerpt needs some text" };
    return { ...base, kind: "excerpt", title: famClean(b.title, 200),
             body, source: famClean(b.source, 300) };
  }
  if (kind === "book") {
    const title = famClean(b.title, 300);
    if (!title) return { error: "A book needs a title" };
    return { ...base, kind: "book", title, author: famClean(b.author, 200),
             note: famClean(b.note, 4000) };
  }
  return { error: "Unknown kind" };
}

/* ============================================================================
   LETTERS OF LOVE  --  storage layer

   TEMPORARY HOME. Letters live in the D1 database that already backs this app,
   which means they are shared across everyone with the link and survive a
   change of computer. The intended permanent home is a private GitHub repo.

   THE RECORD SHAPE IS A CONTRACT. Do not change it without migrating what is
   already stored - the export format and the future GitHub commit both use it
   verbatim:

     {
       "schema":       "letters-of-love/v1",
       "id":           "ltr-<timestamp>-<random>",
       "created":      "<ISO 8601>",
       "author":       "<who wrote it>",
       "relationship": "<who they are to the baby>",
       "body":         "<the letter>",
       "photo":        null | { name, type, bytes, dataUri }
     }

   When the repo exists, one letter becomes one file at letters/<id>.json,
   holding exactly this object and nothing else. See syncToGitHub below.
   ============================================================================ */

const LETTER_SCHEMA = "letters-of-love/v1";
const LETTER_MAX_BYTES = 900000;     // a letter plus its photo, encoded

/* ---------------------------------------------------------------------------
   TODO(github-sync): not built yet, by design - the repo does not exist so far.
   When it does, call this at the end of a successful POST /api/letters, and
   again from a one-off backfill over rows already in D1.

   Everything needed is already in the right shape; this is an addition, not a
   rebuild. Sketch of the work:

     1. Add a fine-grained PAT with contents:write on the one repo, stored as a
        Worker secret:  npx wrangler secret put GITHUB_TOKEN
        Plus GITHUB_REPO ("owner/name") and GITHUB_BRANCH ("main") as vars.
     2. PUT https://api.github.com/repos/<repo>/contents/letters/<id>.json
          headers: authorization: Bearer <token>
                   accept: application/vnd.github+json
                   user-agent: cycle-map            <- GitHub rejects requests without one
          body:    { message, content: <base64 of JSON.stringify(record)>, branch }
        Creating needs no sha; overwriting an existing path does, so GET first
        if the file may already be there.
     3. Base64 must be UTF-8 safe - btoa alone breaks on non-ASCII names and
        letter text. Encode the bytes, not the string.
     4. Do not block the submission on this. Wrap in try/catch, record the
        outcome on the row (add a `synced` column), and let the letter succeed
        even when GitHub is unreachable. D1 stays the source of truth until a
        backfill has demonstrably copied everything across.
     5. Photos are inline base64 data URIs inside the JSON. If they push files
        past a comfortable size, switch to writing the image as a separate blob
        at letters/media/<id>.jpg and leaving a relative path in the record -
        but that is a schema change, so version it as letters-of-love/v2.
   --------------------------------------------------------------------------- */
async function syncToGitHub(env, record) {
  return { skipped: true, reason: "GitHub sync not configured yet" };
}

function letterClean(v, max) {
  return String(v == null ? "" : v).replace(/\r\n/g, "\n").trim().slice(0, max);
}

/* ============================================================================
   SKY IMAGE SOURCES
   The only place that knows where pictures come from. To add, remove or
   reorder a feed, edit SKY_SOURCES - nothing else needs touching, and no
   layout code refers to any individual source by name.

   Every source resolves to the same shape:
     { src, label, home, title, text, img, page, credit, date, media }

   Fetching happens here on the Worker rather than in the browser because none
   of the RSS hosts send CORS headers, and because it keeps the NASA key server
   side and lets one fetch serve everybody.
   ============================================================================ */

const SKY_TTL_DAY = 864e5;          // RSS feeds: refetch at most once a day

function skyClean(s) {
  if (!s) return "";
  return String(s)
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/<[^>]+>/g, " ")
    .replace(/&#(\d+);/g, (m, d) => String.fromCharCode(+d))
    .replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"').replace(/&(?:apos|#0?39);/g, "'").replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ").trim();
}
function skyTag(item, name) {
  const m = item.match(new RegExp("<" + name + "[^>]*>([\\s\\S]*?)</" + name + ">", "i"));
  return m ? skyClean(m[1]) : "";
}
// enclosure attribute order differs between these feeds, so match url= anywhere
function skyEnclosure(item) {
  const tags = item.match(/<enclosure\b[^>]*>/gi) || [];
  for (const t of tags) {
    if (!/type\s*=\s*["']image\//i.test(t)) continue;
    const u = t.match(/url\s*=\s*["']([^"']+)["']/i);
    if (u) return u[1];
  }
  return "";
}
function skyItems(xml) {
  return (xml.match(/<item[\s>][\s\S]*?<\/item>/gi) || []).map(it => ({
    title: skyTag(it, "title"),
    page: skyTag(it, "link") || skyTag(it, "guid"),
    text: skyTag(it, "description"),
    img: skyEnclosure(it),
    when: Date.parse(skyTag(it, "pubDate")) || 0
  })).filter(x => x.img);
}

const SKY_SOURCES = [
  {
    src: "apod",
    label: "NASA APOD",
    home: "https://apod.nasa.gov/apod/astropix.html",
    primary: true,
    async load(env) {
      const key = env.NASA_API_KEY || "DEMO_KEY";
      const r = await fetch("https://api.nasa.gov/planetary/apod?api_key=" + encodeURIComponent(key),
                            { headers: { accept: "application/json" } });
      if (!r.ok) throw new Error("NASA APOD returned " + r.status);
      const d = await r.json();
      return {
        src: "apod", label: "NASA APOD", home: this.home,
        title: d.title || "", text: d.explanation || "",
        img: d.media_type === "image" ? (d.url || "") : "",
        video: d.media_type === "image" ? "" : (d.url || ""),
        page: "https://apod.nasa.gov/apod/astropix.html",
        credit: d.copyright ? String(d.copyright).replace(/\s+/g, " ").trim() : "",
        date: d.date || "", media: d.media_type || "image",
        when: Date.parse(d.date || "") || Date.now(),
        demoKey: !env.NASA_API_KEY
      };
    }
  },
  {
    src: "nasaiotd",
    label: "NASA Image of the Day",
    home: "https://www.nasa.gov/image-of-the-day/",
    feed: "https://www.nasa.gov/feeds/iotd-feed/",
    // the feed links the full-resolution original, which runs to tens of MB
    shrink: u => (/nasa\.gov\/wp-content\//.test(u) ? u + (u.includes("?") ? "&" : "?") + "w=1200" : u)
  },
  {
    src: "hubble",
    label: "ESA/Hubble",
    home: "https://esahubble.org/images/potw/",
    feed: "https://feeds.feedburner.com/esahubble/images/potw/"
  },
  {
    src: "eso",
    label: "ESO",
    home: "https://www.eso.org/public/images/potw/",
    feed: "https://feeds.feedburner.com/eso_potw"
  }
];

async function skyLoadFeed(s) {
  const r = await fetch(s.feed, { headers: { accept: "application/rss+xml, application/xml, text/xml" } });
  if (!r.ok) throw new Error(s.label + " feed returned " + r.status);
  const items = skyItems(await r.text());
  if (!items.length) throw new Error(s.label + " feed had no usable image");
  items.sort((a, b) => b.when - a.when);
  const it = items[0];
  return {
    src: s.src, label: s.label, home: s.home,
    title: it.title, text: it.text,
    img: s.shrink ? s.shrink(it.img) : it.img,
    video: "", page: it.page || s.home, credit: "",
    date: it.when ? new Date(it.when).toISOString().slice(0, 10) : "",
    media: "image", when: it.when
  };
}

// Cached read. Serves the stored copy while it is fresh, and - crucially -
// falls back to a stale copy if the source is unreachable, so the panel keeps
// showing something between a weekly feed's update cycles.
async function skyGet(env, s, force) {
  const now = Date.now();
  let cached = null;
  try {
    const row = await env.DB.prepare("SELECT fetched, payload FROM skyimg WHERE src = ?")
      .bind(s.src).first();
    if (row) cached = { at: Date.parse(row.fetched) || 0, shot: JSON.parse(row.payload) };
  } catch (e) {}

  const sameDay = cached &&
    new Date(cached.at).toISOString().slice(0, 10) === new Date(now).toISOString().slice(0, 10);
  const fresh = s.primary ? sameDay : (cached && now - cached.at < SKY_TTL_DAY);
  if (cached && fresh && !force) return { ...cached.shot, cached: true };

  try {
    const shot = s.load ? await s.load(env) : await skyLoadFeed(s);
    if (!shot.img && !shot.video) throw new Error(s.label + " gave no image");
    await env.DB.prepare(
      "INSERT INTO skyimg (src, fetched, payload) VALUES (?, ?, ?) " +
      "ON CONFLICT(src) DO UPDATE SET fetched = excluded.fetched, payload = excluded.payload"
    ).bind(s.src, new Date(now).toISOString(), JSON.stringify(shot)).run();
    return { ...shot, cached: false };
  } catch (err) {
    if (cached) return { ...cached.shot, cached: true, stale: true };
    return null;
  }
}

// APOD first; otherwise whichever feed has the most recent entry. `seen` lets
// the client rotate past anything it has already shown today.
async function skyPick(env, seen) {
  const skip = new Set((seen || "").split(",").map(x => x.trim()).filter(Boolean));
  const primary = SKY_SOURCES.find(s => s.primary);
  const notes = [];

  if (primary && !skip.has(primary.src)) {
    const shot = await skyGet(env, primary);
    if (shot) return { ...shot, tried: notes };
    notes.push(primary.src + " unavailable");
  }
  const rest = SKY_SOURCES.filter(s => !s.primary);
  const got = (await Promise.all(rest.map(s => skyGet(env, s).catch(() => null))))
    .filter(Boolean);
  const pool = got.filter(s => !skip.has(s.src));
  const use = (pool.length ? pool : got).sort((a, b) => (b.when || 0) - (a.when || 0))[0];
  if (use) return { ...use, tried: notes, rotated: true };

  // last resort before the client draws its own placeholder
  if (primary && skip.has(primary.src)) {
    const shot = await skyGet(env, primary);
    if (shot) return { ...shot, tried: notes };
  }
  return null;
}

const HISTORY_KEEP = 80;        // restore points retained
const HISTORY_GAP_MS = 90000;   // a burst of typing collapses into one restore point

// Park the outgoing state so it can be returned to. `force` skips the coalescing
// window, used when a restore itself needs to be reversible.
async function snapshot(env, prevRow, now, force) {
  if (!prevRow || !prevRow.data) return;
  if (!force) {
    const last = await env.DB.prepare("SELECT t FROM history ORDER BY id DESC LIMIT 1").first();
    if (last && Date.parse(now) - Date.parse(last.t) < HISTORY_GAP_MS) return;
  }
  let steps = null, day1 = null, title = null;
  try {
    const s = JSON.parse(prevRow.data);
    steps = s && s.cycle && s.cycle.steps ? s.cycle.steps.length : null;
    day1 = s && s.cycle ? s.cycle.day1 : null;
    title = s ? s.title : null;
  } catch (e) {}
  await env.DB.prepare(
    "INSERT INTO history (t, by_id, steps, day1, title, data) VALUES (?, ?, ?, ?, ?, ?)"
  ).bind(prevRow.t, String(prevRow.by_id || ""), steps, day1, title, prevRow.data).run();
  await env.DB.prepare(
    "DELETE FROM history WHERE id NOT IN (SELECT id FROM history ORDER BY id DESC LIMIT ?)"
  ).bind(HISTORY_KEEP).run();
}
__name(ensureTable, "ensureTable");
function json(body, status) {
  return new Response(JSON.stringify(body), { status: status || 200, headers: JSON_HEADERS });
}
__name(json, "json");
var worker_default = {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === "/owl.png") {
      if (!(await isAuthed(request, env))) return json({ error: "Locked" }, 401);
      return proxyAsset(env, "owl.png", "image/png");
    }

    if (url.pathname === "/owl-night.png") {
      if (!(await isAuthed(request, env))) return json({ error: "Locked" }, 401);
      return proxyAsset(env, "owl-night.png", "image/png");
    }

    if (url.pathname === "/tree.jpg") {
      if (!(await isAuthed(request, env))) return json({ error: "Locked" }, 401);
      return proxyAsset(env, "tree.jpg", "image/jpeg");
    }

    if (url.pathname === "/api/login") {
      if (request.method !== "POST") return json({ error: "Method not allowed" }, 405);
      if (!env.PASSCODE) return json({ ok: true, note: "No passcode is set on this Worker" });
      let body;
      try {
        body = await request.json();
      } catch (e) {
        body = null;
      }
      const given = body && typeof body.p === "string" ? body.p : "";
      if (!sameToken(await tokenFor(given), await tokenFor(env.PASSCODE))) {
        return json({ error: "Wrong passcode" }, 401);
      }
      const token = await tokenFor(env.PASSCODE);
      return new Response(JSON.stringify({ ok: true }), {
        headers: {
          ...JSON_HEADERS,
          "set-cookie": COOKIE + "=" + token + "; Path=/; Max-Age=31536000; HttpOnly; Secure; SameSite=Lax"
        }
      });
    }
    // /api/skyimage?seen=apod,eso  ->  the picture panel's only endpoint.
    // All source selection lives in SKY_SOURCES / skyPick above.
    if (url.pathname === "/api/skyimage" || url.pathname === "/api/apod") {
      if (!(await isAuthed(request, env))) return json({ error: "Locked" }, 401);
      if (!env.DB) return json({ error: "No D1 binding named DB" }, 500);
      try {
        await ensureTable(env);
        const shot = await skyPick(env, url.searchParams.get("seen") || "");
        if (!shot) return json({ error: "No image source reachable" }, 502);
        return json(shot);
      } catch (err) {
        return json({ error: String((err && err.message) || err) }, 502);
      }
    }

    // ---- Letters of Love -------------------------------------------------
    // Reads and writes ONLY the `letters` table. The timeline is never touched.
    if (url.pathname === "/api/letters") {
      if (!(await isAuthed(request, env))) return json({ error: "Locked" }, 401);
      if (!env.DB) return json({ error: "No D1 binding named DB" }, 500);
      await ensureTable(env);

      if (request.method === "GET") {
        const rows = await env.DB.prepare(
          "SELECT payload FROM letters ORDER BY created DESC"
        ).all();
        const letters = (rows.results || []).map(r => {
          try { return JSON.parse(r.payload); } catch (e) { return null; }
        }).filter(Boolean);
        return json({ schema: LETTER_SCHEMA, count: letters.length, letters });
      }

      if (request.method === "POST") {
        let b;
        try { b = await request.json(); } catch (e) { return json({ error: "Bad JSON" }, 400); }

        const body = letterClean(b.body, 20000);
        const author = letterClean(b.author, 120);
        if (!body) return json({ error: "The letter is empty" }, 400);
        if (!author) return json({ error: "Please add a name" }, 400);

        let photo = null;
        if (b.photo && typeof b.photo.dataUri === "string" && b.photo.dataUri.startsWith("data:image/")) {
          photo = {
            name: letterClean(b.photo.name, 200),
            type: letterClean(b.photo.type, 60),
            bytes: Number(b.photo.bytes) || b.photo.dataUri.length,
            dataUri: b.photo.dataUri
          };
        }

        const record = {
          schema: LETTER_SCHEMA,
          id: "ltr-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 8),
          created: new Date().toISOString(),
          author,
          relationship: letterClean(b.relationship, 120),
          body,
          photo
        };
        const payload = JSON.stringify(record);
        if (payload.length > LETTER_MAX_BYTES) {
          return json({ error: "That letter and photo are too large to store. Try a smaller photo." }, 413);
        }
        await env.DB.prepare("INSERT INTO letters (id, created, payload) VALUES (?, ?, ?)")
          .bind(record.id, record.created, payload).run();

        // TODO(github-sync): once the repo exists, also commit letters/<id>.json here.
        const sync = await syncToGitHub(env, record);
        return json({ ok: true, letter: record, sync });
      }

      if (request.method === "DELETE") {
        const id = url.searchParams.get("id") || "";
        if (!id) return json({ error: "No id given" }, 400);
        const r = await env.DB.prepare("DELETE FROM letters WHERE id = ?").bind(id).run();
        return json({ ok: true, removed: (r.meta && r.meta.changes) || 0 });
      }
      return json({ error: "Method not allowed" }, 405);
    }

    // ---- Your Family owner lock ------------------------------------------
    if (url.pathname === "/api/owner") {
      if (!(await isAuthed(request, env))) return json({ error: "Locked" }, 401);
      if (request.method === "GET") {
        return json({ owner: await isOwner(request, env), configured: !!env.OWNER_PASSCODE });
      }
      if (request.method === "POST") {
        if (!env.OWNER_PASSCODE) {
          return json({ ok: true, owner: true, configured: false,
                        note: "No OWNER_PASSCODE is set on this Worker" });
        }
        let b; try { b = await request.json(); } catch (e) { b = null; }
        const given = b && typeof b.p === "string" ? b.p : "";
        if (!sameToken(await tokenFor(given), await tokenFor(env.OWNER_PASSCODE))) {
          return json({ error: "That is not the owner passcode" }, 401);
        }
        return new Response(JSON.stringify({ ok: true, owner: true, configured: true }), {
          headers: { ...JSON_HEADERS,
            "set-cookie": OWNER_COOKIE + "=" + (await tokenFor(env.OWNER_PASSCODE)) +
              "; Path=/; Max-Age=31536000; HttpOnly; Secure; SameSite=Lax" }
        });
      }
      if (request.method === "DELETE") {          // step back out of owner mode
        return new Response(JSON.stringify({ ok: true, owner: !env.OWNER_PASSCODE }), {
          headers: { ...JSON_HEADERS,
            "set-cookie": OWNER_COOKIE + "=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=Lax" }
        });
      }
      return json({ error: "Method not allowed" }, 405);
    }

    // ---- Your Family content ---------------------------------------------
    // Reads are open to anyone past the app passcode; every write checks isOwner.
    if (url.pathname === "/api/family") {
      if (!(await isAuthed(request, env))) return json({ error: "Locked" }, 401);
      if (!env.DB) return json({ error: "No D1 binding named DB" }, 500);
      await ensureTable(env);

      if (request.method === "GET") {
        const rows = await env.DB.prepare(
          "SELECT payload FROM family WHERE id NOT LIKE '%:deleted' ORDER BY sortkey DESC, created DESC"
        ).all();
        const items = (rows.results || []).map(r => {
          try { return JSON.parse(r.payload); } catch (e) { return null; }
        }).filter(Boolean);
        return json({ schema: FAMILY_SCHEMA, count: items.length, items,
                      owner: await isOwner(request, env), configured: !!env.OWNER_PASSCODE });
      }

      if (!(await isOwner(request, env))) {
        return json({ error: "Only the owner can change this page" }, 403);
      }

      if (request.method === "POST" || request.method === "PATCH") {
        let b; try { b = await request.json(); } catch (e) { return json({ error: "Bad JSON" }, 400); }
        const kind = famClean(b.kind, 20);
        let existing = null;
        if (request.method === "PATCH") {
          const row = await env.DB.prepare("SELECT payload FROM family WHERE id = ?")
            .bind(famClean(b.id, 80)).first();
          if (!row) return json({ error: "No such entry" }, 404);
          existing = JSON.parse(row.payload);
        }
        const rec = famRecord(kind || (existing && existing.kind), b, existing);
        if (rec.error) return json({ error: rec.error }, 400);
        const payload = JSON.stringify(rec);
        if (payload.length > FAMILY_MAX_BYTES) {
          return json({ error: "That entry is too large to store. Try a smaller photo." }, 413);
        }
        const sortkey = (rec.kind === "photo" && rec.date) ? rec.date : rec.created;
        await env.DB.prepare(
          "INSERT INTO family (id, kind, created, sortkey, payload) VALUES (?, ?, ?, ?, ?) " +
          "ON CONFLICT(id) DO UPDATE SET kind = excluded.kind, sortkey = excluded.sortkey, " +
          "payload = excluded.payload"
        ).bind(rec.id, rec.kind, rec.created, sortkey, payload).run();
        // TODO(github-sync): also commit family/<kind>/<id>.json once the repo exists.
        const sync = await syncToGitHub(env, rec);
        return json({ ok: true, item: rec, sync });
      }

      if (request.method === "DELETE") {
        const id = famClean(url.searchParams.get("id"), 80);
        if (!id) return json({ error: "No id given" }, 400);
        await env.DB.prepare("DELETE FROM family WHERE id = ?").bind(id).run();
        if (id === FAMILY_SEED_ID) {              // remember, so it is not re-seeded
          await env.DB.prepare(
            "INSERT OR IGNORE INTO family (id, kind, created, sortkey, payload) VALUES (?,?,?,?,?)"
          ).bind(id + ":deleted", "tombstone", new Date().toISOString(), "", "{}").run();
        }
        return json({ ok: true });
      }
      return json({ error: "Method not allowed" }, 405);
    }

    if (url.pathname === "/api/history") {
      if (!(await isAuthed(request, env))) return json({ error: "Locked" }, 401);
      if (!env.DB) return json({ error: "No D1 binding named DB" }, 500);
      try {
        await ensureTable(env);
        if (request.method === "GET") {
          const rs = await env.DB.prepare(
            "SELECT id, t, by_id, steps, day1, title FROM history ORDER BY id DESC LIMIT 80"
          ).all();
          return json({ entries: rs.results || [] });
        }
        if (request.method === "POST") {
          const body = await request.json();
          const want = await env.DB.prepare("SELECT data FROM history WHERE id = ?")
            .bind(Number(body && body.id)).first();
          if (!want) return json({ error: "That restore point is gone" }, 404);
          const now = (/* @__PURE__ */ new Date()).toISOString();
          const prev = await env.DB.prepare("SELECT t, by_id, data FROM timeline WHERE id = 1").first();
          await snapshot(env, prev, now, true);   // restoring is itself undoable
          await env.DB.prepare(
            "UPDATE timeline SET v = v + 1, t = ?, by_id = ?, data = ? WHERE id = 1"
          ).bind(now, String((body && body.by) || "restore"), want.data).run();
          const row = await env.DB.prepare("SELECT v, t FROM timeline WHERE id = 1").first();
          return json({ v: row.v, t: row.t, d: JSON.parse(want.data) });
        }
        return json({ error: "Method not allowed" }, 405);
      } catch (err) {
        return json({ error: String(err && err.message || err) }, 500);
      }
    }

    if (url.pathname === "/api/state") {
      if (!await isAuthed(request, env)) return json({ error: "Locked" }, 401);
      if (!env.DB) {
        return json({ error: "No D1 binding named DB. Add it in Settings > Bindings." }, 500);
      }
      try {
        await ensureTable(env);
        if (request.method === "GET") {
          const row = await env.DB.prepare("SELECT v, t, by_id, data FROM timeline WHERE id = 1").first();
          if (!row) return json({ v: 0, t: null, by: null, d: null });
          return json({ v: row.v, t: row.t, by: row.by_id, d: JSON.parse(row.data) });
        }
        if (request.method === "PUT") {
          const body = await request.json();
          if (!body || !body.d) return json({ error: "Missing timeline data" }, 400);
          const now = (/* @__PURE__ */ new Date()).toISOString();
          const prev = await env.DB.prepare("SELECT t, by_id, data FROM timeline WHERE id = 1").first();
          const stale = !!(body.base && prev && prev.t && body.base !== prev.t);
          await snapshot(env, prev, now, false);
          await env.DB.prepare(
            "INSERT INTO timeline (id, v, t, by_id, data) VALUES (1, 1, ?, ?, ?) ON CONFLICT(id) DO UPDATE SET v = v + 1, t = excluded.t, by_id = excluded.by_id, data = excluded.data"
          ).bind(now, String(body.by || ""), JSON.stringify(body.d)).run();
          const row = await env.DB.prepare("SELECT v, t FROM timeline WHERE id = 1").first();
          return json({ v: row.v, t: row.t, stale });
        }
        return json({ error: "Method not allowed" }, 405);
      } catch (err) {
        return json({ error: String(err && err.message || err) }, 500);
      }
    }
    const open = await isAuthed(request, env);
    const html = open ? await loadPage(env) : LOCK;
    return new Response(html, {
      status: open ? 200 : 401,
      headers: {
        "content-type": "text/html; charset=utf-8",
        "cache-control": "no-store",
        "referrer-policy": "no-referrer",
        "x-robots-tag": "noindex, nofollow"
      }
    });
  }
};

export { worker_default as default };
