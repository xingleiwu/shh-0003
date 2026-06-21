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
  type_id?: string
  type_name?: string
}

function buildApiUrl(baseUrl: string, params: Record<string, any>): string {
  const url = baseUrl.replace(/\/$/, '')
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
    const url = buildApiUrl(source.url, { ac: 'list' })
    const data = await fetchJson(url, source.config?.headers)
    return normalizeClass(data)
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
    const url = buildApiUrl(source.url, { ac: 'list', pg: 1 })
    const data = await fetchJson(url, source.config?.headers)

    const categories = normalizeClass(data)
    const list = normalizeList(data)

    const videosFromList = list.filter(
      (item: any) =>
        item.vod_id ||
        item.vod_name ||
        item.id ||
        item.name ||
        source.type === 'video' ||
        source.type === 'mixed'
    )
    const booksFromList = list.filter(
      (item: any) =>
        item.book_id || item.book_name || item.bookId || item.bookName || source.type === 'novel'
    )

    return {
      categories,
      videos: videosFromList.length > 0 ? videosFromList : [],
      books: booksFromList.length > 0 ? booksFromList : [],
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
    const url = buildApiUrl(source.url, {
      ac: 'list',
      t: categoryId,
      pg: page,
      ...extend,
    })
    const data = await fetchJson(url, source.config?.headers)
    const list = normalizeList(data)
    const pageInfo = normalizePageInfo(data, page)
    return {
      ...pageInfo,
      list,
    }
  } catch (error) {
    console.error(`获取分类内容失败 [${source.name}]:`, error)
    return { page, pagecount: 1, total: 0, limit: 20, list: [] }
  }
}

export async function catvodGetVideoDetail(
  source: Source,
  vodId: string
): Promise<CatVodVideoDetail | null> {
  try {
    const url = buildApiUrl(source.url, {
      ac: 'detail',
      ids: vodId,
    })
    const data = await fetchJson(url, source.config?.headers)
    const list = normalizeList(data)
    if (list.length > 0) return list[0]
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
    const url = buildApiUrl(source.url, {
      ac: 'play',
      flag: playFlag,
      id: playUrl,
    })
    const data = await fetchJson(url, source.config?.headers)
    return {
      url: data.url || data.data?.url || null,
      parse: data.parse,
    }
  } catch (error) {
    console.error(`解析播放地址失败 [${source.name}]:`, error)
    return { url: playUrl, parse: 0 }
  }
}

export async function catvodSearch(
  source: Source,
  keyword: string,
  page: number = 1
): Promise<CatVodVideo[]> {
  try {
    const urls = [
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
      } catch (e) {
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
    const url = buildApiUrl(source.url, {
      ac: 'detail',
      ids: bookId,
    })
    const data = await fetchJson(url, source.config?.headers)
    const list = normalizeList(data)
    if (list.length === 0) return { book: null, chapters: [] }

    const book: CatVodBook = list[0]
    let chapters: CatVodChapter[] = []
    const playUrl = list[0].book_play_url || list[0].vod_play_url || list[0].url || ''
    const playFrom = list[0].book_play_from || list[0].vod_play_from || '默认'

    const sources = playFrom.split('$$$').filter(Boolean)
    const urls = playUrl.split('$$$').filter(Boolean)

    if (sources.length > 0 && urls.length > 0) {
      const firstSource = urls[0]
      chapters = firstSource
        .split('#')
        .filter(Boolean)
        .map((item: string, idx: number) => {
          const [name, url] = item.split('$')
          return {
            chapter_id: `${bookId}_${idx}`,
            chapter_name: name || `第${idx + 1}章`,
            content: '',
            book_id: bookId,
          } as CatVodChapter
        })
    }

    return { book, chapters }
  } catch (error) {
    console.error(`获取书籍详情失败 [${source.name}]:`, error)
    return { book: null, chapters: [] }
  }
}

export async function catvodGetChapterContent(
  source: Source,
  chapterId: string
): Promise<string> {
  try {
    const url = buildApiUrl(source.url, {
      ac: 'play',
      flag: '章节',
      id: chapterId,
    })
    const data = await fetchJson(url, source.config?.headers)
    const content = data.content || data.data?.content || data.url || ''
    return typeof content === 'string' ? content : JSON.stringify(content)
  } catch (error) {
    console.error(`获取章节内容失败 [${source.name}]:`, error)
    return ''
  }
}

export function catvodParsePlayList(detail: CatVodVideoDetail): PlaySource[] {
  const playFrom = detail.vod_play_from || ''
  const playUrl = detail.vod_play_url || ''
  const sources = playFrom.split('$$$').filter(Boolean)
  const urls = playUrl.split('$$$').filter(Boolean)

  const playList: PlaySource[] = []

  for (let i = 0; i < Math.max(sources.length, urls.length); i++) {
    const sourceName = sources[i] || `播放源${i + 1}`
    const urlsStr = urls[i] || ''
    const playUrls: PlayUrl[] = urlsStr
      .split('#')
      .filter(Boolean)
      .map((item, idx) => {
        const parts = item.split('$')
        const name = parts[0] || `第${idx + 1}集`
        const url = parts[1] || parts[0] || ''
        return { name, url }
      })

    if (playUrls.length > 0) {
      playList.push({ name: sourceName, urls: playUrls })
    }
  }

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
