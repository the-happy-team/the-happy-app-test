const { getAppPath } = require('electron').remote.app;
const { readdirSync } = require('fs');
const faceapi = require('face-api.js');
const path = require('path');

const { saveCanvasFromFile } = require('./ioUtils');

const faceapiOptions = new faceapi.SsdMobilenetv1Options({
  minConfidence: 0.6,
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

const detectFace = async (userDir) => {
  
  readdirSync(userDir).forEach((file) => {
    // TODO: if not .png, return

    const mImage = new Image();
    mImage.onload = async function() {
      console.log('loaded:' + mImage.width + ' x ' + mImage.height);
      const mCanvas = document.createElement('canvas');
      const mCanvasCtx = mCanvas.getContext('2d');
      mCanvas.width = mImage.width;
      mCanvas.height = mImage.height;
      mCanvasCtx.drawImage(mImage, 0, 0);
      //document.getElementsByTagName('body')[0].appendChild(mCanvas);

      const result = await faceapi.detectSingleFace(mCanvas, faceapiOptions).withFaceExpressions();

      if(typeof result !== 'undefined') {
        saveCanvasFromFile(result, faceapi, mCanvas, file.replace('.png', ''));

        const mExpression = Object.keys(result.expressions).reduce((a, b) => {
          if(!(b in window.rawFeelings)) {
            window.rawFeelings[b] = 0;
          }
          window.rawFeelings[b] += result.expressions[b];

          return (result.expressions[a] > result.expressions[b]) ? a : b;
        }, -1);

        if(!(mExpression in window.feelings)) {
          window.feelings[mExpression] = 0;
        }
        window.feelings[mExpression] += 1;
      }
    }

    mImage.src = path.join(userDir, file);
  });
};

loadNet().then(() => {
  console.log('Network has loaded');
});

module.exports = { detectFace };
