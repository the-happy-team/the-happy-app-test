const { app, BrowserWindow, systemPreferences } = require("electron");
const path = require("path");
const url = require("url");

// Keep a global reference of the window object, if you don't, the window will
// be closed automatically when the JavaScript object is garbage collected.
let win;

function createWindow() {
  win = new BrowserWindow({
    width: 1280,
    height: 720,
    webPreferences: {
      nodeIntegration: true,
    },
    icon: path.join(__dirname, "icons", "256x256.png"),
  });

  win.loadURL(
    url.format({
      pathname: path.join(__dirname, "index.html"),
      protocol: "file:",
      slashes: true,
    })
  );

  win.webContents.openDevTools();

  win.on("closed", () => {
    win = null;
  });

  if (systemPreferences.askForMediaAccess) {
    systemPreferences.askForMediaAccess("camera");
  }
}

// Some APIs can only be used after this event occurs.
app.on("ready", createWindow);

app.on("window-all-closed", () => {
  app.quit();
});

app.on("activate", () => {
  if (win === null) {
    createWindow();
  }
});
