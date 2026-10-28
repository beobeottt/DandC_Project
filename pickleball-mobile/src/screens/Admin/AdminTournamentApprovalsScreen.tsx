import React, { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, Image, Modal, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { api } from '../../services/api';

interface TournamentApproval {
  id: string;
  name: string;
  location: string;
  coverImageUrl: string | null;
  description: string | null;
  startAt: string;
  endAt: string | null;
  awardTypes: string[];
  feePerPlayer: number;
  championPrizeMoney: number;
  contactLink: string | null;
  formatDetails: Array<{ format: string; maxPlayers: number }>;
  competition_Type: string;
  bracket_Type: string;
  organizer: { fullName: string; email: string } | null;
}

export const AdminTournamentApprovalsScreen = () => {
  const [tournaments, setTournaments] = useState<TournamentApproval[]>([]);
  const [loading, setLoading] = useState(true);
  const [workingId, setWorkingId] = useState<string | null>(null);
  const [rejecting, setRejecting] = useState<TournamentApproval | null>(null);
  const [reason, setReason] = useState('');

  const loadApprovals = useCallback(async () => {
    try {
      const response = await api.get('/tournament/admin/approvals');
      setTournaments(response.data);
    } catch (error: any) {
      Alert.alert('Lỗi', error.response?.data?.message || 'Không thể tải danh sách giải chờ duyệt');
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => {
    void loadApprovals();
  }, [loadApprovals]));

  const decide = async (tournament: TournamentApproval, status: 'APPROVED' | 'REJECTED', rejectionReason?: string) => {
    setWorkingId(tournament.id);
    try {
      await api.patch(`/tournament/admin/${tournament.id}/approval`, {
        status,
        ...(rejectionReason ? { reason: rejectionReason } : {}),
      });
      setRejecting(null);
      setReason('');
      await loadApprovals();
    } catch (error: any) {
      Alert.alert('Lỗi', error.response?.data?.message || 'Không thể xử lý yêu cầu duyệt giải');
    } finally {
      setWorkingId(null);
    }
  };

  if (loading) {
    return <View className="flex-1 items-center justify-center"><ActivityIndicator color="#4f46e5" /></View>;
  }

  return (
    <>
      <ScrollView className="flex-1 bg-gray-50 px-5 pt-12 pb-24">
        <Text className="mb-1 text-2xl font-extrabold text-gray-900">Duyệt giải đấu</Text>
        <Text className="mb-5 text-xs text-gray-500">Giải chỉ được công khai và nhận đăng ký sau khi được duyệt.</Text>
        {tournaments.map(tournament => (
          <View key={tournament.id} className="mb-4 rounded-2xl border border-gray-200 bg-white p-4">
            {tournament.coverImageUrl && (
              <Image
                source={{ uri: `${api.defaults.baseURL}${tournament.coverImageUrl}` }}
                className="mb-3 h-40 w-full rounded-xl"
                resizeMode="cover"
              />
            )}
            <Text className="text-base font-extrabold text-gray-900">{tournament.name}</Text>
            <Text className="mt-1 text-xs text-gray-600">BTC: {tournament.organizer?.fullName || 'Không rõ'}</Text>
            <Text className="text-xs text-gray-500">{tournament.organizer?.email || ''}</Text>
            <Text className="mt-3 text-xs text-gray-700">
              {tournament.location} · {new Date(tournament.startAt).toLocaleString('vi-VN')}
              {tournament.endAt ? ` – ${new Date(tournament.endAt).toLocaleString('vi-VN')}` : ''}
            </Text>
            <Text className="mt-1 text-xs text-gray-500">
              {tournament.competition_Type} · {tournament.bracket_Type}
            </Text>
            {tournament.description && (
              <Text className="mt-2 text-xs text-gray-700">{tournament.description}</Text>
            )}
            <Text className="mt-2 text-xs text-gray-600">
              Nội dung: {tournament.formatDetails?.map(detail => `${detail.format} (${detail.maxPlayers} VĐV)`).join(', ') || 'Chưa cấu hình'}
            </Text>
            <Text className="mt-1 text-xs text-gray-600">
              Giải thưởng: {tournament.awardTypes?.join(', ') || 'Chưa chọn'} · Phí: {tournament.feePerPlayer?.toLocaleString('vi-VN') || 0}₫
            </Text>
            <Text className="mt-1 text-xs text-gray-600">
              Thưởng vô địch: {tournament.championPrizeMoney?.toLocaleString('vi-VN') || 0}₫
              {tournament.contactLink ? ` · Liên hệ: ${tournament.contactLink}` : ''}
            </Text>
            <View className="mt-4 flex-row gap-2">
              <TouchableOpacity
                className="flex-1 items-center rounded-xl bg-green-600 py-3"
                disabled={workingId === tournament.id}
                onPress={() => void decide(tournament, 'APPROVED')}
              >
                <Text className="text-xs font-bold text-white">
                  {workingId === tournament.id ? 'Đang xử lý...' : 'Duyệt giải'}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                className="flex-1 items-center rounded-xl bg-red-50 py-3"
                disabled={workingId === tournament.id}
                onPress={() => setRejecting(tournament)}
              >
                <Text className="text-xs font-bold text-red-700">Từ chối</Text>
              </TouchableOpacity>
            </View>
          </View>
        ))}
        {tournaments.length === 0 && (
          <Text className="rounded-xl border border-gray-200 bg-white p-5 text-center text-sm text-gray-500">
            Không có giải đấu nào đang chờ duyệt.
          </Text>
        )}
      </ScrollView>

      <Modal transparent animationType="fade" visible={Boolean(rejecting)} onRequestClose={() => setRejecting(null)}>
        <View className="flex-1 justify-center bg-black/40 px-6">
          <View className="rounded-2xl bg-white p-5">
            <Text className="mb-2 text-lg font-extrabold text-gray-900">Từ chối giải đấu</Text>
            <Text className="mb-3 text-xs text-gray-600">{rejecting?.name}</Text>
            <TextInput
              className="min-h-24 rounded-xl border border-gray-200 bg-gray-50 px-3 py-3 text-sm"
              multiline
              textAlignVertical="top"
              placeholder="Nhập lý do từ chối (ít nhất 5 ký tự)"
              value={reason}
              onChangeText={setReason}
            />
            <View className="mt-4 flex-row gap-2">
              <TouchableOpacity className="flex-1 rounded-xl bg-gray-100 py-3" onPress={() => setRejecting(null)}>
                <Text className="text-center text-xs font-bold text-gray-700">Hủy</Text>
              </TouchableOpacity>
              <TouchableOpacity
                className="flex-1 rounded-xl bg-red-600 py-3"
                disabled={!rejecting || reason.trim().length < 5 || workingId === rejecting.id}
                onPress={() => rejecting && void decide(rejecting, 'REJECTED', reason.trim())}
              >
                <Text className="text-center text-xs font-bold text-white">Xác nhận từ chối</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
};
