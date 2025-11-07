'use client';

import { KeyboardEvent, useEffect, useState } from 'react';

import { ActionIcon, Flex, Text, TextInput } from '@mantine/core';
import { IconCheck, IconX } from '@tabler/icons-react';

import classes from './styles/EstimateDetails.module.css';

import { UpdateJobContent } from '@/app/api/projects/jobTypes';
import { logToCloudWatch } from '@/public/logger';

export default function JobTitle({ initialTitle, estimateID, onSave }: {
  initialTitle: string,
  estimateID: string,
  onSave?: () => void
}) {
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(initialTitle || '');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!editing) {
      setTitle(initialTitle || '');
    }
  }, [initialTitle, editing]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setTitle(e.target.value);
  };

  const saveTitle = async () => {
    if (saving) return;
    if (title === initialTitle) {
      setEditing(false);
      return;
    }

    setSaving(true);
    const content: UpdateJobContent = {
      job_title: title,
    };

    try {
      await fetch(`/api/estimates/${estimateID}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(content),
      });

      if (onSave) onSave();
      setEditing(false);
    } catch (error) {
      logToCloudWatch(`Failed to update job title: ${error}`);
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setTitle(initialTitle || '');
    setEditing(false);
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      saveTitle();
    } else if (e.key === 'Escape') {
      handleCancel();
    }
  };

  return (
    <div className={classes.jobTitleContainer}>
      {editing ? (
        <Flex direction="column" gap="xs">
          <TextInput
            value={title}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            placeholder="Add Job Title"
            size="lg"
            autoFocus
            styles={{
              input: {
                fontSize: '24px',
                fontWeight: 700,
                textAlign: 'left',
              },
            }}
          />
          <Flex gap="xs" justify="flex-end">
            <ActionIcon
              color="green"
              variant="light"
              onClick={saveTitle}
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
        </Flex>
      ) : (
        <Text
          size="xl"
          fw={700}
          ta="left"
          c={title ? 'dark' : 'dimmed'}
          className={classes.jobTitle}
          onClick={() => setEditing(true)}
        >
          {title || 'Add Job Title'}
        </Text>
      )}
    </div>
  );
}
