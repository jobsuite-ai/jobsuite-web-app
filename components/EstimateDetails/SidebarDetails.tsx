'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import { ActionIcon, Autocomplete, Badge, Button, Flex, Group, Menu, Modal, Paper, Select, Skeleton, Stack, Text } from '@mantine/core';
import { DatePickerInput } from '@mantine/dates';
import '@mantine/dates/styles.css';
import { notifications } from '@mantine/notifications';
import { IconCheck, IconChevronDown, IconMessageCircle, IconX } from '@tabler/icons-react';
import { useRouter } from 'next/navigation';

import { CollectPaymentBillingBanner, CollectPaymentModal } from './CollectPaymentModal';
import EditableField from './EditableField';
import EstimateSchedulePanel from './EstimateSchedulePanel';
import FollowUpSchedulingModal from './FollowUpSchedulingModal';
import { ContractorClient, Estimate, EstimateStatus, EstimateType } from '../Global/model';
import { formatPhoneNumber, getEstimateBadgeColor, getFormattedEstimateStatus, getFormattedEstimateType } from '../Global/utils';

import { UpdateJobContent } from '@/app/api/projects/jobTypes';
import { useDataCache } from '@/contexts/DataCacheContext';
import { useJobTags } from '@/hooks/useJobTags';
import { useTeamConfig } from '@/hooks/useTeamConfig';
import { useUsers } from '@/hooks/useUsers';
import { logToCloudWatch } from '@/public/logger';

interface SidebarDetailsProps {
  estimate: Estimate;
  estimateID: string;
  onUpdate: () => void;
  detailsLoaded?: boolean;
  /** Called with the function to open the check-in date modal
   * (for use by parent when no date is set) */
  registerCheckInDateOpener?: (open: (() => void) | null) => void;
}

