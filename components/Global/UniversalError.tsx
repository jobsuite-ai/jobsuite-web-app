import { Flex } from '@mantine/core';
import { IconExclamationCircle } from '@tabler/icons-react';

export default function UniversalError({ message = "Unexpected Error" }: { message: string }) {
    return (
        <Flex direction='column' align='center'>
            <IconExclamationCircle color='#FF7F7F' size={180} />
            <h2>{message}</h2>
        </Flex>
    );
}
