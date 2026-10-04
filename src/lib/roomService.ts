import { supabaseClient } from './supabaseClient';
import { RoomSummary, RoomMember, RoomRole } from '../types';
import { devLog } from './devLogger';

export interface UserBasicInfo {
  id: string;
  name: string;
  email: string;
}

/**
 * Clean up legacy temporary household localStorage keys from 3.6.0
 */
export function cleanupLegacyHouseholdStorage(): void {
  if (typeof window === 'undefined') return;
  try {
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (
        key &&
        (key.startsWith('powerforecast_household_') ||
          key.startsWith('powerforecast_pending_appliances_'))
      ) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach((k) => localStorage.removeItem(k));
  } catch (err) {
    devLog.warn('RoomService', 'Failed cleaning legacy household storage', err);
  }
}

/**
 * Ensures the authenticated user has their primary owned room ("<<Username>>'s Room").
 */
export async function getOrCreateMyRoom(displayName?: string): Promise<RoomSummary | null> {
  try {
    const { data: authData } = await supabaseClient.auth.getSession();
    if (!authData?.session?.user) {
      devLog.info('RoomService', 'getOrCreateMyRoom skipped: no active authenticated session.');
      return null;
    }

    const { data, error } = await supabaseClient.rpc('get_or_create_my_room', {
      p_display_name: displayName || null,
    });

    if (error) {
      if (error.code === 'P0001' && error.message?.includes('Not authenticated')) {
        devLog.warn('RoomService', 'get_or_create_my_room skipped: user session not established.');
        return null;
      }
      devLog.error('RoomService', 'get_or_create_my_room error:', error);
      return null;
    }

    if (data) {
      return {
        room_id: data.id,
        room_name: data.name,
        room_code: data.code,
        owner_id: data.owner_id,
        owner_name: displayName || 'You',
        owner_email: '',
        role: 'owner',
        is_owner: true,
        created_at: data.created_at,
      };
    }
    return null;
  } catch (err) {
    devLog.error('RoomService', 'Unexpected error in getOrCreateMyRoom:', err);
    return null;
  }
}

/**
 * Joins a room by entering its 6-character room code (e.g. PF-XXXXXX).
 */
export async function joinRoomByCode(
  code: string,
  displayName?: string,
  email?: string
): Promise<{ success: boolean; message: string; room?: RoomSummary }> {
  try {
    const cleanCode = (code || '').trim().toUpperCase();
    if (!cleanCode) {
      return { success: false, message: 'Please enter a valid room code.' };
    }

    const { data, error } = await supabaseClient.rpc('join_room_by_code', {
      p_code: cleanCode,
      p_display_name: displayName || null,
      p_email: email || null,
    });

    if (error) {
      devLog.error('RoomService', 'join_room_by_code error:', error);
      return { success: false, message: error.message || 'Failed to join room.' };
    }

    if (!data.success) {
      return { success: false, message: data.message || 'Failed to join room.' };
    }

    const rawRoom = data.room;
    const roomSummary: RoomSummary = {
      room_id: rawRoom.id,
      room_name: rawRoom.name,
      room_code: rawRoom.code,
      owner_id: rawRoom.owner_id,
      owner_name: 'Room Owner',
      owner_email: '',
      role: (data.role as RoomRole) || 'viewer',
      is_owner: false,
      created_at: rawRoom.created_at,
    };

    return {
      success: true,
      message: data.message,
      room: roomSummary,
    };
  } catch (err: any) {
    devLog.error('RoomService', 'Unexpected error in joinRoomByCode:', err);
    return { success: false, message: err?.message || 'Network error occurred.' };
  }
}

/**
 * Fallback direct table query for rooms if list_my_rooms RPC is temporarily unavailable.
 */
