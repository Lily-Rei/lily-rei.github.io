document.addEventListener("DOMContentLoaded", () => {
  const allowedHosts = [
    "lily-rei.github.io",
    "www.lily-rei.github.io",
    "localhost",
    "127.0.0.1"
  ];

  const container = document.getElementById("terminal-app");
  if (!container) return;

  if (!allowedHosts.includes(window.location.hostname)) {
    container.innerHTML = "<pre>[ terminal disabled: unauthorized host ]</pre>";
    return;
  }

  if (typeof Terminal === "undefined") {
    container.innerHTML = "<pre>[ xterm.js failed to load ]</pre>";
    return;
  }

  const colors = {
    bg: "#0b0f14",
    fg: "#d7e3ee",
    muted: "#8aa1b4",
    green: "#8de7c7",
    blue: "#6dcff6",
    cyan: "#63f2f1",
    red: "#ff6b81",
    yellow: "#ffd166"
  };

  const term = new Terminal({
    cursorBlink: true,
    cursorStyle: "block",
    convertEol: true,
    fontFamily: '"Fira Code", "Cascadia Code", "JetBrains Mono", "Consolas", monospace',
    fontSize: 15,
    lineHeight: 1.2,
    letterSpacing: 0.2,
    rows: 22,
    theme: {
      background: colors.bg,
      foreground: colors.fg,
      cursor: colors.green,
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
  const magenta = (s) => `${esc("1;35")}${s}${reset()}`;
  const gray = (s) => `${esc("0;37")}${s}${reset()}`;

  const ROOT_PASSWORD = "lily-rei.github.io@root";
  const OPS_TOKEN = "operator-v1";

  let currentUser = "lily";
  let currentHost = "lily-rei.github.io";
  let currentPath = ["~"];
  let currentLine = "";
  let awaitingPasswordFor = null;

  let inviteUnlocked = false;
  let rootMode = false;
  let opsUnlocked = false;

  const history = [];

  const fs = {
    "~": {
      type: "dir",
      children: {
        "writeups": { type: "link", target: "/writeups/" },
        "challenges": { type: "link", target: "/challenges/" },
        "labs": { type: "link", target: "/labs/" },
        "resources": { type: "link", target: "/resources/" },

        "readme.txt": {
          type: "file",
          mime: "text/plain",
          content: [
            "Welcome to the operator shell.",
            "Start with the obvious. Then stop trusting the obvious.",
            "",
            "Try:",
            "  ls",
            "  ls -a",
            "  cat notes.txt",
            "  motd"
          ]
        },

        "notes.txt": {
          type: "file",
          mime: "text/plain",
          content: [
            "Most people never check dotfiles.",
            "That is usually where the interesting things start.",
            "",
            "Some files want to be read.",
            "Some want to be inspected."
          ]
        },

        "artifact.bin": {
          type: "file",
          mime: "application/octet-stream",
          content: [
            "ELF...",
            "operator",
            "build.break.teach",
            "invite",
            "lily-rei.github.io@root",
            "/ops/"
          ],
          strings: [
            "operator",
            "build.break.teach",
            "invite",
            "lily-rei.github.io@root",
            "/ops/"
          ]
        },

        ".hidden": {
          type: "dir",
          hidden: true,
          children: {
            "signal.log": {
              type: "file",
              mime: "text/plain",
              content: [
                "[signal] recovered phrase fragment: build.break.teach",
                "[signal] use: unlock <phrase>"
              ]
            },
            "creds.txt": {
              type: "file",
              mime: "text/plain",
              content: [
                "Nothing useful here.",
                "At least not for people who stop reading early.",
                "",
                "root password:",
                "bGlseS1yZWkuZ2l0aHViLmlvQHJvb3Q="
              ]
            }
          }
        },

        ".invite": {
          type: "dir",
          hidden: true,
          children: {
            "drop.txt": {
              type: "file",
              mime: "text/plain",
              content: [
                "You found the operator path.",
                "",
                "This terminal occasionally exposes challenge drops,",
                "private breadcrumbs, and early access material.",
                "",
                "Use 'invite' after unlocking access."
              ]
            }
          }
        },

        ".ops": {
          type: "dir",
          hidden: true,
          children: {
            "access.txt": {
              type: "file",
              mime: "text/plain",
              content: [
                "Operator access acknowledged.",
                "",
                "You were curious enough to keep digging.",
                "Good.",
                "",
                "The next drop will not announce itself loudly."
              ]
            },
            "briefing.txt": {
              type: "file",
              mime: "text/plain",
              content: [
                "CTF intake note:",
                "- challenge work",
                "- lab testing",
                "- command line fluency",
                "- attention to detail",
                "",
                "Not everything worth finding is linked in the nav."
              ]
            }
          }
        }
      }
    }
  };

  function writeLines(lines) {
    lines.forEach(line => term.writeln(line));
  }

  function getPromptPath() {
    return currentPath.join("/");
  }

  function showPrompt() {
    const symbol = rootMode ? "#" : "$";
    term.write(
      `${cyan(currentUser)}@${green(currentHost)}:${blue(getPromptPath())}${green(symbol + " ")}`
    );
  }

  function getNode(pathArr) {
    let node = fs["~"];
    if (pathArr.length === 1 && pathArr[0] === "~") return node;

    for (let i = 1; i < pathArr.length; i++) {
      const part = pathArr[i];
      if (!node || node.type !== "dir" || !node.children[part]) return null;
      node = node.children[part];
    }
    return node;
  }

  function resolvePath(input) {
    if (!input || input === "~") return ["~"];

    let parts;
    if (input.startsWith("~/")) {
      parts = ["~", ...input.slice(2).split("/")];
    } else if (input.startsWith("/")) {
      parts = ["~", ...input.slice(1).split("/")];
    } else {
      parts = [...currentPath, ...input.split("/")];
    }

    const resolved = [];
    for (const part of parts) {
      if (!part || part === ".") continue;
      if (part === "..") {
        if (resolved.length > 1) resolved.pop();
        continue;
      }
      if (resolved.length === 0 && part !== "~") {
        resolved.push("~");
      }
      resolved.push(part);
    }

    if (resolved.length === 0) return ["~"];
    if (resolved[0] !== "~") resolved.unshift("~");
    return resolved;
  }

  function getEntry(name) {
    const node = getNode(currentPath);
    if (!node || node.type !== "dir") return null;

    if (name === ".") return node;
    if (name === "..") return getNode(resolvePath(".."));
    return node.children[name] || null;
  }

  function listDir(node, showAll = false) {
    if (!node || node.type !== "dir") return [red("not a directory")];

    const names = Object.keys(node.children)
      .filter(name => showAll || !node.children[name].hidden)
      .sort((a, b) => a.localeCompare(b));

    const out = [];
    if (showAll) {
      out.push(blue("."));
      out.push(blue(".."));
    }

    for (const name of names) {
      const entry = node.children[name];
      if (entry.type === "dir" || entry.type === "link") {
        out.push(blue(name + "/"));
      } else {
        out.push(name);
      }
    }

    return out;
  }

  function catFile(name) {
    const entry = getEntry(name);
    if (!entry) return [red(`cat: ${name}: No such file or directory`)];
    if (entry.type !== "file") return [red(`cat: ${name}: Not a file`)];
    return entry.content;
  }

  function fileInfo(name) {
    const entry = getEntry(name);
    if (!entry) return [red(`file: ${name}: No such file or directory`)];

    if (entry.type === "dir") return [`${name}: directory`];
    if (entry.type === "link") return [`${name}: symbolic link to ${entry.target}`];
    return [`${name}: ${entry.mime || "data"}`];
  }

  function base64Decode(text) {
    try {
      return atob(text.trim());
    } catch {
      return null;
    }
  }

  function decodeFile(name) {
    const entry = getEntry(name);
    if (!entry) return [red(`base64: ${name}: No such file or directory`)];
    if (entry.type !== "file") return [red(`base64: ${name}: Not a file`)];

    const lines = entry.content.map(line => {
      const decoded = base64Decode(line);
      return decoded !== null ? decoded : line;
    });

    return lines;
  }

  function doOpen(name) {
    if (name === "ops") {
      if (!inviteUnlocked) {
        term.writeln(red("open: ops: access denied"));
        return;
      }
      localStorage.setItem("ops_access", OPS_TOKEN);
      term.writeln(gray("Opening /ops/ ..."));
      window.location.href = "/ops/";
      return;
    }

    const entry = getEntry(name);

    if (!entry) {
      term.writeln(red(`open: ${name}: No such file or directory`));
      return;
    }

    if (entry.type === "link") {
      term.writeln(gray(`Opening ${entry.target} ...`));
      window.location.href = entry.target;
      return;
    }

    if (name === "." || name === "..") {
      const targetPath = resolvePath(name).join("/");
      term.writeln(gray(`Staying within shell context: ${targetPath}`));
      return;
    }

    term.writeln(yellow(`open: ${name} is not a navigable link`));
  }

  function unlockOps() {
    if (!rootMode) return [red("ops: permission denied")];
    opsUnlocked = true;
    return [
      green("Operator channel unlocked."),
      "Hidden path revealed: .ops/",
      "Additional route available after invite unlock."
    ];
  }

  const commands = {
    help: () => [
      green("Available commands:"),
      "  help",
      "  ls",
      "  ls -a",
      "  cd <dir>",
      "  pwd",
      "  cat <file>",
      "  file <name>",
      "  open <dir>",
      "  base64 -d <file>",
      "  clear",
      "  history",
      "  whoami",
      "  about",
      "  motd",
      "  home",
      "  repo",
      "  su",
      "  sudo",
      "",
      gray("Not everything is listed.")
    ],

    pwd: () => [getPromptPath()],

    whoami: () => [currentUser],

    about: () => [
      "Practical cybersecurity. No fluff.",
      "Write-ups, labs, custom challenges, technical notes, and student resources."
    ],

    motd: () => [
      magenta("Message of the day"),
      "----------------------------------------",
      "Build with intent.",
      "Break with method.",
      "Teach with receipts."
    ],

    history: () => {
      if (!history.length) return [gray("history is empty")];
      return history.map((cmd, idx) => `${idx + 1}  ${cmd}`);
    },

    home: () => {
      window.location.href = "/";
      return ["Opening / ..."];
    },

    repo: () => {
      window.open("https://github.com/Lily-Rei/lily-rei.github.io", "_blank");
      return ["Opening repository ..."];
    },

    invite: () => {
      if (!inviteUnlocked) return [red("invite: access denied")];

      localStorage.setItem("ops_access", OPS_TOKEN);

      return [
        green("Invitation path discovered."),
        "",
        "Operator route unlocked.",
        "Real page available: /ops/",
        "Use: open ops"
      ];
    },

    unlock: (args) => {
      const phrase = args.join(" ");
      if (phrase === "build.break.teach") {
        inviteUnlocked = true;
        return [
          green("Access granted."),
          "New command unlocked: invite"
        ];
      }
      return [red("unlock: invalid phrase")];
    },

    su: (args) => {
      const target = args[0] || "root";
      if (target !== "root") {
        return [red(`su: user ${target} does not exist`)];
      }
      awaitingPasswordFor = "root";
      return ["Password: "];
    },

    sudo: (args) => {
      if (!args.length) {
        return [yellow("usage: sudo <command>")];
      }

      if (!rootMode) {
        if (args[0] === "su" || args[0] === "ops") {
          return [
            red("sudo: a password is required"),
            gray("Hint: there may already be credentials somewhere in the filesystem.")
          ];
        }
        return [red("sudo: permission denied")];
      }

      if (args[0] === "ops") {
        return unlockOps();
      }

      return [gray(`sudo: ${args.join(" ")} executed in simulation mode`)];
    }
  };

  function runCommand(input) {
    if (awaitingPasswordFor === "root") {
      if (input === ROOT_PASSWORD) {
        awaitingPasswordFor = null;
        rootMode = true;
        currentUser = "root";
        currentHost = "lily-rei.github.io";
        return [
          green("Authentication successful."),
          gray("Operator privileges elevated.")
        ];
      }
      awaitingPasswordFor = null;
      return [red("su: Authentication failure")];
    }

    const trimmed = input.trim();
    if (!trimmed) return [];

    history.push(trimmed);

    const parts = trimmed.split(/\s+/);
    const cmd = parts[0].toLowerCase();
    const args = parts.slice(1);

    if (cmd === "clear") {
      term.clear();
      if (fitAddon) fitAddon.fit();
      return [];
    }

    if (cmd === "ls") {
      const showAll = args.includes("-a");
      const node = getNode(currentPath);
      const lines = listDir(node, showAll);

      if (opsUnlocked && showAll && currentPath.length === 1 && currentPath[0] === "~") {
        return lines;
      }

      return lines.filter(line => opsUnlocked || !line.includes(".ops/"));
    }

    if (cmd === "cd") {
      const target = args[0] || "~";
      const resolved = resolvePath(target);
      const node = getNode(resolved);

      if (!node) return [red(`cd: ${target}: No such file or directory`)];
      if (node.type !== "dir") return [red(`cd: ${target}: Not a directory`)];
      if (resolved.includes(".ops") && !opsUnlocked) {
        return [red(`cd: ${target}: Permission denied`)];
      }

      currentPath = resolved;
      return [];
    }

    if (cmd === "cat") {
      if (!args[0]) return [red("cat: missing file operand")];
      return catFile(args[0]);
    }

    if (cmd === "file") {
      if (!args[0]) return [red("file: missing operand")];
      return fileInfo(args[0]);
    }

    if (cmd === "base64") {
      if (args[0] !== "-d" || !args[1]) {
        return [yellow("usage: base64 -d <file>")];
      }
      return decodeFile(args[1]);
    }

    if (cmd === "open") {
      if (!args[0]) return [red("open: missing target")];
      doOpen(args[0]);
      return [];
    }

    if (cmd === "find") {
      const base = [
        gray("./writeups"),
        gray("./challenges"),
        gray("./labs"),
        gray("./resources"),
        gray("./.hidden"),
        gray("./.invite")
      ];

      if (opsUnlocked) base.push(gray("./.ops"));
      return base;
    }

    if (cmd === "strings") {
      if (!args[0]) return [red("strings: missing operand")];

      const entry = getEntry(args[0]);
      if (!entry) return [red(`strings: ${args[0]}: No such file or directory`)];
      if (entry.type !== "file") return [red(`strings: ${args[0]}: Not a file`)];

      if (entry.strings) return entry.strings;
      return entry.content.filter(line => typeof line === "string");
    }

    if (cmd === "ops") {
      return unlockOps();
    }

    if (commands[cmd]) {
      return commands[cmd](args);
    }

    return [red("command not found:") + ` ${cmd}`];
  }

  writeLines([
    green("┌──────────────────────────────┐"),
    `${green("│")} ${cyan("Lily Rei Terminal")}           ${green(" │")}`,
    `${green("│")} ${gray("build. break. teach.")}       ${green("  │")}`,
    green("└──────────────────────────────┘"),
    gray("Type 'help' to begin."),
    ""
  ]);

  showPrompt();

  term.onData((data) => {
    const code = data.charCodeAt(0);

    if (code === 13) {
      const submitted = currentLine;
      term.writeln("");
      const output = runCommand(submitted);
      if (output.length) writeLines(output);
      currentLine = "";
      showPrompt();
      return;
    }

    if (code === 127) {
      if (currentLine.length > 0) {
        currentLine = currentLine.slice(0, -1);
        term.write("\b \b");
      }
      return;
    }

    if (code < 32) return;

    currentLine += data;

    if (awaitingPasswordFor === "root") {
      term.write("*");
    } else {
      term.write(data);
    }
  });

  window.addEventListener("resize", () => {
    if (fitAddon) fitAddon.fit();
  });
});