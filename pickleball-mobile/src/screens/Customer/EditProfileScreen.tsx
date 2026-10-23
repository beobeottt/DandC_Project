import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  ScrollView, 
  ActivityIndicator, 
  Alert 
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { api } from '../../services/api';

export const EditProfileScreen = () => {
  const navigation = useNavigation<any>();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [bio, setBio] = useState('');
  const [playingHand, setPlayingHand] = useState('');
  const [preferredPosition, setPreferredPosition] = useState('');

  useEffect(() => {
    fetchUserData();
  }, []);

  const fetchUserData = async () => {
    try {
      const response = await api.get('/users/profile');
      const data = response.data;
      
      setFullName(data.fullName || '');
      setPhone(data.phone || '');
      setBio(data.bio || '');
      setPlayingHand(data.playingHand || '');
      setPreferredPosition(data.preferredPosition || '');
    } catch (error) {
      Alert.alert('Lỗi', 'Không thể tải thông tin người dùng');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.patch('/users/profile', {
        phone: phone || null,
        bio: bio || null,
        playingHand: playingHand || null,
        preferredPosition: preferredPosition || null,
      });

      Alert.alert('Thành công', 'Cập nhật thông tin thành công!', [
        { text: 'OK', onPress: () => navigation.goBack() }
      ]);
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || 'Không thể lưu thay đổi';
      Alert.alert('Lỗi', Array.isArray(errorMessage) ? errorMessage[0] : errorMessage);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View className="flex-1 bg-gray-50 justify-center items-center">
        <ActivityIndicator size="large" color="#4f46e5" />
        <Text className="text-gray-500 mt-2">Đang tải dữ liệu...</Text>
      </View>
    );
  }

  return (
    <ScrollView className="flex-1 bg-gray-50 px-5 pt-12 pb-12">
      {/* Header */}
      <View className="flex-row justify-between items-center mb-6">
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text className="text-indigo-600 font-bold text-base">&larr; Quay lại</Text>
        </TouchableOpacity>
        <Text className="text-xl font-extrabold text-gray-900">Chỉnh sửa hồ sơ</Text>
        <View style={{ width: 50 }} />
      </View>

      {/* Form chỉnh sửa */}
      <View className="bg-white rounded-3xl p-5 border border-gray-200 shadow-sm mb-6">
        
        {/* Họ và tên (Khóa không cho sửa) */}
        <View className="mb-4">
          <Text className="text-xs font-bold text-gray-500 mb-1 ml-1">Họ và tên (Không thể thay đổi)</Text>
          <TextInput
            className="bg-gray-100 text-gray-500 px-4 py-3.5 rounded-2xl font-medium border border-gray-200"
            value={fullName}
            editable={false} // Khóa không cho chỉnh sửa
          />
        </View>

        {/* Số điện thoại */}
        <View className="mb-4">
          <Text className="text-xs font-bold text-gray-700 mb-1 ml-1">Số điện thoại</Text>
          <TextInput
            className="bg-gray-50 text-gray-900 px-4 py-3.5 rounded-2xl font-medium border border-gray-200"
            placeholder="Chưa cập nhật"
            placeholderTextColor="#9CA3AF"
            keyboardType="phone-pad"
            value={phone}
            onChangeText={setPhone}
          />
        </View>

        {/* Tay thuận */}
        <View className="mb-4">
          <Text className="text-xs font-bold text-gray-700 mb-1 ml-1">Tay thuận (RIGHT / LEFT)</Text>
          <TextInput
            className="bg-gray-50 text-gray-900 px-4 py-3.5 rounded-2xl font-medium border border-gray-200"
            placeholder="VD: RIGHT"
            placeholderTextColor="#9CA3AF"
            value={playingHand}
            onChangeText={setPlayingHand}
          />
        </View>

        {/* Vị trí ưa thích */}
        <View className="mb-4">
          <Text className="text-xs font-bold text-gray-700 mb-1 ml-1">Vị trí ưa thích</Text>
          <TextInput
            className="bg-gray-50 text-gray-900 px-4 py-3.5 rounded-2xl font-medium border border-gray-200"
            placeholder="VD: Ô 1 hoặc Ô 2"
            placeholderTextColor="#9CA3AF"
            value={preferredPosition}
            onChangeText={setPreferredPosition}
          />
        </View>

        <View className="mb-2">
          <Text className="text-xs font-bold text-gray-700 mb-1 ml-1">Tiểu sử (Bio)</Text>
          <TextInput
            className="bg-gray-50 text-gray-900 px-4 py-3.5 rounded-2xl font-medium border border-gray-200"
            placeholder="Viết vài dòng giới thiệu về bạn..."
            placeholderTextColor="#9CA3AF"
            multiline
            numberOfLines={3}
            style={{ textAlignVertical: 'top', height: 90 }}
            value={bio}
            onChangeText={setBio}
          />
        </View>
      </View>

      {/* Nút lưu thay đổi */}
      <TouchableOpacity 
        className="bg-indigo-600 py-4 rounded-2xl items-center shadow-sm shadow-indigo-300"
        onPress={handleSave}
        disabled={saving}
      >
        {saving ? (
          <ActivityIndicator color="#FFFFFF" />
        ) : (
          <Text className="text-white font-bold text-base">Lưu thay đổi</Text>
        )}
      </TouchableOpacity>
    </ScrollView>
  );
};
