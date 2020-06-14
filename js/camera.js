const { getAppPath } = require('electron').remote.app;
const faceapi = require('face-api.js');
const path = require('path');
const moment = require('moment');

const { setupCanvases, updateCanvases, saveCanvases } = require('./ioUtils');

const CAM = {
  WIDTH: 1280,
  HEIGHT: 720
};

const DELAY = {
  SHORT: 1e3,
  LONG: 60e3
};

const faceapiOptions = new faceapi.SsdMobilenetv1Options({
  minConfidence: 0.6,
  maxResults: 100
});

let cam;

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

const initCamera = async (width, height) => {
  const video = document.getElementById('my-cam');
  video.width = width / 2;
  video.height = height / 2;

  const stream = await navigator.mediaDevices.getUserMedia({
    audio: false,
    video: {
      facingMode: 'user',
      width: width,
      height: height
    }
  });
  video.srcObject = stream;

  return new Promise((resolve) => {
    video.onloadedmetadata = () => {
      resolve(video);
    };
  });
};

const detectFace = async () => {
  updateCanvases();
  const result = await faceapi.detectSingleFace(cam, faceapiOptions).withFaceExpressions();

  if(typeof result !== 'undefined') {
    const resultScaled = faceapi.resizeResults(result, { width: cam.width, height: cam.height });

    saveCanvases(result, resultScaled, faceapi);

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

    if (mExpression === 'happy') {
      const mTime = parseInt(moment().format('x'));
      const mHappy = result.expressions['happy'];

      if (window.happiness.minTime == 0) window.happiness.minTime = mTime;
      if (mHappy < window.happiness.minHappy) window.happiness.minHappy = mHappy;
      if (mHappy > window.happiness.maxHappy) window.happiness.maxHappy = mHappy;

      window.happiness.maxTime = mTime;

      window.happiness.values.push([mTime, mHappy]);
    }

    window.loopID = setTimeout(detectFace, DELAY.LONG);
  } else {
    window.loopID = setTimeout(detectFace, DELAY.SHORT);
  }
};

loadNet().then(() => {
  console.log('Network has loaded');
  return initCamera(CAM.WIDTH, CAM.HEIGHT);
}).then(video => {
  console.log('Camera was initialized');
  document.getElementById('start-button').classList.remove('hide');
  document.getElementById('load-button').classList.remove('hide');
  setupCanvases(CAM.WIDTH, CAM.HEIGHT);
  cam = video;
  const delayInput = document.getElementById('my-delay-input');
  delayInput.value = DELAY.LONG / 1e3;

  delayInput.addEventListener('keyup', function() {
    const nDelaySec = Math.max(1, parseInt(delayInput.value) || 1);
    DELAY.LONG = nDelaySec * 1000;
  });
});

module.exports = { detectFace };
