import React, { useState } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Card from '@mui/material/Card';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Avatar from '@mui/material/Avatar';
import Chip from '@mui/material/Chip';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import Select, { SelectChangeEvent } from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import Tooltip from '@mui/material/Tooltip';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import CircularProgress from '@mui/material/CircularProgress';
import {
  Groups as GroupsIcon,
  Shield as ShieldIcon,
  Visibility as VisibilityIcon,
  ContentCopy as CopyIcon,
  Refresh as RefreshIcon,
  DeleteOutlined as DeleteIcon,
  ExitToApp as LeaveIcon,
  Key as KeyIcon,
  Check as CheckIcon,
  Add as AddIcon,
} from '@mui/icons-material';
import { useRoom } from '../../context/RoomContext';
import { useToast } from '../common/ToastProvider';

export const RoomMembersPanel: React.FC = () => {
  const {
    activeRoom,
    members,
    role,
    isOwner,
    isAdmin,
    canEdit,
    setMemberRole,
    removeMember,
    leaveRoom,
    regenerateCode,
    openJoinModal,
    refreshMembers,
  } = useRoom();
  const { showSuccess, showError, showInfo } = useToast();

  const [isCopied, setIsCopied] = useState(false);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [isRegenConfirmOpen, setIsRegenConfirmOpen] = useState(false);
  const [memberToRemove, setMemberToRemove] = useState<{ id: string; name: string } | null>(null);
  const [isLeaveConfirmOpen, setIsLeaveConfirmOpen] = useState(false);
  const [updatingUserId, setUpdatingUserId] = useState<string | null>(null);

  if (!activeRoom) return null;

  const handleCopyCode = () => {
    navigator.clipboard.writeText(activeRoom.room_code);
    setIsCopied(true);
    showSuccess(`Room code ${activeRoom.room_code} copied to clipboard!`, 'Copied');
    setTimeout(() => setIsCopied(false), 2500);
  };

  const handleRegenerate = async () => {
    setIsRegenerating(true);
    try {
      const newCode = await regenerateCode();
      if (newCode) {
        showSuccess(`New Room Code generated: ${newCode}`, 'Code Updated');
        setIsRegenConfirmOpen(false);
      } else {
        showError('Failed to regenerate code.', 'Error');
      }
    } catch (err: any) {
      showError(err?.message || 'Failed to regenerate code.');
    } finally {
      setIsRegenerating(false);
    }
  };

  const handleRoleChange = async (userId: string, newRole: 'admin' | 'viewer') => {
    setUpdatingUserId(userId);
    try {
      const ok = await setMemberRole(userId, newRole);
      if (ok) {
        showSuccess(
          `Member role changed to ${newRole === 'admin' ? 'Admin (Full Control)' : 'View-only'}.`,
          'Role Updated'
        );
      } else {
        showError('Could not update member role.', 'Permission Denied');
      }
    } catch (err: any) {
      showError(err?.message || 'Error updating role.');
    } finally {
      setUpdatingUserId(null);
    }
  };

  const handleConfirmRemove = async () => {
    if (!memberToRemove) return;
    try {
      const ok = await removeMember(memberToRemove.id);
      if (ok) {
        showSuccess(`Removed ${memberToRemove.name} from room.`, 'Member Removed');
      } else {
        showError('Could not remove member.', 'Error');
      }
    } catch (err: any) {
      showError(err?.message || 'Failed to remove member.');
    } finally {
      setMemberToRemove(null);
    }
  };

  const handleConfirmLeave = async () => {
    try {
      const ok = await leaveRoom(activeRoom.room_id);
      if (ok) {
        showInfo(`Left ${activeRoom.room_name}. Switched back to your Main Room.`, 'Left Room');
        setIsLeaveConfirmOpen(false);
      }
    } catch (err: any) {
      showError(err?.message || 'Failed to leave room.');
    }
  };

  return (
    <Card
      id="room-members-section"
      sx={{
        p: { xs: 2.5, sm: 3.5 },
        borderRadius: 3,
        bgcolor: (theme) => (theme.palette.mode === 'dark' ? '#131518' : '#ffffff'),
        border: '1px solid',
        borderColor: (theme) =>
          theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.08)',
        boxShadow: (theme) =>
          theme.palette.mode === 'dark'
            ? '0 8px 32px rgba(0, 0, 0, 0.4)'
            : '0 4px 20px rgba(0, 0, 0, 0.04)',
      }}
    >
      {/* Header Bar */}
      <Box
        sx={{
          display: 'flex',
          alignItems: { xs: 'flex-start', sm: 'center' },
          justifyContent: 'space-between',
          flexDirection: { xs: 'column', sm: 'row' },
          gap: 2,
          mb: 3,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.75 }}>
          <Box
            sx={{
              width: 44,
              height: 44,
              borderRadius: 2,
              bgcolor: 'rgba(0, 229, 201, 0.12)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'primary.main',
            }}
          >
            <GroupsIcon sx={{ fontSize: 24 }} />
          </Box>
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 800, fontSize: '1.15rem', lineHeight: 1.2 }}>
              Room Sharing & Multi-User Access
            </Typography>
            <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mt: 0.25 }}>
              Share this room code with others to grant Admin or View-Only access
            </Typography>
          </Box>
        </Box>

        <Button
          variant="contained"
          onClick={openJoinModal}
          startIcon={<AddIcon />}
          sx={{
            borderRadius: 2,
            textTransform: 'none',
            fontWeight: 700,
            fontSize: '0.85rem',
            px: 2.5,
            py: 1,
            bgcolor: 'primary.main',
            color: '#0a1917',
            '&:hover': {
              bgcolor: '#00cbb2',
            },
          }}
        >
          Join With Code
        </Button>
      </Box>

      {/* Room Code Showcase Box */}
      <Box
        sx={{
          p: 2.5,
          borderRadius: 2.5,
          bgcolor: (theme) =>
            theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.03)' : 'rgba(0, 0, 0, 0.02)',
          border: '1px solid',
          borderColor: (theme) =>
            theme.palette.mode === 'dark' ? 'rgba(0, 229, 201, 0.2)' : 'rgba(0, 229, 201, 0.3)',
          display: 'flex',
          alignItems: { xs: 'flex-start', sm: 'center' },
          justifyContent: 'space-between',
          flexDirection: { xs: 'column', sm: 'row' },
          gap: 2,
          mb: 3,
        }}
      >
        <Box>
          <Typography variant="caption" sx={{ color: 'text.secondary', textTransform: 'uppercase', fontWeight: 800, letterSpacing: '0.08em' }}>
            Active Room ({activeRoom.room_name})
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mt: 0.5 }}>
            <KeyIcon sx={{ color: 'primary.main', fontSize: 24 }} />
            <Typography
              variant="h5"
              sx={{
                fontFamily: 'monospace',
                fontWeight: 900,
                letterSpacing: '0.12em',
                color: 'primary.main',
              }}
            >
              {activeRoom.room_code}
            </Typography>
          </Box>
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Button
            variant="outlined"
            onClick={handleCopyCode}
            startIcon={isCopied ? <CheckIcon sx={{ color: '#34d399' }} /> : <CopyIcon />}
            size="small"
            sx={{
              textTransform: 'none',
              fontWeight: 700,
              borderRadius: 1.5,
              borderColor: isCopied ? '#34d399' : 'divider',
              color: isCopied ? '#34d399' : 'text.primary',
            }}
          >
            {isCopied ? 'Copied' : 'Copy Code'}
          </Button>

          {isOwner && (
            <Tooltip title="Regenerate room code (invalidates previous code for new joins)">
              <Button
                variant="outlined"
                color="warning"
                onClick={() => setIsRegenConfirmOpen(true)}
                startIcon={<RefreshIcon />}
                size="small"
                sx={{
                  textTransform: 'none',
                  fontWeight: 700,
                  borderRadius: 1.5,
                }}
              >
                Regenerate
              </Button>
            </Tooltip>
          )}

          {!isOwner && (
            <Button
              variant="outlined"
              color="error"
              onClick={() => setIsLeaveConfirmOpen(true)}
              startIcon={<LeaveIcon />}
              size="small"
              sx={{
                textTransform: 'none',
                fontWeight: 700,
                borderRadius: 1.5,
              }}
            >
              Leave Room
            </Button>
          )}
        </Box>
      </Box>

      {/* Members Table */}
      <TableContainer
        sx={{
          borderRadius: 2,
          border: '1px solid',
          borderColor: (theme) =>
            theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.08)',
          mb: 3,
        }}
      >
        <Table sx={{ minWidth: 600 }}>
          <TableHead
            sx={{
              bgcolor: (theme) =>
                theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.02)' : 'rgba(0, 0, 0, 0.02)',
            }}
          >
            <TableRow>
              <TableCell sx={{ fontWeight: 800, fontSize: '0.72rem', letterSpacing: '0.05em', color: 'text.secondary' }}>
                MEMBER
              </TableCell>
              <TableCell sx={{ fontWeight: 800, fontSize: '0.72rem', letterSpacing: '0.05em', color: 'text.secondary' }}>
                EMAIL
              </TableCell>
              <TableCell sx={{ fontWeight: 800, fontSize: '0.72rem', letterSpacing: '0.05em', color: 'text.secondary' }}>
                ROLE & PERMISSIONS
              </TableCell>
              <TableCell sx={{ fontWeight: 800, fontSize: '0.72rem', letterSpacing: '0.05em', color: 'text.secondary' }}>
                STATUS
              </TableCell>
              <TableCell align="right" sx={{ fontWeight: 800, fontSize: '0.72rem', letterSpacing: '0.05em', color: 'text.secondary' }}>
                ACTIONS
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {members.map((m) => {
              const isMemberOwner = m.is_owner || m.role === 'owner';
              const canModifyThisUser = (isOwner || isAdmin) && !isMemberOwner;

              return (
                <TableRow
                  key={m.user_id}
                  sx={{
                    '&:last-child td, &:last-child th': { border: 0 },
                    '&:hover': {
                      bgcolor: (theme) =>
                        theme.palette.mode === 'dark'
                          ? 'rgba(255, 255, 255, 0.02)'
                          : 'rgba(0, 0, 0, 0.015)',
                    },
                  }}
                >
                  {/* Member Name + Avatar */}
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                      <Avatar
                        sx={{
                          width: 32,
                          height: 32,
                          bgcolor: isMemberOwner
                            ? 'primary.main'
                            : m.role === 'admin'
                            ? '#34d399'
                            : '#f59e0b',
                          color: '#0a1917',
                          fontWeight: 800,
                          fontSize: '0.85rem',
                        }}
                      >
                        {(m.display_name || 'U').charAt(0).toUpperCase()}
                      </Avatar>
                      <Box>
                        <Typography variant="body2" sx={{ fontWeight: 700 }}>
                          {m.display_name}
                        </Typography>
                        {isMemberOwner && (
                          <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', fontSize: '0.7rem' }}>
                            Room Creator
                          </Typography>
                        )}
                      </Box>
                    </Box>
                  </TableCell>

                  {/* Email */}
                  <TableCell>
                    <Typography variant="body2" sx={{ color: 'text.secondary', fontSize: '0.825rem' }}>
                      {m.email || '—'}
                    </Typography>
                  </TableCell>

                  {/* Role Dropdown / Badge */}
                  <TableCell>
                    {isMemberOwner ? (
                      <Chip
                        icon={<ShieldIcon sx={{ fontSize: '15px !important', color: '#fbbf24' }} />}
                        label="Room Owner (Full Access)"
                        size="small"
                        sx={{
                          bgcolor: 'rgba(251, 191, 36, 0.12)',
                          color: '#fbbf24',
                          border: '1px solid rgba(251, 191, 36, 0.3)',
                          fontWeight: 700,
                          fontSize: '0.75rem',
                        }}
                      />
                    ) : canModifyThisUser ? (
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Select
                          size="small"
                          value={m.role === 'admin' ? 'admin' : 'viewer'}
                          disabled={updatingUserId === m.user_id}
                          onChange={(e: SelectChangeEvent) =>
                            handleRoleChange(m.user_id, e.target.value as 'admin' | 'viewer')
                          }
                          sx={{
                            fontSize: '0.78rem',
                            fontWeight: 700,
                            borderRadius: 1.5,
                            height: 32,
                            minWidth: 160,
                            bgcolor: (theme) =>
                              m.role === 'admin'
                                ? 'rgba(52, 211, 153, 0.1)'
                                : 'rgba(245, 158, 11, 0.1)',
                            borderColor:
                              m.role === 'admin'
                                ? 'rgba(52, 211, 153, 0.3)'
                                : 'rgba(245, 158, 11, 0.3)',
                            color: m.role === 'admin' ? '#34d399' : '#f59e0b',
                          }}
                        >
                          <MenuItem value="admin" sx={{ fontSize: '0.8rem', fontWeight: 700 }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <ShieldIcon sx={{ fontSize: 16, color: '#34d399' }} />
                              Admin (Full Control)
                            </Box>
                          </MenuItem>
                          <MenuItem value="viewer" sx={{ fontSize: '0.8rem', fontWeight: 700 }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <VisibilityIcon sx={{ fontSize: 16, color: '#f59e0b' }} />
                              View-only (Read Only)
                            </Box>
                          </MenuItem>
                        </Select>
                        {updatingUserId === m.user_id && <CircularProgress size={16} />}
                      </Box>
                    ) : (
                      <Chip
                        icon={
                          m.role === 'admin' ? (
                            <ShieldIcon sx={{ fontSize: '15px !important', color: '#34d399' }} />
                          ) : (
                            <VisibilityIcon sx={{ fontSize: '15px !important', color: '#f59e0b' }} />
                          )
                        }
                        label={m.role === 'admin' ? 'Admin' : 'View-only'}
                        size="small"
                        sx={{
                          bgcolor:
                            m.role === 'admin'
                              ? 'rgba(52, 211, 153, 0.12)'
                              : 'rgba(245, 158, 11, 0.12)',
                          color: m.role === 'admin' ? '#34d399' : '#f59e0b',
                          fontWeight: 700,
                        }}
                      />
                    )}
                  </TableCell>

                  {/* Status */}
                  <TableCell>
                    <Typography variant="body2" sx={{ color: '#34d399', fontWeight: 700, fontSize: '0.8rem' }}>
                      Active
                    </Typography>
                  </TableCell>

                  {/* Actions */}
                  <TableCell align="right">
                    {isMemberOwner ? (
                      <Typography variant="caption" sx={{ fontStyle: 'italic', color: 'text.secondary' }}>
                        Primary Admin
                      </Typography>
                    ) : canModifyThisUser ? (
                      <Tooltip title="Remove member from this room">
                        <IconButton
                          size="small"
                          color="error"
                          onClick={() => setMemberToRemove({ id: m.user_id, name: m.display_name })}
                          sx={{
                            '&:hover': { bgcolor: 'rgba(239, 68, 68, 0.12)' },
                          }}
                        >
                          <DeleteIcon sx={{ fontSize: 18 }} />
                        </IconButton>
                      </Tooltip>
                    ) : (
                      <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                        —
                      </Typography>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Permission Matrix (Replicating Screenshot 2 Matrix) */}
      <Box
        sx={{
          p: 2.5,
          borderRadius: 2.5,
          bgcolor: (theme) =>
            theme.palette.mode === 'dark' ? 'rgba(0, 229, 201, 0.03)' : 'rgba(0, 229, 201, 0.04)',
          border: '1px solid',
          borderColor: (theme) =>
            theme.palette.mode === 'dark' ? 'rgba(0, 229, 201, 0.35)' : 'rgba(0, 229, 201, 0.4)',
        }}
      >
        <Typography
          variant="overline"
          sx={{
            fontWeight: 800,
            color: 'primary.main',
            letterSpacing: '0.08em',
            display: 'block',
            mb: 1.5,
          }}
        >
          ROOM PERMISSION MATRIX
        </Typography>

        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 3 }}>
          {/* Admin Column */}
          <Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.75 }}>
              <CheckIcon sx={{ color: 'primary.main', fontSize: 18 }} />
              <Typography variant="body2" sx={{ fontWeight: 800, color: 'text.primary' }}>
                Room Admin (Full Control)
              </Typography>
            </Box>
            <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', lineHeight: 1.5, pl: 3.25 }}>
              Complete access to ALL features: add/edit/delete appliances, configure custom spaces,
              manage schedules, run AI Scanner, export CSV reports, and update member roles.
            </Typography>
          </Box>

          {/* View-Only Column */}
          <Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.75 }}>
              <CheckIcon sx={{ color: '#f59e0b', fontSize: 18 }} />
              <Typography variant="body2" sx={{ fontWeight: 800, color: 'text.primary' }}>
                View-Only Guest (Read Only)
              </Typography>
            </Box>
            <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', lineHeight: 1.5, pl: 3.25 }}>
              Can view real-time grid demand gauges, Meralco bill projections, Smart Calendar schedules,
              and PELP certified inventory. <strong>Restricted from adding, modifying, toggling, or deleting any appliances.</strong>
            </Typography>
          </Box>
        </Box>
      </Box>

      {/* Confirm Remove Dialog */}
      <Dialog
        open={Boolean(memberToRemove)}
        onClose={() => setMemberToRemove(null)}
        maxWidth="xs"
        fullWidth
        slotProps={{ paper: { sx: { borderRadius: 3, p: 1 } } }}
      >
        <DialogTitle sx={{ fontWeight: 800 }}>Remove Member?</DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            Are you sure you want to remove <strong>{memberToRemove?.name}</strong> from this room?
            They will lose access to its appliances and telemetry immediately.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setMemberToRemove(null)} sx={{ textTransform: 'none', fontWeight: 600 }}>
            Cancel
          </Button>
          <Button
            variant="contained"
            color="error"
            onClick={handleConfirmRemove}
            sx={{ textTransform: 'none', fontWeight: 700, borderRadius: 1.5 }}
          >
            Remove Member
          </Button>
        </DialogActions>
      </Dialog>

      {/* Confirm Regenerate Dialog */}
      <Dialog
        open={isRegenConfirmOpen}
        onClose={() => setIsRegenConfirmOpen(false)}
        maxWidth="xs"
        fullWidth
        slotProps={{ paper: { sx: { borderRadius: 3, p: 1 } } }}
      >
        <DialogTitle sx={{ fontWeight: 800 }}>Regenerate Room Code?</DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            Generating a new room code will make the current code (
            <strong>{activeRoom.room_code}</strong>) invalid for new members. Existing members already
            in the room will remain unaffected.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setIsRegenConfirmOpen(false)} disabled={isRegenerating} sx={{ textTransform: 'none', fontWeight: 600 }}>
            Cancel
          </Button>
          <Button
            variant="contained"
            color="warning"
            onClick={handleRegenerate}
            disabled={isRegenerating}
            startIcon={isRegenerating ? <CircularProgress size={16} /> : <RefreshIcon />}
            sx={{ textTransform: 'none', fontWeight: 700, borderRadius: 1.5 }}
          >
            {isRegenerating ? 'Generating...' : 'Regenerate'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Confirm Leave Dialog */}
      <Dialog
        open={isLeaveConfirmOpen}
        onClose={() => setIsLeaveConfirmOpen(false)}
        maxWidth="xs"
        fullWidth
        slotProps={{ paper: { sx: { borderRadius: 3, p: 1 } } }}
      >
        <DialogTitle sx={{ fontWeight: 800 }}>Leave Room?</DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            Are you sure you want to leave <strong>{activeRoom.room_name}</strong>? You will return to
            your own Main Room.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setIsLeaveConfirmOpen(false)} sx={{ textTransform: 'none', fontWeight: 600 }}>
            Cancel
          </Button>
          <Button
            variant="contained"
            color="error"
            onClick={handleConfirmLeave}
            sx={{ textTransform: 'none', fontWeight: 700, borderRadius: 1.5 }}
          >
            Leave Room
          </Button>
        </DialogActions>
      </Dialog>
    </Card>
  );
};
