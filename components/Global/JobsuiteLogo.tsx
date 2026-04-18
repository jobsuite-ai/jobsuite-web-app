'use client';

import { useState } from 'react';

import { Image } from '@mantine/core';

import classes from './JobsuiteLogo.module.css';

interface JobsuiteLogoProps {
  logoUrl?: string | null;
}

export function JobsuiteLogo({ logoUrl }: JobsuiteLogoProps = {}) {
  const [contractorLogoFailed, setContractorLogoFailed] = useState(false);
  const useContractor = Boolean(logoUrl) && !contractorLogoFailed;
  const src = useContractor ? logoUrl! : '/jobsuite-logo-horizontal.png';

  return (
    <Image
      h="38px"
      w="auto"
      className={classes.image}
      src={src}
      alt={useContractor ? 'Company Logo' : 'Jobsuite Logo'}
      onError={() => {
        if (logoUrl && !contractorLogoFailed) {
          setContractorLogoFailed(true);
        }
      }}
    />
  );
}
