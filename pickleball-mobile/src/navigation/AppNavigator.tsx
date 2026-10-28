import React from 'react';
import { ActivityIndicator, View, Text, TouchableOpacity } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useNavigation, useRoute } from '@react-navigation/native';

import { PlayerProfileScreen } from '../screens/Customer/PlayerProfileScreen';
import { MatchHistoryScreen } from '../screens/Customer/MatchHistoryScreen';
import { TrainingHistoryScreen } from '../screens/Customer/TraningHistoryScreen';
import { TournamentInvitationsScreen } from '../screens/Customer/TournamentInvitationsScreen';
import { TournamentSetupScreen } from '../screens/Organizer/TournamentSetupScreen';
import { AuthScreen } from '../screens/Auth/AuthScreen';
import { HomeScreen } from '../HomeScreen';
import { EditProfileScreen } from '../screens/Customer/EditProfileScreen';
import { CreateTournamentScreen } from '../screens/Organizer/CreateTournamentScreen';
import { OrganizerTournamentsScreen } from '../screens/Organizer/OrganizerTournamentsScreen';
import { TournamentDetailScreen } from '../screens/Organizer/TournamentDetailScreen';
import { RefereeMatchesScreen } from '../screens/Organizer/RefereeMatchesScreen';
import { AdminAccountsScreen } from '../screens/Admin/AdminAccountsScreen';
import { TournamentResultsScreen } from '../screens/Organizer/TournamentResultsScreen';
import { PracticeCoachScreen } from '../screens/Organizer/PracticeCoachScreen';
import { AdminTournamentApprovalsScreen } from '../screens/Admin/AdminTournamentApprovalsScreen';
import { AdminPlayerRatingsScreen } from '../screens/Admin/AdminPlayerRatingsScreen';
import { useSession, UserRole } from '../SessionContext';


const Stack = createNativeStackNavigator();
const allRoles: UserRole[] = ['PLAYER', 'ORGANIZER', 'REFEREE', 'ADMIN'];
const playerOnly: UserRole[] = ['PLAYER'];
const organizerOnly: UserRole[] = ['ORGANIZER'];

