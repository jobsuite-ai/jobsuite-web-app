"use client";

import { Autocomplete, Group, Avatar, Text, rem, AutocompleteProps, Divider } from '@mantine/core';
import { IconSearch } from '@tabler/icons-react';
import classes from './Header.module.css';
import { RLPPLogo } from '../../Global/RLPPLogo';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { MouseEvent } from 'react';
import { AuthButtons } from '@/components/navigation/auth-buttons';
import { useUser } from "@auth0/nextjs-auth0/client";


const links = [
  { link: '/jobs', label: 'Jobs' },
  { link: '/add-job', label: 'Add Job' },
];

export function Header() {
  const router = useRouter();
  const { user } = useUser();

  const handleNavLinkClick = (event: MouseEvent<HTMLAnchorElement, globalThis.MouseEvent>, link: string) => {
    event.preventDefault();
    router.push(link);
  }

  const items = links.map((link) => (
    <Link
      key={link.label}
      href={link.link}
      className={classes.link}
      onClick={(event) => handleNavLinkClick(event, link.link)}
    >
      {link.label}
    </Link>
  ));

  const usersData: Record<string, { email: string }> = {
    'Emily Johnson': {
      email: 'emily92@gmail.com',
    },
    'Ava Rodriguez': {
      email: 'ava_rose@gmail.com',
    },
    'Olivia Chen': {
      email: 'livvy_globe@gmail.com',
    },
    'Ethan Barnes': {
      email: 'ethan_explorer@gmail.com',
    },
    'Mason Taylor': {
      email: 'mason_musician@gmail.com',
    },
  };

  const renderAutocompleteOption: AutocompleteProps['renderOption'] = ({ option }) => (
    <Group gap="sm">
      <Avatar src={'/black-circle-user-symbol.png'} size={36} radius="xl" />
      <div>
        <Text size="sm">{option.value}</Text>
        <Text size="xs" opacity={0.5}>
          {usersData[option.value].email}
        </Text>
      </div>
    </Group>
  );

  const data = Object.keys(usersData);

  return (
    <header className={classes.header}>
      <div className={classes.inner}>
        <Link
          key={'Home'}
          href={'/'}
          onClick={(event) => handleNavLinkClick(event, '/')}
        >
          <RLPPLogo />
        </Link>

        <Group>
          {user && (
            <Group ml={50} gap={5} className={classes.links} visibleFrom="sm">
              {items}
            </Group>
          )}
          <Autocomplete
            style={{ marginRight: rem(12) }}
            className={classes.search}
            placeholder='Search by client name'
            leftSection={<IconSearch style={{ width: rem(32), height: rem(16) }} stroke={1.5} />}
            renderOption={renderAutocompleteOption}
            data={data}
            visibleFrom="xs"
          />
          <Divider orientation="vertical" />
          <AuthButtons />
        </Group>
      </div>
    </header>
  );
}