import React from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import { Visibility as EyeIcon, Home as HomeIcon } from '@mui/icons-material';
import { useRoom } from '../../context/RoomContext';

export const ViewOnlyBanner: React.FC = () => {
  const { isViewer, activeRoom, myRoom, switchRoom } = useRoom();

  if (!isViewer || !activeRoom) return null;

  return (
    <Box
      sx={{
        width: '100%',
        bgcolor: 'rgba(245, 158, 11, 0.12)',
        borderBottom: '1px solid rgba(245, 158, 11, 0.3)',
        px: { xs: 2, sm: 3, md: 4 },
        py: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: 1.5,
        zIndex: 10,
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25 }}>
        <EyeIcon sx={{ color: '#f59e0b', fontSize: 20 }} />
        <Typography variant="body2" sx={{ color: '#f59e0b', fontWeight: 700, fontSize: '0.8125rem' }}>
          View-Only Mode:
          <Typography
            component="span"
            variant="body2"
            sx={{ fontWeight: 500, color: 'text.primary', ml: 0.5, fontSize: '0.8125rem' }}
          >
            You have read-only access to <strong>{activeRoom.room_name}</strong>. Adding, modifying, or
            deleting appliances is restricted to room Admins.
          </Typography>
        </Typography>
      </Box>

      {myRoom && myRoom.room_id !== activeRoom.room_id && (
        <Button
          size="small"
          variant="outlined"
          startIcon={<HomeIcon sx={{ fontSize: '15px !important' }} />}
          onClick={() => switchRoom(myRoom.room_id)}
          sx={{
            borderColor: 'rgba(245, 158, 11, 0.5)',
            color: '#f59e0b',
            fontWeight: 700,
            textTransform: 'none',
            fontSize: '0.75rem',
            py: 0.25,
            px: 1.5,
            borderRadius: 1.25,
            '&:hover': {
              borderColor: '#f59e0b',
              bgcolor: 'rgba(245, 158, 11, 0.1)',
            },
          }}
        >
          Switch to My Room
        </Button>
      )}
    </Box>
  );
};
