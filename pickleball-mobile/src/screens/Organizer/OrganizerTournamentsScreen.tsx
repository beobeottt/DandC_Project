import React, { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { api } from '../../services/api';

interface TournamentManagement {
  invitedPlayers: number;
  acceptedPlayers: number;
  eligiblePlayers: number;
  playersAwaitingResponse: number;
  playersAwaitingOrganizerApproval: number;
  refereesInvited: number;
  refereesAccepted: number;
  approvalRate: number;
  confirmationThreshold: number;
  canDraw: boolean;
  eligiblePlayerList: Array<{
    memberId: string;
    fullName: string;
    gender: string | null;
    isGuest: boolean;
  }>;
  awaitingApprovalPlayerList: TournamentManagement['eligiblePlayerList'];
  awaitingResponsePlayerList: TournamentManagement['eligiblePlayerList'];
  rejectedPlayerList: TournamentManagement['eligiblePlayerList'];
}

interface ManagedTournament {
  id: string;
  name: string;
  location: string;
  startAt: string;
  status: string;
  management: TournamentManagement;
}

const statusLabels: Record<string, string> = {
  DRAFT: 'Bản nháp',
  INVITING: 'Đang mời thành viên',
  READY: 'Sẵn sàng',
  IN_PROGRESS: 'Đang diễn ra',
  COMPLETED: 'Đã kết thúc',
  CANCELLED: 'Đã hủy',
};

export const OrganizerTournamentsScreen = () => {
  const navigation = useNavigation<any>();
  const [tournaments, setTournaments] = useState<ManagedTournament[]>([]);
  const [loading, setLoading] = useState(true);

  const loadTournaments = useCallback(async () => {
    try {
      const response = await api.get('/tournament/organizer/my-tournaments');
      setTournaments(response.data);
    } catch (error: any) {
      Alert.alert('Lỗi', error.response?.data?.message || 'Không thể tải danh sách giải của bạn');
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void loadTournaments();
    }, [loadTournaments]),
  );

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-gray-50">
        <ActivityIndicator size="large" color="#4f46e5" />
        <Text className="mt-3 text-gray-500">Đang tải giải đấu...</Text>
      </View>
    );
  }

  return (
    <ScrollView className="flex-1 bg-gray-50 px-5 pt-12 pb-24">
      <View className="mb-5 flex-row items-center justify-between">
        <View className="flex-1 pr-3">
          <Text className="text-2xl font-extrabold text-gray-900">Giải của tôi</Text>
          <Text className="mt-1 text-xs text-gray-500">Mời thành viên, duyệt VĐV và theo dõi điều kiện bốc thăm.</Text>
        </View>
        <TouchableOpacity
          className="rounded-xl bg-indigo-600 px-4 py-3"
          onPress={() => navigation.navigate('CreateTournament')}
        >
          <Text className="text-xs font-bold text-white">+ Tạo giải</Text>
        </TouchableOpacity>
      </View>

      {tournaments.map(tournament => {
        const summary = tournament.management;
        return (
          <View key={tournament.id} className="mb-4 rounded-3xl border border-gray-200 bg-white p-4">
            <View className="mb-3 flex-row items-start justify-between">
              <View className="flex-1 pr-2">
                <Text className="text-base font-extrabold text-gray-900">{tournament.name}</Text>
                <Text className="mt-1 text-xs text-gray-500">{tournament.location}</Text>
                <Text className="mt-1 text-xs text-gray-500">
                  {new Date(tournament.startAt).toLocaleString('vi-VN')}
                </Text>
              </View>
              <Text className="rounded-full bg-indigo-50 px-2.5 py-1 text-[10px] font-bold text-indigo-700">
                {statusLabels[tournament.status] || tournament.status}
              </Text>
            </View>

            <View className="mb-3 flex-row flex-wrap gap-2">
              <View className="min-w-[45%] flex-1 rounded-xl bg-green-50 p-3">
                <Text className="text-[10px] text-gray-600">VĐV đủ điều kiện</Text>
                <Text className="mt-1 text-lg font-extrabold text-green-700">{summary.eligiblePlayers}</Text>
              </View>
              <View className="min-w-[45%] flex-1 rounded-xl bg-amber-50 p-3">
                <Text className="text-[10px] text-gray-600">Chờ BTC duyệt</Text>
                <Text className="mt-1 text-lg font-extrabold text-amber-700">{summary.playersAwaitingOrganizerApproval}</Text>
              </View>
              <View className="min-w-[45%] flex-1 rounded-xl bg-blue-50 p-3">
                <Text className="text-[10px] text-gray-600">Chờ phản hồi lời mời</Text>
                <Text className="mt-1 text-lg font-extrabold text-blue-700">{summary.playersAwaitingResponse}</Text>
              </View>
              <View className="min-w-[45%] flex-1 rounded-xl bg-purple-50 p-3">
                <Text className="text-[10px] text-gray-600">Trọng tài nhận lời / được mời</Text>
                <Text className="mt-1 text-lg font-extrabold text-purple-700">
                  {summary.refereesAccepted}/{summary.refereesInvited}
                </Text>
              </View>
            </View>

            <View className={`mb-3 rounded-xl p-3 ${summary.canDraw ? 'bg-green-50' : 'bg-gray-100'}`}>
              <Text className={`text-xs font-bold ${summary.canDraw ? 'text-green-800' : 'text-gray-700'}`}>
                {summary.canDraw
                  ? 'Đã đạt điều kiện bốc thăm'
                  : `Tỷ lệ duyệt ${summary.approvalRate}% · yêu cầu ${summary.confirmationThreshold}%`}
              </Text>
              <Text className="mt-1 text-[10px] text-gray-600">
                Đủ điều kiện = đã nhận lời và được BTC duyệt. Danh sách này là VĐV đủ điều kiện, chưa phải cặp thi đấu đã bốc thăm.
              </Text>
            </View>

            {summary.eligiblePlayerList.length > 0 && (
              <View className="mb-3">
                <Text className="mb-2 text-xs font-bold text-gray-800">VĐV đủ điều kiện tham gia</Text>
                {summary.eligiblePlayerList.map(player => (
                  <View key={player.memberId} className="mb-1 flex-row items-center justify-between">
                    <Text className="text-xs text-gray-700">{player.fullName}</Text>
                    <Text className="text-[10px] text-gray-500">
                      {player.isGuest ? 'VĐV khách' : 'Tài khoản'}
                      {player.gender ? ` · ${player.gender}` : ''}
                    </Text>
                  </View>
                ))}
              </View>
            )}

            {[
              { title: 'VĐV chờ Ban tổ chức duyệt', players: summary.awaitingApprovalPlayerList },
              { title: 'VĐV chưa phản hồi lời mời', players: summary.awaitingResponsePlayerList },
              { title: 'VĐV đã bị từ chối', players: summary.rejectedPlayerList },
            ].map(section => section.players.length > 0 && (
              <View key={section.title} className="mb-3 rounded-xl bg-amber-50 p-3">
                <Text className="mb-2 text-xs font-bold text-amber-900">
                  {section.title} ({section.players.length})
                </Text>
                {section.players.map(player => (
                  <Text key={player.memberId} className="mb-1 text-xs text-gray-700">
                    {player.fullName}{player.isGuest ? ' · VĐV khách' : ''}
                  </Text>
                ))}
              </View>
            ))}

            <TouchableOpacity
              className="items-center rounded-xl bg-indigo-600 py-3"
              onPress={() => navigation.navigate('TournamentSetup', { tournamentId: tournament.id })}
            >
              <Text className="text-sm font-bold text-white">Mời thành viên & duyệt đăng ký</Text>
            </TouchableOpacity>
          </View>
        );
      })}

      {tournaments.length === 0 && (
        <View className="items-center rounded-3xl border border-dashed border-gray-300 bg-white px-5 py-10">
          <Text className="mb-2 text-base font-bold text-gray-800">Bạn chưa tạo giải đấu nào</Text>
          <Text className="mb-5 text-center text-xs text-gray-500">Tạo giải đầu tiên để bắt đầu mời VĐV và trọng tài.</Text>
          <TouchableOpacity
            className="rounded-xl bg-indigo-600 px-5 py-3"
            onPress={() => navigation.navigate('CreateTournament')}
          >
            <Text className="font-bold text-white">Tạo giải đấu</Text>
          </TouchableOpacity>
        </View>
      )}
    </ScrollView>
  );
};
