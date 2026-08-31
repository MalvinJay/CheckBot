import { readFileSync, writeFileSync } from "node:fs";

function loadResults(path) {
  return JSON.parse(readFileSync(new URL(path, import.meta.url), "utf-8"));
}

const baseline = loadResults("../results/baseline.json");
const final = loadResults("../results/final.json");

const dataPayload = JSON.stringify({ baseline, final });

const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>Support Triage Queue</title>
<style>
  :root {
    --basalt: #15181C;
    --slate: #1E2227;
    --slate-line: #2A2F36;
    --chalk: #ECEEF0;
    --ash: #8D96A0;
    --ember: #E2984B;
    --ember-dim: #4A3A24;
    --moss: #6E9C7D;
    --moss-dim: #263129;
    --rust: #C1543B;
    --font-body: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    --font-mono: ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, "Liberation Mono", monospace;
  }
  * { box-sizing: border-box; }
  body {
    margin: 0;
    background: var(--basalt);
    color: var(--chalk);
    font-family: var(--font-body);
    font-size: 14px;
    line-height: 1.5;
  }
  a { color: inherit; }
  button { font-family: inherit; }

  .topbar {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    padding: 20px 28px;
    border-bottom: 1px solid var(--slate-line);
    flex-wrap: wrap;
    gap: 16px;
  }
  .topbar h1 {
    font-size: 17px;
    font-weight: 600;
    margin: 0;
    letter-spacing: -0.01em;
  }
  .topbar .subtitle {
    color: var(--ash);
    font-size: 13px;
    margin-top: 2px;
  }
  .mode-pill {
    font-family: var(--font-mono);
    font-size: 11px;
    padding: 3px 8px;
    border-radius: 3px;
    border: 1px solid var(--slate-line);
    color: var(--ash);
  }

  .metrics-row {
    display: flex;
    gap: 28px;
  }
  .metric {
    text-align: right;
  }
  .metric .label {
    color: var(--ash);
    font-size: 11px;
  }
  .metric .value {
    font-family: var(--font-mono);
    font-size: 18px;
  }
  .metric .value.better { color: var(--moss); }
  .metric .value.worse { color: var(--rust); }

  .layout {
    display: grid;
    grid-template-columns: 320px 1fr;
    min-height: calc(100vh - 73px);
  }
  @media (max-width: 820px) {
    .layout { grid-template-columns: 1fr; }
  }

  .queue {
    border-right: 1px solid var(--slate-line);
    overflow-y: auto;
  }
  .queue-item {
    display: block;
    width: 100%;
    text-align: left;
    padding: 14px 20px;
    border: none;
    border-bottom: 1px solid var(--slate-line);
    background: transparent;
    color: var(--chalk);
    cursor: pointer;
  }
  .queue-item:hover { background: var(--slate); }
  .queue-item.active { background: var(--slate); box-shadow: inset 3px 0 0 var(--ember); }
  .queue-item .qid {
    font-family: var(--font-mono);
    font-size: 11px;
    color: var(--ash);
  }
  .queue-item .qlabel {
    margin-top: 3px;
    font-size: 13px;
  }
  .queue-item .qbadges {
    margin-top: 8px;
    display: flex;
    gap: 6px;
    flex-wrap: wrap;
  }

  .badge {
    display: inline-block;
    font-size: 11px;
    font-family: var(--font-mono);
    padding: 2px 7px;
    border-radius: 3px;
    border: 1px solid var(--slate-line);
    color: var(--ash);
  }
  .badge.escalate { color: var(--ember); border-color: var(--ember-dim); }
  .badge.bot_continue { color: var(--moss); border-color: var(--moss-dim); }
  .badge.gated { color: var(--ember); border-color: var(--ember-dim); }
  .badge.mismatch { color: var(--rust); border-color: var(--rust); }
  .badge.challenging { color: var(--chalk); }

  .detail { padding: 28px 32px; max-width: 720px; }
  .detail .case-id {
    font-family: var(--font-mono);
    color: var(--ash);
    font-size: 12px;
  }
  .detail h2 {
    margin: 4px 0 4px;
    font-size: 18px;
    font-weight: 600;
  }
  .detail .case-note {
    color: var(--ash);
    font-size: 13px;
    margin-bottom: 20px;
  }

  .transcript {
    display: flex;
    flex-direction: column;
    gap: 8px;
    margin-bottom: 28px;
  }
  .turn {
    max-width: 78%;
    padding: 8px 12px;
    border-radius: 6px;
    font-size: 13.5px;
  }
  .turn.customer {
    align-self: flex-start;
    background: var(--slate);
    border: 1px solid var(--slate-line);
  }
  .turn.bot {
    align-self: flex-end;
    background: #22303A;
    border: 1px solid #2E4653;
  }
  .turn .who {
    font-family: var(--font-mono);
    font-size: 10px;
    color: var(--ash);
    margin-bottom: 3px;
    text-transform: lowercase;
  }

  .pipeline {
    display: flex;
    align-items: stretch;
    gap: 0;
    margin-bottom: 24px;
    border: 1px solid var(--slate-line);
    border-radius: 6px;
    overflow: hidden;
  }
  .pstep {
    flex: 1;
    padding: 14px 16px;
    border-right: 1px solid var(--slate-line);
  }
  .pstep:last-child { border-right: none; }
  .pstep .ptitle {
    font-family: var(--font-mono);
    font-size: 10.5px;
    color: var(--ash);
    margin-bottom: 8px;
  }
  .pstep .pbody { font-size: 12.5px; }
  .pstep .pbody div { margin-bottom: 3px; }
  .pstep.guard {
    background: var(--slate);
  }
  .pstep.guard.pending {
    background: var(--ember-dim);
  }
  .pstep.guard .gate-icon {
    display: inline-block;
    margin-right: 6px;
  }
  .pstep .kv { color: var(--ash); }
  .pstep .kv b { color: var(--chalk); font-weight: 500; }

  .eval-row {
    display: flex;
    gap: 18px;
    font-size: 12.5px;
    color: var(--ash);
    padding-top: 16px;
    border-top: 1px solid var(--slate-line);
  }
  .eval-row b { color: var(--chalk); font-weight: 500; }

  .empty {
    padding: 60px 32px;
    color: var(--ash);
  }
