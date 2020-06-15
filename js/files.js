const { getAppPath } = require('electron').remote.app;
const { readdirSync } = require('fs');
const faceapi = require('face-api.js');
const path = require('path');

const { saveCanvasFromFile } = require('./ioUtils');

const myCounterDiv = document.getElementById('my-photo-counter');

const faceapiOptions = new faceapi.SsdMobilenetv1Options({
  minConfidence: 0.4,
  maxResults: 100
});

faceapi.env.monkeyPatch({
  Canvas: HTMLCanvasElement,
  Image: HTMLImageElement,
  ImageData: ImageData,
  Video: HTMLVideoElement,
  createCanvasElement: () => document.createElement('canvas'),
  createImageElement: () => document.createElement('img')
});

const loadNet = async () => {
  const detectionNet = faceapi.nets.ssdMobilenetv1;
  await detectionNet.load(path.join(getAppPath(), 'assets', 'weights'));
  await faceapi.loadFaceExpressionModel(path.join(getAppPath(), 'assets', 'weights'));
};


const detectFace = (userDir) => {
  const files = [];
  const imgs = [];
  let currentIndex = 0;

  readdirSync(userDir).forEach((file) => {
    if (!(file.endsWith('.png') || file.endsWith('.jpg'))) return;
    const mImage = new Image();

    files.push(file);
    imgs.push(mImage);

    mImage.onload = async function() {
      currentIndex += 1;
      myCounterDiv.innerHTML = `${(currentIndex)} fotos`;

      const mCanvas = document.createElement('canvas');
      const mCanvasCtx = mCanvas.getContext('2d');
      mCanvas.width = mImage.width;
      mCanvas.height = mImage.height;
      mCanvasCtx.drawImage(mImage, 0, 0);

      const result = await faceapi.detectSingleFace(mCanvas, faceapiOptions).withFaceExpressions();

      if(typeof result !== 'undefined') {
        saveCanvasFromFile(result, faceapi, mCanvas, file.replace('.png', ''));

        window.feelingsRaw.header.forEach((e) => {
          const mVal = result.expressions[e];
          if (mVal < window.feelingsRaw.minVals[e]) window.feelingsRaw.minVals[e] = mVal;
          if (mVal > window.feelingsRaw.maxVals[e]) window.feelingsRaw.maxVals[e] = mVal;
          window.feelingsRaw.values[e].push(mVal || currentIndex);
        });

        const mExpression = Object.keys(result.expressions).reduce((a, b) => {
          return (result.expressions[a] > result.expressions[b]) ? a : b;
        }, -1);

        if(!(mExpression in window.feelingsCounter)) {
          window.feelingsCounter[mExpression] = 0;
        }
        window.feelingsCounter[mExpression] += 1;
      }

      if (currentIndex < files.length) {
        imgs[currentIndex].src = path.join(userDir, files[currentIndex]);
      } else {
        document.getElementById('save-button').style.display = window.appRunning ? 'none' : 'inline-block';
        document.getElementById('load-button').classList.remove('hide');
      }
    }
  });

  imgs[currentIndex].src = path.join(userDir, files[currentIndex]);
};

loadNet().then(() => {
  console.log('Network has loaded');
});

module.exports = { detectFace };
