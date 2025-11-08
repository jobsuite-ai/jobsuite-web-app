'use client';

import { forwardRef, useEffect, useImperativeHandle, useState } from 'react';

import { Button, Group, Modal, NumberInput, TextInput, Textarea } from '@mantine/core';
import { useForm } from '@mantine/form';
import { notifications } from '@mantine/notifications';

import '@mantine/dropzone/styles.css';
import { LineItem } from './LineItem';
import classes from '../styles/EstimateDetails.module.css';

import LoadingState from '@/components/Global/LoadingState';

// Type for EstimateLineItem matching the backend API response
export type EstimateLineItem = {
    id: string;
    estimate_id?: string;
    contractor_id?: string;
    title: string;
    description: string;
    hours: number;
    rate: number;
    created_by?: string;
    created_at: string;
};

export type LineItemsRef = {
    openAddModal: () => void;
    getLineItemsCount: () => number;
};

const LineItems = forwardRef<LineItemsRef, {
    estimateID: string;
    onLineItemsChange?:(count: number) => void;
}>(({ estimateID, onLineItemsChange }, ref) => {
    const [opened, setOpened] = useState(false);
    const [editingItem, setEditingItem] = useState<EstimateLineItem | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [lineItems, setLineItems] = useState<EstimateLineItem[]>([]);
    const [isFetching, setIsFetching] = useState(true);

    const form = useForm({
        mode: 'uncontrolled',
        initialValues: {
            title: '',
            description: '',
            hours: 0,
            rate: 0,
        },
        validate: (values) => ({
            title: values.title === '' ? 'Must enter title' : null,
            description: values.description === '' ? 'Must enter description' : null,
            hours: values.hours <= 0 ? 'Hours must be greater than 0' : null,
            rate: values.rate <= 0 ? 'Rate must be greater than 0' : null,
        }),
    });

    // Fetch line items on mount
    useEffect(() => {
        fetchLineItems();
    }, [estimateID]);

    async function fetchLineItems() {
        setIsFetching(true);
        const accessToken = localStorage.getItem('access_token');

        if (!accessToken) {
            setIsFetching(false);
            return;
        }

        try {
            const response = await fetch(
                `/api/estimates/${estimateID}/line-items`,
                {
                    method: 'GET',
                    headers: {
                        Authorization: `Bearer ${accessToken}`,
                        'Content-Type': 'application/json',
                    },
                }
            );

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                notifications.show({
                    title: 'Error',
                    message: errorData.message || 'Failed to fetch line items',
                    color: 'red',
                });
                setIsFetching(false);
                return;
            }

            const items = await response.json();
            const itemsArray = items || [];
            setLineItems(itemsArray);
            onLineItemsChange?.(itemsArray.length);
        } catch (error) {
            // eslint-disable-next-line no-console
            console.error('Error fetching line items:', error);
            notifications.show({
                title: 'Error',
                message: 'An error occurred while fetching line items',
                color: 'red',
            });
        } finally {
            setIsFetching(false);
        }
    }

    async function addLineItem() {
        if (!form.validate().hasErrors) {
            setIsSubmitting(true);
            const accessToken = localStorage.getItem('access_token');

            if (!accessToken) {
                setIsSubmitting(false);
                return;
            }

            const formValues = form.getValues();

            try {
                const response = await fetch(
                    `/api/estimates/${estimateID}/line-items`,
                    {
                        method: 'POST',
                        headers: {
                            Authorization: `Bearer ${accessToken}`,
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({
                            title: formValues.title,
                            description: formValues.description,
                            hours: formValues.hours,
                            rate: formValues.rate,
                        }),
                    }
                );

                if (!response.ok) {
                    const errorData = await response.json().catch(() => ({}));
                    notifications.show({
                        title: 'Error',
                        message: errorData.message || 'Failed to create line item',
                        color: 'red',
                    });
                    setIsSubmitting(false);
                    return;
                }

                const newItem = await response.json();
                const updatedItems = [...lineItems, newItem];
                setLineItems(updatedItems);
                onLineItemsChange?.(updatedItems.length);
                form.reset();
                setOpened(false);
                notifications.show({
                    title: 'Success',
                    message: 'Line item added successfully',
                    color: 'green',
                });
            } catch (error) {
                // eslint-disable-next-line no-console
                console.error('Error creating line item:', error);
                notifications.show({
                    title: 'Error',
                    message: 'An error occurred while creating line item',
                    color: 'red',
                });
            } finally {
                setIsSubmitting(false);
            }
        }
    }

    async function updateLineItem() {
        if (!editingItem || form.validate().hasErrors) {
            return;
        }

        setIsSubmitting(true);
        const accessToken = localStorage.getItem('access_token');

        if (!accessToken) {
            setIsSubmitting(false);
            return;
        }

        const formValues = form.getValues();

        try {
            const response = await fetch(
                `/api/estimates/${estimateID}/line-items/${editingItem.id}`,
                {
                    method: 'PUT',
                    headers: {
                        Authorization: `Bearer ${accessToken}`,
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        title: formValues.title,
                        description: formValues.description,
                        hours: formValues.hours,
                        rate: formValues.rate,
                    }),
                }
            );

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                notifications.show({
                    title: 'Error',
                    message: errorData.message || 'Failed to update line item',
                    color: 'red',
                });
                setIsSubmitting(false);
                return;
            }

            const updatedItem = await response.json();
            const updatedItems = lineItems.map(item =>
                item.id === updatedItem.id ? updatedItem : item
            );
            setLineItems(updatedItems);
            onLineItemsChange?.(updatedItems.length);
            form.reset();
            setEditingItem(null);
            setOpened(false);
            notifications.show({
                title: 'Success',
                message: 'Line item updated successfully',
                color: 'green',
            });
        } catch (error) {
            // eslint-disable-next-line no-console
            console.error('Error updating line item:', error);
            notifications.show({
                title: 'Error',
                message: 'An error occurred while updating line item',
                color: 'red',
            });
        } finally {
            setIsSubmitting(false);
        }
    }

    async function deleteLineItem(id: string) {
        const accessToken = localStorage.getItem('access_token');

        if (!accessToken) {
            return;
        }

        try {
            const response = await fetch(
                `/api/estimates/${estimateID}/line-items/${id}`,
                {
                    method: 'DELETE',
                    headers: {
                        Authorization: `Bearer ${accessToken}`,
                        'Content-Type': 'application/json',
                    },
                }
            );

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                notifications.show({
                    title: 'Error',
                    message: errorData.message || 'Failed to delete line item',
                    color: 'red',
                });
                return;
            }

            const updatedItems = lineItems.filter(item => item.id !== id);
            setLineItems(updatedItems);
            onLineItemsChange?.(updatedItems.length);
            notifications.show({
                title: 'Success',
                message: 'Line item deleted successfully',
                color: 'green',
            });
        } catch (error) {
            // eslint-disable-next-line no-console
            console.error('Error deleting line item:', error);
            notifications.show({
                title: 'Error',
                message: 'An error occurred while deleting line item',
                color: 'red',
            });
        }
    }

    const handleEdit = (item: EstimateLineItem) => {
        setEditingItem(item);
        form.setValues({
            title: item.title || '',
            description: item.description,
            hours: item.hours,
            rate: item.rate || 0,
        });
        setOpened(true);
    };

    const handleClose = () => {
        setOpened(false);
        setEditingItem(null);
        form.reset();
    };

    const openAddModal = () => {
        form.reset();
        setEditingItem(null);
        setOpened(true);
    };

    // Expose methods via ref
    useImperativeHandle(ref, () => ({
        openAddModal,
        getLineItemsCount: () => lineItems.length,
    }));

    if (isFetching) {
        return <LoadingState />;
    }

    return (
        <div className={classes.lineItemsContainer}>
            {lineItems && lineItems.length > 0 ?
                <>
                    {lineItems.map((item) => (
                        <LineItem
                          key={item.id}
                          lineItem={item}
                          onEdit={() => handleEdit(item)}
                          onDelete={() => deleteLineItem(item.id)}
                        />
                    ))}
                </>
                :
                null
            }

            {lineItems.length > 0 && (
                <Group justify="center" mt="lg">
                    <Button onClick={() => {
                        form.reset();
                        setEditingItem(null);
                        setOpened(true);
                    }}>
                        Add Line Item
                    </Button>
                </Group>
            )}

            <Modal
              opened={opened}
              onClose={handleClose}
              title={editingItem ? 'Edit Line Item' : 'Add Line Item'}
              size="lg"
              centered
            >
                {isSubmitting ?
                    <LoadingState />
                    :
                    <div>
                        <TextInput
                          withAsterisk
                          label="Title"
                          placeholder="Enter the title"
                          key={form.key('title')}
                          {...form.getInputProps('title')}
                          mb="md"
                        />
                        <Textarea
                          withAsterisk
                          label="Description"
                          placeholder="Enter the description"
                          key={form.key('description')}
                          {...form.getInputProps('description')}
                          mb="md"
                        />
                        <NumberInput
                          withAsterisk
                          label="Hours"
                          placeholder="Enter the hours"
                          min={0}
                          decimalScale={2}
                          allowNegative={false}
                          key={form.key('hours')}
                          {...form.getInputProps('hours')}
                          mb="md"
                        />
                        <NumberInput
                          withAsterisk
                          label="Rate"
                          placeholder="Enter the rate"
                          prefix="$"
                          min={0}
                          decimalScale={2}
                          allowNegative={false}
                          key={form.key('rate')}
                          {...form.getInputProps('rate')}
                          mb="md"
                        />

                        <Group mt="md">
                            <Button
                              type="submit"
                              onClick={editingItem ? updateLineItem : addLineItem}
                            >
                                {editingItem ? 'Update Line Item' : 'Add Line Item'}
                            </Button>
                            <Button variant="outline" onClick={handleClose}>
                                Cancel
                            </Button>
                        </Group>
                    </div>
                }
            </Modal>
        </div>
    );
    }
);

LineItems.displayName = 'LineItems';

export default LineItems;
