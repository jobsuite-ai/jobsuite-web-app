import { useState } from 'react';

import {
  IconArrowLeft,
  IconClockQuestion,
  IconListTree,
  IconFileText,
} from '@tabler/icons-react';
import { usePathname, useRouter } from 'next/navigation';

import classes from './JobDetailsSideNav.module.css';

const data = [
  { link: 'overview', label: 'Overview', icon: IconListTree },
  { link: 'estimate', label: 'Estimate Preview', icon: IconClockQuestion },
  { link: 'pdf', label: 'PDF Documents', icon: IconFileText },
];

export function JobDetailsSideNav() {
  const [active, setActive] = useState('Billing');
  const router = useRouter();
  const pathname = usePathname();

  const links = data.map((item) => (
    <a
      className={classes.link}
      data-active={item.label === active || undefined}
      href={item.link}
      key={item.label}
      onClick={(event) => {
        event.preventDefault();
        setActive(item.label);
        router.push(`?page=${item.link}`);
      }}
    >
      <item.icon className={classes.linkIcon} stroke={1.5} />
      <span>{item.label}</span>
    </a>
  ));

  return (
    <aside className={classes.navbar}>
      <div className={classes.header}>
        <a
          href="#"
          className={classes.link}
          onClick={(event) => {
          event.preventDefault();
          if (!pathname) return;
          const pathSegments = pathname.split('/');
          pathSegments.pop();
          const newPath = pathSegments.join('/');
          router.push(newPath);
        }}>
          <IconArrowLeft className={classes.linkIcon} stroke={1.5} />
          <span>Back To Jobs</span>
        </a>
      </div>

      <div className={classes.navbarMain}>
        {links}
      </div>
    </aside>
  );
}
