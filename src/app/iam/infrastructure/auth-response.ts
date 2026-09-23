import type { DocumentType } from '../domain/model/document-type.vo'

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

export interface SignUpRequest {
  email: string
  password: string
  firstName: string
  lastName: string
  documentType: DocumentType
  documentNumber: string
  phonePrefix: string
  phone: string
}
