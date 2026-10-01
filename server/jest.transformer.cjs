const ts = require('typescript');

// Compile source in Jest so its native watcher sees saved TypeScript changes.
module.exports = {
  process(sourceText, sourcePath) {
    const result = ts.transpileModule(sourceText, {
      fileName: sourcePath,
      compilerOptions: {
        target: ts.ScriptTarget.ES2022,
        module: ts.ModuleKind.CommonJS,
        esModuleInterop: true,
        sourceMap: true,
        inlineSources: true,
      },
    });
    return { code: result.outputText, map: result.sourceMapText };
  },
};
