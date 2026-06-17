import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '@/api/axios';
import { endpoints } from '@/api/endpoints';

export const loginAdmin = createAsyncThunk(
  'auth/login',
  async ({ email, password }, { rejectWithValue }) => {
    try {
      localStorage.removeItem('adminToken');
      const { data } = await api.post(endpoints.login, { email, password });
      const payload = data?.data;
      if (!payload?.token) {
        return rejectWithValue(data?.message || 'Invalid login response');
      }
      localStorage.setItem('adminToken', payload.token);
      return payload;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || 'Login failed');
    }
  }
);

export const fetchAdminMe = createAsyncThunk('auth/me', async (_, { rejectWithValue }) => {
  try {
    const { data } = await api.get(endpoints.me);
    return data.data;
  } catch (err) {
    return rejectWithValue(err.response?.data?.message);
  }
});

const authSlice = createSlice({
  name: 'auth',
  initialState: {
    admin: null,
    token: localStorage.getItem('adminToken'),
    loading: false,
    error: null
  },
  reducers: {
    logout(state) {
      state.admin = null;
      state.token = null;
      localStorage.removeItem('adminToken');
    }
  },
  extraReducers: (builder) => {
    builder
      .addCase(loginAdmin.pending, (s) => {
        s.loading = true;
        s.error = null;
      })
      .addCase(loginAdmin.fulfilled, (s, a) => {
        s.loading = false;
        s.admin = a.payload.admin;
        s.token = a.payload.token;
      })
      .addCase(loginAdmin.rejected, (s, a) => {
        s.loading = false;
        s.error = a.payload;
      })
      .addCase(fetchAdminMe.fulfilled, (s, a) => {
        s.admin = a.payload;
      });
  }
});

export const { logout } = authSlice.actions;
export default authSlice.reducer;
