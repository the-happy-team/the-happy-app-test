const { app, dialog } = require('electron').remote;
const { createWriteStream, writeFileSync } = require('fs');
const { clearCanvases, setOutDir, getUris, resetPhotoCounter, saveCanvas } = require('./js/ioUtils');
const detectFaceCamera = require('./js/camera').detectFace;
const detectFaceFiles = require('./js/files').detectFace;

const pathResolve = require('path').resolve;
const pathJoin = require('path').join;
const archiver = require('archiver');

window.appRunning = false;
window.loopID = 0;


function resetHappinessCounter() {
  window.zipSaved = false;

  window.feelingsRaw = {
    header: ['angry', 'disgusted', 'fearful', 'happy', 'neutral', 'sad', 'surprised', 'time'],
    values: {},
    minVals: {},
    maxVals:{}
  };

  window.feelingsRaw.header.forEach((e) => {
    window.feelingsRaw.minVals[e] = 1e6;
    window.feelingsRaw.maxVals[e] = 0;
    window.feelingsRaw.values[e] = [];
  });

  window.feelingsCounter = {};
}

function drawEmotion(mEmotion) {
  const bodyStyle = getComputedStyle(document.body);
  const happyColor = bodyStyle.getPropertyValue('--color-fg');
  const backgroundColor = bodyStyle.getPropertyValue('--color-bg-graph');

  const mTime = window.feelingsRaw.values['time'];
  const mVals = window.feelingsRaw.values[mEmotion];

  const xMin = mTime[0];
  const xMax = mTime[mTime.length - 1];
  const xRange = xMax - xMin;

  const mX0 = 0;
  const mY0 = 0.8 * mVals[0] + 0.1;

  const mCanvas = document.createElement('canvas');
  const mCanvasCtx = mCanvas.getContext('2d');
  mCanvas.width = 1280;
  mCanvas.height = 720;

  mCanvasCtx.fillStyle = backgroundColor;
  mCanvasCtx.strokeStyle = happyColor;
  mCanvasCtx.lineWidth = 2;

  mCanvasCtx.fillRect(0, 0, mCanvas.width, mCanvas.height);
  mCanvasCtx.beginPath();
  mCanvasCtx.moveTo(mX0 * mCanvas.width, mCanvas.height - mY0 * mCanvas.height);

  for(let i = 1; i < mVals.length; i++) {
    const mX = (mTime[i] - xMin) / xRange;
    const mY = 0.8 * mVals[i] + 0.1;
    mCanvasCtx.lineTo(mX * mCanvas.width, mCanvas.height - mY * mCanvas.height);
  }
  mCanvasCtx.stroke();

  mCanvasCtx.beginPath();
  mCanvasCtx.moveTo(mX0 * mCanvas.width, mCanvas.height - 0.1 * mCanvas.height);
  mCanvasCtx.lineTo(1.0 * mCanvas.width, mCanvas.height - 0.1 * mCanvas.height);
  mCanvasCtx.stroke();

  //document.getElementsByTagName('body')[0].appendChild(mCanvas);

  return mCanvas;
}

function feelingsCsv(obj) {
  let header = '';
  let values = '';
  Object.keys(obj).forEach((k) => {
    header += k + ',';
    values += obj[k] + ',';
  });
  return header + '\n' + values;
}

function drawFeelingsGraph() {
  const graphDiv = document.getElementById('my-graph-container');
  graphDiv.innerHTML = '';

  const total = Object.keys(window.feelingsCounter).reduce((acc, val) => {
    return acc + window.feelingsCounter[val];
  }, 0);

  const inOrder = Object.keys(window.feelingsCounter).sort((a, b) => {
    return window.feelingsCounter[b] - window.feelingsCounter[a];
  });

  inOrder.forEach((v) => {
    const mRow = document.createElement('div');
    const mLabel = document.createElement('div');
    const mBar = document.createElement('div');

    const pctValue = window.feelingsCounter[v] / total;
    const pctLabel = Math.floor(pctValue * 100);
    const pctWidth = Math.floor(pctValue * 83);

    mRow.classList.add('graph-row');
    mLabel.classList.add('graph-label');
    mBar.classList.add('graph-bar');

    mLabel.innerHTML = v;
    mBar.innerHTML = pctLabel + '%';
    mBar.style.width = pctWidth + '%';

    mRow.appendChild(mLabel);
    mRow.appendChild(mBar);

    graphDiv.appendChild(mRow);
  });
}

document.getElementById('start-button').addEventListener('click', function() {
  window.appRunning = !window.appRunning;

  document.getElementById('my-cam').style.opacity = window.appRunning ? '1' : '0';
  document.getElementById('my-graph-container').style.opacity = window.appRunning ? '0' : '1';
  document.getElementById('save-button').style.display = window.appRunning ? 'none' : 'inline-block';

  this.innerHTML = window.appRunning ? 'Iniciando ... ' : 'Iniciar Camera';
  document.getElementById('load-button').classList.add('hide');

  if(window.appRunning) {
    resetPhotoCounter();
    setOutDir();
    resetHappinessCounter();

    setTimeout(detectFaceCamera, 100);
    setTimeout(function() {
      this.innerHTML = 'Pausar';
    }.bind(this), 200);
  } else {
    clearCanvases();
    clearInterval(window.loopID);
    drawFeelingsGraph();
  }
}, false);

document.getElementById('save-button').addEventListener('click', function() {
  const outInfo = getUris();

  writeFileSync(pathJoin(outInfo.outDirPath, '__counter.csv'), feelingsCsv(window.feelingsCounter), (err) => {
    if (err) throw err;
  });

  writeFileSync(pathJoin(outInfo.outDirPath, '__values.json'), JSON.stringify(window.feelingsRaw), (err) => {
    if (err) throw err;
  });

  window.feelingsRaw.header.forEach((e) => {
    if(e !== 'time' && window.feelingsRaw.values[e].length > 0) {
      saveCanvas(drawEmotion(e), pathJoin(outInfo.outDirPath, `_graph-${e}.png`));
    }
  });

  const defaultPath = pathResolve(app.getPath('desktop'), `${outInfo.outDirName}.zip`);
  const userChosenPath = dialog.showSaveDialogSync({ defaultPath: defaultPath }) || `${outInfo.outDirPath}.zip`;

  const output = createWriteStream(userChosenPath);
  const archive = archiver('zip', { zlib: { level: 9 } });

  archive.pipe(output);
  archive.directory(outInfo.outDirPath, outInfo.outDirName);
  archive.finalize();

  window.zipSaved = true;
}, false);

document.getElementById('load-button').addEventListener('click', function() {
  setOutDir();
  const outInfo = getUris();

  document.getElementById('start-button').classList.add('hide');
  document.getElementById('load-button').classList.add('hide');
  document.getElementById('save-button').style.display = 'none';

  resetHappinessCounter();

  const userChosenPath = dialog.showOpenDialogSync({
    defaultPath: pathResolve(app.getPath('documents')),
    properties: ['openDirectory']
  });

  detectFaceFiles(userChosenPath[0]);
}, false);
