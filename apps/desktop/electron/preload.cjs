const { contextBridge } = require("electron");

contextBridge.exposeInMainWorld("claudio", {
  platform: process.platform,
  versions: process.versions,
});
