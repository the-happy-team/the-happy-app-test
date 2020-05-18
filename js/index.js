const archiver = require('archiver');
const elerem = require('electron').remote;
const app = elerem.app;
const dialog = elerem.dialog;
const fs = require('fs');
const fs_jetpack = require('fs-jetpack');
const moment = require('moment');
const screenshot = require('screenshot-desktop');

const camDiv = document.getElementById('my-cam');
const mySnapshot = document.getElementById('my-snapshot');
const saveButton = document.getElementById('save-button');

const mDate = {
  fulldate: moment().format('YYYY-MM-DD'),
  imageDir: path.join(__dirname, moment().format('YYYY-MM-DD'))
};
const defaultSavePath = path.resolve(app.getPath('desktop'), `${mDate.fulldate}.zip`);

let appRecord = false;
let loopID = 0;
let count = 0;

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

function savePicture(canvasDiv, label) {
  canvasDiv.getContext('2d').drawImage(camDiv, 0, 0);
  const imageBuffer = processBase64Image(canvasDiv.toDataURL('image/png'));
  const obj = wDirectory();
  fs.writeFile(`${obj.imagePath}_${label}.png`, imageBuffer.data, 'binary', function(err) {
    if(err) console.log(err);
  });
}

function takeAndSaveScreenShot() {
  const obj = wDirectory();
  screenshot({
    format: 'png',
    filename: path.join(obj.imageDir, `${obj.datetime}_screen.png`)
  });
}

function loop() {
  savePicture(mySnapshot, 'camera');
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
    loopID = setInterval(loop, 60e3);
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
