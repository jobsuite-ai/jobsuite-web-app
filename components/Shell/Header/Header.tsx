'use client';

import { MouseEvent, useEffect, useState } from 'react';

import { Autocomplete, AutocompleteProps, Avatar, Burger, Collapse, Drawer, Group, Menu, NavLink, rem, Stack, Text } from '@mantine/core';
import { IconChevronDown, IconNotification, IconSearch, IconSettings, IconUser } from '@tabler/icons-react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';

import classes from './Header.module.css';
import { JobsuiteLogo } from '../../Global/JobsuiteLogo';

interface Client {
  id: string;
  client_name: string;
  email?: string;
}

const links = [
  { link: '/dashboard', label: 'Dashboard' },
  { link: '/projects', label: 'Projects' },
  { link: '/clients', label: 'Clients' },
  { link: '/add-proposal', label: 'Add Proposal' },
];

export function Header() {
  const [clients, setClients] = useState<Record<string, Client>>();
  const [data, setData] = useState<Array<string>>();
  const [autocompleteValue, setAutocompleteValue] = useState<string>();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [sidebarOpened, setSidebarOpened] = useState(false);
  const [proposalsMenuOpened, setProposalsMenuOpened] = useState(false);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    // Check if user is authenticated
    const checkAuth = () => {
      const accessToken = localStorage.getItem('access_token');
      setIsAuthenticated(!!accessToken);

      // Fetch clients if authenticated
      if (accessToken) {
        getClients();
      }
    };

    // Initial check
    checkAuth();

    // Listen for storage changes (e.g., when login saves token)
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'access_token') {
        checkAuth();
      }
    };

    window.addEventListener('storage', handleStorageChange);

    // Also listen for custom event for same-origin storage changes
    // (storage event only fires for changes from other windows/tabs)
    const handleCustomStorageChange = () => {
      checkAuth();
    };

    window.addEventListener('localStorageChange', handleCustomStorageChange as EventListener);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('localStorageChange', handleCustomStorageChange as EventListener);
    };
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

  // Check if Proposals menu should be active
  const isProposalsActive =
    pathname === '/proposals' || pathname?.startsWith('/proposals/');

  const navItems = links.map((link) => {
    // Check if the current pathname matches the link exactly or is a subroute
    const isActive =
      pathname === link.link ||
      (link.link !== '/' && pathname?.startsWith(`${link.link}/`));
    return (
      <NavLink
        key={link.label}
        component={Link}
        href={link.link}
        label={link.label}
        active={isActive}
        onClick={(event) => {
          handleNavLinkClick(event as any, link.link);
          setSidebarOpened(false); // Close sidebar when navigating
        }}
      />
    );
  });

  // Add Proposals menu item with nested dropdown
  const proposalsMenuItem = (
    <div key="Proposals">
      <NavLink
        component="div"
        label="Proposals"
        active={isProposalsActive}
        rightSection={
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setProposalsMenuOpened(!proposalsMenuOpened);
            }}
            style={{
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              background: 'none',
              border: 'none',
              padding: 0,
              margin: 0,
            }}
            aria-label="Toggle proposals menu"
          >
            <IconChevronDown
              size={16}
              style={{
                transform: proposalsMenuOpened ? 'rotate(180deg)' : 'rotate(0deg)',
                transition: 'transform 0.2s',
              }}
            />
          </button>
        }
        style={{ cursor: 'pointer' }}
        onClick={(e) => {
          // Only navigate if not clicking the chevron button
          const target = e.target as HTMLElement;
          if (target.closest('button[aria-label="Toggle proposals menu"]')) {
            return;
          }
          // Clicking the main text navigates to /proposals
          e.preventDefault();
          router.push('/proposals');
          setSidebarOpened(false);
        }}
      />
      <Collapse in={proposalsMenuOpened}>
        <div style={{ paddingLeft: rem(32) }}>
          <NavLink
            component={Link}
            href="/proposals/completed"
            label="Completed Estimates"
            active={pathname === '/proposals/completed'}
            onClick={(e) => {
              handleNavLinkClick(e as any, '/proposals/completed');
              setProposalsMenuOpened(false);
              setSidebarOpened(false);
            }}
          />
        </div>
      </Collapse>
    </div>
  );

  async function getClients() {
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
      return;
    }

    const { Items }: { Items: Client[] } = await response.json();
    if (Items && Items.length > 0) {
      setClients(
        Items.reduce((acc, client) => {
          acc[client.client_name] = client;
          return acc;
        }, {} as Record<string, Client>)
      );
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
    <>
      <Drawer
        opened={sidebarOpened}
        onClose={() => setSidebarOpened(false)}
        title="Navigation"
        position="left"
        size="xs"
        className={classes.drawer}
      >
        <Stack gap="xs">
          {isAuthenticated && (
            <>
              {navItems}
              {proposalsMenuItem}
            </>
          )}
        </Stack>
      </Drawer>
      <header className={classes.header}>
        <div className={classes.inner}>
          <Group gap="md">
            {isAuthenticated && (
              <Burger
                opened={sidebarOpened}
                onClick={() => setSidebarOpened(!sidebarOpened)}
                size="sm"
                className={classes.burger}
              />
            )}
            <Link
              key="Home"
              href="/"
              onClick={(event) => handleNavLinkClick(event, '/')}
            >
              <JobsuiteLogo />
            </Link>
          </Group>

          <Group className={classes.centerSection}>
            {isAuthenticated && (
              <Autocomplete
                className={classes.search}
                placeholder="Search by client name"
                value={autocompleteValue}
                leftSection={
                  <IconSearch style={{ width: rem(28), height: rem(16) }} stroke={1.5} />
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
            )}
          </Group>

          {isAuthenticated && (
            <Group gap="sm">
              <Link
                style={{ marginTop: rem(5) }}
                key="Settings"
                href="/settings"
                onClick={(event) => handleNavLinkClick(event, '/settings')}
              >
                <IconSettings color="black" size={22} radius="xl" />
              </Link>
              <Link
                style={{ marginTop: rem(5) }}
                key="Profile"
                href="/profile"
                onClick={(event) => handleNavLinkClick(event, '/profile')}
              >
                <IconUser color="black" size={22} radius="xl" />
              </Link>
              <Menu shadow="md" width={500} position="bottom-end">
                <Menu.Target>
                  <div style={{ marginTop: rem(5), cursor: 'pointer' }}>
                    <IconNotification color="black" size={22} radius="xl" />
                  </div>
                </Menu.Target>
                <Menu.Dropdown>
                  <Menu.Item>
                    <Text size="sm" ta="center">No Notifications</Text>
                  </Menu.Item>
                </Menu.Dropdown>
              </Menu>
            </Group>
          )}
        </div>
      </header>
    </>
  );
}
