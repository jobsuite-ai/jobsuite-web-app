'use client';

import { MouseEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react';

import {
  Autocomplete,
  AutocompleteProps,
  Badge,
  Button,
  Divider,
  Group,
  Menu,
  Modal,
  NavLink,
  rem,
  Stack,
  Text,
  UnstyledButton,
  useMantineTheme,
} from '@mantine/core';
import { useMediaQuery } from '@mantine/hooks';
import {
  IconBuilding,
  IconCalendar,
  IconCheck,
  IconClock,
  IconFilePlus,
  IconFileText,
  IconFolder,
  IconHome,
  IconLayoutDashboard,
  IconLayoutSidebarLeftCollapse,
  IconLayoutSidebarLeftExpand,
  IconList,
  IconLogout,
  IconMail,
  IconMenu2,
  IconNotification,
  IconSearch,
  IconSettings,
  IconUserCircle,
  IconUsers,
  IconUsersGroup,
} from '@tabler/icons-react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';

import classes from './Header.module.css';
import { JobsuiteLogo } from '../../Global/JobsuiteLogo';

import { fetchEstimateTitleFromSummary, getApiHeaders } from '@/app/utils/apiClient';
import { clearClientAuthSession, redirectToLoginPage } from '@/app/utils/authSession';
import { isCachedAuthMeStaleForToken } from '@/app/utils/authToken';
import { getCachedAuthMe } from '@/app/utils/dataCache';
import { isPainterRole } from '@/app/utils/roles';
import { useAuth, type User } from '@/hooks/useAuth';
import { useContractorLogo } from '@/hooks/useContractorLogo';
import { useAppSelector } from '@/store/hooks';
import { selectAllClients } from '@/store/slices/clientsSlice';
import { selectAllEstimates } from '@/store/slices/estimatesSlice';
import { selectAllProjects } from '@/store/slices/projectsSlice';

const fullNavLinks = [
  { link: '/', label: 'Home' },
  { link: '/dashboard', label: 'Dashboard' },
  { link: '/search', label: 'Search' },
  { link: '/clients', label: 'Clients' },
  { link: '/add-proposal', label: 'Add Proposal' },
  { link: '/projects', label: 'Projects' },
  { link: '/calendar', label: 'Calendar' },
  { link: '/employees-teams', label: 'Employees & Teams' },
  { link: '/proposals', label: 'Proposals' },
  { link: '/messaging-center', label: 'Messaging Center' },
  { link: '/notifications', label: 'Notifications' },
];

const employeeNavLinks = [
  { link: '/', label: 'My schedule' },
  { link: '/my-time', label: 'Time entry' },
];

interface HeaderProps {
  sidebarOpened: boolean;
  setSidebarOpened: (opened: boolean) => void;
}

interface SearchResult {
  type: 'estimate' | 'client' | 'project';
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

function getSessionCachedUser(): User | null {
  if (typeof window === 'undefined') {
    return null;
  }
  const token = localStorage.getItem('access_token');
  if (!token) {
    return null;
  }
  const cached = getCachedAuthMe<User>();
  if (!cached || isCachedAuthMeStaleForToken(token, cached)) {
    return null;
  }
  return cached;
}

export function Header({ sidebarOpened, setSidebarOpened }: HeaderProps) {
  const [autocompleteValue, setAutocompleteValue] = useState<string>('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [unacknowledgedCount, setUnacknowledgedCount] = useState<number>(0);
  const [messageCount, setMessageCount] = useState<number>(0);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [notificationsLoading, setNotificationsLoading] = useState(false);
  const [logoutModalOpened, setLogoutModalOpened] = useState(false);
  const [jobTitles, setJobTitles] = useState<Record<string, string>>({});
  const unacknowledgedCountRef = useRef<number>(0);
  const inFlightJobTitlesRef = useRef<Record<string, Promise<string | null>>>({});
  const router = useRouter();
  const pathname = usePathname();
  const clients = useAppSelector(selectAllClients);
  const estimates = useAppSelector(selectAllEstimates);
  const projects = useAppSelector(selectAllProjects);
  const { isAuthenticated, isLoading, user } = useAuth({ fetchUser: true });
  const { logoUrl } = useContractorLogo();
  const theme = useMantineTheme();
  const isMobile = useMediaQuery(`(max-width: ${theme.breakpoints.sm})`);

  // Prefer live user; else token-scoped auth cache (avoids full nav flash before /api/auth/me).
  const effectiveRole = useMemo(() => {
    if (user?.role) {
      return user.role;
    }
    return getSessionCachedUser()?.role ?? null;
  }, [user?.role]);

  // Utility function to extract estimate_id from notification link
  const extractEstimateId = useCallback((link: string | null): string | null => {
    if (!link) return null;
    const match = link.match(/\/proposals\/([^/?]+)/);
    return match ? match[1] : null;
  }, []);

  const handleNavLinkClick = (
    event: MouseEvent<HTMLAnchorElement, globalThis.MouseEvent>,
    link: string
  ) => {
    event.preventDefault();
    router.push(link);
    if (isMobile) {
      setSidebarOpened(false);
    }
  };

  const handleConfirmLogout = useCallback(() => {
    setLogoutModalOpened(false);
    clearClientAuthSession();
    redirectToLoginPage();
  }, []);

  // Map links to their icons
  const getLinkIcon = (linkPath: string) => {
    switch (linkPath) {
      case '/':
        return pathname === '/' && isPainterRole(effectiveRole) ? (
          <IconCalendar size={18} />
        ) : (
          <IconHome size={18} />
        );
      case '/dashboard':
        return <IconLayoutDashboard size={18} />;
      case '/search':
        return <IconSearch size={18} />;
      case '/clients':
        return <IconUsers size={18} />;
      case '/add-proposal':
        return <IconFilePlus size={18} />;
      case '/projects':
        return <IconFolder size={18} />;
      case '/calendar':
        return <IconCalendar size={18} />;
      case '/my-schedule':
        return <IconCalendar size={18} />;
      case '/my-time':
        return <IconClock size={18} />;
      case '/employees-teams':
        return <IconUsersGroup size={18} />;
      case '/proposals':
        return <IconFileText size={18} />;
      case '/messaging-center':
        return <IconMail size={18} />;
      case '/notifications':
        return <IconNotification size={18} />;
      default:
        return undefined;
    }
  };

  const isLeadOrSupportPainter =
    effectiveRole === 'lead-painter' || effectiveRole === 'support-painter';

  const mainNavLinks = useMemo(() => {
    if (!effectiveRole) {
      return [];
    }
    if (isLeadOrSupportPainter) {
      // Lead/support: only the "Employee Options" block (no duplicate links above it).
      return [];
    }
    if (isPainterRole(effectiveRole)) {
      return employeeNavLinks;
    }
    return fullNavLinks;
  }, [effectiveRole, isLeadOrSupportPainter]);

  const showEmployeeOptionsSection = isLeadOrSupportPainter;

  const navItems = useMemo(() => {
    const mapLink = (link: { link: string; label: string }, keySuffix: string) => {
      const isActive =
        pathname === link.link ||
        (link.link !== '/' && pathname?.startsWith(`${link.link}/`));
      const showBadge = link.link === '/messaging-center' && messageCount > 0;

      return (
        <NavLink
          key={`${keySuffix}-${link.label}`}
          component={Link}
          href={link.link}
          label={link.label}
          active={isActive}
          leftSection={getLinkIcon(link.link)}
          rightSection={showBadge ? (
            <Badge size="xs" color="red" variant="filled">
              {messageCount > 99 ? '99+' : messageCount}
            </Badge>
          ) : undefined}
          onClick={(event) => {
            handleNavLinkClick(event as any, link.link);
          }}
        />
      );
    };

    const linksToShow = isMobile ? mainNavLinks : mainNavLinks.filter((l) => l.link !== '/search');
    const primary = linksToShow.map((link) => mapLink(link, 'main'));

    if (!showEmployeeOptionsSection) {
      return primary;
    }

    return [
      ...primary,
      <Text key="employee-options-label" size="xs" c="dimmed" fw={600} px="xs">
        Employee Options
      </Text>,
      ...employeeNavLinks.map((link) => mapLink(link, 'emp')),
    ];
  }, [isMobile, pathname, messageCount, mainNavLinks, showEmployeeOptionsSection]);

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

    // Search projects by title and address (same shape as estimates - Job = Estimate)
    projects.forEach((project) => {
      const titleText = project.title || '';
      const titleMatch = titleText ? fuzzyMatch(titleText, searchTerm) : false;

      const addressStrings: string[] = [];
      const clientAddress = project.client_address;
      if (clientAddress && String(clientAddress).trim()) {
        addressStrings.push(String(clientAddress).trim());
      }
      const street = project.address_street;
      if (street && String(street).trim()) {
        addressStrings.push(String(street).trim());
      }
      const city = project.address_city || project.city;
      if (city && String(city).trim()) {
        addressStrings.push(String(city).trim());
      }
      const state = project.address_state || project.state;
      if (state && String(state).trim()) {
        addressStrings.push(String(state).trim());
      }
      const zipcode = project.address_zipcode || project.zip_code;
      if (zipcode && String(zipcode).trim()) {
        addressStrings.push(String(zipcode).trim());
      }
      const country = project.address_country;
      if (country && String(country).trim()) {
        addressStrings.push(String(country).trim());
      }
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

      let addressMatch = false;
      for (const addrStr of addressStrings) {
        if (addrStr && addrStr.length > 0 && fuzzyMatch(addrStr, searchTerm)) {
          addressMatch = true;
          break;
        }
      }

      if (titleMatch || addressMatch) {
        const displayAddressParts = [
          project.address_street || project.client_address,
          project.address_city || project.city,
          project.address_state || project.state,
          project.address_zipcode || project.zip_code,
        ].filter((part) => part && part.trim().length > 0);
        const address = displayAddressParts.length > 0 ? displayAddressParts.join(', ') : 'No address';

        results.push({
          type: 'project',
          id: project.id,
          label: project.title || `Project #${project.id.slice(0, 8)}`,
          subtitle: address,
        });
      }
    });

    // Limit results: 4 estimates, 3 clients, 3 projects (10 total)
    const estimateResults = results.filter((r) => r.type === 'estimate').slice(0, 4);
    const clientResults = results.filter((r) => r.type === 'client').slice(0, 3);
    const projectResults = results.filter((r) => r.type === 'project').slice(0, 3);

    setSearchResults([...estimateResults, ...clientResults, ...projectResults]);
  }, [autocompleteValue, clients, estimates, projects]);

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

  const handleSearchSelect = useCallback((
    value: string | null,
    event?: MouseEvent<HTMLElement>
  ) => {
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
      const targetPath =
        selectedResult.type === 'estimate'
          ? `/proposals/${selectedResult.id}`
          : selectedResult.type === 'project'
            ? `/projects/${selectedResult.id}`
            : `/clients/${selectedResult.id}`;
      if (event?.metaKey || event?.ctrlKey) {
        window.open(targetPath, '_blank');
      } else {
        router.push(targetPath);
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
    const isProject = result.type === 'project';
    const Icon = isEstimate ? IconBuilding : isProject ? IconFolder : IconUserCircle;
    const iconColor = isEstimate ? 'blue' : isProject ? 'orange' : 'green';

    return (
      <Group
        gap="md"
        wrap="nowrap"
        p={4}
        style={{ width: '100%' }}
        onClick={(e) => {
          // Prevent default and handle navigation
          e.preventDefault();
          handleSearchSelect(option.value, e);
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

  const handleSearchSubmit = useCallback(() => {
    const query = autocompleteValue.trim();
    if (!query) {
      return;
    }
    setSearchResults([]);
    setAutocompleteValue('');
    setSearchLoading(true);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('search-submit', { detail: { query } })
      );
    }
    router.push(`/search?q=${encodeURIComponent(query)}`);
  }, [autocompleteValue, router]);

  useEffect(() => {
    const handleSearchLoading = (event: Event) => {
      const customEvent = event as CustomEvent<{ loading?: boolean }>;
      if (typeof customEvent.detail?.loading === 'boolean') {
        setSearchLoading(customEvent.detail.loading);
      }
    };
    if (typeof window !== 'undefined') {
      window.addEventListener('search-loading', handleSearchLoading);
    }
    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('search-loading', handleSearchLoading);
      }
    };
  }, []);

  useEffect(() => {
    if (pathname !== '/search') {
      setSearchLoading(false);
    }
  }, [pathname]);

  // Track user activity for smarter polling
  const lastActivityRef = useRef(Date.now());
  const isPageVisibleRef = useRef(typeof document !== 'undefined' ? !document.hidden : true);

  // Update activity tracking
  useEffect(() => {
    const updateActivity = () => {
      lastActivityRef.current = Date.now();
    };

    const handleVisibilityChange = () => {
      isPageVisibleRef.current = !document.hidden;
      if (!document.hidden) {
        lastActivityRef.current = Date.now();
      }
    };

    const events = ['mousedown', 'keydown', 'scroll', 'touchstart'];
    events.forEach((event) => {
      window.addEventListener(event, updateActivity, { passive: true });
    });
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      events.forEach((event) => {
        window.removeEventListener(event, updateActivity);
      });
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  // Check if user is active (similar to refreshMiddleware pattern)
  const isUserActive = useCallback(() => {
    const timeSinceLastActivity = Date.now() - lastActivityRef.current;
    return (
      isPageVisibleRef.current &&
      timeSinceLastActivity < 5 * 60 * 1000 // Active if interacted within 5 minutes
    );
  }, []);

  // Fetch unacknowledged notification count with smart polling
  useEffect(() => {
    // Only fetch if we have confirmed authentication (not just checking)
    if (!isAuthenticated || isLoading) {
      return undefined;
    }

    const fetchMessageCount = async () => {
      // Only fetch if user is active and page is visible
      if (!isUserActive()) {
        return;
      }

      try {
        const response = await fetch('/api/outreach-messages/count', {
          method: 'GET',
          headers: getApiHeaders(),
        });
        if (response.ok) {
          const data = await response.json();
          setMessageCount(data.count || 0);
        }
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error('Error fetching message count:', err);
      }
    };

    const fetchUnacknowledgedCount = async () => {
      // Only fetch if user is active and page is visible
      if (!isUserActive()) {
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

    // Initial fetch; Messaging Center loads counts and dispatches outreachDueTodayCountUpdated
    if (pathname !== '/messaging-center') {
      fetchMessageCount();
    }
    fetchUnacknowledgedCount();

    // ~3 min outreach poll when active; Messaging Center pushes counts on that route
    const getPollInterval = (isActive: boolean, hasNotifications: boolean) => {
      if (!isActive) {
        return 5 * 60 * 1000; // 5 minutes when inactive
      }
      // Active polling
      if (hasNotifications) {
        return 45 * 1000; // 45 seconds when there are notifications
      }
      return 3 * 60 * 1000; // 3 minutes when no notifications
    };

    let messageTimeoutId: NodeJS.Timeout;
    let notificationTimeoutId: NodeJS.Timeout;

    const scheduleMessagePoll = () => {
      messageTimeoutId = setTimeout(() => {
        if (pathname !== '/messaging-center' && isUserActive()) {
          fetchMessageCount();
        }
        scheduleMessagePoll();
      }, getPollInterval(isUserActive(), false));
    };

    const scheduleNotificationPoll = () => {
      notificationTimeoutId = setTimeout(() => {
        if (isUserActive()) {
          fetchUnacknowledgedCount().then(() => {
            scheduleNotificationPoll();
          });
        } else {
          scheduleNotificationPoll();
        }
      }, getPollInterval(isUserActive(), unacknowledgedCountRef.current > 0));
    };

    scheduleMessagePoll();
    scheduleNotificationPoll();

    // Poll when page becomes visible again
    const handleVisibilityChange = () => {
      if (!document.hidden && isUserActive()) {
        if (pathname !== '/messaging-center') {
          fetchMessageCount();
        }
        fetchUnacknowledgedCount();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    const handleOutreachDueTodayCount = (event: Event) => {
      const ce = event as CustomEvent<{ count: number }>;
      if (typeof ce.detail?.count === 'number') {
        setMessageCount(ce.detail.count);
      }
    };
    window.addEventListener('outreachDueTodayCountUpdated', handleOutreachDueTodayCount);

    // Listen for notification acknowledgment events to update count immediately
    const handleNotificationAcknowledged = () => {
      if (isUserActive()) {
        fetchUnacknowledgedCount();
      }
    };
    window.addEventListener('notificationAcknowledged', handleNotificationAcknowledged);

    return () => {
      clearTimeout(messageTimeoutId);
      clearTimeout(notificationTimeoutId);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('outreachDueTodayCountUpdated', handleOutreachDueTodayCount);
      window.removeEventListener('notificationAcknowledged', handleNotificationAcknowledged);
    };
  }, [isAuthenticated, isLoading, isUserActive, pathname]);

  // Fetch job title for a notification
  const fetchJobTitle = useCallback(async (estimateId: string) => {
    if (jobTitles[estimateId]) {
      return jobTitles[estimateId];
    }
    const existingPromise = inFlightJobTitlesRef.current[estimateId];
    if (existingPromise) {
      return existingPromise;
    }

    const fetchPromise = (async () => {
    // Check cache first
    const cachedEstimate = estimates.find((e) => e.id === estimateId);
    if (cachedEstimate?.title) {
      setJobTitles((prev) => {
        if (prev[estimateId]) return prev;
        return { ...prev, [estimateId]: cachedEstimate.title! };
      });
      return cachedEstimate.title;
    }

    try {
      const title = await fetchEstimateTitleFromSummary(estimateId);
      if (title) {
        setJobTitles((prev) => {
          if (prev[estimateId]) return prev;
          return { ...prev, [estimateId]: title };
        });
      }
      return title;
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('Error fetching job title:', err);
    }

    return null;
    })();

    inFlightJobTitlesRef.current[estimateId] = fetchPromise;
    try {
      return await fetchPromise;
    } finally {
      delete inFlightJobTitlesRef.current[estimateId];
    }
  }, [estimates, jobTitles]);

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
        const notificationsData: Notification[] = Array.isArray(data) ? data : [];
        const unacknowledgedNotifications = notificationsData.filter(
          (notification) => !notification.is_acknowledged
        );
        setNotifications(unacknowledgedNotifications);

        // Fetch job titles for all notifications
        const estimateIds = Array.from(
          new Set(
            unacknowledgedNotifications
              .map((n: Notification) => extractEstimateId(n.link))
              .filter((id): id is string => typeof id === 'string' && id.length > 0)
          )
        );
        const titlePromises = estimateIds.map((estimateId) => fetchJobTitle(estimateId));
        await Promise.all(titlePromises);
      }
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Error fetching notifications:', error);
      // Reset notifications on error to ensure consistent state
      setNotifications([]);
    } finally {
      setNotificationsLoading(false);
    }
  }, [notificationsLoading, extractEstimateId, fetchJobTitle]);

  // Acknowledge notification
  const acknowledgeNotification = useCallback(async (notificationId: string) => {
    // Optimistically update UI immediately
    setNotifications((prev) => prev.filter((n) => n.id !== notificationId));
    setUnacknowledgedCount((prev) => Math.max(0, prev - 1));

    // Dispatch event immediately to update count in other components
    window.dispatchEvent(new CustomEvent('notificationAcknowledged'));

    // Acknowledge in the background (non-blocking)
    fetch(`/api/notifications/${notificationId}/acknowledge`, {
      method: 'POST',
      headers: getApiHeaders(),
    }).catch((error) => {
      // eslint-disable-next-line no-console
      console.error('Error acknowledging notification:', error);
      // Revert optimistic update on error
      setUnacknowledgedCount((prev) => prev + 1);
      // Note: We don't restore the notification to the list since we don't have it cached
    });
  }, []);

  const renderNotificationsDropdown = () => (
    <Menu
      shadow="md"
      width={400}
      position="bottom-end"
      onOpen={fetchNotifications}
    >
      <Menu.Target>
        <div style={{ marginTop: rem(5), cursor: 'pointer', position: 'relative' }}>
          <IconNotification color="black" size={22} />
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
              {unacknowledgedCount > 0 ? 'No notifications to show' : 'All Caught Up!'}
            </Text>
          </Menu.Item>
        ) : (
          notifications.map((notification) => (
            <Menu.Item
              key={notification.id}
              rightSection={(
                <UnstyledButton
                  onClick={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                    acknowledgeNotification(notification.id);
                  }}
                  aria-label="Acknowledge notification"
                  title="Acknowledge"
                  style={{ display: 'flex', alignItems: 'center' }}
                >
                  <IconCheck size={16} color="var(--mantine-color-blue-6)" />
                </UnstyledButton>
              )}
              onClick={() => {
                acknowledgeNotification(notification.id);
                if (notification.link) {
                  const link = notification.link.replace('/estimates/', '/proposals/');
                  router.push(link);
                }
              }}
            >
              <Stack gap={4}>
                <Text size="sm" fw={500} lineClamp={1}>
                  {notification.title}
                </Text>

                {(() => {
                  const estimateId = extractEstimateId(notification.link);
                  const jobTitle = estimateId ? jobTitles[estimateId] : null;
                  return jobTitle ? (
                    <Text size="xs" c="blue" fw={500} lineClamp={1}>
                      {jobTitle}
                    </Text>
                  ) : null;
                })()}
                {notification.link && (
                  <Text size="xs" c="blue" style={{ cursor: 'pointer' }}>
                    View details →
                  </Text>
                )}
              </Stack>
            </Menu.Item>
          ))
        )}
        <Divider />
        <Menu.Item
          leftSection={<IconList size={16} />}
          onClick={() => {
            router.push('/notifications');
          }}
        >
          <Text size="sm">View All Notifications</Text>
        </Menu.Item>
      </Menu.Dropdown>
    </Menu>
  );

  return (
    <>
      <aside className={`${classes.sidebar} ${sidebarOpened ? classes.sidebarOpen : ''}`}>
        <Stack gap="xs" p="md">
          {navItems}
        </Stack>
      </aside>
      <header className={classes.header}>
        <div className={classes.inner}>
          <Group gap="md" className={classes.leftGroup}>
            <UnstyledButton
              onClick={() => setSidebarOpened(!sidebarOpened)}
              className={classes.burger}
            >
              {sidebarOpened ? (
                <IconLayoutSidebarLeftCollapse size={22} />
              ) : isMobile ? (
                <IconMenu2 size={22} />
              ) : (
                <IconLayoutSidebarLeftExpand size={22} />
              )}
            </UnstyledButton>
            <Link
              key="Home"
              href="/"
              onClick={(event) => handleNavLinkClick(event, '/')}
            >
              <JobsuiteLogo logoUrl={logoUrl} />
            </Link>
          </Group>

          <Group className={classes.centerSection}>
            {isAuthenticated && !isLoading && (
              <div className={classes.searchWrapper}>
                <Autocomplete
                  className={classes.search}
                  placeholder="Search by client name, email, estimate or project"
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
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') {
                      event.preventDefault();
                      handleSearchSubmit();
                    }
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
                {searchLoading && (
                  <div className={classes.searchLoadingBar} aria-hidden>
                    <div className={classes.searchLoadingIndicator} />
                  </div>
                )}
              </div>
            )}
          </Group>

          <Group gap="sm" className={classes.iconsGroup}>
            {isAuthenticated && !isLoading && (
              <>
                {effectiveRole && !isPainterRole(effectiveRole) ? (
                  <Link
                    style={{ marginTop: rem(5) }}
                    key="Settings"
                    href="/settings"
                    onClick={(event) => handleNavLinkClick(event, '/settings')}
                  >
                    <IconSettings color="black" size={22} radius="xl" />
                  </Link>
                ) : null}
                {renderNotificationsDropdown()}
                <UnstyledButton
                  type="button"
                  aria-label="Log out"
                  onClick={() => setLogoutModalOpened(true)}
                  style={{ marginTop: rem(5) }}
                >
                  <IconLogout color="black" size={22} stroke={1.5} />
                </UnstyledButton>
              </>
            )}
          </Group>
        </div>
      </header>

      <Modal
        opened={logoutModalOpened}
        onClose={() => setLogoutModalOpened(false)}
        title="Log out"
        size="sm"
        zIndex={400}
        overlayProps={{ opacity: 0.52 }}
        keepMounted={false}
      >
        <Stack gap="lg">
          <Text size="sm" c="dimmed">
            Are you sure you want to log out? You will need to sign in again to access your account.
          </Text>
          <Group justify="flex-end" gap="sm">
            <Button variant="default" onClick={() => setLogoutModalOpened(false)}>
              Cancel
            </Button>
            <Button color="red" onClick={handleConfirmLogout}>
              Log out
            </Button>
          </Group>
        </Stack>
      </Modal>
    </>
  );
}
