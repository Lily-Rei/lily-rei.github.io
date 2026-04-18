export default {
  async run({ args, state, colors }) {
    const { red } = colors;
    const scenario = state.scenario;
    if (!scenario) return [red("ping: no scenario loaded")];

    const target = args[0];
    if (!target) return ["usage: ping <host>"];

    const host = scenario.hosts?.[target];
    if (!host || !host.up) {
      return [
        `PING ${target} (${target}) 56(84) bytes of data.`,
        "",
        `--- ${target} ping statistics ---`,
        "4 packets transmitted, 0 received, 100% packet loss"
      ];
    }

    const times = host.ping?.times || ["0.41", "0.39", "0.44", "0.42"];
    const ttl = host.ping?.ttl || 64;

    return [
      `PING ${target} (${target}) 56(84) bytes of data.`,
      ...times.map((t, i) => `64 bytes from ${target}: icmp_seq=${i + 1} ttl=${ttl} time=${t} ms`),
      "",
      `--- ${target} ping statistics ---`,
      "4 packets transmitted, 4 received, 0% packet loss"
    ];
  }
};