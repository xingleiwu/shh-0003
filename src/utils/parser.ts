import type { Source, BookSource, IptvChannel, LiveChannel } from '@/types'
import { safeJSONParse, generateId } from '.'

function isSpiderApi(api: string): boolean {
  if (!api || typeof api !== 'string') return false
  return api.startsWith('csp_') ||
    api.startsWith('js_') ||
    api.endsWith('.Spider') ||
    api.endsWith('.spider') ||
    api.startsWith('XBPQ_') ||
    api.startsWith('xbpq_') ||
    (!api.startsWith('http') && !api.startsWith('/') && /^[a-zA-Z]/.test(api) && !api.includes('.'))
}

function extractUrlFromExt(ext: any): string | null {
  if (!ext) return null
  if (typeof ext === 'string') {
    if (ext.startsWith('http://') || ext.startsWith('https://')) return ext
    try {
      const parsed = JSON.parse(ext)
      return extractUrlFromExtObj(parsed)
    } catch {
      return null
    }
  }
  if (typeof ext === 'object') return extractUrlFromExtObj(ext)
  return null
}

function extractUrlFromExtObj(obj: any): string | null {
  if (!obj || typeof obj !== 'object') return null
  for (const key of ['url', 'api', 'siteUrl', 'site_url', 'apiUrl', 'api_url', 'host', 'baseUrl', 'base_url']) {
    const val = obj[key]
    if (typeof val === 'string' && (val.startsWith('http://') || val.startsWith('https://'))) return val
  }
  return null
}

function resolveSiteUrl(site: any, parentUrl: string): string {
  const api = site.api
  const siteUrl = site.url

  if (api && typeof api === 'string' && (api.startsWith('http://') || api.startsWith('https://'))) {
    return api
  }

  if (api && typeof api === 'string' && api.startsWith('/')) {
    const baseStr = (siteUrl && typeof siteUrl === 'string' && siteUrl.startsWith('http')) ? siteUrl : parentUrl
    try {
      const base = new URL(baseStr)
      return base.origin + api
    } catch {
      return baseStr.replace(/\/$/, '') + api
    }
  }

  if (api && typeof api === 'string' && isSpiderApi(api)) {
    const extUrl = extractUrlFromExt(site.ext)
    if (extUrl) return extUrl
    if (siteUrl && typeof siteUrl === 'string' && siteUrl.startsWith('http')) return siteUrl
    return parentUrl
  }

  if (siteUrl && typeof siteUrl === 'string' && siteUrl.startsWith('http')) {
    return siteUrl
  }

  const extUrl = extractUrlFromExt(site.ext)
  if (extUrl) return extUrl

  return parentUrl
}

function parseSourceHeader(header: any): Record<string, string> | undefined {
  if (!header) return undefined
  if (typeof header === 'object') return header
  if (typeof header === 'string') {
    const parsed = safeJSONParse<Record<string, string>>(header)
    return parsed || undefined
  }
  return undefined
}

export function parseCatVodSource(url: string, content: string): { sources: Source[], liveChannels: LiveChannel[] } {
  const data = safeJSONParse(content)
  if (!data) return { sources: [], liveChannels: [] }

  const sources: Source[] = []
  const liveChannels: LiveChannel[] = []

  if (data.sites && Array.isArray(data.sites)) {
    data.sites.forEach((site: any) => {
      if (site.type === 1) return
      const siteType = site.type === 1 ? 'novel' as const : 'video' as const
      const siteUrl = resolveSiteUrl(site, url)
      const isSpider = site.api && typeof site.api === 'string' && isSpiderApi(site.api)

      sources.push({
        id: generateId('src_'),
        name: site.name || '未知源',
        type: siteType,
        url: siteUrl,
        enabled: site.enable !== false && site.searchable !== 0 && !!siteUrl && siteUrl.startsWith('http'),
        createdAt: Date.now(),
        updatedAt: Date.now(),
        config: {
          apiType: 'catvod',
          headers: parseSourceHeader(site.header || data.header),
          isSpider: isSpider || undefined,
          spiderName: isSpider ? site.api : undefined,
          ext: site.ext || undefined,
        },
      })
    })
  }

  if (data.lives && Array.isArray(data.lives)) {
    data.lives.forEach((live: any) => {
      if (live.url && typeof live.url === 'string' && live.url.startsWith('http')) {
        liveChannels.push({
          id: generateId('live_'),
          name: live.name || '直播',
          group: '直播源',
          logo: live.logo || '',
          urls: [live.url],
          sourceId: 'catvod_live',
        })
      }
    })
  }

  return { sources, liveChannels }
}

