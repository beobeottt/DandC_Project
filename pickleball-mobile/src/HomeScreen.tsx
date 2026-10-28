import React, { useCallback, useEffect, useState } from 'react';
import { Alert, Image, View, Text, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { fetchHomeData } from './services/homeServices';
import { api } from './services/api';

const formatTournamentDate = (value: string | undefined) => {
  if (!value) return 'Ngày thi đấu đang cập nhật';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString('vi-VN');
};

export const HomeScreen: React.FC<any> = ({ onPressTournament, onPressSearch }) => {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);

  const loadHomeData = useCallback(async () => {
    try {
      const res = await fetchHomeData();
      setData(res);
    } catch (err) {
      console.error('Không thể lấy dữ liệu Home:', err);
    } finally {
      setLoading(false); // Luôn tắt loading dù thành công hay thất bại
    }
  }, []);

  useEffect(() => {
    void loadHomeData();
  }, [loadHomeData]);

  if (loading) {
    return (
      <View className="flex-1 justify-center items-center bg-gray-50">
        <ActivityIndicator size="large" color="#4f46e5" />
        <Text className="text-xs text-gray-500 mt-2">Đang tải dữ liệu từ hệ thống...</Text>
      </View>
    );
  }

  // Keep the old response fallback so existing deployments can still open details.
  const liveMatches = data?.liveMatches || [];
  const upcomingMatches = data?.upcomingMatches || [];
  const liveTournaments = data?.liveTournaments || liveMatches.map((match: any) => ({
    id: match.tournamentId,
    name: match.tournamentName,
    startAt: match.timeRemaining,
  }));
  const upcomingTournaments = data?.upcomingTournaments || upcomingMatches.map((item: any) => ({
    id: item.tournamentId || item.id,
    name: item.title || item.name,
    startAt: item.startAt || item.time,
  }));
  const openTournament = (tournament: any) => {
    if (tournament.id) {
      onPressTournament?.(tournament.id, tournament.name);
      return;
    }
    Alert.alert('Không thể mở giải', 'Giải đấu chưa có thông tin định danh.');
  };
  const renderTournamentCard = (tournament: any, isLive: boolean) => (
    <TouchableOpacity
      key={tournament.id}
      activeOpacity={0.9}
      onPress={() => openTournament(tournament)}
      className="mb-4 overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-sm"
    >
      {tournament.coverImageUrl ? (
        <Image
          source={{ uri: `${api.defaults.baseURL}${tournament.coverImageUrl}` }}
          className="h-44 w-full bg-gray-100"
          resizeMode="cover"
        />
      ) : (
        <View className="h-32 items-center justify-center bg-indigo-50">
          <Text className="text-4xl">🏆</Text>
        </View>
      )}
      <View className="p-4">
        <View className="mb-2 flex-row items-start justify-between">
          <Text className="mr-3 flex-1 text-base font-extrabold text-gray-900">{tournament.name}</Text>
          <Text className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${isLive ? 'bg-red-50 text-red-700' : 'bg-indigo-50 text-indigo-700'}`}>
            {isLive ? 'ĐANG DIỄN RA' : 'SẮP DIỄN RA'}
          </Text>
        </View>
        <Text className="text-xs text-gray-600" numberOfLines={1}>📍 {tournament.location || 'Đang cập nhật địa điểm'}</Text>
        <Text className="mt-1 text-xs text-gray-600">
          🎾 {tournament.formatDetails?.length
            ? tournament.formatDetails.map((detail: any) => `${detail.format.replace(/_/g, ' ')} (${detail.maxPlayers})`).join(' · ')
            : 'Nội dung đang cập nhật'}
        </Text>
        <View className="mt-3 flex-row items-center justify-between border-t border-gray-100 pt-3">
          <Text className="text-xs font-semibold text-gray-600">
            {tournament.feePerPlayer?.toLocaleString('vi-VN') || 0}₫ / người
          </Text>
          <Text className="text-xs text-gray-500">
            {tournament.registeredPlayerCount || 0} người đăng ký
          </Text>
        </View>
        <Text className="mt-2 text-[11px] text-gray-500">{formatTournamentDate(tournament.startAt)}</Text>
      </View>
    </TouchableOpacity>
  );

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

        {liveTournaments.length > 0 ? liveTournaments.map((tournament: any) => renderTournamentCard(tournament, true)) : (
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

        {upcomingTournaments.length > 0 ? upcomingTournaments.map((tournament: any) => renderTournamentCard(tournament, false)) : (
          <View className="bg-white p-4 rounded-2xl border border-gray-200 items-center py-6">
            <Text className="text-xs text-gray-400">Không có giải đấu nào sắp diễn ra</Text>
          </View>
        )}
      </View>

    </ScrollView>
  );
};
