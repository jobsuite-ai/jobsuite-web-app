'use client';

import MarkdownRenderer from './MarkdownRenderer';

interface DescriptionContentViewProps {
    /** Description content: HTML (e.g. from TipTap), markdown, or plain text */
    content: string;
    className?: string;
}

/**
 * Renders estimate description content that may be HTML (rich text editor output),
 * markdown, or plain text. Use for consistent display in estimate details and signature views.
 */
export default function DescriptionContentView({
    content,
    className,
}: DescriptionContentViewProps) {
    const trimmed = (content || '').trim();
    if (!trimmed) {
        return null;
    }

    const isHtml = /<\/?[a-z][\s\S]*>/i.test(trimmed);

    if (isHtml) {
        return (
            <div
              className={className}
              dangerouslySetInnerHTML={{ __html: trimmed }}
            />
        );
    }

    return <MarkdownRenderer markdown={trimmed} />;
}
