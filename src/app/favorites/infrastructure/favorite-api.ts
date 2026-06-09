import { httpClient } from '../../shared/infrastructure/http-client'
import type { FavoriteResponse } from './favorite-response'

export class FavoriteApi {
  private base(userId: number) {
    return `/iam/users/${userId}/favorites`
  }

  getByUser(userId: number): Promise<FavoriteResponse[]> {
    return httpClient.get<FavoriteResponse[]>(this.base(userId))
  }

  add(userId: number, zoneId: number): Promise<void> {
    return httpClient.post<void>(this.base(userId), { zoneId })
  }

  remove(userId: number, zoneId: number): Promise<void> {
    return httpClient.delete<void>(`${this.base(userId)}/${zoneId}`)
  }
}
