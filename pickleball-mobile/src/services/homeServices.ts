import { api } from './api';

export const fetchHomeData = async () => {
  try {
    const response = await api.get('/tournament/home-summary'); 
    return response.data; 
  } catch (error) {
    console.error('Lỗi khi tải dữ liệu trang chủ:', error);
    throw error;
  }
};
