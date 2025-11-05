'use client';

import { usePathname } from 'next/navigation';

import { Header } from './Header/Header';
import classes from './Shell.module.css';

export function Shell({ children }: { children: any }) {
  const pathname = usePathname();
  const isProjectsPage = pathname === '/projects';

  return (
    <div className={classes.verticalWrapper}>
      <Header />
      <div className={classes.wrapper}>
        {!isProjectsPage && <div className={classes.spacer} />}
        <div className={classes.main}>
          {children}
        </div>
        {!isProjectsPage && <div className={classes.spacer} />}
      </div>
    </div>
  );
}
