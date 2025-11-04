import { Image } from '@mantine/core';

import classes from './JobsuiteLogo.module.css';

export function JobsuiteLogo() {
  return (
    <Image
      h="60px"
      w="auto"
      className={classes.image}
      src="/jobsuite-logo-horizontal.png"
    />
  );
}
