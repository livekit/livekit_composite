export type Session = {
  sessionId: string;
  roomName: string;
  startedAt: string;
  endedAt: string;
  duration: string;
  participants: number;
  features: string;
  status: "CLOSED" | "ACTIVE";
};

export const mockSessions: Session[] = [
  {
    sessionId: "RM_dTTtaqrTdUJt",
    roomName: "home-DFPu-Mzm8",
    startedAt: "Oct 3, 2025, 3:48:53 pm",
    endedAt: "Oct 3, 2025, 3:50:54 pm",
    duration: "3 min",
    participants: 2,
    features: "Agents",
    status: "CLOSED",
  },
  {
    sessionId: "RM_2Pe5VNgQvwCb",
    roomName: "home-uWLJ-HYGk",
    startedAt: "Oct 3, 2025, 3:46:54 pm",
    endedAt: "Oct 3, 2025, 3:47:30 pm",
    duration: "36 sec",
    participants: 2,
    features: "Agents",
    status: "CLOSED",
  },
  {
    sessionId: "RM_M76vCJejrvb4",
    roomName: "home-rhML-9lgE",
    startedAt: "Oct 3, 2025, 3:02:03 pm",
    endedAt: "Oct 3, 2025, 3:03:49 pm",
    duration: "2 min",
    participants: 2,
    features: "Agents",
    status: "CLOSED",
  },
  {
    sessionId: "RM_8JgKizm95ApD",
    roomName: "home-D7Kk-EXhI",
    startedAt: "Oct 3, 2025, 2:30:57 pm",
    endedAt: "Oct 3, 2025, 2:33:40 pm",
    duration: "3 min",
    participants: 2,
    features: "Agents",
    status: "CLOSED",
  },
  {
    sessionId: "RM_DfnDzdJyuoie",
    roomName: "home-8ctR-58kI",
    startedAt: "Oct 3, 2025, 2:29:50 pm",
    endedAt: "Oct 3, 2025, 2:30:34 pm",
    duration: "44 sec",
    participants: 2,
    features: "Agents",
    status: "CLOSED",
  },
  {
    sessionId: "RM_HcyF34cu6foK",
    roomName: "home-8GGe-J5ZN",
    startedAt: "Oct 3, 2025, 2:29:48 pm",
    endedAt: "Oct 3, 2025, 2:29:53 pm",
    duration: "5 sec",
    participants: 2,
    features: "Agents",
    status: "CLOSED",
  },
  {
    sessionId: "RM_pzf5CvfGa2pL",
    roomName: "home-Knqe-FW6u",
    startedAt: "Oct 3, 2025, 2:20:52 pm",
    endedAt: "Oct 3, 2025, 2:22:51 pm",
    duration: "2 min",
    participants: 2,
    features: "Agents",
    status: "CLOSED",
  },
];

