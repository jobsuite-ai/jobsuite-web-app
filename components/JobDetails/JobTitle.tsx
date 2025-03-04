'use client';

import { useEffect, useState } from 'react';

import { Text, TextInput } from '@mantine/core';

import classes from './styles/JobDetails.module.css';

import { UpdateJobContent } from '@/app/api/jobs/jobTypes';
import { logToCloudWatch } from '@/public/logger';

export default function JobTitle({ initialTitle, jobID, onSave }: {
  initialTitle: string,
  jobID: string,
  onSave?: () => void
}) {
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(initialTitle || '');

  useEffect(() => {
    if (!editing) {
      setTitle(initialTitle || '');
    }
  }, [initialTitle, editing]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setTitle(e.target.value);
  };

  const saveTitle = async () => {
    if (title !== initialTitle) {
      const content: UpdateJobContent = {
        job_title: title,
      };

      try {
        await fetch('/api/jobs', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ content, jobID }),
        });

        if (onSave) onSave();
      } catch (error) {
        logToCloudWatch(`Failed to update job title: ${error}`);
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      saveTitle();
      setEditing(false);
    }
  };

  return (
    <div className={classes.jobTitleContainer}>
      {editing ? (
        <TextInput
          value={title}
          onChange={handleChange}
          onBlur={saveTitle}
          onKeyDown={handleKeyDown}
          placeholder="Add Job Title"
          size="lg"
          autoFocus
          styles={{
            input: {
              fontSize: '18px',
              fontWeight: 700,
              textAlign: 'center',
            },
          }}
        />
      ) : (
        <Text
          size="lg"
          fw={700}
          ta="center"
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
