import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '@/api/axios';
import { endpoints } from '@/api/endpoints';
import { authService } from '@/api/services/auth.service';
import { writeOnboardingComplete, clearOnboardingComplete } from '@/features/auth/utils/onboardingStorage';
import {
  DEMO_TOKEN,
  DEMO_USER,
  isDemoActive,
  enableRuntimeDemo,
  clearRuntimeDemo,
  isDemoCredentialLogin
} from '@/config/demo';

const TOKEN_KEY = 'token';

const syncOnboardingFromUser = (state, user) => {
  if (!user) {
    state.onboardingComplete = false;
    return;
  }
  state.onboardingComplete = user.onboardingComplete !== false;
  if (state.onboardingComplete && user._id) {
    writeOnboardingComplete(user._id);
  }
};

export const initializeAuth = createAsyncThunk(
  'auth/initialize',
  async (_, { rejectWithValue }) => {
    if (isDemoActive()) {
      localStorage.setItem(TOKEN_KEY, DEMO_TOKEN);
      return { user: DEMO_USER, token: DEMO_TOKEN };
    }

    const token = localStorage.getItem(TOKEN_KEY);
    if (!token) return { user: null, token: null };

    try {
      const { data } = await api.get(endpoints.users.profile);
      if (data.success) {
        return { user: data.data.user, token };
      }
      localStorage.removeItem(TOKEN_KEY);
      return rejectWithValue('Invalid session');
    } catch {
      localStorage.removeItem(TOKEN_KEY);
      return rejectWithValue('Session expired');
    }
  }
);

const authSuccess = (data) => {
  localStorage.setItem(TOKEN_KEY, data.token);
  return { user: data.user, token: data.token };
};

export const enterDemoMode = createAsyncThunk('auth/enterDemo', async () => {
  enableRuntimeDemo();
  localStorage.setItem(TOKEN_KEY, DEMO_TOKEN);
  return { user: DEMO_USER, token: DEMO_TOKEN };
});

export const login = createAsyncThunk('auth/login', async ({ email, password }, { rejectWithValue }) => {
  if (isDemoCredentialLogin(email, password)) {
    enableRuntimeDemo();
    localStorage.setItem(TOKEN_KEY, DEMO_TOKEN);
    return { user: DEMO_USER, token: DEMO_TOKEN };
  }

  try {
    return await authService.login(email, password);
  } catch (err) {
    if (err.status === 403 && err.data?.requiresEmailVerification) {
      return rejectWithValue({
        requiresEmailVerification: true,
        email: err.data.email,
        message: err.data.message
      });
    }
    return rejectWithValue({ message: err.message });
  }
});

export const register = createAsyncThunk('auth/register', async (payload, { rejectWithValue }) => {
  try {
    return await authService.register(payload);
  } catch (err) {
    return rejectWithValue({ message: err.message });
  }
});

export const verifyEmail = createAsyncThunk('auth/verifyEmail', async ({ email, code }, { rejectWithValue }) => {
  try {
    return await authService.verifyEmail(email, code);
  } catch (err) {
    return rejectWithValue({ message: err.message });
  }
});

export const resendEmailVerification = createAsyncThunk(
  'auth/resendVerification',
  async ({ email }, { rejectWithValue }) => {
    try {
      return await authService.resendVerification(email);
    } catch (err) {
      return rejectWithValue({ message: err.message });
    }
  }
);

export const forgotPassword = createAsyncThunk('auth/forgotPassword', async ({ email }, { rejectWithValue }) => {
  try {
    return await authService.forgotPassword(email);
  } catch (err) {
    return rejectWithValue({ message: err.message });
  }
});

export const resetPassword = createAsyncThunk(
  'auth/resetPassword',
  async ({ email, code, newPassword }, { rejectWithValue }) => {
    try {
      return await authService.resetPassword(email, code, newPassword);
    } catch (err) {
      return rejectWithValue({ message: err.message });
    }
  }
);

export const googleLogin = createAsyncThunk('auth/googleLogin', async ({ credential }, { rejectWithValue }) => {
  try {
    return await authService.googleLogin(credential);
  } catch (err) {
    return rejectWithValue({ message: err.message });
  }
});

