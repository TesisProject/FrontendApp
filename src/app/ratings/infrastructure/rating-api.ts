import { httpClient } from '../../shared/infrastructure/http-client'
import type { Rating, ZoneRatingEntry } from '../domain/model/rating.model'

export const ratingApi = {
  getByUser: (userId: number) =>
    httpClient.get<Rating[]>(`/iam/users/${userId}/ratings`),

  getByZone: (zoneId: number) =>
    httpClient.get<ZoneRatingEntry[]>(`/parking/zones/${zoneId}/ratings`),

  create: (userId: number, zoneId: number, stars: number, comment?: string, type?: string) =>
    httpClient.post<Rating>(`/iam/users/${userId}/ratings`, { zoneId, stars, comment, type }),

  update: (userId: number, zoneId: number, stars: number, comment?: string, type?: string) =>
    httpClient.put<Rating>(`/iam/users/${userId}/ratings/${zoneId}`, { stars, comment, type }),

  remove: (userId: number, zoneId: number) =>
    httpClient.delete<void>(`/iam/users/${userId}/ratings/${zoneId}`),
}
