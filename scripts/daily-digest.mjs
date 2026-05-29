#!/usr/bin/env node
// Daily repo-activity digest generator.
//
// Collects the previous calendar day's merged pull requests and direct
// commits to the default branch, categorizes them (features / bug fixes /
// migrations / refactors) using the branch-naming convention from AGENTS.md,
// and writes the email artifacts the workflow sends over SMTP:
//
//   digest-subject.txt   one-line subject
//   digest.html          HTML body
//   digest.txt           plain-text body
//
// It also sets the `has_content` output so the workflow can skip sending on
// quiet days. "The day" is resolved in the repo's timezone (default
// Europe/Paris) so the 8AM-next-morning schedule lines up with local dates.

import { appendFile, writeFile } from "node:fs/promises";

const TZ = process.env.DIGEST_TZ || "Europe/Paris";
const TOKEN = process.env.GITHUB_TOKEN;
const REPO = process.env.GITHUB_REPOSITORY; // "owner/name"
const SEND_IF_EMPTY = /^(1|true|yes)$/i.test(process.env.SEND_IF_EMPTY || "");

if (!REPO) {
  console.error("GITHUB_REPOSITORY is required (e.g. owner/name).");
  process.exit(1);
}
const [OWNER, NAME] = REPO.split("/");
const REPO_URL = `https://github.com/${OWNER}/${NAME}`;

// --- timezone helpers ---------------------------------------------------

// Wall-clock parts of an instant in a given IANA timezone.
function partsInTz(date, timeZone) {
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour12: false,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
  const p = Object.fromEntries(
    fmt.formatToParts(date).map((x) => [x.type, x.value]),
  );
  return {
    year: +p.year,
    month: +p.month,
    day: +p.day,
    // Intl can emit "24" for midnight; normalize to 0.
    hour: +p.hour % 24,
    minute: +p.minute,
    second: +p.second,
  };
}

// The UTC instant corresponding to a given wall-clock time in `timeZone`.
function zonedToUtc(year, month, day, hour, timeZone) {
  const guess = Date.UTC(year, month - 1, day, hour, 0, 0);
  const seen = partsInTz(new Date(guess), timeZone);
  const asUtc = Date.UTC(
    seen.year,
    seen.month - 1,
    seen.day,
    seen.hour,
    seen.minute,
    seen.second,
  );
  // offset = (wall clock interpreted as UTC) - (our guess instant)
  return new Date(guess - (asUtc - guess));
}

// Resolve the target day: yesterday in TZ, unless TARGET_DATE=YYYY-MM-DD is set.
function resolveWindow() {
  let y, m, d;
  if (process.env.TARGET_DATE) {
    [y, m, d] = process.env.TARGET_DATE.split("-").map(Number);
  } else {
    const today = partsInTz(new Date(), TZ);
    // Date-only math via a UTC anchor, then step back one day.
    const anchor = new Date(Date.UTC(today.year, today.month - 1, today.day));
    anchor.setUTCDate(anchor.getUTCDate() - 1);
    y = anchor.getUTCFullYear();
    m = anchor.getUTCMonth() + 1;
    d = anchor.getUTCDate();
  }
  const since = zonedToUtc(y, m, d, 0, TZ);
  const next = new Date(Date.UTC(y, m - 1, d));
  next.setUTCDate(next.getUTCDate() + 1);
  const until = zonedToUtc(
    next.getUTCFullYear(),
    next.getUTCMonth() + 1,
    next.getUTCDate(),
    0,
    TZ,
  );
  return { since, until, label: `${y}-${pad(m)}-${pad(d)}` };
}

const pad = (n) => String(n).padStart(2, "0");

function humanDate(label) {
  const [y, m, d] = label.split("-").map(Number);
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "UTC",
    weekday: "short",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(Date.UTC(y, m - 1, d)));
}

// --- GitHub API ---------------------------------------------------------

async function gh(path, params = {}) {
  const url = new URL(`https://api.github.com${path}`);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  const headers = {
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
    "User-Agent": "cadence-daily-digest",
  };
  if (TOKEN) headers.Authorization = `Bearer ${TOKEN}`;
  const res = await fetch(url, { headers });
  if (!res.ok) {
    throw new Error(`GitHub ${res.status} ${res.statusText} for ${url.pathname}`);
  }
  return res.json();
}

