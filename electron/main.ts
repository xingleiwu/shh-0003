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
