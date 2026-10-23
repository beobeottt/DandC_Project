import React, { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { api } from '../../services/api';

interface RefereeInvitation {
  id: string;
  tournamentId: string;
  role: string;
  invitationStatus: 'PENDING' | 'ACCEPTED' | 'DECLINED';
  tournament?: {
    id: string;
    name: string;
    location: string;
    startAt: string;
  };
}

export const RefereeMatchesScreen = () => {
  const navigation = useNavigation<any>();
  const [invitations, setInvitations] = useState<RefereeInvitation[]>([]);
  const [loading, setLoading] = useState(true);

  const loadInvitations = useCallback(async () => {
    try {
      const response = await api.get('/users/invitations');
      setInvitations(response.data.filter((item: RefereeInvitation) => item.role === 'REFEREE'));
    } catch (error: any) {
      Alert.alert('Lỗi', error.response?.data?.message || 'Không thể tải lời mời trọng tài');
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

  const pending = invitations.filter(item => item.invitationStatus === 'PENDING');
  const accepted = invitations.filter(item => item.invitationStatus === 'ACCEPTED');

  return (
    <ScrollView className="flex-1 bg-gray-50 px-5 pt-12 pb-24">
      <Text className="text-2xl font-extrabold text-gray-900 mb-5">Lời mời trọng tài</Text>
      {pending.map(item => (
        <View key={item.id} className="bg-white rounded-2xl border border-gray-200 p-4 mb-3">
          <Text className="font-bold text-gray-900">{item.tournament?.name || 'Giải đấu'}</Text>
          <Text className="text-xs text-gray-500 mt-1">{item.tournament?.location}</Text>
          <View className="flex-row gap-2 mt-3">
            <TouchableOpacity className="bg-green-600 px-4 py-2 rounded-xl" onPress={() => respond(item.tournamentId, 'ACCEPTED')}>
              <Text className="text-white font-bold text-xs">Nhận lời</Text>
            </TouchableOpacity>
            <TouchableOpacity className="bg-gray-300 px-4 py-2 rounded-xl" onPress={() => respond(item.tournamentId, 'DECLINED')}>
              <Text className="text-gray-800 font-bold text-xs">Từ chối</Text>
            </TouchableOpacity>
          </View>
        </View>
      ))}

      <Text className="text-lg font-bold text-gray-900 mt-4 mb-3">Giải được phân công</Text>
      {accepted.map(item => (
        <TouchableOpacity
          key={item.id}
          className="bg-white rounded-2xl border border-gray-200 p-4 mb-3"
          onPress={() => navigation.navigate('TournamentDetail', {
            tournamentId: item.tournamentId,
            tournamentName: item.tournament?.name,
          })}
        >
          <Text className="font-bold text-gray-900">{item.tournament?.name || 'Giải đấu'}</Text>
          <Text className="text-xs text-gray-500 mt-1">{item.tournament?.location}</Text>
          <Text className="text-indigo-600 text-xs font-bold mt-3">Chọn trận và điều khiển trận ›</Text>
        </TouchableOpacity>
      ))}
      {pending.length === 0 && accepted.length === 0 && (
        <Text className="text-gray-500">Bạn chưa có lời mời trọng tài nào.</Text>
      )}
    </ScrollView>
  );
};
