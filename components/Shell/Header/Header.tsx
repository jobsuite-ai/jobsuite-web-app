"use client";

import { Autocomplete, Group, Avatar, Text, rem, AutocompleteProps } from '@mantine/core';
import { IconSearch } from '@tabler/icons-react';
import classes from './Header.module.css';
import { RLPPLogo } from '../../Global/RLPPLogo';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { forwardRef, MouseEvent } from 'react';

const links = [
  { link: '/jobs', label: 'Jobs' },
  { link: '/add-job', label: 'Add Job' },
];

export function Header() {
  const router = useRouter()

  const handleNavLinkClick = (event: MouseEvent<HTMLAnchorElement, globalThis.MouseEvent>, link: string) => {
    event.preventDefault();
    router.push(link);
  }

  const jobs = ['React', 'Last', 'Another', 'Peek', 'Test']

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

  const usersData: Record<string, { image: string; email: string }> = {
    'Emily Johnson': {
      image: 'https://raw.githubusercontent.com/mantinedev/mantine/master/.demo/avatars/avatar-7.png',
      email: 'emily92@gmail.com',
    },
    'Ava Rodriguez': {
      image: 'https://raw.githubusercontent.com/mantinedev/mantine/master/.demo/avatars/avatar-8.png',
      email: 'ava_rose@gmail.com',
    },
    'Olivia Chen': {
      image: 'https://raw.githubusercontent.com/mantinedev/mantine/master/.demo/avatars/avatar-4.png',
      email: 'livvy_globe@gmail.com',
    },
    'Ethan Barnes': {
      image: 'https://raw.githubusercontent.com/mantinedev/mantine/master/.demo/avatars/avatar-1.png',
      email: 'ethan_explorer@gmail.com',
    },
    'Mason Taylor': {
      image: 'https://raw.githubusercontent.com/mantinedev/mantine/master/.demo/avatars/avatar-2.png',
      email: 'mason_musician@gmail.com',
    },
  };

  const renderAutocompleteOption: AutocompleteProps['renderOption'] = ({ option }) => (
    <Group gap="sm">
      <Avatar src={usersData[option.value].image} size={36} radius="xl" />
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
          <Group ml={50} gap={5} className={classes.links} visibleFrom="sm">
            {items}
          </Group>
          <Autocomplete
            className={classes.search}
            placeholder="Search"
            leftSection={<IconSearch style={{ width: rem(16), height: rem(16) }} stroke={1.5} />}
            renderOption={renderAutocompleteOption}
            data={data}
            visibleFrom="xs"
          />
        </Group>
      </div>
    </header>
  );
}