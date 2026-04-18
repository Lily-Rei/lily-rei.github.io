---
layout: default
title: Operator Access
permalink: /ops/
---

<script>
(function () {
  const parts = {
    key: ["op", "s_", "ac", "cess"],
    val: ["b3Bl", "cmF0", "b3ItdjE="],
    redir: ["L3Rl", "cm1p", "bmFsLw=="]
  };

  const key = parts.key.join("");
  const expected = atob(parts.val.join(""));
  const redirect = atob(parts.redir.join(""));
  const token = localStorage.getItem(key);

  if (token !== expected) {
    window.location.replace(redirect);
  }
})();
</script>

# Operator Access
> Restricted route discovered through terminal interaction.

<pre><code>$ whoami
operator

$ status
access: granted
channel: quiet
mode: observation
</code></pre>

You made it past the obvious path.

This page is where the public shell stops being a gate and starts becoming a console.

## Challenge Index

<div id="ops-challenge-list" class="ops-panel">
  <p>Loading challenge catalog...</p>
</div>

## Operator Console

<div id="terminal-wrap">
  <div id="ops-terminal"></div>
</div>

<p class="terminal-help">Type <code>help</code> to begin.</p>

## Operator Notes

<pre><code>build with intent
break with method
teach with receipts
</code></pre>

More will appear here when it is time.

<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/xterm/css/xterm.css">
<script src="https://cdn.jsdelivr.net/npm/xterm/lib/xterm.js"></script>
<script src="https://cdn.jsdelivr.net/npm/xterm-addon-fit/lib/xterm-addon-fit.js"></script>
<script type="module" src="{{ '/assets/js/ops.js' | relative_url }}"></script>