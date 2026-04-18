export default {
  async run({ args, state, colors }) {
    const { red } = colors;
    const scenario = state.scenario;
    if (!scenario) return [red("file: no scenario loaded")];

    const name = args[0];
    if (!name) return ["usage: file <name>"];

    const file = scenario.files?.[name];
    if (!file) return [red(`file: cannot open '${name}'`)];

    return [`${name}: ${file.mime || "data"}`];
  }
};