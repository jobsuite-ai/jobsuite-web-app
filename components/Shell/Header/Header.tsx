'use client';

import { MouseEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { Autocomplete, AutocompleteProps, Badge, Group, Menu, NavLink, rem, Stack, Text, UnstyledButton } from '@mantine/core';
import { IconBuilding, IconLayoutSidebarLeftCollapse, IconLayoutSidebarLeftExpand, IconNotification, IconSearch, IconSettings, IconUser, IconUserCircle } from '@tabler/icons-react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';

import classes from './Header.module.css';
import { JobsuiteLogo } from '../../Global/JobsuiteLogo';

import { getApiHeaders } from '@/app/utils/apiClient';
import { useSearchData } from '@/contexts/SearchDataContext';
import { useAuth } from '@/hooks/useAuth';

const links = [
  { link: '/', label: 'Home' },
  { link: '/dashboard', label: 'Dashboard' },
  { link: '/clients', label: 'Clients' },
  { link: '/add-proposal', label: 'Add Proposal' },
  { link: '/projects', label: 'Projects' },
  { link: '/proposals', label: 'Proposals' },
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

interface Notification {
  id: string;
  user_id: string;
  contractor_id: string;
  title: string;
  message: string;
  type: string;
  link: string | null;
  is_acknowledged: boolean;
  acknowledged_at: string | null;
  delivery_status: string;
  delivery_method: string;
  created_at: string;
  updated_at: string;
}

export function Header({ sidebarOpened, setSidebarOpened }: HeaderProps) {
  const [autocompleteValue, setAutocompleteValue] = useState<string>('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [unacknowledgedCount, setUnacknowledgedCount] = useState<number>(0);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [notificationsLoading, setNotificationsLoading] = useState(false);
  const unacknowledgedCountRef = useRef<number>(0);
  const router = useRouter();
  const pathname = usePathname();
  const { clients, estimates } = useSearchData();
  const { isAuthenticated, isLoading } = useAuth();

  const handleNavLinkClick = (
    event: MouseEvent<HTMLAnchorElement, globalThis.MouseEvent>,
    link: string
  ) => {
    event.preventDefault();
    router.push(link);
  };

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

  // Fuzzy match function - checks if search term appears in the text
  const fuzzyMatch = (text: string, searchTerm: string): boolean => {
    if (!text || !searchTerm) {
      return false;
    }

    const textLower = text.toLowerCase().trim();
    const searchLower = searchTerm.toLowerCase().trim();

    if (!textLower || !searchLower) {
      return false;
    }

    // Exact substring match (fastest and most reliable) - this should catch most cases
    if (textLower.includes(searchLower)) {
      return true;
    }

    // Remove punctuation and normalize whitespace for matching
    const cleanedText = textLower.replace(/[^\w\s]/g, ' ').replace(/\s+/g, ' ');
    const cleanedSearch = searchLower.replace(/[^\w\s]/g, ' ').replace(/\s+/g, ' ');

    // Check if cleaned search appears in cleaned text
    if (cleanedText.includes(cleanedSearch)) {
      return true;
    }

    // Word-by-word matching for multi-word searches
    const searchWords = cleanedSearch.split(/\s+/).filter((w) => w.length > 0);
    if (searchWords.length > 1) {
      const allWordsMatch = searchWords.every((searchWord) => cleanedText.includes(searchWord));
      if (allWordsMatch) {
        return true;
      }
    }

    // For single-word searches, check if it appears in any word
    if (searchWords.length === 1) {
      const searchWord = searchWords[0];
      const textWords = cleanedText.split(/\s+/);
      if (textWords.some((textWord) => textWord.includes(searchWord))) {
        return true;
      }
    }

    // Fuzzy match: check if all characters of search term appear in order
    // This is the most lenient match (e.g., "ms" matches "Main Street")
    let searchIndex = 0;
    for (let i = 0; i < textLower.length && searchIndex < searchLower.length; i += 1) {
      if (textLower[i] === searchLower[searchIndex]) {
        searchIndex += 1;
      }
    }

    return searchIndex === searchLower.length;
  };

  // Client-side search function - instant results from cached data
  useEffect(() => {
    if (!autocompleteValue || autocompleteValue.trim().length < 2) {
      setSearchResults([]);
      return;
    }

    const searchTerm = autocompleteValue.trim();
    const results: SearchResult[] = [];

    // Search estimates by title and address with fuzzy matching
    estimates.forEach((estimate) => {
      const titleText = estimate.title || '';
      const titleMatch = titleText ? fuzzyMatch(titleText, searchTerm) : false;

      // Collect all possible address strings to search
      const addressStrings: string[] = [];

      // Add legacy full address field if it exists
      const clientAddress = estimate.client_address;
      if (clientAddress && String(clientAddress).trim()) {
        addressStrings.push(String(clientAddress).trim());
      }

      // Add individual address fields
      const street = estimate.address_street;
      if (street && String(street).trim()) {
        addressStrings.push(String(street).trim());
      }

      const city = estimate.address_city || estimate.city;
      if (city && String(city).trim()) {
        addressStrings.push(String(city).trim());
      }

      const state = estimate.address_state || estimate.state;
      if (state && String(state).trim()) {
        addressStrings.push(String(state).trim());
      }

      const zipcode = estimate.address_zipcode || estimate.zip_code;
      if (zipcode && String(zipcode).trim()) {
        addressStrings.push(String(zipcode).trim());
      }

      const country = estimate.address_country;
      if (country && String(country).trim()) {
        addressStrings.push(String(country).trim());
      }

      // Also create a combined address string
      const combinedParts = [
        street,
        city,
        state,
        zipcode,
        country,
      ]
        .filter((part) => part != null && part !== undefined && String(part).trim())
        .map((part) => String(part).trim());

      if (combinedParts.length > 0) {
        const combinedAddress = combinedParts.join(' ').trim();
        if (combinedAddress && !addressStrings.includes(combinedAddress)) {
          addressStrings.push(combinedAddress);
        }
      }

      // Search all address strings
      let addressMatch = false;
      for (const addrStr of addressStrings) {
        if (addrStr && addrStr.length > 0) {
          const matchResult = fuzzyMatch(addrStr, searchTerm);
          if (matchResult) {
            addressMatch = true;
            break;
          }
        }
      }

      if (titleMatch || addressMatch) {
        // Use new field names first, fall back to legacy names
        const displayAddressParts = [
          estimate.address_street || estimate.client_address,
          estimate.address_city || estimate.city,
          estimate.address_state || estimate.state,
          estimate.address_zipcode || estimate.zip_code,
        ].filter((part) => part && part.trim().length > 0);
        const address = displayAddressParts.length > 0 ? displayAddressParts.join(', ') : 'No address';

        results.push({
          type: 'estimate',
          id: estimate.id,
          label: estimate.title || `Estimate #${estimate.id.slice(0, 8)}`,
          subtitle: address,
        });
      }
    });

    // Search clients by name or email (exact substring match is fine for these)
    clients.forEach((client) => {
      const nameMatch = client.name.toLowerCase().includes(searchTerm.toLowerCase());
      const emailMatch = client.email.toLowerCase().includes(searchTerm.toLowerCase());

      if (nameMatch || emailMatch) {
        results.push({
          type: 'client',
          id: client.id,
          label: client.name,
          subtitle: client.email,
        });
      }
    });

    // Limit results to 10 total (5 estimates + 5 clients, or balanced)
    const estimateResults = results.filter((r) => r.type === 'estimate').slice(0, 5);
    const clientResults = results.filter((r) => r.type === 'client').slice(0, 5);

    setSearchResults([...estimateResults, ...clientResults]);
  }, [autocompleteValue, clients, estimates]);

  // Format search results for Autocomplete
  const autocompleteData = useMemo(() => {
    if (searchResults.length === 0 && autocompleteValue.trim().length >= 2) {
      return [{ value: 'no-results', label: 'No results found', disabled: true }];
    }
    if (searchResults.length === 0) {
      return [];
    }
    return searchResults.map((result) => ({
      value: `${result.type}-${result.id}`,
      // Include subtitle in label for Mantine's default filtering to work on addresses
      label: result.subtitle ? `${result.label} ${result.subtitle}` : result.label,
      subtitle: result.subtitle,
      type: result.type,
      id: result.id,
    }));
  }, [searchResults, autocompleteValue]);

  const handleSearchSelect = useCallback((value: string | null) => {
    if (!value || value === 'no-results') {
      return false; // Return false to prevent default behavior
    }

    const selectedResult = searchResults.find(
      (r) => `${r.type}-${r.id}` === value
    );

    if (selectedResult) {
      // Clear the search input immediately
      setAutocompleteValue('');
      setSearchResults([]);

      // Navigate to the selected item
      if (selectedResult.type === 'estimate') {
        router.push(`/proposals/${selectedResult.id}`);
      } else if (selectedResult.type === 'client') {
        router.push(`/clients/${selectedResult.id}`);
      }

      return false; // Prevent default behavior (setting value in input)
    }

    return false;
  }, [searchResults, router]);

  const renderAutocompleteOption: AutocompleteProps['renderOption'] = ({ option }) => {
    if (option.value === 'no-results') {
      return (
        <Group gap="sm" p="xs">
          <Text size="sm" c="dimmed" style={{ fontStyle: 'italic' }}>
            No results found
          </Text>
        </Group>
      );
    }

    const result = searchResults.find((r) => `${r.type}-${r.id}` === option.value);
    if (!result) return null;

    const isEstimate = result.type === 'estimate';
    const Icon = isEstimate ? IconBuilding : IconUserCircle;
    const iconColor = isEstimate ? 'blue' : 'green';

    return (
      <Group
        gap="md"
        wrap="nowrap"
        p={4}
        style={{ width: '100%' }}
        onClick={(e) => {
          // Prevent default and handle navigation
          e.preventDefault();
          handleSearchSelect(option.value);
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: rem(36),
            height: rem(36),
            borderRadius: '50%',
            backgroundColor: `var(--mantine-color-${iconColor}-0)`,
            flexShrink: 0,
          }}
        >
          <Icon size={20} color={`var(--mantine-color-${iconColor}-6)`} stroke={1.5} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <Text size="sm" fw={500} lineClamp={1}>
            {result.label}
          </Text>
          {result.subtitle && (
            <Text size="xs" c="dimmed" lineClamp={1} mt={2}>
              {result.subtitle}
            </Text>
          )}
        </div>
        <Badge
          size="sm"
          variant="light"
          color={iconColor}
          style={{ textTransform: 'capitalize', flexShrink: 0 }}
        >
          {result.type}
        </Badge>
      </Group>
    );
  };

  // Fetch unacknowledged notification count with adaptive polling
  useEffect(() => {
    if (!isAuthenticated || isLoading) {
      return undefined;
    }

    const fetchUnacknowledgedCount = async () => {
      // Don't poll if page is not visible
      if (document.hidden) {
        return;
      }

      try {
        const response = await fetch('/api/notifications/unacknowledged', {
          method: 'GET',
          headers: getApiHeaders(),
        });

        if (response.ok) {
          const data = await response.json();
          const count = data.count || 0;
          setUnacknowledgedCount(count);
          unacknowledgedCountRef.current = count; // Update ref for polling logic
        }
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error('Error fetching unacknowledged count:', error);
      }
    };

    // Initial fetch
    fetchUnacknowledgedCount();

    // Adaptive polling:
    // - 120 seconds (2 minutes) when no notifications
    // - 60 seconds (1 minute) when there are notifications
    // This reduces server load while still keeping the count reasonably up-to-date
    const getPollInterval = () => unacknowledgedCountRef.current > 0 ? 60000 : 120000;

    let timeoutId: NodeJS.Timeout;

    const scheduleNextPoll = () => {
      timeoutId = setTimeout(() => {
        fetchUnacknowledgedCount().then(() => {
          scheduleNextPoll();
        });
      }, getPollInterval());
    };

    scheduleNextPoll();

    // Also poll when page becomes visible again
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        fetchUnacknowledgedCount();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      clearTimeout(timeoutId);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [isAuthenticated, isLoading]);

  // Fetch notifications when menu opens
  const fetchNotifications = useCallback(async () => {
    if (notificationsLoading) return;

    setNotificationsLoading(true);
    try {
      const response = await fetch('/api/notifications/unacknowledged/list?limit=10', {
        method: 'GET',
        headers: getApiHeaders(),
      });

      if (response.ok) {
        const data = await response.json();
        setNotifications(data || []);
      }
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Error fetching notifications:', error);
    } finally {
      setNotificationsLoading(false);
    }
  }, [notificationsLoading]);

  // Acknowledge notification
  const acknowledgeNotification = useCallback(async (notificationId: string) => {
    try {
      const response = await fetch(`/api/notifications/${notificationId}/acknowledge`, {
        method: 'POST',
        headers: getApiHeaders(),
      });

      if (response.ok) {
        // Remove from list and update count
        setNotifications((prev) => prev.filter((n) => n.id !== notificationId));
        setUnacknowledgedCount((prev) => Math.max(0, prev - 1));
      }
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Error acknowledging notification:', error);
    }
  }, []);

  // Don't render header if not authenticated or still loading
  if (isLoading || !isAuthenticated) {
    return null;
  }

  return (
    <>
      <aside className={`${classes.sidebar} ${sidebarOpened ? classes.sidebarOpen : ''}`}>
        <Stack gap="xs" p="md">
          {navItems}
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
              onOptionSubmit={(value) => {
                // Handle navigation and prevent setting value in input
                const shouldPrevent = handleSearchSelect(value);
                if (shouldPrevent === false) {
                  // Clear the value to prevent it from being set
                  setTimeout(() => setAutocompleteValue(''), 0);
                }
              }}
              limit={10}
              styles={{
                dropdown: {
                  borderRadius: rem(8),
                  boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
                },
                option: {
                  padding: rem(8),
                  borderRadius: rem(6),
                  cursor: 'pointer',
                  '&[data-hovered]': {
                    backgroundColor: 'var(--mantine-color-gray-1)',
                  },
                },
              }}
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
            <Menu
              shadow="md"
              width={400}
              position="bottom-end"
              onOpen={fetchNotifications}
            >
              <Menu.Target>
                <div style={{ marginTop: rem(5), cursor: 'pointer', position: 'relative' }}>
                  <IconNotification color="black" size={22} radius="xl" />
                  {unacknowledgedCount > 0 && (
                    <Badge
                      size="xs"
                      color="red"
                      variant="filled"
                      style={{
                        position: 'absolute',
                        top: rem(-4),
                        right: rem(-4),
                        minWidth: rem(18),
                        height: rem(18),
                        padding: 0,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: rem(10),
                      }}
                    >
                      {unacknowledgedCount > 99 ? '99+' : unacknowledgedCount}
                    </Badge>
                  )}
                </div>
              </Menu.Target>
              <Menu.Dropdown>
                <Menu.Label>
                  <Group justify="space-between">
                    <Text size="sm" fw={600}>
                      Notifications
                    </Text>
                    {unacknowledgedCount > 0 && (
                      <Badge size="sm" color="red" variant="light">
                        {unacknowledgedCount} new
                      </Badge>
                    )}
                  </Group>
                </Menu.Label>
                {notificationsLoading ? (
                  <Menu.Item disabled>
                    <Text size="sm" c="dimmed">
                      Loading...
                    </Text>
                  </Menu.Item>
                ) : notifications.length === 0 ? (
                  <Menu.Item disabled>
                    <Text size="sm" c="dimmed" ta="center">
                      No notifications
                    </Text>
                  </Menu.Item>
                ) : (
                  notifications.map((notification) => (
                    <Menu.Item
                      key={notification.id}
                      onClick={() => {
                        acknowledgeNotification(notification.id);
                        if (notification.link) {
                          router.push(notification.link);
                        }
                      }}
                    >
                      <Stack gap={4}>
                        <Text size="sm" fw={500} lineClamp={1}>
                          {notification.title}
                        </Text>
                        <Text size="xs" c="dimmed" lineClamp={2}>
                          {notification.message}
                        </Text>
                        {notification.link && (
                          <Text size="xs" c="blue" style={{ cursor: 'pointer' }}>
                            View details →
                          </Text>
                        )}
                      </Stack>
                    </Menu.Item>
                  ))
                )}
              </Menu.Dropdown>
            </Menu>
          </Group>
        </div>
      </header>
    </>
  );
}
