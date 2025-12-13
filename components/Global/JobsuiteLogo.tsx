import { Image } from '@mantine/core';

import classes from './JobsuiteLogo.module.css';

interface JobsuiteLogoProps {
  logoUrl?: string | null;
}

export function JobsuiteLogo({ logoUrl }: JobsuiteLogoProps = {}) {
  // Use contractor logo if provided, otherwise default to Jobsuite logo
  const src = logoUrl || '/jobsuite-logo-horizontal.png';

  return (
    <Image
      h="38px"
      w="auto"
      className={classes.image}
      src={src}
      alt={logoUrl ? 'Company Logo' : 'Jobsuite Logo'}
    />
  );
}
