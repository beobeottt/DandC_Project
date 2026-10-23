import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, ActivityIndicator, Alert, Platform } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { api } from '../../services/api';

export const CreateTournamentScreen = ({ navigation }: any) => {
  const [eventName, setEventName] = useState('');
  const [address, setAddress] = useState('');

  // Danh sách các nội dung thi đấu được chọn (Lưu dạng mảng giá trị)
  const [selectedFormats, setSelectedFormats] = useState<string[]>(['MENDOUBLES']);
  const [showFormatDropdown, setShowFormatDropdown] = useState(false);

  // Quản lý số lượng người chơi/đội cho từng nội dung: { [formatValue]: number }
  const [formatPlayerCounts, setFormatPlayerCounts] = useState<{ [key: string]: string }>({ MENDOUBLES: '16' });

  // Riêng cho MLP: Quản lý số lượng nam/nữ trong đội: { [formatValue]: { men: string, women: string } }
  const [mlpConfigs, setMlpConfigs] = useState<{ [key: string]: { men: string, women: string } }>({
    MLP: { men: '2', women: '2' }
  });

  // Thể thức bốc thăm
  const [drawFormat, setDrawFormat] = useState('ROUND_ROBIN');
  const [showDrawDropdown, setShowDrawDropdown] = useState(false);

  // Thời gian bắt đầu
  const [startDate, setStartDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);

  const [loading, setLoading] = useState(false);

  const onChangeDate = (event: any, selectedDate?: Date) => {
    setShowDatePicker(Platform.OS === 'ios');
    if (selectedDate) {
      setStartDate(selectedDate);
    }
  };

  const toggleFormatSelection = (value: string) => {
    let updatedFormats = [...selectedFormats];
    if (updatedFormats.includes(value)) {
      if (updatedFormats.length > 1) {
        updatedFormats = updatedFormats.filter(item => item !== value);
      } else {
        Alert.alert('Lưu ý', 'Phải chọn ít nhất một nội dung thi đấu.');
        return;
      }
    } else {
      updatedFormats.push(value);
      // Khởi tạo mặc định số lượng cho nội dung mới nếu chưa có
      if (!formatPlayerCounts[value]) {
        setFormatPlayerCounts(prev => ({ ...prev, [value]: '16' }));
      }
      if (value === 'MLP' && !mlpConfigs['MLP']) {
        setMlpConfigs(prev => ({ ...prev, MLP: { men: '2', women: '2' } }));
      }
    }
    setSelectedFormats(updatedFormats);
  };

  const handleCreate = async () => {
  if (!eventName || !address) {
    Alert.alert('Lỗi', 'Vui lòng điền đầy đủ Tên sự kiện và Địa chỉ');
    return;
  }

  setLoading(true);
  try {
    // Đóng gói danh sách nội dung kèm cấu hình riêng biệt của từng nội dung
    const formatsDetail = selectedFormats.map(format => ({
      format,
      maxPlayers: parseInt(formatPlayerCounts[format]) || 16,
      ...(format === 'MLP' ? {
        menPerTeam: parseInt(mlpConfigs['MLP']?.men) || 2,
        womenPerTeam: parseInt(mlpConfigs['MLP']?.women) || 2,
      } : {})
    }));

    const response = await api.post('/tournament', {
      name: eventName,
      location: address,
      startAt: startDate.toISOString(),
      formatsDetail: formatsDetail,
      drawFormat: drawFormat,
    });

    Alert.alert('Thành công', 'Đã tạo giải đấu thành công!');
    
    const tournamentId = response.data.id;
    if (tournamentId && navigation) {
      navigation.navigate('TournamentSetup', { tournamentId });
    }
  } catch (error: any) {
    const errorMsg = error.response?.data?.message;
    Alert.alert('Lỗi', Array.isArray(errorMsg) ? errorMsg[0] : (errorMsg || 'Không thể tạo giải đấu'));
  } finally {
    setLoading(false);
  }
};


  const formatOptions = [
    { label: 'Đơn (Singles)', value: 'SINGLES' },
    { label: 'Đôi nam (Men\'s Doubles)', value: 'MENDOUBLES' },
    { label: 'Đôi nữ (Women\'s Doubles)', value: 'WOMENDOUBLES' },
    { label: 'Đôi nam nữ (Mixed Doubles)', value: 'MIXEDDOUBLES' },
    { label: 'Thể thức MLP (Major League)', value: 'MLP' },
  ];

  return (
    <ScrollView className="flex-1 bg-gray-50 p-6" keyboardShouldPersistTaps="handled">
      {/* Header Chào BTC */}
      <View className="bg-gray-200 self-start px-4 py-2 rounded-xl mb-4">
        <Text className="text-gray-800 font-bold text-sm">Xin Chào BTC</Text>
      </View>
      <Text className="text-gray-500 text-xs mb-6">Chủ Nhật, Ngày 12 tháng 10 năm 2026</Text>

      {/* Form Fields */}
      <View className="space-y-4 mb-8">

        {/* Tên sự kiện */}
        <View className="mb-4">
          <Text className="text-sm font-bold text-gray-800 mb-1">Tên sự kiện</Text>
          <TextInput
            className="bg-gray-200/80 rounded-2xl px-4 py-3.5 text-gray-800 text-sm border border-gray-300"
            placeholder="Nhập tên sự kiện..."
            placeholderTextColor="#9CA3AF"
            value={eventName}
            onChangeText={setEventName}
          />
        </View>

        {/* Địa chỉ */}
        <View className="mb-4">
          <Text className="text-sm font-bold text-gray-800 mb-1">Địa chỉ thi đấu</Text>
          <TextInput
            className="bg-gray-200/80 rounded-2xl px-4 py-3.5 text-gray-800 text-sm border border-gray-300"
            placeholder="Nhập địa điểm..."
            placeholderTextColor="#9CA3AF"
            value={address}
            onChangeText={setAddress}
          />
        </View>

        {/* Nội dung trận đấu (Chọn nhiều) */}
        <View className="mb-4 z-20">
          <Text className="text-sm font-bold text-gray-800 mb-1">Nội dung thi đấu (Chọn nhiều)</Text>
          <TouchableOpacity
            className="bg-gray-200 rounded-2xl px-4 py-3.5 border border-gray-300 flex-row justify-between items-center"
            onPress={() => setShowFormatDropdown(!showFormatDropdown)}
          >
            <Text className="text-gray-900 font-medium">
              {selectedFormats.map(val => formatOptions.find(o => o.value === val)?.label).join(', ')}
            </Text>
            <Text className="text-gray-600 font-bold">{showFormatDropdown ? '▲' : '▼'}</Text>
          </TouchableOpacity>

          {showFormatDropdown && (
            <View className="bg-white border border-gray-200 rounded-xl mt-1 shadow-sm overflow-hidden z-30">
              {formatOptions.map((item) => {
                const isSelected = selectedFormats.includes(item.value);
                return (
                  <TouchableOpacity
                    key={item.value}
                    className={`px-4 py-3 border-b border-gray-100 flex-row justify-between items-center ${isSelected ? 'bg-indigo-50' : ''}`}
                    onPress={() => toggleFormatSelection(item.value)}
                  >
                    <Text className={`text-sm font-medium ${isSelected ? 'text-indigo-600 font-bold' : 'text-gray-800'}`}>
                      {item.label}
                    </Text>
                    <Text className="text-indigo-600 font-bold">{isSelected ? '✓' : ''}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
        </View>

        {selectedFormats.map((formatVal) => {
          const optionInfo = formatOptions.find(o => o.value === formatVal);
          const isMLP = formatVal === 'MLP';

          return (
            <View key={formatVal} className="bg-indigo-50/60 p-4 rounded-2xl border border-indigo-100 mb-4">
              <Text className="text-indigo-900 font-bold text-xs uppercase mb-3">
                ⚙️ Cấu hình cho: {optionInfo?.label}
              </Text>

              {/* Số lượng người chơi/đội tối đa cho nội dung này */}
              <View className="mb-3">
                <Text className="text-xs font-bold text-gray-700 mb-1">Số lượng người chơi tham gia</Text>
                <TextInput
                  className="bg-white rounded-xl px-3 py-2.5 text-gray-800 text-sm border border-gray-200"
                  placeholder="VD: 16, 32..."
                  keyboardType="numeric"
                  value={formatPlayerCounts[formatVal] || ''}
                  onChangeText={(text) => setFormatPlayerCounts(prev => ({ ...prev, [formatVal]: text }))}
                />
              </View>

              {/* Nếu là MLP thì hiện thêm cấu hình số lượng Nam và Nữ mỗi đội */}
              {isMLP && (
                <View className="flex-row gap-3">
                  <View className="flex-1">
                    <Text className="text-xs font-bold text-gray-700 mb-1">Số VĐV Nam / Đội</Text>
                    <TextInput
                      className="bg-white rounded-xl px-3 py-2.5 text-gray-800 text-sm border border-gray-200"
                      placeholder="VD: 2"
                      keyboardType="numeric"
                      value={mlpConfigs['MLP']?.men || ''}
                      onChangeText={(text) => setMlpConfigs(prev => ({
                        ...prev,
                        MLP: { ...prev.MLP, men: text }
                      }))}
                    />
                  </View>
                  <View className="flex-1">
                    <Text className="text-xs font-bold text-gray-700 mb-1">Số VĐV Nữ / Đội</Text>
                    <TextInput
                      className="bg-white rounded-xl px-3 py-2.5 text-gray-800 text-sm border border-gray-200"
                      placeholder="VD: 2"
                      keyboardType="numeric"
                      value={mlpConfigs['MLP']?.women || ''}
                      onChangeText={(text) => setMlpConfigs(prev => ({
                        ...prev,
                        MLP: { ...prev.MLP, women: text }
                      }))}
                    />
                  </View>
                </View>
              )}
            </View>
          );
        })}

        {/* Thể thức bốc thăm (DrawFormat) */}
        <View className="mb-4">
          <Text className="text-sm font-bold text-gray-800 mb-1">Thể thức bốc thăm (Draw Format)</Text>
          <TouchableOpacity
            className="bg-gray-200 rounded-2xl px-4 py-3.5 border border-gray-300 flex-row justify-between items-center"
            onPress={() => setShowDrawDropdown(!showDrawDropdown)}
          >
            <Text className="text-gray-900 font-medium">{drawFormat}</Text>
            <Text className="text-gray-600 font-bold">{showDrawDropdown ? '▲' : '▼'}</Text>
          </TouchableOpacity>
          {showDrawDropdown && (
            <View className="bg-white border border-gray-200 rounded-xl mt-1 shadow-sm overflow-hidden">
              {['ROUND_ROBIN', 'SINGLE_ELIMINATION', 'DOUBLE_ELIMINATION'].map((item) => (
                <TouchableOpacity
                  key={item}
                  className="px-4 py-3 border-b border-gray-100"
                  onPress={() => { setDrawFormat(item); setShowDrawDropdown(false); }}
                >
                  <Text className="text-gray-800 text-sm font-medium">{item}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        {/* Thời gian bắt đầu */}
<View className="mb-4">
  <Text className="text-sm font-bold text-gray-800 mb-1">Thời gian bắt đầu</Text>
  
  {/* Nút bấm để mở/đóng bảng chọn */}
  <TouchableOpacity 
    className="bg-gray-200/80 rounded-2xl px-4 py-3.5 border border-gray-300 flex-row justify-between items-center mb-2"
    onPress={() => setShowDatePicker(!showDatePicker)}
  >
    <Text className="text-gray-900 font-medium">
      {startDate.toLocaleString('vi-VN', { 
        year: 'numeric', 
        month: '2-digit', 
        day: '2-digit'
      })}
    </Text>
    <Text className="text-base">📅 {showDatePicker ? '▲' : '▼'}</Text>
  </TouchableOpacity>

  {/* Hiển thị bảng chọn ngay lập tức khi showDatePicker = true */}
  {showDatePicker && (
    <View className="bg-white p-3 rounded-2xl border border-gray-200 shadow-sm items-center">
      <DateTimePicker
        value={startDate}
        mode="datetime"
        display="spinner" // Hiển thị dạng cuộn spinner trực quan trên cả iOS và Android
        onChange={(event, date) => {
          if (date) {
            setStartDate(date);
          }
        }}
        style={{ width: '100%', height: 150 }}
      />
      
      {/* Nút thu gọn lại sau khi chọn xong */}
      <TouchableOpacity 
        className="bg-indigo-600 w-full py-2.5 rounded-xl items-center mt-2"
        onPress={() => setShowDatePicker(false)}
      >
        <Text className="text-white font-bold text-xs">Xong</Text>
      </TouchableOpacity>
    </View>
  )}
</View>
      </View>
      {/* Nút Tạo giải đấu */}
      <TouchableOpacity
        className="bg-indigo-600 py-4 rounded-2xl items-center shadow-sm mb-10"
        onPress={handleCreate}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="#FFFFFF" />
        ) : (
          <Text className="text-white font-bold text-base">Tạo giải đấu</Text>
        )}
      </TouchableOpacity>
    </ScrollView>
  );
};
