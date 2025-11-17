import axios from 'axios';

// Use environment variable or default to relative path for production
const API_URL = process.env.REACT_APP_API_URL || '/api';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Team APIs
export const teamAPI = {
  getAll: () => api.get('/teams'),
  getById: (id) => api.get(`/teams/${id}`),
  create: (data) => api.post('/teams', data),
  update: (id, data) => api.put(`/teams/${id}`, data),
  delete: (id) => api.delete(`/teams/${id}`),
  getStandings: () => api.get('/teams/standings'),
};

// Player APIs
export const playerAPI = {
  getAll: () => api.get('/players'),
  getById: (id) => api.get(`/players/${id}`),
  create: (data) => api.post('/players', data),
  update: (id, data) => api.put(`/players/${id}`, data),
  delete: (id) => api.delete(`/players/${id}`),
  getTopBatsmen: (limit = 20) => api.get(`/players/top-batsmen?limit=${limit}`),
  getTopBowlers: (limit = 20) => api.get(`/players/top-bowlers?limit=${limit}`),
};

// Match APIs
export const matchAPI = {
  getAll: () => api.get('/matches'),
  getById: (id) => api.get(`/matches/${id}`),
  create: (data) => api.post('/matches', data),
  update: (id, data) => api.put(`/matches/${id}`, data),
  delete: (id) => api.delete(`/matches/${id}`),
  startMatch: (id, data) => api.post(`/matches/${id}/start`, data),
  updateBall: (id, data) => api.post(`/matches/${id}/ball`, data),
  undoLastBall: (id) => api.delete(`/matches/${id}/ball/last`),
  getLiveMatches: () => api.get('/matches/live'),
  restartMatch: (id) => api.post(`/matches/${id}/restart`),
};

// Group APIs
export const groupAPI = {
  getAll: () => api.get('/groups'),
  getById: (id) => api.get(`/groups/${id}`),
  create: (data) => api.post('/groups', data),
  update: (id, data) => api.put(`/groups/${id}`, data),
  delete: (id) => api.delete(`/groups/${id}`),
};

export default api;
