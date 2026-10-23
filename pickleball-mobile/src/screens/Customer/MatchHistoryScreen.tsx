import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, ActivityIndicator } from 'react-native';
import { api } from '../../services/api';

interface MatchItem {
  id: string;
  tournament: string;
  opponent: string;
  score: string;
  result: string;
  date: string;
}

export const MatchHistoryScreen = () => {
  const [matches, setMatches] = useState<MatchItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    fetchMatchHistory();
  }, []);

  const fetchMatchHistory = async () => {
    try {
      const response = await api.get('/users/match-history');
      setMatches(response.data);
    } catch (error) {
      setMatches([
        { id: '1', tournament: 'Pickleball Open 2026', opponent: 'Khoa Lu - Hoàng Long', score: '15 - 11', result: 'Thắng', date: '12/10/2026' },
        { id: '2', tournament: 'Giải CLB Drill & Chill', opponent: 'Tran Hieu - Anh Tung', score: '9 - 11', result: 'Thua', date: '05/10/2026' },
      ]);
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

      {matches.map((item, index) => (
        <View key={item.id || index} className="bg-white p-4 rounded-2xl border border-gray-200 mb-4 shadow-sm">
          <View className="flex-row justify-between items-center mb-2">
            <Text className="text-xs font-bold text-gray-800">{item.tournament}</Text>
            <Text className="text-xs text-gray-400">{item.date}</Text>
          </View>
          
          <Text className="text-gray-900 font-semibold text-sm mb-3">Đấu với: {item.opponent}</Text>
          
          <View className="flex-row justify-between items-center pt-2 border-t border-gray-100">
            <Text className="text-gray-700 font-medium text-xs">Tỷ số: <Text className="font-bold text-gray-900">{item.score}</Text></Text>
            <View className={`px-3 py-1 rounded-full ${item.result === 'Thắng' ? 'bg-green-100' : 'bg-red-100'}`}>
              <Text className={`text-xs font-bold ${item.result === 'Thắng' ? 'text-green-700' : 'text-red-700'}`}>{item.result}</Text>
            </View>
          </View>
        </View>
      ))}
    </ScrollView>
  );
};
