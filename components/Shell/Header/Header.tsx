'use client';

import { MouseEvent, useCallback, useEffect, useMemo, useState } from 'react';

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

interface SearchResult {
  type: 'estimate' | 'client';
  id: string;
  label: string;
  subtitle?: string;
}

export function Header({ sidebarOpened, setSidebarOpened }: HeaderProps) {
  const [autocompleteValue, setAutocompleteValue] = useState<string>('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
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

  // Debounced search function
  useEffect(() => {
    if (!autocompleteValue || autocompleteValue.trim().length < 2) {
      setSearchResults([]);
      setIsSearching(false);
      return undefined;
    }

    setIsSearching(true);
    const timeoutId = setTimeout(async () => {
      try {
        const token = localStorage.getItem('access_token');
        if (!token) {
          setSearchResults([]);
          setIsSearching(false);
          return;
        }

        const response = await fetch(
          `/api/search?q=${encodeURIComponent(autocompleteValue)}&limit=10`,
          {
            method: 'GET',
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
          }
        );

        if (!response.ok) {
          setSearchResults([]);
          setIsSearching(false);
          return;
        }

        const data = await response.json();
        const results: SearchResult[] = [];

        // Add estimates
        if (data.estimates && Array.isArray(data.estimates)) {
          data.estimates.forEach((estimate: any) => {
            const addressParts = [
              estimate.address_street,
              estimate.address_city,
              estimate.address_state,
              estimate.address_zipcode,
            ].filter(Boolean);
            const address = addressParts.length > 0 ? addressParts.join(', ') : 'No address';
            results.push({
              type: 'estimate',
              id: estimate.id,
              label: estimate.title || `Estimate #${estimate.id.slice(0, 8)}`,
              subtitle: address,
            });
          });
        }

        // Add clients
        if (data.clients && Array.isArray(data.clients)) {
          data.clients.forEach((client: any) => {
            results.push({
              type: 'client',
              id: client.id,
              label: client.name,
              subtitle: client.email,
            });
          });
        }

        setSearchResults(results);
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error('Search error:', error);
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 300); // 300ms debounce

    return function cleanup() {
      clearTimeout(timeoutId);
    };
  }, [autocompleteValue]);

  // Format search results for Autocomplete
  const autocompleteData = useMemo(() => {
    if (searchResults.length === 0 && !isSearching && autocompleteValue.trim().length >= 2) {
      return [{ value: 'no-results', label: 'No results found', disabled: true }];
    }
    return searchResults.map((result) => ({
      value: `${result.type}-${result.id}`,
      label: result.label,
      subtitle: result.subtitle,
      type: result.type,
      id: result.id,
    }));
  }, [searchResults, isSearching, autocompleteValue]);

  const handleSearchSelect = useCallback((value: string | null) => {
    if (!value || value === 'no-results') return;

    const selectedResult = searchResults.find(
      (r) => `${r.type}-${r.id}` === value
    );

    if (selectedResult) {
      if (selectedResult.type === 'estimate') {
        router.push(`/proposals/${selectedResult.id}`);
      } else if (selectedResult.type === 'client') {
        router.push(`/clients/${selectedResult.id}`);
      }
      setAutocompleteValue('');
      setSearchResults([]);
    }
  }, [searchResults, router]);

  const renderAutocompleteOption: AutocompleteProps['renderOption'] = ({ option }) => {
    if (option.value === 'no-results') {
      return (
        <Text size="sm" c="dimmed" p="xs">
          No results found
        </Text>
      );
    }

    const result = searchResults.find((r) => `${r.type}-${r.id}` === option.value);
    if (!result) return null;

    return (
      <Group gap="sm" wrap="nowrap">
        <div style={{ flex: 1 }}>
          <Text size="sm" fw={500}>
            {result.label}
          </Text>
          {result.subtitle && (
            <Text size="xs" c="dimmed">
              {result.subtitle}
            </Text>
          )}
        </div>
        <Text size="xs" c="dimmed" style={{ textTransform: 'capitalize' }}>
          {result.type}
        </Text>
      </Group>
    );
  };

  if (!isAuthenticated) {
    return null;
  }

  return (
    <>
      <aside className={`${classes.sidebar} ${sidebarOpened ? classes.sidebarOpen : ''}`}>
        <Stack gap="xs" p="md">
          {navItems}
          {proposalsMenuItem}
        </Stack>
      </aside>
      <header className={classes.header}>
        <div className={classes.inner}>
          <Group gap="md">
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
            <Link
              key="Home"
              href="/"
              onClick={(event) => handleNavLinkClick(event, '/')}
            >
              <JobsuiteLogo />
            </Link>
          </Group>

          <Group className={classes.centerSection}>
            <Autocomplete
              className={classes.search}
              placeholder="Search by client name, email, or estimate address"
              value={autocompleteValue}
              leftSection={
                <IconSearch style={{ width: rem(28), height: rem(16) }} stroke={1.5} />
              }
              renderOption={renderAutocompleteOption}
              data={autocompleteData}
              visibleFrom="xs"
              onChange={(value) => {
                setAutocompleteValue(value);
              }}
              onOptionSubmit={handleSearchSelect}
              limit={10}
            />
          </Group>

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
        </div>
      </header>
    </>
  );
}
