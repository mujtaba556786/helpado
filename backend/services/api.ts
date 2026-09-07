
import { User, Service, Review, Booking, DashboardStats, UserStatus } from '../types';

// Live data only — the panel shows real marketplace content or an empty state.
export const EMPTY_STATS: DashboardStats = {
    totalUsers: 0,
    adImpressions: 0,
    adClicks: 0,
    pendingInquiries: 0,
    averageRating: 0,
    engagementData: [],
    categoryData: []
};

// Same-origin: in production the panel is served by Express under /admin and the
// API lives at /api on the same host; in dev the Vite server proxies /api → :3000.
const BASE_URL = '/api';

// Admin token is NOT hardcoded anymore. It is returned by POST /api/auth/admin-login
// after a correct password and kept in memory + sessionStorage for admin API calls.
let adminToken = (typeof sessionStorage !== 'undefined' && sessionStorage.getItem('adminToken')) || '';
function setAdminToken(t: string) {
    adminToken = t || '';
    try { sessionStorage.setItem('adminToken', adminToken); } catch (e) { /* ignore */ }
}
export function isAdminAuthed(): boolean { return !!adminToken; }
export function adminLogout(): void { setAdminToken(''); }

function capitalizeFirst(s: string): string {
    return s ? s.charAt(0).toUpperCase() + s.slice(1).toLowerCase() : s;
}