async function defaultBranch() {
  const repo = await gh(`/repos/${OWNER}/${NAME}`);
  return repo.default_branch || "main";
}

// Merged PRs whose merge timestamp falls inside the window.
async function mergedPRs(since, until) {
  const out = [];
  for (let page = 1; page <= 10; page++) {
    const prs = await gh(`/repos/${OWNER}/${NAME}/pulls`, {
      state: "closed",
      sort: "updated",
      direction: "desc",
      per_page: "100",
      page: String(page),
    });
    if (!prs.length) break;
    let allOlder = true;
    for (const pr of prs) {
      const updated = new Date(pr.updated_at);
      if (updated >= since) allOlder = false;
      if (!pr.merged_at) continue;
      const merged = new Date(pr.merged_at);
      if (merged >= since && merged < until) {
        out.push({
          number: pr.number,
          title: pr.title,
          branch: pr.head?.ref || "",
          author: pr.user?.login || "unknown",
          url: pr.html_url,
        });
      }
    }
    // Stop paging once an entire page predates the window.
    if (allOlder) break;
  }
  return out;
}

// Direct commits to the default branch in the window that aren't merge
// commits or squash-merges of a PR we already listed.
async function directCommits(branch, since, until, prNumbers) {
  const commits = await gh(`/repos/${OWNER}/${NAME}/commits`, {
    sha: branch,
    since: since.toISOString(),
    until: until.toISOString(),
    per_page: "100",
  });
  const out = [];
  for (const c of commits) {
    if ((c.parents?.length || 0) > 1) continue; // merge commit
    const msg = (c.commit?.message || "").split("\n")[0];
    if (/^Merge (pull request|branch|remote-tracking)/i.test(msg)) continue;
    const prRef = msg.match(/\(#(\d+)\)\s*$/);
    if (prRef && prNumbers.has(Number(prRef[1]))) continue; // squash-merged PR
    out.push({
      sha: c.sha.slice(0, 7),
      title: msg,
      author: c.author?.login || c.commit?.author?.name || "unknown",
      url: c.html_url,
    });
  }
  return out;
}

// --- categorization ------------------------------------------------------

const CATEGORIES = [
  { key: "feature", label: "✨ New features" },
  { key: "bugfix", label: "🐛 Bug fixes" },
  { key: "migration", label: "🗄️ Migrations" },
  { key: "refacto", label: "🛠️ Refactors" },
  { key: "other", label: "📦 Other changes" },
];

function categorize({ branch = "", title = "" }) {
  const b = branch.toLowerCase();
  if (b.startsWith("feature/")) return "feature";
  if (b.startsWith("bugfix/")) return "bugfix";
  if (b.startsWith("migration/")) return "migration";
  if (b.startsWith("refacto/")) return "refacto";

  const t = title.toLowerCase();
  if (/^(fix|bugfix)[:(\s]|\bbug\b|\bfix(e[sd])?\b/.test(t)) return "bugfix";
  if (/^migrat|^(feat|migration)[:(\s]/.test(t)) {
    return /migrat/.test(t) ? "migration" : "feature";
  }
  if (/^(feat|feature)[:(\s]|\b(add|adds|added|new)\b/.test(t)) return "feature";
  if (/^refactor|\brefactor/.test(t)) return "refacto";
  return "other";
}

// --- rendering -----------------------------------------------------------

const esc = (s) =>
  String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

function bucketize(prs, commits) {
  const buckets = Object.fromEntries(CATEGORIES.map((c) => [c.key, []]));
  for (const pr of prs) {
    buckets[categorize(pr)].push({
      kind: "pr",
      ref: `#${pr.number}`,
      ...pr,
    });
  }
  for (const c of commits) {
    buckets[categorize(c)].push({ kind: "commit", ref: c.sha, ...c });
  }
  return buckets;
}

function renderHtml(label, buckets, total) {
  const sections = CATEGORIES.map((cat) => {
    const items = buckets[cat.key];
    if (!items.length) return "";
    const rows = items
      .map(
        (it) =>
          `<li style="margin:6px 0;line-height:1.45">` +
          `<a href="${esc(it.url)}" style="color:#2563eb;text-decoration:none;font-weight:600">${esc(it.ref)}</a> ` +
          `${esc(it.title)} ` +
          `<span style="color:#6b7280">— @${esc(it.author)}</span></li>`,
      )
      .join("");
    return (
      `<h3 style="margin:22px 0 8px;font-size:15px;color:#111827">${cat.label} ` +
      `<span style="color:#9ca3af;font-weight:400">(${items.length})</span></h3>` +
      `<ul style="margin:0;padding-left:18px">${rows}</ul>`
    );
  }).join("");

  return `<!doctype html><html><body style="margin:0;background:#f3f4f6;padding:24px 0;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#111827">
  <div style="max-width:640px;margin:0 auto;background:#ffffff;border:1px solid #e5e7eb;border-radius:12px;overflow:hidden">
    <div style="padding:20px 24px;background:#111827;color:#ffffff">
      <div style="font-size:18px;font-weight:700">Cadence — daily digest</div>
      <div style="font-size:13px;color:#9ca3af;margin-top:2px">Progress on ${esc(humanDate(label))} · ${total} change${total === 1 ? "" : "s"}</div>
    </div>
    <div style="padding:8px 24px 24px">
      ${sections || `<p style="color:#6b7280">No merged pull requests or commits on this day.</p>`}
    </div>
    <div style="padding:16px 24px;border-top:1px solid #e5e7eb;font-size:12px;color:#9ca3af">
      <a href="${esc(REPO_URL)}" style="color:#9ca3af">${esc(OWNER)}/${esc(NAME)}</a> · generated automatically
    </div>
  </div>
</body></html>`;
}

function renderText(label, buckets, total) {
  const lines = [
    `Cadence — daily digest`,
    `Progress on ${humanDate(label)} · ${total} change${total === 1 ? "" : "s"}`,
    "",
  ];
  for (const cat of CATEGORIES) {
    const items = buckets[cat.key];
    if (!items.length) continue;
    lines.push(`${cat.label.replace(/^[^ ]+ /, "")} (${items.length})`);
    for (const it of items) {
      lines.push(`  ${it.ref} ${it.title} — @${it.author}`);
      lines.push(`    ${it.url}`);
    }
    lines.push("");
  }
  if (total === 0) lines.push("No merged pull requests or commits on this day.");
  lines.push(`${REPO_URL}`);
  return lines.join("\n");
}

// --- main ----------------------------------------------------------------

async function setOutput(name, value) {
  if (process.env.GITHUB_OUTPUT) {
    await appendFile(process.env.GITHUB_OUTPUT, `${name}=${value}\n`);
  }
}

async function main() {
  const { since, until, label } = resolveWindow();
  console.log(`Digest window: ${since.toISOString()} → ${until.toISOString()} (${TZ} day ${label})`);

  const branch = await defaultBranch();
  const prs = await mergedPRs(since, until);
  const prNumbers = new Set(prs.map((p) => p.number));
  const commits = await directCommits(branch, since, until, prNumbers);
  const total = prs.length + commits.length;
  console.log(`Found ${prs.length} merged PR(s) and ${commits.length} direct commit(s).`);

  const buckets = bucketize(prs, commits);
  const subject = `Cadence daily digest — ${humanDate(label)} (${total} change${total === 1 ? "" : "s"})`;

  await writeFile("digest-subject.txt", subject);
  await writeFile("digest.html", renderHtml(label, buckets, total));
  await writeFile("digest.txt", renderText(label, buckets, total));

  const hasContent = total > 0 || SEND_IF_EMPTY;
  await setOutput("has_content", hasContent ? "true" : "false");
  await setOutput("total", String(total));
  console.log(hasContent ? "Digest ready to send." : "Nothing to report; send will be skipped.");
}

main().catch(async (err) => {
  console.error(err);
  await setOutput("has_content", "false");
  process.exit(1);
});
