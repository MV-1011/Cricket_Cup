import React, { createContext, useState, useContext, useEffect } from 'react';
import { authAPI } from '../services/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check for stored user on mount
    const storedUser = localStorage.getItem('cricketUser');
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
    setLoading(false);
  }, []);

  const login = async (userId, password) => {
    try {
      const response = await authAPI.login({ userId, password });
      const userData = response.data;
      setUser(userData);
      localStorage.setItem('cricketUser', JSON.stringify(userData));
      return { success: true, user: userData };
    } catch (error) {
      return {
        success: false,
        message: error.response?.data?.message || 'Login failed'
      };
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('cricketUser');
  };

  // Check if user has permission for an action
  const hasPermission = (requiredRole) => {
    if (!user) return false;

    const roleHierarchy = {
      admin: 3,
      scorer: 2,
      viewer: 1
    };

    return roleHierarchy[user.role] >= roleHierarchy[requiredRole];
  };

  // Check specific permissions
  const canManageTeams = () => hasPermission('admin');
  const canManagePlayers = () => hasPermission('admin');
  const canManageMatches = () => hasPermission('admin');
  const canScoreMatches = () => hasPermission('scorer');
  const canViewOnly = () => hasPermission('viewer');

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        logout,
        hasPermission,
        canManageTeams,
        canManagePlayers,
        canManageMatches,
        canScoreMatches,
        canViewOnly,
        isAuthenticated: !!user
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export default AuthContext;
