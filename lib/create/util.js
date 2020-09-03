const fs = require('fs-extra');
const path = require('path');

function readDirWithFileTypes (floder) {
  const list = fs.readdirSync(floder)
  const res = list.map(name => {
    const stat = fs.statSync(path.join(floder, name))
    return {
      name,
      isDirectory: stat.isDirectory(),
      isFile: stat.isFile()
    }
  })
  return res
}

exports.readDirWithFileTypes = readDirWithFileTypes;

const dirFilter = ['.git', 'node_modules'];

async function getAllFilesInFloder (floder, filter) {
  let files = []
  const list = readDirWithFileTypes(floder)
  await Promise.all(
    list.map(async item => {
      const itemPath = path.join(floder, item.name)
      if (item.isDirectory && !dirFilter.includes(item.name)) {
        const _files = await getAllFilesInFloder(itemPath, filter)
        files = [...files, ..._files]
      } else if (item.isFile) {
        if (!filter.includes(item.name)) files.push(itemPath)
      }
    })
  )

  return files
}

exports.getAllFilesInFloder = getAllFilesInFloder;

// getAllFilesInFloder(path.join(__dirname, '../../.vue-project-templates/aHR0cHM6Ly9naXRlZS5jb20vaG00OTYvdnVlLXByb2plY3QtdGVtcGxhdGVzLmdpdA=='), [
//   '.DS_Store',
//   '.npmrc'
// ]).then(res => {
//   console.log(res)
// });
