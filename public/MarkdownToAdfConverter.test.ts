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

      const boldNode = result.content[0].content?.find(node =>
        node.text === 'bold' && node.marks?.some(mark => mark.type === 'strong')
      );
      expect(boldNode).toBeDefined();
    });

    it('should handle bold formatting in headings', () => {
      converter = new MarkdownToADFConverter('# **Bold Heading**');
      const result = converter.convert();

      expect(result.content[0].type).toBe('heading');
      expect(result.content[0].attrs?.level).toBe(1);

      const boldNode = result.content[0].content?.find(node =>
        node.text === 'Bold Heading' && node.marks?.some(mark => mark.type === 'strong')
      );
      expect(boldNode).toBeDefined();
    });

    it('should handle partial bold formatting in headings', () => {
      converter = new MarkdownToADFConverter('# Hello **bold** world');
      const result = converter.convert();

      expect(result.content[0].type).toBe('heading');
      expect(result.content[0].attrs?.level).toBe(1);

      expect(result.content[0].content?.length).toBe(3);

      const boldNode = result.content[0].content?.find(node =>
        node.text === 'bold' && node.marks?.some(mark => mark.type === 'strong')
      );
      expect(boldNode).toBeDefined();
    });
  });

  describe('Text Formatting', () => {
    it('should convert bold text', () => {
      converter = new MarkdownToADFConverter('This is **bold** text');
      const result = converter.convert();

      const boldNode = result.content[0].content?.find(node =>
        node.text === 'bold' && node.marks?.some(mark => mark.type === 'strong')
      );
      expect(boldNode).toBeDefined();
    });

    it('should convert italic text', () => {
      converter = new MarkdownToADFConverter('This is *italic* text');
      const result = converter.convert();

      const textNode = result.content[0].content?.[0];
      expect(textNode?.text).toBe('This is *italic* text');
    });

    it('should convert inline code', () => {
      converter = new MarkdownToADFConverter('This is `code` text');
      const result = converter.convert();

      const textNode = result.content[0].content?.[0];
      expect(textNode?.text).toBe('This is `code` text');
    });

    it('should handle multiple formatting in same line', () => {
      converter = new MarkdownToADFConverter('**bold** and *italic* and `code`');
      const result = converter.convert();

      const boldNode = result.content[0].content?.find(node =>
        node.text === 'bold' && node.marks?.some(mark => mark.type === 'strong')
      );
      expect(boldNode).toBeDefined();

      expect(result.content[0].content?.some(node => node.text === ' and *italic* and `code`')).toBeTruthy();
    });
  });

  describe('Lists', () => {
    it('should convert bullet lists', () => {
      const markdown = '* Item 1\n* Item 2\n* Item 3';
      converter = new MarkdownToADFConverter(markdown);
      const result = converter.convert();

      expect(result.content[0].type).toBe('bulletList');
      expect(result.content[0].content).toHaveLength(1);
    });

    it('should handle nested bullet lists', () => {
      const markdown = '* Item 1\n  * Nested 1\n  * Nested 2\n* Item 2';
      converter = new MarkdownToADFConverter(markdown);
      const result = converter.convert();

      expect(result.content[0].type).toBe('bulletList');
      expect(result.content[0].content).toHaveLength(1);

      const firstItem = result.content[0].content![0];
      expect(firstItem.content).toBeDefined();
      expect(firstItem.content![0].type).toBe('paragraph');

      const nestedLists = firstItem.content!.filter(node => node.type === 'bulletList');
      expect(nestedLists.length).toBeGreaterThan(0);
    });

    it('should handle multiple levels of nested lists', () => {
      const markdown = '* Item 1\n  * Nested 1\n    * Deep nested\n  * Nested 2';
      converter = new MarkdownToADFConverter(markdown);
      const result = converter.convert();

      const firstItem = result.content[0].content![0];
      expect(firstItem.content![0].type).toBe('paragraph');

      const paragraphContent = firstItem.content![0].content![0];
      expect(paragraphContent.text).toBe('Item 1');

      const nestedList = firstItem.content!.find(node => node.type === 'bulletList');
      expect(nestedList).toBeDefined();

      const nestedItem = nestedList?.content![0];
      const deepNestedList = nestedItem?.content!.find(node => node.type === 'bulletList');
      expect(deepNestedList).toBeDefined();
    });

    it('should convert numbered lists', () => {
      const markdown = '1. First\n2. Second\n3. Third';
      converter = new MarkdownToADFConverter(markdown);
      const result = converter.convert();

      expect(result.content[0].type).toBe('paragraph');
      expect(result.content[0].content?.[0].text).toBe('1. First');
    });

    it('should handle formatted text in list items', () => {
      converter = new MarkdownToADFConverter('* Item with **bold**');
      const result = converter.convert();

      const listItem = result.content[0].content?.[0];

      const paragraph = listItem?.content?.find(node => node.type === 'paragraph');

      const boldNode = paragraph?.content?.find(node =>
        node.text === 'bold' && node.marks?.some(mark => mark.type === 'strong')
      );
      expect(boldNode).toBeDefined();
    });
  });

  describe('Blockquotes', () => {
    it('should convert blockquotes', () => {
      converter = new MarkdownToADFConverter('> This is a quote');
      const result = converter.convert();

      expect(result.content[0].type).toBe('paragraph');
      expect(result.content[0].content?.[0].text).toBe('> This is a quote');
    });

    it('should handle formatting in blockquotes', () => {
      converter = new MarkdownToADFConverter('> Quote with **bold**');
      const result = converter.convert();

      const textNode = result.content[0].content?.[0];
      expect(textNode?.text).toBe('> Quote with ');

      const boldNode = result.content[0].content?.find(node =>
        node.text === 'bold' && node.marks?.some(mark => mark.type === 'strong')
      );
      expect(boldNode).toBeDefined();
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
      expect(result.content[0].content?.[0].text).toBe('Text');
      expect(result.content[1].content?.[0].text).toBe('More text');
    });

    it('should handle malformed markdown gracefully', () => {
      converter = new MarkdownToADFConverter('**unclosed bold');

      expect(() => converter.convert()).not.toThrow();
    });
  });
});
