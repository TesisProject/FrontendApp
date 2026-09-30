<script setup lang="ts">
import { Badge } from '@/app/shared/presentation/components/ui/badge'
import { classificationLabel } from '../../domain/zone-classification'
import type { ZoneClassification } from '../../domain/model/zone.model'
import { CLASSIFICATION_BADGE } from '../classification-ui'

/** ClassificationBadge — Libre / Moderado / Ocupado como pill tintado. */
defineProps<{ classification: ZoneClassification }>()
</script>

<template>
  <Badge :variant="CLASSIFICATION_BADGE[classification]" size="pill">
    {{ classificationLabel(classification) }}
  </Badge>
</template>
