'use client';

import { MouseEvent, useEffect, useState } from 'react';

import { useUser } from '@auth0/nextjs-auth0/client';
import { Autocomplete, AutocompleteProps, Avatar, Divider, Group, Text, rem } from '@mantine/core';
import { IconSearch, IconUser } from '@tabler/icons-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

import classes from './Header.module.css';
import { RLPPLogo } from '../../Global/RLPPLogo';

import { Client } from '@/components/Global/model';

const links = [
  { link: '/dashboard', label: 'Dashboard' },
  { link: '/jobs', label: 'Jobs' },
  { link: '/add-job', label: 'Add Job' },
  { link: '/clients', label: 'Clients' },
];

export function Header() {
  const [clients, setClients] = useState<Record<string, Client>>();
  const [data, setData] = useState<Array<string>>();
  const [autocompleteValue, setAutocompleteValue] = useState<string>();
  const router = useRouter();
  const { user } = useUser();

  useEffect(() => {
    async function getPageData() {
      await getClients();
    }
    if (!clients) {
      getPageData();
    } else {
      setData(Object.keys(clients));
    }
  }, [clients]);

  const handleNavLinkClick = (
    event: MouseEvent<HTMLAnchorElement, globalThis.MouseEvent>,
    link: string
  ) => {
    event.preventDefault();
    router.push(link);
  };

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

  async function getClients() {
      const response = await fetch(
          '/api/clients',
          {
              method: 'GET',
              headers: {
                  'Content-Type': 'application/json',
              },
          }
      );

      const { Items }: { Items: Client[] } = await response.json();
      setClients(
        Items.reduce((acc, client) => {
          acc[client.email] = client;
          return acc;
        }, {} as Record<string, Client>)
      );
  }

  const renderAutocompleteOption: AutocompleteProps['renderOption'] = ({ option }) => (
    <Group gap="sm">
      {clients &&
        <>
        <Avatar src="/black-circle-user-symbol.png" size={36} radius="xl" />
        <div>
          <Text size="sm">{clients[option.value].client_name}</Text>
          <Text size="xs" opacity={0.5}>
            {clients[option.value].email}
          </Text>
        </div>
        </>
      }
    </Group>
  );

  return (
    <header className={classes.header}>
      <div className={classes.inner}>
        <Link
          key="Home"
          href="/"
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
            placeholder="Search by client name"
            value={autocompleteValue}
            leftSection={<IconSearch style={{ width: rem(32), height: rem(16) }} stroke={1.5} />}
            renderOption={renderAutocompleteOption}
            data={data}
            visibleFrom="xs"
            onChange={(item) => {
              setAutocompleteValue(item);
              if (clients && data?.includes(item)) {
                router.push(`/clients/${clients[item].id}`);
                setAutocompleteValue('');
              }
            }}
          />
          <Divider orientation="vertical" />
          <Link
            style={{ marginTop: rem(5) }}
            key="Profile"
            href="/profile"
            onClick={(event) => handleNavLinkClick(event, '/profile')}
          >
            <IconUser color="black" size={28} radius="xl" />
          </Link>
        </Group>
      </div>
    </header>
  );
}
