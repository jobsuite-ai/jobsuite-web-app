'use client';

import { useEffect } from 'react';

import { RichTextEditor } from '@mantine/tiptap';
import Link from '@tiptap/extension-link';
import Underline from '@tiptap/extension-underline';
import { useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';

import styles from './RichTextBodyEditor.module.css';

interface RichTextBodyEditorProps {
    value: string;
    onChange: (value: string) => void;
    onBlur?: (value: string) => void;
    disabled?: boolean;
}

interface EditorLike {
    getHTML: () => string;
}

export default function RichTextBodyEditor({
    value,
    onChange,
    onBlur,
    disabled = false,
}: RichTextBodyEditorProps) {
    const editor = useEditor({
        extensions: [
            StarterKit,
            Underline,
            Link.configure({ openOnClick: false }),
        ],
        content: value,
        onUpdate: ({ editor: editorInstance }: { editor: EditorLike }) => {
            onChange(editorInstance.getHTML());
        },
    });

    useEffect(() => {
        if (!editor) {
            return;
        }
        const current = editor.getHTML();
        if (value !== current) {
            editor.commands.setContent(value || '', false);
        }
    }, [editor, value]);

    useEffect(() => {
        if (!editor) {
            return;
        }
        editor.setEditable(!disabled);
    }, [editor, disabled]);

    useEffect(() => {
        if (!editor || !onBlur) {
            return undefined;
        }
        const handleBlur = () => {
            onBlur(editor.getHTML());
        };
        editor.on('blur', handleBlur);
        return () => {
            editor.off('blur', handleBlur);
        };
    }, [editor, onBlur]);

    return (
        <RichTextEditor
          editor={editor}
          classNames={{
                root: styles.root,
                content: styles.content,
                toolbar: styles.toolbar,
            }}
          variant="subtle"
        >
            <RichTextEditor.Content />
            <RichTextEditor.Toolbar sticky={false}>
                <RichTextEditor.ControlsGroup>
                    <RichTextEditor.Bold />
                    <RichTextEditor.Italic />
                    <RichTextEditor.Underline />
                    <RichTextEditor.Strikethrough />
                    <RichTextEditor.ClearFormatting />
                </RichTextEditor.ControlsGroup>
                <RichTextEditor.ControlsGroup>
                    <RichTextEditor.BulletList />
                    <RichTextEditor.OrderedList />
                </RichTextEditor.ControlsGroup>
                <RichTextEditor.ControlsGroup>
                    <RichTextEditor.Link />
                    <RichTextEditor.Unlink />
                </RichTextEditor.ControlsGroup>
            </RichTextEditor.Toolbar>
        </RichTextEditor>
    );
}
