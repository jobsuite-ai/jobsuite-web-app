'use client';

import { useState } from 'react';

import { Collapse, Flex, Text, UnstyledButton } from '@mantine/core';
import { IconChevronDown, IconChevronRight } from '@tabler/icons-react';

import classes from './styles/EstimateDetails.module.css';

interface CollapsibleSectionProps {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
  headerActions?: React.ReactNode;
}

export default function CollapsibleSection({
  title,
  children,
  defaultOpen = true,
  headerActions,
}: CollapsibleSectionProps) {
  const [opened, setOpened] = useState(defaultOpen);

  return (
    <div className={classes.collapsibleSection}>
      <div className={classes.collapsibleSectionHeader}>
        <UnstyledButton
          onClick={() => setOpened((o) => !o)}
          style={{ flex: 1 }}
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
