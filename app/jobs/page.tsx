import { ColorSchemeToggle } from '@/components/ColorSchemeToggle/ColorSchemeToggle';
import { UploadNewTemplate } from '@/components/Hooks/UploadNewTemplate';

export default function Jobs() {
    return (
        <>
            <div>Jobs List</div>
            <ColorSchemeToggle />
            <UploadNewTemplate />
        </>
    );
}
  