import { fetchJson, fetchUrl } from '@/utils/http'
import { generateId, safeJSONParse } from '@/utils'
import type { Source, Book, Video, Chapter, PlaySource, PlayUrl } from '@/types'

export interface CatVodCategory {
  type_id: string
  type_name: string
  type_flag?: string
  filter?: any
}

export interface CatVodVideo {
  vod_id: string
  vod_name: string
  vod_pic: string
  vod_remarks?: string
  vod_area?: string
  vod_year?: string
  vod_director?: string
  vod_actor?: string
  vod_content?: string
  vod_score?: string | number
  type_id?: string
  type_name?: string
}

export interface CatVodVideoDetail {
  vod_id: string
  vod_name: string
  vod_pic: string
  vod_remarks?: string
  vod_area?: string
  vod_year?: string
  vod_director?: string
  vod_actor?: string
  vod_content?: string
  vod_score?: string | number
  vod_play_from?: string
  vod_play_url?: string
  vod_play_note?: string
}

export interface CatVodChapter {
  book_id?: string
  book_name?: string
  chapter_id: string
  chapter_name: string
  content?: string
}

export interface CatVodBook {
  book_id: string
  book_name: string
  book_pic?: string
  book_author?: string
  book_desc?: string
  book_remarks?: string
  book_play_url?: string
  book_play_from?: string
  vod_play_url?: string
  vod_play_from?: string
  play_url?: string
  play_from?: string
  url?: string
  chapter_list?: any[]
  chapters?: any[]
  toc?: any[]
  type_id?: string
  type_name?: string
}

function buildApiUrl(baseUrl: string, params: Record<string, any>): string {
  let url = baseUrl.replace(/\/$/, '')
  if (!url.includes('/api.php') && !url.includes('/api/') && !url.includes('/provide') && !url.includes('ac=')) {
    url = url + '/api.php/provide/vod/'
  }
  const query = Object.entries(params)
    .filter(([, v]) => v !== undefined && v !== null && v !== '')
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
    .join('&')
  if (url.includes('?')) {
    return `${url}&${query}`
  }
  return `${url}?${query}`
}

function resolveUrl(url: string, baseUrl: string): string {
  if (!url) return ''
  if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:')) {
    return url
  }
  try {
    const base = new URL(baseUrl)
    if (url.startsWith('//')) {
      return base.protocol + url
    }
    if (url.startsWith('/')) {
      return base.origin + url
    }
    return base.origin + '/' + url.replace(/^\.\//, '')
  } catch {
    return url
  }
}

