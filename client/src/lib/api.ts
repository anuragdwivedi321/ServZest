const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

const getHeaders = () => {
  const token = typeof window !== 'undefined' ? localStorage.getItem('quickkaam_token') : null;
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
};

export const api = {
  // Auth
  sendOtp: async (phone: string) => {
    const res = await fetch(`${API_URL}/api/auth/send-otp`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ phone }),
    });
    return res.json();
  },

  verifyOtp: async (phone: string, otp: string, name?: string, role?: string) => {
    const res = await fetch(`${API_URL}/api/auth/verify-otp`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ phone, otp, name, role }),
    });
    return res.json();
  },

  // Services
  getServices: async () => {
    const res = await fetch(`${API_URL}/api/services`);
    return res.json();
  },

  getServiceBySlug: async (slug: string) => {
    const res = await fetch(`${API_URL}/api/services/${slug}`);
    return res.json();
  },

  // Bookings
  estimatePrice: async (serviceId: string, serviceItemsTotal?: number, partsTotal?: number) => {
    const res = await fetch(`${API_URL}/api/bookings/estimate`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ serviceId, serviceItemsTotal, partsTotal }),
    });
    return res.json();
  },

  createBooking: async (data: { serviceId: string; pickupLat: number; pickupLng: number; pickupAddress: string }) => {
    const res = await fetch(`${API_URL}/api/bookings`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data),
    });
    return res.json();
  },

  getBooking: async (id: string) => {
    const res = await fetch(`${API_URL}/api/bookings/${id}`, {
      headers: getHeaders(),
    });
    return res.json();
  },

  cancelBooking: async (id: string, reason?: string) => {
    const res = await fetch(`${API_URL}/api/bookings/${id}/cancel`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ reason }),
    });
    return res.json();
  },

  approveItem: async (bookingId: string, itemId: string, action: 'APPROVE' | 'REJECT') => {
    const res = await fetch(`${API_URL}/api/bookings/${bookingId}/approve-item`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ itemId, action }),
    });
    return res.json();
  },

  payBill: async (bookingId: string, method: 'CASH' | 'UPI', transactionRef?: string) => {
    const res = await fetch(`${API_URL}/api/bookings/${bookingId}/pay`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ method, transactionRef }),
    });
    return res.json();
  },

  rateBooking: async (bookingId: string, stars: number, comment?: string) => {
    const res = await fetch(`${API_URL}/api/bookings/${bookingId}/rate`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ stars, comment }),
    });
    return res.json();
  },

  getMyBookings: async () => {
    const res = await fetch(`${API_URL}/api/bookings/my`, {
      headers: getHeaders(),
    });
    return res.json();
  },

  // Worker
  getWorkerProfile: async () => {
    const res = await fetch(`${API_URL}/api/worker/profile`, {
      headers: getHeaders(),
    });
    return res.json();
  },

  submitWorkerKyc: async (data: any) => {
    const res = await fetch(`${API_URL}/api/worker/kyc`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data),
    });
    return res.json();
  },

  toggleWorkerOnline: async (isOnline: boolean) => {
    const res = await fetch(`${API_URL}/api/worker/toggle-online`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ isOnline }),
    });
    return res.json();
  },

  acceptBooking: async (bookingId: string) => {
    const res = await fetch(`${API_URL}/api/worker/bookings/${bookingId}/accept`, {
      method: 'POST',
      headers: getHeaders(),
    });
    return res.json();
  },

  rejectBooking: async (bookingId: string) => {
    const res = await fetch(`${API_URL}/api/worker/bookings/${bookingId}/reject`, {
      method: 'POST',
      headers: getHeaders(),
    });
    return res.json();
  },

  updateWorkerStatus: async (bookingId: string, status: 'EN_ROUTE' | 'ARRIVED') => {
    const res = await fetch(`${API_URL}/api/worker/bookings/${bookingId}/status`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ status }),
    });
    return res.json();
  },

  startBooking: async (bookingId: string, otp: string) => {
    const res = await fetch(`${API_URL}/api/worker/bookings/${bookingId}/start`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ otp }),
    });
    return res.json();
  },

  addBillItem: async (bookingId: string, data: any) => {
    const res = await fetch(`${API_URL}/api/worker/bookings/${bookingId}/add-item`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data),
    });
    return res.json();
  },

  completeBooking: async (bookingId: string) => {
    const res = await fetch(`${API_URL}/api/worker/bookings/${bookingId}/complete`, {
      method: 'POST',
      headers: getHeaders(),
    });
    return res.json();
  },

  getWorkerEarnings: async () => {
    const res = await fetch(`${API_URL}/api/worker/earnings`, {
      headers: getHeaders(),
    });
    return res.json();
  },

  // Admin
  getAdminMetrics: async () => {
    const res = await fetch(`${API_URL}/api/admin/metrics`, {
      headers: getHeaders(),
    });
    return res.json();
  },

  getAdminWorkers: async () => {
    const res = await fetch(`${API_URL}/api/admin/workers`, {
      headers: getHeaders(),
    });
    return res.json();
  },

  updateWorkerKyc: async (workerId: string, status: string) => {
    const res = await fetch(`${API_URL}/api/admin/workers/${workerId}/kyc`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ status }),
    });
    return res.json();
  },

  getLiveWorkers: async () => {
    const res = await fetch(`${API_URL}/api/admin/live-workers`, {
      headers: getHeaders(),
    });
    return res.json();
  },

  getAdminSettings: async () => {
    const res = await fetch(`${API_URL}/api/admin/settings`, {
      headers: getHeaders(),
    });
    return res.json();
  },

  updateAdminSettings: async (settings: Record<string, any>) => {
    const res = await fetch(`${API_URL}/api/admin/settings`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify({ settings }),
    });
    return res.json();
  },

  getAllBookings: async () => {
    const res = await fetch(`${API_URL}/api/admin/bookings`, {
      headers: getHeaders(),
    });
    return res.json();
  },

  adminCancelBooking: async (bookingId: string, reason?: string) => {
    const res = await fetch(`${API_URL}/api/admin/bookings/${bookingId}/cancel`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ reason }),
    });
    return res.json();
  },
};
