module.exports = () => {
  return {
    cliOptions: {},
    doNotCopyFiles() {
      return [
        'src/pkg'
      ]
    },
    templateSource: '',
    templateData: {},
    prompts: [],
  }
};

