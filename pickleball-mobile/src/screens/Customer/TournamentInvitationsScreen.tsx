import React, { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, Modal, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { api } from '../../services/api';

interface PlayerInvitation {
  id: string;
  tournamentId: string;
  role: string;
  invitationStatus: 'PENDING' | 'ACCEPTED' | 'DECLINED';
  organizerApprovalStatus: 'PENDING' | 'APPROVED' | 'REJECTED';
  tournament?: {
    name: string;
    location: string;
    startAt: string;
  };
}

export const TournamentInvitationsScreen = () => {
  const navigation = useNavigation<any>();
  const [invitations, setInvitations] = useState<PlayerInvitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedInvitation, setSelectedInvitation] = useState<PlayerInvitation | null>(null);
  const [playingHand, setPlayingHand] = useState<'LEFT' | 'RIGHT' | null>(null);
  const [preferredPosition, setPreferredPosition] = useState<'LEFT' | 'RIGHT' | 'BOTH' | null>(null);
  const [skills, setSkills] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const skillOptions = [
    ['SERVE', 'Giao bóng'],
    ['RETURN_OF_SERVE', 'Trả giao bóng'],
    ['DINK', 'Dink'],
    ['VOLLEY', 'Volley'],
    ['THIRD_SHOT_DROP', 'Third shot drop'],
    ['DRIVE', 'Drive'],
    ['LOB', 'Lob'],
    ['RESET', 'Reset'],
    ['COURT_POSITIONING', 'Di chuyển vị trí'],
    ['TEAMWORK', 'Phối hợp đồng đội'],
  ];

  const loadInvitations = useCallback(async () => {
    try {
      const response = await api.get('/users/invitations');
      setInvitations(response.data.filter((item: PlayerInvitation) => item.role === 'PLAYER'));
    } catch (error: any) {
      Alert.alert('Lỗi', error.response?.data?.message || 'Không thể tải lời mời giải đấu');
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void loadInvitations();
    }, [loadInvitations]),
  );

  const respond = async (invitation: PlayerInvitation, status: 'ACCEPTED' | 'DECLINED') => {
    try {
      await api.patch(`/tournament/${invitation.tournamentId}/response`, { status });
      await loadInvitations();
    } catch (error: any) {
      Alert.alert('Lỗi', error.response?.data?.message || 'Không thể phản hồi lời mời');
    }
  };

  const openSkillConfirmation = (invitation: PlayerInvitation) => {
    setSelectedInvitation(invitation);
    setPlayingHand(null);
    setPreferredPosition(null);
    setSkills([]);
  };

  const confirmAndAccept = async () => {
    if (!selectedInvitation || !playingHand || !preferredPosition || skills.length !== 4) {
      Alert.alert('Chưa đủ thông tin', 'Chọn tay thuận, vị trí và chính xác 4 kỹ năng.');
      return;
    }
    setSubmitting(true);
    try {
      await api.patch(`/tournament/${selectedInvitation.tournamentId}/response`, {
        status: 'ACCEPTED',
        playingHand,
        preferredPosition,
        skills,
      });
      setSelectedInvitation(null);
      await loadInvitations();
    } catch (error: any) {
      Alert.alert('Lỗi', error.response?.data?.message || 'Không thể xác nhận thông tin và nhận lời');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <View className="flex-1 items-center justify-center"><ActivityIndicator color="#4f46e5" /></View>;
  }

  return (
    <ScrollView className="flex-1 bg-gray-50 px-5 pt-12 pb-24">
      <Text className="text-2xl font-extrabold text-gray-900 mb-5">Lời mời tham gia giải</Text>
      {invitations.map(invitation => (
        <View key={invitation.id} className="bg-white rounded-2xl border border-gray-200 p-4 mb-3">
          <Text className="font-bold text-gray-900">{invitation.tournament?.name || 'Giải đấu'}</Text>
          <Text className="text-xs text-gray-500 mt-1">{invitation.tournament?.location}</Text>
          {invitation.invitationStatus === 'PENDING' ? (
            <View className="flex-row gap-2 mt-3">
              <TouchableOpacity className="bg-green-600 px-4 py-2 rounded-xl" onPress={() => openSkillConfirmation(invitation)}>
                <Text className="text-white font-bold text-xs">Xác nhận hồ sơ & nhận lời</Text>
              </TouchableOpacity>
              <TouchableOpacity className="bg-gray-300 px-4 py-2 rounded-xl" onPress={() => respond(invitation, 'DECLINED')}>
                <Text className="text-gray-800 font-bold text-xs">Từ chối</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View>
              <Text className="text-xs text-indigo-700 font-semibold mt-3">
                {invitation.invitationStatus === 'DECLINED'
                  ? 'Đã từ chối lời mời'
                  : invitation.organizerApprovalStatus === 'APPROVED'
                    ? 'Đã được Ban tổ chức duyệt'
                    : invitation.organizerApprovalStatus === 'REJECTED'
                      ? 'Ban tổ chức chưa duyệt tham gia'
                      : 'Đã nhận lời — đang chờ Ban tổ chức duyệt'}
              </Text>
              {invitation.invitationStatus === 'ACCEPTED' && invitation.organizerApprovalStatus === 'APPROVED' && (
                <TouchableOpacity
                  className="mt-3 items-center rounded-xl bg-indigo-600 py-3"
                  onPress={() => navigation.navigate('TournamentResults', { tournamentId: invitation.tournamentId })}
                >
                  <Text className="text-xs font-bold text-white">Xem kết quả bốc thăm của tôi</Text>
                </TouchableOpacity>
              )}
            </View>
          )}
        </View>
      ))}
      {invitations.length === 0 && <Text className="text-gray-500">Bạn chưa có lời mời tham gia giải nào.</Text>}
      <Modal
        visible={Boolean(selectedInvitation)}
        transparent
        animationType="slide"
        onRequestClose={() => setSelectedInvitation(null)}
      >
        <View className="flex-1 justify-end bg-black/40">
          <ScrollView className="max-h-[88%] rounded-t-3xl bg-white px-5 pb-8 pt-6" keyboardShouldPersistTaps="handled">
            <Text className="mb-1 text-xl font-extrabold text-gray-900">Xác nhận hồ sơ VĐV</Text>
            <Text className="mb-5 text-xs text-gray-500">
              Xác nhận thông tin kỹ năng trước khi nhận lời tham gia {selectedInvitation?.tournament?.name}.
            </Text>

            <Text className="mb-2 text-sm font-bold text-gray-800">Tay thuận</Text>
            <View className="mb-4 flex-row gap-2">
              {[
                { value: 'LEFT' as const, label: 'Tay trái' },
                { value: 'RIGHT' as const, label: 'Tay phải' },
              ].map(option => (
                <TouchableOpacity
                  key={option.value}
                  className={`flex-1 rounded-xl border py-3 ${playingHand === option.value ? 'border-indigo-600 bg-indigo-50' : 'border-gray-200'}`}
                  onPress={() => setPlayingHand(option.value)}
                >
                  <Text className="text-center text-xs font-bold text-gray-800">{option.label}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text className="mb-2 text-sm font-bold text-gray-800">Vị trí ưa thích</Text>
            <View className="mb-4 flex-row gap-2">
              {[
                { value: 'LEFT' as const, label: 'Ô trái' },
                { value: 'RIGHT' as const, label: 'Ô phải' },
                { value: 'BOTH' as const, label: 'Cả hai' },
              ].map(option => (
                <TouchableOpacity
                  key={option.value}
                  className={`flex-1 rounded-xl border py-3 ${preferredPosition === option.value ? 'border-indigo-600 bg-indigo-50' : 'border-gray-200'}`}
                  onPress={() => setPreferredPosition(option.value)}
                >
                  <Text className="text-center text-xs font-bold text-gray-800">{option.label}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text className="mb-1 text-sm font-bold text-gray-800">Chọn đúng 4 kỹ năng ({skills.length}/4)</Text>
            <Text className="mb-2 text-xs text-gray-500">Chọn các kỹ năng bạn tự tin nhất.</Text>
            <View className="mb-5 flex-row flex-wrap gap-2">
              {skillOptions.map(([value, label]) => {
                const selected = skills.includes(value);
                return (
                  <TouchableOpacity
                    key={value}
                    className={`rounded-xl border px-3 py-2 ${selected ? 'border-indigo-600 bg-indigo-50' : 'border-gray-200 bg-gray-50'}`}
                    onPress={() => setSkills(current => selected
                      ? current.filter(skill => skill !== value)
                      : current.length < 4 ? [...current, value] : current)}
                  >
                    <Text className={`text-xs font-semibold ${selected ? 'text-indigo-700' : 'text-gray-700'}`}>
                      {selected ? '✓ ' : ''}{label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <TouchableOpacity
              className="mb-3 items-center rounded-xl bg-green-600 py-4"
              onPress={() => void confirmAndAccept()}
              disabled={submitting}
            >
              <Text className="font-bold text-white">{submitting ? 'Đang xác nhận...' : 'Xác nhận thông tin & nhận lời'}</Text>
            </TouchableOpacity>
            <TouchableOpacity className="mb-5 items-center rounded-xl bg-gray-100 py-4" onPress={() => setSelectedInvitation(null)}>
              <Text className="font-bold text-gray-700">Để sau</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </Modal>
    </ScrollView>
  );
};
