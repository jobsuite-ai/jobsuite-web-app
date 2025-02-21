import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkHtml from 'remark-html';

import classes from './MarkdownRenderer.module.css';

const MarkdownRenderer = ({ markdown }: { markdown: string }) => (
        <div className={classes.markdown}>
            <ReactMarkdown
              remarkPlugins={[remarkGfm, remarkHtml]}
            >
              {markdown}
            </ReactMarkdown>
        </div>
    );

export default MarkdownRenderer;
