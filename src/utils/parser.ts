import type { Source, BookSource, IptvChannel, LiveChannel } from '@/types'
import { safeJSONParse, generateId } from '.'

export function parseCatVodSource(url: string, content: string): Source[] {
  const data = safeJSONParse(content)
  if (!data) return []

  const sources: Source[] = []

  if (data.sites && Array.isArray(data.sites)) {
    data.sites.forEach((site: any) => {
      const type = site.type === 0 ? 'video' : site.type === 1 ? 'novel' : 'mixed'
      sources.push({
        id: generateId('src_'),
        name: site.name || '未知源',
        type,
        url: url,
        enabled: site.enable !== false,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        config: {
          apiType: 'catvod',
          headers: data.header,
        },
      })
    })
  }

  return sources
}

export function parseTvBoxSource(url: string, content: string): Source[] {
  const data = safeJSONParse(content)
  if (!data) return []

  const sources: Source[] = []

  if (data.sites && Array.isArray(data.sites)) {
    data.sites.forEach((site: any) => {
      sources.push({
        id: generateId('src_'),
        name: site.name || '未知源',
        type: 'video',
        url: url,
        enabled: site.enable !== false,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        config: {
          apiType: 'tvbox',
          headers: data.header,
        },
      })
    })
  }

  return sources
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

export function detectSourceType(url: string, content: string): 'catvod' | 'tvbox' | 'yuedu' | 'iptv' | 'unknown' {
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
  }

  if (content.includes('#EXTM3U') || content.includes('#EXTINF:')) return 'iptv'
  if (content.includes('group-title=') || content.match(/^\w+,http/)) return 'iptv'

  const ext = url.split('?')[0].split('.').pop()?.toLowerCase()
  if (ext === 'm3u' || ext === 'm3u8') return 'iptv'

  return 'unknown'
}

export async function parseSourceContent(url: string, content: string): Promise<{ sources: Source[], liveChannels: LiveChannel[] }> {
  const type = detectSourceType(url, content)
  const result: { sources: Source[], liveChannels: LiveChannel[] } = {
    sources: [],
    liveChannels: [],
  }

  switch (type) {
    case 'catvod':
      result.sources = parseCatVodSource(url, content)
      break
    case 'tvbox':
      result.sources = parseTvBoxSource(url, content)
      break
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
    default:
      throw new Error('无法识别的数据源格式')
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
