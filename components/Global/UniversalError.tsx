import { Flex, Text } from '@mantine/core';
import { IconExclamationCircle } from '@tabler/icons-react';

export default function UniversalError({ message = 'Unexpected Error' }: { message: string }) {
    return (
        <Flex
          direction="column"
          align="center"
          justify="center"
          style={{ minHeight: '70vh', width: '100%' }}
        >
            <IconExclamationCircle color="#FF7F7F" size={140} />
            <Text c="gray.0" size="xl" fw={700}>{message}</Text>
        </Flex>
    );
}
