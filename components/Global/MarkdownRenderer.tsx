import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkHtml from 'remark-html';
import classes from './MarkdownRenderer.module.css'

const MarkdownRenderer = ({ markdown }: { markdown: string }) => {
    return (
        <div className={classes.markdown}>
            <ReactMarkdown
                children={markdown}
                remarkPlugins={[remarkGfm, remarkHtml]}
            />
        </div>
    );
};

export default MarkdownRenderer;
