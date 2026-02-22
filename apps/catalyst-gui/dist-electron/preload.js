"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const electron_1 = require("electron");
const api = {
    refresh: () => electron_1.ipcRenderer.invoke('refresh'),
    sepoliaStatus: () => electron_1.ipcRenderer.invoke('sepolia:status'),
    operationsList: () => electron_1.ipcRenderer.invoke('operations:list'),
    operationsCreate: (payload) => electron_1.ipcRenderer.invoke('operations:create', payload),
    notificationsGet: () => electron_1.ipcRenderer.invoke('notifications:get'),
    notificationsUpdate: (payload) => electron_1.ipcRenderer.invoke('notifications:update', payload)
};
electron_1.contextBridge.exposeInMainWorld('catalyst', api);
