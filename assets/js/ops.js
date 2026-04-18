document.addEventListener("DOMContentLoaded", async () => {
  const container = document.getElementById("ops-terminal");
  const challengeList = document.getElementById("ops-challenge-list");
  if (!container) return;

  const term = new Terminal({
    cursorBlink: true,
    cursorStyle: "block",
    convertEol: true,
    fontFamily: '"Fira Code", "Cascadia Code", "JetBrains Mono", "Consolas", monospace',
    fontSize: 15,
    lineHeight: 1.2,
    letterSpacing: 0.2,
    rows: 24,
    theme: {
      background: "#0b0f14",
      foreground: "#d7e3ee",
      cursor: "#8de7c7",
      selectionBackground: "rgba(141, 231, 199, 0.25)",
      black: "#1a222d",
      red: "#ff6b81",
      green: "#8de7c7",
      yellow: "#ffd166",
      blue: "#6dcff6",
      magenta: "#c792ea",
      cyan: "#63f2f1",
      white: "#d7e3ee",
      brightBlack: "#4b5b6a",
      brightRed: "#ff8fa3",
      brightGreen: "#b7f7e5",
      brightYellow: "#ffe29a",
      brightBlue: "#9ce3ff",
      brightMagenta: "#ddb7ff",
      brightCyan: "#9af9f8",
      brightWhite: "#f4f8fb"
    }
  });

  term.open(container);

  let fitAddon = null;
  if (typeof FitAddon !== "undefined" && typeof FitAddon.FitAddon === "function") {
    fitAddon = new FitAddon.FitAddon();
    term.loadAddon(fitAddon);
    fitAddon.fit();
  }

  const esc = (code) => `\x1b[${code}m`;
  const reset = () => "\x1b[0m";
  const blue = (s) => `${esc("1;34")}${s}${reset()}`;
  const green = (s) => `${esc("1;32")}${s}${reset()}`;
  const cyan = (s) => `${esc("1;36")}${s}${reset()}`;
  const red = (s) => `${esc("1;31")}${s}${reset()}`;
  const yellow = (s) => `${esc("1;33")}${s}${reset()}`;
  const gray = (s) => `${esc("0;37")}${s}${reset()}`;

  const state = {
    currentUser: "operator",
    currentHost: "ops",
    currentLine: "",
    history: [],
    selectedChallenge: null,
    scenario: null
  };

  let challengeCatalog = { challenges: [] };

  const moduleLoaders = {
    nmap: () => import("/assets/js/ops/modules/nmap.js"),
    ping: () => import("/assets/js/ops/modules/ping.js"),
    curl: () => import("/assets/js/ops/modules/curl.js"),
    file: () => import("/assets/js/ops/modules/file.js"),
    strings: () => import("/assets/js/ops/modules/strings.js")
  };

  async function loadJSON(path) {
    const res = await fetch(path, { cache: "no-store" });
    if (!res.ok) throw new Error(`Failed to load ${path}`);
    return await res.json();
  }

  function writeLines(lines) {
    lines.forEach(line => term.writeln(line));
  }

  function promptPath() {
    if (!state.selectedChallenge) return "~";
    return `~/scenarios/${state.selectedChallenge.slug}`;
  }

  function showPrompt() {
    term.write(
      `${cyan(state.currentUser)}@${green(state.currentHost)}:${blue(promptPath())}${green("$ ")}`
    );
  }

  function parseInput(input) {
    const parts = input.trim().split(/\s+/);
    return {
      cmd: (parts[0] || "").toLowerCase(),
      args: parts.slice(1)
    };
  }

  function renderChallengeList() {
    if (!challengeList) return;

    if (!challengeCatalog.challenges.length) {
      challengeList.innerHTML = "<p>No challenges loaded.</p>";
      return;
    }

    const html = challengeCatalog.challenges.map(ch => `
      <div class="ops-challenge-card">
        <h3>${ch.name}</h3>
        <p>${ch.description}</p>
        <p><strong>Difficulty:</strong> ${ch.difficulty}</p>
        <p><strong>Type:</strong> ${ch.type}</p>
        <p><code>use ${ch.slug}</code></p>
      </div>
    `).join("");

    challengeList.innerHTML = html;
  }

  async function loadChallengeCatalog() {
    challengeCatalog = await loadJSON("/assets/js/ops/challenges/index.json");
    renderChallengeList();
  }

  async function loadChallenge(slug) {
    const match = challengeCatalog.challenges.find(c => c.slug === slug);
    if (!match) {
      return [red(`challenge not found: ${slug}`)];
    }

    const scenario = await loadJSON(match.scenario);
    state.selectedChallenge = match;
    state.scenario = scenario;

    return [
      green(`Loaded challenge: ${match.name}`),
      gray(match.description),
      "",
      `Scenario: ${match.slug}`,
      `Type: ${match.type}`,
      `Difficulty: ${match.difficulty}`,
      ...(scenario.briefing?.scope ? [`Scope: ${scenario.briefing.scope}`] : []),
      ...(scenario.briefing?.objective ? [`Objective: ${scenario.briefing.objective}`] : []),
      ...(scenario.briefing?.hint ? [`Hint: ${scenario.briefing.hint}`] : []),
      "",
      ...(scenario.briefing?.scope
        ? [gray(`Try: nmap -sn ${scenario.briefing.scope}`)]
        : [gray("Try: help, then begin enumerating")])
    ];
  }

  function listScenarioFiles() {
    if (!state.scenario) {
      return [yellow("No challenge loaded. Use: challenges, then use <challenge-slug>")];
    }

    const fileNames = Object.keys(state.scenario.files || {}).sort();

    if (!fileNames.length) {
      return [gray("No scenario files exposed.")];
    }

    return fileNames;
  }

  const builtins = {
    help: async () => [
      green("Available commands:"),
      "  help",
      "  clear",
      "  history",
      "  challenges",
      "  use <challenge-slug>",
      "  status",
      "  whoami",
      "  pwd",
      "  ls",
      "  nmap",
      "  ping",
      "  curl",
      "  file",
      "  strings",
      "",
      gray("Some commands depend on a loaded challenge.")
    ],

    clear: async () => {
      term.clear();
      if (fitAddon) fitAddon.fit();
      return [];
    },

    history: async () => {
      if (!state.history.length) return [gray("history is empty")];
      return state.history.map((cmd, idx) => `${idx + 1}  ${cmd}`);
    },

    whoami: async () => [state.currentUser],

    pwd: async () => [promptPath()],

    ls: async () => listScenarioFiles(),

    status: async () => [
      `user: ${state.currentUser}`,
      `host: ${state.currentHost}`,
      `challenge: ${state.selectedChallenge ? state.selectedChallenge.slug : "none"}`,
      `scenario loaded: ${state.scenario ? "yes" : "no"}`
    ],

    challenges: async () => {
      if (!challengeCatalog.challenges.length) return [yellow("no challenges available")];
      return challengeCatalog.challenges.map(ch =>
        `${green(ch.slug)} - ${ch.name} [${ch.difficulty}]`
      );
    },

    use: async (args) => {
      if (!args[0]) return [yellow("usage: use <challenge-slug>")];
      try {
        return await loadChallenge(args[0]);
      } catch (err) {
        return [red(`failed to load challenge: ${err.message}`)];
      }
    }
  };

  async function runModuleCommand(cmd, args) {
    if (!moduleLoaders[cmd]) {
      return [red(`command not found: ${cmd}`)];
    }

    if (!state.scenario) {
      return [yellow("No challenge loaded. Use: challenges, then use <challenge-slug>")];
    }

    try {
      const mod = await moduleLoaders[cmd]();
      return await mod.default.run({
        args,
        state,
        colors: { blue, green, cyan, red, yellow, gray }
      });
    } catch (err) {
      return [red(`${cmd}: module error: ${err.message}`)];
    }
  }

  async function runCommand(input) {
    const trimmed = input.trim();
    if (!trimmed) return [];

    state.history.push(trimmed);

    const { cmd, args } = parseInput(trimmed);

    if (builtins[cmd]) {
      return await builtins[cmd](args);
    }

    return await runModuleCommand(cmd, args);
  }

  try {
    await loadChallengeCatalog();
  } catch (err) {
    if (challengeList) {
      challengeList.innerHTML = `<p>Failed to load challenges: ${err.message}</p>`;
    }
  }

  writeLines([
    green("┌──────────────────────────────┐"),
    `${green("│")} ${cyan("Operator Console")}            ${green("│")}`,
    `${green("│")} ${gray("earned access only")}         ${green("│")}`,
    green("└──────────────────────────────┘"),
    gray("Type 'challenges' to view available modules."),
    gray("Then load one with: use <challenge-slug>"),
    ""
  ]);

  showPrompt();

  term.onData(async (data) => {
    const code = data.charCodeAt(0);

    if (code === 13) {
      const submitted = state.currentLine;
      term.writeln("");
      const output = await runCommand(submitted);
      if (output.length) writeLines(output);
      state.currentLine = "";
      showPrompt();
      return;
    }

    if (code === 127) {
      if (state.currentLine.length > 0) {
        state.currentLine = state.currentLine.slice(0, -1);
        term.write("\b \b");
      }
      return;
    }

    if (code < 32) return;

    state.currentLine += data;
    term.write(data);
  });

  window.addEventListener("resize", () => {
    if (fitAddon) fitAddon.fit();
  });
});