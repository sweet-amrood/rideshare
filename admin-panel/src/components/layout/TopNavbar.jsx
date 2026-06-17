import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import {
  AppBar,
  Toolbar,
  IconButton,
  Typography,
  InputBase,
  Badge,
  Menu,
  MenuItem,
  Box,
  alpha
} from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import SearchIcon from '@mui/icons-material/Search';
import NotificationsIcon from '@mui/icons-material/Notifications';
import AccountCircleIcon from '@mui/icons-material/AccountCircle';
import { useState } from 'react';
import { logout } from '@/store/slices/authSlice';
import { toggleSidebar } from '@/store/slices/uiSlice';

export default function TopNavbar() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const admin = useSelector((s) => s.auth.admin);
  const overview = useSelector((s) => s.dashboard.overview);
  const [anchor, setAnchor] = useState(null);

  const handleLogout = () => {
    dispatch(logout());
    navigate('/login');
  };

  return (
    <AppBar
      position="sticky"
      elevation={0}
      sx={{
        bgcolor: 'background.paper',
        borderBottom: 1,
        borderColor: 'divider'
      }}
    >
      <Toolbar className="gap-2">
        <IconButton onClick={() => dispatch(toggleSidebar())} edge="start">
          <MenuIcon />
        </IconButton>
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            px: 2,
            py: 0.5,
            borderRadius: 2,
            bgcolor: (t) => alpha(t.palette.common.white, 0.05),
            flex: 1,
            maxWidth: 400
          }}
        >
          <SearchIcon fontSize="small" sx={{ color: 'text.secondary', mr: 1 }} />
          <InputBase placeholder="Search users, rides…" fullWidth sx={{ fontSize: 14 }} />
        </Box>
        <Badge badgeContent={overview?.openReports || 0} color="error">
          <IconButton>
            <NotificationsIcon />
          </IconButton>
        </Badge>
        <IconButton onClick={(e) => setAnchor(e.currentTarget)}>
          <AccountCircleIcon />
        </IconButton>
        <Menu anchorEl={anchor} open={Boolean(anchor)} onClose={() => setAnchor(null)}>
          <MenuItem disabled>
            <Typography variant="caption">{admin?.email}</Typography>
          </MenuItem>
          <MenuItem onClick={handleLogout}>Logout</MenuItem>
        </Menu>
      </Toolbar>
    </AppBar>
  );
}
