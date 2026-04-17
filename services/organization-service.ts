/**
 * Organization Service - Handles API calls for organization-related endpoints
 */

import baseAxios from '@/lib/baseAxios';
import type { EventSimpleResponse } from './event-types';

const API_BASE = process.env.EXPO_PUBLIC_API_URL || 'https://api.hvh.okne.site';


export type EOrgType =
    | 'SOCIAL_FUND'
    | 'CHARITY_FUND'
    | 'NGO'
    | 'SOCIAL_ORGANIZATION'
    | 'GOVERNMENT_AGENCY_BASED'
    | 'PUBLIC_SERVICE_UNIT_BASED'
    | 'MASS_ORGANIZATION'
    | 'UNIVERSITY_BASED'
    | 'GENERAL_EDUCATION_BASED'
    | 'STATE_OWNED_ENTERPRISE_BASED'
    | 'PRIVATE_ENTERPRISE_BASED'
    | 'SELF_GOVERNED_ORGANIZATION'
    | 'OTHER';

export const ORG_TYPE_LABELS: Record<EOrgType, string> = {
    SOCIAL_FUND: 'Quỹ xã hội',
    CHARITY_FUND: 'Quỹ từ thiện',
    NGO: 'Tổ chức phi chính phủ',
    SOCIAL_ORGANIZATION: 'Tổ chức xã hội',
    GOVERNMENT_AGENCY_BASED: 'Được thành lập trong cơ quan chính quyền',
    PUBLIC_SERVICE_UNIT_BASED: 'Được thành lập trong đơn vị sự nghiệp công lập',
    MASS_ORGANIZATION: 'Tổ chức quần chúng (phường, xã, làng)',
    UNIVERSITY_BASED: 'Được thành lập trong trường đại học',
    GENERAL_EDUCATION_BASED: 'Được thành lập trong cơ sở giáo dục phổ thông',
    STATE_OWNED_ENTERPRISE_BASED: 'Được thành lập trong doanh nghiệp nhà nước',
    PRIVATE_ENTERPRISE_BASED: 'Được thành lập trong doanh nghiệp tư nhân',
    SELF_GOVERNED_ORGANIZATION: 'Tổ chức xã hội tự quản',
    OTHER: 'Khác',
};

export const ORG_TYPE_SHORT_LABELS: Record<EOrgType, string> = {
    SOCIAL_FUND: 'Quỹ xã hội',
    CHARITY_FUND: 'Quỹ từ thiện',
    NGO: 'Phi chính phủ',
    SOCIAL_ORGANIZATION: 'Tổ chức xã hội',
    GOVERNMENT_AGENCY_BASED: 'Cơ quan chính quyền',
    PUBLIC_SERVICE_UNIT_BASED: 'Đơn vị sự nghiệp',
    MASS_ORGANIZATION: 'Tổ chức quần chúng',
    UNIVERSITY_BASED: 'Trường đại học',
    GENERAL_EDUCATION_BASED: 'Giáo dục phổ thông',
    STATE_OWNED_ENTERPRISE_BASED: 'Doanh nghiệp nhà nước',
    PRIVATE_ENTERPRISE_BASED: 'Doanh nghiệp tư nhân',
    SELF_GOVERNED_ORGANIZATION: 'Tổ chức tự quản',
    OTHER: 'Khác',
};

export interface OrganizationSimpleResponse {
    id: string;
    name: string;
    orgType: EOrgType | null;
    numberOfHostedEvents: number;
    creditHour: number;
}

export interface OrgListResponse {
    content: OrganizationSimpleResponse[];
    // Spring Page<T> serializes pagination at the top level (not nested under 'page')
    totalPages: number;
    totalElements: number;
    number: number;     // current page index (0-based)
    size: number;
    last: boolean;
}

export interface OrganizationDetailsResponse {
    id: string;
    name: string;
    dhaRegistered: boolean | null;
    orgType: EOrgType | null;
    orgIntroduction: string | null;
    avatarImageUrl: string | null;
    coverImageUrl: string | null;
    createdAt: string | null;
    managerId: string | null;
    managerEmail: string | null;
    managerPhone: string | null;
    totalHonorHours: number | null;
    note: string | null;
}

export interface GetOrgsParams {
    pageNumber?: number;
    pageSize?: number;
    name?: string;
    orgTypes?: EOrgType[];
}

export interface OrgEventsResponse {
    content: EventSimpleResponse[];
    totalPages: number;
    totalElements: number;
    number: number;
    size: number;
    last: boolean;
}

export interface GetOrgEventsParams {
    pageNumber?: number;
    pageSize?: number;
    name?: string;
}


/**
 * GET /api/v1/organizations
 * Public endpoint — no auth required.
 */
export const getOrganizations = async (params: GetOrgsParams = {}): Promise<OrgListResponse> => {
    const query = new URLSearchParams();
    query.append('pageNumber', String(params.pageNumber ?? 0));
    query.append('pageSize', String(params.pageSize ?? 10));
    if (params.name) query.append('name', params.name);
    params.orgTypes?.forEach(t => query.append('orgTypes', t));

    const url = `/api/v1/organizations?${query.toString()}`;
    const res = await baseAxios.get<OrgListResponse>(url);
    return res.data;
};

/**
 * GET /api/v1/organizations/:id
 * Public endpoint — no auth required.
 */
export const getOrganizationDetails = async (orgId: string): Promise<OrganizationDetailsResponse> => {
    const url = `/api/v1/organizations/${orgId}`;
    const res = await baseAxios.get<OrganizationDetailsResponse>(url);
    return res.data;
};

/**
 * GET /api/v1/events/{organizationId}/running
 * Public endpoint — returns paginated events hosted by the given organization.
 */
export const getEventsByOrg = async (
    orgId: string,
    params: GetOrgEventsParams = {},
): Promise<OrgEventsResponse> => {
    const query = new URLSearchParams();
    query.append('pageNumber', String(params.pageNumber ?? 0));
    query.append('pageSize', String(params.pageSize ?? 10));
    if (params.name) query.append('name', params.name);
    const url = `/api/v1/events/${orgId}/running?${query.toString()}`;
    const res = await baseAxios.get<OrgEventsResponse>(url);
    return res.data;
};
