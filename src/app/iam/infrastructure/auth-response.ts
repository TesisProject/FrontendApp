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

export interface RegisterResponse {
  id: number
  email: string
  role: string
}

export interface UpdateProfileRequest {
  firstName: string
  lastName:  string
  phone:     string
}
