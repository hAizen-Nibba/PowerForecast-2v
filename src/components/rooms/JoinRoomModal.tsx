import React, { useState } from 'react';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Typography from '@mui/material/Typography';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import Box from '@mui/material/Box';
import Alert from '@mui/material/Alert';
import CircularProgress from '@mui/material/CircularProgress';
import { MeetingRoom as RoomIcon, Key as KeyIcon, Add as AddIcon } from '@mui/icons-material';
import { useRoom } from '../../context/RoomContext';
import { useToast } from '../common/ToastProvider';

interface JoinRoomModalProps {
  open: boolean;
  onClose: () => void;
}

export const JoinRoomModal: React.FC<JoinRoomModalProps> = ({ open, onClose }) => {
  const { joinRoom } = useRoom();
  const { showSuccess, showError } = useToast();

  const [code, setCode] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let val = e.target.value.toUpperCase().replace(/\s/g, '');
    // Ensure PF- prefix convenience
    if (!val.startsWith('PF-') && val.length > 0 && !'PF-'.startsWith(val)) {
      if (!val.includes('-') && val.length >= 2) {
        val = `PF-${val.replace(/^PF-?/, '')}`;
      }
    }
    setCode(val);
    setErrorMsg(null);
  };

  const handleJoin = async () => {
    const cleanCode = code.trim().toUpperCase();
    if (!cleanCode) {
      setErrorMsg('Please enter a room code.');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);

    try {
      const res = await joinRoom(cleanCode);
      if (res.success) {
        showSuccess(res.message, 'Joined Room');
        setCode('');
        onClose();
      } else {
        setErrorMsg(res.message);
        showError(res.message, 'Join Failed');
      }
    } catch (err: any) {
      setErrorMsg(err?.message || 'Failed to join room.');
      showError(err?.message || 'Failed to join room.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={isSubmitting ? undefined : onClose}
      maxWidth="xs"
      fullWidth
      slotProps={{
        paper: {
          sx: {
            borderRadius: 3,
            bgcolor: (theme) => (theme.palette.mode === 'dark' ? '#17191d' : '#ffffff'),
            border: '1px solid',
            borderColor: 'divider',
            boxShadow: '0 20px 40px rgba(0, 0, 0, 0.4)',
            p: 1,
          },
        },
      }}
    >
      <DialogTitle sx={{ pb: 1, display: 'flex', alignItems: 'center', gap: 1.5 }}>
        <Box
          sx={{
            width: 40,
            height: 40,
            borderRadius: 2,
            bgcolor: 'rgba(0, 229, 201, 0.12)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'primary.main',
          }}
        >
          <RoomIcon />
        </Box>
        <Box>
          <Typography variant="h6" sx={{ fontWeight: 800, fontSize: '1.1rem' }}>
            Join a Room
          </Typography>
          <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block' }}>
            Enter a Room Code to view or collaborate
          </Typography>
        </Box>
      </DialogTitle>

      <DialogContent sx={{ pt: 1.5 }}>
        {errorMsg && (
          <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>
            {errorMsg}
          </Alert>
        )}

        <Typography variant="body2" sx={{ color: 'text.secondary', mb: 2 }}>
          Ask the room owner or admin for their 6-character room code (e.g.{' '}
          <strong style={{ color: '#00e5c9' }}>PF-8K4X2M</strong>).
        </Typography>

        <TextField
          autoFocus
          fullWidth
          label="Room Code"
          placeholder="PF-XXXXXX"
          value={code}
          onChange={handleCodeChange}
          disabled={isSubmitting}
          slotProps={{
            input: {
              startAdornment: <KeyIcon sx={{ color: 'primary.main', mr: 1, fontSize: 20 }} />,
              sx: {
                fontFamily: 'monospace',
                fontWeight: 700,
                letterSpacing: '0.1em',
                fontSize: '1.1rem',
              },
            },
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              handleJoin();
            }
          }}
        />

        <Box
          sx={{
            mt: 2.5,
            p: 1.5,
            borderRadius: 2,
            bgcolor: (theme) =>
              theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.04)' : 'rgba(0, 0, 0, 0.03)',
            border: '1px solid',
            borderColor: 'divider',
          }}
        >
          <Typography variant="caption" sx={{ fontWeight: 700, display: 'block', mb: 0.5 }}>
            Access Level:
          </Typography>
          <Typography variant="caption" sx={{ color: 'text.secondary' }}>
            You will join as <strong>View-only</strong> initially. A room Admin can promote you to
            Admin with full editing permissions.
          </Typography>
        </Box>
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2, pt: 1 }}>
        <Button onClick={onClose} disabled={isSubmitting} sx={{ textTransform: 'none', fontWeight: 600 }}>
          Cancel
        </Button>
        <Button
          onClick={handleJoin}
          variant="contained"
          disabled={isSubmitting || !code.trim()}
          startIcon={isSubmitting ? <CircularProgress size={16} color="inherit" /> : <AddIcon />}
          sx={{
            textTransform: 'none',
            fontWeight: 700,
            borderRadius: 1.5,
            px: 2.5,
          }}
        >
          {isSubmitting ? 'Joining...' : 'Join Room'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};
