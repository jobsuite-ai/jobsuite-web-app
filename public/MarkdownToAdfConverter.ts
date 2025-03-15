interface ADFNode {
  type: string;
  content?: ADFNode[];
  text?: string;
  marks?: { type: string; attrs?: Record<string, any> }[];
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

    let currentList: ADFNode | null = null;
    let listStack: { node: ADFNode, level: number }[] = [];

    for (const line of lines) {
      if (!line.trim()) {
        currentList = null;
        listStack = [];
      } else {
        // Helper function to process bold text
        const processBoldText = (
          text: string
        ): { type: string; text: string; marks?: { type: string }[] }[] => {
          const result: { type: string; text: string; marks?: { type: string }[] }[] = [];
          const parts = text.split(/(\*\*.*?\*\*)/g);

          for (const part of parts) {
            if (part.startsWith('**') && part.endsWith('**')) {
              result.push({
                type: 'text',
                text: part.slice(2, -2),
                marks: [{ type: 'strong' }],
              });
            } else if (part) {
              result.push({ type: 'text', text: part });
            }
          }

          return result.length ? result : [{ type: 'text', text }];
        };

        // Check for headings first
        const headingMatch = line.match(/^(#{1,6})\s(.+)$/);

        if (headingMatch) {
          currentList = null;
          listStack = [];

          const level = headingMatch[1].length;
          const text = headingMatch[2];

          content.push({
            type: 'heading',
            attrs: { level },
            content: processBoldText(text),
          });
        } else {
          // Then check for bullet points
          const bulletMatch = line.match(/^(\s*)[-*]\s(.+)/);

          if (bulletMatch) {
            const indent = bulletMatch[1].length;
            const bulletText = bulletMatch[2];
            const currentLevel = Math.floor(indent / 2);

            // Create list item content with proper bold formatting
            const itemContent: ADFNode[] = [{
              type: 'paragraph',
              content: processBoldText(bulletText),
            }];

            // Handle list nesting
            if (!currentList || listStack.length === 0) {
              // Start a new list
              currentList = {
                type: 'bulletList',
                content: [{
                  type: 'listItem',
                  content: itemContent,
                }],
              };

              content.push(currentList);
              listStack = [{ node: currentList, level: currentLevel }];
            } else {
              // Find the appropriate parent list based on indentation
              while (listStack.length > 0 &&
                listStack[listStack.length - 1].level >= currentLevel) {
                listStack.pop();
              }

              if (listStack.length === 0) {
                // Create a new top-level list
                currentList = {
                  type: 'bulletList',
                  content: [{
                    type: 'listItem',
                    content: itemContent,
                  }],
                };

                content.push(currentList);
                listStack = [{ node: currentList, level: currentLevel }];
              } else {
                // Get the parent list item to add a sublist
                const parentList = listStack[listStack.length - 1].node;
                const parentListItems = parentList.content!;
                const lastParentItem = parentListItems[parentListItems.length - 1];

                if (currentLevel > listStack[listStack.length - 1].level) {
                  // Create a nested list
                  const newList = {
                    type: 'bulletList',
                    content: [{
                      type: 'listItem',
                      content: itemContent,
                    }],
                  };

                  // Add the new list to the parent list item's content
                  if (!lastParentItem.content) {
                    lastParentItem.content = [];
                  }
                  lastParentItem.content.push(newList);

                  // Update current list and stack
                  currentList = newList;
                  listStack.push({ node: newList, level: currentLevel });
                } else {
                  // Add a sibling list item
                  parentList.content!.push({
                    type: 'listItem',
                    content: itemContent,
                  });
                }
              }
            }
          } else {
            // Default to paragraph with bold text support
            currentList = null;
            listStack = [];

            content.push({
              type: 'paragraph',
              content: processBoldText(line),
            });
          }
        }
      }
    }

    return {
      version: 1,
      type: 'doc',
      content,
    };
  }
}
