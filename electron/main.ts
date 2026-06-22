import { app, BrowserWindow, ipcMain, dialog, shell, Menu, nativeTheme } from 'electron'
import path from 'node:path'
import fs from 'node:fs'

process.env.DIST_ELECTRON = path.join(__dirname, '..')
process.env.DIST = path.join(process.env.DIST_ELECTRON, '../dist')
process.env.PUBLIC = process.env.VITE_DEV_SERVER_URL
  ? path.join(process.env.DIST_ELECTRON, '../public')
  : process.env.DIST

let win: BrowserWindow | null
const preload = path.join(__dirname, 'preload.js')
const url = process.env.VITE_DEV_SERVER_URL
const indexHtml = path.join(process.env.DIST, 'index.html')

function createWindow() {
  win = new BrowserWindow({
    title: 'ReaderHub',
    width: 1400,
    height: 900,
    minWidth: 1000,
    minHeight: 600,
    backgroundColor: '#F2F2F7',
    show: false,
    trafficLightPosition: { x: 16, y: 16 },
    titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default',
    webPreferences: {
      preload,
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: false,
      allowRunningInsecureContent: true,
    },
  })

  win.on('ready-to-show', () => {
    win?.show()
  })

  if (url) {
    win.loadURL(url)
  } else {
    win.loadFile(indexHtml)
  }

  win.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url)
    return { action: 'deny' }
  })

  createMenu()
}

function createMenu() {
  const template: Electron.MenuItemConstructorOptions[] = [
    {
      label: '文件',
      submenu: [
        {
          label: '导入文件',
          accelerator: 'CmdOrCtrl+O',
          click: () => {
            win?.webContents.send('menu:import-file')
          },
        },
        {
          label: '导入接口源',
          accelerator: 'CmdOrCtrl+Shift+O',
          click: () => {
            win?.webContents.send('menu:import-source')
          },
        },
        { type: 'separator' },
        {
          label: '设置',
          accelerator: 'CmdOrCtrl+,',
          click: () => {
            win?.webContents.send('menu:open-settings')
          },
        },
        { type: 'separator' },
        { role: 'quit' },
      ],
    },
    {
      label: '编辑',
      submenu: [
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' },
        { role: 'selectAll' },
      ],
    },
    {
      label: '视图',
      submenu: [
        {
          label: '切换深色模式',
          accelerator: 'CmdOrCtrl+Shift+D',
          click: () => {
            const isDark = nativeTheme.shouldUseDarkColors
            nativeTheme.themeSource = isDark ? 'light' : 'dark'
            win?.webContents.send('theme:change', nativeTheme.shouldUseDarkColors)
          },
        },
        { type: 'separator' },
        { role: 'reload' },
        { role: 'toggleDevTools' },
        { type: 'separator' },
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
      ],
    },
    {
      label: '窗口',
      submenu: [
        { role: 'minimize' },
        { role: 'close' },
      ],
    },
  ]

  const menu = Menu.buildFromTemplate(template)
  Menu.setApplicationMenu(menu)
}

app.whenReady().then(() => {
  createWindow()
  app.on('activate', () => {
    const allWindows = BrowserWindow.getAllWindows()
    if (allWindows.length) {
      allWindows[0].focus()
    } else {
      createWindow()
    }
  })
})

app.on('window-all-closed', () => {
  win = null
  if (process.platform !== 'darwin') app.quit()
})

ipcMain.handle('dialog:openFile', async (_e, options) => {
  const result = await dialog.showOpenDialog(win!, options)
  return result
})

ipcMain.handle('dialog:saveFile', async (_e, options) => {
  const result = await dialog.showSaveDialog(win!, options)
  return result
})

ipcMain.handle('file:read', async (_e, filePath) => {
  try {
    const content = fs.readFileSync(filePath, 'utf-8')
    return { success: true, content }
  } catch (error) {
    return { success: false, error: (error as Error).message }
  }
})

ipcMain.handle('file:readBuffer', async (_e, filePath) => {
  try {
    const buffer = fs.readFileSync(filePath)
    return { success: true, buffer: buffer.toString('base64') }
  } catch (error) {
    return { success: false, error: (error as Error).message }
  }
})

ipcMain.handle('file:write', async (_e, filePath, content) => {
  try {
    fs.writeFileSync(filePath, content)
    return { success: true }
  } catch (error) {
    return { success: false, error: (error as Error).message }
  }
})

ipcMain.handle('app:getPath', async (_e, name) => {
  return app.getPath(name as any)
})

ipcMain.handle('theme:get', async () => {
  return nativeTheme.shouldUseDarkColors
})

ipcMain.handle('theme:set', async (_e, mode) => {
  nativeTheme.themeSource = mode
  return nativeTheme.shouldUseDarkColors
})

nativeTheme.on('updated', () => {
  win?.webContents.send('theme:change', nativeTheme.shouldUseDarkColors)
})

// ============================================
// Spider 播放引擎
// ============================================

interface SpiderSourceConfig {
  url: string
  headers?: Record<string, string>
  ext?: string
  spiderName?: string
}

