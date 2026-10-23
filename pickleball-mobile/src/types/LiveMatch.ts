export interface LiveMatch {
  id: string;
  timeRemaining: string;
  teamA: string;
  teamB: string;
}

export interface UpcomingMatch {
  id: string;
  title: string;
  time: string;
}

interface HomeScreenProps {
  liveMatch?: LiveMatch | null;
  upcomingMatches?: UpcomingMatch[];
  onPressLive?: (matchId: string) => void;
  onPressUpcoming?: (matchId: string) => void;
  onPressSearch?: () => void;
}