'use client';

import { Header } from './Header/Header';
import classes from './Shell.module.css';

export function Shell({ children }: { children: any }) {
  return (
    <div className={classes.verticalWrapper}>
      <Header />
      <div className={classes.wrapper}>
        <div className={classes.main}>
          {children}
        </div>
      </div>
    </div>
  );
}
