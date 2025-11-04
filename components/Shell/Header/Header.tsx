'use client';

import { MouseEvent, useEffect, useState } from 'react';

import { Autocomplete, AutocompleteProps, Avatar, Divider, Group, Text, Menu, rem } from '@mantine/core';
import { IconSearch, IconUser, IconChevronDown } from '@tabler/icons-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

import classes from './Header.module.css';
import { JobsuiteLogo } from '../../Global/JobsuiteLogo';

interface Client {
  id: string;
  client_name: string;
  email?: string;
}

const links = [
  { link: '/dashboard', label: 'Dashboard' },
  { link: '/clients', label: 'Clients' },
  { link: '/add-job', label: 'Add Job' },
];

const jobLinks = [
  { link: '/jobs', label: 'In Progress' },
  { link: '/follow-up', label: 'Follow Up' },
  { link: '/completed', label: 'Completed' },
  { link: '/archived', label: 'Archived' },
];

export function Header() {
  const [clients, setClients] = useState<Record<string, Client>>();
  const [data, setData] = useState<Array<string>>();
  const [autocompleteValue, setAutocompleteValue] = useState<string>();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const router = useRouter();

  useEffect(() => {
    // Check if user is authenticated
    const accessToken = localStorage.getItem('access_token');
    setIsAuthenticated(!!accessToken);

    // Fetch clients if authenticated
    if (accessToken) {
      getClients();
    }
  }, []);

  useEffect(() => {
    if (clients) {
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
    try {
      const accessToken = localStorage.getItem('access_token');
      if (!accessToken) return;

      const response = await fetch('/api/clients', {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        console.error('Failed to fetch clients');
        return;
      }

      const { Items }: { Items: Client[] } = await response.json();
      setClients(
        Items.reduce((acc, client) => {
          acc[client.client_name] = client;
          return acc;
        }, {} as Record<string, Client>)
      );
    } catch (error) {
      console.error('Error fetching clients:', error);
    }
  }

  const renderAutocompleteOption: AutocompleteProps['renderOption'] = ({ option }) => (
    <Group gap="sm">
      {clients && (
        <>
          <Avatar src="/black-circle-user-symbol.png" size={36} radius="xl" />
          <div>
            <Text size="sm">{clients[option.value].client_name}</Text>
            {clients[option.value].email && (
              <Text size="xs" opacity={0.5}>
                {clients[option.value].email}
              </Text>
            )}
          </div>
        </>
      )}
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
          <JobsuiteLogo />
        </Link>

        <Group>
          {isAuthenticated && (
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
          {isAuthenticated && clients && (
            <>
              <Autocomplete
                style={{ marginRight: rem(12) }}
                className={classes.search}
                placeholder="Search by client name"
                value={autocompleteValue}
                leftSection={
                  <IconSearch style={{ width: rem(32), height: rem(16) }} stroke={1.5} />
                }
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
            </>
          )}
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
