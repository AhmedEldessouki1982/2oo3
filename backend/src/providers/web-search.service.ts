import { Injectable, Logger } from '@nestjs/common'

export interface SearchResult {
  query: string
  results: Array<{ title: string; snippet: string }>
  summary: string
}

@Injectable()
export class WebSearchService {
  private readonly logger = new Logger(WebSearchService.name)

  async search(query: string): Promise<SearchResult> {
    try {
      const url = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; 2oo3/1.0)',
          Accept: 'text/html',
        },
      })
      const html = await response.text()

      const blocks = html.split('<div class="result results_links results_links_deep web-result ">')
      const results: Array<{ title: string; snippet: string }> = []

      for (let i = 1; i < blocks.length && results.length < 5; i++) {
        const block = blocks[i]
        const titleMatch = block.match(/class="result__a"[^>]*>([\s\S]*?)<\/a>/)
        const snippetMatch = block.match(/class="result__snippet"[^>]*>([\s\S]*?)<\//)
        if (titleMatch) {
          results.push({
            title: titleMatch[1].replace(/<[^>]+>/g, '').trim(),
            snippet: snippetMatch
              ? snippetMatch[1]
                  .replace(/<[^>]+>/g, '')
                  .replace(/&#x27;/g, "'")
                  .replace(/&quot;/g, '"')
                  .replace(/&amp;/g, '&')
                  .trim()
              : '',
          })
        }
      }

      const summary = results
        .map((r, i) => `${i + 1}. ${r.title}: ${r.snippet}`)
        .join('\n')

      return { query, results, summary }
    } catch (error) {
      this.logger.error(
        `Web search failed for "${query}": ${error instanceof Error ? error.message : 'unknown'}`,
      )
      return { query, results: [], summary: '' }
    }
  }
}
