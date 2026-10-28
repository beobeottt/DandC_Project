import React, { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, Text, View } from 'react-native';
import { api } from '../../services/api';

interface SkillSummary {
  skill: string;
  attempts: number;
  successes: number;
  successRate: number;
}

interface PracticeHistory {
  sessions: Array<{
    id: string;
    tournamentName: string;
    focus: string;
    location: string | null;
    durationMinutes: number;
    practiceDate: string;
    skillMetrics: SkillSummary[];
  }>;
  skillSummary: SkillSummary[];
}

export const TrainingHistoryScreen = () => {
  const [history, setHistory] = useState<PracticeHistory>({ sessions: [], skillSummary: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchTrainingHistory = async () => {
      try {
        const response = await api.get('/practice/history');
        setHistory(response.data);
      } catch (requestError: any) {
        setError(requestError.response?.data?.message || 'Không thể tải lịch sử tập luyện.');
      } finally {
        setLoading(false);
      }
    };
    void fetchTrainingHistory();
  }, []);

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-gray-50">
        <ActivityIndicator size="large" color="#88B04B" />
      </View>
    );
  }

  return (
    <ScrollView className="flex-1 bg-gray-50 px-5 pt-14">
      <View className="mb-6">
        <Text className="text-2xl font-extrabold text-gray-900">Lịch sử tập luyện</Text>
        <Text className="mt-1 text-xs text-gray-500">Hiệu suất theo kỹ năng trong các buổi practice</Text>
      </View>

      {error && <Text className="mb-4 rounded-xl bg-red-50 p-4 text-sm text-red-700">{error}</Text>}

      {history.skillSummary.length > 0 && (
        <View className="mb-4 rounded-2xl border border-indigo-100 bg-indigo-50 p-4">
          <Text className="mb-3 text-sm font-extrabold text-indigo-900">Tổng hợp kỹ năng</Text>
          {history.skillSummary.map(skill => (
            <View key={skill.skill} className="mb-2 flex-row justify-between">
              <Text className="text-xs text-gray-700">{skill.skill}</Text>
              <Text className="text-xs font-bold text-indigo-700">
                {skill.successes}/{skill.attempts} · {skill.successRate}%
              </Text>
            </View>
          ))}
        </View>
      )}

      {history.sessions.map(session => (
        <View key={session.id} className="mb-4 rounded-2xl border border-gray-200 bg-white p-4">
          <View className="mb-1 flex-row justify-between">
            <Text className="flex-1 pr-2 text-sm font-bold text-gray-900">{session.focus}</Text>
            <Text className="text-xs text-gray-400">
              {new Date(session.practiceDate).toLocaleDateString('vi-VN')}
            </Text>
          </View>
          <Text className="mb-3 text-xs text-gray-600">
            {session.tournamentName} · {session.location || 'Chưa ghi địa điểm'}
          </Text>
          <Text className="mb-2 text-xs font-semibold text-gray-700">
            Thời lượng: {session.durationMinutes} phút
          </Text>
          {session.skillMetrics.map(metric => (
            <Text key={metric.skill} className="mt-1 text-xs text-gray-700">
              {metric.skill}: {metric.successes}/{metric.attempts} lần thành công ({metric.successRate}%)
            </Text>
          ))}
        </View>
      ))}

      {!error && history.sessions.length === 0 && (
        <Text className="text-center text-sm text-gray-500">Chưa có buổi practice nào được ghi nhận.</Text>
      )}
    </ScrollView>
  );
};
