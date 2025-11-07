'use client';

import { useState } from 'react';

import { Header } from './Header/Header';
import classes from './Shell.module.css';

export function Shell({ children }: { children: any }) {
  const [sidebarOpened, setSidebarOpened] = useState(false);

  return (
    <div className={classes.verticalWrapper}>
      <Header sidebarOpened={sidebarOpened} setSidebarOpened={setSidebarOpened} />
      <div className={`${classes.wrapper} ${sidebarOpened ? classes.wrapperWithSidebar : ''}`}>
        <div className={classes.main}>
          {children}
        </div>
      </div>
    </div>
  );
}
