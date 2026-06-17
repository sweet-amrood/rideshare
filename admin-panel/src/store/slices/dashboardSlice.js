import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '@/api/axios';
import { endpoints } from '@/api/endpoints';

export const loadOverview = createAsyncThunk('dashboard/overview', async () => {
  const { data } = await api.get(endpoints.overview);
  return data.data;
});

export const loadActivity = createAsyncThunk('dashboard/activity', async () => {
  const { data } = await api.get(endpoints.activity);
  return data.data;
});

export const loadCharts = createAsyncThunk('dashboard/charts', async () => {
  const { data } = await api.get(endpoints.charts);
  return data.data;
});

const dashboardSlice = createSlice({
  name: 'dashboard',
  initialState: {
    overview: null,
    activity: [],
    charts: null,
    realtime: null,
    loading: false
  },
  reducers: {
    setRealtime(state, action) {
      state.realtime = action.payload;
    }
  },
  extraReducers: (builder) => {
    builder
      .addCase(loadOverview.fulfilled, (s, a) => {
        s.overview = a.payload;
      })
      .addCase(loadActivity.fulfilled, (s, a) => {
        s.activity = a.payload;
      })
      .addCase(loadCharts.fulfilled, (s, a) => {
        s.charts = a.payload;
      })
      .addMatcher(
        (a) => a.type.startsWith('dashboard/') && a.type.endsWith('/pending'),
        (s) => {
          s.loading = true;
        }
      )
      .addMatcher(
        (a) => a.type.startsWith('dashboard/') && a.type.endsWith('/fulfilled'),
        (s) => {
          s.loading = false;
        }
      );
  }
});

export const { setRealtime } = dashboardSlice.actions;
export default dashboardSlice.reducer;
