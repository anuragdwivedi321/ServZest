const API_URL = '';

const getHeaders = () => {
  return {
    'Content-Type': 'application/json',
  };
};

export const api = {
  paymentQr: (id: string) => request(`/api/bookings/${id}/payment-qr`, 'POST'),
  saveWorkerUpi: (data: { upiId: string; upiName: string }) => request('/api/worker/upi', 'PUT', data),
  confirmReceipt: (id: string, action: 'CONFIRM' | 'REJECT') => request(`/api/worker/bookings/${id}/receipt`, 'POST', { action }),
  reportComplaint: (id: string, issue: string) => request(`/api/bookings/${id}/complaint`, 'POST', { issue }),
  createSupportTicket: (data: any) => request('/api/support', 'POST', data),
  getSupportTickets: () => request('/api/support'),
  updateSupportTicket: (id: string, status: string, resolution: string) => request(`/api/support/${id}`, 'PATCH', { status, resolution }),
  getAdminCustomers: () => request('/api/admin/customers'),
  // Auth
  sendOtp: async (phone: string) => {
    try {
      const res = await fetchApi(`${API_URL}/api/auth/send-otp`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ phone }),
      });
      return await res.json();
    } catch (err: any) {
      console.error('[API] sendOtp error:', err);
      return { success: false, message: err?.message || 'Failed to connect to server for OTP' };
    }
  },

  verifyOtp: async (phone: string, otp: string, name?: string, role?: string, consentAccepted?: boolean) => {
    try {
      const res = await fetchApi(`${API_URL}/api/auth/verify-otp`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ phone, otp, name, role, consentAccepted }),
      });
      return await res.json();
    } catch (err: any) {
      console.error('[API] verifyOtp error:', err);
      return { success: false, message: err?.message || 'Failed to connect to server for verification' };
    }
  },

  exportMyData: async () => fetchApi('/api/auth/data-export'),
  deleteMyAccount: () => request('/api/auth/account', 'DELETE', { confirmation: 'DELETE' }),

  // Services
  getServices: async () => {
    try {
      const res = await fetchApi(`${API_URL}/api/services`);
      if (!res.ok) {
        return { success: false, message: `Server returned error status ${res.status}` };
      }
      return await res.json();
    } catch (err: any) {
      console.error('[API] getServices error:', err);
      return { success: false, message: err?.message || 'Could not connect to server' };
    }
  },

  getServiceBySlug: async (slug: string) => {
    const res = await fetchApi(`${API_URL}/api/services/${slug}`);
    return res.json();
  },

  // Bookings
  estimatePrice: async (serviceId: string, options: { itemIds?: string[]; scheduledAt?: string; couponCode?: string } = {}, signal?: AbortSignal) => {
    const res = await fetchApi(`${API_URL}/api/bookings/estimate`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ serviceId, ...options }),
      signal,
    });
    return res.json();
  },

  createBooking: async (data: { serviceId: string; pickupLat: number; pickupLng: number; pickupAddress: string; itemIds: string[]; scheduledAt?: string; couponCode?: string; problemDescription?: string; locationConfirmed: true; requestKey: string; acceptedTotal: number }) => {
    const res = await fetchApi(`${API_URL}/api/bookings`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data),
    });
    return res.json();
  },

  getBooking: async (id: string) => {
    const res = await fetchApi(`${API_URL}/api/bookings/${id}`, {
      headers: getHeaders(),
    });
    return res.json();
  },

  cancelBooking: async (id: string, reason?: string) => {
    const res = await fetchApi(`${API_URL}/api/bookings/${id}/cancel`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ reason }),
    });
    return res.json();
  },

  approveItem: async (bookingId: string, itemId: string, action: 'APPROVE' | 'REJECT') => {
    const res = await fetchApi(`${API_URL}/api/bookings/${bookingId}/approve-item`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ itemId, action }),
    });
    return res.json();
  },

  payBill: async (bookingId: string, method: 'CASH' | 'UPI', transactionRef?: string) => {
    const res = await fetchApi(`${API_URL}/api/bookings/${bookingId}/pay`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ method, transactionRef }),
    });
    return res.json();
  },

  rateBooking: async (bookingId: string, stars: number, comment?: string) => {
    const res = await fetchApi(`${API_URL}/api/bookings/${bookingId}/rate`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ stars, comment }),
    });
    return res.json();
  },

  getMyBookings: async () => {
    const res = await fetchApi(`${API_URL}/api/bookings/my`, {
      headers: getHeaders(),
    });
    return res.json();
  },

  // Worker
  getWorkerProfile: async () => {
    const res = await fetchApi(`${API_URL}/api/worker/profile`, {
      headers: getHeaders(),
    });
    return res.json();
  },

  submitWorkerKyc: async (data: any) => {
    const res = await fetchApi(`${API_URL}/api/worker/kyc`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data),
    });
    return res.json();
  },

  toggleWorkerOnline: async (isOnline: boolean) => {
    const res = await fetchApi(`${API_URL}/api/worker/toggle-online`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ isOnline }),
    });
    return res.json();
  },

  acceptBooking: async (bookingId: string) => {
    const res = await fetchApi(`${API_URL}/api/worker/bookings/${bookingId}/accept`, {
      method: 'POST',
      headers: getHeaders(),
    });
    return res.json();
  },

  rejectBooking: async (bookingId: string) => {
    const res = await fetchApi(`${API_URL}/api/worker/bookings/${bookingId}/reject`, {
      method: 'POST',
      headers: getHeaders(),
    });
    return res.json();
  },

  updateWorkerStatus: async (bookingId: string, status: 'EN_ROUTE' | 'ARRIVED') => {
    const res = await fetchApi(`${API_URL}/api/worker/bookings/${bookingId}/status`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ status }),
    });
    return res.json();
  },

  startBooking: async (bookingId: string, otp: string) => {
    const res = await fetchApi(`${API_URL}/api/worker/bookings/${bookingId}/start`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ otp }),
    });
    return res.json();
  },

  addBillItem: async (bookingId: string, data: any) => {
    const res = await fetchApi(`${API_URL}/api/worker/bookings/${bookingId}/add-item`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data),
    });
    return res.json();
  },

  completeBooking: async (bookingId: string) => {
    const res = await fetchApi(`${API_URL}/api/worker/bookings/${bookingId}/complete`, {
      method: 'POST',
      headers: getHeaders(),
    });
    return res.json();
  },

  getWorkerEarnings: async () => {
    const res = await fetchApi(`${API_URL}/api/worker/earnings`, {
      headers: getHeaders(),
    });
    return res.json();
  },
  getWorkerSubscription: () => request('/api/worker/subscription'),

  // Admin
  getAdminMetrics: async () => {
    const res = await fetchApi(`${API_URL}/api/admin/metrics`, {
      headers: getHeaders(),
    });
    return res.json();
  },

  getAdminWorkers: async () => {
    const res = await fetchApi(`${API_URL}/api/admin/workers`, {
      headers: getHeaders(),
    });
    return res.json();
  },

  updateWorkerKyc: async (workerId: string, status: string) => {
    const res = await fetchApi(`${API_URL}/api/admin/workers/${workerId}/kyc`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ status }),
    });
    return res.json();
  },

  getLiveWorkers: async () => {
    const res = await fetchApi(`${API_URL}/api/admin/live-workers`, {
      headers: getHeaders(),
    });
    return res.json();
  },

  getAdminSettings: async () => {
    const res = await fetchApi(`${API_URL}/api/admin/settings`, {
      headers: getHeaders(),
    });
    return res.json();
  },

  updateAdminSettings: async (settings: Record<string, any>) => {
    const res = await fetchApi(`${API_URL}/api/admin/settings`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify({ settings }),
    });
    return res.json();
  },

  getAllBookings: async () => {
    const res = await fetchApi(`${API_URL}/api/admin/bookings`, {
      headers: getHeaders(),
    });
    return res.json();
  },

  adminCancelBooking: async (bookingId: string, reason?: string) => {
    const res = await fetchApi(`${API_URL}/api/admin/bookings/${bookingId}/cancel`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ reason }),
    });
    return res.json();
  },

  getAdminComplaints: async () => {
    const res = await fetchApi(`${API_URL}/api/admin/complaints`, {
      headers: getHeaders(),
    });
    return res.json();
  },

  updateComplaintStatus: async (id: string, status: 'OPEN' | 'RESOLVED') => {
    const res = await fetchApi(`${API_URL}/api/admin/complaints/${id}`, {
      method: 'PATCH',
      headers: getHeaders(),
      body: JSON.stringify({ status }),
    });
    return res.json();
  },

  getAdminServices: async () => {
    const res = await fetchApi(`${API_URL}/api/admin/services`, {
      headers: getHeaders(),
    });
    return res.json();
  },

  updateAdminService: async (id: string, data: { visitCharge?: number; items?: Array<{ id: string; minPrice?: number; maxPrice?: number }> }) => {
    const res = await fetchApi(`${API_URL}/api/admin/services/${id}`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(data),
    });
    return res.json();
  },
};

async function request(path: string, method = 'GET', body?: unknown) {
  const response = await fetchApi(`${API_URL}${path}`, { method, headers: getHeaders(), ...(body === undefined ? {} : { body: JSON.stringify(body) }), signal: AbortSignal.timeout(20000) });
  return response.json();
}

// Bound network waits consistently, including error responses from proxies/rate limits.
async function fetchApi(url: string, options: RequestInit = {}) {
  const response = await fetch(url, { ...options, credentials: 'same-origin', signal: options.signal || AbortSignal.timeout(20000) });
  if (response.status === 401 && typeof window !== 'undefined') {
    window.dispatchEvent(new Event('servzest:auth-expired'));
  }
  if (!response.headers.get('content-type')?.includes('application/json')) {
    return new Response(JSON.stringify({ success: false, message: response.status === 429 ? 'Too many requests. Please wait and try again.' : 'Server is temporarily unavailable. Please retry.' }), { status: response.ok ? 502 : response.status, headers: { 'Content-Type': 'application/json' } });
  }
  return response;
}
