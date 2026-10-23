import React, { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { api } from '../../services/api';

interface PlayerInvitation {
  id: string;
  tournamentId: string;
  role: string;
  invitationStatus: 'PENDING' | 'ACCEPTED' | 'DECLINED';
  organizerApprovalStatus: 'PENDING' | 'APPROVED' | 'REJECTED';
  tournament?: {
    name: string;
    location: string;
    startAt: string;
  };
}

export const TournamentInvitationsScreen = () => {
  const [invitations, setInvitations] = useState<PlayerInvitation[]>([]);
  const [loading, setLoading] = useState(true);

  const loadInvitations = useCallback(async () => {
    try {
      const response = await api.get('/users/invitations');
      setInvitations(response.data.filter((item: PlayerInvitation) => item.role === 'PLAYER'));
    } catch (error: any) {
      Alert.alert('Lỗi', error.response?.data?.message || 'Không thể tải lời mời giải đấu');
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void loadInvitations();
    }, [loadInvitations]),
  );

  const respond = async (tournamentId: string, status: 'ACCEPTED' | 'DECLINED') => {
    try {
      await api.patch(`/tournament/${tournamentId}/response`, { status });
      await loadInvitations();
    } catch (error: any) {
      Alert.alert('Lỗi', error.response?.data?.message || 'Không thể phản hồi lời mời');
    }
  };

  if (loading) {
    return <View className="flex-1 items-center justify-center"><ActivityIndicator color="#4f46e5" /></View>;
  }

  return (
    <ScrollView className="flex-1 bg-gray-50 px-5 pt-12 pb-24">
      <Text className="text-2xl font-extrabold text-gray-900 mb-5">Lời mời tham gia giải</Text>
      {invitations.map(invitation => (
        <View key={invitation.id} className="bg-white rounded-2xl border border-gray-200 p-4 mb-3">
          <Text className="font-bold text-gray-900">{invitation.tournament?.name || 'Giải đấu'}</Text>
          <Text className="text-xs text-gray-500 mt-1">{invitation.tournament?.location}</Text>
          {invitation.invitationStatus === 'PENDING' ? (
            <View className="flex-row gap-2 mt-3">
              <TouchableOpacity className="bg-green-600 px-4 py-2 rounded-xl" onPress={() => respond(invitation.tournamentId, 'ACCEPTED')}>
                <Text className="text-white font-bold text-xs">Nhận lời</Text>
              </TouchableOpacity>
              <TouchableOpacity className="bg-gray-300 px-4 py-2 rounded-xl" onPress={() => respond(invitation.tournamentId, 'DECLINED')}>
                <Text className="text-gray-800 font-bold text-xs">Từ chối</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <Text className="text-xs text-indigo-700 font-semibold mt-3">
              {invitation.invitationStatus === 'DECLINED'
                ? 'Đã từ chối lời mời'
                : invitation.organizerApprovalStatus === 'APPROVED'
                  ? 'Đã được Ban tổ chức duyệt'
                  : invitation.organizerApprovalStatus === 'REJECTED'
                    ? 'Ban tổ chức chưa duyệt tham gia'
                    : 'Đã nhận lời — đang chờ Ban tổ chức duyệt'}
            </Text>
          )}
        </View>
      ))}
      {invitations.length === 0 && <Text className="text-gray-500">Bạn chưa có lời mời tham gia giải nào.</Text>}
    </ScrollView>
  );
};
