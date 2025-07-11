import React, { createContext, useContext, useReducer, useEffect } from "react";
import { toast } from "react-hot-toast";
import Cookies from "js-cookie";

// Initial state
const initialState = {
  user: null,
  isAuthenticated: false,
  loading: true,
  users: [], // For admin to manage users
  accessStatus: null, // Track user access requirements
};

// Action types
const ActionTypes = {
  SET_USER: "SET_USER",
  LOGOUT: "LOGOUT",
  SET_LOADING: "SET_LOADING",
  SET_USERS: "SET_USERS",
  ADD_USER: "ADD_USER",
  UPDATE_USER: "UPDATE_USER",
  DELETE_USER: "DELETE_USER",
  SET_ACCESS_STATUS: "SET_ACCESS_STATUS",
};

// Reducer
const authReducer = (state, action) => {
  switch (action.type) {
    case ActionTypes.SET_USER:
      return {
        ...state,
        user: action.payload,
        isAuthenticated: !!action.payload,
        loading: false,
      };
    case ActionTypes.LOGOUT:
      return {
        ...state,
        user: null,
        isAuthenticated: false,
        loading: false,
        accessStatus: null,
      };
    case ActionTypes.SET_LOADING:
      return {
        ...state,
        loading: action.payload,
      };
    case ActionTypes.SET_USERS:
      return {
        ...state,
        users: action.payload,
      };
    case ActionTypes.ADD_USER:
      return {
        ...state,
        users: [...state.users, action.payload],
      };
    case ActionTypes.UPDATE_USER:
      return {
        ...state,
        users: state.users.map((user) =>
          user.id === action.payload.id ? action.payload : user
        ),
      };
    case ActionTypes.DELETE_USER:
      return {
        ...state,
        users: state.users.filter((user) => user.id !== action.payload),
      };
    case ActionTypes.SET_ACCESS_STATUS:
      return {
        ...state,
        accessStatus: action.payload,
      };
    default:
      return state;
  }
};

// Create context
const AuthContext = createContext();

// Mock users data (in real app, this would come from a backend)
const mockUsers = [
  {
    id: "1",
    email: "admin@tradejournalpro.com",
    name: "Admin User",
    role: "admin",
    password: "admin123", // In real app, this would be hashed
    createdAt: new Date("2024-01-01"),
    isActive: true,
    subscription: "premium",
  },
  {
    id: "2",
    email: "user@example.com",
    name: "Regular User",
    role: "user",
    password: "user123",
    createdAt: new Date("2024-01-15"),
    isActive: true,
    subscription: "basic",
  },
];

