import React from 'react'
import { View, Text, FlatList } from 'react-native'
import type { ViewStyle, TextStyle, ListRenderItemInfo } from 'react-native'
import type { PortfolioItem as PortfolioItemData } from '@salonin/types'
import { PortfolioItem } from './PortfolioItem'

export interface PortfolioGridProps {
  items: PortfolioItemData[]
  onPressItem: (item: PortfolioItemData) => void
  isLoading?: boolean
}

export function PortfolioGrid({ items, onPressItem, isLoading = false }: PortfolioGridProps) {
  if (isLoading) return <PortfolioGridSkeleton />

  return (
    <FlatList<PortfolioItemData>
      data={items}
      keyExtractor={(item) => item.id}
      numColumns={3}
      scrollEnabled={false}
      renderItem={({ item }: ListRenderItemInfo<PortfolioItemData>) => (
        <PortfolioItem item={item} onPress={onPressItem} />
      )}
      columnWrapperStyle={COL_WRAPPER}
      ListEmptyComponent={<EmptyPortfolio />}
    />
  )
}

function EmptyPortfolio() {
  return (
    <View style={EMPTY}>
      <Text style={EMPTY_TEXT}>No portfolio items yet</Text>
    </View>
  )
}

function PortfolioGridSkeleton() {
  return (
    <View style={SKELETON_GRID}>
      {Array.from({ length: 6 }).map((_, i) => (
        <SkeletonCell key={i} />
      ))}
    </View>
  )
}

function SkeletonCell() {
  return (
    <View style={SKELETON_CELL}>
      <View style={SKELETON_INNER} />
    </View>
  )
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const COL_WRAPPER: ViewStyle = {
  gap: 2,
  marginBottom: 2,
}

const EMPTY: ViewStyle = {
  paddingVertical: 32,
  alignItems: 'center',
}

const EMPTY_TEXT: TextStyle = {
  color: '#555555',
  fontSize: 13,
}

const SKELETON_GRID: ViewStyle = {
  flexDirection: 'row',
  flexWrap: 'wrap',
}

const SKELETON_CELL: ViewStyle = {
  width: '33.33%' as `${number}%`,
  aspectRatio: 1,
  padding: 1,
}

const SKELETON_INNER: ViewStyle = {
  flex: 1,
  backgroundColor: '#1E1E1E',
  borderRadius: 4,
}
