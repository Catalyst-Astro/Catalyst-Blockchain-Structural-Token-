"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const electron_1 = require("electron");
const api = {
    refresh: () => electron_1.ipcRenderer.invoke('refresh'),
    sepoliaStatus: () => electron_1.ipcRenderer.invoke('sepolia:status'),
    operationsList: () => electron_1.ipcRenderer.invoke('operations:list'),
    operationsCreate: (input) => electron_1.ipcRenderer.invoke('operations:create', input),
    notificationsGet: () => electron_1.ipcRenderer.invoke('notifications:get'),
    notificationsUpdate: (patch) => electron_1.ipcRenderer.invoke('notifications:update', patch),
    aiCasesList: () => electron_1.ipcRenderer.invoke('ai:cases:list'),
    aiCaseCreate: (input) => electron_1.ipcRenderer.invoke('ai:cases:create', input),
    aiCasePlan: (caseId) => electron_1.ipcRenderer.invoke('ai:cases:plan', caseId),
    aiCaseApprove: (caseId, input) => electron_1.ipcRenderer.invoke('ai:cases:approve', caseId, input),
    aiCaseExecute: (caseId, input) => electron_1.ipcRenderer.invoke('ai:cases:execute', caseId, input),
    aiCaseReport: (caseId) => electron_1.ipcRenderer.invoke('ai:cases:report', caseId),
    aiReleaseReadiness: (domain) => electron_1.ipcRenderer.invoke('ai:release:readiness', domain),
    uiCasesList: () => electron_1.ipcRenderer.invoke('ui:cases:list'),
    uiCaseCreate: (input) => electron_1.ipcRenderer.invoke('ui:cases:create', input),
    uiCasePlan: (caseId) => electron_1.ipcRenderer.invoke('ui:cases:plan', caseId),
    uiCaseReport: (caseId) => electron_1.ipcRenderer.invoke('ui:cases:report', caseId)
};
electron_1.contextBridge.exposeInMainWorld('catalyst', api);
