module.exports = () => {
  return {
    cliOptions: {},
    templateSource: '',
    templateName: '',
    templateData: {},
    get prompts() {
      return []
    },
    get doNotCopyFiles() {
      return [
        'pkg'
      ]
    },
  }
};
