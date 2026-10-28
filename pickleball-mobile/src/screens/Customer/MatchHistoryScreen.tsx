import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, ActivityIndicator } from 'react-native';
import { api } from '../../services/api';

interface MatchItem {
  id: string;
  tournamentName: string;
  opponent: string;
  myScore: number | null;
  opponentScore: number | null;
  result: 'WIN' | 'LOSS';
  tournamentDate: string | null;
}

export const MatchHistoryScreen = () => {
  const [matches, setMatches] = useState<MatchItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchMatchHistory();
  }, []);

  const fetchMatchHistory = async () => {
    try {
      const response = await api.get('/users/match-history');
      setMatches(response.data);
    } catch (requestError: any) {
      setError(requestError.response?.data?.message || 'Không thể tải lịch sử thi đấu.');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View className="flex-1 bg-gray-50 justify-center items-center">
        <ActivityIndicator size="large" color="#88B04B" />
      </View>
    );
  }

  return (
    <ScrollView className="flex-1 bg-gray-50 px-5 pt-14">
      {/* Tiêu đề được đẩy xuống tránh status bar */}
      <View className="mb-6">
        <Text className="text-2xl font-extrabold text-gray-900">Lịch sử đấu</Text>
        <Text className="text-xs text-gray-500 mt-1">Danh sách các trận đấu giải đã tham gia</Text>
      </View>

      {error && <Text className="mb-4 rounded-xl bg-red-50 p-4 text-sm text-red-700">{error}</Text>}

      {matches.map(item => (
        <View key={item.id} className="bg-white p-4 rounded-2xl border border-gray-200 mb-4 shadow-sm">
          <View className="flex-row justify-between items-center mb-2">
            <Text className="flex-1 pr-2 text-xs font-bold text-gray-800">{item.tournamentName}</Text>
            <Text className="text-xs text-gray-400">
              {item.tournamentDate ? new Date(item.tournamentDate).toLocaleDateString('vi-VN') : ''}
            </Text>
          </View>
          
          <Text className="text-gray-900 font-semibold text-sm mb-3">Đấu với: {item.opponent}</Text>
          
          <View className="flex-row justify-between items-center pt-2 border-t border-gray-100">
            <Text className="text-gray-700 font-medium text-xs">
              Tỷ số: <Text className="font-bold text-gray-900">{item.myScore} - {item.opponentScore}</Text>
            </Text>
            <View className={`px-3 py-1 rounded-full ${item.result === 'WIN' ? 'bg-green-100' : 'bg-red-100'}`}>
              <Text className={`text-xs font-bold ${item.result === 'WIN' ? 'text-green-700' : 'text-red-700'}`}>
                {item.result === 'WIN' ? 'Thắng' : 'Thua'}
              </Text>
            </View>
          </View>
        </View>
      ))}
      {!error && matches.length === 0 && (
        <Text className="text-center text-sm text-gray-500">Chưa có trận đấu nào đã kết thúc.</Text>
      )}
    </ScrollView>
  );
};
