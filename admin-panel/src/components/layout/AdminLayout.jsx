import { Outlet } from 'react-router-dom';
import { Box } from '@mui/material';
import Sidebar from './Sidebar';
import TopNavbar from './TopNavbar';
import { useAdminSocket } from '@/hooks/useAdminSocket';

export default function AdminLayout() {
  useAdminSocket();

  return (
    <Box className="flex min-h-screen bg-slate-950 text-slate-100">
      <Sidebar />
      <Box className="flex-1 flex flex-col min-w-0">
        <TopNavbar />
        <Box component="main" className="flex-1 p-4 md:p-6 overflow-auto">
          <Outlet />
        </Box>
      </Box>
    </Box>
  );
}
