import { MarkdownToADFConverter } from './MarkdownToAdfConverter';

describe('MarkdownToADFConverter', () => {
  let converter: MarkdownToADFConverter;

  describe('Basic Document Structure', () => {
    it('should create a valid ADF document structure', () => {
      converter = new MarkdownToADFConverter('Simple text');
      const result = converter.convert();

      expect(result).toEqual({
        version: 1,
        type: 'doc',
        content: [
          {
            type: 'paragraph',
            content: [
              {
                type: 'text',
                text: 'Simple text',
              },
            ],
          },
        ],
      });
    });

    it('should handle empty lines', () => {
      converter = new MarkdownToADFConverter('First line\n\nSecond line');
      const result = converter.convert();

      expect(result.content).toHaveLength(2);
      expect(result.content[0].type).toBe('paragraph');
      expect(result.content[1].type).toBe('paragraph');
    });
  });

  describe('Headings', () => {
    it('should convert h1 to h6 headings', () => {
      const markdown = '# H1\n## H2\n### H3\n#### H4\n##### H5\n###### H6';
      converter = new MarkdownToADFConverter(markdown);
      const result = converter.convert();

      result.content.forEach((node, index) => {
        expect(node.type).toBe('heading');
        expect(node.attrs?.level).toBe(index + 1);
      });
    });

    it('should handle heading with formatting', () => {
      converter = new MarkdownToADFConverter('# Hello **bold** world');
      const result = converter.convert();

      expect(result.content[0].type).toBe('heading');
      expect(result.content[0].attrs?.level).toBe(1);
      expect(result.content[0].content?.[0].text).toContain('bold');
    });
  });

  describe('Text Formatting', () => {
    it('should convert bold text', () => {
      converter = new MarkdownToADFConverter('This is **bold** text');
      const result = converter.convert();

      const textNode = result.content[0].content?.[0];
      expect(textNode?.marks).toContainEqual({ type: 'strong' });
    });

    it('should convert italic text', () => {
      converter = new MarkdownToADFConverter('This is *italic* text');
      const result = converter.convert();

      const textNode = result.content[0].content?.[0];
      expect(textNode?.marks).toContainEqual({ type: 'em' });
    });

    it('should convert inline code', () => {
      converter = new MarkdownToADFConverter('This is `code` text');
      const result = converter.convert();

      const textNode = result.content[0].content?.[0];
      expect(textNode?.marks).toContainEqual({ type: 'code' });
    });

    it('should handle multiple formatting in same line', () => {
      converter = new MarkdownToADFConverter('**bold** and *italic* and `code`');
      const result = converter.convert();

      const textNode = result.content[0].content?.[0];
      expect(textNode?.marks).toHaveLength(3);
    });
  });

  describe('Lists', () => {
    it('should convert bullet lists', () => {
      const markdown = '* Item 1\n* Item 2\n* Item 3';
      converter = new MarkdownToADFConverter(markdown);
      const result = converter.convert();

      expect(result.content[0].type).toBe('bulletList');
      expect(result.content[0].content).toHaveLength(3);
    });

    it('should convert numbered lists', () => {
      const markdown = '1. First\n2. Second\n3. Third';
      converter = new MarkdownToADFConverter(markdown);
      const result = converter.convert();

      expect(result.content[0]?.content?.[0]?.type).toBe('listItem');
      expect(result.content[0]?.content).toHaveLength(3);
    });

    it('should handle formatted text in list items', () => {
      converter = new MarkdownToADFConverter('* Item with **bold**');
      const result = converter.convert();

      const listItem = result.content[0].content?.[0];
      expect(listItem?.content?.[0].content?.[0].marks).toContainEqual({ type: 'strong' });
    });
  });

  describe('Blockquotes', () => {
    it('should convert blockquotes', () => {
      converter = new MarkdownToADFConverter('> This is a quote');
      const result = converter.convert();

      expect(result.content[0].type).toBe('blockquote');
      expect(result.content[0].content?.[0].type).toBe('paragraph');
    });

    it('should handle formatting in blockquotes', () => {
      converter = new MarkdownToADFConverter('> Quote with **bold**');
      const result = converter.convert();

      const textNode = result.content[0].content?.[0].content?.[0];
      expect(textNode?.marks).toContainEqual({ type: 'strong' });
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty input', () => {
      converter = new MarkdownToADFConverter('');
      const result = converter.convert();

      expect(result.content).toHaveLength(0);
    });

    it('should handle multiple consecutive empty lines', () => {
      converter = new MarkdownToADFConverter('Text\n\n\n\nMore text');
      const result = converter.convert();

      expect(result.content).toHaveLength(2);
    });

    it('should handle malformed markdown gracefully', () => {
      converter = new MarkdownToADFConverter('**unclosed bold');

      expect(() => converter.convert()).not.toThrow();
    });
  });
});
