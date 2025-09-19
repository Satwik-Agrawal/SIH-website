// API Client for Societal Issue Reporting System
class APIClient {
  constructor() {
    this.baseURL = '';
    this.token = localStorage.getItem('token');
    this.user = JSON.parse(localStorage.getItem('user') || 'null');
  }

  // Set authentication token
  setToken(token) {
    this.token = token;
    localStorage.setItem('token', token);
  }

  // Set user data
  setUser(user) {
    this.user = user;
    localStorage.setItem('user', JSON.stringify(user));
  }

  // Clear authentication
  clearAuth() {
    this.token = null;
    this.user = null;
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  }

  // Make authenticated request
  async makeRequest(url, options = {}) {
    const headers = {
      'Content-Type': 'application/json',
      ...options.headers
    };

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    console.log('Making request to:', url, 'with headers:', headers);

    try {
      const response = await fetch(url, {
        ...options,
        headers
      });

      console.log('Response status:', response.status);

      if (response.status === 401) {
        this.clearAuth();
        window.location.href = 'login.html';
        return null;
      }

      return response;
    } catch (error) {
      console.error('Request failed:', error);
      throw error;
    }
  }

  // User authentication
  async login(username, password) {
    const response = await this.makeRequest('/api/login', {
      method: 'POST',
      body: JSON.stringify({ username, password })
    });

    if (response) {
      const data = await response.json();
      if (data.success) {
        this.setToken(data.token);
        this.setUser(data.user);
      }
      return data;
    }
    return { success: false, error: 'Network error' };
  }

  async register(userData) {
    const response = await this.makeRequest('/api/register', {
      method: 'POST',
      body: JSON.stringify(userData)
    });

    if (response) {
      const data = await response.json();
      if (data.success) {
        this.setToken(data.token);
        this.setUser(data.user);
      }
      return data;
    }
    return { success: false, error: 'Network error' };
  }

  // Issues management
  async getIssues(filters = {}) {
    const params = new URLSearchParams(filters);
    const response = await this.makeRequest(`/api/issues?${params}`);
    
    if (response) {
      return await response.json();
    }
    return [];
  }

  async getIssue(id) {
    const response = await this.makeRequest(`/api/issues/${id}`);
    
    if (response) {
      return await response.json();
    }
    return null;
  }

  async createIssue(issueData) {
    const formData = new FormData();
    
    // Add text fields
    Object.keys(issueData).forEach(key => {
      if (key !== 'image' && issueData[key] !== null && issueData[key] !== undefined) {
        formData.append(key, issueData[key]);
      }
    });

    // Add image file
    if (issueData.image) {
      formData.append('image', issueData.image);
    }

    const response = await this.makeRequest('/api/issues', {
      method: 'POST',
      headers: {}, // Let browser set Content-Type for FormData
      body: formData
    });

    if (response) {
      return await response.json();
    }
    return { success: false, error: 'Network error' };
  }

  async voteIssue(issueId) {
    const response = await this.makeRequest(`/api/issues/${issueId}/vote`, {
      method: 'POST'
    });

    if (response) {
      return await response.json();
    }
    return { success: false, error: 'Network error' };
  }

  async addComment(issueId, comment) {
    const response = await this.makeRequest(`/api/issues/${issueId}/comments`, {
      method: 'POST',
      body: JSON.stringify({ comment })
    });

    if (response) {
      return await response.json();
    }
    return { success: false, error: 'Network error' };
  }

  async getComments(issueId) {
    const response = await this.makeRequest(`/api/issues/${issueId}/comments`);
    
    if (response) {
      return await response.json();
    }
    return [];
  }

  // Admin functions
  async adminLogin(email, password) {
    const response = await this.makeRequest('/api/admin/login', {
      method: 'POST',
      body: JSON.stringify({ email, password })
    });

    if (response) {
      const data = await response.json();
      if (data.success) {
        this.setToken(data.token);
        this.setUser({ ...data.admin, role: 'admin' });
      }
      return data;
    }
    return { success: false, error: 'Network error' };
  }

  async getAdminIssues(filters = {}) {
    const params = new URLSearchParams(filters);
    const response = await this.makeRequest(`/api/admin/issues?${params}`);
    
    if (response) {
      return await response.json();
    }
    return [];
  }

  async updateIssueStatus(issueId, status, assignedOfficer = null) {
    const response = await this.makeRequest(`/api/admin/issues/${issueId}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status, assignedOfficer })
    });

    if (response) {
      return await response.json();
    }
    return { success: false, error: 'Network error' };
  }

  async getAnalytics() {
    const response = await this.makeRequest('/api/admin/analytics');
    
    if (response) {
      return await response.json();
    }
    return null;
  }

  // Check if user is authenticated
  isAuthenticated() {
    return !!this.token && !!this.user;
  }

  // Check if user is admin
  isAdmin() {
    return this.isAuthenticated() && this.user.role === 'admin';
  }
}

// Global API client instance
const apiClient = new APIClient();

// Utility functions
function showMessage(message, type = 'info') {
  // Create or update message element
  let messageDiv = document.getElementById('messageDiv');
  if (!messageDiv) {
    messageDiv = document.createElement('div');
    messageDiv.id = 'messageDiv';
    messageDiv.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      padding: 15px 20px;
      border-radius: 5px;
      color: white;
      font-weight: 500;
      z-index: 10000;
      max-width: 300px;
      word-wrap: break-word;
    `;
    document.body.appendChild(messageDiv);
  }

  messageDiv.textContent = message;
  messageDiv.className = `message-${type}`;
  
  // Set background color based on type
  const colors = {
    success: '#28a745',
    error: '#dc3545',
    warning: '#ffc107',
    info: '#17a2b8'
  };
  
  messageDiv.style.backgroundColor = colors[type] || colors.info;
  messageDiv.style.display = 'block';

  // Auto-hide after 3 seconds
  setTimeout(() => {
    if (messageDiv) {
      messageDiv.style.display = 'none';
    }
  }, 3000);
}

// Initialize authentication state on page load
document.addEventListener('DOMContentLoaded', function() {
  const userMenu = document.getElementById('userMenu');
  const loginMenu = document.getElementById('loginMenu');
  const profileLabel = document.getElementById('profileLabel');
  const userName = document.getElementById('userName');
  const logoutBtn = document.getElementById('logoutBtn');

  if (apiClient.isAuthenticated()) {
    // User is logged in
    if (userMenu) userMenu.style.display = 'block';
    if (loginMenu) loginMenu.style.display = 'none';
    if (profileLabel) profileLabel.style.display = 'block';
    if (userName) userName.textContent = apiClient.user.fullName || apiClient.user.username;
    
    if (logoutBtn) {
      logoutBtn.addEventListener('click', function() {
        apiClient.clearAuth();
        location.reload();
      });
    }
  } else {
    // User is not logged in
    if (userMenu) userMenu.style.display = 'none';
    if (loginMenu) loginMenu.style.display = 'block';
    if (profileLabel) profileLabel.style.display = 'none';
  }
});

// Expose to browser global for non-module usage
if (typeof window !== 'undefined') {
  window.APIClient = APIClient;
  window.apiClient = apiClient;
}