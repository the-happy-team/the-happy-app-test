const WebCamera = require('webcamjs');
const fs = require('fs');
const fs_jetpack = require('fs-jetpack');
const moment = require('moment');
const path = require('path');
const shell = require('shelljs');
const archiver = require('archiver');
const faceapi = require('face-api.js');
const elerem = require('electron').remote;
const dialog = elerem.dialog;
const app = elerem.app;

const camDiv = document.getElementById('camdemo');
const saveButton = document.getElementById('save-button');

// await faceapi.loadFaceExpressionModel('/models');

faceapi.env.monkeyPatch({
  Canvas: HTMLCanvasElement,
  Image: HTMLImageElement,
  ImageData: ImageData,
  Video: HTMLVideoElement,
  createCanvasElement: () => document.createElement('canvas'),
  createImageElement: () => document.createElement('img')
});

const mDate = {
  fulldate: moment().format('YYYY-MM-DD'),
  imageDir: path.join(__dirname, moment().format('YYYY-MM-DD'))
};
const defaultSavePath = path.resolve(app.getPath('desktop'), `${mDate.fulldate}.zip`);

let appRecord = false;
let loopID = 0;
let count = 0;

WebCamera.set({
  dest_width: 1280,
  dest_height: 720,
  width: 640,
  height: 360,
  image_format: 'png'
});
WebCamera.attach('#camdemo');

function processBase64Image(dataString) {
  const matches = dataString.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);

  if (matches.length !== 3) {
    return new Error('Invalid input string');
  } else {
    return {
      type: matches[1],
      data: new Buffer(matches[2], 'base64')
    };
  }
}

function wDirectory() {
  mDate.datetime = moment().format('YYYYMMDD_HHmmss');
  mDate.imagePath = path.join(mDate.imageDir, mDate.datetime);

  // Ensures that directory on given path exists and meets given criteria.
  // If any criterium is not met it will be after this call.
  fs_jetpack.dir(mDate.imageDir);

  return mDate;
}

function savePicture(imageBuffer) {
  const obj = wDirectory();
  fs.writeFile(`${obj.imagePath}_camera.png`, imageBuffer.data, 'binary', function(err) {
    if(err) console.log(err);
  });
}

function takeAndSavePicture() {
  WebCamera.snap(function(data_uri) {
    savePicture(processBase64Image(data_uri));
  });
}

function takeAndSaveScreenShot() {
  const obj = wDirectory();
  shell.exec(`cd ${obj.imageDir} && screencapture ${obj.datetime}_screen.png`, function(){});
}

function loop() {
  takeAndSavePicture();
  takeAndSaveScreenShot();
  console.log(`Loop ${count++}`);
}


document.getElementById('start-button').addEventListener('click', function() {
  appRecord = !appRecord;
  camDiv.style.opacity = appRecord ? '1' : '0';
  saveButton.style.display = appRecord ? 'none' : 'inline-block';
  this.innerHTML = appRecord ? 'Pausar' : 'Iniciar';

  if(appRecord) {
    loop();
    loopID = setInterval(loop, 6000);
  } else {
    clearInterval(loopID);
  }
}, false);

document.getElementById('save-button').addEventListener('click', function() {
  const userChosenPath = dialog.showSaveDialogSync({ defaultPath: defaultSavePath }) || `${mDate.imageDir}.zip`;
  const output = fs.createWriteStream(userChosenPath);
  const archive = archiver('zip', { zlib: { level: 9 } });
  archive.pipe(output);
  archive.directory(mDate.imageDir, mDate.fulldate);
  archive.finalize();
}, false);
