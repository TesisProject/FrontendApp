export interface Rating {
  userId:     number
  zoneId:     number
  stars:      number
  comment?:   string
  type?:      string
  isReviewed: boolean
  createdAt:  string
  updatedAt:  string
}

export interface ZoneRatingEntry {
  userId:          number
  userDisplayName: string
  stars:           number
  comment?:        string
  type?:           string
  createdAt:       string
}

export interface RatingForm {
  stars:   number
  comment: string
  type:    string
}
