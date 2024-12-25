"use client";

import { useUser } from "@auth0/nextjs-auth0/client";
import { Autocomplete, AutocompleteProps, Avatar, Divider, Group, Text, rem } from '@mantine/core';
import { IconSearch, IconUser } from '@tabler/icons-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { MouseEvent } from 'react';
import { RLPPLogo } from '../../Global/RLPPLogo';
import classes from './Header.module.css';


const links = [
  { link: '/jobs', label: 'Jobs' },
  { link: '/add-job', label: 'Add Job' },
  { link: '/clients', label: 'Clients' },
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
            <Group className={classes.linkWrapper}>
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
          <Link
            style={{ marginTop: rem(5) }}
            key={'Profile'}
            href={'/profile'}
            onClick={(event) => handleNavLinkClick(event, '/profile')}
          >
            <IconUser color='black' size={28} radius="xl" />
          </Link>
        </Group>
      </div>
    </header>
  );
}