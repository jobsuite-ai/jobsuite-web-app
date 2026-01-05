'use client';

import { useRef, useState } from 'react';

import {
    Alert,
    Button,
    Checkbox,
    Paper,
    Stack,
    Text,
    TextInput,
    Title,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { IconCheck, IconX } from '@tabler/icons-react';

interface SignatureFormProps {
    signatureHash: string;
    clientEmail: string;
    onSignatureSuccess: () => void;
    signatureType?: 'CLIENT' | 'CONTRACTOR';
}

export default function SignatureForm({
    signatureHash,
    clientEmail,
    onSignatureSuccess,
    signatureType = 'CLIENT',
}: SignatureFormProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [isDrawing, setIsDrawing] = useState(false);
    const [signerName, setSignerName] = useState('');
    const [signerEmail, setSignerEmail] = useState(clientEmail);
    const [consentGiven, setConsentGiven] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [hasSignature, setHasSignature] = useState(false);

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
    };

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

        if (!hasSignature) {
            setError('Please provide your signature');
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
        <Paper shadow="sm" p="xl" radius="md" withBorder>
            <Stack gap="md">
                <Title order={3}>Sign Estimate</Title>

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
                                cursor: 'crosshair',
                                width: '100%',
                                height: '200px',
                                touchAction: 'none',
                            }}
                          onMouseDown={startDrawing}
                          onMouseMove={draw}
                          onMouseUp={stopDrawing}
                          onMouseLeave={stopDrawing}
                          onTouchStart={startDrawing}
                          onTouchMove={draw}
                          onTouchEnd={stopDrawing}
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
                        Please sign above using your mouse or touch screen
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
                  disabled={!signerName || !signerEmail || !consentGiven || !hasSignature}
                  fullWidth
                  size="lg"
                >
                    Submit Signature
                </Button>
            </Stack>
        </Paper>
    );
}
