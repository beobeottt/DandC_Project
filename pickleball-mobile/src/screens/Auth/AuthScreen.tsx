import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';
import { api } from '../../services/api';
import { isUserRole, useSession } from '../../SessionContext';

export const AuthScreen = () => {
  const navigation = useNavigation<any>();
  const { setRole } = useSession();
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);

  // Form state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [requestedRole, setRequestedRole] = useState<'PLAYER' | 'ORGANIZER'>('PLAYER');

  const handleSubmit = async () => {
    if (!email || !password || (!isLogin && !fullName)) {
      Alert.alert('Lỗi', 'Vui lòng điền đầy đủ thông tin');
      return;
    }

    setLoading(true);
    try {
      if (isLogin) {
        // --- GỌI API ĐĂNG NHẬP ---
        const response = await api.post('/auth/login', { email, password });

        const accessToken = response.data.access_token || response.data.accessToken;
        if (!accessToken) {
          throw new Error('Máy chủ không trả về access token.');
        }
        await AsyncStorage.setItem('access_token', accessToken);
        const userData = response.data.user;
        const role = isUserRole(userData?.role)
          ? userData.role
          : (await api.get('/users/profile')).data?.role;
        if (!isUserRole(role)) {
          throw new Error('Tài khoản chưa được gán vai trò hợp lệ.');
        }
        await setRole(role);
        Alert.alert('Thành công', `Chào mừng ${userData?.fullName || 'bạn'} trở lại!`);
        navigation.replace('Home');
      } else {
        const response = await api.post('/auth/register', { 
          email, 
          password, 
          fullName,
          requestedRole,
        });
        
        const accessToken = response.data.access_token || response.data.accessToken;
        const role = response.data.user?.role;
        if (!accessToken || !isUserRole(role)) {
          throw new Error('Máy chủ không trả về thông tin phiên hợp lệ.');
        }
        await AsyncStorage.setItem('access_token', accessToken);
        await setRole(role);
        Alert.alert(
          'Đăng ký thành công',
          requestedRole === 'ORGANIZER'
            ? 'Tài khoản của bạn đang là VĐV cho đến khi quản trị viên duyệt yêu cầu Ban tổ chức.'
            : 'Tài khoản vận động viên đã được tạo.',
        );
        navigation.replace('Home');
      }

    } catch (error: any) {
      console.log('CHI TIẾT LỖI LOGIN:', error.response || error);

      const errorMessage = error.response?.data?.message || error.message || 'Có lỗi xảy ra, vui lòng thử lại';
      Alert.alert('Lỗi', Array.isArray(errorMessage) ? errorMessage[0] : errorMessage);
    }
    finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      className="flex-1 bg-background justify-center p-6"
    >
      <View className="mb-10">
        <Text className="text-4xl font-extrabold text-primary mb-2">MatchPoint</Text>
        <Text className="text-lg text-textSub font-medium">
          {isLogin ? 'Đăng nhập để tiếp tục' : 'Tạo tài khoản mới'}
        </Text>
      </View>

      <View className="bg-card rounded-3xl p-6 shadow-sm shadow-black/5 elevation-sm mb-6">

        {!isLogin && (
          <View className="mb-4">
            <Text className="text-sm font-bold text-textMain mb-2 ml-1">Họ và tên</Text>
            <TextInput
              className="bg-border/50 text-textMain px-4 py-3.5 rounded-2xl font-medium"
              placeholder="VD: Phạm Bảo Long"
              placeholderTextColor="#9CA3AF"
              value={fullName}
              onChangeText={setFullName}
            />
            <Text className="text-sm font-bold text-textMain mb-2 ml-1 mt-4">Vai trò đăng ký</Text>
            <View className="flex-row gap-2">
              {[
                { value: 'PLAYER' as const, title: 'Vận động viên' },
                { value: 'ORGANIZER' as const, title: 'Ban tổ chức' },
              ].map(option => (
                <TouchableOpacity
                  key={option.value}
                  className={`flex-1 rounded-xl border px-3 py-3 ${requestedRole === option.value ? 'border-primary bg-primary/10' : 'border-gray-200 bg-white'}`}
                  onPress={() => setRequestedRole(option.value)}
                >
                  <Text className={`text-center text-xs font-bold ${requestedRole === option.value ? 'text-primary' : 'text-textSub'}`}>
                    {option.title}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            {requestedRole === 'ORGANIZER' && (
              <Text className="mt-2 text-xs text-textSub">
                Quyền Ban tổ chức chỉ được bật sau khi admin duyệt. Trọng tài được BTC bổ nhiệm riêng cho từng giải.
              </Text>
            )}
          </View>
        )}

        <View className="mb-4">
          <Text className="text-sm font-bold text-textMain mb-2 ml-1">Email</Text>
          <TextInput
            className="bg-border/50 text-textMain px-4 py-3.5 rounded-2xl font-medium"
            placeholder="email@example.com"
            placeholderTextColor="#9CA3AF"
            keyboardType="email-address"
            autoCapitalize="none"
            value={email}
            onChangeText={setEmail}
          />
        </View>

        <View className="mb-2">
          <Text className="text-sm font-bold text-textMain mb-2 ml-1">Mật khẩu</Text>
          <TextInput
            className="bg-border/50 text-textMain px-4 py-3.5 rounded-2xl font-medium"
            placeholder="••••••••"
            placeholderTextColor="#9CA3AF"
            secureTextEntry
            value={password}
            onChangeText={setPassword}
          />
        </View>
      </View>

      <TouchableOpacity
        className="bg-primary py-4 rounded-2xl items-center shadow-sm shadow-primary/30"
        onPress={handleSubmit}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="#FFFFFF" />
        ) : (
          <Text className="text-white text-base font-bold">
            {isLogin ? 'Đăng nhập' : 'Đăng ký ngay'}
          </Text>
        )}
      </TouchableOpacity>

      <View className="flex-row justify-center mt-8">
        <Text className="text-textSub font-medium text-base">
          {isLogin ? 'Chưa có tài khoản? ' : 'Đã có tài khoản? '}
        </Text>
        <TouchableOpacity onPress={() => setIsLogin(!isLogin)}>
          <Text className="text-primary font-bold text-base">
            {isLogin ? 'Đăng ký' : 'Đăng nhập'}
          </Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
};