async function fallbackListMyRooms(): Promise<RoomSummary[]> {
  try {
    const { data: authData } = await supabaseClient.auth.getUser();
    const userId = authData?.user?.id;
    if (!userId) return [];

    const { data: roomsData, error: roomsError } = await supabaseClient
      .from('rooms')
      .select('id, name, code, owner_id, created_at');

    if (roomsError || !roomsData) {
      devLog.warn('RoomService', 'fallbackListMyRooms direct select failed:', roomsError);
      return [];
    }

    const { data: membersData } = await supabaseClient
      .from('room_members')
      .select('room_id, role, joined_at')
      .eq('user_id', userId);

    const memberRoleMap = new Map<string, { role: RoomRole; joined_at: string }>();
    if (Array.isArray(membersData)) {
      membersData.forEach((m: any) => memberRoleMap.set(m.room_id, { role: m.role as RoomRole, joined_at: m.joined_at }));
    }

    return roomsData.map((r: any) => {
      const isOwner = r.owner_id === userId;
      const memberInfo = memberRoleMap.get(r.id);
      const role: RoomRole = isOwner ? 'owner' : (memberInfo?.role || 'viewer');
      return {
        room_id: r.id,
        room_name: r.name,
        room_code: r.code,
        owner_id: r.owner_id,
        owner_name: isOwner ? (authData?.user?.user_metadata?.name || 'You') : 'Owner',
        owner_email: isOwner ? (authData?.user?.email || '') : '',
        role,
        is_owner: isOwner,
        created_at: memberInfo?.joined_at || r.created_at,
      };
    }).sort((a, b) => (b.is_owner ? 1 : 0) - (a.is_owner ? 1 : 0));
  } catch (err) {
    devLog.error('RoomService', 'Unexpected error in fallbackListMyRooms:', err);
    return [];
  }
}

/**
 * Fallback direct table query for room members if list_room_members RPC fails.
 */
async function fallbackListRoomMembers(roomId: string): Promise<RoomMember[]> {
  try {
    const { data: authData } = await supabaseClient.auth.getUser();
    const currentUserId = authData?.user?.id;

    const { data: roomData } = await supabaseClient
      .from('rooms')
      .select('owner_id, created_at')
      .eq('id', roomId)
      .maybeSingle();

    const { data: membersData } = await supabaseClient
      .from('room_members')
      .select('user_id, role, display_name, email, joined_at')
      .eq('room_id', roomId);

    const members: RoomMember[] = [];
    if (roomData) {
      members.push({
        user_id: roomData.owner_id,
        display_name: roomData.owner_id === currentUserId ? (authData?.user?.user_metadata?.name || 'You (Owner)') : 'Room Owner',
        email: roomData.owner_id === currentUserId ? (authData?.user?.email || '') : '',
        role: 'owner',
        is_owner: true,
        joined_at: roomData.created_at,
      });
    }

    if (Array.isArray(membersData)) {
      membersData.forEach((m: any) => {
        members.push({
          user_id: m.user_id,
          display_name: m.display_name || 'Member',
          email: m.email || '',
          role: m.role as RoomRole,
          is_owner: false,
          joined_at: m.joined_at,
        });
      });
    }

    return members;
  } catch (err) {
    devLog.error('RoomService', 'Unexpected error in fallbackListRoomMembers:', err);
    return [];
  }
}

// In-memory circuit breakers to prevent repeated failing RPC network calls if remote SQL is unmigrated
let isListMyRoomsRpcKnownBroken = false;
let isListRoomMembersRpcKnownBroken = false;

/**
 * Fetches all rooms accessible to the authenticated user (owned + joined).
 */
export async function listMyRooms(): Promise<RoomSummary[]> {
  try {
    const { data: authData } = await supabaseClient.auth.getSession();
    if (!authData?.session?.user) {
      return [];
    }
  } catch {
    return [];
  }

  if (isListMyRoomsRpcKnownBroken) {
    return await fallbackListMyRooms();
  }

  try {
    const { data, error } = await supabaseClient.rpc('list_my_rooms');
    if (error) {
      if (error.code === 'P0001' && error.message?.includes('Not authenticated')) {
        devLog.warn('RoomService', 'list_my_rooms skipped: user not authenticated.');
        return [];
      }
      if (error.code === '42703' || error.code === '42883' || error.message?.includes('acc.name')) {
        isListMyRoomsRpcKnownBroken = true;
        devLog.info('RoomService', 'list_my_rooms RPC requires schema patch; routing to resilient direct query fallback.');
      } else {
        devLog.warn('RoomService', 'list_my_rooms RPC failed, activating resilient direct query fallback:', error);
      }
      return await fallbackListMyRooms();
    }

    if (Array.isArray(data)) {
      return data.map((item: any) => ({
        room_id: item.room_id,
        room_name: item.room_name,
        room_code: item.room_code,
        owner_id: item.owner_id,
        owner_name: item.owner_name || 'Owner',
        owner_email: item.owner_email || '',
        role: item.role as RoomRole,
        is_owner: Boolean(item.is_owner),
        created_at: item.created_at,
      }));
    }
    return [];
  } catch (err) {
    devLog.error('RoomService', 'Unexpected error in listMyRooms, attempting fallback:', err);
    return await fallbackListMyRooms();
  }
}

