const fs = require('fs');
const url = require('url');
const path = require('path');
const rootPath = require('app-root-path');
const formidable = require('formidable');
const bodyParser = require('body-parser');
const { v4: uuidv4 } = require('uuid');
const express = require('express');
const app = express();
app.use(bodyParser.urlencoded());
const port = 8765;
const mime = {
  css: 'text/css',
  gif: 'image/gif',
  html: 'text/html',
  ico: 'image/x-icon',
  jpeg: 'image/jpeg',
  jpg: 'image/jpeg',
  js: 'text/javascript',
  json: 'application/json',
  pdf: 'application/pdf',
  png: 'image/png',
  svg: 'image/svg+xml',
  swf: 'application/x-shockwave-flash',
  tiff: 'image/tiff',
  txt: 'text/plain',
  wav: 'audio/x-wav',
  wma: 'audio/x-ms-wma',
  wmv: 'video/x-ms-wmv',
  xml: 'text/xml',
};

app.all('*', (req, res, next) => {
  let { pathname } = url.parse(req.url);
  pathname = decodeURI(pathname);
  if (pathname === '/') {
    fs.createReadStream('index.html').pipe(res);
  } else if (pathname.startsWith('/upload')) {
    const form = new formidable.IncomingForm();
    form.keepExtensions = true; // 保留文件扩展名
    form.uploadDir = path.join(rootPath.path, '\\src\\temp'); // 临时存储路径
    // 数据解析
    form.parse(req, function (err, fileds, files) {
      if (err) {
        throw err;
      }
      const file = files.file;
      const name = file.name;
      const extensions = name.split('.').pop();
      const fileName = `${uuidv4()}.${extensions}`;
      const filePath = file.path;
      // 从临时存储路径中读取文件
      const data = fs.readFileSync(filePath);
      // 将读取文件保存到新的位置
      fs.writeFile(
        path.join(rootPath.path, '\\file\\') + fileName,
        data,
        function (err) {
          if (err) {
            return console.log(err);
          }
          console.log(req);
          // 删除临时文件
          fs.unlink(filePath, function () {});
          // 返回文件服务器中该文件的url
          res.json(`http://${req.host}:${port}/file/${fileName}`);
        }
      );
    });
  } else if (pathname.startsWith('/file')) {
    // 如果既不是访问路径，也不是访问文件，则进行重定向，访问路径
    if (!pathname.endsWith('/') && path.extname(pathname) === '') {
      pathname += '/';
      res.writeHead(301, { location: `http://${req.headers.host}${pathname}` });
      res.end();
    }

    // 绝对路径
    const filePath = path.join(__dirname, pathname);
    // 扩展名
    let ext = path.extname(pathname);
    ext = ext ? ext.slice(1) : 'unknown';

    // 未知的类型一律用"text/plain"类型
    const contentType = mime[ext] || 'text/plain';

    // fs.stat()方法用于判断给定的路径是否存在
    fs.stat(filePath, (err, stats) => {
      // 路径不存在，则返回404
      if (err) {
        res.writeHead(404, { 'Content-Type': 'text/html' });
        res.end('<h1>404 Not Found</h1>');
      }
      // 如果是文件
      if (!err && stats.isFile()) {
        res.writeHead(200, {
          'Content-Type': contentType,
          'Cache-Control': 'max-age=60',
        });
        // 建立流对象，读文件
        const stream = fs.createReadStream(filePath);
        // 错误处理
        stream.on('error', function () {
          res.writeHead(500, { 'Content-Type': contentType });

          res.end('<h1>500 Server Error</h1>');
        });
        // 读取文件
        stream.pipe(res);
        // res.end(); // 这个地方有坑，加了会关闭对话，看不到内容了
      }
      // 如果是路径
      if (!err && stats.isDirectory()) {
        let html = " <head><meta charset = 'utf-8'/></head>";
        // 读取该路径下文件
        fs.readdir(filePath, (err, files) => {
          if (err) {
            res.writeHead(500, { 'Content-Type': contentType });
            res.end('<h1>路径读取失败！</h1>');
          } else {
            for (const file of files) {
              if (file === 'index.html') {
                res.writeHead(200, { 'Content-Type': 'text/html' });
                res.end(file);
                break;
              }
              html += `<div><a href='${file}'>${file}</a></div>`;
            }
            res.writeHead(200, { 'Content-Type': 'text/html' });
            res.end(html);
          }
        });
      }
    });
  } else if (pathname.startsWith('/api')) {
  } else {
    next();
  }
});

app.listen(port, () => console.log(`static file server in port: ${port}`));
