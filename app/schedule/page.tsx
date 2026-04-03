import { redirect } from 'next/navigation';

/** Legacy URL from scheduling branch; calendar UI lives at /calendar. */
export default function SchedulePageRedirect() {
  redirect('/calendar');
}
