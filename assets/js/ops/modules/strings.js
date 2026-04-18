export default {
  async run({ args, state, colors }) {
    const { red } = colors;
    const scenario = state.scenario;
    if (!scenario) return [red("strings: no scenario loaded")];

    const name = args[0];
    if (!name) return ["usage: strings <file>"];

    const file = scenario.files?.[name];
    if (!file) return [red(`strings: ${name}: No such file`)];

    return file.strings || [red(`strings: ${name}: no extractable strings`)];
  }
};