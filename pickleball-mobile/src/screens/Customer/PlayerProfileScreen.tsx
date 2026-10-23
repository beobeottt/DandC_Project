import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { api } from '../../services/api';
import { useSession } from '../../SessionContext';

export const PlayerProfileScreen = () => {
  const navigation = useNavigation<any>();
  const { clearSession } = useSession();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Dùng useFocusEffect để kiểm tra token mỗi khi màn hình Profile được focus vào
  useFocusEffect(
    React.useCallback(() => {
      checkLoginAndFetchProfile();
    }, [])
  );

  const checkLoginAndFetchProfile = async () => {
    try {
      const token = await AsyncStorage.getItem('access_token');
      if (!token) {
        navigation.replace('Auth');
        return;
      }

      const response = await api.get('/users/profile');
      setUser(response.data);
    } catch (error: any) {
      if (error.response?.status === 401) {
        await clearSession();
        navigation.replace('Auth');
      } else {
        Alert.alert('Lỗi', 'Không thể tải thông tin người dùng');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await clearSession();
    Alert.alert('Đăng xuất', 'Đã đăng xuất tài khoản thành công!');
    navigation.reset({
      index: 0,
      routes: [{ name: 'Auth' }],
    });
  };

  if (loading) {
    return (
      <View className="flex-1 bg-gray-50 justify-center items-center">
        <Text className="text-gray-500">Đang kiểm tra phiên đăng nhập...</Text>
      </View>
    );
  }
  const formatPlayingHand = (hand: string) => {
    if (!hand) return 'Chưa cập nhật';
    if (hand === 'RIGHT' || hand === 'Phải') return 'Tay phải';
    if (hand === 'LEFT' || hand === 'Trái') return 'Tay trái';
    return hand;
  };

  const formatPreferredPosition = (position: string) => {
    if (!position) return 'Chưa cập nhật';
    if (position === 'LEFT') return 'Ô 1';
    if (position === 'RIGHT') return 'Ô 2';
    if (position === 'BOTH') return 'Bất kỳ vị trí nào';
    return position;
  }

  return (
    <ScrollView className="flex-1 bg-gray-50 px-5 pt-14 pb-24">
      {/* Xin chào user */}
      <View className="bg-gray-200 self-start px-4 py-2 rounded-xl mb-4">
        <Text className="text-gray-800 font-bold text-sm">Xin chào {user?.fullName || 'Người dùng'}</Text>
      </View>

      {/* Avatar, Tên & Level */}
      <View className="items-center mb-6">
        <View className="w-24 h-24 bg-gray-300 rounded-3xl justify-center items-center border border-gray-400 mb-3 shadow-sm">
          <Text className="text-gray-600 font-bold">Avatar</Text>
        </View>
        <Text className="text-gray-900 font-extrabold text-lg">{user?.nickname || user?.fullName || 'Chưa cập nhật'}</Text>
        <Text className="text-gray-500 font-medium text-sm mb-2">{user?.email || ''}</Text>
        <View className="bg-gray-100 px-3 py-1 rounded-full mb-2">
          <Text className="text-gray-700 font-bold text-xs">
            Vai trò: {user?.role === 'ORGANIZER' ? 'Ban tổ chức' : user?.role === 'REFEREE' ? 'Trọng tài' : 'Vận động viên'}
          </Text>
        </View>
        
        {/* Hiển thị Level */}
        <View className="bg-indigo-100 px-3 py-1 rounded-full border border-indigo-200">
          <Text className="text-indigo-700 font-bold text-xs">⭐ Level: {user?.level ?? 'chưa có thông tin'}</Text>
        </View>
      </View>

      {/* Thẻ Sở thích chơi (Binding dữ liệu động chuẩn xác từ API) */}
      <View className="bg-gray-200/80 rounded-3xl p-4 border border-gray-300 mb-4">
        <Text className="text-gray-900 font-bold text-sm mb-3">Sở thích chơi</Text>
        
        <View className="flex-row justify-between mb-2">
          <Text className="text-xs text-gray-700">Tay thuận:</Text>
          <Text className="text-xs text-gray-900 font-bold">{formatPlayingHand(user?.playingHand)}</Text>
        </View>

        <View className="flex-row justify-between mb-2">
          <Text className="text-xs text-gray-700">Vị trí ưa thích:</Text>
          <Text className="text-xs text-gray-900 font-bold">{formatPreferredPosition(user?.preferredPosition)}</Text>
        </View>

        <View className="flex-row justify-between">
          <Text className="text-xs text-gray-700">Kỹ năng / Lối chơi:</Text>
          <Text className="text-xs text-gray-900 font-bold">
            {user?.skills && user.skills.length > 0 ? user.skills.join(', ') : 'Chưa cập nhật'}
          </Text>
        </View>
      </View>

      {/* Các nút chức năng & chuyển trang */}
      <View className="space-y-3 mb-8">
        <TouchableOpacity 
          className="bg-gray-200/90 py-3.5 px-4 rounded-2xl flex-row justify-between items-center shadow-sm mb-3"
          onPress={() => navigation.navigate('EditProfile')}
        >
          <Text className="text-gray-900 font-bold text-sm">✏️ Chỉnh sửa thông tin</Text>
          <Text className="text-gray-600 font-bold">&gt;</Text>
        </TouchableOpacity>

        {user?.role === 'PLAYER' && (
          <>
            <TouchableOpacity 
              className="bg-gray-200/90 py-3.5 px-4 rounded-2xl flex-row justify-between items-center border border-gray-300 mb-3"
              onPress={() => navigation.navigate('TournamentInvitations')}
            >
              <Text className="text-gray-900 font-bold text-sm">Lời mời tham gia giải</Text>
              <Text className="text-gray-600 font-bold">&gt;</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              className="bg-gray-200/90 py-3.5 px-4 rounded-2xl flex-row justify-between items-center border border-gray-300 mb-3"
              onPress={() => navigation.navigate('MatchHistory')} 
            >
              <Text className="text-gray-900 font-bold text-sm">Lịch sử đấu</Text>
              <Text className="text-gray-600 font-bold">&gt;</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              className="bg-gray-200/90 py-3.5 px-4 rounded-2xl flex-row justify-between items-center border border-gray-300 mb-3"
              onPress={() => navigation.navigate('TrainingHistory')}
            >
              <Text className="text-gray-900 font-bold text-sm">Lịch sử tập luyện</Text>
              <Text className="text-gray-600 font-bold">&gt;</Text>
            </TouchableOpacity>
          </>
        )}

        <View className="bg-gray-200/90 py-3.5 px-4 rounded-2xl flex-row justify-between items-center border border-gray-300 mb-3">
          <Text className="text-gray-900 font-bold text-sm">🏆 Danh hiệu</Text>
          <Text className="text-gray-400 text-xs italic">Chưa có danh hiệu</Text>
        </View>

        <View className="bg-gray-200/90 py-3.5 px-4 rounded-2xl flex-row justify-between items-center border border-gray-300 mb-3">
          <Text className="text-gray-900 font-bold text-sm">⚙️ Hỗ trợ ứng dụng</Text>
          <Text className="text-gray-500 text-xs">App support - Liên hệ xử lý vấn đề</Text>
        </View>
      </View>

      {/* Đăng xuất */}
      <TouchableOpacity 
        className="bg-gray-300 py-4 rounded-2xl items-center border border-gray-400 mb-8"
        onPress={handleLogout}
      >
        <Text className="text-gray-900 font-bold text-base">Đăng xuất</Text>
      </TouchableOpacity>
    </ScrollView>
  );
};