</style>
</head>
<body>
  <div class="topbar">
    <div>
      <h1>Support Triage Queue</h1>
      <div class="subtitle">Escalation decisions made by the agent pipeline, gated for human approval before any consequential action.</div>
    </div>
    <div class="metrics-row" id="metrics"></div>
  </div>
  <div class="layout">
    <div class="queue" id="queue"></div>
    <div class="detail" id="detail"></div>
  </div>

  <script id="triage-data" type="application/json">${dataPayload}</script>
  <script>
    const data = JSON.parse(document.getElementById('triage-data').textContent);
    const cases = data.final.sampleOutputs;
    const baselineById = Object.fromEntries(data.baseline.sampleOutputs.map(c => [c.id, c]));
    const isLive = !(data.final.notes || '').includes('DRY RUN');

    function renderMetrics() {
      const m = data.final.metrics;
      const bm = data.baseline.metrics;
      const el = document.getElementById('metrics');
      const modePill = '<span class="mode-pill">' + (isLive ? 'LIVE' : 'DRY RUN — heuristic stub') + '</span>';
      function metric(label, val, base) {
        const cls = val > base ? 'better' : (val < base ? 'worse' : '');
        return '<div class="metric"><div class="label">' + label + '</div><div class="value ' + cls + '">' + val.toFixed(2) + '</div></div>';
      }
      el.innerHTML = modePill
        + metric('accuracy', m.accuracy, bm.accuracy)
        + metric('recall', m.recall, bm.recall)
        + metric('f1', m.f1, bm.f1);
    }

    function decisionBadge(decision) {
      return '<span class="badge ' + decision + '">' + decision.replace('_', ' ') + '</span>';
    }

    function renderQueue(selectedId) {
      const el = document.getElementById('queue');
      el.innerHTML = cases.map(c => {
        const gated = c.guardStatus === 'pending_human_approval';
        const mismatch = !c.correct;
        const badges = [
          decisionBadge(c.predictedDecision),
          gated ? '<span class="badge gated">pending approval</span>' : '',
          mismatch ? '<span class="badge mismatch">vs. baseline: ' + (baselineById[c.id] ? baselineById[c.id].predictedDecision : '?') + '</span>' : '',
          c.isChallengingCase ? '<span class="badge challenging">challenging case</span>' : '',
        ].filter(Boolean).join('');
        return '<button class="queue-item ' + (c.id === selectedId ? 'active' : '') + '" data-id="' + c.id + '">'
          + '<div class="qid">' + c.id + '</div>'
          + '<div class="qlabel">' + c.label.replace(/_/g, ' ') + '</div>'
          + '<div class="qbadges">' + badges + '</div>'
          + '</button>';
      }).join('');
      el.querySelectorAll('.queue-item').forEach(btn => {
        btn.addEventListener('click', () => selectCase(btn.dataset.id));
      });
    }

    function renderDetail(c) {
      const el = document.getElementById('detail');
      if (!c) { el.innerHTML = '<div class="empty">Select a conversation from the queue.</div>'; return; }

      const transcriptHtml = c.transcript.map(t =>
        '<div class="turn ' + t.from + '"><div class="who">' + t.from + '</div>' + escapeHtml(t.text) + '</div>'
      ).join('');

      const gated = c.guardStatus === 'pending_human_approval';
      const cls = c.classification || {};

      const pipelineHtml = '<div class="pipeline">'
        + '<div class="pstep">'
          + '<div class="ptitle">classify</div>'
          + '<div class="pbody">'
            + '<div class="kv">sentiment <b>' + (cls.sentiment || '—') + '</b></div>'
            + '<div class="kv">urgency <b>' + (cls.urgency || '—') + '</b></div>'
            + '<div class="kv">proposed action <b>' + (cls.proposedAction || 'none') + '</b></div>'
          + '</div>'
        + '</div>'
        + '<div class="pstep">'
          + '<div class="ptitle">decide</div>'
          + '<div class="pbody">'
            + '<div class="kv">decision <b>' + c.predictedDecision.replace('_', ' ') + '</b></div>'
            + '<div class="kv" style="margin-top:6px;">' + escapeHtml(c.escalationReasoning || '') + '</div>'
          + '</div>'
        + '</div>'
        + '<div class="pstep guard ' + (gated ? 'pending' : '') + '">'
          + '<div class="ptitle"><span class="gate-icon">' + (gated ? '&#128274;' : '&#9679;') + '</span>guard</div>'
          + '<div class="pbody">'
            + '<div class="kv"><b>' + (c.guardStatus || 'not_required').replace(/_/g, ' ') + '</b></div>'
            + '<div class="kv" style="margin-top:6px;">' + escapeHtml(c.guardNote || 'No consequential action proposed.') + '</div>'
          + '</div>'
        + '</div>'
      + '</div>';

      const bl = baselineById[c.id];
      const evalHtml = '<div class="eval-row">'
        + '<div>expected: <b>' + c.expectedDecision.replace('_', ' ') + '</b></div>'
        + '<div>agent: <b>' + c.predictedDecision.replace('_', ' ') + '</b> ' + (c.correct ? '(correct)' : '(incorrect)') + '</div>'
        + (bl ? '<div>baseline: <b>' + bl.predictedDecision.replace('_', ' ') + '</b> ' + (bl.correct ? '(correct)' : '(incorrect)') + '</div>' : '')
      + '</div>';

      el.innerHTML = '<div class="case-id">' + c.id + '</div>'
        + '<h2>' + c.label.replace(/_/g, ' ') + '</h2>'
        + (c.note ? '<div class="case-note">' + escapeHtml(c.note) + '</div>' : '')
        + '<div class="transcript">' + transcriptHtml + '</div>'
        + pipelineHtml
        + evalHtml;
    }

    function escapeHtml(s) {
      return String(s).replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
    }

    let selected = cases[0] ? cases[0].id : null;
    function selectCase(id) {
      selected = id;
      renderQueue(selected);
      renderDetail(cases.find(c => c.id === id));
    }

    renderMetrics();
    selectCase(selected);
  </script>
</body>
</html>
`;

writeFileSync(new URL("../dashboard/index.html", import.meta.url), html);
console.log("[dashboard] wrote dashboard/index.html");
