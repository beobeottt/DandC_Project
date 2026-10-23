import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { api } from '../../services/api';

export const TournamentSetupScreen = ({ route }: any) => {
  const tournamentId = route?.params?.tournamentId || '1';
  
  // State tìm kiếm và lưu danh sách đã pick
  const [refereeInput, setRefereeInput] = useState('');
  const [selectedReferees, setSelectedReferees] = useState<string[]>([]);

  const [playerInput, setPlayerInput] = useState('');
  const [selectedPlayers, setSelectedPlayers] = useState<string[]>([]);
  const [guestName, setGuestName] = useState('');
  const [guestPhone, setGuestPhone] = useState('');
  const [members, setMembers] = useState<any[]>([]);

  // State Dropdown & Thể thức
  const [scoringType, setScoringType] = useState('Điểm trực tiếp');
  const [showScoringDropdown, setShowScoringDropdown] = useState(false);

  const [matchFormat, setMatchFormat] = useState('Chia Bảng');
  const [showFormatDropdown, setShowFormatDropdown] = useState(false);

  const [numMale, setNumMale] = useState('');
  const [numFemale, setNumFemale] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    void loadMembers();
  }, [tournamentId]);

  const loadMembers = async () => {
    try {
      const response = await api.get(`/tournament/${tournamentId}/invited-list`);
      setMembers(response.data);
    } catch (error: any) {
      Alert.alert('Lỗi', error.response?.data?.message || 'Không thể tải danh sách thành viên');
    }
  };

  const handleSendInvitations = async () => {
    if (selectedReferees.length === 0 && selectedPlayers.length === 0) {
      Alert.alert('Chưa có lời mời', 'Thêm email trọng tài hoặc VĐV trước khi gửi.');
      return;
    }
    setLoading(true);
    try {
      let sent = 0;
      for (const email of selectedReferees) {
        await api.post(`/tournament/${tournamentId}/invitations`, { email, role: 'REFEREE' });
        sent++;
      }
      for (const email of selectedPlayers) {
        await api.post(`/tournament/${tournamentId}/invitations`, { email, role: 'PLAYER' });
        sent++;
      }

      await loadMembers();
      Alert.alert('Thành công', `Đã gửi ${sent} lời mời. Thành viên cần chấp nhận và được BTC duyệt.`);
      setSelectedReferees([]);
      setSelectedPlayers([]);
    } catch (error: any) {
      Alert.alert('Lỗi', error.response?.data?.message || 'Có lỗi xảy ra');
    } finally {
      setLoading(false);
    }
  };

  const handleAddGuest = async () => {
    if (!guestName.trim() || !guestPhone.trim()) {
      Alert.alert('Thiếu thông tin', 'Vui lòng nhập họ tên và số điện thoại của vận động viên');
      return;
    }
    setLoading(true);
    try {
      await api.post(`/tournament/${tournamentId}/guest-players`, {
        fullName: guestName.trim(),
        phone: guestPhone.trim(),
      });
      setGuestName('');
      setGuestPhone('');
      await loadMembers();
      Alert.alert('Đã thêm', 'VĐV khách đã được thêm và đang chờ BTC duyệt');
    } catch (error: any) {
      Alert.alert('Lỗi', error.response?.data?.message || 'Không thể thêm vận động viên');
    } finally {
      setLoading(false);
    }
  };

  const handleApproval = async (memberId: string, status: 'APPROVED' | 'REJECTED') => {
    try {
      await api.patch(`/tournament/${tournamentId}/members/${memberId}/approval`, { status });
      await loadMembers();
    } catch (error: any) {
      Alert.alert('Lỗi', error.response?.data?.message || 'Không thể cập nhật trạng thái duyệt');
    }
  };

  return (
    <ScrollView className="flex-1 bg-gray-50 p-6" keyboardShouldPersistTaps="handled">
      <Text className="text-2xl font-extrabold text-gray-900 mb-2">Quản lý thành viên giải</Text>
      <Text className="text-sm text-gray-600 mb-5">
        Mời VĐV/trọng tài, xem người đã đăng ký và duyệt VĐV đủ điều kiện tham gia bốc thăm.
      </Text>

      <View className="mb-5 rounded-2xl border border-purple-200 bg-purple-50 p-4">
        <Text className="text-base font-extrabold text-purple-900 mb-1">1. Mời trọng tài</Text>
        <Text className="text-xs text-purple-800 mb-3">Nhập email tài khoản đã được cấp vai trò Trọng tài.</Text>
        <View className="flex-row gap-2">
          <TextInput
            className="flex-1 bg-white rounded-xl px-4 py-3 text-gray-900 text-sm border border-purple-200"
            placeholder="Email tài khoản trọng tài đã đăng ký"
            placeholderTextColor="#9CA3AF"
            value={refereeInput}
            onChangeText={setRefereeInput}
          />
          <TouchableOpacity 
            className="bg-purple-700 px-4 justify-center rounded-xl"
            onPress={() => {
              const email = refereeInput.trim().toLowerCase();
              if (!email) return;
              if (selectedReferees.includes(email)) {
                Alert.alert('Thông báo', 'Email trọng tài đã có trong danh sách chờ gửi');
                return;
              }
              setSelectedReferees(current => [...current, email]);
              setRefereeInput('');
            }}
          >
            <Text className="text-white font-bold text-sm">Thêm</Text>
          </TouchableOpacity>
        </View>
        {/* Hiển thị các trọng tài đã chọn (chọn nhiều) */}
        {selectedReferees.length > 0 && (
          <View className="flex-row flex-wrap gap-1.5 mt-2">
            {selectedReferees.map((item, index) => (
              <View key={index} className="bg-primary/20 px-3 py-1 rounded-full flex-row items-center gap-1">
                <Text className="text-xs text-primary font-semibold">{item}</Text>
                <TouchableOpacity onPress={() => setSelectedReferees(selectedReferees.filter((_, i) => i !== index))}>
                  <Text className="text-xs text-red-500 font-bold ml-1">✕</Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}
      </View>

      <View className="mb-5 rounded-2xl border border-indigo-200 bg-indigo-50 p-4">
        <Text className="text-base font-extrabold text-indigo-900 mb-1">2. Mời vận động viên có tài khoản</Text>
        <Text className="text-xs text-indigo-800 mb-3">VĐV nhận lời trước, sau đó Ban tổ chức duyệt đăng ký.</Text>
        <View className="flex-row gap-2">
          <TextInput
            className="flex-1 bg-white rounded-xl px-4 py-3 text-gray-900 text-sm border border-indigo-200"
            placeholder="Email tài khoản VĐV đã đăng ký"
            placeholderTextColor="#9CA3AF"
            value={playerInput}
            onChangeText={setPlayerInput}
          />
          <TouchableOpacity 
            className="bg-indigo-700 px-4 justify-center rounded-xl"
            onPress={() => {
              const email = playerInput.trim().toLowerCase();
              if (!email) return;
              if (selectedPlayers.includes(email)) {
                Alert.alert('Thông báo', 'Email VĐV đã có trong danh sách chờ gửi');
                return;
              }
              setSelectedPlayers(current => [...current, email]);
              setPlayerInput('');
            }}
          >
            <Text className="text-white font-bold text-sm">Thêm</Text>
          </TouchableOpacity>
        </View>
        {/* Hiển thị các VĐV đã chọn (chọn nhiều) */}
        {selectedPlayers.length > 0 && (
          <View className="flex-row flex-wrap gap-1.5 mt-2">
            {selectedPlayers.map((item, index) => (
              <View key={index} className="bg-primary/20 px-3 py-1 rounded-full flex-row items-center gap-1">
                <Text className="text-xs text-primary font-semibold">{item}</Text>
                <TouchableOpacity onPress={() => setSelectedPlayers(selectedPlayers.filter((_, i) => i !== index))}>
                  <Text className="text-xs text-red-500 font-bold ml-1">✕</Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}
      </View>

      <TouchableOpacity
        className="mb-6 items-center rounded-2xl bg-indigo-600 py-4"
        onPress={handleSendInvitations}
        disabled={loading}
      >
        {loading ? (
          <Text className="font-bold text-white">Đang gửi...</Text>
        ) : (
          <Text className="font-bold text-white">
            Gửi lời mời ({selectedReferees.length + selectedPlayers.length})
          </Text>
        )}
      </TouchableOpacity>

      <View className="bg-white rounded-2xl p-4 border border-gray-200 mb-6">
        <Text className="text-base font-extrabold text-gray-900 mb-1">3. Thêm VĐV chưa đăng ký</Text>
        <Text className="text-xs text-gray-500 mb-3">Tạo hồ sơ khách trong giải bằng họ tên và số điện thoại.</Text>
        <TextInput
          className="bg-gray-100 rounded-xl px-4 py-3 text-gray-900 mb-2"
          placeholder="Họ và tên"
          value={guestName}
          onChangeText={setGuestName}
        />
        <TextInput
          className="bg-gray-100 rounded-xl px-4 py-3 text-gray-900 mb-3"
          placeholder="Số điện thoại"
          keyboardType="phone-pad"
          value={guestPhone}
          onChangeText={setGuestPhone}
        />
        <TouchableOpacity className="bg-indigo-600 py-3 rounded-xl items-center" onPress={handleAddGuest} disabled={loading}>
          <Text className="text-white font-bold">Thêm VĐV khách</Text>
        </TouchableOpacity>
      </View>

      <View className="mb-6">
        <Text className="text-base font-extrabold text-gray-900 mb-1">4. Đăng ký và duyệt VĐV</Text>
        <Text className="text-xs text-gray-500 mb-3">Chỉ VĐV đã nhận lời mới có thể được duyệt. VĐV khách chờ BTC duyệt.</Text>
        {members.filter(member => member.role === 'PLAYER').map(member => (
          <View key={member.memberId} className="bg-white rounded-xl border border-gray-200 p-3 mb-2">
            <Text className="font-bold text-gray-900">{member.fullName}</Text>
            <Text className="text-xs text-gray-500 mt-1">
              {member.email || member.phone || 'VĐV khách'} · {member.invitationStatus === 'PENDING' ? 'Chờ phản hồi lời mời' : member.invitationStatus}
            </Text>
            <Text className="text-xs text-gray-500 mt-1">
              Duyệt: {member.organizerApprovalStatus === 'APPROVED' ? 'Đã duyệt' : member.organizerApprovalStatus === 'REJECTED' ? 'Từ chối' : 'Chờ BTC duyệt'}
            </Text>
            {member.invitationStatus === 'ACCEPTED' && member.organizerApprovalStatus !== 'APPROVED' && (
              <View className="flex-row gap-2 mt-3">
                <TouchableOpacity className="bg-green-600 px-3 py-2 rounded-lg" onPress={() => handleApproval(member.memberId, 'APPROVED')}>
                  <Text className="text-white text-xs font-bold">Duyệt</Text>
                </TouchableOpacity>
                <TouchableOpacity className="bg-red-600 px-3 py-2 rounded-lg" onPress={() => handleApproval(member.memberId, 'REJECTED')}>
                  <Text className="text-white text-xs font-bold">Từ chối</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        ))}
        {members.filter(member => member.role === 'PLAYER').length === 0 && (
          <Text className="text-gray-500 text-sm">Chưa có VĐV nào trong giải.</Text>
        )}
      </View>

      <View className="mb-6">
        <Text className="text-base font-bold text-gray-900 mb-3">Trọng tài được mời</Text>
        {members.filter(member => member.role === 'REFEREE').map(member => (
          <View key={member.memberId} className="bg-white rounded-xl border border-gray-200 p-3 mb-2">
            <Text className="font-bold text-gray-900">{member.fullName}</Text>
            <Text className="text-xs text-gray-500 mt-1">
              {member.email || 'Trọng tài'} · {member.invitationStatus === 'PENDING' ? 'Chờ phản hồi' : member.invitationStatus}
            </Text>
          </View>
        ))}
        {members.filter(member => member.role === 'REFEREE').length === 0 && (
          <Text className="text-gray-500 text-sm">Chưa mời trọng tài nào.</Text>
        )}
      </View>

      {/* --- THỂ THỨC THI ĐẤU --- */}
      <Text className="text-base font-bold text-gray-900 mb-3">Cấu hình thể thức thi đấu</Text>

      {/* Dropdown: Hình thức tính điểm */}
      <View className="mb-4">
        <Text className="text-xs font-semibold text-gray-700 mb-1">Hình thức tính điểm</Text>
        <TouchableOpacity 
          className="bg-gray-200 rounded-2xl px-4 py-3.5 border border-gray-300 flex-row justify-between items-center"
          onPress={() => setShowScoringDropdown(!showScoringDropdown)}
        >
          <Text className="text-gray-900 font-medium">{scoringType}</Text>
          <Text className="text-gray-600 font-bold">{showScoringDropdown ? '▲' : '▼'}</Text>
        </TouchableOpacity>
        {showScoringDropdown && (
          <View className="bg-white border border-gray-200 rounded-xl mt-1 shadow-sm overflow-hidden">
            {['Điểm trực tiếp', 'Điểm gián tiếp'].map((item) => (
              <TouchableOpacity 
                key={item} 
                className="px-4 py-3 border-b border-gray-100"
                onPress={() => { setScoringType(item); setShowScoringDropdown(false); }}
              >
                <Text className="text-gray-800 text-sm font-medium">{item}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>

      {/* Dropdown: Thể thức thi đấu */}
      <View className="mb-4">
        <Text className="text-xs font-semibold text-gray-700 mb-1">Thể thức thi đấu</Text>
        <TouchableOpacity 
          className="bg-gray-200 rounded-2xl px-4 py-3.5 border border-gray-300 flex-row justify-between items-center"
          onPress={() => setShowFormatDropdown(!showFormatDropdown)}
        >
          <Text className="text-gray-900 font-medium">{matchFormat}</Text>
          <Text className="text-gray-600 font-bold">{showFormatDropdown ? '▲' : '▼'}</Text>
        </TouchableOpacity>
        {showFormatDropdown && (
          <View className="bg-white border border-gray-200 rounded-xl mt-1 shadow-sm overflow-hidden">
            {['Chia Bảng', 'Round Robin', 'Nhánh thắng thua'].map((item) => (
              <TouchableOpacity 
                key={item} 
                className="px-4 py-3 border-b border-gray-100"
                onPress={() => { setMatchFormat(item); setShowFormatDropdown(false); }}
              >
                <Text className="text-gray-800 text-sm font-medium">{item}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>

      {/* Số lượng nam/nữ cho 1 team */}
      <View className="mb-4">
        <Text className="text-xs font-semibold text-gray-700 mb-1">Số lượng nam cho 1 team</Text>
        <TextInput
          className="bg-gray-200 rounded-2xl px-4 py-3 text-gray-900 text-sm border border-gray-300"
          placeholder="Nhập số lượng nam..."
          keyboardType="numeric"
          placeholderTextColor="#9CA3AF"
          value={numMale}
          onChangeText={setNumMale}
        />
      </View>

      <View className="mb-6">
        <Text className="text-xs font-semibold text-gray-700 mb-1">Số lượng nữ cho 1 team</Text>
        <TextInput
          className="bg-gray-200 rounded-2xl px-4 py-3 text-gray-900 text-sm border border-gray-300"
          placeholder="Nhập số lượng nữ..."
          keyboardType="numeric"
          placeholderTextColor="#9CA3AF"
          value={numFemale}
          onChangeText={setNumFemale}
        />
      </View>

    </ScrollView>
  );
};
