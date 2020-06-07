const { getAppPath } = require('electron').remote.app;
const { writeFile, mkdirSync } = require('fs');

const pathJoin = require('path').join;
const moment = require('moment');
const screenshot = require('screenshot-desktop');

const snapshotCanvas = document.getElementById('my-snapshot');
const snapshotCanvasCtx = snapshotCanvas.getContext('2d');

const screenshotCanvas = document.getElementById('my-screenshot');
const screenshotCanvasCtx = screenshotCanvas.getContext('2d');

const scaledOverlayCanvas = document.getElementById('my-scaled-overlay');
const scaledOverlayCanvasCtx = scaledOverlayCanvas.getContext('2d');

const myCamera = document.getElementById('my-cam');

const myCounterDiv = document.getElementById('my-photo-counter');
let photoCount = 0;

function setupCanvases(width, height) {
  snapshotCanvas.width = width;
  snapshotCanvas.height = height;
  scaledOverlayCanvas.width = width / 2;
  scaledOverlayCanvas.height = height / 2;
}

const drawOptions = {
  lineWidth: 10,
  boxColor: '#C7F440'
};

const mDate = moment().format('YYYY-MM-DD');
const outInfo = {};

function resetPhotoCounter() {
  photoCount = 0;
  myCounterDiv.innerHTML = `${(photoCount)} fotos`;
}

function setOutDir() {
  outInfo.outDirName = mDate + '_' + moment().format('HHmmss');
  outInfo.outDirPath = pathJoin(getAppPath(), outInfo.outDirName);
}

function getUris() {
  outInfo.outFileName = moment().format('YYYYMMDD_HHmmss');
  outInfo.outFilePath = pathJoin(outInfo.outDirPath, outInfo.outFileName);
  mkdirSync(outInfo.outDirPath, { recursive: true });
  return outInfo;
}

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

function saveCanvas(canvas, label, outFilePath) {
  const imageBuffer = processBase64Image(canvas.toDataURL('image/png'));

  writeFile(`${outFilePath}_${label}.png`, imageBuffer.data, 'binary', function(err) {
    if(err) console.log(err);
  });
}

function saveScreenshot(detectionResult, outFilePath) {
  screenshot({
    format: 'png',
    filename: `${outFilePath}_screen.png`
  }).then((imgPath) => {
    const mSreenShot = new Image();
    mSreenShot.src = imgPath;
    mSreenShot.onload = function() {
      screenshotCanvas.width = mSreenShot.width / 2;
      screenshotCanvas.height = mSreenShot.height / 2;
      screenshotCanvasCtx.drawImage(mSreenShot, 0, 0, screenshotCanvas.width, screenshotCanvas.height);
      drawCenteredFace(screenshotCanvas, screenshotCanvasCtx, detectionResult);
      saveCanvas(screenshotCanvas, 'scrcam', outFilePath);
    };
  });
}

function updateCanvases() {
  snapshotCanvasCtx.clearRect(0, 0, snapshotCanvas.width, snapshotCanvas.height);
  snapshotCanvasCtx.drawImage(myCamera, 0, 0);
}

function drawCenteredFace(canvas, ctx, detectionResult) {
  const mbox = detectionResult.detection.box;
  const padding = 0.5 * mbox.width;
  const dims = {
    src: {},
    dst: {}
  };

  dims.src.x = mbox.x - padding;
  dims.src.y = mbox.y - padding;
  dims.src.width = mbox.width + 2 * padding;
  dims.src.height = mbox.height + 2 * padding;

  dims.dst.width = Math.min(dims.src.width, 0.2 * canvas.width);
  dims.dst.height = dims.dst.width * dims.src.height / dims.src.width;
  dims.dst.x = 0.5 * (canvas.width - dims.dst.width);
  dims.dst.y = 0.5 * (canvas.height - dims.dst.height);

  ctx.drawImage(snapshotCanvas, dims.src.x, dims.src.y, dims.src.width, dims.src.height,
                dims.dst.x, dims.dst.y, dims.dst.width, dims.dst.height);
}

function saveCanvases(detectionResult, detectionResultScaled, faceapi) {
  myCounterDiv.innerHTML = `${(++photoCount)} fotos`;

  const outUris = getUris();

  // original picture  
  saveCanvas(snapshotCanvas, 'camera', outUris.outFilePath);

  const faceBox = new faceapi.draw.DrawBox(detectionResult.detection.box, drawOptions);
  faceBox.draw(snapshotCanvas);

  saveCanvas(snapshotCanvas, 'labeld', outUris.outFilePath);

  saveScreenshot(detectionResult, outUris.outFilePath);

  // preview overlay
  // scaledOverlayCanvasCtx.clearRect(0, 0, scaledOverlayCanvas.width, scaledOverlayCanvas.height);
  // faceapi.draw.drawDetections(scaledOverlayCanvas, detectionResultScaled);
  // faceapi.draw.drawFaceExpressions(scaledOverlayCanvas, detectionResultScaled);
}

function clearCanvases() {
  snapshotCanvasCtx.clearRect(0, 0, snapshotCanvas.width, snapshotCanvas.height);
  scaledOverlayCanvasCtx.clearRect(0, 0, scaledOverlayCanvas.width, scaledOverlayCanvas.height);
}

module.exports = { setupCanvases, updateCanvases, saveCanvases, clearCanvases, setOutDir, resetPhotoCounter, getUris };
