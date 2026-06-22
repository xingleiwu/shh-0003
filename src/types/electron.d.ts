export interface SpiderSourceConfig {
  url: string
  headers?: Record<string, string>
  ext?: string
  spiderName?: string
}

export interface SpiderResult<T = any> {
  success: boolean
  data?: T
  error?: string
}

export interface SpiderAPI {
  home: (config: SpiderSourceConfig) => Promise<SpiderResult>
  category: (config: SpiderSourceConfig, t: string, pg: number, extend?: Record<string, any>) => Promise<SpiderResult>
  detail: (config: SpiderSourceConfig, ids: string) => Promise<SpiderResult>
  play: (config: SpiderSourceConfig, flag: string, id: string) => Promise<SpiderResult>
  search: (config: SpiderSourceConfig, wd: string, pg: number) => Promise<SpiderResult>
  isSpiderSource: (source: any) => Promise<boolean>
}

export interface ElectronAPI {
  openFile: (options: {
    title?: string
    filters?: Array<{ name: string; extensions: string[] }>
    properties?: Array<
      | 'openFile'
      | 'openDirectory'
      | 'multiSelections'
      | 'showHiddenFiles'
      | 'createDirectory'
      | 'promptToCreate'
      | 'noResolveAliases'
      | 'treatPackageAsDirectory'
      | 'dontAddToRecent'
    >
  }) => Promise<{
    canceled: boolean
    filePaths: string[]
  }>
  saveFile: (options: {
    title?: string
    defaultPath?: string
    filters?: Array<{ name: string; extensions: string[] }>
  }) => Promise<{
    canceled: boolean
    filePath: string
  }>
  readFile: (filePath: string) => Promise<{ success: boolean; content?: string; error?: string }>
  readFileBuffer: (filePath: string) => Promise<{ success: boolean; buffer?: string; error?: string }>
  writeFile: (filePath: string, content: string) => Promise<{ success: boolean; error?: string }>
  getPath: (name: 'home' | 'appData' | 'userData' | 'temp' | 'downloads' | 'documents' | 'desktop') => Promise<string>
  getTheme: () => Promise<boolean>
  setTheme: (mode: 'system' | 'light' | 'dark') => Promise<boolean>
  on: (channel: string, callback: (...args: any[]) => void) => void
  removeListener: (channel: string, callback: (...args: any[]) => void) => void
  spider: SpiderAPI
}

declare global {
  interface Window {
    electronAPI: ElectronAPI
  }
}

export {}
