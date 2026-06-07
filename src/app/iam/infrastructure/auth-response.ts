export interface SignInResponse {
  token: string
  userId: number
  email?: string
  role?: string
}

export interface SignInRequest {
  email: string
  password: string
}

export interface RegisterRequest {
  email: string
  password: string
  roleName: string
}
