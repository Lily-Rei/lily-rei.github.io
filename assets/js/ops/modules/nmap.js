export default {
  async run({ args, state, colors }) {
    const { green, gray, red } = colors;
    const scenario = state.scenario;
    if (!scenario) return [red("nmap: no scenario loaded")];

    const hasPingSweep = args.includes("-sn");
    const hasVersion = args.includes("-sV");
    const hasAggressive = args.includes("-A");

    const target = [...args].reverse().find(arg => !arg.startsWith("-"));
    if (!target) {
      return ["Usage: nmap [-sn|-sV|-A] <target>"];
    }

    if (hasPingSweep) {
      if (!scenario.subnets?.includes(target)) {
        return [red(`Note: Host discovery against ${target} returned no results.`)];
      }

      const lines = [
        "Starting Nmap 7.94 ( https://nmap.org )",
        `Nmap scan report for subnet ${target}`
      ];

      for (const [ip, host] of Object.entries(scenario.hosts || {})) {
        if (host.up) {
          lines.push(`Nmap scan report for ${host.hostname || ip} (${ip})`);
          lines.push("Host is up.");
        }
      }

      lines.push("Nmap done.");
      return lines;
    }

    const host = scenario.hosts?.[target];
    if (!host || !host.up) {
      return [red(`Note: Host ${target} seems down.`)];
    }

    const lines = [
      "Starting Nmap 7.94 ( https://nmap.org )",
      `Nmap scan report for ${host.hostname || target} (${target})`,
      "Host is up.",
      ""
    ];

    if (hasVersion || hasAggressive) {
      lines.push("PORT     STATE SERVICE       VERSION");
    } else {
      lines.push("PORT     STATE SERVICE");
    }

    for (const [port, svc] of Object.entries(host.ports || {})) {
      const stateVal = svc.state || "open";
      const service = svc.service || "unknown";
      const version = svc.version || "";

      if (hasVersion || hasAggressive) {
        lines.push(
          `${String(port).padEnd(8)} ${stateVal.padEnd(5)} ${service.padEnd(12)} ${version}`
        );
      } else {
        lines.push(
          `${String(port).padEnd(8)} ${stateVal.padEnd(5)} ${service}`
        );
      }
    }

    if (hasAggressive && host.os) {
      lines.push("");
      lines.push(green("Host script results:"));
      lines.push(gray(`|_ os: ${host.os}`));
    }

    lines.push("");
    lines.push("Nmap done.");
    return lines;
  }
};