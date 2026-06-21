import { ipcRenderer, contextBridge } from 'electron'

contextBridge.exposeInMainWorld('electronAPI', {
  openFile: (options: any) => ipcRenderer.invoke('dialog:openFile', options),
  saveFile: (options: any) => ipcRenderer.invoke('dialog:saveFile', options),
  readFile: (filePath: string) => ipcRenderer.invoke('file:read', filePath),
  readFileBuffer: (filePath: string) => ipcRenderer.invoke('file:readBuffer', filePath),
  writeFile: (filePath: string, content: string) => ipcRenderer.invoke('file:write', filePath, content),
  getPath: (name: string) => ipcRenderer.invoke('app:getPath', name),
  getTheme: () => ipcRenderer.invoke('theme:get'),
  setTheme: (mode: string) => ipcRenderer.invoke('theme:set', mode),
  on: (channel: string, callback: (...args: any[]) => void) => {
    ipcRenderer.on(channel, (_e, ...args) => callback(...args))
  },
  removeListener: (channel: string, callback: (...args: any[]) => void) => {
    ipcRenderer.removeListener(channel, callback)
  },
})

export type ElectronAPI = typeof window.electronAPI