export const apiService = {
    // Admin password login. On success the server returns the admin token, which we
    // store for subsequent x-admin-token calls. No mock/no-password shortcut.
    async adminLogin(password: string): Promise<boolean> {
        try {
            const res = await fetch(`${BASE_URL}/auth/admin-login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ password })
            });
            if (res.ok) {
                const data = await res.json();
                if (data.success && data.token) { setAdminToken(data.token); return true; }
            }
        } catch (e) {
            console.warn('Admin login request failed', e);
        }
        return false;
    },

    async createUser(userData: Partial<User>): Promise<User | null> {
        try {
            const res = await fetch(`${BASE_URL}/users`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(userData)
            });
            if (res.ok) return await res.json();
        } catch (e) {
            console.warn('User creation request failed', e);
        }
        return null;
    },

    async updateUser(id: string, userData: Partial<User>): Promise<boolean> {
        try {
            const res = await fetch(`${BASE_URL}/users/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', 'x-admin-token': adminToken },
                body: JSON.stringify(userData)
            });
            return res.ok;
        } catch {
            return false;
        }
    },

    async completeOnboarding(id: string, name: string, role: string, bio?: string) {
        try {
            const res = await fetch(`${BASE_URL}/users/${id}/onboard`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', 'x-admin-token': adminToken },
                body: JSON.stringify({ name, role, bio })
            });
            if (res.ok) return await res.json();
        } catch (e) {
            console.warn("Backend unreachable.");
        }
        return { success: false };
    },

    async approveUser(id: string) {
        try {
            await fetch(`${BASE_URL}/users/${id}/approve`, {
                method: 'PUT',
                headers: { 'x-admin-token': adminToken }
            });
            return true;
        } catch { return false; }
    },

    async updateUserStatus(id: string, status: UserStatus) {
        try {
            await fetch(`${BASE_URL}/users/${id}/status`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', 'x-admin-token': adminToken },
                body: JSON.stringify({ status })
            });
            return true;
        } catch { return false; }
    },

    async moderateReview(id: string, status: 'Approved' | 'Rejected') {
        try {
            const action = status === 'Approved' ? 'approve' : 'reject';
            const res = await fetch(`${BASE_URL}/admin/reviews/${id}/${action}`, {
                method: 'PUT',
                headers: { 'x-admin-token': adminToken }
            });
            return res.ok;
        } catch {
            return false;
        }
    },

    async deleteReview(id: string): Promise<boolean> {
        try {
            const res = await fetch(`${BASE_URL}/admin/reviews/${id}`, {
                method: 'DELETE',
                headers: { 'x-admin-token': adminToken }
            });
            return res.ok;
        } catch {
            return false;
        }
    },

    async updateProfile(id: string, data: { name: string, bio: string, avatar: string }) {
        try {
            await fetch(`${BASE_URL}/users/${id}/profile`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', 'x-admin-token': adminToken },
                body: JSON.stringify(data)
            });
            return true;
        } catch { return false; }
    },

    async createService(service: Service) {
        try {
            await fetch(`${BASE_URL}/services`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'x-admin-token': adminToken },
                body: JSON.stringify(service)
            });
            return true;
        } catch { return false; }
    },

    async updateService(id: string, data: Partial<Service>): Promise<boolean> {
        try {
            const res = await fetch(`${BASE_URL}/services/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', 'x-admin-token': adminToken },
                body: JSON.stringify(data)
            });
            return res.ok;
        } catch { return false; }
    },

    async deleteService(id: string): Promise<boolean> {
        try {
            const res = await fetch(`${BASE_URL}/services/${id}`, {
                method: 'DELETE',
                headers: { 'x-admin-token': adminToken }
            });
            return res.ok;
        } catch { return false; }
    },

    async getUsers(): Promise<User[]> {
        try {
            const res = await fetch(`${BASE_URL}/users`, {
                headers: { 'x-admin-token': adminToken }
            });
            if (res.ok) return await res.json();
        } catch { }
        return [];
    },

    async getHealth(): Promise<boolean> {
        try {
            const res = await fetch(`${BASE_URL}/health`);
            if (!res.ok) return false;
            const data = await res.json();
            return !!data.success;
        } catch { return false; }
    },

    async getStats(): Promise<DashboardStats> {
        try {
            const res = await fetch(`${BASE_URL}/stats`, { headers: { 'x-admin-token': adminToken } });
            if (res.ok) return await res.json();
        } catch { }
        return EMPTY_STATS;
    },

    async getServices(): Promise<Service[]> {
        try {
            const res = await fetch(`${BASE_URL}/services`);
            if (res.ok) return await res.json();
        } catch { }
        return [];
    },

    async getBookings(): Promise<Booking[]> {
        try {
            const res = await fetch(`${BASE_URL}/bookings`, {
                headers: { 'x-admin-token': adminToken }
            });
            if (res.ok) {
                const data = await res.json();
                return Array.isArray(data) ? data.map((b: any) => ({
                    id: b.id,
                    customerId: b.customer_id,
                    customerName: b.customer_name || 'Unknown',
                    providerId: b.provider_id,
                    providerName: b.provider_name || 'Unknown',
                    serviceName: b.service || 'General',
                    date: b.scheduled_date || b.created_at?.split('T')[0] || '',
                    time: b.scheduled_time || '',
                    status: (b.status?.charAt(0).toUpperCase() + b.status?.slice(1)) as any,
                    message: b.message || '',
                    createdAt: b.created_at || '',
                    customerAvatar: b.customer_avatar || '',
                    providerAvatar: b.provider_avatar || ''
                })) : [];
            }
        } catch { }
        // Real data only — no mock fallback in the live panel.
        return [];
    },

    // ── Trust & Safety ────────────────────────────────────────────────────────

    async getReports(status?: string): Promise<any[]> {
        try {
            const url = status
                ? `${BASE_URL}/admin/reports?status=${status}&limit=50`
                : `${BASE_URL}/admin/reports?limit=50`;
            const res = await fetch(url, { headers: { 'x-admin-token': adminToken } });
            if (res.ok) {
                const data = await res.json();
                return data.reports || [];
            }
        } catch { }
        return [];
    },

    async actionReport(id: string, status: 'reviewed' | 'actioned'): Promise<boolean> {
        try {
            const res = await fetch(`${BASE_URL}/admin/reports/${id}/action`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', 'x-admin-token': adminToken },
                body: JSON.stringify({ status })
            });
            return res.ok;
        } catch { return false; }
    },

    async getFlaggedUsers(): Promise<any[]> {
        try {
            const res = await fetch(`${BASE_URL}/admin/flagged-users`, {
                headers: { 'x-admin-token': adminToken }
            });
            if (res.ok) {
                const data = await res.json();
                return data.users || [];
            }
        } catch { }
        return [];
    },

    async getBlocks(): Promise<any[]> {
        try {
            const res = await fetch(`${BASE_URL}/admin/blocks`, {
                headers: { 'x-admin-token': adminToken }
            });
            if (res.ok) {
                const data = await res.json();
                return data.blocks || [];
            }
        } catch { }
        return [];
    },

    async removeBlock(id: string): Promise<boolean> {
        try {
            const res = await fetch(`${BASE_URL}/admin/blocks/${id}`, {
                method: 'DELETE',
                headers: { 'x-admin-token': adminToken }
            });
            return res.ok;
        } catch { return false; }
    },

    async adminActionUser(id: string, action: 'warn' | 'restrict' | 'ban' | 'clear'): Promise<boolean> {
        try {
            const res = await fetch(`${BASE_URL}/admin/users/${id}/action`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', 'x-admin-token': adminToken },
                body: JSON.stringify({ action })
            });
            return res.ok;
        } catch { return false; }
    },

    async getReviews(): Promise<Review[]> {
        try {
            const res = await fetch(`${BASE_URL}/admin/reviews?status=all`, {
                headers: { 'x-admin-token': adminToken }
            });
            if (res.ok) {
                const data = await res.json();
                if (data.success && Array.isArray(data.reviews)) {
                    return data.reviews.map((r: any) => ({
                        id: String(r.id),
                        customerName: r.reviewer_name || 'Anonymous',
                        providerId: r.provider_id ? String(r.provider_id) : undefined,
                        rating: r.stars || 0,
                        comment: r.comment || '',
                        serviceName: r.provider_name || 'Unknown',
                        status: capitalizeFirst(r.status) as Review['status'],
                        date: new Date(r.created_at).toLocaleDateString('en-US', {
                            month: 'short', day: 'numeric', year: 'numeric'
                        })
                    }));
                }
            }
        } catch { }
        return [];
    }
};
