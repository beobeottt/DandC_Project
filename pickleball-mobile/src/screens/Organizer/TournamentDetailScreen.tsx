import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, Alert, TextInput, Linking, Image } from 'react-native';
import { api } from '../../services/api';
import { io } from 'socket.io-client';

export const TournamentDetailScreen = ({ route, navigation }: any) => {
  const { tournamentId } = route.params || {};
  
  const [tournamentData, setTournamentData] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [updating, setUpdating] = useState<boolean>(false);
  const [liveLinkDrafts, setLiveLinkDrafts] = useState<Record<string, string>>({});
  const [activeTab, setActiveTab] = useState<'matches' | 'teams' | 'players'>('matches');
  const [matchStage, setMatchStage] = useState<'GROUP' | 'KNOCKOUT'>('GROUP');
  const [descriptionExpanded, setDescriptionExpanded] = useState(false);

  const fetchTournamentDetails = useCallback(async () => {
    try {
      const response = await api.get(`/tournament/${tournamentId}/matches`);
      setTournamentData(response.data);
      const nextLinks: Record<string, string> = {};
      for (const match of response.data?.matches || []) {
        nextLinks[match.id] = match.liveStreamUrl || '';
      }
      setLiveLinkDrafts(nextLinks);
    } catch (error) {
      console.error('Không thể tải chi tiết giải đấu:', error);
      Alert.alert('Lỗi', 'Không thể tải danh sách trận đấu của giải.');
    } finally {
      setLoading(false);
    }
  }, [tournamentId]);

  useEffect(() => {
    if (tournamentId) {
      void fetchTournamentDetails();
    }
  }, [fetchTournamentDetails, tournamentId]);

  useEffect(() => {
    if (!tournamentId) return;
    const socket = io(api.defaults.baseURL || 'http://localhost:3000', { transports: ['websocket'] });
    socket.on('connect', () => socket.emit('joinTournamentRoom', { tournamentId }));
    socket.on('matchStatusUpdated', () => void fetchTournamentDetails());
    socket.on('matchScoreUpdated', () => void fetchTournamentDetails());
    socket.on('matchLiveLinkUpdated', () => void fetchTournamentDetails());
    socket.on('connect_error', error => console.error('Không kết nối được realtime:', error.message));
    return () => {
      socket.disconnect();
    };
  }, [fetchTournamentDetails, tournamentId]);

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

  const handleAdjustScore = async (
    matchId: string,
    scoreA: number | null,
    scoreB: number | null,
    side: 'A' | 'B',
    adjustment: 1 | -1,
  ) => {
    const nextScoreA = Math.max(0, (scoreA ?? 0) + (side === 'A' ? adjustment : 0));
    const nextScoreB = Math.max(0, (scoreB ?? 0) + (side === 'B' ? adjustment : 0));
    try {
      setUpdating(true);
      const response = await api.patch(`/tournament/match/${matchId}/score`, {
        scoreA: nextScoreA,
        scoreB: nextScoreB,
      });
      setTournamentData((current: any) => ({
        ...current,
        matches: current.matches.map((currentMatch: any) => currentMatch.id === matchId
          ? {
              ...currentMatch,
              scoreA: response.data.scoreA,
              scoreB: response.data.scoreB,
              score: `${response.data.scoreA} - ${response.data.scoreB}`,
            }
          : currentMatch),
      }));
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
  const tournament = tournamentData?.tournament;
  const isLive = tournament?.isLive === true;
  const canManageMatches = tournamentData?.canManageMatches === true;
  const playerRegistrations = tournamentData?.playerRegistrations || {
    approved: [],
    awaitingApproval: [],
    awaitingResponse: [],
    rejected: [],
  };
  
  // Lọc chuẩn 3 trạng thái từ dữ liệu trả về của backend
  const phaseMatches = matches.filter((match: any) => match.stage
    ? match.stage === matchStage || (matchStage === 'KNOCKOUT' && match.stage === 'BRONZE')
    : matchStage === 'GROUP' ? Boolean(match.groupId) : !match.groupId);
  const liveMatches = phaseMatches.filter((m: any) => m.rawStatus === 'IN_PROGRESS' || m.status === 'Đang diễn ra');
  const upcomingMatches = phaseMatches.filter((m: any) => m.rawStatus === 'SCHEDULED' || m.status === 'Sắp diễn ra');
  const completedMatches = phaseMatches.filter((m: any) => m.rawStatus === 'COMPLETED' || m.status === 'Đã kết thúc');
  const registeredPlayers = [
    ...(playerRegistrations.approved || []),
    ...(playerRegistrations.awaitingApproval || []),
  ];
  const imageUri = tournament?.coverImageUrl
    ? `${api.defaults.baseURL}${tournament.coverImageUrl}`
    : null;

  return (
    <ScrollView className="flex-1 bg-gray-100 px-5 pt-12 pb-10">
      {tournament && (
        <>
          <View className="mb-3 overflow-hidden rounded-3xl border border-gray-200 bg-white">
            {imageUri ? (
              <Image source={{ uri: imageUri }} className="h-52 w-full bg-gray-100" resizeMode="cover" />
            ) : (
              <View className="h-40 items-center justify-center bg-indigo-50"><Text className="text-5xl">🏆</Text></View>
            )}
            <View className="p-5">
              <Text className="text-xl font-black text-gray-900">{tournament.name}</Text>
              <Text className="mt-2 text-sm text-gray-600" numberOfLines={descriptionExpanded ? undefined : 3}>
                {tournament.description || 'Chưa có mô tả cho giải đấu này.'}
              </Text>
              {tournament.description?.length > 120 && (
                <TouchableOpacity onPress={() => setDescriptionExpanded(current => !current)}>
                  <Text className="mt-1 text-xs font-bold text-indigo-700">
                    {descriptionExpanded ? 'Thu gọn' : 'Xem thêm'}
                  </Text>
                </TouchableOpacity>
              )}
              <View className="mt-4 flex-row flex-wrap gap-2">
                {[
                  { label: 'Đã đăng ký', value: `${registeredPlayers.length} người` },
                  { label: 'Giải thưởng', value: `${tournament.championPrizeMoney?.toLocaleString('vi-VN') || 0}₫` },
                  { label: 'Phí / người', value: `${tournament.feePerPlayer?.toLocaleString('vi-VN') || 0}₫` },
                  { label: 'Địa điểm', value: tournament.location || 'Đang cập nhật' },
                  { label: 'Thời gian', value: `${new Date(tournament.startAt).toLocaleDateString('vi-VN')}${tournament.endAt ? ` – ${new Date(tournament.endAt).toLocaleDateString('vi-VN')}` : ''}` },
                  { label: 'Nội dung', value: tournament.formatDetails?.map((format: any) => format.format.replace(/_/g, ' ')).join(', ') || 'Đang cập nhật' },
                ].map(item => (
                  <View key={item.label} className="min-w-[45%] flex-1 rounded-xl bg-gray-50 p-3">
                    <Text className="text-[10px] font-semibold text-gray-500">{item.label}</Text>
                    <Text className="mt-1 text-xs font-bold text-gray-800">{item.value}</Text>
                  </View>
                ))}
              </View>
              <Text className="mt-3 text-xs text-gray-500">🏅 {tournament.awardTypes?.join(', ') || 'Chưa cập nhật giải thưởng'}</Text>
            </View>
          </View>
          {tournament.contactLink && (
            <TouchableOpacity
              className="mb-4 items-center rounded-2xl bg-indigo-600 py-3.5"
              onPress={() => Linking.openURL(tournament.contactLink).catch(() => Alert.alert('Lỗi', 'Không mở được đường link liên hệ'))}
            >
              <Text className="text-sm font-bold text-white">Liên hệ Ban tổ chức</Text>
            </TouchableOpacity>
          )}
          {isLive && (
            <>
              <View className="mb-4 flex-row rounded-2xl bg-white p-1">
                {[
                  { key: 'teams', label: 'Đội' },
                  { key: 'matches', label: 'Trận đấu' },
                  { key: 'players', label: 'VĐV' },
                ].map(tab => (
                  <TouchableOpacity
                    key={tab.key}
                    className={`flex-1 items-center rounded-xl py-3 ${activeTab === tab.key ? 'bg-indigo-600' : ''}`}
                    onPress={() => setActiveTab(tab.key as typeof activeTab)}
                  >
                    <Text className={`text-xs font-bold ${activeTab === tab.key ? 'text-white' : 'text-gray-600'}`}>{tab.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              {activeTab === 'teams' && (
                <View className="mb-4 rounded-3xl border border-gray-200 bg-white p-4">
                  <Text className="mb-3 text-base font-extrabold text-gray-900">Các đội theo bảng</Text>
                  {tournamentData.groups?.length ? tournamentData.groups.map((group: any) => (
                    <View key={group.id} className="mb-3 rounded-2xl bg-gray-50 p-3">
                      <Text className="mb-2 font-bold text-indigo-800">{group.name}</Text>
                      {group.teams?.length ? group.teams.map((team: any) => (
                        <View key={team.id} className="mb-2 rounded-xl bg-white p-3">
                          <Text className="text-sm font-bold text-gray-900">{team.name}</Text>
                          {team.members?.map((member: any, index: number) => (
                            <Text key={`${team.id}-${index}`} className="mt-1 text-xs text-gray-600">{member.fullName}</Text>
                          ))}
                        </View>
                      )) : <Text className="text-xs text-gray-500">Chưa có đội trong bảng.</Text>}
                    </View>
                  )) : <Text className="text-xs text-gray-500">Chưa có bảng đấu được tạo.</Text>}
                </View>
              )}
              {activeTab === 'players' && (
                <View className="mb-4 rounded-3xl border border-gray-200 bg-white p-4">
                  <Text className="mb-3 text-base font-extrabold text-gray-900">Danh sách người tham gia</Text>
                  <Text className="mb-2 rounded-xl bg-indigo-50 p-3 text-xs font-semibold text-indigo-800">
                    Ban tổ chức · {tournament.organizerName || 'Ban tổ chức'}
                  </Text>
                  {registeredPlayers.length ? registeredPlayers.map((player: any) => (
                    <Text key={player.memberId} className="border-b border-gray-100 py-2 text-sm text-gray-700">
                      {player.fullName}{player.isGuest ? ' · VĐV khách' : ''}
                    </Text>
                  )) : <Text className="text-xs text-gray-500">Chưa có người chơi đăng ký.</Text>}
                </View>
              )}
              {activeTab === 'matches' && (
                <View className="mb-3 flex-row rounded-2xl bg-white p-1">
                  {[
                    { key: 'GROUP', label: 'Vòng bảng' },
                    { key: 'KNOCKOUT', label: 'Vòng loại trực tiếp' },
                  ].map(phase => (
                    <TouchableOpacity
                      key={phase.key}
                      className={`flex-1 items-center rounded-xl py-3 ${matchStage === phase.key ? 'bg-indigo-100' : ''}`}
                      onPress={() => setMatchStage(phase.key as typeof matchStage)}
                    >
                      <Text className={`text-xs font-bold ${matchStage === phase.key ? 'text-indigo-800' : 'text-gray-500'}`}>{phase.label}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </>
          )}
          {isLive && (
            <TouchableOpacity
              className="mb-4 items-center rounded-2xl border border-amber-200 bg-amber-50 py-3.5"
              onPress={() => navigation.navigate('TournamentResults', { tournamentId })}
            >
              <Text className="text-sm font-bold text-amber-900">Kết quả giải đấu</Text>
            </TouchableOpacity>
          )}
        </>
      )}

      {isLive && activeTab === 'matches' && (
      <View className="bg-white rounded-3xl p-5 border border-gray-200 shadow-sm">
        <Text className="text-lg font-black text-center text-gray-900 mb-4 uppercase tracking-wide">
          {tournamentData?.tournamentName || 'Giải đấu Pickleball'}
        </Text>

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
                  <Text className="mb-2 text-center text-xs font-bold text-gray-700">Bảng cộng / trừ điểm trực tiếp</Text>
                  <View className="flex-row items-center justify-between rounded-2xl bg-white p-3">
                    {[
                      { side: 'A' as const, score: match.scoreA ?? 0 },
                      { side: 'B' as const, score: match.scoreB ?? 0 },
                    ].map(team => (
                      <View key={team.side} className="flex-1 items-center">
                        <Text className="mb-2 text-[10px] font-semibold text-gray-500">
                          {team.side === 'A' ? match.teamA : match.teamB}
                        </Text>
                        <View className="flex-row items-center gap-3">
                          <TouchableOpacity
                            className="h-10 w-10 items-center justify-center rounded-xl bg-gray-200"
                            onPress={() => void handleAdjustScore(match.id, match.scoreA, match.scoreB, team.side, -1)}
                            disabled={updating || team.score <= 0}
                          >
                            <Text className="text-xl font-bold text-gray-800">−</Text>
                          </TouchableOpacity>
                          <Text className="min-w-[28px] text-center text-2xl font-black text-indigo-700">{team.score}</Text>
                          <TouchableOpacity
                            className="h-10 w-10 items-center justify-center rounded-xl bg-indigo-100"
                            onPress={() => void handleAdjustScore(match.id, match.scoreA, match.scoreB, team.side, 1)}
                            disabled={updating}
                          >
                            <Text className="text-xl font-bold text-indigo-700">+</Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    ))}
                  </View>

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
              <Text className="mb-2 text-[10px] font-bold text-indigo-700">{match.round}</Text>
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
                  {match.teamAId && match.teamBId ? (
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
                  ) : (
                    <Text className="mt-2 text-center text-xs text-gray-500">Đang chờ đội thắng ở vòng trước</Text>
                  )}
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
      )}
    </ScrollView>
  );
};
