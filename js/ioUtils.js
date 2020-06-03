const { getAppPath } = require('electron').remote.app;
const { writeFile } = require('fs');

const pathJoin = require('path').join;
const fs_jetpack = require('fs-jetpack');
const moment = require('moment');
const screenshot = require('screenshot-desktop');

const snapshotCanvas = document.getElementById('my-snapshot');
const snapshotCanvasCtx = snapshotCanvas.getContext('2d');

const screenshotCanvas = document.getElementById('my-screenshot');
const screenshotCanvasCtx = screenshotCanvas.getContext('2d');

const scaledOverlayCanvas = document.getElementById('my-scaled-overlay');
const scaledOverlayCanvasCtx = scaledOverlayCanvas.getContext('2d');

const myCamera = document.getElementById('my-cam');

function setupCanvases(width, height) {
  snapshotCanvas.width = width;
  snapshotCanvas.height = height;
  scaledOverlayCanvas.width = width / 2;
  scaledOverlayCanvas.height = height / 2;
}

const mDate = moment().format('YYYY-MM-DD');
const outInfo = {};

function setOutDir() {
  outInfo.outDirName = mDate + '_' + parseInt(moment().format('x')).toString(32);
  outInfo.outDirPath = pathJoin(getAppPath(), outInfo.outDirName);
}

function getUris() {
  outInfo.outFileName = moment().format('YYYYMMDD_HHmmss');
  outInfo.outFilePath = pathJoin(outInfo.outDirPath, outInfo.outFileName);
  fs_jetpack.dir(outInfo.outDirPath);
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
  const ndims = {};

  ndims.width = Math.min(mbox.width, 0.2 * canvas.width);
  ndims.height = ndims.width * mbox.height / mbox.width;
  ndims.x = 0.5 * (canvas.width - ndims.width);
  ndims.y = 0.5 * (canvas.height - ndims.height);

  ctx.drawImage(snapshotCanvas, mbox.x, mbox.y, mbox.width, mbox.height,
                ndims.x, ndims.y, ndims.width, ndims.height);
}

function saveCanvases(detectionResult, detectionResultScaled, faceapi) {
  const outUris = getUris();

  // original picture  
  saveCanvas(snapshotCanvas, 'camera', outUris.outFilePath);

  // labeled picture
  faceapi.draw.drawDetections(snapshotCanvas, detectionResult);
  faceapi.draw.drawFaceExpressions(snapshotCanvas, detectionResult);
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

module.exports = { setupCanvases, updateCanvases, saveCanvases, clearCanvases, setOutDir, getUris };
