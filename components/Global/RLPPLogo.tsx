import { Image } from '@mantine/core';

import classes from './RLPPLogo.module.css';

export function RLPPLogo() {
  return (
    <Image
      h="60px"
      w="auto"
      className={classes.image}
      src="/RLPP_logo.png"
    />
  );
}
