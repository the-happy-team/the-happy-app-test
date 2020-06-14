const { getAppPath } = require('electron').remote.app;
const { writeFile, mkdirSync } = require('fs');

const pathJoin = require('path').join;
const moment = require('moment');
const screenshot = require('screenshot-desktop');

const snapshotCanvas = document.getElementById('my-snapshot');
const snapshotCanvasCtx = snapshotCanvas.getContext('2d');

const snapshotLbCanvas = document.getElementById('my-snapshot-labeled');
const snapshotLbCanvasCtx = snapshotLbCanvas.getContext('2d');

const snapshotBwCanvas = document.getElementById('my-snapshot-bw');
const snapshotBwCanvasCtx = snapshotBwCanvas.getContext('2d');

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
  snapshotLbCanvas.width = width;
  snapshotLbCanvas.height = height;
  snapshotBwCanvas.width = width;
  snapshotBwCanvas.height = height;
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

function saveCanvas(canvas, outFile) {
  const imageBuffer = processBase64Image(canvas.toDataURL('image/png'));

  writeFile(outFile, imageBuffer.data, 'binary', function(err) {
    if(err) console.log(err);
  });
}

function saveScreenshot(outFilePath, detectionResult, faceBox) {
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
      drawCenteredFace(screenshotCanvas, detectionResult, faceBox);
      saveCanvas(screenshotCanvas, `${outFilePath}_scrcam.png`);
    };
  });
}

function updateCanvases() {
  snapshotCanvasCtx.clearRect(0, 0, snapshotCanvas.width, snapshotCanvas.height);
  snapshotCanvasCtx.drawImage(myCamera, 0, 0);
  snapshotLbCanvasCtx.drawImage(snapshotCanvas, 0, 0);
  snapshotBwCanvasCtx.drawImage(snapshotCanvas, 0, 0);
}

function drawCenteredFace(canvas, detectionResult, faceBox) {
  const canvasCtx = canvas.getContext('2d');
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

  const idataSrc = snapshotBwCanvasCtx.getImageData(dims.src.x, dims.src.y, dims.src.width, dims.src.height);
  const dataSrc = idataSrc.data;

  for(let i = 0; i < dataSrc.length; i += 4) {
    const luma = dataSrc[i] * 0.2126 + dataSrc[i+1] * 0.7152 + dataSrc[i+2] * 0.0722;
    dataSrc[i] = dataSrc[i+1] = dataSrc[i+2] = luma;
  }
  snapshotBwCanvasCtx.putImageData(idataSrc, dims.src.x, dims.src.y, 0, 0, dims.src.width, dims.src.height);
  faceBox.draw(snapshotBwCanvas);

  canvasCtx.drawImage(snapshotBwCanvas, dims.src.x, dims.src.y, dims.src.width, dims.src.height,
                      dims.dst.x, dims.dst.y, dims.dst.width, dims.dst.height);
}

function saveCanvases(detectionResult, detectionResultScaled, faceapi) {
  myCounterDiv.innerHTML = `${(++photoCount)} fotos`;

  const outUris = getUris();

  // original picture
  saveCanvas(snapshotCanvas, `${outUris.outFilePath}_camera.png`);

  // labeled pictured
  const faceBox = new faceapi.draw.DrawBox(detectionResult.detection.box, drawOptions);
  faceBox.draw(snapshotLbCanvas);
  saveCanvas(snapshotLbCanvas, `${outUris.outFilePath}_labeld.png`);

  // screenshot
  saveScreenshot(outUris.outFilePath, detectionResult, faceBox);

  // preview overlay
  // scaledOverlayCanvasCtx.clearRect(0, 0, scaledOverlayCanvas.width, scaledOverlayCanvas.height);
  // faceapi.draw.drawDetections(scaledOverlayCanvas, detectionResultScaled);
  // faceapi.draw.drawFaceExpressions(scaledOverlayCanvas, detectionResultScaled);
}

function saveCanvasFromFile(detectionResult, faceapi, mCanvas, fname) {
  const outUris = getUris();
  const outfile = pathJoin(outUris.outDirPath, `${fname}_labeld.png`);

  const faceBox = new faceapi.draw.DrawBox(detectionResult.detection.box, drawOptions);
  faceBox.draw(mCanvas);

  saveCanvas(mCanvas, outfile);
}

function clearCanvases() {
  snapshotCanvasCtx.clearRect(0, 0, snapshotCanvas.width, snapshotCanvas.height);
  snapshotLbCanvasCtx.clearRect(0, 0, snapshotLbCanvas.width, snapshotLbCanvas.height);
  snapshotBwCanvasCtx.clearRect(0, 0, snapshotBwCanvas.width, snapshotBwCanvas.height);
  scaledOverlayCanvasCtx.clearRect(0, 0, scaledOverlayCanvas.width, scaledOverlayCanvas.height);
}

module.exports = {
  setupCanvases,
  updateCanvases,
  saveCanvases,
  saveCanvasFromFile,
  clearCanvases,
  setOutDir,
  resetPhotoCounter,
  getUris,
  saveCanvas
};
