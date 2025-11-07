import { Flex, Text } from '@mantine/core';
import { TablerIcon } from '@tabler/icons-react';

interface ResourceLinkProps {
  label: string;
  icon: TablerIcon;
  handler: Function;
}

export default function ResourceLink({ label, icon: Icon, handler }: ResourceLinkProps) {
  return (
    <Flex direction="column" align="center" justify="center">
        <Icon style={{ cursor: 'pointer' }} size={50} onClick={() => handler()} />
        <Text style={{ fontSize: 12 }} c="dimmed">{label}</Text>
    </Flex>
  );
}
