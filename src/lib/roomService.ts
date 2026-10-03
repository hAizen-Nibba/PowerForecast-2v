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
    const { data, error } = await supabaseClient.rpc('get_or_create_my_room', {
      p_display_name: displayName || null,
    });

    if (error) {
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
 * Fetches all rooms accessible to the authenticated user (owned + joined).
 */
export async function listMyRooms(): Promise<RoomSummary[]> {
  try {
    const { data, error } = await supabaseClient.rpc('list_my_rooms');
    if (error) {
      devLog.error('RoomService', 'list_my_rooms error:', error);
      return [];
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
    devLog.error('RoomService', 'Unexpected error in listMyRooms:', err);
    return [];
  }
}

/**
 * Lists all members (Owner + Admins + Viewers) of a specific room.
 */
export async function listRoomMembers(roomId: string): Promise<RoomMember[]> {
  if (!roomId) return [];
  try {
    const { data, error } = await supabaseClient.rpc('list_room_members', {
      p_room_id: roomId,
    });

    if (error) {
      devLog.error('RoomService', 'list_room_members error:', error);
      return [];
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
    devLog.error('RoomService', 'Unexpected error in listRoomMembers:', err);
    return [];
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
