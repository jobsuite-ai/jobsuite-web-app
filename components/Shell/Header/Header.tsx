'use client';

import { MouseEvent, useEffect, useState } from 'react';

import { Autocomplete, AutocompleteProps, Collapse, Group, Menu, NavLink, rem, Stack, Text, UnstyledButton } from '@mantine/core';
import { IconChevronDown, IconLayoutSidebarLeftCollapse, IconLayoutSidebarLeftExpand, IconNotification, IconSearch, IconSettings, IconUser } from '@tabler/icons-react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';

import classes from './Header.module.css';
import { JobsuiteLogo } from '../../Global/JobsuiteLogo';

const links = [
  { link: '/dashboard', label: 'Dashboard' },
  { link: '/clients', label: 'Clients' },
  { link: '/add-proposal', label: 'Add Proposal' },
  { link: '/projects', label: 'Projects' },
];

interface HeaderProps {
  sidebarOpened: boolean;
  setSidebarOpened: (opened: boolean) => void;
}

export function Header({ sidebarOpened, setSidebarOpened }: HeaderProps) {
  const [autocompleteValue, setAutocompleteValue] = useState<string>();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [proposalsMenuOpened, setProposalsMenuOpened] = useState(false);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    // Check if user is authenticated
    const checkAuth = () => {
      const accessToken = localStorage.getItem('access_token');
      setIsAuthenticated(!!accessToken);
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
            }}
          />
        </div>
      </Collapse>
    </div>
  );

  const renderAutocompleteOption: AutocompleteProps['renderOption'] = () => (
    <Group gap="sm">
    </Group>
  );

  return (
    <>
      <aside className={`${classes.sidebar} ${sidebarOpened ? classes.sidebarOpen : ''}`}>
        <Stack gap="xs" p="md">
          {isAuthenticated && (
            <>
              {navItems}
              {proposalsMenuItem}
            </>
          )}
        </Stack>
      </aside>
      <header className={classes.header}>
        <div className={classes.inner}>
          <Group gap="md">
            {isAuthenticated && (
              <UnstyledButton
                onClick={() => setSidebarOpened(!sidebarOpened)}
                className={classes.burger}
              >
                {sidebarOpened ? (
                  <IconLayoutSidebarLeftCollapse size={22} />
                ) : (
                  <IconLayoutSidebarLeftExpand size={22} />
                )}
              </UnstyledButton>
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
                data={[]}
                visibleFrom="xs"
                onChange={(item) => {
                  setAutocompleteValue(item);
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
