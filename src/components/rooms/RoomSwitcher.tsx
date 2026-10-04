import React, { useState } from 'react';
import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import Divider from '@mui/material/Divider';
import {
  MeetingRoom as RoomIcon,
  Home as HomeIcon,
  Add as AddIcon,
  ExpandMore as ExpandMoreIcon,
  Check as CheckIcon,
  ContentCopy as CopyIcon,
  Group as GroupIcon,
  Shield as ShieldIcon,
  Visibility as VisibilityIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useRoom } from '../../context/RoomContext';
import { useToast } from '../common/ToastProvider';

export const RoomSwitcher: React.FC = () => {
  const {
    rooms,
    activeRoom,
    myRoom,
    role,
    isAdmin,
    isViewer,
    switchRoom,
    openJoinModal,
  } = useRoom();
  const { showSuccess } = useToast();
  const navigate = useNavigate();

  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const isOpen = Boolean(anchorEl);

  const handleOpenMenu = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleCloseMenu = () => {
    setAnchorEl(null);
  };

  const handleSelectRoom = (roomId: string) => {
    switchRoom(roomId);
    handleCloseMenu();
  };

  const handleCopyCode = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (activeRoom?.room_code) {
      navigator.clipboard.writeText(activeRoom.room_code);
      showSuccess(`Room code ${activeRoom.room_code} copied to clipboard!`, 'Copied');
    }
  };

  const handleManageMembers = () => {
    handleCloseMenu();
    navigate('/settings');
    // Scroll to room members section if on settings
    setTimeout(() => {
      const el = document.getElementById('room-members-section');
      if (el) el.scrollIntoView({ behavior: 'smooth' });
    }, 150);
  };

  if (!activeRoom) {
    return null;
  }

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
      {/* Active Room Dropdown Chip */}
      <Tooltip title="Switch Room or view details">
        <Chip
          icon={
            activeRoom.is_owner ? (
              <HomeIcon sx={{ fontSize: '16px !important', color: 'primary.main' }} />
            ) : (
              <RoomIcon sx={{ fontSize: '16px !important', color: isViewer ? '#f59e0b' : '#34d399' }} />
            )
          }
          label={
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
              <Typography
                variant="caption"
                sx={{
                  fontWeight: 700,
                  fontSize: '0.75rem',
                  maxWidth: { xs: 80, sm: 130, md: 180 },
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {activeRoom.room_name}
              </Typography>
              <Typography
                variant="caption"
                sx={{
                  fontFamily: 'monospace',
                  fontWeight: 800,
                  fontSize: '0.7rem',
                  bgcolor: (theme) =>
                    theme.palette.mode === 'dark' ? 'rgba(0, 0, 0, 0.35)' : 'rgba(0, 0, 0, 0.08)',
                  px: 0.6,
                  py: 0.1,
                  borderRadius: 0,
                  letterSpacing: '0.04em',
                  display: { xs: 'none', sm: 'inline-block' },
                }}
              >
                {activeRoom.room_code}
              </Typography>
              <Chip
                label={isAdmin ? 'Admin' : 'View-only'}
                size="small"
                sx={{
                  height: 18,
                  fontSize: '0.625rem',
                  fontWeight: 800,
                  borderRadius: 0,
                  bgcolor: isAdmin ? 'rgba(52, 211, 153, 0.18)' : 'rgba(245, 158, 11, 0.18)',
                  color: isAdmin ? '#34d399' : '#f59e0b',
                  border: '1px solid',
                  borderColor: isAdmin ? 'rgba(52, 211, 153, 0.4)' : 'rgba(245, 158, 11, 0.4)',
                  display: { xs: 'none', md: 'inline-flex' },
                }}
              />
              <ExpandMoreIcon sx={{ fontSize: 16, opacity: 0.7 }} />
            </Box>
          }
          onClick={handleOpenMenu}
          sx={{
            height: 32,
            px: 0.5,
            cursor: 'pointer',
            borderRadius: 0,
            border: '1px solid',
            borderColor: (theme) =>
              theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.12)' : 'rgba(0, 0, 0, 0.12)',
            bgcolor: (theme) =>
              theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.03)',
            transition: 'all 0.2s ease',
            '&:hover': {
              bgcolor: (theme) =>
                theme.palette.mode === 'dark' ? 'rgba(0, 229, 201, 0.1)' : 'rgba(0, 229, 201, 0.08)',
              borderColor: 'primary.main',
            },
          }}
        />
      </Tooltip>

      {/* Add / Join Room Button */}
      <Tooltip title="Join Room with Code">
        <IconButton
          size="small"
          onClick={openJoinModal}
          sx={{
            width: 32,
            height: 32,
            borderRadius: 0,
            border: '1px solid',
            borderColor: 'primary.main',
            bgcolor: 'rgba(0, 229, 201, 0.08)',
            color: 'primary.main',
            '&:hover': {
              bgcolor: 'primary.main',
              color: '#0a1917',
            },
          }}
        >
          <AddIcon sx={{ fontSize: 18 }} />
        </IconButton>
      </Tooltip>

      {/* Room Selection Dropdown Menu */}
      <Menu
        anchorEl={anchorEl}
        open={isOpen}
        onClose={handleCloseMenu}
        slotProps={{
          paper: {
            sx: {
              width: 300,
              maxHeight: 450,
              mt: 1,
              borderRadius: 0,
              bgcolor: (theme) => (theme.palette.mode === 'dark' ? '#17191d' : '#ffffff'),
              border: '1px solid',
              borderColor: 'divider',
              boxShadow: '0 16px 36px rgba(0, 0, 0, 0.35)',
              p: 0.5,
            },
          },
        }}
        transformOrigin={{ horizontal: 'left', vertical: 'top' }}
        anchorOrigin={{ horizontal: 'left', vertical: 'bottom' }}
      >
        <Box sx={{ px: 2, py: 1 }}>
          <Typography variant="overline" sx={{ fontWeight: 800, color: 'text.secondary', letterSpacing: '0.08em' }}>
            Rooms & Households
          </Typography>
          <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', fontSize: '0.72rem' }}>
            Switch between your Main Room and shared rooms
          </Typography>
        </Box>

        <Divider sx={{ my: 0.5 }} />

        {/* List of rooms */}
        {rooms.map((r) => {
          const isCurrent = r.room_id === activeRoom.room_id;
          const isItemAdmin = r.is_owner || r.role === 'admin';

          return (
            <MenuItem
              key={r.room_id}
              onClick={() => handleSelectRoom(r.room_id)}
              selected={isCurrent}
              sx={{
                borderRadius: 0,
                my: 0.25,
                mx: 0.5,
                py: 1,
                bgcolor: isCurrent
                  ? (theme) =>
                      theme.palette.mode === 'dark'
                        ? 'rgba(0, 229, 201, 0.12) !important'
                        : 'rgba(0, 229, 201, 0.08) !important'
                  : 'transparent',
              }}
            >
              <ListItemIcon sx={{ minWidth: 32 }}>
                {r.is_owner ? (
                  <HomeIcon sx={{ fontSize: 20, color: 'primary.main' }} />
                ) : (
                  <RoomIcon sx={{ fontSize: 20, color: isItemAdmin ? '#34d399' : '#f59e0b' }} />
                )}
              </ListItemIcon>
              <ListItemText
                primary={
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Typography
                      variant="body2"
                      sx={{
                        fontWeight: isCurrent ? 800 : 600,
                        color: isCurrent ? 'primary.main' : 'text.primary',
                        fontSize: '0.85rem',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        maxWidth: 140,
                      }}
                    >
                      {r.room_name}
                    </Typography>
                    <Chip
                      size="small"
                      label={r.is_owner ? 'Owner' : isItemAdmin ? 'Admin' : 'View-only'}
                      sx={{
                        height: 18,
                        fontSize: '0.625rem',
                        fontWeight: 700,
                        borderRadius: 0,
                        bgcolor: r.is_owner
                          ? 'rgba(0, 229, 201, 0.15)'
                          : isItemAdmin
                          ? 'rgba(52, 211, 153, 0.15)'
                          : 'rgba(245, 158, 11, 0.15)',
                        color: r.is_owner ? 'primary.main' : isItemAdmin ? '#34d399' : '#f59e0b',
                      }}
                    />
                  </Box>
                }
                secondary={
                  <Typography variant="caption" sx={{ fontFamily: 'monospace', color: 'text.secondary', fontSize: '0.7rem' }}>
                    Code: {r.room_code}
                  </Typography>
                }
              />
              {isCurrent && <CheckIcon sx={{ fontSize: 16, color: 'primary.main', ml: 1 }} />}
            </MenuItem>
          );
        })}

        <Divider sx={{ my: 1 }} />

        {/* Menu Actions */}
        <MenuItem
          onClick={() => {
            handleCloseMenu();
            openJoinModal();
          }}
          sx={{ borderRadius: 0, mx: 0.5, py: 0.75 }}
        >
          <ListItemIcon sx={{ minWidth: 32 }}>
            <AddIcon sx={{ fontSize: 18, color: 'primary.main' }} />
          </ListItemIcon>
          <ListItemText
            primary={
              <Typography variant="body2" sx={{ fontWeight: 700, color: 'primary.main', fontSize: '0.8125rem' }}>
                Join another Room...
              </Typography>
            }
          />
        </MenuItem>

        <MenuItem onClick={handleCopyCode} sx={{ borderRadius: 0, mx: 0.5, py: 0.75 }}>
          <ListItemIcon sx={{ minWidth: 32 }}>
            <CopyIcon sx={{ fontSize: 18 }} />
          </ListItemIcon>
          <ListItemText
            primary={
              <Typography variant="body2" sx={{ fontSize: '0.8125rem' }}>
                Copy active Room Code ({activeRoom.room_code})
              </Typography>
            }
          />
        </MenuItem>

        <MenuItem onClick={handleManageMembers} sx={{ borderRadius: 0, mx: 0.5, py: 0.75 }}>
          <ListItemIcon sx={{ minWidth: 32 }}>
            <GroupIcon sx={{ fontSize: 18 }} />
          </ListItemIcon>
          <ListItemText
            primary={
              <Typography variant="body2" sx={{ fontSize: '0.8125rem' }}>
                Manage Room Members & Roles
              </Typography>
            }
          />
        </MenuItem>
      </Menu>
    </Box>
  );
};
