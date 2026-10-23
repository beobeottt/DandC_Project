import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { fetchHomeData } from './services/homeServices';

export const HomeScreen: React.FC<any> = ({ onPressLive, onPressTournament, onPressUpcoming, onPressSearch }) => {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    loadHomeData();
  }, []);

  const loadHomeData = async () => {
    try {
      const res = await fetchHomeData();
      setData(res);
    } catch (err) {
      console.error('Không thể lấy dữ liệu Home:', err);
    } finally {
      setLoading(false); // Luôn tắt loading dù thành công hay thất bại
    }
  };

  if (loading) {
    return (
      <View className="flex-1 justify-center items-center bg-gray-50">
        <ActivityIndicator size="large" color="#4f46e5" />
        <Text className="text-xs text-gray-500 mt-2">Đang tải dữ liệu từ hệ thống...</Text>
      </View>
    );
  }

  // Lấy dữ liệu an toàn từ response API trả về
  const liveMatches = data?.liveMatches || [];
  const upcomingMatches = data?.upcomingMatches || [];

  return (
    <ScrollView className="flex-1 bg-gray-50 px-5 pt-12 pb-24">
      
      {/* Header */}
      <View className="flex-row justify-between items-center mb-6">
        <View className="flex-row items-center gap-2">
          <View className="bg-indigo-600 w-9 h-9 rounded-xl items-center justify-center shadow-sm">
            <Text className="text-white font-bold text-base">🏆</Text>
          </View>
          <Text className="text-xl font-extrabold text-gray-900">D&C</Text>
        </View>

        <TouchableOpacity 
          onPress={onPressSearch}
          className="w-10 h-10 bg-gray-100 rounded-full items-center justify-center border border-gray-200"
        >
          <Text className="text-gray-600 font-bold">🔍</Text>
        </TouchableOpacity>
      </View>


      <View className="mb-6">
        <View className="flex-row justify-between items-center mb-3">
          <Text className="text-base font-extrabold text-gray-900">Đang diễn ra</Text>
        </View>

        {liveMatches.length > 0 ? (
          liveMatches.map((match: any) => (
            <TouchableOpacity 
              key={match.id}
              activeOpacity={0.9}
              onPress={() => onPressTournament && onPressTournament(match.tournamentId, match.tournamentName)}
              className="bg-white p-4 rounded-3xl border border-gray-200 shadow-sm mb-3"
            >
              <View className="flex-row justify-between items-center mb-3 pb-2 border-b border-gray-100">
                <Text className="text-xs font-extrabold text-indigo-600 uppercase tracking-wider">
                  🏆 {match.tournamentName}
                </Text>
                <Text className="text-xs text-gray-400 font-semibold">Xem tất cả trận &gt;</Text>
              </View>

              <View className="flex-row justify-between items-center">
                <View>
                  <View className="flex-row items-center gap-1.5 mb-2">
                    <View className="w-2 h-2 rounded-full bg-indigo-600 animate-pulse" />
                    <Text className="text-xs font-semibold text-indigo-600">Trận tâm điểm</Text>
                    <Text className="text-xs text-gray-400 ml-2">{match.timeRemaining || 'Đang đấu'}</Text>
                  </View>

                  <View className="space-y-1">
                    <Text className="text-gray-900 font-bold text-sm">
                      {match.teamA || 'Đội 1'} vs {match.teamB || 'Đội 2'}
                    </Text>
                  </View>
                </View>

                <TouchableOpacity 
                  onPress={(e) => {
                    e.stopPropagation();
                    onPressLive && onPressLive(match.id);
                  }}
                  className="w-12 h-12 bg-gray-100 rounded-full items-center justify-center border border-gray-200 shadow-sm"
                >
                  <Text className="text-indigo-600 font-bold text-base ml-0.5">▶</Text>
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          ))
        ) : (
          <View className="bg-white p-4 rounded-2xl border border-gray-200 items-center py-6">
            <Text className="text-xs text-gray-400">Không có giải đấu nào đang diễn ra</Text>
          </View>
        )}
      </View>

      {/* Mục: Sắp diễn ra (Upcoming Tournaments / Matches) */}
      <View className="mb-4">
        <View className="flex-row justify-between items-center mb-3">
          <Text className="text-base font-extrabold text-gray-900">Sắp diễn ra</Text>
        </View>

        {upcomingMatches.length > 0 ? (
          upcomingMatches.map((item: any) => (
            <TouchableOpacity 
              key={item.id}
              onPress={() => onPressUpcoming && onPressUpcoming(item.id)}
              className="bg-white p-4 rounded-2xl border border-gray-200 mb-3 flex-row justify-between items-center shadow-sm"
            >
              <View className="flex-row items-center gap-3">
                <View className="w-10 h-10 bg-gray-100 rounded-xl items-center justify-center">
                  <Text className="text-base">⏰</Text>
                </View>
                <View>
                  <Text className="text-gray-900 font-bold text-sm">{item.title || item.name}</Text>
                  <Text className="text-xs text-gray-500 mt-0.5">{item.time || item.startAt}</Text>
                </View>
              </View>
              <Text className="text-gray-400 font-bold">&gt;</Text>
            </TouchableOpacity>
          ))
        ) : (
          <View className="bg-white p-4 rounded-2xl border border-gray-200 items-center py-6">
            <Text className="text-xs text-gray-400">Không có giải đấu nào sắp diễn ra</Text>
          </View>
        )}
      </View>

    </ScrollView>
  );
};