interface SpiderResult {
  success: boolean
  data?: any
  error?: string
}

async function spiderFetch(url: string, headers?: Record<string, string>): Promise<any> {
  try {
    const defaultHeaders: Record<string, string> = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': 'application/json, text/plain, */*',
      'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
    }
    if (headers) {
      Object.assign(defaultHeaders, headers)
    }

    const response = await fetch(url, {
      method: 'GET',
      headers: defaultHeaders,
    })
    const text = await response.text()
    try {
      return JSON.parse(text)
    } catch {
      return text
    }
  } catch (error) {
    console.error('[SpiderEngine] 请求失败:', url, error)
    throw error
  }
}

function buildSpiderUrl(baseUrl: string, params: Record<string, any>): string {
  let url = baseUrl
  const query = Object.entries(params)
    .filter(([, v]) => v !== undefined && v !== null && v !== '')
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
    .join('&')

  if (url.includes('?')) {
    return `${url}&${query}`
  }
  return `${url}?${query}`
}

function normalizeSpiderList(data: any): any[] {
  if (!data) return []
  if (Array.isArray(data)) return data
  if (Array.isArray(data.list)) return data.list
  if (data.data && Array.isArray(data.data.list)) return data.data.list
  if (data.data && Array.isArray(data.data)) return data.data
  if (Array.isArray(data.vod_list)) return data.vod_list
  if (data.result && Array.isArray(data.result)) return data.result
  if (data.items && Array.isArray(data.items)) return data.items
  if (data.videos && Array.isArray(data.videos)) return data.videos
  if (data.book_list && Array.isArray(data.book_list)) return data.book_list
  if (data.vod && Array.isArray(data.vod)) return data.vod
  if (data.content && Array.isArray(data.content)) return data.content
  if (data.data?.vod_list && Array.isArray(data.data.vod_list)) return data.data.vod_list
  if (data.data?.result && Array.isArray(data.data.result)) return data.data.result
  for (const key of Object.keys(data)) {
    const val = data[key]
    if (Array.isArray(val) && val.length > 0) {
      const first = val[0]
      if (first && typeof first === 'object' && (first.vod_id || first.vod_name || first.id || first.name || first.book_id || first.book_name)) {
        return val
      }
    }
  }
  return []
}

function normalizeSpiderClass(data: any): any[] {
  if (!data) return []
  if (Array.isArray(data)) return data
  if (Array.isArray(data.class)) return data.class
  if (data.data && Array.isArray(data.data.class)) return data.data.class
  if (Array.isArray(data.type_list)) return data.type_list
  if (data.types && Array.isArray(data.types)) return data.types
  if (data.categories && Array.isArray(data.categories)) return data.categories
  return []
}

const spiderEngine = {
  async home(config: SpiderSourceConfig): Promise<SpiderResult> {
    try {
      console.log('[SpiderEngine] home:', config.url.slice(0, 100))
      const data = await spiderFetch(config.url, config.headers)
      const list = normalizeSpiderList(data)
      const categories = normalizeSpiderClass(data)
      return {
        success: true,
        data: { list, categories, raw: data },
      }
    } catch (error) {
      console.error('[SpiderEngine] home 失败:', error)
      return { success: false, error: (error as Error).message }
    }
  },

  async category(config: SpiderSourceConfig, t: string, pg: number = 1, extend?: Record<string, any>): Promise<SpiderResult> {
    try {
      console.log('[SpiderEngine] category:', t, 'pg:', pg)
      const params: Record<string, any> = { t, pg, ...(extend || {}) }
      const tryUrls = [
        buildSpiderUrl(config.url, { ac: 'detail', ...params }),
        buildSpiderUrl(config.url, { ac: 'list', ...params }),
        buildSpiderUrl(config.url, params),
      ]

      let lastError: Error | null = null
      for (const url of tryUrls) {
        try {
          const data = await spiderFetch(url, config.headers)
          const list = normalizeSpiderList(data)
          if (list.length > 0) {
            return { success: true, data: { list, raw: data } }
          }
        } catch (e) {
          lastError = e as Error
          continue
        }
      }

      if (lastError) throw lastError
      return { success: true, data: { list: [], raw: null } }
    } catch (error) {
      console.error('[SpiderEngine] category 失败:', error)
      return { success: false, error: (error as Error).message }
    }
  },

  async detail(config: SpiderSourceConfig, ids: string): Promise<SpiderResult> {
    try {
      console.log('[SpiderEngine] detail:', ids)
      const tryUrls = [
        buildSpiderUrl(config.url, { ac: 'detail', ids }),
        buildSpiderUrl(config.url, { ac: 'detail', id: ids }),
        buildSpiderUrl(config.url, { ids }),
        buildSpiderUrl(config.url, { id: ids }),
      ]

      let lastError: Error | null = null
      for (const url of tryUrls) {
        try {
          const data = await spiderFetch(url, config.headers)
          const list = normalizeSpiderList(data)

          if (list.length > 0) {
            const item = list.find((v: any) => String(v.vod_id || v.id) === String(ids))
            if (item) {
              return { success: true, data: { item, raw: data } }
            }
            if (list.length === 1) {
              return { success: true, data: { item: list[0], raw: data } }
            }
          }

          if (data && typeof data === 'object') {
            if (data.vod_id || data.vod_name || data.id || data.name) {
              return { success: true, data: { item: data, raw: data } }
            }
            if (data.data && (data.data.vod_id || data.data.vod_name || data.data.id || data.data.name)) {
              return { success: true, data: { item: data.data, raw: data } }
            }
          }
        } catch (e) {
          lastError = e as Error
          continue
        }
      }

      if (lastError) throw lastError
      return { success: false, error: '未找到详情数据' }
    } catch (error) {
      console.error('[SpiderEngine] detail 失败:', error)
      return { success: false, error: (error as Error).message }
    }
  },

  async play(config: SpiderSourceConfig, flag: string, id: string): Promise<SpiderResult> {
    try {
      console.log('[SpiderEngine] play: flag=' + flag + ', id=' + id)
      const tryUrls = [
        buildSpiderUrl(config.url, { ac: 'play', flag, id }),
        buildSpiderUrl(config.url, { ac: 'play', flag, ids: id }),
        buildSpiderUrl(config.url, { ac: 'parse', flag, id }),
        buildSpiderUrl(config.url, { ac: 'vodplay', flag, id }),
      ]

      let lastError: Error | null = null
      for (const url of tryUrls) {
        try {
          const data = await spiderFetch(url, config.headers)
          console.log('[SpiderEngine] play 响应:', JSON.stringify(data).slice(0, 500))

          const resolvedUrl =
            data.url ||
            data.data?.url ||
            data.play_url ||
            data.playUrl ||
            data.data?.play_url ||
            data.data?.playUrl ||
            data.videoUrl ||
            data.data?.videoUrl ||
            data.urllist?.[0] ||
            data.urls?.[0] ||
            null

          if (resolvedUrl && typeof resolvedUrl === 'string') {
            return {
              success: true,
              data: {
                url: resolvedUrl,
                parse: data.parse ?? data.data?.parse ?? 1,
                header: data.header || data.data?.header,
                raw: data,
              },
            }
          }

          if (data.urls && Array.isArray(data.urls) && data.urls.length > 0) {
            const firstUrl = data.urls[0]
            if (typeof firstUrl === 'string') {
              return { success: true, data: { url: firstUrl, parse: data.parse ?? 1, raw: data } }
            }
            if (firstUrl && firstUrl.url) {
              return { success: true, data: { url: firstUrl.url, parse: data.parse ?? 1, raw: data } }
            }
          }
        } catch (e) {
          lastError = e as Error
          continue
        }
      }

      if (lastError) throw lastError
      return { success: false, error: '未找到播放地址' }
    } catch (error) {
      console.error('[SpiderEngine] play 失败:', error)
      return { success: false, error: (error as Error).message }
    }
  },

  async search(config: SpiderSourceConfig, wd: string, pg: number = 1): Promise<SpiderResult> {
    try {
      console.log('[SpiderEngine] search:', wd)
      const tryUrls = [
        buildSpiderUrl(config.url, { ac: 'detail', wd, pg }),
        buildSpiderUrl(config.url, { ac: 'list', wd, pg }),
        buildSpiderUrl(config.url, { wd, pg }),
      ]

      let lastError: Error | null = null
      for (const url of tryUrls) {
        try {
          const data = await spiderFetch(url, config.headers)
          const list = normalizeSpiderList(data)
          if (list.length > 0) {
            return { success: true, data: { list, raw: data } }
          }
        } catch (e) {
          lastError = e as Error
          continue
        }
      }

      if (lastError) throw lastError
      return { success: true, data: { list: [], raw: null } }
    } catch (error) {
      console.error('[SpiderEngine] search 失败:', error)
      return { success: false, error: (error as Error).message }
    }
  },
}

// ============================================
// Spider IPC 处理器
// ============================================

ipcMain.handle('spider:home', async (_e, config: SpiderSourceConfig) => {
  return await spiderEngine.home(config)
})

ipcMain.handle('spider:category', async (_e, config: SpiderSourceConfig, t: string, pg: number, extend?: Record<string, any>) => {
  return await spiderEngine.category(config, t, pg, extend)
})

ipcMain.handle('spider:detail', async (_e, config: SpiderSourceConfig, ids: string) => {
  return await spiderEngine.detail(config, ids)
})

ipcMain.handle('spider:play', async (_e, config: SpiderSourceConfig, flag: string, id: string) => {
  return await spiderEngine.play(config, flag, id)
})

ipcMain.handle('spider:search', async (_e, config: SpiderSourceConfig, wd: string, pg: number) => {
  return await spiderEngine.search(config, wd, pg)
})

ipcMain.handle('spider:isSpiderSource', async (_e, source: any) => {
  if (!source) return false
  if (source.type === 4) return true
  if (source.config?.isSpider) return true
  if (source.api && /^(csp_|js_)/.test(source.api)) return true
  if (source.url && source.url.includes('/api/tvbox/source/')) return true
  if (source.url && source.url.includes('/api/spider-source/')) return true
  return false
})
