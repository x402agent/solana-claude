// ═══════════════════════════════════════════════════════════════════════════════
// DARK RALPH TUI - News & Search Services
// News API, SERP API, Financial Datasets
// ═══════════════════════════════════════════════════════════════════════════════

// ─────────────────────────────────────────────────────────────────────────────
// NEWS API SERVICE
// ─────────────────────────────────────────────────────────────────────────────

interface NewsApiResponse {
  status: string;
  message?: string;
  articles?: any[];
}

interface SerpApiResponse {
  organic_results?: any[];
  news_results?: any[];
  search_information?: { total_results?: number; time_taken_displayed?: number };
  related_searches?: Array<{ query: string }>;
}

export interface NewsArticle {
  title: string;
  description: string;
  url: string;
  source: string;
  publishedAt: string;
  author?: string;
  imageUrl?: string;
  sentiment?: 'positive' | 'negative' | 'neutral';
}

export class NewsApiService {
  private apiKey: string;
  private baseUrl = 'https://newsapi.org/v2';

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async getTopHeadlines(query = 'cryptocurrency', country = 'us', pageSize = 20): Promise<NewsArticle[]> {
    try {
      const params = new URLSearchParams({
        q: query,
        country,
        pageSize: String(pageSize),
        apiKey: this.apiKey,
      });

      const response = await fetch(`${this.baseUrl}/top-headlines?${params}`);
      const data = (await response.json()) as NewsApiResponse;

      if (data.status !== 'ok') {
        throw new Error(data.message || 'News API error');
      }

      return (data.articles || []).map((article: any) => ({
        title: article.title,
        description: article.description,
        url: article.url,
        source: article.source?.name || 'Unknown',
        publishedAt: article.publishedAt,
        author: article.author,
        imageUrl: article.urlToImage,
      }));
    } catch (error) {
      console.error('[NEWS_API] Error:', error);
      return [];
    }
  }

  async searchNews(query: string, options: { sortBy?: 'relevancy' | 'popularity' | 'publishedAt'; from?: string; to?: string; pageSize?: number } = {}): Promise<NewsArticle[]> {
    try {
      const params = new URLSearchParams({
        q: query,
        sortBy: options.sortBy || 'publishedAt',
        pageSize: String(options.pageSize || 20),
        apiKey: this.apiKey,
      });

      if (options.from) params.append('from', options.from);
      if (options.to) params.append('to', options.to);

      const response = await fetch(`${this.baseUrl}/everything?${params}`);
      const data = (await response.json()) as NewsApiResponse;

      if (data.status !== 'ok') {
        throw new Error(data.message || 'News API error');
      }

      return (data.articles || []).map((article: any) => ({
        title: article.title,
        description: article.description,
        url: article.url,
        source: article.source?.name || 'Unknown',
        publishedAt: article.publishedAt,
        author: article.author,
        imageUrl: article.urlToImage,
      }));
    } catch (error) {
      console.error('[NEWS_API] Search error:', error);
      return [];
    }
  }

  async getCryptoNews(pageSize = 20): Promise<NewsArticle[]> {
    const queries = ['solana', 'bitcoin', 'ethereum', 'cryptocurrency', 'defi'];
    const query = queries.join(' OR ');
    return this.searchNews(query, { sortBy: 'publishedAt', pageSize });
  }