const BottomTabs = ({ role }: { role: UserRole }) => {
  const navigation = useNavigation<any>();
  const route = useRoute();

  const sharedTabs = [
    { id: 'Home', label: 'Trang chủ', icon: '🏠', routeName: 'Home' },
    { id: 'PlayerProfile', label: 'Hồ sơ', icon: '👤', routeName: 'PlayerProfile' },
  ];

  const tabs = role === 'ADMIN'
    ? [
        sharedTabs[0],
        { id: 'AdminAccounts', label: 'Quản trị', icon: '🛡️', routeName: 'AdminAccounts' },
        { id: 'TournamentApprovals', label: 'Duyệt giải', icon: '✅', routeName: 'AdminTournamentApprovals' },
        { id: 'PlayerRatings', label: 'Điểm trình', icon: '⭐', routeName: 'AdminPlayerRatings' },
      ]
    : role === 'PLAYER'
    ? [
        sharedTabs[0],
        { id: 'MatchHistory', label: 'Lịch sử đấu', icon: '📅', routeName: 'MatchHistory' },
        { id: 'TrainingHistory', label: 'Tập luyện', icon: '🏆', routeName: 'TrainingHistory' },
        { id: 'RefereeMatches', label: 'Trọng tài', icon: '🎾', routeName: 'RefereeMatches' },
        sharedTabs[1],
      ]
    : role === 'ORGANIZER'
      ? [
          sharedTabs[0],
          { id: 'OrganizerTournaments', label: 'Giải của tôi', icon: '🏆', routeName: 'OrganizerTournaments' },
          { id: 'PracticeCoach', label: 'Practice', icon: '🎯', routeName: 'PracticeCoach' },
          sharedTabs[1],
        ]
      : [
          sharedTabs[0],
          { id: 'RefereeMatches', label: 'Trọng tài', icon: '🎾', routeName: 'RefereeMatches' },
          sharedTabs[1],
        ];

  return (
    <View className="absolute bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-4 py-3 flex-row justify-between items-center shadow-lg">
      {tabs.map((tab) => {
        const isActive = route.name === tab.routeName;
        return (
          <TouchableOpacity 
            key={tab.id} 
            onPress={() => navigation.navigate(tab.routeName)}
            className="items-center justify-center flex-1"
          >
            <Text className="text-lg mb-0.5">{tab.icon}</Text>
            <Text className={`text-[9px] font-semibold ${isActive ? 'text-indigo-600' : 'text-gray-400'}`}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
};

// 2. Layout bọc màn hình chính có kèm BottomTabs ở dưới
const MainTabsWrapper = ({ children }: { children: React.ReactNode }) => {
  const { role } = useSession();
  if (!role) return null;
  return (
  <View className="flex-1 relative bg-gray-50">
    <View className="flex-1 pb-16">
      {children}
    </View>
    <BottomTabs role={role} />
  </View>
  );
};

const RequireRole = ({
  roles,
  children,
}: {
  roles: UserRole[];
  children: React.ReactNode;
}) => {
  const { role } = useSession();
  const navigation = useNavigation<any>();

  React.useEffect(() => {
    if (!role || !roles.includes(role)) {
      navigation.reset({
        index: 0,
        routes: [{ name: role ? 'Home' : 'Auth' }],
      });
    }
  }, [navigation, role, roles]);

  if (!role || !roles.includes(role)) {
    return (
      <View className="flex-1 items-center justify-center bg-gray-50">
        <ActivityIndicator color="#4f46e5" />
      </View>
    );
  }
  return <>{children}</>;
};

// 3. Khởi tạo Stack Navigator chính
export const RootNavigator = () => {
  const { role, loading, error, clearSession, reloadSession } = useSession();

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-gray-50">
        <ActivityIndicator size="large" color="#4f46e5" />
        <Text className="mt-3 text-gray-500">Đang xác thực tài khoản...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View className="flex-1 items-center justify-center bg-gray-50 px-6">
        <Text className="mb-4 text-center text-gray-700">{error}</Text>
        <TouchableOpacity className="rounded-xl bg-indigo-600 px-5 py-3" onPress={() => void reloadSession()}>
          <Text className="font-bold text-white">Thử lại</Text>
        </TouchableOpacity>
        <TouchableOpacity className="mt-3 rounded-xl px-5 py-3" onPress={() => void clearSession()}>
          <Text className="font-bold text-indigo-700">Đăng nhập lại</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }} initialRouteName={role ? 'Home' : 'Auth'}>
      
      {/* Trang Auth đăng nhập / đăng ký */}
      <Stack.Screen name="Auth" component={AuthScreen} />

      {/* Trang chủ - Truyền hàm điều hướng onPressTournament để mở Live Score */}
      <Stack.Screen name="Home">
        {({ navigation }) => (
          <RequireRole roles={allRoles}>
            <MainTabsWrapper>
              <HomeScreen 
                onPressTournament={(tournamentId: string, tournamentName: string) => {
                  navigation.navigate('TournamentDetail', { tournamentId, tournamentName });
                }}
                onPressSearch={() => {}}
              />
            </MainTabsWrapper>
          </RequireRole>
        )}
      </Stack.Screen>

      <Stack.Screen name="PlayerProfile">
        {() => <RequireRole roles={allRoles}><MainTabsWrapper><PlayerProfileScreen /></MainTabsWrapper></RequireRole>}
      </Stack.Screen>

      <Stack.Screen name="MatchHistory">
        {() => <RequireRole roles={playerOnly}><MainTabsWrapper><MatchHistoryScreen /></MainTabsWrapper></RequireRole>}
      </Stack.Screen>

      <Stack.Screen name="TrainingHistory">
        {() => <RequireRole roles={playerOnly}><MainTabsWrapper><TrainingHistoryScreen /></MainTabsWrapper></RequireRole>}
      </Stack.Screen>
      <Stack.Screen name="TournamentInvitations">
        {() => <RequireRole roles={playerOnly}><MainTabsWrapper><TournamentInvitationsScreen /></MainTabsWrapper></RequireRole>}
      </Stack.Screen>

      <Stack.Screen name="CreateTournament">
        {props => (
          <RequireRole roles={organizerOnly}>
            <MainTabsWrapper><CreateTournamentScreen {...props} /></MainTabsWrapper>
          </RequireRole>
        )}
      </Stack.Screen>
      <Stack.Screen name="OrganizerTournaments">
        {() => <RequireRole roles={organizerOnly}><MainTabsWrapper><OrganizerTournamentsScreen /></MainTabsWrapper></RequireRole>}
      </Stack.Screen>
      <Stack.Screen name="AdminAccounts">
        {() => <RequireRole roles={['ADMIN']}><MainTabsWrapper><AdminAccountsScreen /></MainTabsWrapper></RequireRole>}
      </Stack.Screen>
      <Stack.Screen name="AdminTournamentApprovals">
        {() => <RequireRole roles={['ADMIN']}><MainTabsWrapper><AdminTournamentApprovalsScreen /></MainTabsWrapper></RequireRole>}
      </Stack.Screen>
      <Stack.Screen name="AdminPlayerRatings">
        {() => <RequireRole roles={['ADMIN']}><MainTabsWrapper><AdminPlayerRatingsScreen /></MainTabsWrapper></RequireRole>}
      </Stack.Screen>
      <Stack.Screen name="PracticeCoach">
        {() => <RequireRole roles={['ORGANIZER']}><MainTabsWrapper><PracticeCoachScreen /></MainTabsWrapper></RequireRole>}
      </Stack.Screen>
      <Stack.Screen name="RefereeMatches">
        {() => <RequireRole roles={['PLAYER', 'REFEREE']}><MainTabsWrapper><RefereeMatchesScreen /></MainTabsWrapper></RequireRole>}
      </Stack.Screen>

      {/* Các màn hình chi tiết (Không kèm thanh tab ở dưới) */}
      <Stack.Screen name="TournamentSetup">
        {props => <RequireRole roles={organizerOnly}><TournamentSetupScreen {...props} /></RequireRole>}
      </Stack.Screen> 
      <Stack.Screen name="EditProfile">
        {() => <RequireRole roles={allRoles}><EditProfileScreen /></RequireRole>}
      </Stack.Screen>
      
      {/* Màn hình Live Score / Chi tiết giải đấu */}
      <Stack.Screen name="TournamentDetail">
        {props => <RequireRole roles={allRoles}><TournamentDetailScreen {...props} /></RequireRole>}
      </Stack.Screen>
      <Stack.Screen name="TournamentResults">
        {props => <RequireRole roles={allRoles}><TournamentResultsScreen {...props} /></RequireRole>}
      </Stack.Screen>

    </Stack.Navigator>
  );
};
