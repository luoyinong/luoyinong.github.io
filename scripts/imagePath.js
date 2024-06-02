const path = require('node:path')


hexo.extend.filter.register('before_post_render', function(data){
  const filename = path.basename(data.source, '.md')

  data.content = data.content.replace(/@图(\d+)/g, `![图$1](/img/${filename}/$1.webp)`);
  return data;
});