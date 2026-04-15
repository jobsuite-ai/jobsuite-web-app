'use client';

import { useEffect, useRef, useState } from 'react';

import { Collapse, Flex, Loader, Text, UnstyledButton } from '@mantine/core';
import { IconChevronDown, IconChevronRight } from '@tabler/icons-react';

import classes from './styles/EstimateDetails.module.css';

interface CollapsibleSectionProps {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
  headerActions?: React.ReactNode;
  loading?: boolean;
  /** Called the first time the section is opened (including auto-open from defaultOpen). */
  onOpen?: () => void;
}

export default function CollapsibleSection({
  title,
  children,
  defaultOpen = true,
  headerActions,
  loading = false,
  onOpen,
}: CollapsibleSectionProps) {
  const [opened, setOpened] = useState(false);
  const hasNotifiedOpenRef = useRef(false);

  // Only expand when not loading and defaultOpen is true
  useEffect(() => {
    if (!loading && defaultOpen) {
      setOpened(true);
    }
  }, [loading, defaultOpen]);

  useEffect(() => {
    if (!opened) return;
    if (hasNotifiedOpenRef.current) return;
    hasNotifiedOpenRef.current = true;
    onOpen?.();
  }, [opened, onOpen]);

  return (
    <div className={classes.collapsibleSection}>
      <div className={classes.collapsibleSectionHeader}>
        <UnstyledButton
          onClick={() => {
            if (!loading) {
              setOpened((o) => {
                const next = !o;
                if (next) {
                  onOpen?.();
                }
                return next;
              });
            }
          }}
          style={{ flex: 1, cursor: loading ? 'default' : 'pointer' }}
          disabled={loading}
        >
          <Flex align="center" gap="xs">
            {opened ? (
              <IconChevronDown size={16} style={{ color: 'var(--mantine-color-dimmed)' }} />
            ) : (
              <IconChevronRight size={16} style={{ color: 'var(--mantine-color-dimmed)' }} />
            )}
            <Text size="lg" fw={700}>
              {title}
            </Text>
            {loading && (
              <Loader size="sm" style={{ marginLeft: 'var(--mantine-spacing-xs)' }} />
            )}
          </Flex>
        </UnstyledButton>
        {headerActions && (
          <Flex
            gap="xs"
            align="center"
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.stopPropagation();
              }
            }}
            role="presentation"
          >
            {headerActions}
          </Flex>
        )}
      </div>
      <Collapse in={opened}>
        <div className={classes.collapsibleSectionContent}>{children}</div>
      </Collapse>
    </div>
  );
}
