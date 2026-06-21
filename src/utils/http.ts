import axios from 'axios'
import { useAppStore } from '@/store/appStore'
import { retry } from '.'

const createHttpClient = () => {
  const networkSettings = useAppStore.getState().settings.network

  const client = axios.create({
    timeout: networkSettings.timeout,
    headers: {
      'User-Agent': networkSettings.userAgent,
    },
    responseType: 'text',
  })

  client.interceptors.request.use(
    (config) => {
      if (networkSettings.proxy) {
        const proxyUrl = new URL(networkSettings.proxy)
        config.proxy = {
          host: proxyUrl.hostname,
          port: parseInt(proxyUrl.port) || (proxyUrl.protocol === 'https:' ? 443 : 80),
          protocol: proxyUrl.protocol.replace(':', ''),
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

export async function fetchUrl(url: string, headers?: Record<string, string>): Promise<string> {
  const { network } = useAppStore.getState().settings
  const client = createHttpClient()

  return retry(
    async () => {
      const response = await client.get(url, { headers })
      if (typeof response.data === 'string') {
        return response.data
      }
      return JSON.stringify(response.data)
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
    throw new Error(`解析JSON失败: ${(error as Error).message}`)
  }
}

export async function fetchBuffer(url: string, headers?: Record<string, string>): Promise<ArrayBuffer> {
  const { network } = useAppStore.getState().settings
  const client = createHttpClient()

  return retry(
    async () => {
      const response = await client.get(url, {
        headers,
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

  return retry(
    async () => {
      const response = await client.post(url, data, { headers })
      if (typeof response.data === 'string') {
        return response.data
      }
      return JSON.stringify(response.data)
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