export function parseTvBoxSource(url: string, content: string): { sources: Source[], liveChannels: LiveChannel[] } {
  const data = safeJSONParse(content)
  if (!data) return { sources: [], liveChannels: [] }

  const sources: Source[] = []
  const liveChannels: LiveChannel[] = []

  if (data.sites && Array.isArray(data.sites)) {
    data.sites.forEach((site: any) => {
      const siteUrl = resolveSiteUrl(site, url)
      const isSpider = site.api && typeof site.api === 'string' && isSpiderApi(site.api)

      sources.push({
        id: generateId('src_'),
        name: site.name || '未知源',
        type: 'video',
        url: siteUrl,
        enabled: site.enable !== false && site.searchable !== 0 && !!siteUrl && siteUrl.startsWith('http'),
        createdAt: Date.now(),
        updatedAt: Date.now(),
        config: {
          apiType: 'tvbox',
          headers: parseSourceHeader(site.header || data.header),
          isSpider: isSpider || undefined,
          spiderName: isSpider ? site.api : undefined,
          ext: site.ext || undefined,
        },
      })
    })
  }

  if (data.lives && Array.isArray(data.lives)) {
    data.lives.forEach((live: any) => {
      if (live.url && typeof live.url === 'string' && live.url.startsWith('http')) {
        liveChannels.push({
          id: generateId('live_'),
          name: live.name || '直播',
          group: '直播源',
          logo: live.logo || '',
          urls: [live.url],
          sourceId: 'tvbox_live',
        })
      }
    })
  }

  return { sources, liveChannels }
}

export function parseYueduSource(content: string): Source[] {
  const data = safeJSONParse<any>(content, [])
  if (!Array.isArray(data)) return []

  const sources: Source[] = data
    .filter((item) => item.bookSourceName || item.bookSourceUrl)
    .map((item: BookSource) => ({
      id: item.id || generateId('src_'),
      name: item.bookSourceName || '未知书源',
      type: 'novel' as const,
      url: item.bookSourceUrl,
      enabled: item.enabled !== false,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      config: {
        apiType: 'yuedu' as const,
        searchUrl: item.searchUrl,
        detailUrl: item.bookUrlPattern,
        headers: safeJSONParse<Record<string, string>>(item.header || '{}'),
      },
    }))

  return sources
}

export function parseIptvPlaylist(content: string): LiveChannel[] {
  const lines = content.split('\n')
  const channels: LiveChannel[] = []
  let currentGroup = '未分类'
  let currentName = ''
  let currentLogo = ''

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim()

    if (line.startsWith('#EXTM3U')) continue

    if (line.startsWith('#EXTINF:')) {
      const info = line.substring(8)
      const logoMatch = info.match(/tvg-logo="([^"]*)"/)
      const nameMatch = info.match(/tvg-name="([^"]*)"/)
      const groupMatch = info.match(/group-title="([^"]*)"/)

      if (logoMatch) currentLogo = logoMatch[1]
      if (nameMatch) currentName = nameMatch[1]
      if (groupMatch) currentGroup = groupMatch[1]

      const commaIndex = info.lastIndexOf(',')
      if (commaIndex !== -1) {
        currentName = info.substring(commaIndex + 1).trim() || currentName
      }
    } else if (line && !line.startsWith('#') && (line.startsWith('http') || line.startsWith('rtmp'))) {
      if (currentName) {
        channels.push({
          id: generateId('live_'),
          name: currentName,
          group: currentGroup,
          logo: currentLogo,
          urls: [line],
          sourceId: 'local_iptv',
        })
      }
      currentName = ''
      currentLogo = ''
    } else if (line.startsWith('#EXTGRP:')) {
      currentGroup = line.substring(8).trim()
    }
  }

  return channels
}

