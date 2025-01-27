import { UpdateJobContent } from '@/app/api/jobs/jobTypes';
import { DynamoLineItem } from '@/components/Global/model';
import { Card, Group, rem, Text } from '@mantine/core';
import { IconX } from '@tabler/icons-react';
import { useState } from 'react';
import { v4 as uuidv4 } from 'uuid';

export function LineItem({ lineItemDetails, jobID, index }: { 
    lineItemDetails: DynamoLineItem, jobID: string, index: number 
}) {
    const [isDeleted, setIsDeleted] = useState(false);
    const price = +lineItemDetails.price.N; 

    const deleteLineItem = async () => {
        const content: UpdateJobContent = {
            delete_line_item: index
        }
    
        const response = await fetch(
            '/api/jobs',
            {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ content: content, jobID }),
            }
        )
    
        const { Attributes } = await response.json();
        setIsDeleted(true);
    }

    return (
        <>
            {!isDeleted &&
                <Card
                    key={uuidv4()}
                    shadow="xs"
                    padding="lg"
                    radius="md"
                    withBorder
                    m='lg'
                >
                    <IconX
                        onClick={() => deleteLineItem()}
                        style={{ cursor: 'pointer', position: 'absolute', right: '5px', top: '5px', width: '20px' }}
                    />
                    <Group style={{ justifyContent: 'space-between', marginRight: '30px' }}>
                        <Text size="lg" pl='md'><strong>{lineItemDetails.header.S}</strong></Text>
                        <Text size="sm">$ {price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</Text>
                    </Group>
                    <Text pl='md' pt="sm" size="sm">Description: {lineItemDetails.description.S}</Text>
                </Card>
            }
        </>
    );
}