import axios from 'axios'

const ORIGIN = import.meta.env.VITE_API_URL
const BASE_URL = ORIGIN
  ? (ORIGIN.startsWith('http') ? `${ORIGIN}/api` : `https://${ORIGIN}/api`)
  : '/api'

const api = axios.create({
  baseURL: BASE_URL,
  headers: { 'Content-Type': 'application/json' },
})

// Attach token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('salwat_token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// Handle 401
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('salwat_token')
      localStorage.removeItem('salwat_user')
      window.location.href = '/'
    }
    return Promise.reject(err)
  }
)

// Auth
export const login = (first_name, pin) =>
  api.post('/auth/login', { first_name, pin })

export const getMe = () => api.get('/auth/me')

export const resetPin = (new_pin) =>
  api.put('/auth/reset-pin', { new_pin })

// Prayer
export const getPrayerTimes = (region) =>
  api.get(`/prayer/times/${region}`)

export const logPrayer = (data) =>
  api.post('/prayer/log', data)

export const getMyLogs = (limit = 50) =>
  api.get(`/prayer/logs?limit=${limit}`)

// Leaderboard
export const getLeaderboard = (category) =>
  api.get(`/leaderboard/${category}`)

// Admin - Users
export const getUsers = () => api.get('/admin/users')

export const createUser = (data) => api.post('/admin/users', data)

export const updateUser = (id, data) => api.put(`/admin/users/${id}`, data)

export const deleteUser = (id) => api.delete(`/admin/users/${id}`)

export const resetUserPin = (id, new_pin) =>
  api.put(`/admin/users/${id}/reset-pin`, { new_pin })

export const resetUserPoints = (id) =>
  api.post(`/admin/users/${id}/reset-points`)

export const toggleLeaderboard = (id) =>
  api.post(`/admin/users/${id}/toggle-leaderboard`)

// Admin - Logs
export const getAllLogs = (pendingOnly = false) =>
  api.get(`/admin/logs?pending_only=${pendingOnly}`)

export const approveLog = (id, data) =>
  api.patch(`/admin/logs/${id}`, data)

export const getUserLogs = (userId) =>
  api.get(`/admin/users/${userId}/logs`)

export const deleteLog = (logId) =>
  api.delete(`/admin/logs/${logId}`)

// User rewards
export const getMyRewards = () => api.get('/prayer/rewards')

// Admin - Rewards
export const getRewards = (pendingOnly = true) =>
  api.get(`/admin/rewards?pending_only=${pendingOnly}`)

export const approveReward = (id, is_approved, description = null) =>
  api.patch(`/admin/rewards/${id}`, { is_approved, description })

// Admin - Attendance
export const markAttendance = (prayer_name, user_ids, log_date = null) =>
  api.post('/admin/attendance', { prayer_name, user_ids, log_date })

// Admin - Settings
export const getAdminSettings = () => api.get('/admin/settings')

export const updateSettings = (data) => api.put('/admin/settings', data)

// Public - Settings
export const getPrayerSettings = () => api.get('/prayer/settings')

// Admin - Reset Week
export const resetWeek = () => api.post('/admin/reset-week')

// Archive
export const getArchivedWeeks = () => api.get('/archive/weeks')

export const getArchivedLeaderboard = (weekStart, weekEnd, category) =>
  api.get(`/archive/leaderboard?week_start=${weekStart}&week_end=${weekEnd}&category=${category}`)

export default api
