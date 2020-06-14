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

  window.rawFeelings = {};
  window.feelings = {};

  window.happiness = {
    minHappy: 1e6,
    maxHappy: 0,
    values: []
  };
}

function drawHappiness() {
  const bodyStyle = getComputedStyle(document.body);
  const happyColor = bodyStyle.getPropertyValue('--color-fg');
  const backgroundColor = '#1e3070'; //'#3d50a0'; //406df4

  const xMin = window.happiness.values[0][0];
  const xMax = window.happiness.values[window.happiness.values.length - 1][0];
  const xRange =  xMax - xMin;

  const mX0 = (window.happiness.values[0][0] - xMin) / xRange;
  const mY0 = 0.8 * window.happiness.values[0][1] + 0.1;

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

  for(let i = 1; i < window.happiness.values.length; i++) {
    const mX = (window.happiness.values[i][0] - xMin) / xRange;
    const mY = 0.8 * window.happiness.values[i][1] + 0.1;

    //mCanvasCtx.beginPath();
    //mCanvasCtx.moveTo(mX * mCanvas.width, mCanvas.height - 0.1 * mCanvas.height);
    mCanvasCtx.lineTo(mX * mCanvas.width, mCanvas.height - mY * mCanvas.height);
    //mCanvasCtx.stroke();
  }
  mCanvasCtx.stroke();

  mCanvasCtx.beginPath();
  mCanvasCtx.moveTo(mX0 * mCanvas.width, mCanvas.height - 0.05 * mCanvas.height);
  mCanvasCtx.lineTo(1.0 * mCanvas.width, mCanvas.height - 0.05 * mCanvas.height);
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

  const total = Object.keys(window.feelings).reduce((acc, val) => {
    return acc + window.feelings[val];
  }, 0);

  const inOrder = Object.keys(window.feelings).sort((a, b) => {
    return window.feelings[b] - window.feelings[a];
  });

  inOrder.forEach((v) => {
    const mRow = document.createElement('div');
    const mLabel = document.createElement('div');
    const mBar = document.createElement('div');

    const pctValue = window.feelings[v] / total;
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

  writeFileSync(pathJoin(outInfo.outDirPath, '__feelings.csv'), feelingsCsv(window.feelings), (err) => {
    if (err) throw err;
  });

  writeFileSync(pathJoin(outInfo.outDirPath, '__feelings-raw.csv'), feelingsCsv(window.rawFeelings), (err) => {
    if (err) throw err;
  });

  if (window.happiness.values.length > 0) {
    saveCanvas(drawHappiness(), pathJoin(outInfo.outDirPath, '__happiness.png'));
  }

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
