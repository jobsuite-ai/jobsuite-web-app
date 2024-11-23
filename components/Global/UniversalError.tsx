import { IconExclamationCircle } from '@tabler/icons-react';

export default function UniversalError() {
    return (
        <div>
            <IconExclamationCircle color='red' size={200} />
            <h2>Unexpected Error</h2>
        </div>
    );
}
