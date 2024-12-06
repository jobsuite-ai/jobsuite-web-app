import {
  IconArrowLeft,
  IconClockQuestion,
  IconListTree,
  IconMessage2
} from '@tabler/icons-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import classes from './SideNav.module.css';

const data = [
  { link: 'overview', label: 'Overview', icon: IconListTree },
  { link: 'estimate', label: 'Estimate', icon: IconClockQuestion },
  { link: 'comments', label: 'Comments', icon: IconMessage2 }
];

export function JobDetailsSideNav() {
  const [active, setActive] = useState('Billing');
  const router = useRouter();

  const links = data.map((item) => (
    <a
      className={classes.link}
      data-active={item.label === active || undefined}
      href={item.link}
      key={item.label}
      onClick={(event) => {
        event.preventDefault();
        setActive(item.label);
        router.push(`?page=${item.link}`)
      }}
    >
      <item.icon className={classes.linkIcon} stroke={1.5} />
      <span>{item.label}</span>
    </a>
  ));

  return (
    <aside className={classes.navbar}>
      <div className={classes.header}>
        <a href="#" className={classes.link} onClick={(event) => {
          event.preventDefault();
          router.back();
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