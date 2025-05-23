'use client';

import { MouseEvent, useEffect, useState } from 'react';

import { useUser } from '@auth0/nextjs-auth0/client';
import { Autocomplete, AutocompleteProps, Avatar, Divider, Group, Text, Menu, rem } from '@mantine/core';
import { IconSearch, IconUser, IconChevronDown } from '@tabler/icons-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

import classes from './Header.module.css';
import { RLPPLogo } from '../../Global/RLPPLogo';

import { Client } from '@/components/Global/model';

const links = [
  { link: '/dashboard', label: 'Dashboard' },
  { link: '/clients', label: 'Clients' },
  { link: '/add-job', label: 'Add Job' },
];

const jobLinks = [
  { link: '/jobs', label: 'In Progress' },
  { link: '/completed', label: 'Completed' },
  { link: '/archived', label: 'Archived' },
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

  const jobMenuItems = jobLinks.map((link) => (
    <Menu.Item
      key={link.label}
      onClick={() => router.push(link.link)}
    >
      {link.label}
    </Menu.Item>
  ));

  async function getClients() {
    const response = await fetch('/api/clients', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    const { Items }: { Items: Client[] } = await response.json();
    setClients(
      Items.reduce((acc, client) => {
        acc[client.client_name] = client;
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
              <Menu shadow="md" width={200}>
                <Menu.Target>
                  <Link
                    href="#"
                    className={classes.link}
                    onClick={(event) => event.preventDefault()}
                  >
                    Jobs <IconChevronDown size={16} style={{ marginLeft: 4, verticalAlign: 'middle', position: 'relative', top: -1 }} />
                  </Link>
                </Menu.Target>
                <Menu.Dropdown>
                  {jobMenuItems}
                </Menu.Dropdown>
              </Menu>
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
