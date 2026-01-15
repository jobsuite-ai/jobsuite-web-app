'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import {
    Alert,
    Button,
    Checkbox,
    Modal,
    Radio,
    Stack,
    Text,
    TextInput,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { IconCheck, IconX } from '@tabler/icons-react';

interface SignatureFormProps {
    signatureHash: string;
    clientEmail: string;
    onSignatureSuccess: () => void;
    signatureType?: 'CLIENT' | 'CONTRACTOR';
    opened: boolean;
    onClose: () => void;
}

export default function SignatureForm({
    signatureHash,
    clientEmail,
    onSignatureSuccess,
    signatureType = 'CLIENT',
    opened,
    onClose,
}: SignatureFormProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [isDrawing, setIsDrawing] = useState(false);
    const [signerName, setSignerName] = useState('');
    const [signerEmail, setSignerEmail] = useState(clientEmail);
    const [consentGiven, setConsentGiven] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [hasSignature, setHasSignature] = useState(false);
    const [signatureMethod, setSignatureMethod] = useState<'draw' | 'type'>('draw');
    const [typedSignature, setTypedSignature] = useState('');

    const getCoordinates = (
        e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>
    ) => {
        const canvas = canvasRef.current;
        if (!canvas) return null;

        const rect = canvas.getBoundingClientRect();
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;

        if ('touches' in e) {
            const touch = e.touches[0] || e.changedTouches[0];
            return {
                x: (touch.clientX - rect.left) * scaleX,
                y: (touch.clientY - rect.top) * scaleY,
            };
        }
            return {
                x: (e.clientX - rect.left) * scaleX,
                y: (e.clientY - rect.top) * scaleY,
            };
    };

    const startDrawing = (
        e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>
    ) => {
        e.preventDefault();
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const coords = getCoordinates(e);
        if (!coords) return;

        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 2;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        setIsDrawing(true);
        ctx.beginPath();
        ctx.moveTo(coords.x, coords.y);
        setHasSignature(true);
    };

    const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
        e.preventDefault();
        if (!isDrawing) return;

        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const coords = getCoordinates(e);
        if (!coords) return;

        ctx.lineTo(coords.x, coords.y);
        ctx.stroke();
    };

    const stopDrawing = () => {
        setIsDrawing(false);
    };

    const clearSignature = () => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        ctx.clearRect(0, 0, canvas.width, canvas.height);
        setHasSignature(false);
        if (signatureMethod === 'type') {
            setTypedSignature('');
        }
    };

    const renderTypedSignature = useCallback(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // Clear canvas
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        if (!typedSignature.trim()) {
            setHasSignature(false);
            return;
        }

        // Set cursive font styling
        ctx.fillStyle = '#000000';
        ctx.font = 'italic 82px "Brush Script MT", "Lucida Handwriting", "Comic Sans MS", cursive';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';

        // Calculate text position (centered vertically, left-aligned with padding)
        const padding = 20;
        const x = padding;
        const y = canvas.height / 2;

        // Draw the signature text
        ctx.fillText(typedSignature.trim(), x, y);

        setHasSignature(true);
    }, [typedSignature]);

    // Update typed signature on canvas when typedSignature changes
    const handleTypedSignatureChange = (value: string) => {
        setTypedSignature(value);
        // Render will happen in useEffect
    };

    // Render typed signature when it changes
    useEffect(() => {
        if (signatureMethod === 'type') {
            renderTypedSignature();
        }
    }, [typedSignature, signatureMethod, renderTypedSignature]);

    // Clear canvas when switching methods
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        ctx.clearRect(0, 0, canvas.width, canvas.height);
        setHasSignature(false);
        setTypedSignature('');
    }, [signatureMethod]);

    const handleSubmit = async () => {
        setError(null);

        // Validation
        if (!signerName.trim()) {
            setError('Please enter your name');
            return;
        }

        if (!signerEmail.trim() || !signerEmail.includes('@')) {
            setError('Please enter a valid email address');
            return;
        }

        if (!consentGiven) {
            setError('You must consent to sign this estimate');
            return;
        }

        if (signatureMethod === 'draw' && !hasSignature) {
            setError('Please provide your signature');
            return;
        }

        if (signatureMethod === 'type' && !typedSignature.trim()) {
            setError('Please enter your signature name');
            return;
        }

        // Get signature data
        const canvas = canvasRef.current;
        if (!canvas) {
            setError('Signature canvas not available');
            return;
        }

        const signatureData = canvas.toDataURL('image/png');

        setSubmitting(true);

        try {
            // Use Next.js API route as proxy
            const response = await fetch(
                `/api/signature/${signatureHash}/sign`,
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        signature_type: signatureType,
                        signature_data: signatureData,
                        signer_name: signerName.trim(),
                        signer_email: signerEmail.trim(),
                        consent_given: true,
                        device_info: navigator.userAgent,
                    }),
                }
            );

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ detail: 'Failed to submit signature' }));
                throw new Error(errorData.detail || 'Failed to submit signature');
            }

            notifications.show({
                title: 'Success',
                message: 'Your signature has been recorded successfully.',
                color: 'green',
                icon: <IconCheck size={16} />,
            });

            onClose();
            onSignatureSuccess();
        } catch (err: any) {
            setError(err.message || 'An error occurred while submitting your signature');
            notifications.show({
                title: 'Error',
                message: err.message || 'Failed to submit signature',
                color: 'red',
                icon: <IconX size={16} />,
            });
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <Modal
          opened={opened}
          onClose={onClose}
          title="Sign Estimate"
          size="lg"
          centered
        >
            <Stack gap="md">
                {error && (
                    <Alert color="red" title="Error" variant="light">
                        {error}
                    </Alert>
                )}

                <TextInput
                  label="Name"
                  placeholder="Enter your full name"
                  value={signerName}
                  onChange={(e) => setSignerName(e.target.value)}
                  required
                />

                <TextInput
                  label="Email"
                  placeholder="Enter your email"
                  type="email"
                  value={signerEmail}
                  onChange={(e) => setSignerEmail(e.target.value)}
                  required
                />

                <div>
                    <Text size="sm" fw={500} mb="xs">
                        Signature
                    </Text>

                    <Radio.Group
                      value={signatureMethod}
                      onChange={(value) => setSignatureMethod(value as 'draw' | 'type')}
                      mb="sm"
                    >
                        <Stack gap="xs">
                            <Radio value="draw" label="Draw signature" />
                            <Radio value="type" label="Type name (cursive font)" />
                        </Stack>
                    </Radio.Group>

                    {signatureMethod === 'type' && (
                        <TextInput
                          label="Signature Name"
                          placeholder="Enter your name as you'd like it to appear"
                          value={typedSignature}
                          onChange={(e) => handleTypedSignatureChange(e.target.value)}
                          mb="sm"
                        />
                    )}

                    <div
                      style={{
                            border: '2px solid #dee2e6',
                            borderRadius: '4px',
                            position: 'relative',
                            backgroundColor: '#fff',
                        }}
                    >
                        <canvas
                          ref={canvasRef}
                          width={600}
                          height={200}
                          style={{
                                display: 'block',
                                cursor: signatureMethod === 'draw' ? 'crosshair' : 'default',
                                width: '100%',
                                height: '200px',
                                touchAction: signatureMethod === 'draw' ? 'none' : 'auto',
                            }}
                          onMouseDown={signatureMethod === 'draw' ? startDrawing : undefined}
                          onMouseMove={signatureMethod === 'draw' ? draw : undefined}
                          onMouseUp={signatureMethod === 'draw' ? stopDrawing : undefined}
                          onMouseLeave={signatureMethod === 'draw' ? stopDrawing : undefined}
                          onTouchStart={signatureMethod === 'draw' ? startDrawing : undefined}
                          onTouchMove={signatureMethod === 'draw' ? draw : undefined}
                          onTouchEnd={signatureMethod === 'draw' ? stopDrawing : undefined}
                        />
                        <Button
                          variant="subtle"
                          size="xs"
                          onClick={clearSignature}
                          style={{ position: 'absolute', top: '8px', right: '8px' }}
                        >
                            Clear
                        </Button>
                    </div>
                    <Text size="xs" c="dimmed" mt="xs">
                        {signatureMethod === 'draw'
                            ? 'Please sign above using your mouse or touch screen'
                            : 'Your typed name will appear in cursive above'}
                    </Text>
                </div>

                <Checkbox
                  label="I consent to sign this estimate and agree to the terms"
                  checked={consentGiven}
                  onChange={(e) => setConsentGiven(e.currentTarget.checked)}
                  required
                />

                <Button
                  onClick={handleSubmit}
                  loading={submitting}
                  disabled={
                      !signerName ||
                      !signerEmail ||
                      !consentGiven ||
                      (signatureMethod === 'draw' && !hasSignature) ||
                      (signatureMethod === 'type' && !typedSignature.trim())
                  }
                  fullWidth
                  size="lg"
                >
                    Submit Signature
                </Button>
            </Stack>
        </Modal>
    );
}
