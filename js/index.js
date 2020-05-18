const { app, dialog } = require('electron').remote;
const { createWriteStream } = require('fs');
const { clearCanvases, getUris } = require('./js/ioUtils');
const { detectFace } = require('./js/camera');

const pathResolve = require('path').resolve;
const archiver = require('archiver');

window.appRunning = false;
window.loopID = 0;

document.getElementById('start-button').addEventListener('click', function() {
  window.appRunning = !window.appRunning;

  document.getElementById('my-cam').style.opacity = window.appRunning ? '1' : '0';
  document.getElementById('save-button').style.display = window.appRunning ? 'none' : 'inline-block';

  this.innerHTML = window.appRunning ? 'Pausar' : 'Iniciar';

  if(window.appRunning) {
    detectFace();
  } else {
    clearCanvases();
    clearInterval(window.loopID);
  }
}, false);

document.getElementById('save-button').addEventListener('click', function() {
  const outInfo = getUris();
  const defaultPath = pathResolve(app.getPath('desktop'), `${outInfo.outDirName}.zip`);
  const userChosenPath = dialog.showSaveDialogSync({ defaultPath: defaultPath }) || `${outInfo.outDirPath}.zip`;

  const output = createWriteStream(userChosenPath);
  const archive = archiver('zip', { zlib: { level: 9 } });

  archive.pipe(output);
  archive.directory(outInfo.outDirPath, outInfo.outDirName);
  archive.finalize();
}, false);
