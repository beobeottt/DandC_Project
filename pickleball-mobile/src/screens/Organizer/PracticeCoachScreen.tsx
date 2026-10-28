import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { api } from '../../services/api';

const skillOptions = [
  { value: 'SERVE', label: 'Giao bóng' },
  { value: 'RETURN_OF_SERVE', label: 'Trả giao bóng' },
  { value: 'DINK', label: 'Dink' },
  { value: 'VOLLEY', label: 'Volley' },
  { value: 'THIRD_SHOT_DROP', label: 'Third shot drop' },
  { value: 'DRIVE', label: 'Drive' },
  { value: 'LOB', label: 'Lob' },
  { value: 'RESET', label: 'Reset' },
  { value: 'COURT_POSITIONING', label: 'Di chuyển vị trí' },
  { value: 'TEAMWORK', label: 'Phối hợp đồng đội' },
];

interface TournamentOption {
  id: string;
  name: string;
  startAt: string;
}

interface PlayerOption {
  id: string;
  fullName: string;
  level: number;
}

interface MetricDraft {
  attempts: string;
  successes: string;
}

export const PracticeCoachScreen = () => {
  const [tournaments, setTournaments] = useState<TournamentOption[]>([]);
  const [players, setPlayers] = useState<PlayerOption[]>([]);
  const [tournamentId, setTournamentId] = useState<string | null>(null);
  const [playerId, setPlayerId] = useState<string | null>(null);
  const [focus, setFocus] = useState('');
  const [location, setLocation] = useState('');
  const [duration, setDuration] = useState('60');
  const [metrics, setMetrics] = useState<Record<string, MetricDraft>>({});
  const [loading, setLoading] = useState(true);
  const [loadingPlayers, setLoadingPlayers] = useState(false);
  const [saving, setSaving] = useState(false);

  const loadTournaments = useCallback(async () => {
    try {
      const response = await api.get('/practice/organizer/tournaments');
      setTournaments(response.data);
    } catch (error: any) {
      Alert.alert('Lỗi', error.response?.data?.message || 'Không thể tải giải đấu đã được duyệt');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadTournaments();
  }, [loadTournaments]);

  const selectTournament = async (selectedId: string) => {
    setTournamentId(selectedId);
    setPlayerId(null);
    setPlayers([]);
    setLoadingPlayers(true);
    try {
      const response = await api.get(`/practice/organizer/tournaments/${selectedId}/players`);
      setPlayers(response.data);
    } catch (error: any) {
      Alert.alert('Lỗi', error.response?.data?.message || 'Không thể tải danh sách VĐV');
    } finally {
      setLoadingPlayers(false);
    }
  };

  const toggleSkill = (skill: string) => {
    setMetrics(current => {
      if (current[skill]) {
        const { [skill]: _removed, ...remaining } = current;
        return remaining;
      }
      return { ...current, [skill]: { attempts: '', successes: '' } };
    });
  };

  const updateMetric = (skill: string, field: keyof MetricDraft, value: string) => {
    setMetrics(current => ({
      ...current,
      [skill]: { ...current[skill], [field]: value.replace(/[^0-9]/g, '') },
    }));
  };

  const saveSession = async () => {
    const durationMinutes = Number(duration);
    const skillMetrics = Object.entries(metrics).map(([skill, metric]) => ({
      skill,
      attempts: Number(metric.attempts),
      successes: Number(metric.successes),
    }));
    if (!tournamentId || !playerId || !focus.trim() || !Number.isInteger(durationMinutes) || durationMinutes < 1) {
      Alert.alert('Thiếu thông tin', 'Chọn giải, VĐV, nội dung practice và thời lượng hợp lệ.');
      return;
    }
    if (
      !skillMetrics.length ||
      skillMetrics.some(metric =>
        !Number.isInteger(metric.attempts) ||
        !Number.isInteger(metric.successes) ||
        metric.attempts < 1 ||
        metric.successes < 0 ||
        metric.successes > metric.attempts,
      )
    ) {
      Alert.alert('Số liệu kỹ năng không hợp lệ', 'Mỗi kỹ năng cần có số lần thực hiện và số lần thành công không vượt quá số lần thực hiện.');
      return;
    }

    setSaving(true);
    try {
      await api.post('/practice/sessions', {
        tournamentId,
        playerId,
        focus: focus.trim(),
        location: location.trim() || undefined,
        durationMinutes,
        practiceDate: new Date().toISOString(),
        skillMetrics,
      });
      setFocus('');
      setLocation('');
      setMetrics({});
      Alert.alert('Đã lưu', 'Kết quả practice đã được ghi vào lịch sử của VĐV.');
    } catch (error: any) {
      Alert.alert('Lỗi', error.response?.data?.message || 'Không thể lưu kết quả practice');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <View className="flex-1 items-center justify-center"><ActivityIndicator color="#4f46e5" /></View>;
  }

  return (
    <ScrollView className="flex-1 bg-gray-50 px-5 pt-12 pb-24" keyboardShouldPersistTaps="handled">
      <Text className="mb-1 text-2xl font-extrabold text-gray-900">Ghi nhận practice</Text>
      <Text className="mb-5 text-xs text-gray-500">Chỉ ghi được cho VĐV đã được duyệt trong giải của bạn.</Text>

      <Text className="mb-2 text-sm font-bold text-gray-800">1. Chọn giải đã được duyệt</Text>
      {tournaments.map(tournament => (
        <TouchableOpacity
          key={tournament.id}
          className={`mb-2 rounded-xl border p-3 ${tournamentId === tournament.id ? 'border-indigo-600 bg-indigo-50' : 'border-gray-200 bg-white'}`}
          onPress={() => void selectTournament(tournament.id)}
        >
          <Text className="font-bold text-gray-900">{tournament.name}</Text>
          <Text className="mt-1 text-xs text-gray-500">{new Date(tournament.startAt).toLocaleDateString('vi-VN')}</Text>
        </TouchableOpacity>
      ))}
      {tournaments.length === 0 && <Text className="mb-4 text-xs text-gray-500">Chưa có giải được duyệt.</Text>}

      {tournamentId && (
        <>
          <Text className="mb-2 mt-4 text-sm font-bold text-gray-800">2. Chọn VĐV</Text>
          {loadingPlayers ? <ActivityIndicator color="#4f46e5" /> : players.map(player => (
            <TouchableOpacity
              key={player.id}
              className={`mb-2 rounded-xl border p-3 ${playerId === player.id ? 'border-green-600 bg-green-50' : 'border-gray-200 bg-white'}`}
              onPress={() => setPlayerId(player.id)}
            >
              <Text className="font-bold text-gray-900">{player.fullName}</Text>
              <Text className="mt-1 text-xs text-gray-500">Điểm trình hiện tại: {player.level}</Text>
            </TouchableOpacity>
          ))}
          {!loadingPlayers && players.length === 0 && <Text className="text-xs text-gray-500">Giải chưa có VĐV được duyệt.</Text>}
        </>
      )}

      {playerId && (
        <View className="mt-4">
          <Text className="mb-2 text-sm font-bold text-gray-800">3. Thông tin buổi tập</Text>
          <TextInput
            className="mb-2 rounded-xl border border-gray-200 bg-white px-3 py-3 text-sm"
            placeholder="Nội dung practice"
            value={focus}
            onChangeText={setFocus}
          />
          <TextInput
            className="mb-2 rounded-xl border border-gray-200 bg-white px-3 py-3 text-sm"
            placeholder="Địa điểm (không bắt buộc)"
            value={location}
            onChangeText={setLocation}
          />
          <TextInput
            className="mb-4 rounded-xl border border-gray-200 bg-white px-3 py-3 text-sm"
            placeholder="Thời lượng (phút)"
            keyboardType="number-pad"
            value={duration}
            onChangeText={setDuration}
          />

          <Text className="mb-2 text-sm font-bold text-gray-800">4. Kỹ năng và số lần thành công</Text>
          <Text className="mb-3 text-xs text-gray-500">Chọn kỹ năng, sau đó nhập tổng số lần thực hiện và thành công.</Text>
          {skillOptions.map(skill => {
            const metric = metrics[skill.value];
            return (
              <View key={skill.value} className="mb-2 rounded-xl border border-gray-200 bg-white p-3">
                <TouchableOpacity className="mb-2" onPress={() => toggleSkill(skill.value)}>
                  <Text className={`text-sm font-bold ${metric ? 'text-indigo-700' : 'text-gray-700'}`}>
                    {metric ? '✓ ' : '+ '}{skill.label}
                  </Text>
                </TouchableOpacity>
                {metric && (
                  <View className="flex-row gap-2">
                    <TextInput
                      className="flex-1 rounded-lg border border-gray-200 px-3 py-2 text-sm"
                      placeholder="Số lần thực hiện"
                      keyboardType="number-pad"
                      value={metric.attempts}
                      onChangeText={value => updateMetric(skill.value, 'attempts', value)}
                    />
                    <TextInput
                      className="flex-1 rounded-lg border border-gray-200 px-3 py-2 text-sm"
                      placeholder="Số lần thành công"
                      keyboardType="number-pad"
                      value={metric.successes}
                      onChangeText={value => updateMetric(skill.value, 'successes', value)}
                    />
                  </View>
                )}
              </View>
            );
          })}
          <TouchableOpacity
            className={`mb-8 mt-3 items-center rounded-xl py-4 ${saving ? 'bg-gray-400' : 'bg-indigo-600'}`}
            disabled={saving}
            onPress={() => void saveSession()}
          >
            <Text className="font-bold text-white">{saving ? 'Đang lưu...' : 'Lưu buổi practice'}</Text>
          </TouchableOpacity>
        </View>
      )}
    </ScrollView>
  );
};
