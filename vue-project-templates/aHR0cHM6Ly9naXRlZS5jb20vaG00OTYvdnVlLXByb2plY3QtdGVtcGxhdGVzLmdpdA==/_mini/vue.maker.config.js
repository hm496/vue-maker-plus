module.exports = (options) => {
  console.log('options', options);
  return {
    doNotCopyFiles: [
      'src/pkg'
    ],
    // 设为默认值
    options: {
      templateSource: '',
      description: '',
      data: {
        projectName: '123XXXX'
      }
    }
  }
}