export const uploadDocuments = createAsyncThunk(
  'auth/uploadDocuments',
  async (payload, { rejectWithValue }) => {
    try {
      return await authService.uploadDocuments(payload);
    } catch (err) {
      return rejectWithValue({ message: err.message });
    }
  }
);

const initialState = {
  user: null,
  token: localStorage.getItem(TOKEN_KEY) || '',
  loading: true,
  error: '',
  isInitialized: false,
  onboardingComplete: false
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = '';
    },
    setError: (state, action) => {
      state.error = action.payload;
    },
    logout: (state) => {
      if (state.user?._id) clearOnboardingComplete(state.user._id);
      clearRuntimeDemo();
      localStorage.removeItem(TOKEN_KEY);
      state.user = null;
      state.token = '';
      state.error = '';
      state.onboardingComplete = false;
    },
    completeOnboarding: (state) => {
      if (state.user?._id) {
        writeOnboardingComplete(state.user._id);
        state.onboardingComplete = true;
        state.user = { ...state.user, onboardingComplete: true };
      }
    },
    updateUser: (state, action) => {
      state.user = { ...state.user, ...action.payload };
      if (action.payload?.onboardingComplete !== undefined) {
        state.onboardingComplete = action.payload.onboardingComplete !== false;
      }
    }
  },
  extraReducers: (builder) => {
    builder
      .addCase(initializeAuth.pending, (state) => {
        state.loading = true;
      })
      .addCase(initializeAuth.fulfilled, (state, action) => {
        state.loading = false;
        state.isInitialized = true;
        state.user = action.payload?.user ?? null;
        state.token = action.payload?.token ?? '';
        if (state.user) syncOnboardingFromUser(state, state.user);
      })
      .addCase(initializeAuth.rejected, (state) => {
        state.loading = false;
        state.isInitialized = true;
        state.user = null;
        state.token = '';
      })

      .addCase(enterDemoMode.fulfilled, (state, action) => {
        state.user = action.payload.user;
        state.token = action.payload.token;
        state.error = '';
        state.loading = false;
        state.isInitialized = true;
        syncOnboardingFromUser(state, action.payload.user);
      })

      .addCase(login.fulfilled, (state, action) => {
        const payload = authSuccess(action.payload);
        state.user = payload.user;
        state.token = payload.token;
        state.error = '';
        if (state.user) syncOnboardingFromUser(state, state.user);
      })
      .addCase(login.rejected, (state, action) => {
        const p = action.payload;
        if (!p?.requiresEmailVerification) {
          state.error = p?.message || 'Login failed';
        } else {
          state.error = '';
        }
      })

      .addCase(verifyEmail.fulfilled, (state, action) => {
        const payload = authSuccess(action.payload);
        state.user = payload.user;
        state.token = payload.token;
        state.error = '';
        syncOnboardingFromUser(state, payload.user);
      })
      .addCase(verifyEmail.rejected, (state, action) => {
        state.error = action.payload?.message || 'Verification failed';
      })

      .addCase(googleLogin.fulfilled, (state, action) => {
        const payload = authSuccess(action.payload);
        state.user = payload.user;
        state.token = payload.token;
        state.error = '';
        if (state.user) syncOnboardingFromUser(state, state.user);
      })
      .addCase(googleLogin.rejected, (state, action) => {
        state.error = action.payload?.message || 'Google sign-in failed';
      })

      .addCase(uploadDocuments.fulfilled, (state, action) => {
        if (action.payload?.verification) {
          state.user = { ...state.user, verification: action.payload.verification };
        }
      })

      .addMatcher(
        (action) =>
          action.type.endsWith('/rejected') &&
          !['auth/login/rejected', 'auth/verifyEmail/rejected', 'auth/googleLogin/rejected'].includes(
            action.type
          ),
        (state, action) => {
          if (action.payload?.message) state.error = action.payload.message;
        }
      );
  }
});

export const { clearError, setError, logout, updateUser, completeOnboarding } = authSlice.actions;
export default authSlice.reducer;
