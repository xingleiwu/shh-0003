import { fetchJson, fetchUrl } from '@/utils/http'
import { generateId, safeJSONParse } from '@/utils'
import type { Source, Book, Video, Chapter, PlaySource, PlayUrl } from '@/types'

export interface CatVodCategory {
  type_id: string
  type_name: string
  type_flag?: string
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

export async function catvodGetCategories(source: Source): Promise<CatVodCategory[]> {
  try {
    const url = buildApiUrl(source.url, { ac: 'list' })
    const data = await fetchJson(url, source.config?.headers)
    if (data.class && Array.isArray(data.class)) {
      return data.class
    }
    if (data.data?.class && Array.isArray(data.data.class)) {
      return data.data.class
    }
    if (Array.isArray(data)) return data
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
    const url = buildApiUrl(source.url, { ac: 'detail', pg: 1 })
    const data = await fetchJson(url, source.config?.headers)

    let categories: CatVodCategory[] = []
    let videos: CatVodVideo[] = []
    let books: CatVodBook[] = []
    let list: any[] = []

    if (data.class) categories = Array.isArray(data.class) ? data.class : []
    if (data.list) list = Array.isArray(data.list) ? data.list : []
    if (data.data?.class) categories = Array.isArray(data.data.class) ? data.data.class : categories
    if (data.data?.list) list = Array.isArray(data.data.list) ? data.data.list : list

    const videosFromList = list.filter(
      (item: any) => item.vod_id || item.vod_name || source.type === 'video' || source.type === 'mixed'
    )
    const booksFromList = list.filter(
      (item: any) => item.book_id || item.book_name || source.type === 'novel'
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
      ac: 'detail',
      t: categoryId,
      pg: page,
      ...extend,
    })
    const data = await fetchJson(url, source.config?.headers)
    return {
      page: data.page || 1,
      pagecount: data.pagecount || 1,
      total: data.total || 0,
      limit: data.limit || 20,
      list: Array.isArray(data.list) ? data.list : data.data?.list || [],
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
    const list = Array.isArray(data.list) ? data.list : data.data?.list || []
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
    const url = buildApiUrl(source.url, {
      wd: keyword,
      pg: page,
    })
    const data = await fetchJson(url, source.config?.headers)
    const list = Array.isArray(data.list) ? data.list : data.data?.list || []
    return list
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
    const list = Array.isArray(data.list) ? data.list : data.data?.list || []
    if (list.length === 0) return { book: null, chapters: [] }

    const book: CatVodBook = list[0]
    let chapters: CatVodChapter[] = []
    const playUrl = list[0].book_play_url || list[0].vod_play_url || ''
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

export function catvodVideoToVideo(item: CatVodVideo, sourceId: string, playList?: PlaySource[]): Video {
  return {
    id: '',
    name: item.vod_name,
    cover: item.vod_pic,
    intro: item.vod_content || '',
    rating: typeof item.vod_score === 'string' ? parseFloat(item.vod_score) || undefined : item.vod_score,
    year: item.vod_year,
    area: item.vod_area,
    director: item.vod_director,
    actors: item.vod_actor?.split(/[,，]/)?.filter(Boolean) || [],
    sourceId,
    videoUrl: '',
    playList: playList || [],
    category: item.type_name,
    remarks: item.vod_remarks,
    addedAt: 0,
  }
}

export function catvodBookToBook(item: CatVodBook, sourceId: string, chapters?: Chapter[]): Book {
  return {
    id: '',
    name: item.book_name,
    author: item.book_author || '未知',
    cover: item.book_pic || '',
    intro: item.book_desc || '',
    sourceId,
    bookUrl: item.book_id,
    chapters: chapters || [],
    category: item.type_name,
    addedAt: 0,
  }
}