/**
 * Lists all members (Owner + Admins + Viewers) of a specific room.
 */
export async function listRoomMembers(roomId: string): Promise<RoomMember[]> {
  if (!roomId) return [];

  try {
    const { data: authData } = await supabaseClient.auth.getSession();
    if (!authData?.session?.user) {
      return [];
    }
  } catch {
    return [];
  }

  if (isListRoomMembersRpcKnownBroken) {
    return await fallbackListRoomMembers(roomId);
  }

  try {
    const { data, error } = await supabaseClient.rpc('list_room_members', {
      p_room_id: roomId,
    });

    if (error) {
      if (error.code === '42703' || error.code === '42883' || error.message?.includes('acc.name')) {
        isListRoomMembersRpcKnownBroken = true;
        devLog.info('RoomService', 'list_room_members RPC requires column schema patch; routing to direct fallback query.');
      } else {
        devLog.warn('RoomService', 'list_room_members RPC failed, activating direct fallback query:', error);
      }
      return await fallbackListRoomMembers(roomId);
    }

    if (Array.isArray(data)) {
      return data.map((item: any) => ({
        user_id: item.user_id,
        display_name: item.display_name || 'Member',
        email: item.email || '',
        role: item.role as RoomRole,
        is_owner: Boolean(item.is_owner),
        joined_at: item.joined_at,
      }));
    }
    return [];
  } catch (err) {
    devLog.error('RoomService', 'Unexpected error in listRoomMembers, attempting fallback:', err);
    return await fallbackListRoomMembers(roomId);
  }
}

/**
 * Updates a member's role (Admin vs View-only). Admins can manage other members (except owner).
 */
export async function setRoomMemberRole(
  roomId: string,
  targetUserId: string,
  newRole: 'admin' | 'viewer'
): Promise<{ success: boolean; message: string }> {
  try {
    const { data, error } = await supabaseClient.rpc('set_room_member_role', {
      p_room_id: roomId,
      p_target_user_id: targetUserId,
      p_new_role: newRole,
    });

    if (error) {
      return { success: false, message: error.message };
    }
    return { success: data?.success ?? true, message: data?.message || 'Role updated.' };
  } catch (err: any) {
    return { success: false, message: err?.message || 'Failed to update role.' };
  }
}

/**
 * Removes a member from a room, or allows a member to leave.
 */
export async function removeRoomMember(
  roomId: string,
  targetUserId: string
): Promise<{ success: boolean; message: string }> {
  try {
    const { data, error } = await supabaseClient.rpc('remove_room_member', {
      p_room_id: roomId,
      p_target_user_id: targetUserId,
    });

    if (error) {
      return { success: false, message: error.message };
    }
    return { success: data?.success ?? true, message: data?.message || 'Member removed.' };
  } catch (err: any) {
    return { success: false, message: err?.message || 'Failed to remove member.' };
  }
}

/**
 * Regenerates the room code. Can only be invoked by the room owner.
 */
export async function regenerateRoomCode(
  roomId: string
): Promise<{ success: boolean; code?: string; message: string }> {
  try {
    const { data, error } = await supabaseClient.rpc('regenerate_room_code', {
      p_room_id: roomId,
    });

    if (error) {
      return { success: false, message: error.message };
    }
    return {
      success: data?.success ?? false,
      code: data?.code,
      message: data?.message || 'Code regenerated.',
    };
  } catch (err: any) {
    return { success: false, message: err?.message || 'Failed to regenerate code.' };
  }
}
