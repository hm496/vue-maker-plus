module.exports = (options) => {
  console.log('options', options);
  return {
    doNotCopyFiles: [
      'src/pkg'
    ],
    // 优先级设置为默认值
    data: {
      projectName: '123XXXX'
    }
  }
}
