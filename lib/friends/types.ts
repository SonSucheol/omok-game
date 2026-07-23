export type FriendshipStatus = "pending" | "accepted";

export interface FriendshipRecord {
  id: string;
  fromUserId: string;
  toUserId: string;
  status: FriendshipStatus;
  createdAt: string;
  updatedAt: string;
}

export interface FriendListItem {
  userId: string;
  nickname: string;
  friendshipId: string;
}

export interface FriendRequestItem {
  id: string;
  fromUserId: string;
  fromNickname: string;
  toUserId: string;
  toNickname: string;
  createdAt: string;
}
