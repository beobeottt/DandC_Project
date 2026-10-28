import React, { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { api } from '../../services/api';
import { useSession } from '../../SessionContext';

interface Account {
  id: string;
  fullName: string;
  email: string;
  role: string;
  requestedRole: string;
  organizerApprovalStatus: 'PENDING' | 'APPROVED' | 'REJECTED' | null;
}

export const AdminAccountsScreen = () => {
  const navigation = useNavigation<any>();
  const { clearSession } = useSession();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'PLAYER' | 'ORGANIZER' | 'ADMIN'>('PLAYER');

  const loadAccounts = useCallback(async () => {
    try {
      const response = await api.get('/users/admin/accounts');
      setAccounts(response.data);
    } catch (error: any) {
      Alert.alert('Lỗi', error.response?.data?.message || 'Không thể tải danh sách tài khoản');
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => {
    void loadAccounts();
  }, [loadAccounts]));

  const createAccount = async () => {
    if (!fullName.trim() || !email.trim() || password.length < 8) {
      Alert.alert('Thiếu thông tin', 'Nhập họ tên, email và mật khẩu ít nhất 8 ký tự.');
      return;
    }
    setSaving(true);
    try {
      await api.post('/users/admin/accounts', {
        fullName: fullName.trim(),
        email: email.trim().toLowerCase(),
        password,
        role,
      });
      setFullName('');
      setEmail('');
      setPassword('');
      await loadAccounts();
      Alert.alert('Thành công', 'Đã tạo tài khoản.');
    } catch (error: any) {
      Alert.alert('Lỗi', error.response?.data?.message || 'Không thể tạo tài khoản');
    } finally {
      setSaving(false);
    }
  };

  const decideOrganizer = async (account: Account, status: 'APPROVED' | 'REJECTED') => {
    try {
      await api.patch(`/users/admin/accounts/${account.id}/organizer-approval`, { status });
      await loadAccounts();
    } catch (error: any) {
      Alert.alert('Lỗi', error.response?.data?.message || 'Không thể xử lý yêu cầu');
    }
  };

  const deleteAccount = (account: Account) => {
    Alert.alert('Xóa tài khoản', `Bạn có chắc muốn xóa ${account.fullName}?`, [
      { text: 'Hủy', style: 'cancel' },
      {
        text: 'Xóa',
        style: 'destructive',
        onPress: async () => {
          try {
            await api.delete(`/users/admin/accounts/${account.id}`);
            await loadAccounts();
          } catch (error: any) {
            Alert.alert('Lỗi', error.response?.data?.message || 'Không thể xóa tài khoản');
          }
        },
      },
    ]);
  };

  if (loading) {
    return <View className="flex-1 items-center justify-center"><ActivityIndicator color="#4f46e5" /></View>;
  }

  const pendingOrganizers = accounts.filter(account =>
    account.requestedRole === 'ORGANIZER' && account.organizerApprovalStatus === 'PENDING',
  );

  return (
    <ScrollView className="flex-1 bg-gray-50 px-5 pt-12 pb-24" keyboardShouldPersistTaps="handled">
      <Text className="mb-1 text-2xl font-extrabold text-gray-900">Quản trị tài khoản</Text>
      <Text className="mb-5 text-xs text-gray-500">Duyệt yêu cầu Ban tổ chức, tạo và xóa tài khoản.</Text>

      <TouchableOpacity
        className="mb-5 items-center rounded-xl border border-red-200 bg-red-50 py-3"
        onPress={async () => {
          await clearSession();
          navigation.reset({ index: 0, routes: [{ name: 'Auth' }] });
        }}
      >
        <Text className="text-sm font-bold text-red-700">Đăng xuất tài khoản admin</Text>
      </TouchableOpacity>

      <View className="mb-5 flex-row flex-wrap gap-2">
        {[
          { label: 'Duyệt giải đấu', route: 'AdminTournamentApprovals' },
          { label: 'Đánh giá điểm trình', route: 'AdminPlayerRatings' },
        ].map(item => (
          <TouchableOpacity
            key={item.route}
            className="rounded-xl border border-gray-200 bg-white px-4 py-3"
            onPress={() => navigation.navigate(item.route)}
          >
            <Text className="text-xs font-semibold text-gray-700">{item.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <View className="mb-5 rounded-2xl border border-gray-200 bg-white p-4">
        <Text className="mb-3 text-base font-extrabold text-gray-900">Tạo tài khoản</Text>
        {[
          { label: 'Họ tên', value: fullName, set: setFullName, secure: false },
          { label: 'Email', value: email, set: setEmail, secure: false },
          { label: 'Mật khẩu (ít nhất 8 ký tự)', value: password, set: setPassword, secure: true },
        ].map(input => (
          <View key={input.label} className="mb-3">
            <Text className="mb-1 text-xs font-semibold text-gray-700">{input.label}</Text>
            <TextInput
              className="rounded-xl border border-gray-200 bg-gray-50 px-3 py-3 text-sm text-gray-900"
              value={input.value}
              onChangeText={input.set}
              secureTextEntry={input.secure}
              autoCapitalize={input.label === 'Email' ? 'none' : 'words'}
            />
          </View>
        ))}
        <View className="mb-3 flex-row gap-2">
          {[
            { value: 'PLAYER' as const, label: 'Vận động viên' },
            { value: 'ORGANIZER' as const, label: 'Ban tổ chức' },
            { value: 'ADMIN' as const, label: 'Admin' },
          ].map(option => (
            <TouchableOpacity
              key={option.value}
              className={`flex-1 rounded-xl border py-3 ${role === option.value ? 'border-indigo-600 bg-indigo-50' : 'border-gray-200'}`}
              onPress={() => setRole(option.value)}
            >
              <Text className={`text-center text-xs font-bold ${role === option.value ? 'text-indigo-700' : 'text-gray-600'}`}>
                {option.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
        <TouchableOpacity className="items-center rounded-xl bg-indigo-600 py-3" onPress={() => void createAccount()} disabled={saving}>
          <Text className="font-bold text-white">{saving ? 'Đang tạo...' : 'Tạo tài khoản'}</Text>
        </TouchableOpacity>
      </View>

      <View className="mb-5 rounded-2xl border border-amber-200 bg-amber-50 p-4">
        <Text className="mb-3 text-base font-extrabold text-amber-900">
          Yêu cầu Ban tổ chức ({pendingOrganizers.length})
        </Text>
        {pendingOrganizers.length ? pendingOrganizers.map(account => (
          <View key={account.id} className="mb-3 rounded-xl bg-white p-3">
            <Text className="font-bold text-gray-900">{account.fullName}</Text>
            <Text className="mt-1 text-xs text-gray-500">{account.email}</Text>
            <View className="mt-3 flex-row gap-2">
              <TouchableOpacity className="rounded-lg bg-green-600 px-4 py-2" onPress={() => void decideOrganizer(account, 'APPROVED')}>
                <Text className="text-xs font-bold text-white">Duyệt</Text>
              </TouchableOpacity>
              <TouchableOpacity className="rounded-lg bg-red-600 px-4 py-2" onPress={() => void decideOrganizer(account, 'REJECTED')}>
                <Text className="text-xs font-bold text-white">Từ chối</Text>
              </TouchableOpacity>
            </View>
          </View>
        )) : <Text className="text-xs text-gray-600">Không có yêu cầu đang chờ.</Text>}
      </View>

      <Text className="mb-3 text-base font-extrabold text-gray-900">Tất cả tài khoản ({accounts.length})</Text>
      {accounts.map(account => (
        <View key={account.id} className="mb-2 rounded-2xl border border-gray-200 bg-white p-4">
          <View className="flex-row items-start justify-between">
            <View className="flex-1 pr-3">
              <Text className="font-bold text-gray-900">{account.fullName}</Text>
              <Text className="mt-1 text-xs text-gray-500">{account.email}</Text>
              <Text className="mt-1 text-xs font-semibold text-indigo-700">
                {account.role === 'ADMIN' ? 'Admin' : account.role === 'ORGANIZER' ? 'Ban tổ chức' : account.role === 'REFEREE' ? 'Trọng tài' : 'Vận động viên'}
                {account.organizerApprovalStatus === 'REJECTED' ? ' · Yêu cầu BTC bị từ chối' : ''}
              </Text>
            </View>
            <TouchableOpacity className="rounded-lg bg-red-50 px-3 py-2" onPress={() => deleteAccount(account)}>
              <Text className="text-xs font-bold text-red-700">Xóa</Text>
            </TouchableOpacity>
          </View>
        </View>
      ))}
    </ScrollView>
  );
};
