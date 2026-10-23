import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, Alert, TextInput, Linking } from 'react-native';
import { api } from '../../services/api';
import { useSession } from '../../SessionContext';
import { io } from 'socket.io-client';

export const TournamentDetailScreen = ({ route, navigation }: any) => {
  const { role } = useSession();
  const canManageMatches = role === 'ORGANIZER' || role === 'REFEREE';
  const { tournamentId } = route.params || {};
  
  const [tournamentData, setTournamentData] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [updating, setUpdating] = useState<boolean>(false);
  const [scoreDrafts, setScoreDrafts] = useState<Record<string, { scoreA: string; scoreB: string }>>({});
  const [liveLinkDrafts, setLiveLinkDrafts] = useState<Record<string, string>>({});

  useEffect(() => {
    if (tournamentId) {
      fetchTournamentDetails();
    }
  }, [tournamentId]);

  useEffect(() => {
    if (!tournamentId) return;
    const socket = io('http://localhost:3000', { transports: ['websocket'] });
    socket.on('connect', () => socket.emit('joinTournamentRoom', { tournamentId }));
    socket.on('matchStatusUpdated', () => void fetchTournamentDetails());
    socket.on('matchScoreUpdated', () => void fetchTournamentDetails());
    socket.on('matchLiveLinkUpdated', () => void fetchTournamentDetails());
    socket.on('connect_error', error => console.error('Không kết nối được realtime:', error.message));
    return () => {
      socket.disconnect();
    };
  }, [tournamentId]);

  const fetchTournamentDetails = async () => {
    try {
      const response = await api.get(`/tournament/${tournamentId}/matches`);
      setTournamentData(response.data);
      const nextScores: Record<string, { scoreA: string; scoreB: string }> = {};
      const nextLinks: Record<string, string> = {};
      for (const match of response.data?.matches || []) {
        nextScores[match.id] = {
          scoreA: match.scoreA == null ? '' : String(match.scoreA),
          scoreB: match.scoreB == null ? '' : String(match.scoreB),
        };
        nextLinks[match.id] = match.liveStreamUrl || '';
      }
      setScoreDrafts(nextScores);
      setLiveLinkDrafts(nextLinks);
    } catch (error) {
      console.error('Không thể tải chi tiết giải đấu:', error);
      Alert.alert('Lỗi', 'Không thể tải danh sách trận đấu của giải.');
    } finally {
      setLoading(false);
    }
  };

  // Hàm chuyển trạng thái trận đấu dành cho trọng tài
  const handleUpdateStatus = async (matchId: string, newStatus: string) => {
    try {
      setUpdating(true);
      await api.patch(`/tournament/match/${matchId}/status`, {
        status: newStatus,
      });
      Alert.alert('Thành công', 'Đã cập nhật trạng thái trận đấu');
      fetchTournamentDetails(); // Load lại dữ liệu mới từ DB
    } catch (error: any) {
      Alert.alert('Lỗi', error.response?.data?.message || 'Không thể cập nhật trạng thái');
    } finally {
      setUpdating(false);
    }
  };

  const handleSaveScore = async (matchId: string) => {
    const score = scoreDrafts[matchId];
    const scoreA = Number(score?.scoreA);
    const scoreB = Number(score?.scoreB);
    if (
      !score?.scoreA?.trim() ||
      !score?.scoreB?.trim() ||
      !Number.isInteger(scoreA) ||
      !Number.isInteger(scoreB) ||
      scoreA < 0 ||
      scoreB < 0
    ) {
      Alert.alert('Điểm không hợp lệ', 'Nhập số điểm nguyên không âm cho cả hai đội.');
      return;
    }
    try {
      setUpdating(true);
      await api.patch(`/tournament/match/${matchId}/score`, { scoreA, scoreB });
      await fetchTournamentDetails();
      Alert.alert('Đã lưu', 'Tỷ số trận đấu đã được cập nhật.');
    } catch (error: any) {
      Alert.alert('Lỗi', error.response?.data?.message || 'Không thể cập nhật tỷ số');
    } finally {
      setUpdating(false);
    }
  };

  const handleSaveLiveLink = async (matchId: string) => {
    const liveStreamUrl = liveLinkDrafts[matchId]?.trim();
    if (!liveStreamUrl) {
      Alert.alert('Thiếu đường link', 'Nhập link Facebook Live hoặc YouTube Live.');
      return;
    }
    try {
      setUpdating(true);
      await api.patch(`/tournament/match/${matchId}/live-link`, { liveStreamUrl });
      await fetchTournamentDetails();
      Alert.alert('Đã lưu', 'Đường link livestream đã được gắn vào trận.');
    } catch (error: any) {
      Alert.alert('Lỗi', error.response?.data?.message || 'Link không hợp lệ hoặc không thể lưu');
    } finally {
      setUpdating(false);
    }
  };

  if (loading) {
    return (
      <View className="flex-1 justify-center items-center bg-gray-100">
        <ActivityIndicator size="large" color="#4f46e5" />
        <Text className="text-xs text-gray-500 mt-2">Đang tải dữ liệu giải đấu...</Text>
      </View>
    );
  }

  const matches = tournamentData?.matches || [];
  const playerRegistrations = tournamentData?.playerRegistrations || {
    approved: [],
    awaitingApproval: [],
    awaitingResponse: [],
    rejected: [],
  };
  
  // Lọc chuẩn 3 trạng thái từ dữ liệu trả về của backend
  const liveMatches = matches.filter((m: any) => m.rawStatus === 'IN_PROGRESS' || m.status === 'Đang diễn ra');
  const upcomingMatches = matches.filter((m: any) => m.rawStatus === 'SCHEDULED' || m.status === 'Sắp diễn ra');
  const completedMatches = matches.filter((m: any) => m.rawStatus === 'COMPLETED' || m.status === 'Đã kết thúc');

  return (
    <ScrollView className="flex-1 bg-gray-100 px-5 pt-12 pb-10">
      <Text className="text-xl font-bold text-gray-800 mb-4">Live Score & Trận đấu</Text>

      <View className="bg-white rounded-3xl p-5 border border-gray-200 shadow-sm">
        <Text className="text-lg font-black text-center text-gray-900 mb-4 uppercase tracking-wide">
          {tournamentData?.tournamentName || 'Giải đấu Pickleball'}
        </Text>

        <View className="mb-5 rounded-2xl border border-gray-200 bg-gray-50 p-4">
          <Text className="text-base font-extrabold text-gray-900 mb-3">Vận động viên đăng ký</Text>
          {[
            { key: 'approved', title: 'Đã được duyệt', color: 'text-green-700' },
            { key: 'awaitingApproval', title: 'Chờ Ban tổ chức duyệt', color: 'text-amber-700' },
            { key: 'awaitingResponse', title: 'Chờ phản hồi lời mời', color: 'text-blue-700' },
            { key: 'rejected', title: 'Chưa được duyệt / đã từ chối', color: 'text-red-700' },
          ].map(section => {
            const players = playerRegistrations[section.key] || [];
            return (
              <View key={section.key} className="mb-3 last:mb-0">
                <Text className={`mb-1 text-xs font-bold ${section.color}`}>
                  {section.title} ({players.length})
                </Text>
                {players.length > 0 ? players.map((player: any) => (
                  <Text key={player.memberId} className="py-0.5 text-xs text-gray-700">
                    {player.fullName}{player.isGuest ? ' · VĐV khách' : ''}
                    {player.gender ? ` · ${player.gender}` : ''}
                  </Text>
                )) : (
                  <Text className="text-[10px] text-gray-400">Chưa có VĐV</Text>
                )}
              </View>
            );
          })}
          <Text className="mt-1 text-[10px] text-gray-500">
            Danh sách hiển thị tên và trạng thái đăng ký; thông tin liên hệ không được công khai.
          </Text>
        </View>

        {/* 1. Đang đánh (IN_PROGRESS) */}
        <Text className="text-sm font-bold text-gray-800 mb-2">🔥 Đang diễn ra (Live)</Text>
        {liveMatches.length > 0 ? (
          liveMatches.map((match: any) => (
            <View key={match.id} className="bg-gray-200/90 rounded-2xl p-4 mb-4 border border-gray-300">
              <View className="flex-row justify-between items-center mb-1">
                <Text className="text-xs font-bold text-gray-700">{match.round}</Text>
                <View className="bg-red-500 px-2 py-0.5 rounded-full">
                  <Text className="text-white text-[10px] font-bold uppercase">LIVE</Text>
                </View>
              </View>
              <View className="flex-row justify-between items-center my-2">
                <Text className="font-bold text-gray-900 text-sm flex-1 text-right">{match.teamA}</Text>
                <Text className="font-extrabold text-indigo-600 px-3 text-sm">vs</Text>
                <Text className="font-bold text-gray-900 text-sm flex-1 text-left">{match.teamB}</Text>
              </View>
              <Text className="text-center font-black text-base text-gray-800 mt-1">{match.score}</Text>

              {match.liveStreamUrl ? (
                <TouchableOpacity
                  className="mt-3 items-center"
                  onPress={() => Linking.openURL(match.liveStreamUrl).catch(() => Alert.alert('Lỗi', 'Không mở được link livestream'))}
                >
                  <Text className="text-indigo-700 text-xs font-bold">Mở livestream Facebook / YouTube</Text>
                </TouchableOpacity>
              ) : null}

              {canManageMatches && (
                <View className="mt-4">
                  <Text className="text-xs font-bold text-gray-700 mb-2">Cập nhật tỷ số</Text>
                  <View className="flex-row gap-2">
                    <TextInput
                      className="flex-1 rounded-xl border border-gray-300 bg-white px-3 py-2 text-center"
                      keyboardType="number-pad"
                      placeholder="Đội 1"
                      value={scoreDrafts[match.id]?.scoreA || ''}
                      onChangeText={value => setScoreDrafts(prev => ({
                        ...prev,
                        [match.id]: { ...prev[match.id], scoreA: value, scoreB: prev[match.id]?.scoreB || '' },
                      }))}
                    />
                    <TextInput
                      className="flex-1 rounded-xl border border-gray-300 bg-white px-3 py-2 text-center"
                      keyboardType="number-pad"
                      placeholder="Đội 2"
                      value={scoreDrafts[match.id]?.scoreB || ''}
                      onChangeText={value => setScoreDrafts(prev => ({
                        ...prev,
                        [match.id]: { ...prev[match.id], scoreA: prev[match.id]?.scoreA || '', scoreB: value },
                      }))}
                    />
                  </View>
                  <TouchableOpacity
                    className="mt-2 items-center rounded-xl bg-indigo-600 py-2"
                    onPress={() => handleSaveScore(match.id)}
                    disabled={updating}
                  >
                    <Text className="text-xs font-bold text-white">Lưu tỷ số</Text>
                  </TouchableOpacity>

                  <TextInput
                    className="mt-3 rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900"
                    placeholder="Dán link Facebook Live hoặc YouTube Live"
                    autoCapitalize="none"
                    keyboardType="url"
                    value={liveLinkDrafts[match.id] || ''}
                    onChangeText={value => setLiveLinkDrafts(prev => ({ ...prev, [match.id]: value }))}
                  />
                  <TouchableOpacity
                    className="mt-2 items-center rounded-xl bg-gray-700 py-2"
                    onPress={() => handleSaveLiveLink(match.id)}
                    disabled={updating}
                  >
                    <Text className="text-xs font-bold text-white">Gắn / cập nhật link live</Text>
                  </TouchableOpacity>
                </View>
              )}

              {/* Nút trọng tài bấm để hoàn thành trận đấu */}
              {canManageMatches && (
                <TouchableOpacity 
                  onPress={() => handleUpdateStatus(match.id, 'COMPLETED')}
                  className="bg-green-600 py-2 rounded-xl mt-3 items-center"
                  disabled={updating}
                >
                  <Text className="text-white text-xs font-bold">Hoàn thành trận đấu</Text>
                </TouchableOpacity>
              )}
            </View>
          ))
        ) : (
          <View className="bg-gray-50 rounded-2xl p-3 mb-4 items-center border border-dashed border-gray-300">
            <Text className="text-xs text-gray-400">Không có trận nào đang diễn ra</Text>
          </View>
        )}

        {/* 2. Chưa bắt đầu / Sắp tới (SCHEDULED) */}
        <Text className="text-sm font-bold text-gray-800 mb-2">⏰ Trận đấu sắp tới (Chưa bắt đầu)</Text>
        {upcomingMatches.length > 0 ? (
          upcomingMatches.map((match: any) => (
            <View key={match.id} className="bg-gray-200/90 rounded-2xl p-3 mb-3 border border-gray-300">
              <View className="flex-row items-center">
                <Text className="font-bold text-gray-900 text-xs flex-1 text-right">{match.teamA}</Text>
                <Text className="font-bold text-gray-600 px-3 text-xs">vs</Text>
                <Text className="font-bold text-gray-900 text-xs flex-1 text-left">{match.teamB}</Text>
              </View>
              {match.liveStreamUrl ? (
                <TouchableOpacity
                  className="mt-2 items-center"
                  onPress={() => Linking.openURL(match.liveStreamUrl).catch(() => Alert.alert('Lỗi', 'Không mở được link livestream'))}
                >
                  <Text className="text-indigo-700 text-xs font-bold">Mở livestream đã gắn</Text>
                </TouchableOpacity>
              ) : null}
              {canManageMatches && (
                <>
                  <TextInput
                    className="mt-3 rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900"
                    placeholder="Dán link Facebook Live hoặc YouTube Live"
                    autoCapitalize="none"
                    keyboardType="url"
                    value={liveLinkDrafts[match.id] || ''}
                    onChangeText={value => setLiveLinkDrafts(prev => ({ ...prev, [match.id]: value }))}
                  />
                  <TouchableOpacity
                    className="mt-2 items-center rounded-xl bg-gray-700 py-2"
                    onPress={() => handleSaveLiveLink(match.id)}
                    disabled={updating}
                  >
                    <Text className="text-xs font-bold text-white">Gắn / cập nhật link live</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    className="mt-2 items-center rounded-xl bg-indigo-600 py-2"
                    onPress={() => Alert.alert(
                      'Bắt đầu trận',
                      `Bắt đầu trận ${match.teamA} vs ${match.teamB}?`,
                      [
                        { text: 'Hủy', style: 'cancel' },
                        { text: 'Bắt đầu', onPress: () => void handleUpdateStatus(match.id, 'IN_PROGRESS') },
                      ],
                    )}
                    disabled={updating}
                  >
                    <Text className="text-xs font-bold text-white">Chọn trận này để bắt đầu</Text>
                  </TouchableOpacity>
                </>
              )}
            </View>
          ))
        ) : (
          <View className="bg-gray-50 rounded-2xl p-3 mb-4 items-center border border-dashed border-gray-300">
            <Text className="text-xs text-gray-400">Không có trận sắp tới</Text>
          </View>
        )}

        {/* 3. Hoàn thành (COMPLETED) */}
        <Text className="text-sm font-bold text-gray-800 mb-2">✅ Trận đấu đã hoàn thành</Text>
        {completedMatches.length > 0 ? (
          completedMatches.map((match: any) => (
            <View key={match.id} className="bg-gray-100 rounded-2xl p-3 mb-2 border border-gray-200 flex-row justify-between items-center opacity-75">
              <Text className="font-semibold text-gray-700 text-xs flex-1 text-right">{match.teamA}</Text>
              <Text className="font-bold text-indigo-600 px-2 text-xs">{match.score}</Text>
              <Text className="font-semibold text-gray-700 text-xs flex-1 text-left">{match.teamB}</Text>
            </View>
          ))
        ) : (
          <View className="bg-gray-50 rounded-2xl p-3 items-center border border-dashed border-gray-300">
            <Text className="text-xs text-gray-400">Chưa có trận đấu nào hoàn thành</Text>
          </View>
        )}

      </View>
    </ScrollView>
  );
};
