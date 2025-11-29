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
  setTiebreakerWinner: (id, winnerId) => api.post(`/matches/${id}/tiebreaker`, { winnerId }),
};

// Auth APIs
export const authAPI = {
  login: (data) => api.post('/auth/login', data),
  getUser: (userId) => api.get(`/auth/user/${userId}`),
  getAllUsers: () => api.get('/auth/users'),
  updateUser: (id, data) => api.put(`/auth/user/${id}`, data),
};

// Tournament APIs
export const tournamentAPI = {
  getAll: () => api.get('/tournaments'),
  getById: (id) => api.get(`/tournaments/${id}`),
  create: (data) => api.post('/tournaments', data),
  update: (id, data) => api.put(`/tournaments/${id}`, data),
  delete: (id) => api.delete(`/tournaments/${id}`),
  setupGroups: (id, data) => api.post(`/tournaments/${id}/groups/setup`, data),
  generateGroupMatches: (id) => api.post(`/tournaments/${id}/groups/generate-matches`),
  regenerateGroupMatches: (id) => api.post(`/tournaments/${id}/groups/regenerate-matches`),
  getAllGroupStandings: (id) => api.get(`/tournaments/${id}/groups/standings`),
  getGroupStandings: (id, groupName) => api.get(`/tournaments/${id}/groups/${groupName}/standings`),
  generateKnockoutBracket: (id) => api.post(`/tournaments/${id}/knockout/generate`),
  regenerateKnockoutBracket: (id) => api.post(`/tournaments/${id}/knockout/regenerate`),
  clearKnockout: (id) => api.delete(`/tournaments/${id}/knockout`),
  updateKnockoutMatch: (id, knockoutId, data) => api.put(`/tournaments/${id}/knockout/${knockoutId}`, data),
  updateGroupMatch: (id, matchId, data) => api.put(`/tournaments/${id}/groups/match/${matchId}`, data),
  updateGroupStandings: (matchId) => api.post(`/tournaments/match/${matchId}/update-standings`),
  advanceKnockoutWinner: (matchId) => api.post(`/tournaments/match/${matchId}/advance-knockout`),
  addMatch: (id, data) => api.post(`/tournaments/${id}/matches`, data),
  resetTournament: (id) => api.post(`/tournaments/${id}/reset`),
  resetGroupStage: (id) => api.post(`/tournaments/${id}/reset/groups`),
  resetKnockoutStage: (id) => api.post(`/tournaments/${id}/reset/knockout`),
};

export default api;
