const { app, dialog } = require('electron').remote;
const { createWriteStream, writeFileSync } = require('fs');
const { clearCanvases, setOutDir, getUris, resetPhotoCounter } = require('./js/ioUtils');
const { detectFace } = require('./js/camera');

const pathResolve = require('path').resolve;
const pathJoin = require('path').join;
const archiver = require('archiver');

window.appRunning = false;
window.loopID = 0;
window.rawFeelings = {};
window.feelings = {};

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

  this.innerHTML = window.appRunning ? 'Pausar' : 'Iniciar';

  if(window.appRunning) {
    resetPhotoCounter();
    setOutDir();
    setTimeout(detectFace, 100);
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

  const defaultPath = pathResolve(app.getPath('desktop'), `${outInfo.outDirName}.zip`);
  const userChosenPath = dialog.showSaveDialogSync({ defaultPath: defaultPath }) || `${outInfo.outDirPath}.zip`;

  const output = createWriteStream(userChosenPath);
  const archive = archiver('zip', { zlib: { level: 9 } });

  archive.pipe(output);
  archive.directory(outInfo.outDirPath, outInfo.outDirName);
  archive.finalize();
}, false);
