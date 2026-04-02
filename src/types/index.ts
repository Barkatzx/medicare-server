export interface UserPayload {
  id: string;
  email: string;
  role: string;
  isApproved: boolean;
}

export interface RegisterInput {
  email: string;
  phone_number: string;
  name?: string;
  pharmacy_name?: string;
  password: string;
  role?: "admin" | "customer";
}

export interface LoginInput {
  email: string;
  password: string;
}
