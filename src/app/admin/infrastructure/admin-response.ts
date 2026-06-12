export interface AdminZoneResponse {
  id:                  number
  name:                string
  street:              string
  district:            string
  city:                string
  latitude:            number
  longitude:           number
  totalSpaces:         number
  totalCapacity:       number
  occupiedCount:       number
  freeCount:           number
  occupancyPercentage: number
  classification:      string
  active:              boolean
}

export interface AdminZoneRequest {
  name:          string
  street:        string
  district:      string
  city:          string
  latitude:      number
  longitude:     number
  totalSpaces:   number
  totalCapacity: number
}

export interface AdminCameraResponse {
  id:               number
  zoneId:           number
  name:             string
  streamUrl:        string
  status:           string
  resolution?:      string
  fps?:             number
  detectorVersion?: string
}

export interface AdminCameraCreateRequest {
  zoneId:           number
  name:             string
  streamUrl:        string
  resolution?:      string
  fps?:             number
  detectorVersion?: string
}

export interface AdminCameraUpdateRequest {
  name:             string
  streamUrl:        string
  resolution?:      string
  fps?:             number
  detectorVersion?: string
}

export interface AdminUserResponse {
  id:        number
  email:     string
  role:      string
  isActive:  boolean
  createdAt?: string
}

export interface AdminUserProfileResponse {
  userId:     number
  firstName?: string
  lastName?:  string
  phone?:     string
  avatarUrl?: string
  bio?:       string
}

export interface AdminUserProfileRequest {
  firstName?: string
  lastName?:  string
  phone?:     string
}

export interface AdminSpaceResponse {
  id:            number
  zoneId:        number
  spaceNumber:   string
  currentStatus: 'FREE' | 'OCCUPIED'
  createdAt:     string
  updatedAt:     string
}