function normalizeList(data: any): any[] {
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

function normalizeClass(data: any): CatVodCategory[] {
  if (!data) return []
  if (Array.isArray(data)) return data
  if (Array.isArray(data.class)) return data.class
  if (data.data && Array.isArray(data.data.class)) return data.data.class
  if (Array.isArray(data.type_list)) return data.type_list
  if (data.types && Array.isArray(data.types)) return data.types
  if (data.categories && Array.isArray(data.categories)) return data.categories
  return []
}

function normalizePageInfo(data: any, page: number): { page: number; pagecount: number; total: number; limit: number } {
  if (!data) return { page, pagecount: 1, total: 0, limit: 20 }
  return {
    page: data.page || data.currentPage || data.curpage || page,
    pagecount: data.pagecount || data.pageCount || data.page_count || data.totalpage || data.totalPage || 1,
    total: data.total || data.totalcount || data.total_count || 0,
    limit: data.limit || data.size || data.perpage || data.per_page || 20,
  }
}

export async function catvodGetCategories(source: Source): Promise<CatVodCategory[]> {
  try {
    const urls = [
      buildApiUrl(source.url, { ac: 'list' }),
      buildApiUrl(source.url, { ac: 'type' }),
    ]
    for (const url of urls) {
      try {
        const data = await fetchJson(url, source.config?.headers)
        const cats = normalizeClass(data)
        if (cats.length > 0) return cats
      } catch {
        continue
      }
    }
    return []
  } catch (error) {
    console.error(`获取分类失败 [${source.name}]:`, error)
    return []
  }
}

export async function catvodGetHomeContent(source: Source): Promise<{
  categories: CatVodCategory[]
  videos: CatVodVideo[]
  books: CatVodBook[]
  list: any[]
}> {
  try {
    let data: any = null
    let list: any[] = []
    const tryUrls = [
      buildApiUrl(source.url, { ac: 'detail', pg: 1 }),
      buildApiUrl(source.url, { ac: 'list', pg: 1 }),
    ]
    for (const url of tryUrls) {
      try {
        data = await fetchJson(url, source.config?.headers)
        list = normalizeList(data)
        if (list.length > 0) break
      } catch {
        continue
      }
    }
    if (!data || list.length === 0) {
      return { categories: [], videos: [], books: [], list: [] }
    }

    const categories = normalizeClass(data)

    const videosFromList = list.filter(
      (item: any) =>
        item.vod_id || item.vod_name || item.id || item.name ||
        source.type === 'video' || source.type === 'mixed'
    )
    const booksFromList = list.filter(
      (item: any) =>
        item.book_id || item.book_name || item.bookId || item.bookName || source.type === 'novel'
    )

    return {
      categories,
      videos: videosFromList,
      books: booksFromList,
      list,
    }
  } catch (error) {
    console.error(`获取首页内容失败 [${source.name}]:`, error)
    return { categories: [], videos: [], books: [], list: [] }
  }
}

export async function catvodGetCategoryContent(
  source: Source,
  categoryId: string,
  page: number = 1,
  extend?: Record<string, any>
): Promise<{
  page: number
  pagecount: number
  total: number
  limit: number
  list: CatVodVideo[]
}> {
  try {
    const urls = [
      buildApiUrl(source.url, { ac: 'detail', t: categoryId, pg: page, ...extend }),
      buildApiUrl(source.url, { ac: 'list', t: categoryId, pg: page, ...extend }),
    ]
    for (const url of urls) {
      try {
        const data = await fetchJson(url, source.config?.headers)
        const list = normalizeList(data)
        if (list.length > 0) {
          const pageInfo = normalizePageInfo(data, page)
          return { ...pageInfo, list }
        }
      } catch {
        continue
      }
    }
    return { page, pagecount: 1, total: 0, limit: 20, list: [] }
  } catch (error) {
    console.error(`获取分类内容失败 [${source.name}]:`, error)
    return { page, pagecount: 1, total: 0, limit: 20, list: [] }
  }
}

function normalizeDetail(data: any): any | null {
  if (!data) return null
  if (typeof data !== 'object') return null
  if (data.vod_id || data.vod_name || data.id || data.name) {
    return data
  }
  const list = normalizeList(data)
  if (list.length > 0) return list[0]
  if (data.data) {
    if (data.data.vod_id || data.data.vod_name || data.data.id || data.data.name) {
      return data.data
    }
    const dataList = normalizeList(data.data)
    if (dataList.length > 0) return dataList[0]
    if (data.data.vod && typeof data.data.vod === 'object') {
      if (data.data.vod.vod_id || data.data.vod.vod_name || data.data.vod.id || data.data.vod.name) {
        return data.data.vod
      }
    }
    if (data.data.info && typeof data.data.info === 'object') {
      if (data.data.info.vod_id || data.data.info.vod_name || data.data.info.id || data.data.info.name) {
        return data.data.info
      }
    }
  }
  if (data.vod && typeof data.vod === 'object') {
    if (data.vod.vod_id || data.vod.vod_name || data.vod.id || data.vod.name) {
      return data.vod
    }
  }
  if (data.info && typeof data.info === 'object') {
    if (data.info.vod_id || data.info.vod_name || data.info.id || data.info.name) {
      return data.info
    }
  }
  for (const key of Object.keys(data)) {
    const val = data[key]
    if (val && typeof val === 'object' && !Array.isArray(val)) {
      if (val.vod_id || val.vod_name || val.id || val.name) {
        return val
      }
      const subList = normalizeList(val)
      if (subList.length > 0) return subList[0]
      for (const subKey of Object.keys(val)) {
        const subVal = val[subKey]
        if (subVal && typeof subVal === 'object' && !Array.isArray(subVal)) {
          if (subVal.vod_id || subVal.vod_name || subVal.id || subVal.name) {
            return subVal
          }
        }
      }
    }
  }
  return null
}

export async function catvodGetVideoDetail(
  source: Source,
  vodId: string
): Promise<CatVodVideoDetail | null> {
  try {
    const tryUrls = [
      buildApiUrl(source.url, { ac: 'detail', ids: vodId }),
      buildApiUrl(source.url, { ac: 'detail', id: vodId }),
      buildApiUrl(source.url, { ac: 'vod', ids: vodId }),
      buildApiUrl(source.url, { ac: 'vod', id: vodId }),
      buildApiUrl(source.url, { ac: 'videolist', ids: vodId }),
      buildApiUrl(source.url, { ac: 'videolist', id: vodId }),
    ]

    for (const url of tryUrls) {
      try {
        const data = await fetchJson(url, source.config?.headers)
        console.log(`[catvodGetVideoDetail] URL: ${url}`)
        console.log(`[catvodGetVideoDetail] 原始响应:`, JSON.stringify(data).slice(0, 2000))
        const detail = normalizeDetail(data)
        if (detail) {
          console.log(`[catvodGetVideoDetail] 解析成功:`, JSON.stringify(detail).slice(0, 1000))
          console.log(`[catvodGetVideoDetail] vod_play_from:`, detail.vod_play_from || detail.play_from || detail.playFrom || '(空)')
          console.log(`[catvodGetVideoDetail] vod_play_url:`, (detail.vod_play_url || detail.play_url || detail.playUrl || detail.url || '(空)').toString().slice(0, 500))
          return detail
        }
      } catch (e) {
        console.log(`[catvodGetVideoDetail] URL尝试失败 ${url}:`, (e as Error).message)
        continue
      }
    }
    console.error(`获取视频详情失败 [${source.name}]: 所有URL格式均失败`)
    return null
  } catch (error) {
    console.error(`获取视频详情失败 [${source.name}]:`, error)
    return null
  }
}

export async function catvodGetPlayUrl(
  source: Source,
  playFlag: string,
  playUrl: string
): Promise<{ url: string | null; parse?: number }> {
  try {
    const tryUrls = [
      buildApiUrl(source.url, { ac: 'play', flag: playFlag, id: playUrl }),
      buildApiUrl(source.url, { ac: 'parse', flag: playFlag, id: playUrl }),
      buildApiUrl(source.url, { ac: 'vodplay', flag: playFlag, id: playUrl }),
    ]

    for (const apiUrl of tryUrls) {
      try {
        const data = await fetchJson(apiUrl, source.config?.headers)
        console.log(`[catvodGetPlayUrl] URL: ${apiUrl}`)
        console.log(`[catvodGetPlayUrl] 响应:`, JSON.stringify(data).slice(0, 1000))

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
          const finalUrl = resolveUrl(resolvedUrl, source.url)
          console.log(`[catvodGetPlayUrl] 解析成功: ${finalUrl.slice(0, 200)}`)
          return { url: finalUrl, parse: data.parse ?? data.data?.parse ?? 1 }
        }
      } catch (e) {
        console.log(`[catvodGetPlayUrl] URL尝试失败 ${apiUrl}:`, (e as Error).message)
        continue
      }
    }

    const directUrl = resolveUrl(playUrl, source.url)
    console.log(`[catvodGetPlayUrl] 直接使用原始URL: ${directUrl.slice(0, 200)}`)
    return { url: directUrl, parse: 0 }
  } catch (error) {
    console.error(`解析播放地址失败 [${source.name}]:`, error)
    return { url: resolveUrl(playUrl, source.url), parse: 0 }
  }
}

