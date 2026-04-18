/**
 * Wrap bare Jobsuite signing URLs in anchor tags for message preview HTML.
 */
export function linkifyJobsuiteSignUrls(text: string): string {
    if (!text) {
        return text;
    }
    return text.replace(
        /https:\/\/(?:qa\.)?jobsuite\.app\/sign\/[a-zA-Z0-9_-]+/g,
        (url) => {
            const safeAttr = url
                .replace(/&/g, '&amp;')
                .replace(/"/g, '&quot;');
            const safeText = url
                .replace(/&/g, '&amp;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;');
            return `<a href="${safeAttr}" target="_blank" rel="noopener noreferrer">${safeText}</a>`;
        }
    );
}
