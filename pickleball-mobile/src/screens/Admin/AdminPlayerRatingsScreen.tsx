import React, { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { api } from '../../services/api';

interface PlayerRatingAccount {
  id: string;
  fullName: string;
  email: string;
  level: number;
}

interface RatingDetails {
  player: PlayerRatingAccount;
  matches: Array<{
    id: string;
    tournamentName: string;
    round: number;
    teamA: string;
    teamB: string;
    scoreA: number | null;
    scoreB: number | null;
    result: 'WIN' | 'LOSS';
  }>;
  levelHistory: Array<{
    id: string;
    previousLevel: number;
    newLevel: number;
    reason: string;
    changedAt: string;
  }>;
}

export const AdminPlayerRatingsScreen = () => {
  const [players, setPlayers] = useState<PlayerRatingAccount[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [details, setDetails] = useState<RatingDetails | null>(null);
  const [level, setLevel] = useState('');
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [saving, setSaving] = useState(false);

  const loadPlayers = useCallback(async () => {
    try {
      const response = await api.get('/users/admin/player-ratings');
      setPlayers(response.data);
    } catch (error: any) {
      Alert.alert('Lỗi', error.response?.data?.message || 'Không thể tải danh sách VĐV');
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => {
    void loadPlayers();
  }, [loadPlayers]));

  const selectPlayer = async (playerId: string) => {
    setSelectedId(playerId);
    setLoadingDetails(true);
    try {
      const response = await api.get(`/users/admin/accounts/${playerId}/rating-history`);
      setDetails(response.data);
      setLevel(String(response.data.player.level));
    } catch (error: any) {
      Alert.alert('Lỗi', error.response?.data?.message || 'Không thể tải lịch sử thi đấu');
    } finally {
      setLoadingDetails(false);
    }
  };

  const updateLevel = async () => {
    const nextLevel = Number(level);
    if (!selectedId || !Number.isFinite(nextLevel) || nextLevel < 1 || nextLevel > 6 || !reason.trim()) {
      Alert.alert('Thông tin chưa hợp lệ', 'Điểm trình phải từ 1.0 đến 6.0 và cần ghi lý do đánh giá.');
      return;
    }
    setSaving(true);
    try {
      await api.patch(`/users/admin/accounts/${selectedId}/level`, {
        level: nextLevel,
        reason: reason.trim(),
      });
      setReason('');
      await Promise.all([loadPlayers(), selectPlayer(selectedId)]);
      Alert.alert('Đã cập nhật', 'Điểm trình đã được ghi nhận và lưu lịch sử điều chỉnh.');
    } catch (error: any) {
      Alert.alert('Lỗi', error.response?.data?.message || 'Không thể cập nhật điểm trình');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <View className="flex-1 items-center justify-center"><ActivityIndicator color="#4f46e5" /></View>;
  }

  return (
    <ScrollView className="flex-1 bg-gray-50 px-5 pt-12 pb-24" keyboardShouldPersistTaps="handled">
      <Text className="mb-1 text-2xl font-extrabold text-gray-900">Đánh giá điểm trình</Text>
      <Text className="mb-5 text-xs text-gray-500">Admin xem lịch sử thi đấu và tự quyết định điểm trình; không tự cộng/trừ sau trận.</Text>

      <View className="mb-4 rounded-2xl border border-gray-200 bg-white p-4">
        <Text className="mb-3 text-sm font-extrabold text-gray-900">Chọn vận động viên</Text>
        {players.map(player => (
          <TouchableOpacity
            key={player.id}
            className={`mb-2 rounded-xl border p-3 ${selectedId === player.id ? 'border-indigo-600 bg-indigo-50' : 'border-gray-200'}`}
            onPress={() => void selectPlayer(player.id)}
          >
            <Text className="font-bold text-gray-900">{player.fullName}</Text>
            <Text className="mt-1 text-xs text-gray-500">{player.email} · Điểm trình: {player.level}</Text>
          </TouchableOpacity>
        ))}
        {players.length === 0 && <Text className="text-xs text-gray-500">Chưa có tài khoản VĐV.</Text>}
      </View>

      {loadingDetails && <ActivityIndicator className="my-4" color="#4f46e5" />}
      {details && !loadingDetails && (
        <>
          <View className="mb-4 rounded-2xl border border-gray-200 bg-white p-4">
            <Text className="text-base font-extrabold text-gray-900">{details.player.fullName}</Text>
            <Text className="mb-3 mt-1 text-sm font-semibold text-indigo-700">
              Điểm trình hiện tại: {details.player.level}
            </Text>
            <Text className="mb-2 text-sm font-bold text-gray-800">Lịch sử thi đấu đã kết thúc</Text>
            {details.matches.map(match => (
              <View key={match.id} className="mb-2 rounded-xl bg-gray-50 p-3">
                <Text className="text-xs font-bold text-gray-800">{match.tournamentName} · Vòng {match.round}</Text>
                <Text className="mt-1 text-xs text-gray-700">
                  {match.teamA} {match.scoreA ?? '-'} : {match.scoreB ?? '-'} {match.teamB}
                </Text>
                <Text className={`mt-1 text-[10px] font-bold ${match.result === 'WIN' ? 'text-green-700' : 'text-red-700'}`}>
                  {match.result === 'WIN' ? 'Thắng' : 'Thua'}
                </Text>
              </View>
            ))}
            {details.matches.length === 0 && <Text className="text-xs text-gray-500">Chưa có trận đã kết thúc.</Text>}
          </View>

          <View className="mb-4 rounded-2xl border border-gray-200 bg-white p-4">
            <Text className="mb-3 text-sm font-bold text-gray-900">Cập nhật thủ công</Text>
            <Text className="mb-1 text-xs font-semibold text-gray-600">Điểm trình mới (1.0–6.0)</Text>
            <TextInput
              className="mb-3 rounded-xl border border-gray-200 bg-gray-50 px-3 py-3 text-sm"
              keyboardType="decimal-pad"
              value={level}
              onChangeText={setLevel}
            />
            <Text className="mb-1 text-xs font-semibold text-gray-600">Lý do / căn cứ đánh giá</Text>
            <TextInput
              className="min-h-20 rounded-xl border border-gray-200 bg-gray-50 px-3 py-3 text-sm"
              multiline
              textAlignVertical="top"
              placeholder="Ví dụ: kết quả và phong độ trong các giải gần đây"
              value={reason}
              onChangeText={setReason}
            />
            <TouchableOpacity
              className={`mt-3 items-center rounded-xl py-3 ${saving ? 'bg-gray-400' : 'bg-indigo-600'}`}
              disabled={saving}
              onPress={() => void updateLevel()}
            >
              <Text className="font-bold text-white">{saving ? 'Đang lưu...' : 'Lưu điểm trình'}</Text>
            </TouchableOpacity>
          </View>

          <View className="mb-6 rounded-2xl border border-gray-200 bg-white p-4">
            <Text className="mb-2 text-sm font-bold text-gray-900">Lịch sử thay đổi điểm</Text>
            {details.levelHistory.map(change => (
              <Text key={change.id} className="mb-2 text-xs text-gray-700">
                {change.previousLevel} → {change.newLevel} · {change.reason} · {new Date(change.changedAt).toLocaleDateString('vi-VN')}
              </Text>
            ))}
            {details.levelHistory.length === 0 && <Text className="text-xs text-gray-500">Chưa có lần điều chỉnh nào.</Text>}
          </View>
        </>
      )}
    </ScrollView>
  );
};
