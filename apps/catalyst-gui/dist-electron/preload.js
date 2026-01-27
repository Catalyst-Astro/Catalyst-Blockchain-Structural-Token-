"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const electron_1 = require("electron");
const api = {
    refresh: () => electron_1.ipcRenderer.invoke('refresh'),
    sepoliaStatus: () => electron_1.ipcRenderer.invoke('sepolia:status')
};
electron_1.contextBridge.exposeInMainWorld('catalyst', api);
