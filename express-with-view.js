const multer = require('multer');
const cloudinary = require('cloudinary');
const Webtask = require('webtask-tools');
const express = require('express');
const app = express();

//Form-Data Middleware
const upload = multer({
  'storage': multer.diskStorage({
    filename: (req, file, cb) => {
      const name = Date.now() + file.originalname;
      cb(null, name);
    }
  }),
  'fileFilter': (req, file, cb) => {
      if (!file.originalname.match(/\.(jpg|jpeg|png|gif)$/i)) {
          return cb(new Error('Upload is not an image.'), false);
      }
      cb(null, true);
  }
});

//Set config
app.use((req, res, next) => {
  const context = req.webtaskContext;

  cloudinary.config({
    'cloud_name': context.secrets.cloud_name,
    'api_key': context.secrets.api_key,
    'api_secret': context.secrets.api_secret
  });
  
  context.uploader = cloudinary.uploader;

  next();
});

//Original view and GET request
app.get('/', (req, res) => {
  const HTML = renderView({
    title: 'My WebTask App',
    body: '<h1>Upload a resource to Cloudinary</h1>'
  });

  res.set('Content-Type', 'text/html');
  res.status(200).send(HTML);
});

//Upload Call and POST request
app.post('/', upload.single('image'), (req, res) => {
  const context = req.webtaskContext;

  context.uploader.upload(req.file.path, file => {
    var resp = JSON.stringify(file, null, 2);
    res.setHeader("content-type", "text/html");
    res.send(renderUploadView({
      title: 'Cloudinary Upload',
      body: '<h2>Success!</h2>',
      resp: resp,
      file: file
    }));
  }, { categorization: 'imagga_tagging',
      auto_tagging: 0.4,
       eager: [
        {width: 150, height: 150, crop: 'thumb', gravity: 'face', radius: 'max'},
        {transformation: [{width: 500, height: 350, crop: 'fill'}, {overlay: 'cloudinary_icon.png', gravity: 'south_east', width:150}, {quality: 'auto'}]},
        {width: 500, height: 350, quality: 'auto', effect: 'grayscale'}
     ]});
});

//Original View
function renderView(locals) {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>${locals.title}</title>
    </head>

    <body>
      ${locals.body}
      <form method="POST" enctype="multipart/form-data">
      <input type="file" name="image">
      <br>
      <button>Submit</button>
      </form>
    </body>
    </html>
  `;
}

//Upload View
function renderUploadView(locals) {
  return ` 
  <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>${locals.title}</title>
    </head>
    
    <body>
     ${locals.body}
     <p>Response = </p>
     ${locals.resp}
     <p>Public ID = ${locals.file.public_id}</p>
     <p>URL = ${locals.file.url}</p>
     <p>Tags = ${locals.file.tags}</p>
     <p>Thumbnail Image</p>
     <img src="${locals.file.eager[0].url}"/>
     <p>Watermark Icon Image</p>
     <img src="${locals.file.eager[1].url}"/>
     <p>Grayscale Image</p>
     <img src="${locals.file.eager[2].url}"/>
     <p>Original Image</p>
     <img src="${locals.file.url}"/>
    </body>
    </html>
  `;
}


module.exports = Webtask.fromExpress(app);
