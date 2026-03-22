export interface Participant {
  id: number;
  nick: string;
  mail: string;
}

export type LotteryState =
  | "idle"
  | "spinning"
  | "slowing"
  | "paused"
  | "revealing"
  | "done";
