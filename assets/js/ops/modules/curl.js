export default {
  async run({ args, state, colors }) {
    const { red } = colors;
    const scenario = state.scenario;
    if (!scenario) return [red("curl: no scenario loaded")];

    const target = args[0];
    if (!target) return ["usage: curl <url>"];

    for (const host of Object.values(scenario.hosts || {})) {
      const response = host.http?.[target];
      if (response) {
        return response.body || [red(`curl: empty response for ${target}`)];
      }
    }

    return [red(`curl: no canned response for ${target}`)];
  }
};