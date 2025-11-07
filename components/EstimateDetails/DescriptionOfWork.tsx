'use client';

import { useState } from 'react';

import { Button, Group, Text, Textarea } from '@mantine/core';
import { IconEdit } from '@tabler/icons-react';

import classes from './styles/EstimateDetails.module.css';

import { UpdateJobContent } from '@/app/api/projects/jobTypes';
import MarkdownRenderer from '@/components/Global/MarkdownRenderer';
import { Estimate } from '@/components/Global/model';

export default function DescriptionOfWork({ estimate, estimateID, onSave }: {
  estimate: Estimate;
  estimateID: string;
  onSave?: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [description, setDescription] = useState(estimate.description || estimate.notes || '');

  const handleSave = async () => {
    const content: UpdateJobContent = {
      notes: description,
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
      // eslint-disable-next-line no-console
      console.error('Failed to update description:', error);
    }
  };

  const handleCancel = () => {
    setDescription(estimate.description || estimate.notes || '');
    setEditing(false);
  };

  return (
    <div className={classes.descriptionContainer} style={{ position: 'relative' }}>
      <div style={{ position: 'relative' }}>
        <IconEdit
          onClick={() => setEditing(true)}
          style={{ cursor: 'pointer', position: 'absolute', top: '-5px', right: '-5px' }}
        />
      </div>
      {editing ? (
        <>
          <Text size="lg" fw={700} mb="md">Description</Text>
          <Textarea
            value={description}
            onChange={(e) => setDescription(e.currentTarget.value)}
            placeholder="Enter description of work"
            minRows={5}
            autosize
            maxRows={15}
            mb="md"
          />
          <Group justify="flex-end">
            <Button variant="subtle" onClick={handleCancel}>Cancel</Button>
            <Button onClick={handleSave}>Save</Button>
          </Group>
        </>
      ) : (
        <>
          {description ? (
            <MarkdownRenderer markdown={description} />
          ) : (
            <Text c="dimmed" style={{ fontStyle: 'italic' }}>
              No description provided. Click the edit icon to add one.
            </Text>
          )}
        </>
      )}
    </div>
  );
}
