export interface Source {
  id: string
  name: string
  type: 'novel' | 'video' | 'live' | 'mixed'
  url: string
  enabled: boolean
  createdAt: number
  updatedAt: number
  config?: SourceConfig
}

export interface SourceConfig {
  apiType?: 'catvod' | 'tvbox' | 'yuedu' | 'iptv' | 'custom'
  searchUrl?: string
  detailUrl?: string
  playUrl?: string
  headers?: Record<string, string>
}

export interface Book {
  id: string
  name: string
  author: string
  cover: string
  intro: string
  sourceId: string
  bookUrl: string
  chapters?: Chapter[]
  lastReadChapter?: string
  lastReadTime?: number
  addedAt: number
}

export interface Chapter {
  id: string
  name: string
  url: string
  content?: string
  isVolume?: boolean
}

export interface Video {
  id: string
  name: string
  cover: string
  intro: string
  rating?: number
  year?: string
  area?: string
  director?: string
  actors?: string[]
  sourceId: string
  videoUrl: string
  playList?: PlaySource[]
  addedAt: number
}

export interface PlaySource {
  name: string
  urls: PlayUrl[]
}

export interface PlayUrl {
  name: string
  url: string
}

export interface LiveChannel {
  id: string
  name: string
  group: string
  logo?: string
  epg?: string
  urls: string[]
  sourceId: string
}

export interface LiveGroup {
  name: string
  channels: LiveChannel[]
}

export interface LocalFile {
  id: string
  name: string
  path: string
  type: 'novel' | 'video' | 'subtitle'
  size: number
  addedAt: number
}

export interface Settings {
  theme: 'light' | 'dark' | 'system'
  reader: ReaderSettings
  player: PlayerSettings
  network: NetworkSettings
}

export interface ReaderSettings {
  fontSize: number
  lineHeight: number
  letterSpacing: number
  fontFamily: string
  backgroundColor: string
  textColor: string
  paragraphSpacing: number
  pageWidth: number
  flipMode: 'page' | 'scroll' | 'continuous'
}

export interface PlayerSettings {
  autoPlay: boolean
  defaultVolume: number
  enableHardwareDecoding: boolean
  skipIntro: number
  skipEnding: number
}

export interface NetworkSettings {
  proxy?: string
  userAgent: string
  timeout: number
  retryCount: number
}

export interface ReadProgress {
  bookId: string
  chapterId: string
  position: number
  percentage: number
  updatedAt: number
}

export interface HistoryItem {
  id: string
  type: 'novel' | 'video' | 'live'
  itemId: string
  name: string
  cover: string
  progress: number
  updatedAt: number
}

export interface BookSource {
  id: string
  bookSourceName: string
  bookSourceType: number
  bookSourceUrl: string
  bookSourceGroup?: string
  bookSourceComment?: string
  enabled: boolean
  enabledExplore: boolean
  header?: string
  loginUrl?: string
  loginUi?: string
  loginCheckJs?: string
  bookUrlPattern?: string
  exploreUrl?: string
  exploreFormat?: string
  exploreKick?: string
  ruleExplore?: ExploreRule
  ruleSearch?: SearchRule
  ruleBookInfo?: BookInfoRule
  ruleToc?: TocRule
  ruleContent?: ContentRule
  searchUrl?: string
  ruleFind?: any
}

interface ExploreRule {
  author?: string
  bookList?: string
  bookUrl?: string
  coverUrl?: string
  intro?: string
  kind?: string
  lastChapter?: string
  name?: string
  wordCount?: string
}

interface SearchRule extends ExploreRule {
  checkKeyWord?: string
  addToShelf?: string
  checkBoxKey?: string
}

interface BookInfoRule {
  author?: string
  coverUrl?: string
  download?: string
  intro?: string
  kind?: string
  lastChapter?: string
  name?: string
  wordCount?: string
}

interface TocRule {
  chapterList?: string
  chapterName?: string
  chapterUrl?: string
  isVolume?: string
  preUpdateJs?: string
  updateTime?: string
}

interface ContentRule {
  content?: string
  imageReplace?: string
  payAction?: string
  preProcessJs?: string
  replaceRegex?: string
  sourceRegex?: string
  styleRegex?: string
  webJs?: string
}

export interface TvBoxSource {
  name: string
  url: string
}

export interface IptvChannel {
  name: string
  logo?: string
  url: string
  group?: string
  tvgId?: string
  tvgName?: string
}
