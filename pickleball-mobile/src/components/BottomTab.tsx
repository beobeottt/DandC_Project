import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';

export const BottomTabs = () => {
  const navigation = useNavigation<any>();
  const route = useRoute(); // Lấy tên màn hình hiện tại để làm sáng icon tương ứng

  // Danh sách các tab và tên định danh (route name) đã đăng ký trong RootNavigator của bạn
  const tabs = [
    { id: 'HomeScreen', label: 'Trang chủ', icon: '🏠', routeName: 'Home' },
    { id: 'MatchHistory', label: 'Lịch đấu', icon: '📅', routeName: 'MatchHistory' },
    { id: 'TrainingHistory', label: 'BXH / Tập luyện', icon: '🏆', routeName: 'TrainingHistory' },
    { id: 'PlayerProfile', label: 'Hồ sơ', icon: '👤', routeName: 'PlayerProfile' },
  ];

  return (
    <View className="absolute bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-6 py-3 flex-row justify-between items-center shadow-lg">
      {tabs.map((tab) => {
        // Kiểm tra xem màn hình hiện tại có khớp với tab không để đổi màu active
        const isActive = route.name === tab.routeName;

        return (
          <TouchableOpacity 
            key={tab.id} 
            onPress={() => navigation.navigate(tab.routeName)}
            className="items-center justify-center flex-1"
          >
            <Text className="text-lg mb-0.5">{tab.icon}</Text>
            <Text className={`text-[10px] font-semibold ${isActive ? 'text-indigo-600' : 'text-gray-400'}`}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
};
