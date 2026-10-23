import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, ActivityIndicator } from 'react-native';
import { api } from '../../services/api';
import type { TrainingItem } from '../../types/TrainingItem';


export const TrainingHistoryScreen = () => {
  const [trainings, setTrainings] = useState<TrainingItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    fetchTrainingHistory();
  }, []);

  const fetchTrainingHistory = async () => {
    try {
      const response = await api.get('/users/training-history');
      setTrainings(response.data);
    } catch (error) {
      setTrainings([
        { id: '1', focus: 'Cú đánh cơ bản & Dinking', duration: '90 phút', location: 'Sân Lan Anh', date: '15/10/2026' },
        { id: '2', focus: 'Phản xạ lưới & Smash', duration: '60 phút', location: 'Sân Viesports', date: '10/10/2026' },
      ]);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View className="flex-1 bg-gray-50 justify-center items-center">
        <ActivityIndicator size="large" color="#88B04B" />
      </View>
    );
  }

  return (
    <ScrollView className="flex-1 bg-gray-50 px-5 pt-14">
      {/* Tiêu đề được đẩy xuống tránh status bar */}
      <View className="mb-6">
        <Text className="text-2xl font-extrabold text-gray-900">Lịch sử tập luyện</Text>
        <Text className="text-xs text-gray-500 mt-1">Nhật ký rèn luyện kỹ năng cá nhân</Text>
      </View>

      {trainings.map((item, index) => (
        <View key={item.id || index} className="bg-white p-4 rounded-2xl border border-gray-200 mb-4 shadow-sm">
          <View className="flex-row justify-between items-center mb-1">
            <Text className="text-sm font-bold text-gray-900">{item.focus}</Text>
            <Text className="text-xs text-gray-400">{item.date}</Text>
          </View>
          
          <Text className="text-xs text-gray-600 mb-3">Địa điểm: {item.location}</Text>
          
          <View className="self-start bg-gray-100 px-3 py-1 rounded-lg">
            <Text className="text-xs text-gray-700 font-semibold">Thời gian: {item.duration}</Text>
          </View>
        </View>
      ))}
    </ScrollView>
  );
};
