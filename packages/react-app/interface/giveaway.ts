export interface IGiveaway {
  id: string;
  title: string;
  description: string;
  expiredAt: string;
  creator: string;
  numbersOfUserToJoin: number;
  totalAmount: number;
  joinedUsers: string[];
}
