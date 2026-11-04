/** `GET /occupancy/zones/{id}/statistics` (HU-21). Instantes ISO-8601; porcentajes 0–100 con un decimal. */
export interface ZoneStatisticsResponse {
  zoneId:      number
  zoneName:    string
  period:      string
  granularity: string
  from:        string
  to:          string
  points:      StatisticsPointResponse[]
  summary:     StatisticsSummaryResponse | null
}

export interface StatisticsPointResponse {
  bucketStart:            string
  bucketEnd:              string
  avgOccupancyPercentage: number | null
  maxOccupancyPercentage: number | null
  avgOccupied:            number | null
  maxOccupied:            number | null
  totalSpots:             number | null
  samples:                number
}

export interface StatisticsSummaryResponse {
  avgOccupancyPercentage: number
  maxOccupancyPercentage: number
  busiestBucketStart:     string | null
  samples:                number
}

/** `GET /occupancy/analytics/peaks` (HU-19). */
export interface DemandPeaksResponse {
  groupBy:             string
  from:                string
  to:                  string
  thresholdPercentage: number
  percentile90:        number | null
  zones:               DemandZoneResponse[]
}

export interface DemandZoneResponse {
  zoneId:      number
  zoneName:    string
  peakZone:    boolean
  peakSlots:   number
  busiestSlot: DemandSlotResponse
  slots:       DemandSlotResponse[]
}

export interface DemandSlotResponse {
  slot:                   number
  label:                  string
  avgOccupancyPercentage: number
  maxOccupancyPercentage: number
  samples:                number
  peak:                   boolean
  peakReason:             string | null
}