  async getSolanaNews(pageSize = 20): Promise<NewsArticle[]> {
    return this.searchNews('solana OR SOL OR solana blockchain', { sortBy: 'publishedAt', pageSize });
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// SERP API SERVICE - Search Engine Results
// ─────────────────────────────────────────────────────────────────────────────

export interface SearchResult {
  title: string;
  link: string;
  snippet: string;
  position: number;
  source?: string;
  date?: string;
}

export interface SerpResponse {
  results: SearchResult[];
  totalResults?: number;
  searchTime?: number;
  relatedSearches?: string[];
}

export class SerpApiService {
  private apiKey: string;
  private baseUrl = 'https://serpapi.com/search';

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async search(query: string, options: { engine?: string; num?: number; location?: string } = {}): Promise<SerpResponse> {
    try {
      const params = new URLSearchParams({
        q: query,
        api_key: this.apiKey,
        engine: options.engine || 'google',
        num: String(options.num || 10),
      });

      if (options.location) {
        params.append('location', options.location);
      }

      const response = await fetch(`${this.baseUrl}?${params}`);
      const data = (await response.json()) as SerpApiResponse;

      const results: SearchResult[] = (data.organic_results || []).map((result: any, index: number) => ({
        title: result.title,
        link: result.link,
        snippet: result.snippet,
        position: index + 1,
        source: result.source,
        date: result.date,
      }));

      return {
        results,
        totalResults: data.search_information?.total_results,
        searchTime: data.search_information?.time_taken_displayed,
        relatedSearches: (data.related_searches || []).map((s: any) => s.query),
      };
    } catch (error) {
      console.error('[SERP_API] Error:', error);
      return { results: [] };
    }
  }

  async searchNews(query: string, num = 10): Promise<SerpResponse> {
    try {
      const params = new URLSearchParams({
        q: query,
        api_key: this.apiKey,
        engine: 'google_news',
        num: String(num),
      });

      const response = await fetch(`${this.baseUrl}?${params}`);
      const data = (await response.json()) as SerpApiResponse;

      const results: SearchResult[] = (data.news_results || []).map((result: any, index: number) => ({
        title: result.title,
        link: result.link,
        snippet: result.snippet,
        position: index + 1,
        source: result.source?.name,
        date: result.date,
      }));

      return { results };
    } catch (error) {
      console.error('[SERP_API] News search error:', error);
      return { results: [] };
    }
  }

  async searchFinance(query: string): Promise<any> {
    try {
      const params = new URLSearchParams({
        q: query,
        api_key: this.apiKey,
        engine: 'google_finance',
      });

      const response = await fetch(`${this.baseUrl}?${params}`);
      return await response.json();
    } catch (error) {
      console.error('[SERP_API] Finance search error:', error);
      return null;
    }
  }

  async getTrends(keyword: string): Promise<any> {
    try {
      const params = new URLSearchParams({
        q: keyword,
        api_key: this.apiKey,
        engine: 'google_trends',
      });

      const response = await fetch(`${this.baseUrl}?${params}`);
      return await response.json();
    } catch (error) {
      console.error('[SERP_API] Trends error:', error);
      return null;
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// FINANCIAL DATASETS SERVICE
// ─────────────────────────────────────────────────────────────────────────────

export interface FinancialData {
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
  volume: number;
  marketCap?: number;
  timestamp: number;
}

export class FinancialDatasetService {
  private apiKey: string;
  private baseUrl = 'https://api.financialdatasets.ai';

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  private async fetch<T>(endpoint: string, params: Record<string, any> = {}): Promise<T | null> {
    try {
      const queryString = new URLSearchParams(params).toString();
      const url = `${this.baseUrl}${endpoint}${queryString ? '?' + queryString : ''}`;

      const response = await fetch(url, {
        headers: {
          'X-API-KEY': this.apiKey,
        },
      });

      if (!response.ok) {
        throw new Error(`Financial Dataset API error: ${response.status}`);
      }

      return (await response.json()) as T;
    } catch (error) {
      console.error('[FINANCIAL_DATASET] Error:', error);
      return null;
    }
  }

  async getQuote(symbol: string): Promise<FinancialData | null> {
    const data = await this.fetch<any>('/quotes', { symbol });
    if (!data) return null;

    return {
      symbol: data.symbol,
      price: data.price,
      change: data.change,
      changePercent: data.changePercent,
      volume: data.volume,
      marketCap: data.marketCap,
      timestamp: Date.now(),
    };
  }

  async getHistoricalPrices(symbol: string, startDate: string, endDate: string): Promise<any[]> {
    const data = await this.fetch<any[]>('/prices', {
      symbol,
      start_date: startDate,
      end_date: endDate,
    });
    return data || [];
  }

  async getMarketSentiment(symbol: string): Promise<any> {
    return this.fetch('/sentiment', { symbol });
  }

  async getEconomicCalendar(startDate?: string, endDate?: string): Promise<any[]> {
    const data = await this.fetch<any[]>('/economic-calendar', {
      ...(startDate && { start_date: startDate }),
      ...(endDate && { end_date: endDate }),
    });
    return data || [];
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// UNIFIED NEWS & SEARCH SERVICE
// ─────────────────────────────────────────────────────────────────────────────

export class UnifiedNewsSearchService {
  private newsApi?: NewsApiService;
  private serpApi?: SerpApiService;
  private financialDataset?: FinancialDatasetService;

  constructor(config: { newsApiKey?: string; serpApiKey?: string; financialDatasetKey?: string }) {
    if (config.newsApiKey) {
      this.newsApi = new NewsApiService(config.newsApiKey);
    }
    if (config.serpApiKey) {
      this.serpApi = new SerpApiService(config.serpApiKey);
    }
    if (config.financialDatasetKey) {
      this.financialDataset = new FinancialDatasetService(config.financialDatasetKey);
    }
  }

  // Get comprehensive news from all sources
  async getComprehensiveNews(topic: string): Promise<{ news: NewsArticle[]; search: SearchResult[] }> {
    const [newsResults, searchResults] = await Promise.all([
      this.newsApi?.searchNews(topic, { pageSize: 10 }) || Promise.resolve([]),
      this.serpApi?.searchNews(topic, 10) || Promise.resolve({ results: [] }),
    ]);

    return {
      news: newsResults,
      search: searchResults.results,
    };
  }

  // Get Solana-specific intelligence
  async getSolanaIntelligence(): Promise<{
    news: NewsArticle[];
    trends: any;
    sentiment: string;
  }> {
    const [news, trends] = await Promise.all([
      this.newsApi?.getSolanaNews(10) || Promise.resolve([]),
      this.serpApi?.getTrends('solana') || Promise.resolve(null),
    ]);

    // Simple sentiment analysis based on news titles
    let positiveCount = 0;
    let negativeCount = 0;
    const positiveWords = ['surge', 'rally', 'gain', 'bullish', 'high', 'growth', 'success'];
    const negativeWords = ['crash', 'drop', 'fall', 'bearish', 'low', 'decline', 'fail'];

    news.forEach((article) => {
      const title = article.title.toLowerCase();
      if (positiveWords.some((word) => title.includes(word))) positiveCount++;
      if (negativeWords.some((word) => title.includes(word))) negativeCount++;
    });

    let sentiment = 'neutral';
    if (positiveCount > negativeCount + 2) sentiment = 'bullish';
    else if (negativeCount > positiveCount + 2) sentiment = 'bearish';

    return { news, trends, sentiment };
  }

  // Real-time search across all sources
  async universalSearch(query: string): Promise<{
    news: NewsArticle[];
    web: SearchResult[];
    finance?: any;
  }> {
    const [news, web, finance] = await Promise.all([
      this.newsApi?.searchNews(query, { pageSize: 5 }) || Promise.resolve([]),
      this.serpApi?.search(query, { num: 10 }) || Promise.resolve({ results: [] }),
      this.serpApi?.searchFinance(query) || Promise.resolve(null),
    ]);

    return {
      news,
      web: web.results,
      finance,
    };
  }

  // Get available services
  getAvailableServices(): string[] {
    const services: string[] = [];
    if (this.newsApi) services.push('newsapi');
    if (this.serpApi) services.push('serpapi');
    if (this.financialDataset) services.push('financial-datasets');
    return services;
  }
}

export default UnifiedNewsSearchService;