// Provider component
export const AuthProvider = ({ children }) => {
  const [state, dispatch] = useReducer(authReducer, initialState);

  // Initialize auth state and users
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        // Check for stored user session
        const token = Cookies.get("auth_token");
        const userData = localStorage.getItem("user_data");

        if (token && userData) {
          const user = JSON.parse(userData);
          dispatch({ type: ActionTypes.SET_USER, payload: user });
          
          // Mock access status for development
          const mockAccessStatus = {
            can_access: true,
            requirements: {
              email_verified: true,
              payment_method_verified: true,
              onboarding_completed: true
            }
          };
          dispatch({ type: ActionTypes.SET_ACCESS_STATUS, payload: mockAccessStatus });
        } else {
          dispatch({ type: ActionTypes.SET_LOADING, payload: false });
        }

        // Initialize users (in real app, fetch from backend)
        const storedUsers = localStorage.getItem("all_users");
        if (storedUsers) {
          dispatch({
            type: ActionTypes.SET_USERS,
            payload: JSON.parse(storedUsers),
          });
        } else {
          localStorage.setItem("all_users", JSON.stringify(mockUsers));
          dispatch({ type: ActionTypes.SET_USERS, payload: mockUsers });
        }
      } catch (error) {
        console.error("Error initializing auth:", error);
        dispatch({ type: ActionTypes.SET_LOADING, payload: false });
      }
    };

    initializeAuth();
  }, []);

  // Check user access status - Mock implementation for development
  const checkUserAccess = async (token) => {
    try {
      // Mock access status for development
      const mockAccessStatus = {
        can_access: true,
        requirements: {
          email_verified: true,
          payment_method_verified: true,
          onboarding_completed: true
        }
      };
      
      dispatch({ type: ActionTypes.SET_ACCESS_STATUS, payload: mockAccessStatus });
      return mockAccessStatus;
    } catch (error) {
      console.error('Error checking user access:', error);
    }
    return null;
  };

  // Login function - Mock implementation for development
  const login = async (email, password) => {
    try {
      dispatch({ type: ActionTypes.SET_LOADING, payload: true });

      // Mock API delay
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Check against mock users
      const users = JSON.parse(localStorage.getItem("all_users") || "[]");
      const user = users.find(u => u.email === email);

      if (!user) {
        throw new Error('User not found');
      }

      // For development, accept any password or check against stored mock password
      if (user.password && user.password !== password) {
        throw new Error('Invalid password');
      }

      // Mock access status for development
      const accessStatus = {
        can_access: true,
        requirements: {
          email_verified: true,
          payment_method_verified: true,
          onboarding_completed: true
        }
      };

      // Store session
      const mockToken = `mock_token_${user.id}`;
      Cookies.set("auth_token", mockToken, { expires: 7 });
      localStorage.setItem("user_data", JSON.stringify(user));

      dispatch({ type: ActionTypes.SET_USER, payload: user });
      dispatch({ type: ActionTypes.SET_ACCESS_STATUS, payload: accessStatus });
      dispatch({ type: ActionTypes.SET_LOADING, payload: false });
      
      toast.success("Login successful!");
      return user;
    } catch (error) {
      dispatch({ type: ActionTypes.SET_LOADING, payload: false });
      toast.error(error.message);
      throw error;
    }
  };

  // Register function - Mock implementation for development
  const register = async (userData) => {
    try {
      dispatch({ type: ActionTypes.SET_LOADING, payload: true });

      // Mock API delay
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Create mock user data
      const mockUser = {
        id: Date.now().toString(),
        email: userData.email,
        name: `${userData.first_name} ${userData.last_name}`,
        firstName: userData.first_name,
        lastName: userData.last_name,
        role: 'user',
        createdAt: new Date(),
        isActive: true,
        subscription: 'trial',
        emailVerified: false
      };

      // Store user in mock users list
      const existingUsers = JSON.parse(localStorage.getItem("all_users") || "[]");
      const updatedUsers = [...existingUsers, mockUser];
      localStorage.setItem("all_users", JSON.stringify(updatedUsers));
      dispatch({ type: ActionTypes.SET_USERS, payload: updatedUsers });

      const mockResponse = {
        user_id: mockUser.id,
        user: mockUser,
        token: `mock_token_${mockUser.id}`,
        message: "Account created successfully"
      };

      dispatch({ type: ActionTypes.SET_LOADING, payload: false });
      toast.success("Account created successfully! Please check your email for verification.");
      return mockResponse;
    } catch (error) {
      dispatch({ type: ActionTypes.SET_LOADING, payload: false });
      toast.error(error.message);
      throw error;
    }
  };

  // Logout function
  const logout = () => {
    Cookies.remove("auth_token");
    localStorage.removeItem("user_data");
    dispatch({ type: ActionTypes.LOGOUT });
    toast.success("Logged out successfully");
  };

  // Send email verification - Mock implementation for development
  const sendEmailVerification = async (email) => {
    try {
      // Mock API delay
      await new Promise(resolve => setTimeout(resolve, 500));

      // For development, just simulate success
      toast.success("Verification email sent!");
      return { success: true };
    } catch (error) {
      toast.error(error.message);
      throw error;
    }
  };

  // Verify email - Mock implementation for development
  const verifyEmail = async (token) => {
    try {
      // Mock API delay
      await new Promise(resolve => setTimeout(resolve, 500));

      // For development, just simulate success
      toast.success("Email verified successfully!");
      return { success: true };
    } catch (error) {
      toast.error(error.message);
      throw error;
    }
  };

  // Add payment method
  const addPaymentMethod = async (paymentMethodData) => {
    try {
      const token = Cookies.get("auth_token");
      const response = await fetch('/api/user/payment-methods', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(paymentMethodData)
      });

      const data = await response.json();

      if (response.ok) {
        toast.success("Payment method added successfully!");
        return data;
      } else {
        throw new Error(data.error || 'Failed to add payment method');
      }
    } catch (error) {
      toast.error(error.message);
      throw error;
    }
  };

  // Start trial
  const startTrial = async () => {
    try {
      const token = Cookies.get("auth_token");
      const response = await fetch('/api/user/start-trial', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });

      const data = await response.json();

      if (response.ok) {
        toast.success("Trial started successfully!");
        return data;
      } else {
        throw new Error(data.error || 'Failed to start trial');
      }
    } catch (error) {
      toast.error(error.message);
      throw error;
    }
  };

  // Admin functions
  const updateUser = (userId, updates) => {
    try {
      const users = JSON.parse(localStorage.getItem("all_users") || "[]");
      const updatedUsers = users.map((user) =>
        user.id === userId ? { ...user, ...updates } : user
      );

      localStorage.setItem("all_users", JSON.stringify(updatedUsers));
      dispatch({ type: ActionTypes.SET_USERS, payload: updatedUsers });
      toast.success("User updated successfully");
    } catch (error) {
      toast.error("Failed to update user");
    }
  };

  const deleteUser = (userId) => {
    try {
      const users = JSON.parse(localStorage.getItem("all_users") || "[]");
      const updatedUsers = users.filter((user) => user.id !== userId);

      localStorage.setItem("all_users", JSON.stringify(updatedUsers));
      dispatch({ type: ActionTypes.SET_USERS, payload: updatedUsers });
      toast.success("User deleted successfully");
    } catch (error) {
      toast.error("Failed to delete user");
    }
  };

  // Update user profile
  const updateUserProfile = async (profileData) => {
    try {
      const updatedUser = {
        ...state.user,
        ...profileData,
        updatedAt: new Date().toISOString(),
      };

      // Update the current user in all_users list
      const users = JSON.parse(localStorage.getItem("all_users") || "[]");
      const userIndex = users.findIndex((u) => u.id === state.user.id);

      if (userIndex !== -1) {
        users[userIndex] = { ...users[userIndex], ...profileData };
        localStorage.setItem("all_users", JSON.stringify(users));
        dispatch({ type: ActionTypes.SET_USERS, payload: users });
      }

      // Update current user session data
      localStorage.setItem("user_data", JSON.stringify(updatedUser));

      dispatch({ type: ActionTypes.SET_USER, payload: updatedUser });

      return updatedUser;
    } catch (error) {
      throw new Error("Failed to update profile");
    }
  };

  const value = {
    ...state,
    login,
    register,
    logout,
    updateUser,
    deleteUser,
    updateUserProfile,
    checkUserAccess,
    sendEmailVerification,
    verifyEmail,
    addPaymentMethod,
    startTrial,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

// Custom hook to use auth context
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

export default AuthContext;
