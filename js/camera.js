const electron = require('electron');
const faceapi = require('face-api.js');
const path = require('path');
//const ipcRenderer = electron.ipcRenderer;

const faceapiOptions = new faceapi.SsdMobilenetv1Options({
  minConfidence: 0.6,
  maxResults: 100
});

let cam;
let isRunning = true;
let isReady = false;

const snapshotCanvas = document.getElementById('my-snapshot');
const snapshotCanvasCtx = snapshotCanvas.getContext('2d');

const labeledCanvas = document.getElementById('my-labeled-snapshot');
const labeledCanvasCtx = labeledCanvas.getContext('2d');

const scaledOverlayCanvas = document.getElementById('my-scaled-overlay');
const scaledOverlayCanvasCtx = scaledOverlayCanvas.getContext('2d');

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
  await detectionNet.load(path.join(__dirname, 'assets', 'weights'));
  await faceapi.loadFaceExpressionModel(path.join(__dirname, 'assets', 'weights'));
};

const initCamera = async (width, height) => {
  const video = document.getElementById('my-cam');
  video.width = width / 2;
  video.height = height / 2;

  labeledCanvas.width = width;
  labeledCanvas.height = height;
  snapshotCanvas.width = width;
  snapshotCanvas.height = height;
  scaledOverlayCanvas.width = width / 2;
  scaledOverlayCanvas.height = height / 2;

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
  const result = await faceapi.detectSingleFace(cam, faceapiOptions).withFaceExpressions();

  if(typeof result !== 'undefined') {
    const resultScaled = faceapi.resizeResults(result, { width: cam.width, height: cam.height });

    const mExpression = Object.keys(result.expressions).reduce((a, b) => {
      return (result.expressions[a] > result.expressions[b]) ? a : b;
    });

    labeledCanvasCtx.clearRect(0, 0, labeledCanvas.width, labeledCanvas.height);
    labeledCanvasCtx.drawImage(cam, 0, 0);
    faceapi.draw.drawDetections(labeledCanvas, result);
    faceapi.draw.drawFaceExpressions(labeledCanvas, result);

    scaledOverlayCanvasCtx.clearRect(0, 0, scaledOverlayCanvas.width, scaledOverlayCanvas.height);
    faceapi.draw.drawDetections(scaledOverlayCanvas, resultScaled);
    faceapi.draw.drawFaceExpressions(scaledOverlayCanvas, resultScaled);
  } else {
    setTimeout(detectFace, 1000);
  }
};

loadNet().then(() => {
  console.log('Network has loaded');
  return initCamera(1280, 720);
}).then(video => {
  console.log('Camera was initialized');
  cam = video;
  detectFace();
});
