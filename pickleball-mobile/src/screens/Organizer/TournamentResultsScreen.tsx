import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { io } from 'socket.io-client';
import { api } from '../../services/api';
import { useSession } from '../../SessionContext';

const SOCKET_URL = api.defaults.baseURL || 'http://localhost:3000';

export const TournamentResultsScreen = ({ route }: any) => {
  const { role } = useSession();
  const tournamentId = route?.params?.tournamentId;
  const [results, setResults] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [confirming, setConfirming] = useState(false);
  const [drawing, setDrawing] = useState(false);
  const animationTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const loadResults = useCallback(async () => {
    try {
      if (role === 'PLAYER') {
        const overallResponse = await api.get(`/draw/${tournamentId}/overall`);
        let playerResult = null;
        try {
          const playerResponse = await api.get(`/draw/${tournamentId}/my-result`);
          playerResult = playerResponse.data;
        } catch (error: any) {
          if (error.response?.status !== 404) throw error;
        }
        setResults({ ...overallResponse.data, ...(playerResult || {}) });
      } else {
        const response = await api.get(`/draw/${tournamentId}/overall`);
        setResults(response.data);
      }
    } catch (error: any) {
      if (error.response?.status === 404) {
        setResults(null);
      } else {
        Alert.alert('Lỗi', error.response?.data?.message || 'Không thể tải kết quả bốc thăm');
      }
    } finally {
      setLoading(false);
    }
  }, [role, tournamentId]);

  useFocusEffect(useCallback(() => {
    void loadResults();
  }, [loadResults]));

  useEffect(() => {
    if (!route?.params?.showAnimation) return;
    setDrawing(true);
    animationTimer.current = setTimeout(() => {
      setDrawing(false);
      void loadResults();
    }, 45000);
    return () => {
      if (animationTimer.current) clearTimeout(animationTimer.current);
    };
  }, [loadResults, route?.params?.showAnimation]);

  useEffect(() => {
    if (!tournamentId) return;
    const socket = io(SOCKET_URL, { transports: ['websocket'] });
    socket.on('connect', () => socket.emit('joinTournamentRoom', { tournamentId }));
    socket.on('draw_started', () => {
      setDrawing(true);
      if (animationTimer.current) clearTimeout(animationTimer.current);
      animationTimer.current = setTimeout(() => {
        setDrawing(false);
        void loadResults();
      }, 45000);
    });
    socket.on('matchScoreUpdated', () => void loadResults());
    socket.on('matchStatusUpdated', () => void loadResults());
    return () => {
      socket.disconnect();
      if (animationTimer.current) clearTimeout(animationTimer.current);
    };
  }, [loadResults, tournamentId]);

  const confirmMyInformation = async () => {
    setConfirming(true);
    try {
      await api.patch(`/draw/${tournamentId}/confirm-result`);
      if (role === 'PLAYER') {
        setResults((current: any) => ({ ...current, profileConfirmed: true }));
      } else {
        Alert.alert('Đã xác nhận', 'Thông tin của bạn đã được xác nhận.');
      }
    } catch (error: any) {
      Alert.alert('Lỗi', error.response?.data?.message || 'Không thể xác nhận thông tin');
    } finally {
      setConfirming(false);
    }
  };

  if (loading) {
    return <View className="flex-1 items-center justify-center"><ActivityIndicator color="#4f46e5" /></View>;
  }

  const isPlayer = role === 'PLAYER';
  const groups = results?.groups || [];
  const playerHasDraw = Boolean(results?.teamName);
  const overallHasDraw = groups.length > 0;

  return (
    <ScrollView className="flex-1 bg-gray-50 px-5 pt-12 pb-24">
      <Text className="mb-2 text-2xl font-extrabold text-gray-900">
        {isPlayer ? 'Kết quả đội của bạn' : 'Kết quả bốc thăm'}
      </Text>
      <Text className="mb-5 text-xs text-gray-500">{results?.tournamentName || 'Giải đấu'}</Text>

      {drawing && (
        <View className="mb-4 items-center rounded-2xl bg-indigo-700 p-6">
          <Text className="text-3xl">🎲</Text>
          <Text className="mt-2 text-center text-base font-extrabold text-white">Đang bốc thăm chia đội</Text>
          <Text className="mt-1 text-xs text-indigo-100">Kết quả sẽ tự động cập nhật sau khi hoàn tất.</Text>
        </View>
      )}

      {results?.podium && (
        <View className="mb-4 rounded-3xl border border-amber-200 bg-white p-5">
          <Text className="mb-4 text-center text-lg font-extrabold text-gray-900">🏆 Bảng xếp hạng</Text>
          {[
            { place: 'Hạng 1', name: results.podium.first, background: 'bg-amber-50', color: 'text-amber-800' },
            { place: 'Hạng 2', name: results.podium.second, background: 'bg-gray-100', color: 'text-gray-800' },
          ].map(row => (
            <View key={row.place} className={`mb-2 flex-row items-center justify-between rounded-xl p-3 ${row.background}`}>
              <Text className={`text-xs font-bold ${row.color}`}>{row.place}</Text>
              <Text className={`flex-1 pl-3 text-right text-sm font-extrabold ${row.color}`}>{row.name || 'Chờ trận chung kết'}</Text>
            </View>
          ))}
          <View className="rounded-xl bg-indigo-50 p-3">
            <Text className="mb-1 text-xs font-bold text-indigo-800">
              {results.podium.thirdPlacePending ? 'Hạng 3 · Chờ trận tranh hạng 3' : 'Đồng hạng 3'}
            </Text>
            {results.podium.third?.length
              ? results.podium.third.map((team: string, index: number) => (
                <Text key={`${team}-${index}`} className="mt-1 text-sm font-semibold text-indigo-900">{team}</Text>
              ))
              : <Text className="text-xs text-indigo-700">Chờ kết quả bán kết</Text>}
          </View>
        </View>
      )}

      {isPlayer && playerHasDraw && (
        <>
          <View className="mb-4 rounded-3xl bg-indigo-700 p-6">
            <Text className="text-center text-sm font-semibold text-indigo-100">Bạn thuộc</Text>
            <Text className="mt-1 text-center text-3xl font-black text-white">{results.teamName}</Text>
            <Text className="mt-2 text-center text-base font-bold text-white">{results.groupName}</Text>
          </View>
          <View className="mb-4 rounded-2xl border border-gray-200 bg-white p-4">
            <Text className="mb-3 text-sm font-bold text-gray-900">Thành viên cùng đội</Text>
            {results.members?.map((member: any, index: number) => (
              <Text key={`${member.fullName}-${index}`} className="mb-2 text-sm text-gray-700">
                {index + 1}. {member.fullName}
              </Text>
            ))}
          </View>
          <View className="mb-4 rounded-2xl border border-gray-200 bg-white p-4">
            <Text className="mb-3 text-sm font-bold text-gray-900">Lịch và kết quả các trận</Text>
            {results.matches?.length ? results.matches.map((match: any, index: number) => (
              <View key={`${match.round}-${index}`} className="mb-2 rounded-xl bg-gray-50 p-3">
                <Text className="text-xs font-semibold text-gray-700">
                  Vòng {match.round} · {match.status === 'COMPLETED' ? 'Đã kết thúc' : match.status === 'IN_PROGRESS' ? 'Đang diễn ra' : 'Sắp diễn ra'}
                </Text>
                <Text className="mt-1 text-sm text-gray-900">
                  {results.teamName} {match.myScore ?? 0} - {match.opponentScore ?? 0} {match.opponent}
                </Text>
              </View>
            )) : <Text className="text-xs text-gray-500">Chưa có trận đấu được xếp lịch.</Text>}
          </View>
          <TouchableOpacity
            className={`mb-6 items-center rounded-xl py-4 ${results.profileConfirmed ? 'bg-green-100' : 'bg-green-600'}`}
            onPress={() => void confirmMyInformation()}
            disabled={confirming || results.profileConfirmed}
          >
            <Text className={`font-bold ${results.profileConfirmed ? 'text-green-800' : 'text-white'}`}>
              {results.profileConfirmed ? '✓ Đã xác nhận thông tin' : confirming ? 'Đang xác nhận...' : 'Xác nhận thông tin đội'}
            </Text>
          </TouchableOpacity>
        </>
      )}

      {!isPlayer && overallHasDraw && groups.map((group: any) => (
        <View key={group.groupId} className="mb-4 rounded-2xl border border-gray-200 bg-white p-4">
          <Text className="mb-3 text-lg font-extrabold text-indigo-800">{group.groupName}</Text>
          {group.teams.map((team: any) => (
            <View key={team.teamId} className="mb-2 rounded-xl bg-gray-50 p-3">
              <Text className="mb-2 font-bold text-gray-900">{team.teamName}</Text>
              {team.members.map((member: any, index: number) => (
                <Text key={`${team.teamId}-${index}`} className="py-0.5 text-xs text-gray-600">
                  {member.fullName}
                </Text>
              ))}
            </View>
          ))}
          {group.matches?.length > 0 && (
            <View className="mt-2 border-t border-gray-100 pt-3">
              <Text className="mb-2 text-xs font-bold text-gray-700">Lịch thi đấu / Kết quả</Text>
              {group.matches.map((match: any) => (
                <Text key={match.id} className="mb-1 text-xs text-gray-600">
                  {match.teamA} {match.scoreA ?? '-'} : {match.scoreB ?? '-'} {match.teamB}
                  {' · '}{match.status === 'COMPLETED' ? 'Kết thúc' : match.status === 'IN_PROGRESS' ? 'Đang đấu' : 'Sắp đấu'}
                </Text>
              ))}
            </View>
          )}
        </View>
      ))}

      {!isPlayer && results?.knockoutMatches?.length > 0 && (
        <View className="mb-4 rounded-2xl border border-gray-200 bg-white p-4">
          <Text className="mb-3 text-lg font-extrabold text-gray-900">Vòng loại trực tiếp</Text>
          {results.knockoutMatches.map((match: any) => {
            const lastRound = Math.max(...results.knockoutMatches.map((item: any) => item.round));
            const roundName = match.round === lastRound
              ? 'Chung kết'
              : match.round === lastRound - 1
                ? 'Bán kết'
                : match.round === lastRound - 2
                  ? 'Tứ kết'
                  : `Vòng ${match.round}`;
            return (
              <View key={match.id} className="mb-2 rounded-xl bg-gray-50 p-3">
                <Text className="mb-1 text-[10px] font-bold text-indigo-700">{roundName}</Text>
                <Text className="text-xs text-gray-800">
                  {match.teamA} {match.scoreA ?? '-'} : {match.scoreB ?? '-'} {match.teamB}
                </Text>
              </View>
            );
          })}
        </View>
      )}

      {!(isPlayer ? playerHasDraw : overallHasDraw) && !drawing && (
        <View className="items-center rounded-2xl border border-dashed border-gray-300 bg-white p-6">
          <Text className="text-center text-sm font-semibold text-gray-700">Giải đấu chưa có kết quả bốc thăm.</Text>
          <Text className="mt-2 text-center text-xs text-gray-500">
            Kết quả sẽ xuất hiện ở đây sau khi Ban tổ chức hoàn tất bốc thăm.
          </Text>
        </View>
      )}
    </ScrollView>
  );
};
