import axios from 'axios';

const API_URL = 'http://localhost:5022/api';

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
  getLiveMatches: () => api.get('/matches/live'),
};

export default api;
