import { NextResponse } from 'next/server';

// Mock data
const mockJobs = [
  {
    id: 'job1',
    job_status: 'NEW_LEAD',
    job_type: 'PAINTING',
    client_id: 'client1',
    client_name: 'John Doe',
    client_address: '123 Main St',
    city: 'Seattle',
    state: 'WA',
    zip_code: '98101',
    client_email: 'john@example.com',
    client_phone_number: '555-0123',
    hourly_rate: 75,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'job2',
    job_status: 'IN_PROGRESS',
    job_type: 'PAINTING',
    client_id: 'client2',
    client_name: 'Jane Smith',
    client_address: '456 Oak Ave',
    city: 'Seattle',
    state: 'WA',
    zip_code: '98102',
    client_email: 'jane@example.com',
    client_phone_number: '555-0124',
    hourly_rate: 80,
    createdAt: new Date().toISOString(),
  },
];

export async function GET() {
    return NextResponse.json({ Items: mockJobs });
}

export async function POST() {
    return NextResponse.json({ message: 'This API is not implemented' });
}

export async function PUT() {
    return NextResponse.json({ message: 'This API is not implemented' });
}

export async function DELETE() {
    return NextResponse.json({ message: 'This API is not implemented' });
}
