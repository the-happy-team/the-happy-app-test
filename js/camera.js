const electron = require('electron');
const faceapi = require('face-api.js');
const path = require('path');
//const ipcRenderer = electron.ipcRenderer;

const MIN_FACE_CONFIDENCE = 0.5;
const faceapiOptions = new faceapi.SsdMobilenetv1Options({ MIN_FACE_CONFIDENCE });

let cam;
let isRunning = true;
let isReady = false;

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

loadNet().then(_ => {
  console.log('Network has loaded');
  return initCamera(1280, 720);
}).then(video => {
  console.log('Camera was initialized');
  cam = video;
  //detectExpressions();
});