export function parseJsonIptv(content: string): LiveChannel[] {
  const data = safeJSONParse<any>(content)
  if (!data) return []

  const channels: LiveChannel[] = []

  if (Array.isArray(data)) {
    data.forEach((item: IptvChannel) => {
      if (item.url && item.name) {
        channels.push({
          id: generateId('live_'),
          name: item.name,
          group: item.group || '未分类',
          logo: item.logo,
          urls: [item.url],
          sourceId: 'json_iptv',
        })
      }
    })
  } else if (data.channels && Array.isArray(data.channels)) {
    data.channels.forEach((item: IptvChannel) => {
      if (item.url && item.name) {
        channels.push({
          id: generateId('live_'),
          name: item.name,
          group: item.group || data.group || '未分类',
          logo: item.logo,
          urls: [item.url],
          sourceId: 'json_iptv',
        })
      }
    })
  }

  return channels
}

export function parseTxtIptv(content: string): LiveChannel[] {
  const lines = content.split('\n')
  const channels: LiveChannel[] = []
  let currentGroup = '未分类'

  for (const line of lines) {
    const trimmed = line.trim()

    if (!trimmed || trimmed.startsWith('#')) continue

    if (trimmed.startsWith('[')) {
      const groupMatch = trimmed.match(/\[([^\]]+)\]/)
      if (groupMatch) {
        currentGroup = groupMatch[1]
      }
      continue
    }

    const parts = trimmed.split(',')
    if (parts.length >= 2) {
      const name = parts[0].trim()
      const url = parts[parts.length - 1].trim()

      if (name && url && (url.startsWith('http') || url.startsWith('rtmp'))) {
        channels.push({
          id: generateId('live_'),
          name,
          group: currentGroup,
          urls: [url],
          sourceId: 'txt_iptv',
        })
      }
    }
  }

  return channels
}

export function detectSourceType(url: string, content: string): 'catvod' | 'tvbox' | 'yuedu' | 'iptv' | 'catvod-single' | 'unknown' {
  const data = safeJSONParse(content)

  if (data) {
    if (data.sites && Array.isArray(data.sites)) {
      const firstSite = data.sites[0]
      if (firstSite && 'type' in firstSite) return 'catvod'
      return 'tvbox'
    }

    if (Array.isArray(data)) {
      if (data.length > 0 && data[0].bookSourceName) return 'yuedu'
      if (data.length > 0 && data[0].url && data[0].name) return 'iptv'
    }

    if (data.channels && Array.isArray(data.channels)) return 'iptv'

    if ((data.class && Array.isArray(data.class)) ||
        (data.type_list && Array.isArray(data.type_list)) ||
        (data.list && Array.isArray(data.list)) ||
        (data.vod_list && Array.isArray(data.vod_list)) ||
        typeof data.code !== 'undefined') {
      return 'catvod-single'
    }
  }

  if (content.includes('#EXTM3U') || content.includes('#EXTINF:')) return 'iptv'
  if (content.includes('group-title=') || content.match(/^\w+,http/)) return 'iptv'

  const ext = url.split('?')[0].split('.').pop()?.toLowerCase()
  if (ext === 'm3u' || ext === 'm3u8') return 'iptv'

  if (url.includes('api.php') || url.includes('/provide/') || url.includes('/api/')) {
    return 'catvod-single'
  }

  return 'unknown'
}