export async function catvodSearch(
  source: Source,
  keyword: string,
  page: number = 1
): Promise<CatVodVideo[]> {
  try {
    const urls = [
      buildApiUrl(source.url, { ac: 'detail', wd: keyword, pg: page }),
      buildApiUrl(source.url, { ac: 'list', wd: keyword, pg: page }),
      buildApiUrl(source.url, { wd: keyword, pg: page }),
    ]

    for (const url of urls) {
      try {
        const data = await fetchJson(url, source.config?.headers)
        const list = normalizeList(data)
        if (list.length > 0) {
          return list
        }
      } catch {
        continue
      }
    }

    return []
  } catch (error) {
    console.error(`搜索失败 [${source.name}]:`, error)
    return []
  }
}

export async function catvodGetBookDetail(
  source: Source,
  bookId: string
): Promise<{ book: CatVodBook | null; chapters: CatVodChapter[] }> {
  try {
    const url = buildApiUrl(source.url, { ac: 'detail', ids: bookId })
    const data = await fetchJson(url, source.config?.headers)
    const list = normalizeList(data)
    if (list.length === 0) return { book: null, chapters: [] }

    const book: CatVodBook = list[0]
    let chapters: CatVodChapter[] = []

    const playUrl = book.book_play_url || book.vod_play_url || book.play_url || book.url || ''
    const playFrom = book.book_play_from || book.vod_play_from || book.play_from || '默认'
    const chapterList = book.chapter_list || book.chapters || book.toc || null

    if (chapterList && Array.isArray(chapterList)) {
      chapters = chapterList.map((ch: any, idx: number) => ({
        chapter_id: ch.chapter_id || ch.id || `${bookId}_${idx}`,
        chapter_name: ch.chapter_name || ch.name || ch.title || `第${idx + 1}章`,
        content: ch.content || ch.url || '',
        book_id: bookId,
      }))
    } else if (playUrl) {
      const sources = playFrom.split('$$$').filter(Boolean)
      const urls = playUrl.split('$$$').filter(Boolean)

      if (urls.length > 0) {
        const firstSource = urls[0]
        chapters = firstSource
          .split('#')
          .filter(Boolean)
          .map((item: string, idx: number) => {
            const parts = item.split('$')
            return {
              chapter_id: `${bookId}_${idx}`,
              chapter_name: parts[0] || `第${idx + 1}章`,
              content: parts[1] || '',
              book_id: bookId,
            } as CatVodChapter
          })
      }
    }

    return { book, chapters }
  } catch (error) {
    console.error(`获取书籍详情失败 [${source.name}]:`, error)
    return { book: null, chapters: [] }
  }
}

