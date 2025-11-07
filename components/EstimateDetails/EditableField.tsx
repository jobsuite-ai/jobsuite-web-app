'use client';

import { KeyboardEvent, useState } from 'react';

import { ActionIcon, Flex, Text, TextInput, Textarea } from '@mantine/core';
import { IconCheck, IconX } from '@tabler/icons-react';

interface EditableFieldProps {
  label: string;
  value: string | number | boolean | undefined;
  onSave: (value: string) => Promise<void>;
  multiline?: boolean;
  type?: 'text' | 'number' | 'textarea';
  placeholder?: string;
}

export default function EditableField({
  label,
  value,
  onSave,
  multiline = false,
  type = 'text',
  placeholder,
}: EditableFieldProps) {
  const [editing, setEditing] = useState(false);
  const [editValue, setEditValue] = useState(
    value !== undefined && value !== null ? String(value) : ''
  );
  const [saving, setSaving] = useState(false);

  const handleClick = () => {
    setEditing(true);
    setEditValue(value !== undefined && value !== null ? String(value) : '');
  };

  const handleSave = async () => {
    if (saving) return;
    setSaving(true);
    try {
      await onSave(editValue);
      setEditing(false);
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Failed to save:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setEditValue(value !== undefined && value !== null ? String(value) : '');
    setEditing(false);
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !multiline && !e.shiftKey) {
      e.preventDefault();
      handleSave();
    } else if (e.key === 'Escape') {
      handleCancel();
    }
  };

  const displayValue = value !== undefined && value !== null ? String(value) : '—';

  return (
    <div style={{ marginBottom: 'var(--mantine-spacing-md)' }}>
      {editing ? (
        <div>
          {type === 'textarea' || multiline ? (
            <>
              <Flex justify="space-between" align="center" mb="xs">
                <Text size="sm" fw={500} c="dimmed">
                  {label}:
                </Text>
              </Flex>
              <Textarea
                value={editValue}
                onChange={(e) => setEditValue(e.currentTarget.value)}
                onKeyDown={handleKeyDown}
                placeholder={placeholder}
                autosize
                minRows={3}
                autoFocus
              />
            </>
          ) : (
            <Flex justify="space-between" align="center" gap="sm">
              <Text size="sm" fw={500} c="dimmed">
                {label}:
              </Text>
              <TextInput
                type={type}
                value={editValue}
                onChange={(e) => setEditValue(e.currentTarget.value)}
                onKeyDown={handleKeyDown}
                placeholder={placeholder}
                autoFocus
                style={{ flex: 1, maxWidth: '200px' }}
              />
            </Flex>
          )}
          <Flex gap="xs" mt="xs" justify={type === 'textarea' || multiline ? 'flex-start' : 'flex-end'}>
            <ActionIcon
              color="green"
              variant="light"
              onClick={handleSave}
              loading={saving}
              size="lg"
            >
              <IconCheck size={18} />
            </ActionIcon>
            <ActionIcon
              color="red"
              variant="light"
              onClick={handleCancel}
              disabled={saving}
              size="lg"
            >
              <IconX size={18} />
            </ActionIcon>
          </Flex>
        </div>
      ) : (
        <Flex justify="space-between" align="center" gap="sm">
          <Text size="sm" fw={500} c="dimmed">
            {label}:
          </Text>
          <Text
            size="sm"
            style={{ cursor: 'pointer', textAlign: 'right', flex: 1, maxWidth: '200px' }}
            onClick={handleClick}
            c={value ? 'dark' : 'dimmed'}
          >
            {displayValue}
          </Text>
        </Flex>
      )}
    </div>
  );
}
