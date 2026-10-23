import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, Alert } from 'react-native';
import { io } from 'socket.io-client';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Đổi URL kết nối khớp với Backend NestJS của bạn (IP local hoặc domain)
const SOCKET_URL = 'http://localhost:3000'; 

export const RefereeLiveScoreScreen = ({ route }: any) => {
  // Nhận tournamentId và matchId từ navigation params
  const tournamentId = route?.params?.tournamentId || '1';
  const matchId = route?.params?.matchId || 'match-1';

  const [scoreTeam1, setScoreTeam1] = useState(5);
  const [scoreTeam2, setScoreTeam2] = useState(10);
  const [socket, setSocket] = useState<any>(null);

  useEffect(() => {
    const newSocket = io(SOCKET_URL, {
      transports: ['websocket'],
    });
    setSocket(newSocket);

    newSocket.on('connect', () => {
      console.log('Connected to WebSocket server');
      newSocket.emit('joinTournamentRoom', { tournamentId });
    });

    // Lắng nghe sự kiện cập nhật tỷ số realtime từ server gửi về cho mọi người quan sát
    newSocket.on('scoreUpdated', (data: { matchId: string; score1: number; score2: number }) => {
      if (data.matchId === matchId) {
        setScoreTeam1(data.score1);
        setScoreTeam2(data.score2);
      }
    });

    return () => {
      newSocket.disconnect();
    };
  }, [tournamentId, matchId]);

  // Hàm thay đổi điểm và phát (emit) sự kiện lên WebSocket server
  const updateScore = (newScore1: number, newScore2: number) => {
    setScoreTeam1(newScore1);
    setScoreTeam2(newScore2);

    if (socket) {
      // Gửi điểm mới lên server để broadcast cho tất cả người xem live
      socket.emit('updateScore', {
        tournamentId,
        matchId,
        score1: newScore1,
        score2: newScore2,
      });
    }
  };

  const handleFinishMatch = () => {
    Alert.alert('Thành công', 'Đã hoàn thành trận đấu và đồng bộ kết quả!');
  };

  return (
    <View className="flex-1 bg-gray-100 p-6 justify-center">
      {/* Header */}
      <View className="flex-row justify-between items-center mb-2">
        <View className="bg-gray-200 px-4 py-2 rounded-xl">
          <Text className="text-gray-800 font-bold text-sm">Xin chào trọng tài</Text>
        </View>
        <Text className="text-gray-900 font-bold text-base">Live Score (Realtime)</Text>
      </View>
      <Text className="text-gray-500 text-xs mb-6">Chủ nhật, Ngày 12 tháng 10 năm 2026</Text>

      {/* Bảng điểm trực tiếp */}
      <View className="bg-gray-200/90 p-6 rounded-3xl border border-gray-300 mb-6 shadow-sm">
        <View className="flex-row justify-around items-center mb-6">
          
          {/* Team 1 */}
          <View className="flex-1 items-center">
            <Text className="text-xs text-gray-700 font-semibold mb-2 text-center">Bảo Long - Hoàng Khang</Text>
            <View className="bg-red-200 w-full py-4 rounded-xl border border-red-300 items-center">
              <Text className="text-2xl font-bold text-gray-900">{scoreTeam1}</Text>
            </View>
          </View>

          <Text className="mx-4 text-gray-400 font-bold text-lg">vs</Text>

          {/* Team 2 */}
          <View className="flex-1 items-center">
            <Text className="text-xs text-gray-700 font-semibold mb-2 text-center">Khoa Lu - Hoàng Long</Text>
            <View className="bg-red-200 w-full py-4 rounded-xl border border-red-300 items-center">
              <Text className="text-2xl font-bold text-gray-900">{scoreTeam2}</Text>
            </View>
          </View>

        </View>

        {/* Nút tăng giảm điểm */}
        <View className="flex-row justify-around items-center pt-2">
          {/* Controls Team 1 */}
          <View className="flex-row gap-3">
            <TouchableOpacity 
              onPress={() => updateScore(scoreTeam1 + 1, scoreTeam2)}
              className="bg-red-200 w-12 h-12 rounded-xl items-center justify-center border border-red-300 shadow-sm active:bg-red-300"
            >
              <Text className="text-lg font-bold text-gray-900">+</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              onPress={() => updateScore(Math.max(0, scoreTeam1 - 1), scoreTeam2)}
              className="bg-red-200 w-12 h-12 rounded-xl items-center justify-center border border-red-300 shadow-sm active:bg-red-300"
            >
              <Text className="text-lg font-bold text-gray-900">-</Text>
            </TouchableOpacity>
          </View>

          {/* Controls Team 2 */}
          <View className="flex-row gap-3">
            <TouchableOpacity 
              onPress={() => updateScore(scoreTeam1, scoreTeam2 + 1)}
              className="bg-red-200 w-12 h-12 rounded-xl items-center justify-center border border-red-300 shadow-sm active:bg-red-300"
            >
              <Text className="text-lg font-bold text-gray-900">+</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              onPress={() => updateScore(scoreTeam1, Math.max(0, scoreTeam2 - 1))}
              className="bg-red-200 w-12 h-12 rounded-xl items-center justify-center border border-red-300 shadow-sm active:bg-red-300"
            >
              <Text className="text-lg font-bold text-gray-900">-</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* Nút Hoàn thành trận đấu */}
      <TouchableOpacity 
        onPress={handleFinishMatch}
        className="bg-gray-200 py-4 rounded-2xl items-center border border-gray-400 shadow-sm active:bg-gray-300"
      >
        <Text className="text-gray-900 font-bold text-base">Hoàn thành trận đấu</Text>
      </TouchableOpacity>
    </View>
  );
};
