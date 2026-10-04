import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
} from 'react';
import { useGetIdentity, useInvalidate } from '@refinedev/core';
import { RoomSummary, RoomMember, RoomRole } from '../types';
import {
  getOrCreateMyRoom,
  joinRoomByCode,
  listMyRooms,
  listRoomMembers,
  setRoomMemberRole,
  removeRoomMember,
  regenerateRoomCode,
  cleanupLegacyHouseholdStorage,
} from '../lib/roomService';
import { supabaseClient } from '../lib/supabaseClient';
import { devLog } from '../lib/devLogger';

interface RoomContextType {
  rooms: RoomSummary[];
  activeRoom: RoomSummary | null;
  myRoom: RoomSummary | null;
  members: RoomMember[];
  role: RoomRole;
  isOwner: boolean;
  isAdmin: boolean;
  isViewer: boolean;
  canEdit: boolean;
  isLoading: boolean;
  switchRoom: (roomId: string) => void;
  joinRoom: (code: string) => Promise<{ success: boolean; message: string }>;
  leaveRoom: (roomId: string) => Promise<boolean>;
  setMemberRole: (targetUserId: string, newRole: 'admin' | 'viewer') => Promise<boolean>;
  removeMember: (targetUserId: string) => Promise<boolean>;
  regenerateCode: () => Promise<string | null>;
  refreshRooms: () => Promise<void>;
  refreshMembers: () => Promise<void>;
  isJoinModalOpen: boolean;
  openJoinModal: () => void;
  closeJoinModal: () => void;
}

const RoomContext = createContext<RoomContextType | undefined>(undefined);

