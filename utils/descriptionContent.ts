import { remark } from 'remark';
import remarkGfm from 'remark-gfm';
import html from 'remark-html';
import TurndownService from 'turndown';

const turndownService = new TurndownService({
    headingStyle: 'atx',
    bulletListMarker: '-',
});

/**
 * Heuristic: content is treated as HTML if it contains a tag-like pattern.
 * Matches DescriptionContentView logic so description display and editor stay in sync.
 */
export function isHtml(content: string): boolean {
    return /<\/?[a-z][\s\S]*>/i.test((content || '').trim());
}

/**
 * Convert markdown to HTML (e.g. for TipTap rich text editor).
 * Uses remark + GFM so output matches MarkdownRenderer (headings, lists, etc.).
 */
export async function markdownToHtml(markdown: string): Promise<string> {
    const trimmed = (markdown || '').trim();
    if (!trimmed) {
        return '';
    }
    const result = await remark()
        .use(remarkGfm)
        .use(html)
        .process(trimmed);
    return String(result);
}

/**
 * Convert HTML to markdown (e.g. when saving from TipTap so backend stays markdown).
 */
export function htmlToMarkdown(htmlContent: string): string {
    const trimmed = (htmlContent || '').trim();
    if (!trimmed) {
        return '';
    }
    return turndownService.turndown(trimmed);
}
