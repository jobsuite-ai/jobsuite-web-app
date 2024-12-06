"use client";

import { Header } from './Header/Header';
import classes from './Shell.module.css';
import { JobDetailsSideNav } from './JobDetailsSideNav';
import { usePathname } from 'next/navigation';

export function Shell({ children }: { children: any }) {
  const pathname = usePathname();

  return (
    <div className={classes.verticalWrapper}>
      <Header />
      {pathname.match('.*/jobs/.*') && <JobDetailsSideNav />}
      
      <div className={classes.wrapper}>
        <div className={classes.spacer} />
        <div className={classes.main}>
          {children}
        </div>
        <div className={classes.spacer} />
      </div>
    </div>
  );
}