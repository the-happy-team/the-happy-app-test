#!/bin/bash

mkdir Happy.iconset
sips -z 16 16   256x256.png --out Happy.iconset/icon_16x16.png
sips -z 32 32   256x256.png --out Happy.iconset/icon_16x16@2x.png
sips -z 32 32   256x256.png --out Happy.iconset/icon_32x32.png
sips -z 64 64   256x256.png --out Happy.iconset/icon_32x32@2x.png
sips -z 128 128 256x256.png --out Happy.iconset/icon_128x128.png
sips -z 256 256 256x256.png --out Happy.iconset/icon_128x128@2x.png
sips -z 256 256 256x256.png --out Happy.iconset/icon_256x256.png
iconutil -c icns Happy.iconset
rm -R Happy.iconset