export const RoomProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { data: identity } = useGetIdentity<any>();
  const invalidate = useInvalidate();

  // Synchronously resolve current user identity (supporting offline cached user fallback)
  const resolvedUser = useMemo(() => {
    let cachedUser: any = null;
    try {
      const raw = localStorage.getItem('powerforecast_active_user');
      if (raw) cachedUser = JSON.parse(raw);
    } catch {}

    const id = identity?.id || cachedUser?.id || '';
    const email = identity?.email || cachedUser?.email || '';
    const name = identity?.name || cachedUser?.name || email.split('@')[0] || 'User';

    return { id, email, name };
  }, [identity]);

  const [rooms, setRooms] = useState<RoomSummary[]>([]);
  const [activeRoomId, setActiveRoomId] = useState<string>(() => {
    if (resolvedUser.id) {
      return localStorage.getItem(`powerforecast_active_room_${resolvedUser.id}`) || '';
    }
    return '';
  });
  const [members, setMembers] = useState<RoomMember[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isJoinModalOpen, setIsJoinModalOpen] = useState<boolean>(false);

  // Clean up legacy 3.6.0 storage on mount
  useEffect(() => {
    cleanupLegacyHouseholdStorage();
  }, []);

  // Fetch or create user's rooms
  const refreshRooms = useCallback(async () => {
    if (!resolvedUser.id) return;

    try {
      const { data: authData } = await supabaseClient.auth.getSession();
      if (!authData?.session?.user) {
        setIsLoading(false);
        return;
      }
    } catch {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);

    try {
      // 1. Ensure user has their primary room
      await getOrCreateMyRoom(resolvedUser.name);

      // 2. Fetch all accessible rooms
      const allRooms = await listMyRooms();
      setRooms(allRooms);

      // 3. Resolve active room
      const savedActiveId = localStorage.getItem(`powerforecast_active_room_${resolvedUser.id}`);
      const matched = allRooms.find((r) => r.room_id === savedActiveId);

      if (matched) {
        setActiveRoomId(matched.room_id);
        localStorage.setItem(`powerforecast_active_room_owner_${resolvedUser.id}`, matched.owner_id);
        localStorage.setItem(`powerforecast_active_room_role_${resolvedUser.id}`, matched.role);
      } else if (allRooms.length > 0) {
        // Default to owned room if available, otherwise first room
        const owned = allRooms.find((r) => r.is_owner) || allRooms[0];
        setActiveRoomId(owned.room_id);
        localStorage.setItem(`powerforecast_active_room_${resolvedUser.id}`, owned.room_id);
        localStorage.setItem(`powerforecast_active_room_owner_${resolvedUser.id}`, owned.owner_id);
        localStorage.setItem(`powerforecast_active_room_role_${resolvedUser.id}`, owned.role);
      }
    } catch (err) {
      devLog.error('RoomContext', 'Failed to refresh rooms:', err);
    } finally {
      setIsLoading(false);
    }
  }, [resolvedUser.id, resolvedUser.name]);

  // Initial load when user changes
  useEffect(() => {
    if (resolvedUser.id) {
      refreshRooms();
    } else {
      setRooms([]);
      setActiveRoomId('');
      setMembers([]);
      setIsLoading(false);
    }
  }, [resolvedUser.id, refreshRooms]);

  // Find active room object
  const activeRoom = useMemo(() => {
    if (!rooms.length) return null;
    return rooms.find((r) => r.room_id === activeRoomId) || rooms.find((r) => r.is_owner) || rooms[0];
  }, [rooms, activeRoomId]);

  // Find user's own room
  const myRoom = useMemo(() => {
    return rooms.find((r) => r.is_owner) || null;
  }, [rooms]);

  // Fetch members for currently active room
  const refreshMembers = useCallback(async () => {
    if (!activeRoom?.room_id) {
      setMembers([]);
      return;
    }
    try {
      const list = await listRoomMembers(activeRoom.room_id);
      setMembers(list);
    } catch (err) {
      devLog.error('RoomContext', 'Failed to fetch members:', err);
    }
  }, [activeRoom?.room_id]);

  useEffect(() => {
    refreshMembers();
  }, [refreshMembers]);

  // Subscribe to Supabase Realtime for instant room member updates
  useEffect(() => {
    if (!activeRoom?.room_id) return;

    const channel = supabaseClient
      .channel(`room_updates_${activeRoom.room_id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'room_members',
          filter: `room_id=eq.${activeRoom.room_id}`,
        },
        () => {
          refreshMembers();
          refreshRooms();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'rooms',
          filter: `id=eq.${activeRoom.room_id}`,
        },
        () => {
          refreshRooms();
        }
      )
      .subscribe();

    return () => {
      supabaseClient.removeChannel(channel);
    };
  }, [activeRoom?.room_id, refreshMembers, refreshRooms]);

  // Switch active room
  const switchRoom = useCallback(
    (roomId: string) => {
      const target = rooms.find((r) => r.room_id === roomId);
      if (!target) return;

      setActiveRoomId(target.room_id);
      if (resolvedUser.id) {
        localStorage.setItem(`powerforecast_active_room_${resolvedUser.id}`, target.room_id);
        localStorage.setItem(`powerforecast_active_room_owner_${resolvedUser.id}`, target.owner_id);
        localStorage.setItem(`powerforecast_active_room_role_${resolvedUser.id}`, target.role);
      }

      // Invalidate all query caches in Refine / React Query so active queries refetch for the new room owner
      try {
        invalidate({
          invalidates: ["all"],
        });
      } catch (e) {
        devLog.warn('RoomContext', 'Could not invalidate all queries on room switch:', e);
      }

      // Dispatch global window event to trigger data refetch
      window.dispatchEvent(
        new CustomEvent('powerforecast_room_changed', {
          detail: { roomId: target.room_id, ownerId: target.owner_id, role: target.role },
        })
      );
    },
    [rooms, resolvedUser.id, invalidate]
  );

  // Join room by code
  const handleJoinRoom = async (
    code: string
  ): Promise<{ success: boolean; message: string }> => {
    const res = await joinRoomByCode(code, resolvedUser.name, resolvedUser.email);
    if (res.success && res.room) {
      await refreshRooms();
      switchRoom(res.room.room_id);
    }
    return res;
  };

  // Leave a room
  const handleLeaveRoom = async (roomId: string): Promise<boolean> => {
    if (!resolvedUser.id) return false;
    const res = await removeRoomMember(roomId, resolvedUser.id);
    if (res.success) {
      // Revert to own room
      if (myRoom) {
        switchRoom(myRoom.room_id);
      }
      await refreshRooms();
      return true;
    }
    return false;
  };

  // Manage member role
  const handleSetMemberRole = async (
    targetUserId: string,
    newRole: 'admin' | 'viewer'
  ): Promise<boolean> => {
    if (!activeRoom) return false;
    const res = await setRoomMemberRole(activeRoom.room_id, targetUserId, newRole);
    if (res.success) {
      await refreshMembers();
      return true;
    }
    return false;
  };

  // Remove a member
  const handleRemoveMember = async (targetUserId: string): Promise<boolean> => {
    if (!activeRoom) return false;
    const res = await removeRoomMember(activeRoom.room_id, targetUserId);
    if (res.success) {
      await refreshMembers();
      return true;
    }
    return false;
  };

  // Regenerate room code
  const handleRegenerateCode = async (): Promise<string | null> => {
    if (!activeRoom || !activeRoom.is_owner) return null;
    const res = await regenerateRoomCode(activeRoom.room_id);
    if (res.success && res.code) {
      await refreshRooms();
      return res.code;
    }
    return null;
  };

  // Permissions and Role calculations
  const role: RoomRole = activeRoom?.role || 'owner';
  const isOwner = Boolean(activeRoom?.is_owner || role === 'owner');
  const isAdmin = isOwner || role === 'admin';
  const isViewer = role === 'viewer';
  const canEdit = isOwner || isAdmin;

  return (
    <RoomContext.Provider
      value={{
        rooms,
        activeRoom,
        myRoom,
        members,
        role,
        isOwner,
        isAdmin,
        isViewer,
        canEdit,
        isLoading,
        switchRoom,
        joinRoom: handleJoinRoom,
        leaveRoom: handleLeaveRoom,
        setMemberRole: handleSetMemberRole,
        removeMember: handleRemoveMember,
        regenerateCode: handleRegenerateCode,
        refreshRooms,
        refreshMembers,
        isJoinModalOpen,
        openJoinModal: () => setIsJoinModalOpen(true),
        closeJoinModal: () => setIsJoinModalOpen(false),
      }}
    >
      {children}
    </RoomContext.Provider>
  );
};

export const useRoom = (): RoomContextType => {
  const context = useContext(RoomContext);
  if (!context) {
    throw new Error('useRoom must be used within a RoomProvider');
  }
  return context;
};
