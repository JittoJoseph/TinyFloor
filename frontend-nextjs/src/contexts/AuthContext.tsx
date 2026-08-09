"use client";

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from "react";
import { apiClient } from "@/lib/api";
import { User, AuthResponse } from "@/lib/types";

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  isGuest: boolean;
  login: (username: string, password: string) => Promise<AuthResponse>;
  register: (
    username: string,
    password: string,
    email?: string,
    displayName?: string,
  ) => Promise<AuthResponse>;
  loginAsGuest: (
    displayName: string,
    character: string,
  ) => Promise<AuthResponse>;
  logout: () => Promise<void>;
  updateUser: (user: Partial<User>) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadUser = useCallback(async () => {
    const token = apiClient.getToken();
    if (!token) {
      setIsLoading(false);
      return;
    }

    try {
      // Single API call instead of validateToken + getCurrentUser
      const session = await apiClient.getSession();
      if (session.valid && session.user) {
        setUser(session.user);
      } else {
        apiClient.setToken(null);
      }
    } catch {
      apiClient.setToken(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadUser();
  }, [loadUser]);

  const login = async (
    username: string,
    password: string,
  ): Promise<AuthResponse> => {
    const response = await apiClient.login({ username, password });
    if (response.token && !response.message) {
      const userData = await apiClient.getCurrentUser();
      setUser(userData);
    }
    return response;
  };

  const register = async (
    username: string,
    password: string,
    email?: string,
    displayName?: string,
  ): Promise<AuthResponse> => {
    const response = await apiClient.register({
      username,
      password,
      email,
      displayName,
    });
    if (response.token && !response.message) {
      const userData = await apiClient.getCurrentUser();
      setUser(userData);
    }
    return response;
  };

  const loginAsGuest = async (
    displayName: string,
    character: string,
  ): Promise<AuthResponse> => {
    const response = await apiClient.createGuestSession(displayName, character);
    if (response.token) {
      setUser({
        id: response.userId,
        username: response.username,
        displayName: response.displayName,
        isGuest: true,
        status: response.status,
        createdRooms: [],
        joinedRooms: [],
        createdAt: new Date().toISOString(),
        avatarPreferences: { characterName: character },
      });
    }
    return response;
  };

  const logout = async () => {
    await apiClient.logout();
    setUser(null);
  };

  const updateUser = (updates: Partial<User>) => {
    if (user) {
      setUser({ ...user, ...updates });
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user,
        isGuest: user?.isGuest ?? false,
        login,
        register,
        loginAsGuest,
        logout,
        updateUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