export default function SidebarDetails({
  estimate,
  estimateID,
  onUpdate,
  detailsLoaded = false,
  registerCheckInDateOpener,
}: SidebarDetailsProps) {
  const [client, setClient] = useState<ContractorClient>();
  const [menuOpened, setMenuOpened] = useState(false);
  const { users, loading: loadingUsers } = useUsers();
  const { teamConfig, loading: loadingTeamConfig } = useTeamConfig();
  const { jobTags } = useJobTags();
  const [jobTagOptions, setJobTagOptions] = useState<{ value: string; label: string }[]>([
    { value: '', label: 'None' },
  ]);
  const [editingOwner, setEditingOwner] = useState(false);
  const [selectedOwnerId, setSelectedOwnerId] = useState<string | null>(
    estimate.owned_by || estimate.created_by || null
  );
  const [savingOwner, setSavingOwner] = useState(false);
  const [editingJobType, setEditingJobType] = useState(false);
  const [selectedJobType, setSelectedJobType] = useState<string | null>(null);
  const [savingJobType, setSavingJobType] = useState(false);
  const [editingScheduledDate, setEditingScheduledDate] = useState(false);
  const [selectedScheduledDate, setSelectedScheduledDate] = useState<Date | null>(
    estimate.scheduled_date ? new Date(estimate.scheduled_date) : null
  );
  const [savingScheduledDate, setSavingScheduledDate] = useState(false);
  // Local state for optimistic status updates
  const [currentStatus, setCurrentStatus] = useState<EstimateStatus>(estimate.status);
  const [showFollowUpModal, setShowFollowUpModal] = useState(false);
  const [quickbooksConnected, setQuickbooksConnected] = useState(false);
  const [quickbooksCustomers, setQuickbooksCustomers] = useState<Array<{
    id: string;
    name: string;
    email: string;
  }>>([]);
  const [loadingCustomers, setLoadingCustomers] = useState(false);
  const [showCustomerModal, setShowCustomerModal] = useState(false);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(
    estimate.quickbooks_customer_id || null);
  const [savingCustomer, setSavingCustomer] = useState(false);
  const [syncingMainStatus, setSyncingMainStatus] = useState(false);
  const [showCheckInDateModal, setShowCheckInDateModal] = useState(false);
  const [showBillingPaymentModal, setShowBillingPaymentModal] = useState(false);
  const [checkInDate, setCheckInDate] = useState<Date | null>(null);
  const [savingCheckInDate, setSavingCheckInDate] = useState(false);
  const [editingCrewLead, setEditingCrewLead] = useState(false);
  const [selectedCrewLead, setSelectedCrewLead] = useState<string | null>(
    estimate.project_crew_lead || null
  );
  const [savingCrewLead, setSavingCrewLead] = useState(false);
  const [editingProductionManager, setEditingProductionManager] = useState(false);
  const [selectedProductionManager, setSelectedProductionManager] = useState<string | null>(
    estimate.production_manager || null
  );
  const [savingProductionManager, setSavingProductionManager] = useState(false);
  const [editingSalesPerson, setEditingSalesPerson] = useState(false);
  const [selectedSalesPerson, setSelectedSalesPerson] = useState<string | null>(
    estimate.sales_person || null
  );
  const [savingSalesPerson, setSavingSalesPerson] = useState(false);
  const [editingJobTag, setEditingJobTag] = useState(false);
  const [selectedJobTag, setSelectedJobTag] = useState<string | null>(
    estimate.job_tag || null
  );
  const [savingJobTag, setSavingJobTag] = useState(false);
  const router = useRouter();
  const fetchedClientIdRef = useRef<string | null>(null);
  const singleOptionDefaultsAppliedRef = useRef<string | null>(null);
  const { refreshData, updateEstimate, updateProject } = useDataCache();

  // Check QuickBooks connection status
  useEffect(() => {
    const checkQuickBooksStatus = async () => {
      try {
        const accessToken = localStorage.getItem('access_token');
        if (!accessToken) {
          return;
        }

        const response = await fetch('/api/quickbooks/status', {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${accessToken}`,
          },
        });

        if (response.ok) {
          const status = await response.json();
          setQuickbooksConnected(status.connected || false);
        }
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error('Error checking QuickBooks status:', error);
      }
    };

    checkQuickBooksStatus();
  }, []);

  // Load QuickBooks customers when modal opens
  useEffect(() => {
    if (showCustomerModal && quickbooksConnected && quickbooksCustomers.length === 0) {
      loadQuickBooksCustomers();
    }
  }, [showCustomerModal, quickbooksConnected]);

  const loadQuickBooksCustomers = async () => {
    try {
      setLoadingCustomers(true);
      const accessToken = localStorage.getItem('access_token');
      if (!accessToken) {
        return;
      }

      const response = await fetch('/api/quickbooks/customers', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (response.ok) {
        const customers = await response.json();
        setQuickbooksCustomers(customers);
      }
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Error loading QuickBooks customers:', error);
    } finally {
      setLoadingCustomers(false);
    }
  };

  const handleUpdateQuickBooksCustomer = async () => {
    if (savingCustomer) return;
    setSavingCustomer(true);
    try {
      const accessToken = localStorage.getItem('access_token');
      if (!accessToken) {
        // eslint-disable-next-line no-console
        console.error('No access token found');
        setSavingCustomer(false);
        return;
      }

      const response = await fetch(`/api/estimates/${estimateID}/quickbooks-customer`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ quickbooks_customer_id: selectedCustomerId }),
      });

      if (!response.ok) {
        throw new Error('Failed to update QuickBooks customer');
      }

      setShowCustomerModal(false);
      onUpdate();
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Failed to update QuickBooks customer:', error);
    } finally {
      setSavingCustomer(false);
    }
  };

  const getCurrentCustomerName = (): string => {
    if (!estimate.quickbooks_customer_id) {
      return '—';
    }
    const customer = quickbooksCustomers.find((c) => c.id === estimate.quickbooks_customer_id);
    return customer ? customer.name : estimate.quickbooks_customer_id;
  };

  useEffect(() => {
    const loadClientDetails = async () => {
      if (!estimate?.client_id) {
        return;
      }

      // Don't fetch if we've already fetched this client
      if (fetchedClientIdRef.current === estimate.client_id) {
        return;
      }

      const accessToken = localStorage.getItem('access_token');
      if (!accessToken) {
        return;
      }

      try {
        const response = await fetch(`/api/clients/${estimate.client_id}`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${accessToken}`,
          },
        });

        if (!response.ok) {
          // eslint-disable-next-line no-console
          console.error('Failed to load client details:', response.status);
          return;
        }

        const data = await response.json();
        const clientData = data.Item || data;
        setClient(clientData as ContractorClient);
        fetchedClientIdRef.current = estimate.client_id;
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error('Error loading client details:', error);
      }
    };

    loadClientDetails();
  }, [estimate?.client_id]);

  // Sync selectedOwnerId when estimate changes (but not when editing)
  useEffect(() => {
    if (!editingOwner) {
      setSelectedOwnerId(estimate.owned_by || estimate.created_by || null);
    }
  }, [estimate.owned_by, estimate.created_by, editingOwner]);

  // Helper function to normalize estimate_type for Select component
  const normalizeEstimateTypeForSelect = (
    estimateType: EstimateType | string | null | undefined
  ): string | null => {
    if (!estimateType) return null;

    // Normalize to uppercase string for comparison
    const normalizedType = typeof estimateType === 'string'
        ? estimateType.toUpperCase().trim()
        : String(estimateType).toUpperCase().trim();

    // Map to Select component values
    if (normalizedType === 'BOTH' || normalizedType === EstimateType.BOTH) {
      return 'Full House';
    }
    if (normalizedType === 'INTERIOR' || normalizedType === EstimateType.INTERIOR) {
      return EstimateType.INTERIOR;
    }
    if (normalizedType === 'EXTERIOR' || normalizedType === EstimateType.EXTERIOR) {
      return EstimateType.EXTERIOR;
    }

    return estimateType as string;
  };

  const jobTypeValue = normalizeEstimateTypeForSelect(estimate.estimate_type);
  const canEditJobType = detailsLoaded && jobTypeValue !== null;

  // Helper to normalize job type values before sending to the backend
  const normalizeEstimateTypeForBackend = (
    value: string | null
  ): EstimateType | null => {
    if (!value) return null;

    const normalizedValue = value.toUpperCase().trim();
    if (normalizedValue === 'FULL HOUSE' || normalizedValue === 'BOTH') {
      return EstimateType.BOTH;
    }
    if (normalizedValue === 'INTERIOR') {
      return EstimateType.INTERIOR;
    }
    if (normalizedValue === 'EXTERIOR') {
      return EstimateType.EXTERIOR;
    }

    return null;
  };

  useEffect(() => {
    if (!editingJobType && selectedJobType !== null) {
      setSelectedJobType(null);
    }
  }, [editingJobType, selectedJobType]);

  useEffect(() => {
    if (!canEditJobType && editingJobType) {
      setEditingJobType(false);
    }
  }, [canEditJobType, editingJobType]);

  // Sync currentStatus when estimate prop changes
  useEffect(() => {
    setCurrentStatus(estimate.status);
  }, [estimate.status]);

  // Sync selectedScheduledDate when estimate changes (but not when editing)
  useEffect(() => {
    if (!editingScheduledDate) {
      setSelectedScheduledDate(
        estimate.scheduled_date ? new Date(estimate.scheduled_date) : null
      );
    }
  }, [estimate.scheduled_date, editingScheduledDate]);

  // Sync selectedCustomerId when estimate changes (but not when modal is open)
  useEffect(() => {
    if (!showCustomerModal) {
      setSelectedCustomerId(estimate.quickbooks_customer_id || null);
    }
  }, [estimate.quickbooks_customer_id, showCustomerModal]);

  // Sync crew lead / production manager / sales person when estimate changes (but not when editing)
  useEffect(() => {
    if (!editingCrewLead) {
      setSelectedCrewLead(estimate.project_crew_lead || null);
    }
  }, [estimate.project_crew_lead, editingCrewLead]);

  useEffect(() => {
    if (!editingProductionManager) {
      setSelectedProductionManager(estimate.production_manager || null);
    }
  }, [estimate.production_manager, editingProductionManager]);

  useEffect(() => {
    if (!editingSalesPerson) {
      setSelectedSalesPerson(estimate.sales_person || null);
    }
  }, [estimate.sales_person, editingSalesPerson]);

  useEffect(() => {
    if (!editingJobTag) {
      setSelectedJobTag(estimate.job_tag || null);
    }
  }, [estimate.job_tag, editingJobTag]);

  // Sync job tag options from API, keeping any custom tag the user added
  useEffect(() => {
    setJobTagOptions((prev) => {
      const custom = prev.filter((p) => p.value && !jobTags.includes(p.value));
      return [
        { value: '', label: 'None' },
        ...jobTags.map((t) => ({ value: t, label: t })),
        ...custom,
      ];
    });
  }, [jobTags]);

  // When estimate changes, allow applying single-option defaults again for the new estimate
  useEffect(() => {
    singleOptionDefaultsAppliedRef.current = null;
  }, [estimateID]);

  const updateEstimateStatus = async (status: EstimateStatus) => {
    await logToCloudWatch(`Attempting to update estimate: ${estimate.id} to status: ${status}`);

    // If status is NEEDS_FOLLOW_UP, show the follow-up modal instead of updating immediately
    if (status === EstimateStatus.NEEDS_FOLLOW_UP) {
      setMenuOpened(false);
      setShowFollowUpModal(true);
      return;
    }

    // Store original status for potential revert
    const originalStatus = currentStatus;

    try {
      const accessToken = localStorage.getItem('access_token');
      if (!accessToken) {
        // eslint-disable-next-line no-console
        console.error('No access token found');
        return;
      }

      // Optimistically update the status immediately
      setCurrentStatus(status);
      setMenuOpened(false);

      const response = await fetch(`/api/estimates/${estimateID}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ status }),
      });

      if (!response.ok) {
        // Revert optimistic update on error
        setCurrentStatus(originalStatus);
        throw new Error('Failed to update estimate status');
      }

      const updatedEstimate = await response.json();

      if (status === EstimateStatus.CONTRACTOR_SIGNED && client) {
        const jiraResponse = await fetch('/api/jira', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify({ job: estimate, client }),
        });

        if (!jiraResponse.ok) {
          // Revert optimistic update if JIRA creation fails
          setCurrentStatus(originalStatus);
          throw new Error('Failed to create JIRA ticket');
        }
      }

      // Update cache immediately with the returned estimate
      updateEstimate(updatedEstimate);
      updateProject(updatedEstimate);

      // Optionally refresh in background for consistency (non-blocking)
      refreshData('estimates').catch(() => {});
      refreshData('projects').catch(() => {});

      if (status === EstimateStatus.PROJECT_BILLING_NEEDED) {
        setShowBillingPaymentModal(true);
      }

      onUpdate();
    } catch (error) {
      logToCloudWatch(`Failed to update estimate status: ${error}`);
    }
  };

  const syncToMainEstimateStatus = async () => {
    if (!estimate.original_estimate_id) {
      return;
    }
    const accessToken = localStorage.getItem('access_token');
    if (!accessToken) {
      // eslint-disable-next-line no-console
      console.error('No access token found');
      return;
    }

    setSyncingMainStatus(true);
    try {
      const response = await fetch(`/api/estimates/${estimateID}/sync-to-main-status`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to sync change order status');
      }

      const updatedEstimate = await response.json();
      setCurrentStatus(updatedEstimate.status);
      updateEstimate(updatedEstimate);
      refreshData('estimates').catch(() => {});
      refreshData('projects').catch(() => {});
      onUpdate();
    } catch (error) {
      logToCloudWatch(`Failed to sync change order status: ${error}`);
    } finally {
      setSyncingMainStatus(false);
    }
  };

  const openCheckInDateModal = useCallback(() => {
    const defaultDate = new Date();
    defaultDate.setDate(defaultDate.getDate() + 3);
    setCheckInDate(estimate.needs_follow_up_at
      ? new Date(estimate.needs_follow_up_at)
      : defaultDate);
    setShowCheckInDateModal(true);
  }, [estimate.needs_follow_up_at]);

  useEffect(() => {
    registerCheckInDateOpener?.(openCheckInDateModal);
    return () => registerCheckInDateOpener?.(null);
  }, [registerCheckInDateOpener, openCheckInDateModal]);

  const openBillingPaymentModal = useCallback(() => {
    setShowBillingPaymentModal(true);
  }, []);

  const handleSetCheckInDate = async () => {
    const accessToken = localStorage.getItem('access_token');
    if (!accessToken) return;
    setSavingCheckInDate(true);
    try {
      const body: { needs_follow_up_at?: string } = {};
      if (checkInDate) {
        body.needs_follow_up_at = checkInDate.toISOString();
      }
      const res = await fetch(
        `/api/estimates/${estimateID}/mark-needs-follow-up`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify(body),
        }
      );
      if (res.ok) {
        setShowCheckInDateModal(false);
        setCheckInDate(null);
        refreshData('estimates').catch(() => {});
        onUpdate();
      } else {
        const err = await res.json().catch(() => ({}));
        notifications.show({
          title: 'Failed to set check-in date',
          message: err?.detail || res.statusText,
          color: 'red',
          position: 'bottom-right',
        });
      }
    } finally {
      setSavingCheckInDate(false);
    }
  };

  const handleFollowUpModalSuccess = async () => {
    // After scheduling the follow-up, update the estimate status to NEEDS_FOLLOW_UP
    // Store original status for potential revert
    const originalStatus = currentStatus;

    try {
      const accessToken = localStorage.getItem('access_token');
      if (!accessToken) {
        // eslint-disable-next-line no-console
        console.error('No access token found');
        return;
      }

      // Optimistically update the status
      setCurrentStatus(EstimateStatus.NEEDS_FOLLOW_UP);

      const response = await fetch(`/api/estimates/${estimateID}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ status: EstimateStatus.NEEDS_FOLLOW_UP }),
      });

      if (!response.ok) {
        // Revert optimistic update on error
        setCurrentStatus(originalStatus);
        throw new Error('Failed to update estimate status');
      }

      const updatedEstimate = await response.json();

      // Update cache immediately with the returned estimate
      updateEstimate(updatedEstimate);
      updateProject(updatedEstimate);

      // Optionally refresh in background for consistency (non-blocking)
      refreshData('estimates').catch(() => {});
      refreshData('projects').catch(() => {});

      onUpdate();
    } catch (error) {
      logToCloudWatch(`Failed to update estimate status after follow-up: ${error}`);
    }
  };

  const updateClientAddress = async (value: string) => {
    const accessToken = localStorage.getItem('access_token');
    if (!accessToken) {
      // eslint-disable-next-line no-console
      console.error('No access token found');
      return;
    }

    await fetch(`/api/estimates/${estimateID}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        address_street: value,
        address_city: estimate.address_city || estimate.city || '',
        address_zipcode: estimate.address_zipcode || estimate.zip_code || '',
      }),
    });

    onUpdate();
  };

  const updateCity = async (value: string) => {
    const accessToken = localStorage.getItem('access_token');
    if (!accessToken) {
      // eslint-disable-next-line no-console
      console.error('No access token found');
      return;
    }

    await fetch(`/api/estimates/${estimateID}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        address_city: value,
        address_zipcode: estimate.address_zipcode || estimate.zip_code || '',
        address_street: estimate.address_street || estimate.client_address || '',
      }),
    });

    onUpdate();
  };

  const updateZipCode = async (value: string) => {
    const accessToken = localStorage.getItem('access_token');
    if (!accessToken) {
      // eslint-disable-next-line no-console
      console.error('No access token found');
      return;
    }

    await fetch(`/api/estimates/${estimateID}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        address_city: estimate.address_city || estimate.city || '',
        address_zipcode: value,
        address_street: estimate.address_street || estimate.client_address || '',
      }),
    });

    onUpdate();
  };

  const updateDiscountReason = async (value: string) => {
    const accessToken = localStorage.getItem('access_token');
    if (!accessToken) {
      // eslint-disable-next-line no-console
      console.error('No access token found');
      return;
    }

    await fetch(`/api/estimates/${estimateID}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({ discount_reason: value || null }),
    });

    onUpdate();
  };

  const updateDiscountPercentage = async (value: string) => {
    const accessToken = localStorage.getItem('access_token');
    if (!accessToken) {
      // eslint-disable-next-line no-console
      console.error('No access token found');
      return;
    }

    const discountPercentage = value ? parseFloat(value) : null;
    await fetch(`/api/estimates/${estimateID}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({ discount_percentage: discountPercentage }),
    });

    onUpdate();
  };

  const updatePaintDetails = async (value: string) => {
    const accessToken = localStorage.getItem('access_token');
    if (!accessToken) {
      // eslint-disable-next-line no-console
      console.error('No access token found');
      return;
    }

    const content: UpdateJobContent = {
      update_paint_details: {
        keep_same_colors: (estimate as any).keep_same_colors || false,
        has_existing_paint: (estimate as any).has_existing_paint || false,
        paint_details: value,
      },
    };

    await fetch(`/api/estimates/${estimateID}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify(content),
    });

    onUpdate();
  };

  const updateCrewLead = async (value: string) => {
    const accessToken = localStorage.getItem('access_token');
    if (!accessToken) {
      // eslint-disable-next-line no-console
      console.error('No access token found');
      return;
    }

    await fetch(`/api/estimates/${estimateID}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({ project_crew_lead: value || null }),
    });

    onUpdate();
  };

  const updateProductionManager = async (value: string | null) => {
    const accessToken = localStorage.getItem('access_token');
    if (!accessToken) {
      // eslint-disable-next-line no-console
      console.error('No access token found');
      return;
    }

    await fetch(`/api/estimates/${estimateID}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({ production_manager: value ?? '' }),
    });

    onUpdate();
  };

  const updateSalesPerson = async (value: string | null) => {
    const accessToken = localStorage.getItem('access_token');
    if (!accessToken) {
      // eslint-disable-next-line no-console
      console.error('No access token found');
      return;
    }

    await fetch(`/api/estimates/${estimateID}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({ sales_person: value ?? '' }),
    });

    onUpdate();
  };

  // Set default crew lead / production manager / sales person when only one option is configured
  useEffect(() => {
    if (loadingTeamConfig || singleOptionDefaultsAppliedRef.current === estimateID) {
      return;
    }
    const toApply: Array<() => Promise<void>> = [];
    if (teamConfig.leadPainters.length === 1 && !estimate.project_crew_lead?.trim()) {
      toApply.push(() => updateCrewLead(teamConfig.leadPainters[0]));
    }
    if (teamConfig.productionManagers.length === 1 && !estimate.production_manager?.trim()) {
      toApply.push(() => updateProductionManager(teamConfig.productionManagers[0]));
    }
    if (teamConfig.salesPeople.length === 1 && !estimate.sales_person?.trim()) {
      toApply.push(() => updateSalesPerson(teamConfig.salesPeople[0]));
    }
    if (toApply.length > 0) {
      singleOptionDefaultsAppliedRef.current = estimateID;
      toApply.forEach((fn) => { fn(); });
    }
  }, [
    loadingTeamConfig,
    estimateID,
    estimate.project_crew_lead,
    estimate.production_manager,
    estimate.sales_person,
    teamConfig.leadPainters,
    teamConfig.productionManagers,
    teamConfig.salesPeople,
  ]);

  const updateActualHours = async (value: string) => {
    const accessToken = localStorage.getItem('access_token');
    if (!accessToken) {
      // eslint-disable-next-line no-console
      console.error('No access token found');
      return;
    }

    // Handle empty string or invalid input
    const trimmedValue = value?.trim();
    const actualHours = trimmedValue ? parseFloat(trimmedValue) : 0;

    // If parseFloat returns NaN, default to 0
    const finalHours = Number.isNaN(actualHours) ? 0 : actualHours;
    await fetch(`/api/estimates/${estimateID}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({ actual_hours: finalHours }),
    });

    onUpdate();
  };

  const updateScheduledDate = async (date: Date | null) => {
    if (savingScheduledDate) return;
    setSavingScheduledDate(true);
    try {
      const accessToken = localStorage.getItem('access_token');
      if (!accessToken) {
        // eslint-disable-next-line no-console
        console.error('No access token found');
        setSavingScheduledDate(false);
        return;
      }

      await fetch(`/api/estimates/${estimateID}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          scheduled_date: date ? date.toISOString() : null,
        }),
      });

      setEditingScheduledDate(false);
      onUpdate();
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Failed to update scheduled date:', error);
    } finally {
      setSavingScheduledDate(false);
    }
  };

  const handleScheduledDateClick = () => {
    setEditingScheduledDate(true);
    setSelectedScheduledDate(
      estimate.scheduled_date ? new Date(estimate.scheduled_date) : null
    );
  };

  const handleScheduledDateCancel = () => {
    setSelectedScheduledDate(
      estimate.scheduled_date ? new Date(estimate.scheduled_date) : null
    );
    setEditingScheduledDate(false);
  };

  const updateOwnedBy = async (userId: string | null) => {
    if (savingOwner) return;
    setSavingOwner(true);
    try {
      const accessToken = localStorage.getItem('access_token');
      if (!accessToken) {
        // eslint-disable-next-line no-console
        console.error('No access token found');
        setSavingOwner(false);
        return;
      }

      await fetch(`/api/estimates/${estimateID}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ owned_by: userId || null }),
      });

      setEditingOwner(false);
      onUpdate();
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Failed to update owner:', error);
    } finally {
      setSavingOwner(false);
    }
  };

  const handleOwnerClick = () => {
    setEditingOwner(true);
    setSelectedOwnerId(estimate.owned_by || estimate.created_by || null);
  };

  const handleOwnerCancel = () => {
    setSelectedOwnerId(estimate.owned_by || estimate.created_by || null);
    setEditingOwner(false);
  };

  const getOwnerDisplayName = (): string => {
    const ownerId = estimate.owned_by || estimate.created_by || null;
    if (!ownerId) return '—';
    const owner = users.find((u) => u.id === ownerId);
    return owner ? owner.full_name || owner.email : '—';
  };

  const updateJobType = async (value: string | null) => {
    if (!detailsLoaded) return;
    if (savingJobType) return;
    const backendValue = normalizeEstimateTypeForBackend(value);
    if (!backendValue) {
      return;
    }
    const currentValue = normalizeEstimateTypeForSelect(estimate.estimate_type);
    if (currentValue === value) {
      setEditingJobType(false);
      return;
    }

    setSavingJobType(true);
    try {
      const accessToken = localStorage.getItem('access_token');
      if (!accessToken) {
        // eslint-disable-next-line no-console
        console.error('No access token found');
        return;
      }

      const response = await fetch(`/api/estimates/${estimateID}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ estimate_type: backendValue || null }),
      });

      if (!response.ok) {
        throw new Error('Failed to update job type');
      }

      // Optimistically update cache so the UI doesn't get reset by stale data
      updateEstimate({
        ...estimate,
        estimate_type: backendValue,
      });
      setEditingJobType(false);
      onUpdate();
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Failed to update job type:', error);
    } finally {
      setSavingJobType(false);
    }
  };

  const handleJobTypeClick = () => {
    if (!canEditJobType) {
      return;
    }
    setEditingJobType(true);
    setSelectedJobType(jobTypeValue);
  };

  const handleJobTypeCancel = () => {
    setSelectedJobType(normalizeEstimateTypeForSelect(estimate.estimate_type));
    setEditingJobType(false);
  };

  const getJobTypeDisplayName = (): string => getFormattedEstimateType(estimate.estimate_type);

  const updateJobTag = async (value: string | null) => {
    const accessToken = localStorage.getItem('access_token');
    if (!accessToken) {
      // eslint-disable-next-line no-console
      console.error('No access token found');
      return;
    }

    setSavingJobTag(true);
    try {
      await fetch(`/api/estimates/${estimateID}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ job_tag: value || null }),
      });

      updateEstimate({ ...estimate, job_tag: value || undefined });
      setEditingJobTag(false);
      onUpdate();
    } finally {
      setSavingJobTag(false);
    }
  };

  // Function to get valid next statuses based on current status
  const getValidNextStatuses = (status: EstimateStatus): EstimateStatus[] => {
    switch (status) {
      // Initial lead statuses
      case EstimateStatus.NEW_LEAD:
        return [
          EstimateStatus.ESTIMATE_NOT_SCHEDULED,
          EstimateStatus.ESTIMATE_SCHEDULED,
          EstimateStatus.NEEDS_FOLLOW_UP,
          EstimateStatus.ESTIMATE_DECLINED,
          EstimateStatus.STALE_ESTIMATE,
        ];

      // Scheduling phase
      case EstimateStatus.ESTIMATE_NOT_SCHEDULED:
        return [
          EstimateStatus.ESTIMATE_SCHEDULED,
          EstimateStatus.NEEDS_FOLLOW_UP,
          EstimateStatus.STALE_ESTIMATE,
          EstimateStatus.ESTIMATE_DECLINED,
        ];

      case EstimateStatus.ESTIMATE_SCHEDULED:
        return [
          EstimateStatus.ESTIMATE_IN_PROGRESS,
          EstimateStatus.ESTIMATE_NOT_SCHEDULED,
          EstimateStatus.NEEDS_FOLLOW_UP,
          EstimateStatus.ESTIMATE_DECLINED,
          EstimateStatus.STALE_ESTIMATE,
        ];

      // Estimate creation phase
      case EstimateStatus.ESTIMATE_IN_PROGRESS:
        return [
          EstimateStatus.ESTIMATE_SENT,
          EstimateStatus.ESTIMATE_SCHEDULED,
          EstimateStatus.NEEDS_FOLLOW_UP,
          EstimateStatus.ESTIMATE_DECLINED,
          EstimateStatus.STALE_ESTIMATE,
        ];

      // Estimate sent phase
      case EstimateStatus.ESTIMATE_SENT:
        return [
          EstimateStatus.ESTIMATE_OPENED,
          EstimateStatus.ESTIMATE_ACCEPTED,
          EstimateStatus.ESTIMATE_DECLINED,
          EstimateStatus.ESTIMATE_IN_PROGRESS,
          EstimateStatus.NEEDS_FOLLOW_UP,
          EstimateStatus.STALE_ESTIMATE,
        ];

      case EstimateStatus.ESTIMATE_OPENED:
        return [
          EstimateStatus.ESTIMATE_ACCEPTED,
          EstimateStatus.ESTIMATE_DECLINED,
          EstimateStatus.ESTIMATE_SENT,
          EstimateStatus.NEEDS_FOLLOW_UP,
          EstimateStatus.STALE_ESTIMATE,
        ];

      // Client decision phase
      case EstimateStatus.ESTIMATE_ACCEPTED:
        return [
          EstimateStatus.CONTRACTOR_OPENED,
          EstimateStatus.ESTIMATE_DECLINED,
          EstimateStatus.ESTIMATE_OPENED,
          EstimateStatus.NEEDS_FOLLOW_UP,
          EstimateStatus.STALE_ESTIMATE,
        ];

      case EstimateStatus.ESTIMATE_DECLINED:
        return [
          EstimateStatus.ESTIMATE_ACCEPTED,
          EstimateStatus.ESTIMATE_OPENED,
          EstimateStatus.ESTIMATE_SENT,
          EstimateStatus.NEEDS_FOLLOW_UP,
        ];

      // Contractor review phase
      case EstimateStatus.CONTRACTOR_OPENED:
        return [
          EstimateStatus.CONTRACTOR_SIGNED,
          EstimateStatus.CONTRACTOR_DECLINED,
          EstimateStatus.ESTIMATE_ACCEPTED,
          EstimateStatus.NEEDS_FOLLOW_UP,
        ];

      case EstimateStatus.CONTRACTOR_DECLINED:
        return [
          EstimateStatus.CONTRACTOR_OPENED,
          EstimateStatus.ESTIMATE_ACCEPTED,
          EstimateStatus.NEEDS_FOLLOW_UP,
        ];

      // Signed phase - can move to accounting and project statuses
      case EstimateStatus.CONTRACTOR_SIGNED:
        return [
          EstimateStatus.ACCOUNTING_NEEDED,
          EstimateStatus.PROJECT_NOT_SCHEDULED,
          EstimateStatus.CONTRACTOR_DECLINED,
        ];

      // Accounting phase
      case EstimateStatus.ACCOUNTING_NEEDED:
        return [
          EstimateStatus.PROJECT_NOT_SCHEDULED,
          EstimateStatus.CONTRACTOR_SIGNED,
        ];

      // Project scheduling phase
      case EstimateStatus.PROJECT_NOT_SCHEDULED:
        return [
          EstimateStatus.PROJECT_SCHEDULED,
          EstimateStatus.ACCOUNTING_NEEDED,
          EstimateStatus.PROJECT_CANCELLED,
        ];

      case EstimateStatus.PROJECT_SCHEDULED:
        return [
          EstimateStatus.PROJECT_IN_PROGRESS,
          EstimateStatus.PROJECT_NOT_SCHEDULED,
          EstimateStatus.PROJECT_CANCELLED,
        ];

      // Project execution phase
      case EstimateStatus.PROJECT_IN_PROGRESS:
        return [
          EstimateStatus.PROJECT_BILLING_NEEDED,
          EstimateStatus.PROJECT_SCHEDULED,
        ];

      case EstimateStatus.PROJECT_BILLING_NEEDED:
        return [
          EstimateStatus.PROJECT_ACCOUNTS_RECEIVABLE,
          EstimateStatus.PROJECT_IN_PROGRESS,
          EstimateStatus.PROJECT_CANCELLED,
        ];

      case EstimateStatus.PROJECT_ACCOUNTS_RECEIVABLE:
        return [
          EstimateStatus.PROJECT_PAYMENTS_RECEIVED,
          EstimateStatus.PROJECT_BILLING_NEEDED,
          EstimateStatus.PROJECT_CANCELLED,
        ];

      case EstimateStatus.PROJECT_PAYMENTS_RECEIVED:
        return [
          EstimateStatus.PROJECT_COMPLETED,
        ];

      case EstimateStatus.PROJECT_COMPLETED:
        return [
          EstimateStatus.PROJECT_PAYMENTS_RECEIVED,
        ];

      case EstimateStatus.PROJECT_CANCELLED:
        return [
          EstimateStatus.ESTIMATE_IN_PROGRESS,
          EstimateStatus.PROJECT_NOT_SCHEDULED,
          EstimateStatus.PROJECT_SCHEDULED,
          EstimateStatus.PROJECT_IN_PROGRESS,
        ];

      // Special statuses
      case EstimateStatus.NEEDS_FOLLOW_UP:
        return [
          EstimateStatus.ESTIMATE_SCHEDULED,
          EstimateStatus.ESTIMATE_IN_PROGRESS,
        ];

      case EstimateStatus.STALE_ESTIMATE:
        return [
          EstimateStatus.ESTIMATE_SENT,
          EstimateStatus.ESTIMATE_ACCEPTED,
          EstimateStatus.NEEDS_FOLLOW_UP,
          EstimateStatus.ARCHIVED,
        ];

      case EstimateStatus.ARCHIVED:
        return [
          EstimateStatus.ESTIMATE_IN_PROGRESS,
        ];

      default:
        // Fallback: return all statuses except current
        return Object.values(EstimateStatus).filter(
          (s) => s !== status
        );
    }
  };

  const statusOptions = getValidNextStatuses(currentStatus);

  const statusDropdownOptions = statusOptions.map((status) => (
    <Menu.Item key={status} onClick={() => updateEstimateStatus(status)}>
      {getFormattedEstimateStatus(status)}
    </Menu.Item>
  ));

  return (
    <Paper shadow="sm" radius="md" withBorder p="lg">
      <Flex direction="column" gap="sm">
        {currentStatus === EstimateStatus.PROJECT_BILLING_NEEDED && (
          <CollectPaymentBillingBanner
            estimateId={estimateID}
            onOpenModal={openBillingPaymentModal}
          />
        )}
        {/* Status */}
        <div>
          <Flex align="center" gap="sm" mb="xs">
            <Text size="sm" fw={500} c="dimmed">
              Status:
            </Text>
            <Flex justify="flex-end" align="center" gap="xs" style={{ width: '100%' }}>
              {!client ? (
                <Skeleton height={24} width={120} />
              ) : (
                <Menu opened={menuOpened} onChange={setMenuOpened} width={200} position="bottom-end">
                  <Menu.Target>
                    <Badge
                      style={{
                        color: '#ffffff',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '5px',
                      }}
                      color={getEstimateBadgeColor(currentStatus)}
                      rightSection={<IconChevronDown size={12} />}
                    >
                      {getFormattedEstimateStatus(currentStatus)}
                    </Badge>
                  </Menu.Target>
                  <Menu.Dropdown>
                    <Menu.Label>Change Status</Menu.Label>
                    {statusDropdownOptions}
                  </Menu.Dropdown>
                </Menu>
              )}
            </Flex>
          </Flex>
          {estimate.original_estimate_id && (
            <Flex justify="flex-end">
              <Button
                size="xs"
                variant="light"
                onClick={syncToMainEstimateStatus}
                loading={syncingMainStatus}
              >
                Sync To Main Estimate Status
              </Button>
            </Flex>
          )}
        </div>

        {(estimate.follow_up_count != null && estimate.follow_up_count > 0) && (
          <Flex justify="space-between" align="center" gap="sm" mb="md">
            <Text size="sm" fw={500} c="dimmed">
              Reach-outs:
            </Text>
            <Text size="sm" style={{ textAlign: 'right', flex: 1, maxWidth: '200px' }} c="dark">
              {estimate.follow_up_count}
            </Text>
          </Flex>
        )}

        {/* Check-in date - clickable to open modal */}
        <Flex
          justify="space-between"
          align="center"
          gap="sm"
          mb="md"
          style={{ cursor: 'pointer' }}
          onClick={openCheckInDateModal}
        >
          <Text size="sm" fw={500} c="dimmed">
            Check-in date:
          </Text>
          <Text
            size="sm"
            style={{ textAlign: 'right', flex: 1, maxWidth: '200px' }}
            c={estimate.needs_follow_up && estimate.needs_follow_up_at ? 'dark' : 'dimmed'}
          >
            {estimate.needs_follow_up && estimate.needs_follow_up_at
              ? new Date(estimate.needs_follow_up_at).toLocaleDateString(undefined, {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                })
              : '—'}
          </Text>
        </Flex>

        {/* Job Type */}
        {editingJobType && canEditJobType ? (
          <div style={{ marginBottom: 'var(--mantine-spacing-md)' }}>
            <Flex justify="space-between" align="center" gap="sm" mb="xs">
              <Text size="sm" fw={500} c="dimmed">
                Job Type:
              </Text>
              <Select
                data={[
                  { value: EstimateType.INTERIOR, label: 'Interior' },
                  { value: EstimateType.EXTERIOR, label: 'Exterior' },
                  { value: 'Full House', label: 'Full House' },
                ]}
                value={selectedJobType ?? jobTypeValue}
                onChange={(value) => setSelectedJobType(value)}
                placeholder="Select job type"
                style={{ flex: 1, maxWidth: '200px' }}
                size="sm"
                disabled={!canEditJobType || savingJobType}
              />
            </Flex>
            <Flex gap="xs" justify="flex-end">
              <ActionIcon
                color="green"
                variant="light"
                onClick={() => updateJobType(selectedJobType ?? jobTypeValue)}
                loading={savingJobType}
                size="lg"
                disabled={
                  !canEditJobType
                  || !(selectedJobType ?? jobTypeValue)
                  || (selectedJobType ?? jobTypeValue) === jobTypeValue
                }
              >
                <IconCheck size={18} />
              </ActionIcon>
              <ActionIcon
                color="red"
                variant="light"
                onClick={handleJobTypeCancel}
                disabled={savingJobType}
                size="lg"
              >
                <IconX size={18} />
              </ActionIcon>
            </Flex>
          </div>
        ) : (
          <Flex justify="space-between" align="center" gap="sm" style={{ marginBottom: 'var(--mantine-spacing-md)' }}>
            <Text size="sm" fw={500} c="dimmed">
              Job Type:
            </Text>
            <Text
              size="sm"
              style={{
                cursor: canEditJobType ? 'pointer' : 'not-allowed',
                textAlign: 'right',
                flex: 1,
                maxWidth: '200px',
              }}
              onClick={canEditJobType ? handleJobTypeClick : undefined}
              c={estimate.estimate_type ? 'dark' : 'dimmed'}
            >
              {getJobTypeDisplayName()}
            </Text>
          </Flex>
        )}

        {/* Job Tag - for dashboard filtering */}
        {editingJobTag ? (
          <div style={{ marginBottom: 'var(--mantine-spacing-md)' }}>
            <Flex justify="space-between" align="center" gap="sm" mb="xs">
              <Text size="sm" fw={500} c="dimmed">
                Job Tag:
              </Text>
              <Autocomplete
                data={jobTagOptions.map((o) => o.label).filter((l) => l !== 'None')}
                value={selectedJobTag ?? ''}
                onChange={(value) => setSelectedJobTag(value === '' ? null : value)}
                placeholder="None"
                style={{ flex: 1, maxWidth: '200px' }}
                size="sm"
                disabled={savingJobTag}
              />
            </Flex>
            <Flex gap="xs" justify="flex-end">
              <ActionIcon
                color="green"
                variant="light"
                onClick={() => updateJobTag(selectedJobTag ?? '')}
                loading={savingJobTag}
                size="lg"
              >
                <IconCheck size={18} />
              </ActionIcon>
              <ActionIcon
                color="red"
                variant="light"
                onClick={() => {
                  setSelectedJobTag(estimate.job_tag || null);
                  setEditingJobTag(false);
                }}
                disabled={savingJobTag}
                size="lg"
              >
                <IconX size={18} />
              </ActionIcon>
            </Flex>
          </div>
        ) : (
          <Flex justify="space-between" align="center" gap="sm" style={{ marginBottom: 'var(--mantine-spacing-md)' }}>
            <Text size="sm" fw={500} c="dimmed">
              Job Tag:
            </Text>
            <Text
              size="sm"
              style={{ cursor: 'pointer', textAlign: 'right', flex: 1, maxWidth: '200px' }}
              onClick={() => setEditingJobTag(true)}
              c={estimate.job_tag ? 'dark' : 'dimmed'}
            >
              {estimate.job_tag || '—'}
            </Text>
          </Flex>
        )}

        <EstimateSchedulePanel estimate={estimate} estimateID={estimateID} onUpdate={onUpdate} />

        {/* Owned By */}
        {editingOwner ? (
          <div style={{ marginBottom: 'var(--mantine-spacing-md)' }}>
            <Flex justify="space-between" align="center" gap="sm" mb="xs">
              <Text size="sm" fw={500} c="dimmed">
                Owned by:
              </Text>
              <Select
                data={users.map((user) => ({
                  value: user.id,
                  label: user.full_name || user.email,
                }))}
                value={selectedOwnerId}
                onChange={setSelectedOwnerId}
                placeholder="Select owner"
                searchable
                clearable
                style={{ flex: 1, maxWidth: '200px' }}
                size="sm"
                disabled={loadingUsers}
                autoFocus
              />
            </Flex>
            <Flex gap="xs" justify="flex-end">
              <ActionIcon
                color="green"
                variant="light"
                onClick={() => updateOwnedBy(selectedOwnerId)}
                loading={savingOwner}
                size="lg"
              >
                <IconCheck size={18} />
              </ActionIcon>
              <ActionIcon
                color="red"
                variant="light"
                onClick={handleOwnerCancel}
                disabled={savingOwner}
                size="lg"
              >
                <IconX size={18} />
              </ActionIcon>
            </Flex>
          </div>
        ) : (
          <Flex justify="space-between" align="center" gap="sm" style={{ marginBottom: 'var(--mantine-spacing-md)' }}>
            <Text size="sm" fw={500} c="dimmed">
              Owned by:
            </Text>
            <Text
              size="sm"
              style={{ cursor: 'pointer', textAlign: 'right', flex: 1, maxWidth: '200px' }}
              onClick={handleOwnerClick}
              c={estimate.owned_by || estimate.created_by ? 'dark' : 'dimmed'}
            >
              {getOwnerDisplayName()}
            </Text>
          </Flex>
        )}

        {/* Client Name - Clickable, not editable */}
        <Flex justify="space-between" align="center" gap="sm" style={{ marginBottom: 'var(--mantine-spacing-md)' }}>
          <Text size="sm" fw={500} c="dimmed">
            Client:
          </Text>
          {!client ? (
            <Skeleton height={20} width={150} />
          ) : (
            <Text
              size="sm"
              style={{ cursor: 'pointer', textAlign: 'right', flex: 1, maxWidth: '200px' }}
              onClick={() => router.push(`/clients/${estimate.client_id}`)}
              c="blue"
              td="underline"
            >
              {client?.name || 'Client'}
            </Text>
          )}
        </Flex>

        {/* Client Email - Read-only */}
        <Flex justify="space-between" align="center" gap="sm" style={{ marginBottom: 'var(--mantine-spacing-md)' }}>
          <Text size="sm" fw={500} c="dimmed">
            Email:
          </Text>
          {!client ? (
            <Skeleton height={20} width={200} />
          ) : (
            <Text
              size="sm"
              c="dimmed"
              style={{
                textAlign: 'right',
                flex: 1,
                maxWidth: '200px',
                minWidth: 0,
                overflowWrap: 'anywhere',
                wordBreak: 'break-word',
              }}
            >
              {client?.email || '—'}
            </Text>
          )}
        </Flex>

        {/* Client Phone - Read-only */}
        <Flex justify="space-between" align="center" gap="sm" style={{ marginBottom: 'var(--mantine-spacing-md)' }}>
          <Text size="sm" fw={500} c="dimmed">
            Phone:
          </Text>
          {!client ? (
            <Skeleton height={20} width={150} />
          ) : (
            <Text size="sm" c="dimmed" style={{ textAlign: 'right', flex: 1, maxWidth: '200px' }}>
              {formatPhoneNumber(client?.phone_number)}
            </Text>
          )}
        </Flex>

        {/* Address */}
        <EditableField
          label="Address"
          value={estimate.address_street || estimate.client_address}
          onSave={updateClientAddress}
          placeholder="Enter address"
        />

        {/* City */}
        <EditableField
          label="City"
          value={estimate.address_city || estimate.city}
          onSave={updateCity}
          placeholder="Enter city"
        />

        {/* Zip Code */}
        <EditableField
          label="Zip Code"
          value={estimate.address_zipcode || estimate.zip_code}
          onSave={updateZipCode}
          placeholder="Enter zip code"
        />

        {/* Hours - Show breakdown if change orders exist */}
        {estimate.original_hours !== undefined || estimate.change_order_hours ? (
          <>
            <Flex justify="space-between" align="center" gap="sm" style={{ marginBottom: 'var(--mantine-spacing-xs)' }}>
              <Text size="sm" fw={500} c="dimmed">
                Original Hours:
              </Text>
              <Text size="sm" c="dimmed" style={{ textAlign: 'right', flex: 1, maxWidth: '200px' }}>
                {estimate.original_hours?.toFixed(2) || estimate.hours_bid?.toFixed(2) || '—'}
              </Text>
            </Flex>
            {estimate.change_order_hours ? (
              <Flex justify="space-between" align="center" gap="sm" style={{ marginBottom: 'var(--mantine-spacing-xs)' }}>
                <Text size="sm" fw={500} c="dimmed">
                  Change Order Hours:
                </Text>
                <Text size="sm" c="dimmed" style={{ textAlign: 'right', flex: 1, maxWidth: '200px' }}>
                  {estimate.change_order_hours.toFixed(2)}
                </Text>
              </Flex>
            ) : null}
            <Flex justify="space-between" align="center" gap="sm" style={{ marginBottom: 'var(--mantine-spacing-md)' }}>
              <Text size="sm" fw={600} c="dimmed">
                Total Hours:
              </Text>
              <Text
                size="sm"
                fw={600}
                style={{ textAlign: 'right', flex: 1, maxWidth: '200px' }}
              >
                {((estimate.original_hours || estimate.hours_bid || 0) +
                  (estimate.change_order_hours || 0)).toFixed(2)}
              </Text>
            </Flex>
          </>
        ) : (
          <Flex justify="space-between" align="center" gap="sm" style={{ marginBottom: 'var(--mantine-spacing-md)' }}>
            <Text size="sm" fw={500} c="dimmed">
              Job Hours:
            </Text>
            <Text size="sm" c="dimmed" style={{ textAlign: 'right', flex: 1, maxWidth: '200px' }}>
              {estimate.estimate_hours || estimate.hours_bid || '—'}
            </Text>
          </Flex>
        )}

        {/* Rate - Read-only */}
        <Flex justify="space-between" align="center" gap="sm" style={{ marginBottom: 'var(--mantine-spacing-md)' }}>
          <Text size="sm" fw={500} c="dimmed">
            Job Rate:
          </Text>
          <Text size="sm" c="dimmed" style={{ textAlign: 'right', flex: 1, maxWidth: '200px' }}>
            ${estimate.hourly_rate?.toFixed(2) || '—'}
          </Text>
        </Flex>

        {/* Job Total - Read-only (hours * rate - discount) */}
        <Flex justify="space-between" align="center" gap="sm" style={{ marginBottom: 'var(--mantine-spacing-md)' }}>
          <Text size="sm" fw={500} c="dimmed">
            Job Total:
          </Text>
          <Text size="sm" fw={600} style={{ textAlign: 'right', flex: 1, maxWidth: '200px' }}>
            {(() => {
              // Use actual_hours if available and > 0, otherwise use estimated hours
              const hours = ((estimate.original_hours || estimate.hours_bid || 0) +
                (estimate.change_order_hours || 0)) as number;
              const rate = estimate.hourly_rate || 0;
              const subtotal = hours * rate;

              // Apply discount if discount_percentage is set
              const discountPercentage = estimate.discount_percentage || 0;
              const discountAmount =
                discountPercentage > 0 ? subtotal * (discountPercentage / 100) : 0;
              const total = subtotal - discountAmount;

              return total > 0 ? `$${total.toFixed(2)}` : '—';
            })()}
          </Text>
        </Flex>

        {/* Discount Percentage */}
        <EditableField
          label="Discount Percentage"
          value={`${estimate.discount_percentage?.toString() || '0'}%`}
          onSave={updateDiscountPercentage}
          placeholder="Enter discount percentage (e.g., 10 for 10%)"
          type="number"
        />

        {/* Discount Reason */}
        <EditableField
          label="Discount Reason"
          value={estimate.discount_reason}
          onSave={updateDiscountReason}
          placeholder="Enter discount reason"
        />

        {/* Paint Details */}
        <EditableField
          label="Paint Details"
          value={(estimate as any).paint_details}
          onSave={updatePaintDetails}
          type="textarea"
          multiline
          placeholder="Enter paint details"
        />

        {/* Job Crew Lead (dropdown from lead painters) */}
        {editingCrewLead ? (
          <div style={{ marginBottom: 'var(--mantine-spacing-md)' }}>
            <Flex justify="space-between" align="center" gap="sm" mb="xs">
              <Text size="sm" fw={500} c="dimmed">
                Job Crew Lead:
              </Text>
              <Select
                data={[
                  ...teamConfig.leadPainters.map((name) => ({ value: name, label: name })),
                  ...(selectedCrewLead && !teamConfig.leadPainters.includes(selectedCrewLead)
                    ? [{ value: selectedCrewLead, label: selectedCrewLead }]
                    : []),
                ]}
                value={selectedCrewLead}
                onChange={async (value) => {
                  setSelectedCrewLead(value);
                  if (savingCrewLead) return;
                  setSavingCrewLead(true);
                  try {
                    await updateCrewLead(value || '');
                    setEditingCrewLead(false);
                  } finally {
                    setSavingCrewLead(false);
                  }
                }}
                placeholder="Select crew lead"
                clearable
                style={{ flex: 1, maxWidth: '200px' }}
                size="sm"
                disabled={loadingTeamConfig || savingCrewLead}
              />
            </Flex>
            <Flex gap="xs" justify="flex-end">
              <ActionIcon
                color="red"
                variant="light"
                onClick={() => {
                  setSelectedCrewLead(estimate.project_crew_lead || null);
                  setEditingCrewLead(false);
                }}
                disabled={savingCrewLead}
                size="lg"
              >
                <IconX size={18} />
              </ActionIcon>
            </Flex>
          </div>
        ) : (
          <Flex justify="space-between" align="center" gap="sm" style={{ marginBottom: 'var(--mantine-spacing-md)' }}>
            <Text size="sm" fw={500} c="dimmed">
              Job Crew Lead:
            </Text>
            <Text
              size="sm"
              style={{ cursor: 'pointer', textAlign: 'right', flex: 1, maxWidth: '200px' }}
              onClick={() => {
                setSelectedCrewLead(estimate.project_crew_lead || null);
                setEditingCrewLead(true);
              }}
              c={estimate.project_crew_lead ? 'dark' : 'dimmed'}
            >
              {estimate.project_crew_lead || '—'}
            </Text>
          </Flex>
        )}

        {/* Production Manager (dropdown from settings) */}
        {editingProductionManager ? (
          <div style={{ marginBottom: 'var(--mantine-spacing-md)' }}>
            <Flex justify="space-between" align="center" gap="sm" mb="xs">
              <Text size="sm" fw={500} c="dimmed">
                Production Manager:
              </Text>
              <Select
                data={[
                  ...teamConfig.productionManagers.map((name) => ({
                    value: name,
                    label: name,
                  })),
                  ...(selectedProductionManager &&
                  !teamConfig.productionManagers.includes(selectedProductionManager)
                    ? [
                        {
                            value: selectedProductionManager,
                            label: selectedProductionManager,
                        },
                      ]
                    : []),
                ]}
                value={selectedProductionManager}
                onChange={async (value) => {
                  setSelectedProductionManager(value);
                  if (savingProductionManager) return;
                  setSavingProductionManager(true);
                  try {
                    await updateProductionManager(value);
                    setEditingProductionManager(false);
                  } finally {
                    setSavingProductionManager(false);
                  }
                }}
                placeholder="Select production manager"
                clearable
                style={{ flex: 1, maxWidth: '200px' }}
                size="sm"
                disabled={loadingTeamConfig || savingProductionManager}
              />
            </Flex>
            <Flex gap="xs" justify="flex-end">
              <ActionIcon
                color="red"
                variant="light"
                onClick={() => {
                  setSelectedProductionManager(estimate.production_manager || null);
                  setEditingProductionManager(false);
                }}
                disabled={savingProductionManager}
                size="lg"
              >
                <IconX size={18} />
              </ActionIcon>
            </Flex>
          </div>
        ) : (
          <Flex justify="space-between" align="center" gap="sm" style={{ marginBottom: 'var(--mantine-spacing-md)' }}>
            <Text size="sm" fw={500} c="dimmed">
              Production Manager:
            </Text>
            <Text
              size="sm"
              style={{ cursor: 'pointer', textAlign: 'right', flex: 1, maxWidth: '200px' }}
              onClick={() => {
                setSelectedProductionManager(estimate.production_manager || null);
                setEditingProductionManager(true);
              }}
              c={estimate.production_manager ? 'dark' : 'dimmed'}
            >
              {estimate.production_manager || '—'}
            </Text>
          </Flex>
        )}

        {/* Sales Person (dropdown from settings) */}
        {editingSalesPerson ? (
          <div style={{ marginBottom: 'var(--mantine-spacing-md)' }}>
            <Flex justify="space-between" align="center" gap="sm" mb="xs">
              <Text size="sm" fw={500} c="dimmed">
                Sales Person:
              </Text>
              <Select
                data={[
                  ...teamConfig.salesPeople.map((name) => ({ value: name, label: name })),
                  ...(selectedSalesPerson && !teamConfig.salesPeople.includes(selectedSalesPerson)
                    ? [{ value: selectedSalesPerson, label: selectedSalesPerson }]
                    : []),
                ]}
                value={selectedSalesPerson}
                onChange={async (value) => {
                  setSelectedSalesPerson(value);
                  if (savingSalesPerson) return;
                  setSavingSalesPerson(true);
                  try {
                    await updateSalesPerson(value);
                    setEditingSalesPerson(false);
                  } finally {
                    setSavingSalesPerson(false);
                  }
                }}
                placeholder="Select sales person"
                clearable
                style={{ flex: 1, maxWidth: '200px' }}
                size="sm"
                disabled={loadingTeamConfig || savingSalesPerson}
              />
            </Flex>
            <Flex gap="xs" justify="flex-end">
              <ActionIcon
                color="red"
                variant="light"
                onClick={() => {
                  setSelectedSalesPerson(estimate.sales_person || null);
                  setEditingSalesPerson(false);
                }}
                disabled={savingSalesPerson}
                size="lg"
              >
                <IconX size={18} />
              </ActionIcon>
            </Flex>
          </div>
        ) : (
          <Flex justify="space-between" align="center" gap="sm" style={{ marginBottom: 'var(--mantine-spacing-md)' }}>
            <Text size="sm" fw={500} c="dimmed">
              Sales Person:
            </Text>
            <Text
              size="sm"
              style={{ cursor: 'pointer', textAlign: 'right', flex: 1, maxWidth: '200px' }}
              onClick={() => {
                setSelectedSalesPerson(estimate.sales_person || null);
                setEditingSalesPerson(true);
              }}
              c={estimate.sales_person ? 'dark' : 'dimmed'}
            >
              {estimate.sales_person || '—'}
            </Text>
          </Flex>
        )}

        {/* Actual Hours */}
        <EditableField
          label="Actual Hours"
          value={estimate.actual_hours}
          onSave={updateActualHours}
          type="number"
          placeholder="Enter actual hours"
        />

        {/* Scheduled Date - Only show for projects */}
        {estimate.is_project && (
          editingScheduledDate ? (
            <div style={{ marginBottom: 'var(--mantine-spacing-md)' }}>
              <Flex justify="space-between" align="center" gap="sm" mb="xs">
                <Text size="sm" fw={500} c="dimmed">
                  Scheduled Date:
                </Text>
                <DatePickerInput
                  value={selectedScheduledDate}
                  onChange={setSelectedScheduledDate}
                  placeholder="Select date"
                  style={{ flex: 1, maxWidth: '200px' }}
                  size="sm"
                  clearable
                  autoFocus
                />
              </Flex>
              <Flex gap="xs" justify="flex-end">
                <ActionIcon
                  color="green"
                  variant="light"
                  onClick={() => updateScheduledDate(selectedScheduledDate)}
                  loading={savingScheduledDate}
                  size="lg"
                >
                  <IconCheck size={18} />
                </ActionIcon>
                <ActionIcon
                  color="red"
                  variant="light"
                  onClick={handleScheduledDateCancel}
                  disabled={savingScheduledDate}
                  size="lg"
                >
                  <IconX size={18} />
                </ActionIcon>
              </Flex>
            </div>
          ) : (
            <Flex justify="space-between" align="center" gap="sm" style={{ marginBottom: 'var(--mantine-spacing-md)' }}>
              <Text size="sm" fw={500} c="dimmed">
                Scheduled Date:
              </Text>
              <Text
                size="sm"
                style={{ cursor: 'pointer', textAlign: 'right', flex: 1, maxWidth: '200px' }}
                onClick={handleScheduledDateClick}
                c={estimate.scheduled_date ? 'dark' : 'dimmed'}
              >
                {estimate.scheduled_date
                  ? new Date(estimate.scheduled_date).toLocaleDateString()
                  : '—'}
              </Text>
            </Flex>
          )
        )}

        {/* QuickBooks Customer - Only show if QuickBooks is connected */}
        {quickbooksConnected && (
          <Flex justify="space-between" align="center" gap="sm" style={{ marginBottom: 'var(--mantine-spacing-md)' }}>
            <Text size="sm" fw={500} c="dimmed">
              QuickBooks Customer:
            </Text>
            <Text
              size="sm"
              style={{ cursor: 'pointer', textAlign: 'right', flex: 1, maxWidth: '200px' }}
              onClick={() => {
                setSelectedCustomerId(estimate.quickbooks_customer_id || null);
                setShowCustomerModal(true);
              }}
              c={estimate.quickbooks_customer_id ? 'dark' : 'dimmed'}
            >
              {getCurrentCustomerName()}
            </Text>
          </Flex>
        )}
      </Flex>
      {client && (
        <FollowUpSchedulingModal
          opened={showFollowUpModal}
          onClose={() => setShowFollowUpModal(false)}
          onSuccess={handleFollowUpModalSuccess}
          estimate={estimate}
          client={client}
        />
      )}

      {/* Set check-in date modal */}
      <Modal
        title="Set check-in date"
        opened={showCheckInDateModal}
        centered
        onClose={() => {
          setShowCheckInDateModal(false);
          setCheckInDate(null);
        }}
      >
        <Stack gap="md">
          <DatePickerInput
            label="Check-in date"
            placeholder="Pick date"
            value={checkInDate}
            onChange={setCheckInDate}
            minDate={new Date()}
          />
          <Group justify="flex-end" gap="xs">
            <Button
              variant="default"
              onClick={() => {
                setShowCheckInDateModal(false);
                setCheckInDate(null);
              }}
            >
              Cancel
            </Button>
            <Button
              variant="filled"
              leftSection={<IconMessageCircle size={14} />}
              loading={savingCheckInDate}
              onClick={handleSetCheckInDate}
              disabled={!checkInDate}
            >
              Set check-in date
            </Button>
          </Group>
        </Stack>
      </Modal>

      <CollectPaymentModal
        opened={showBillingPaymentModal}
        onClose={() => setShowBillingPaymentModal(false)}
        estimateId={estimateID}
      />

      {/* QuickBooks Customer Selection Modal */}
      <Modal
        opened={showCustomerModal}
        onClose={() => setShowCustomerModal(false)}
        title="Select QuickBooks Customer"
        size="md"
      >
        <Flex direction="column" gap="md">
          {loadingCustomers ? (
            <Skeleton height={200} />
          ) : (
            <>
              <Select
                label="QuickBooks Customer"
                placeholder="Select a customer"
                data={quickbooksCustomers.map((customer) => ({
                  value: customer.id,
                  label: `${customer.name}${customer.email ? ` (${customer.email})` : ''}`,
                }))}
                value={selectedCustomerId}
                onChange={setSelectedCustomerId}
                searchable
                clearable
              />
              <Flex gap="md" justify="flex-end">
                <Button
                  variant="outline"
                  onClick={() => setShowCustomerModal(false)}
                  disabled={savingCustomer}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleUpdateQuickBooksCustomer}
                  loading={savingCustomer}
                >
                  Save
                </Button>
              </Flex>
            </>
          )}
        </Flex>
      </Modal>
    </Paper>
  );
}
