import { DynamoLineItem } from '@/components/Global/model';
import { Card, Group, rem, Text } from '@mantine/core';
import { v4 as uuidv4 } from 'uuid';

export function LineItem({ lineItemDetails }: { lineItemDetails: DynamoLineItem }) {
    const price = +lineItemDetails.price.N; 
    return (
        <Card
            key={uuidv4()}
            shadow="xs"
            padding="lg"
            radius="md"
            withBorder
            m='lg'
        >
            <Group style={{ justifyContent: 'space-between' }}>
                <Text size="lg" pl='md'><strong>{lineItemDetails.header.S}</strong></Text>
                <Text size="sm">$ {price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</Text>
            </Group>
            <Text pl={40} pt="sm" size="sm">Description: {lineItemDetails.description.S}</Text>
        </Card>
    );
}