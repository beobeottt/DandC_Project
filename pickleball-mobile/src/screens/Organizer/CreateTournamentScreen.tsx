import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, ActivityIndicator, Alert, Platform, Image } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as ImagePicker from 'expo-image-picker';
import { api } from '../../services/api';

export const CreateTournamentScreen = ({ navigation }: any) => {
  const [eventName, setEventName] = useState('');
  const [description, setDescription] = useState('');
  const [address, setAddress] = useState('');
  const [locations, setLocations] = useState<string[]>([]);
  const [showLocationSuggestions, setShowLocationSuggestions] = useState(false);
  const [coverImageUri, setCoverImageUri] = useState('');
  const [coverImageUrl, setCoverImageUrl] = useState('');
  const [uploadingCover, setUploadingCover] = useState(false);
  const [awardTypes, setAwardTypes] = useState<string[]>([]);
  const [feePerPlayer, setFeePerPlayer] = useState('0');
  const [championPrizeMoney, setChampionPrizeMoney] = useState('0');
  const [contactLink, setContactLink] = useState('');

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
  const [drawFormat, setDrawFormat] = useState('GROUP_AND_KNOCKOUT');
  const [showDrawDropdown, setShowDrawDropdown] = useState(false);
  const [qualifiersPerGroup, setQualifiersPerGroup] = useState<2 | 3>(2);
  const [bronzeMatchEnabled, setBronzeMatchEnabled] = useState(false);

  // Thời gian bắt đầu
  const [startDate, setStartDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [endDate, setEndDate] = useState(new Date());
  const [showEndDatePicker, setShowEndDatePicker] = useState(false);

  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let active = true;
    const loadLocations = async () => {
      try {
        const response = await api.get<string[]>('/tournament/locations');
        if (active) setLocations(response.data);
      } catch (error: any) {
        if (active) {
          Alert.alert('Lỗi', error.response?.data?.message || 'Không thể tải danh sách sân đã lưu');
        }
      }
    };
    void loadLocations();
    return () => {
      active = false;
    };
  }, []);

  const handlePickCover = async () => {
    let result: ImagePicker.ImagePickerResult;
    try {
      result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [16, 9],
        quality: 0.8,
      });
    } catch (error) {
      Alert.alert('Lỗi', error instanceof Error ? error.message : 'Không thể mở thư viện ảnh');
      return;
    }
    if (result.canceled || !result.assets[0]) return;

    const image = result.assets[0];
    setCoverImageUri(image.uri);
    setUploadingCover(true);
    try {
      const formData = new FormData() as FormData & {
        append(name: string, value: { uri: string; name: string; type: string }): void;
      };
      const extension = image.mimeType === 'image/png' ? 'png' : image.mimeType === 'image/webp' ? 'webp' : 'jpg';
      formData.append('file', {
        uri: image.uri,
        name: `tournament-cover-${Date.now()}.${extension}`,
        type: image.mimeType || 'image/jpeg',
      } as unknown as Blob);
      const response = await api.post<{ coverImageUrl: string }>('/tournament/cover', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setCoverImageUrl(response.data.coverImageUrl);
    } catch (error: any) {
      setCoverImageUri('');
      Alert.alert('Lỗi tải ảnh', error.response?.data?.message || 'Không thể tải ảnh bìa lên server');
    } finally {
      setUploadingCover(false);
    }
  };

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
      if (value.startsWith('MLP') && !mlpConfigs['MLP']) {
        setMlpConfigs(prev => ({ ...prev, MLP: { men: '2', women: '2' } }));
      }
    }
    setSelectedFormats(updatedFormats);
  };

  const handleCreate = async () => {
  if (!eventName.trim() || !address.trim()) {
    Alert.alert('Lỗi', 'Vui lòng điền đầy đủ tên giải và địa chỉ');
    return;
  }
  if (endDate < startDate) {
    Alert.alert('Lỗi', 'Ngày kết thúc phải sau hoặc bằng ngày bắt đầu');
    return;
  }
  if (awardTypes.length === 0) {
    Alert.alert('Lỗi', 'Vui lòng chọn ít nhất một loại giải thưởng');
    return;
  }
  if (uploadingCover) {
    Alert.alert('Đang tải ảnh', 'Vui lòng đợi ảnh bìa tải lên xong trước khi tạo giải');
    return;
  }
  if (coverImageUri && !coverImageUrl) {
    Alert.alert('Lỗi', 'Ảnh bìa chưa tải lên thành công. Vui lòng chọn lại ảnh.');
    return;
  }
  const fee = Number(feePerPlayer);
  const championPrize = Number(championPrizeMoney);
  if (!Number.isSafeInteger(fee) || fee < 0 || !Number.isSafeInteger(championPrize) || championPrize < 0) {
    Alert.alert('Lỗi', 'Phí tham gia và tiền thưởng phải là số nguyên không âm');
    return;
  }
  if (contactLink.trim() && !/^https?:\/\/\S+$/i.test(contactLink.trim())) {
    Alert.alert('Lỗi', 'Link liên hệ phải bắt đầu bằng http:// hoặc https://');
    return;
  }
  if (selectedFormats.some(format => {
    const count = Number(formatPlayerCounts[format]);
    return !Number.isInteger(count) || count < 2 || count > 10000;
  })) {
    Alert.alert('Lỗi', 'Số lượng người chơi mỗi nội dung phải từ 2 đến 10.000');
    return;
  }

  setLoading(true);
  try {
    // Đóng gói danh sách nội dung kèm cấu hình riêng biệt của từng nội dung
    const formatsDetail = selectedFormats.map(format => ({
      format,
      maxPlayers: Number(formatPlayerCounts[format]),
      ...(format.startsWith('MLP') ? {
        menPerTeam: parseInt(mlpConfigs['MLP']?.men) || 2,
        womenPerTeam: parseInt(mlpConfigs['MLP']?.women) || 2,
      } : {})
    }));

    await api.post('/tournament', {
      name: eventName.trim(),
      location: address.trim(),
      coverImageUrl: coverImageUrl || undefined,
      description: description.trim() || undefined,
      startAt: startDate.toISOString(),
      endAt: endDate.toISOString(),
      formatsDetail: formatsDetail,
      drawFormat: drawFormat,
      qualifiersPerGroup,
      bronzeMatchEnabled,
      awardTypes,
      feePerPlayer: fee,
      championPrizeMoney: championPrize,
      contactLink: contactLink.trim() || undefined,
    });

    Alert.alert(
      'Đã gửi yêu cầu duyệt',
      'Giải đấu đang chờ admin duyệt. Sau khi được duyệt, bạn mới có thể mời thành viên.',
      [{ text: 'Đã hiểu', onPress: () => navigation.navigate('OrganizerTournaments') }],
    );
  } catch (error: any) {
    const errorMsg = error.response?.data?.message;
    Alert.alert('Lỗi', Array.isArray(errorMsg) ? errorMsg[0] : (errorMsg || 'Không thể tạo giải đấu'));
  } finally {
    setLoading(false);
  }
};


  const formatOptions = [
    { label: 'RRB nam nữ', value: 'RRB_MEN_WOMEN' },
    { label: 'RRB đôi nữ', value: 'RRB_WOMEN_DOUBLES' },
    { label: 'RRB đôi nam', value: 'RRB_MEN_DOUBLES' },
    { label: 'RRB xoay vòng nữ', value: 'RRB_ROTATING_WOMEN' },
    { label: 'RRB vòng xoay nam', value: 'RRB_ROTATING_MEN' },
    { label: 'MLP DREAMBREAK', value: 'MLP_DREAMBREAK' },
    { label: 'MLP tiếp sức', value: 'MLP_RELAY' },
    { label: 'Đôi nữ', value: 'WOMENDOUBLES' },
    { label: 'Đôi Nam', value: 'MENDOUBLES' },
    { label: 'Đôi hỗn hợp', value: 'MIXDOUBLES' },
    { label: 'Đơn nam', value: 'MEN_SINGLES' },
    { label: 'Đơn nữ', value: 'WOMEN_SINGLES' },
  ];

  const awardOptions = [
    { label: 'Cúp', value: 'CUP' },
    { label: 'Tiền mặt', value: 'CASH' },
    { label: 'Quà', value: 'GIFT' },
  ];

  return (
    <ScrollView className="flex-1 bg-gray-50 p-6" keyboardShouldPersistTaps="handled">
      {/* Header Chào BTC */}
      <View className="bg-gray-200 self-start px-4 py-2 rounded-xl mb-4">
        <Text className="text-gray-800 font-bold text-sm">Xin Chào BTC</Text>
      </View>
      <Text className="text-gray-500 text-xs mb-6">
        {new Date().toLocaleDateString('vi-VN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
      </Text>

      {/* Form Fields */}
      <View className="space-y-4 mb-8">

        {/* Tên sự kiện */}
        <View className="mb-4">
          <Text className="text-sm font-bold text-gray-800 mb-1">Tên giải đấu</Text>
          <TextInput
            className="bg-gray-200/80 rounded-2xl px-4 py-3.5 text-gray-800 text-sm border border-gray-300"
            placeholder="Nhập tên giải đấu..."
            placeholderTextColor="#9CA3AF"
            value={eventName}
            onChangeText={setEventName}
            maxLength={160}
          />
        </View>

        <View className="mb-4">
          <Text className="text-sm font-bold text-gray-800 mb-1">Ảnh bìa</Text>
          {coverImageUri || coverImageUrl ? (
            <Image
              source={{ uri: coverImageUri || `${api.defaults.baseURL}${coverImageUrl}` }}
              className="w-full h-44 rounded-2xl mb-2"
              resizeMode="cover"
            />
          ) : null}
          <TouchableOpacity
            className="bg-white rounded-2xl px-4 py-3.5 border border-gray-300 items-center"
            onPress={() => void handlePickCover()}
            disabled={uploadingCover}
          >
            {uploadingCover ? (
              <ActivityIndicator color="#4F46E5" />
            ) : (
              <Text className="text-indigo-700 font-bold">
                {coverImageUrl ? 'Chọn ảnh bìa khác' : 'Chọn ảnh từ thiết bị'}
              </Text>
            )}
          </TouchableOpacity>
          <Text className="text-xs text-gray-500 mt-1">JPG, PNG hoặc WEBP; tối đa 5 MB.</Text>
        </View>

        <View className="mb-4">
          <Text className="text-sm font-bold text-gray-800 mb-1">Mô tả</Text>
          <TextInput
            className="bg-gray-200/80 rounded-2xl px-4 py-3.5 text-gray-800 text-sm border border-gray-300 min-h-24"
            placeholder="Giới thiệu về giải đấu..."
            placeholderTextColor="#9CA3AF"
            value={description}
            onChangeText={setDescription}
            multiline
            textAlignVertical="top"
            maxLength={5000}
          />
        </View>

        <View className="mb-4">
          <Text className="text-sm font-bold text-gray-800 mb-1">Sân / địa chỉ thi đấu</Text>
          <TextInput
            className="bg-gray-200/80 rounded-2xl px-4 py-3.5 text-gray-800 text-sm border border-gray-300"
            placeholder="Chọn sân đã lưu hoặc nhập địa chỉ mới..."
            placeholderTextColor="#9CA3AF"
            value={address}
            onFocus={() => setShowLocationSuggestions(true)}
            onChangeText={(value) => {
              setAddress(value);
              setShowLocationSuggestions(true);
            }}
            maxLength={240}
          />
          {showLocationSuggestions && locations.length > 0 && (
            <View className="bg-white border border-gray-200 rounded-xl mt-1 overflow-hidden">
              {locations
                .filter(location => !address.trim() || location.toLocaleLowerCase('vi').includes(address.trim().toLocaleLowerCase('vi')))
                .slice(0, 6)
                .map(location => (
                  <TouchableOpacity
                    key={location}
                    className="px-4 py-3 border-b border-gray-100"
                    onPress={() => {
                      setAddress(location);
                      setShowLocationSuggestions(false);
                    }}
                  >
                    <Text className="text-sm text-gray-800">{location}</Text>
                  </TouchableOpacity>
                ))}
              <TouchableOpacity
                className="px-4 py-2.5 bg-gray-50"
                onPress={() => setShowLocationSuggestions(false)}
              >
                <Text className="text-xs text-indigo-700 font-semibold">Nhập địa chỉ mới / đóng gợi ý</Text>
              </TouchableOpacity>
            </View>
          )}
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
          const isMLP = formatVal.startsWith('MLP');

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
                  maxLength={5}
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

        <View className="mb-4">
          <Text className="text-sm font-bold text-gray-800 mb-1">Loại giải thưởng (chọn nhiều)</Text>
          <View className="flex-row flex-wrap gap-2">
            {awardOptions.map(option => {
              const selected = awardTypes.includes(option.value);
              return (
                <TouchableOpacity
                  key={option.value}
                  className={`rounded-xl px-4 py-3 border ${selected ? 'bg-indigo-600 border-indigo-600' : 'bg-white border-gray-300'}`}
                  onPress={() => setAwardTypes(current => (
                    selected
                      ? current.filter(value => value !== option.value)
                      : [...current, option.value]
                  ))}
                >
                  <Text className={`font-semibold ${selected ? 'text-white' : 'text-gray-800'}`}>
                    {selected ? '✓ ' : ''}{option.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        <View className="flex-row gap-3 mb-4">
          <View className="flex-1">
            <Text className="text-sm font-bold text-gray-800 mb-1">Phí mỗi người (₫)</Text>
            <TextInput
              className="bg-gray-200/80 rounded-2xl px-4 py-3.5 text-gray-800 text-sm border border-gray-300"
              placeholder="0"
              keyboardType="numeric"
              value={feePerPlayer}
              onChangeText={setFeePerPlayer}
            />
          </View>
          <View className="flex-1">
            <Text className="text-sm font-bold text-gray-800 mb-1">Tiền thưởng vô địch (₫)</Text>
            <TextInput
              className="bg-gray-200/80 rounded-2xl px-4 py-3.5 text-gray-800 text-sm border border-gray-300"
              placeholder="0"
              keyboardType="numeric"
              value={championPrizeMoney}
              onChangeText={setChampionPrizeMoney}
            />
          </View>
        </View>

        <View className="mb-4">
          <Text className="text-sm font-bold text-gray-800 mb-1">Link liên hệ</Text>
          <TextInput
            className="bg-gray-200/80 rounded-2xl px-4 py-3.5 text-gray-800 text-sm border border-gray-300"
            placeholder="https://facebook.com/... hoặc https://zalo.me/..."
            placeholderTextColor="#9CA3AF"
            value={contactLink}
            onChangeText={setContactLink}
            autoCapitalize="none"
            keyboardType="url"
          />
        </View>

        {/* Thể thức bốc thăm (DrawFormat) */}
        <View className="mb-4">
          <Text className="text-sm font-bold text-gray-800 mb-1">Thể thức bốc thăm (Draw Format)</Text>
          <TouchableOpacity
            className="bg-gray-200 rounded-2xl px-4 py-3.5 border border-gray-300 flex-row justify-between items-center"
            onPress={() => setShowDrawDropdown(!showDrawDropdown)}
          >
            <Text className="text-gray-900 font-medium">
              {drawFormat === 'GROUP_AND_KNOCKOUT' ? 'Vòng bảng + loại trực tiếp' : drawFormat === 'ROUND_ROBIN' ? 'Vòng tròn' : 'Loại trực tiếp'}
            </Text>
            <Text className="text-gray-600 font-bold">{showDrawDropdown ? '▲' : '▼'}</Text>
          </TouchableOpacity>
          {showDrawDropdown && (
            <View className="bg-white border border-gray-200 rounded-xl mt-1 shadow-sm overflow-hidden">
              {['GROUP_AND_KNOCKOUT', 'ROUND_ROBIN', 'SINGLE_ELIMINATION'].map((item) => (
                <TouchableOpacity
                  key={item}
                  className="px-4 py-3 border-b border-gray-100"
                  onPress={() => { setDrawFormat(item); setShowDrawDropdown(false); }}
                >
                  <Text className="text-gray-800 text-sm font-medium">
                    {item === 'GROUP_AND_KNOCKOUT' ? 'Vòng bảng + loại trực tiếp' : item === 'ROUND_ROBIN' ? 'Vòng tròn' : 'Loại trực tiếp'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>
        {drawFormat === 'GROUP_AND_KNOCKOUT' && (
          <View className="mb-4 rounded-2xl border border-indigo-100 bg-indigo-50 p-4">
            <Text className="mb-2 text-sm font-bold text-gray-800">Cấu hình vòng loại trực tiếp</Text>
            <Text className="mb-2 text-xs text-gray-600">Chọn số đội đầu bảng được vào vòng trong.</Text>
            <View className="mb-3 flex-row gap-2">
              {([2, 3] as const).map(count => (
                <TouchableOpacity
                  key={count}
                  className={`flex-1 items-center rounded-xl py-3 ${qualifiersPerGroup === count ? 'bg-indigo-600' : 'bg-white'}`}
                  onPress={() => setQualifiersPerGroup(count)}
                >
                  <Text className={`text-sm font-bold ${qualifiersPerGroup === count ? 'text-white' : 'text-gray-700'}`}>
                    {count} đội / bảng
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <TouchableOpacity
              className="flex-row items-center"
              onPress={() => setBronzeMatchEnabled(current => !current)}
            >
              <View className={`mr-2 h-5 w-5 items-center justify-center rounded border ${bronzeMatchEnabled ? 'border-indigo-600 bg-indigo-600' : 'border-gray-400 bg-white'}`}>
                <Text className="text-xs font-bold text-white">{bronzeMatchEnabled ? '✓' : ''}</Text>
              </View>
              <Text className="flex-1 text-xs text-gray-700">Tổ chức trận tranh hạng 3</Text>
            </TouchableOpacity>
          </View>
        )}

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

<View className="mb-4">
  <Text className="text-sm font-bold text-gray-800 mb-1">Ngày kết thúc</Text>
  <TouchableOpacity
    className="bg-gray-200/80 rounded-2xl px-4 py-3.5 border border-gray-300 flex-row justify-between items-center mb-2"
    onPress={() => setShowEndDatePicker(!showEndDatePicker)}
  >
    <Text className="text-gray-900 font-medium">
      {endDate.toLocaleDateString('vi-VN', { year: 'numeric', month: '2-digit', day: '2-digit' })}
    </Text>
    <Text className="text-base">📅 {showEndDatePicker ? '▲' : '▼'}</Text>
  </TouchableOpacity>
  {showEndDatePicker && (
    <View className="bg-white p-3 rounded-2xl border border-gray-200 shadow-sm items-center">
      <DateTimePicker
        value={endDate}
        mode="datetime"
        display="spinner"
        onChange={(_event, date) => {
          if (date) setEndDate(date);
        }}
        style={{ width: '100%', height: 150 }}
      />
      <TouchableOpacity
        className="bg-indigo-600 w-full py-2.5 rounded-xl items-center mt-2"
        onPress={() => setShowEndDatePicker(false)}
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
