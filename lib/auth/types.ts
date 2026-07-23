export interface PublicUser {
  id: string;
  nickname: string;
  createdAt: string;
}

export interface UserRecord extends PublicUser {
  passwordHash: string;
}

export interface SessionRecord {
  token: string;
  userId: string;
  expiresAt: string;
}

export const SESSION_COOKIE = "omok_session";
export const SESSION_DAYS = 30;