export async function parseSourceContent(url: string, content: string): Promise<{ sources: Source[], liveChannels: LiveChannel[] }> {
  const type = detectSourceType(url, content)
  const result: { sources: Source[], liveChannels: LiveChannel[] } = {
    sources: [],
    liveChannels: [],
  }

  switch (type) {
    case 'catvod': {
      const parsed = parseCatVodSource(url, content)
      result.sources = parsed.sources
      result.liveChannels = parsed.liveChannels
      break
    }
    case 'tvbox': {
      const parsed = parseTvBoxSource(url, content)
      result.sources = parsed.sources
      result.liveChannels = parsed.liveChannels
      break
    }
    case 'catvod-single': {
      const urlNoQuery = url.split('?')[0].replace(/\/$/, '')
      const match = urlNoQuery.match(/\/([^/]+)\/?$/)
      const nameFromUrl = match ? decodeURIComponent(match[1]) : '影视源'
      result.sources.push({
        id: generateId('src_'),
        name: nameFromUrl && nameFromUrl !== 'vod' && nameFromUrl !== 'api' ? nameFromUrl : '直连影视源',
        type: 'video',
        url: url,
        enabled: true,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        config: {
          apiType: 'catvod',
        },
      })
      break
    }
    case 'yuedu':
      result.sources = parseYueduSource(content)
      break
    case 'iptv':
      if (content.includes('#EXTM3U')) {
        result.liveChannels = parseIptvPlaylist(content)
      } else if (content.startsWith('[') || content.startsWith('{')) {
        result.liveChannels = parseJsonIptv(content)
      } else {
        result.liveChannels = parseTxtIptv(content)
      }
      break
    default: {
      if (url.startsWith('http://') || url.startsWith('https://')) {
        result.sources.push({
          id: generateId('src_'),
          name: '自定义源',
          type: 'video',
          url: url,
          enabled: true,
          createdAt: Date.now(),
          updatedAt: Date.now(),
          config: {
            apiType: 'catvod',
          },
        })
      } else {
        throw new Error('无法识别的数据源格式')
      }
    }
  }

  return result
}

export function parseLocalNovel(filename: string, content: string): { name: string; author: string; chapters: any[] } {
  const ext = filename.split('.').pop()?.toLowerCase()
  let text = content

  if (ext === 'txt') {
    const lines = text.split(/\r?\n/)
    const chapters: any[] = []
    let currentContent = ''
    let currentTitle = '正文'

    const chapterPattern = /^(第[零一二三四五六七八九十百千两\d]+[章节回卷部][\s、\.．:]?.*)|^(楔子|序章|序言|前言|引子|番外|后记)/

    for (const line of lines) {
      if (chapterPattern.test(line.trim())) {
        if (currentContent.trim()) {
          chapters.push({
            id: generateId('chap_'),
            name: currentTitle,
            content: currentContent.trim(),
          })
        }
        currentTitle = line.trim()
        currentContent = ''
      } else {
        currentContent += line + '\n'
      }
    }

    if (currentContent.trim()) {
      chapters.push({
        id: generateId('chap_'),
        name: currentTitle,
        content: currentContent.trim(),
      })
    }

    const firstLine = lines[0]?.trim() || ''
    let name = filename.replace(/\.[^/.]+$/, '')
    let author = '未知'

    if (firstLine.includes('《') && firstLine.includes('》')) {
      const nameMatch = firstLine.match(/《([^》]+)》/)
      if (nameMatch) name = nameMatch[1]
      const authorMatch = firstLine.match(/作者[:：\s]+([^\s]+)/)
      if (authorMatch) author = authorMatch[1]
    }

    return { name, author, chapters }
  }

  return {
    name: filename.replace(/\.[^/.]+$/, ''),
    author: '未知',
    chapters: [{ id: generateId('chap_'), name: '正文', content: text }],
  }
}
