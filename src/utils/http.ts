import axios from 'axios'
import { useAppStore } from '@/store/appStore'
import { retry } from '.'

function detectEncoding(buffer: ArrayBuffer, contentType?: string): string {
  if (contentType) {
    const m = contentType.match(/charset=["']?([\w-]+)/i)
    if (m) return m[1].toLowerCase()
  }
  const bytes = new Uint8Array(buffer.slice(0, 4))
  if (bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf) return 'utf-8'
  if (bytes[0] === 0xff && bytes[1] === 0xfe) return 'utf-16le'
  if (bytes[0] === 0xfe && bytes[1] === 0xff) return 'utf-16be'
  return 'utf-8'
}

function decodeBuffer(buffer: ArrayBuffer, contentType?: string): string {
  const enc = detectEncoding(buffer, contentType)
  try {
    const decoder = new TextDecoder(enc, { fatal: false })
    return decoder.decode(buffer)
  } catch {
    try {
      return new TextDecoder('utf-8', { fatal: false }).decode(buffer)
    } catch {
      return new TextDecoder('gbk', { fatal: false }).decode(buffer)
    }
  }
}

const createHttpClient = () => {
  const networkSettings = useAppStore.getState().settings.network

  const client = axios.create({
    timeout: networkSettings.timeout,
    responseType: 'arraybuffer',
    headers: {
      'User-Agent': networkSettings.userAgent,
      'Accept': 'application/json, text/plain, */*',
      'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
    },
  })

  client.interceptors.request.use(
    (config) => {
      if (networkSettings.proxy) {
        try {
          const proxyUrl = new URL(networkSettings.proxy)
          config.proxy = {
            host: proxyUrl.hostname,
            port: parseInt(proxyUrl.port) || (proxyUrl.protocol === 'https:' ? 443 : 80),
            protocol: proxyUrl.protocol.replace(':', ''),
          }
        } catch {
          // ignore invalid proxy url
        }
      }
      return config
    },
    (error) => Promise.reject(error)
  )

  client.interceptors.response.use(
    (response) => response,
    (error) => Promise.reject(error)
  )

  return client
}

function buildMergedHeaders(customHeaders?: Record<string, string>): Record<string, string> {
  const headers: Record<string, string> = {}
  if (customHeaders) {
    for (const [k, v] of Object.entries(customHeaders)) {
      headers[k] = v
    }
  }
  return headers
}

export async function fetchUrl(url: string, headers?: Record<string, string>): Promise<string> {
  const { network } = useAppStore.getState().settings
  const client = createHttpClient()
  const mergedHeaders = buildMergedHeaders(headers)

  return retry(
    async () => {
      const response = await client.get(url, { headers: mergedHeaders })
      const contentType = (response.headers?.['content-type'] as string) || undefined
      return decodeBuffer(response.data as ArrayBuffer, contentType)
    },
    network.retryCount,
    1000
  )
}

export async function fetchJson<T = any>(url: string, headers?: Record<string, string>): Promise<T> {
  const content = await fetchUrl(url, headers)
  try {
    return JSON.parse(content)
  } catch (error) {
    const first500 = content.slice(0, 500)
    throw new Error(`解析JSON失败: ${(error as Error).message}，响应内容前500字符: ${first500}`)
  }
}

export async function fetchBuffer(url: string, headers?: Record<string, string>): Promise<ArrayBuffer> {
  const { network } = useAppStore.getState().settings
  const client = createHttpClient()
  const mergedHeaders = buildMergedHeaders(headers)

  return retry(
    async () => {
      const response = await client.get(url, {
        headers: mergedHeaders,
        responseType: 'arraybuffer',
      })
      return response.data as ArrayBuffer
    },
    network.retryCount,
    1000
  )
}

export async function postData(url: string, data: any, headers?: Record<string, string>): Promise<string> {
  const { network } = useAppStore.getState().settings
  const client = createHttpClient()
  const mergedHeaders = buildMergedHeaders(headers)

  return retry(
    async () => {
      const response = await client.post(url, data, { headers: mergedHeaders })
      const contentType = (response.headers?.['content-type'] as string) || undefined
      return decodeBuffer(response.data as ArrayBuffer, contentType)
    },
    network.retryCount,
    1000
  )
}

export async function testUrl(url: string): Promise<{ success: boolean; status?: number; error?: string }> {
  try {
    const client = createHttpClient()
    const response = await client.head(url, { timeout: 5000 })
    return { success: true, status: response.status }
  } catch (error: any) {
    if (error.response) {
      return { success: false, status: error.response.status, error: error.message }
    }
    return { success: false, error: error.message }
  }
}
