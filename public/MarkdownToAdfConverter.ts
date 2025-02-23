interface ADFNode {
  type: string;
  content?: ADFNode[];
  text?: string;
  marks?: { type: string }[];
  attrs?: Record<string, any>;
}

interface ADFDocument {
  version: number;
  type: 'doc';
  content: ADFNode[];
}

export class MarkdownToADFConverter {
  private markdown: string;

  constructor(markdown: string) {
    this.markdown = markdown;
  }

  public convert(): ADFDocument {
    const lines = this.markdown.split('\n');
    const content: ADFNode[] = [];
    let currentList: ADFNode[] = [];
    let lastIndentLevel = 0;

    for (const line of lines) {
      if (!line.trim()) {
        if (currentList.length > 0) {
          content.push(...currentList);
          currentList = [];
          lastIndentLevel = 0;
        }
      }

      const node = this.parseLine(line);

      if (node.type === 'listItem') {
        const indentMatch = line.match(/^(\s*)/);
        const indentLevel = indentMatch ? Math.floor(indentMatch[0].length / 2) : 0;

        if (indentLevel === 0) {
          if (currentList.length > 0) {
            content.push(...currentList);
            currentList = [];
          }
          currentList = [{
            type: 'bulletList',
            content: [node],
          }];
        } else if (indentLevel > lastIndentLevel) {
            // Create new nested list
            const parentList = currentList[currentList.length - 1];
            const lastItem = parentList.content![parentList.content!.length - 1];
            if (!lastItem.content) lastItem.content = [];
            lastItem.content.push({
              type: 'bulletList',
              content: [node],
            });
        } else if (indentLevel === lastIndentLevel) {
          // Add to current nested list
          const parentList = currentList[currentList.length - 1];
          const lastItem = parentList.content![parentList.content!.length - 1];
          const nestedList = lastItem.content![lastItem.content!.length - 1];
          nestedList.content!.push(node);
        }
        lastIndentLevel = indentLevel;
      } else {
        if (currentList.length > 0) {
          content.push(...currentList);
          currentList = [];
          lastIndentLevel = 0;
        }
        content.push(node);
      }
    }

    // Add any remaining list items
    if (currentList.length > 0) {
      content.push(...currentList);
    }

    return {
      version: 1,
      type: 'doc',
      content,
    };
  }

  private parseLine(line: string): ADFNode {
    // Handle headings with bold formatting
    const headingMatch = line.match(/^(#{1,6})\s(.+)$/); // Match the heading with # symbols
    if (headingMatch) {
      const headingLevel = headingMatch[1].length;
      const headingText = headingMatch[2]; // The text of the header

      // Check if the heading has bold formatting (by looking for ** around text)
      const marks: { type: string }[] = [];
      let processedText = headingText;
      if (processedText.includes('**')) {
        marks.push({ type: 'strong' });
        processedText = processedText.replace(/\*\*(.*?)\*\*/g, '$1'); // Remove the ** to get plain text
      }

      return {
        type: 'heading',
        attrs: { level: headingLevel },
        content: [
          {
            type: 'text',
            text: processedText,
            marks: marks.length > 0 ? marks : [], // Apply bold if ** was found
          },
        ],
      };
    }

    // Handle bullet lists (including indented)
    const bulletListMatch = line.match(/^(\s*)[-*]\s(.+)/);
    if (bulletListMatch) {
      const content = bulletListMatch[2];
      return {
        type: 'listItem',
        content: [
          {
            type: 'paragraph',
            content: [this.parseInlineContent(content)],
          },
        ],
      };
    }

    // Default to paragraph
    return {
      type: 'paragraph',
      content: [this.parseInlineContent(line)],
    };
  }

  private parseInlineContent(text: string): ADFNode {
    // Convert markdown formatting to marks
    let processedText = text;
    const marks: { type: string }[] = [];

    // Handle bold
    if (processedText.match(/\*\*(.*?)\*\*/)) {
      marks.push({ type: 'strong' });
      processedText = processedText.replace(/\*\*(.*?)\*\*/g, '$1');
    }

    // Handle italic
    if (processedText.match(/\*(.*?)\*/)) {
      marks.push({ type: 'em' });
      processedText = processedText.replace(/\*(.*?)\*/g, '$1');
    }

    const node: ADFNode = {
      type: 'text',
      text: processedText,
    };

    if (marks.length > 0) {
      node.marks = marks;
    }

    return node;
  }
}