export async function catvodGetChapterContent(
  source: Source,
  chapterId: string,
  chapterUrl?: string
): Promise<string> {
  if (chapterUrl && (chapterUrl.startsWith('http://') || chapterUrl.startsWith('https://'))) {
    try {
      const content = await fetchUrl(chapterUrl, source.config?.headers)
      const parsed = safeJSONParse(content)
      if (parsed) {
        return parsed.content || parsed.data?.content || parsed.text || parsed.body || content
      }
      return content
    } catch {
      // fall through to API method
    }
  }
  try {
    const url = buildApiUrl(source.url, { ac: 'play', flag: '章节', id: chapterId })
    const data = await fetchJson(url, source.config?.headers)
    const content = data.content || data.data?.content || data.url || data.text || ''
    return typeof content === 'string' ? content : JSON.stringify(content)
  } catch (error) {
    console.error(`获取章节内容失败 [${source.name}]:`, error)
    return ''
  }
}

export function catvodParsePlayList(detail: any): PlaySource[] {
  if (!detail || typeof detail !== 'object') {
    console.log('[catvodParsePlayList] detail为空或非对象，返回空数组')
    return []
  }
  console.log(`[catvodParsePlayList] 输入detail对象所有key:`, Object.keys(detail || {}))

  const playFrom =
    detail.vod_play_from ||
    detail.play_from ||
    detail.playFrom ||
    detail.vod_play_source ||
    detail.play_source ||
    detail.playSource ||
    detail.source ||
    detail.vod_source ||
    detail.from ||
    ''

  const playUrl =
    detail.vod_play_url ||
    detail.play_url ||
    detail.playUrl ||
    detail.url ||
    detail.vod_url ||
    detail.video_url ||
    detail.videoUrl ||
    detail.vod_play_list ||
    detail.play_list ||
    detail.playList ||
    detail.vod_urls ||
    ''

  console.log(`[catvodParsePlayList] playFrom="${String(playFrom).slice(0, 200)}"`)
  console.log(`[catvodParsePlayList] playUrl="${String(playUrl).slice(0, 300)}"`)

  if (!playUrl) {
    for (const key of Object.keys(detail || {})) {
      const val = detail[key]
      if (typeof val === 'string' && (val.includes('$') || val.includes('#') || val.includes('http'))) {
        if (val.length > 20 || val.includes('m3u8') || val.includes('.mp4')) {
          console.log(`[catvodParsePlayList] 尝试使用字段 "${key}" 作为播放地址: ${val.slice(0, 200)}`)
        }
      }
    }
    return []
  }

  const sources = String(playFrom).split(/\$\$\$|@@@|\|\|\||###/).filter(Boolean)
  const urls = String(playUrl).split(/\$\$\$|@@@|\|\|\||###/).filter(Boolean)

  console.log(`[catvodParsePlayList] 解析得到 ${sources.length} 个播放源名称, ${urls.length} 组播放地址`)

  const playList: PlaySource[] = []

  for (let i = 0; i < Math.max(sources.length, urls.length); i++) {
    const sourceName = sources[i] || `播放源${i + 1}`
    const urlsStr = urls[i] || ''
    const playUrls: PlayUrl[] = urlsStr
      .split('#')
      .filter(Boolean)
      .map((item: string, idx: number) => {
        const parts = item.split('$')
        if (parts.length >= 2) {
          return { name: parts[0] || `第${idx + 1}集`, url: parts.slice(1).join('$') }
        }
        if (parts[0] && (parts[0].startsWith('http') || parts[0].includes('.m3u8') || parts[0].includes('.mp4'))) {
          return { name: `第${idx + 1}集`, url: parts[0] }
        }
        return { name: parts[0] || `第${idx + 1}集`, url: '' }
      })
      .filter(u => u.url)

    if (playUrls.length > 0) {
      console.log(`[catvodParsePlayList] 播放源"${sourceName}"有 ${playUrls.length} 集`)
      playList.push({ name: sourceName, urls: playUrls })
    }
  }

  console.log(`[catvodParsePlayList] 最终解析结果: ${playList.length} 个播放源`)
  return playList
}

export function catvodVideoToVideo(
  item: any,
  sourceId: string,
  baseUrl: string,
  playList?: PlaySource[]
): Video {
  const vodId = item.vod_id || item.id || ''
  const vodName = item.vod_name || item.name || item.title || '未知'
  const vodPic = item.vod_pic || item.pic || item.cover || item.img || item.picture || ''
  const vodRemarks = item.vod_remarks || item.remarks || item.note || item.status || ''
  const vodArea = item.vod_area || item.area || item.region || ''
  const vodYear = item.vod_year || item.year || ''
  const vodDirector = item.vod_director || item.director || ''
  const vodActor = item.vod_actor || item.actor || item.actors || ''
  const vodContent = item.vod_content || item.content || item.intro || item.desc || item.description || ''
  const vodScore = item.vod_score || item.score || item.rating || ''
  const typeName = item.type_name || item.typeName || item.category || ''

  const cover = resolveUrl(vodPic, baseUrl)

  return {
    id: '',
    name: vodName,
    cover,
    intro: vodContent,
    rating: typeof vodScore === 'string' ? parseFloat(vodScore) || undefined : vodScore,
    year: vodYear,
    area: vodArea,
    director: vodDirector,
    actors: typeof vodActor === 'string' ? vodActor.split(/[,，]/).filter(Boolean) : Array.isArray(vodActor) ? vodActor : [],
    sourceId,
    videoUrl: '',
    playList: playList || [],
    category: typeName,
    remarks: vodRemarks,
    addedAt: 0,
  }
}

export function catvodBookToBook(
  item: any,
  sourceId: string,
  baseUrl: string,
  chapters?: Chapter[]
): Book {
  const bookId = item.book_id || item.vod_id || item.id || ''
  const bookName = item.book_name || item.vod_name || item.name || item.title || '未知'
  const bookPic = item.book_pic || item.vod_pic || item.cover || item.pic || item.img || ''
  const bookAuthor = item.book_author || item.vod_director || item.author || '未知'
  const bookDesc = item.book_desc || item.vod_content || item.intro || item.desc || item.description || ''
  const bookRemarks = item.book_remarks || item.vod_remarks || item.remarks || ''
  const typeName = item.type_name || item.typeName || item.category || ''

  const cover = resolveUrl(bookPic, baseUrl)

  return {
    id: '',
    name: bookName,
    author: bookAuthor,
    cover,
    intro: bookDesc,
    sourceId,
    bookUrl: bookId,
    chapters: chapters || [],
    category: typeName,
    addedAt: 0,
  }
}
