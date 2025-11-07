import { useEffect, useState } from 'react';

import { Card, Group, Text } from '@mantine/core';
import { IconX } from '@tabler/icons-react';
import { v4 as uuidv4 } from 'uuid';

import classes from '../styles/EstimateDetails.module.css';

import { UpdateJobContent } from '@/app/api/projects/jobTypes';
import { DynamoLineItem } from '@/components/Global/model';

const PRICE_BASED = process.env.NEXT_PUBLIC_PRICE_BASED === 'true';

export function LineItem({ lineItemDetails, estimateID, index, removeLineItem }: {
    lineItemDetails: DynamoLineItem, estimateID: string, index: number, removeLineItem: Function
}) {
    const [price, setPrice] = useState('');

    useEffect(() => {
        const priceStr = +lineItemDetails.price.N;
        setPrice(priceStr.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }));
    }, []);

    const deleteLineItem = async () => {
        const content: UpdateJobContent = {
            delete_line_item: index,
        };
        removeLineItem(lineItemDetails.id.S);

        const response = await fetch(
            `/api/estimates/${estimateID}`,
            {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(content),
            }
        );

        await response.json();
    };

    return (
        <Card
          key={uuidv4()}
          shadow="xs"
          padding="lg"
          radius="md"
          withBorder
          className={classes.lineItemCard}
        >
            <IconX
              onClick={() => deleteLineItem()}
              style={{ cursor: 'pointer', position: 'absolute', right: '5px', top: '5px', width: '20px' }}
            />
            <Group style={{ justifyContent: 'space-between', marginRight: '30px' }}>
                <Text size="lg" pl="md"><strong>{lineItemDetails.header.S}</strong></Text>
                {!PRICE_BASED && lineItemDetails.hours ?
                    <Text size="sm">Hours: {lineItemDetails.hours.N}</Text>
                    :
                    <Text size="sm">${price}</Text>
                }
            </Group>
            <Text pl="md" pt="sm" size="sm">Description: {lineItemDetails.description.S}</Text>
        </Card>
    );
}
