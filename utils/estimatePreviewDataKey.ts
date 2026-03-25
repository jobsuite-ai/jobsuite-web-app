import { EstimateLineItem } from '@/components/EstimateDetails/estimate/LineItem';
import { ContractorClient, Estimate, EstimateResource } from '@/components/Global/model';

/**
 * Stable string key for preview/template rebuilds. Redux often replaces `estimate` with a new
 * object reference without changing content; depending on `estimate` in useEffect causes
 * repeated preview reloads. Use this key instead.
 */
export function getEstimatePreviewDataKey(
    estimate: Estimate,
    lineItems: EstimateLineItem[],
    imageResources: EstimateResource[],
    client?: ContractorClient
): string {
    const lineKey = lineItems
        .map(
            (i) =>
                `${i.id ?? ''}:${i.title ?? ''}:${i.description ?? ''}:${i.hours ?? ''}:${i.rate ?? ''}`
        )
        .join('|');
    const imgKey = imageResources
        .map(
            (r) =>
                `${r.id ?? ''}:${r.s3_bucket ?? ''}:${r.s3_key ?? ''}:${r.upload_status ?? ''}:${r.resource_type ?? ''}`
        )
        .join('|');
    const e = estimate;
    const c = client;
    const clientKey = c
        ? [
              c.id ?? '',
              c.name ?? '',
              c.email ?? '',
              c.phone_number ?? '',
              c.address_street ?? '',
              c.address_city ?? '',
              c.address_state ?? '',
              c.address_zipcode ?? '',
          ].join('|')
        : '';
    return [
        e.id,
        e.transcription_summary ?? '',
        e.discount_reason ?? '',
        String(e.discount_percentage ?? ''),
        String(e.hourly_rate ?? ''),
        e.address_city ?? e.city ?? '',
        e.address_state ?? e.state ?? '',
        e.address_street ?? e.client_address ?? '',
        e.cover_photo_resource_id ?? '',
        clientKey,
        lineKey,
        imgKey,
    ].join('::');
}
