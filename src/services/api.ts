const API_BASE_URL = 'http://localhost:5000/api';

interface ApiResponse<T = any> {
  data?: T;
  message?: string;
  error?: {
    message: string;
    status: string;
    statusCode: number;
  };
}

interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination?: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

class ApiService {
  private baseURL: string;
  private token: string | null = null;

  constructor(baseURL: string = API_BASE_URL) {
    this.baseURL = baseURL;
    this.token = localStorage.getItem('token');
  }

  private getHeaders(): HeadersInit {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    return headers;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseURL}${endpoint}`;
    const config: RequestInit = {
      headers: this.getHeaders(),
      ...options,
    };

    try {
      const response = await fetch(url, config);
      const data: ApiResponse<T> = await response.json();

      if (!response.ok) {
        throw new Error(data.error?.message || 'An error occurred');
      }

      return data as T;
    } catch (error) {
      console.error('API request failed:', error);
      throw error;
    }
  }

  // Authentication methods
  async login(email: string, password: string) {
    const response = await this.request<{ user: any; token: string }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });

    this.token = response.token;
    localStorage.setItem('token', response.token);
    return response;
  }

  async register(userData: {
    username: string;
    email: string;
    password: string;
    firstName?: string;
    lastName?: string;
  }) {
    const response = await this.request<{ user: any; token: string }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(userData),
    });

    this.token = response.token;
    localStorage.setItem('token', response.token);
    return response;
  }

  async logout() {
    await this.request('/auth/logout', { method: 'POST' });
    this.token = null;
    localStorage.removeItem('token');
  }

  async getCurrentUser() {
    return this.request<{ user: any }>('/auth/me');
  }

  // Complaint methods
  async getComplaints(params?: {
    status?: string;
    category?: string;
    priority?: string;
    page?: number;
    limit?: number;
  }) {
    const queryParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) {
          queryParams.append(key, value.toString());
        }
      });
    }

    const endpoint = `/complaints${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
    return this.request<PaginatedResponse<any>>(endpoint);
  }

  async getComplaint(id: string) {
    return this.request<{ complaint: any }>(`/complaints/${id}`);
  }

  async createComplaint(complaintData: {
    title: string;
    description: string;
    category: string;
    priority?: string;
    location?: any;
  }) {
    return this.request<{ complaint: any; message: string }>('/complaints', {
      method: 'POST',
      body: JSON.stringify(complaintData),
    });
  }

  async updateComplaint(id: string, updates: Partial<any>) {
    return this.request<{ complaint: any; message: string }>(`/complaints/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
  }

  async deleteComplaint(id: string) {
    return this.request<{ message: string }>(`/complaints/${id}`, {
      method: 'DELETE',
    });
  }

  // Sensor methods
  async getSensors(params?: {
    type?: string;
    status?: string;
    page?: number;
    limit?: number;
  }) {
    const queryParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) {
          queryParams.append(key, value.toString());
        }
      });
    }

    const endpoint = `/sensors${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
    return this.request<PaginatedResponse<any>>(endpoint);
  }

  async getSensor(id: string) {
    return this.request<{ sensor: any }>(`/sensors/${id}`);
  }

  async getSensorData(id: string, limit?: number) {
    const endpoint = `/sensors/${id}/data${limit ? `?limit=${limit}` : ''}`;
    return this.request<any>(endpoint);
  }

  // Feedback methods
  async getFeedback(params?: {
    rating?: number;
    category?: string;
    page?: number;
    limit?: number;
  }) {
    const queryParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) {
          queryParams.append(key, value.toString());
        }
      });
    }

    const endpoint = `/feedback${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
    return this.request<PaginatedResponse<any>>(endpoint);
  }

  async createFeedback(feedbackData: {
    complaintId: string;
    rating: number;
    message: string;
    category?: string;
    isAnonymous?: boolean;
  }) {
    return this.request<{ feedback: any; message: string }>('/feedback', {
      method: 'POST',
      body: JSON.stringify(feedbackData),
    });
  }

  // Admin methods
  async getDashboard() {
    return this.request<any>('/admin/dashboard');
  }

  async getAnalytics(params?: { period?: string; type?: string }) {
    const queryParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) {
          queryParams.append(key, value.toString());
        }
      });
    }

    const endpoint = `/admin/analytics${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
    return this.request<any>(endpoint);
  }

  async getSystemHealth() {
    return this.request<any>('/admin/system-health');
  }

  async generateReport(type: string, format: string = 'json') {
    const endpoint = `/admin/reports?type=${type}&format=${format}`;
    return this.request<any>(endpoint);
  }

  // User management (admin only)
  async getUsers(params?: {
    role?: string;
    isActive?: boolean;
    page?: number;
    limit?: number;
  }) {
    const queryParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) {
          queryParams.append(key, value.toString());
        }
      });
    }

    const endpoint = `/users${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
    return this.request<PaginatedResponse<any>>(endpoint);
  }

  // Utility methods
  setToken(token: string) {
    this.token = token;
    localStorage.setItem('token', token);
  }

  clearToken() {
    this.token = null;
    localStorage.removeItem('token');
  }

  isAuthenticated(): boolean {
    return !!this.token;
  }
}

export const apiService = new ApiService();
export default apiService;
