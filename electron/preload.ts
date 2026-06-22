import { ipcRenderer, contextBridge } from 'electron'

interface SpiderSourceConfig {
  url: string
  headers?: Record<string, string>
  ext?: string
  spiderName?: string
}

interface SpiderResult<T = any> {
  success: boolean
  data?: T
  error?: string
}

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

  spider: {
    home: (config: SpiderSourceConfig): Promise<SpiderResult> =>
      ipcRenderer.invoke('spider:home', config),
    category: (config: SpiderSourceConfig, t: string, pg: number, extend?: Record<string, any>): Promise<SpiderResult> =>
      ipcRenderer.invoke('spider:category', config, t, pg, extend),
    detail: (config: SpiderSourceConfig, ids: string): Promise<SpiderResult> =>
      ipcRenderer.invoke('spider:detail', config, ids),
    play: (config: SpiderSourceConfig, flag: string, id: string): Promise<SpiderResult> =>
      ipcRenderer.invoke('spider:play', config, flag, id),
    search: (config: SpiderSourceConfig, wd: string, pg: number): Promise<SpiderResult> =>
      ipcRenderer.invoke('spider:search', config, wd, pg),
    isSpiderSource: (source: any): Promise<boolean> =>
      ipcRenderer.invoke('spider:isSpiderSource', source),
  },
})

export type ElectronAPI = typeof window.electronAPI
