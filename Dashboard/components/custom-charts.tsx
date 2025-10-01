"use client"

import { useMemo } from "react"

interface DataPoint {
  label: string
  value: number
}

interface LineChartProps {
  data: DataPoint[]
  height?: number
  color?: string
  fillColor?: string
  showGrid?: boolean
  showAxes?: boolean
}

export function LineChart({
  data,
  height = 200,
  color = "hsl(var(--primary))",
  fillColor = "hsl(var(--primary) / 0.1)",
  showGrid = true,
  showAxes = true,
}: LineChartProps) {
  const { points, maxValue, minValue } = useMemo(() => {
    if (data.length === 0) return { points: "", maxValue: 0, minValue: 0 }

    const values = data.map((d) => d.value)
    const max = Math.max(...values)
    const min = Math.min(...values, 0)
    const range = max - min || 1

    const width = 100
    const padding = 10
    const chartHeight = height - padding * 2
    const chartWidth = width - padding * 2

    const pointsArray = data.map((d, i) => {
      const x = padding + (i / (data.length - 1 || 1)) * chartWidth
      const y = padding + chartHeight - ((d.value - min) / range) * chartHeight
      return `${x},${y}`
    })

    const pathPoints = pointsArray.join(" L ")
    const fillPoints = `${padding},${height - padding} L ${pointsArray.join(" L ")} L ${width - padding},${height - padding} Z`

    return {
      points: pathPoints,
      fillPoints,
      maxValue: max,
      minValue: min,
    }
  }, [data, height])

  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center text-sm text-muted-foreground" style={{ height }}>
        No data available
      </div>
    )
  }

  return (
    <div className="relative w-full" style={{ height }}>
      <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="h-full w-full">
        {showGrid && (
          <g className="opacity-20">
            {[0, 25, 50, 75, 100].map((y) => (
              <line
                key={y}
                x1="10"
                y1={y}
                x2="90"
                y2={y}
                stroke="currentColor"
                strokeWidth="0.2"
                className="text-muted-foreground"
              />
            ))}
          </g>
        )}

        {/* Fill area */}
        <path d={`M ${points} L 90,90 L 10,90 Z`} fill={fillColor} />

        {/* Line */}
        <path d={`M ${points}`} fill="none" stroke={color} strokeWidth="2" vectorEffect="non-scaling-stroke" />
      </svg>
    </div>
  )
}

interface BarChartProps {
  data: DataPoint[]
  height?: number
  color?: string
  horizontal?: boolean
  showValues?: boolean
}

export function BarChart({ 
  data, 
  height = 200, 
  color = "hsl(var(--primary))", 
  horizontal = false,
  showValues = true 
}: BarChartProps) {
  const maxValue = useMemo(() => Math.max(...data.map((d) => d.value), 1), [data])

  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center text-sm text-muted-foreground" style={{ height }}>
        No data available
      </div>
    )
  }

  if (horizontal) {
    return (
      <div className="space-y-3" style={{ height }}>
        {data.map((item, index) => (
          <div key={index} className="flex items-center gap-3">
            <div className="w-24 truncate text-xs text-muted-foreground">{item.label}</div>
            <div className="flex-1">
              <div className="h-6 w-full overflow-hidden rounded-md bg-secondary">
                <div
                  className="h-full rounded-md transition-all duration-500"
                  style={{
                    width: `${(item.value / maxValue) * 100}%`,
                    backgroundColor: color,
                  }}
                />
              </div>
            </div>
            {showValues && (
              <div className="w-12 text-right font-mono text-xs font-semibold">{item.value}</div>
            )}
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="flex h-full items-end justify-around gap-2 px-4" style={{ height }}>
      {data.map((item, index) => (
        <div key={index} className="flex flex-1 flex-col items-center gap-2">
          <div className="relative w-full flex-1">
            <div
              className="absolute bottom-0 w-full rounded-t-md transition-all duration-500"
              style={{
                height: `${(item.value / maxValue) * 100}%`,
                backgroundColor: color,
              }}
            />
          </div>
          <div className="text-xs text-muted-foreground">{item.label}</div>
          {showValues && (
            <div className="font-mono text-xs font-semibold">{item.value}</div>
          )}
        </div>
      ))}
    </div>
  )
}

interface PieChartProps {
  data: DataPoint[]
  size?: number
  innerRadius?: number
  colors?: string[]
  showLabels?: boolean
}

export function PieChart({
  data,
  size = 200,
  innerRadius = 0,
  colors = [
    "hsl(var(--chart-1))",
    "hsl(var(--chart-2))",
    "hsl(var(--chart-3))",
    "hsl(var(--chart-4))",
    "hsl(var(--chart-5))",
    "hsl(var(--destructive))",
  ],
  showLabels = false,
}: PieChartProps) {
  const total = useMemo(() => data.reduce((sum, d) => sum + d.value, 0), [data])

  const slices = useMemo(() => {
    let currentAngle = -90
    return data.map((item, index) => {
      const percentage = (item.value / total) * 100
      const angle = (item.value / total) * 360
      const startAngle = currentAngle
      const endAngle = currentAngle + angle

      const startRad = (startAngle * Math.PI) / 180
      const endRad = (endAngle * Math.PI) / 180

      const outerRadius = 50
      const inner = innerRadius

      const x1 = 50 + outerRadius * Math.cos(startRad)
      const y1 = 50 + outerRadius * Math.sin(startRad)
      const x2 = 50 + outerRadius * Math.cos(endRad)
      const y2 = 50 + outerRadius * Math.sin(endRad)

      const largeArc = angle > 180 ? 1 : 0

      let path
      if (inner > 0) {
        const x3 = 50 + inner * Math.cos(endRad)
        const y3 = 50 + inner * Math.sin(endRad)
        const x4 = 50 + inner * Math.cos(startRad)
        const y4 = 50 + inner * Math.sin(startRad)

        path = `M ${x1} ${y1} A ${outerRadius} ${outerRadius} 0 ${largeArc} 1 ${x2} ${y2} L ${x3} ${y3} A ${inner} ${inner} 0 ${largeArc} 0 ${x4} ${y4} Z`
      } else {
        path = `M 50 50 L ${x1} ${y1} A ${outerRadius} ${outerRadius} 0 ${largeArc} 1 ${x2} ${y2} Z`
      }

      // Calculate label position (middle of the slice)
      const midAngle = startAngle + angle / 2
      const midRad = (midAngle * Math.PI) / 180
      const labelRadius = innerRadius > 0 ? (outerRadius + innerRadius) / 2 : outerRadius * 0.7
      const labelX = 50 + labelRadius * Math.cos(midRad)
      const labelY = 50 + labelRadius * Math.sin(midRad)

      currentAngle = endAngle

      return {
        path,
        color: colors[index % colors.length],
        percentage,
        label: item.label,
        value: item.value,
        labelX,
        labelY,
      }
    })
  }, [data, total, innerRadius, colors])

  if (data.length === 0) {
    return (
      <div
        className="flex items-center justify-center text-sm text-muted-foreground"
        style={{ width: size, height: size }}
      >
        No data available
      </div>
    )
  }

  return (
    <svg width={size} height={size} viewBox="0 0 100 100">
      {slices.map((slice, index) => (
        <g key={index}>
          <path 
            d={slice.path} 
            fill={slice.color} 
            className="transition-all duration-300 hover:opacity-80 hover:scale-105"
            style={{ transformOrigin: '50% 50%' }}
          />
          {showLabels && slice.percentage > 5 && (
            <text
              x={slice.labelX}
              y={slice.labelY}
              textAnchor="middle"
              dominantBaseline="middle"
              className="fill-white text-xs font-semibold pointer-events-none"
              style={{ fontSize: '3px' }}
            >
              {`${Math.round(slice.percentage)}%`}
            </text>
          )}
        </g>
      ))}
    </svg>
  )
}

// NOUVEAU COMPOSANT : Sparkline pour les mini-graphiques
interface SparklineProps {
  data: number[]
  width?: number
  height?: number
  color?: string
}

export function Sparkline({ 
  data, 
  width = 100, 
  height = 30, 
  color = "hsl(var(--primary))" 
}: SparklineProps) {
  const points = useMemo(() => {
    if (data.length === 0) return ""

    const max = Math.max(...data)
    const min = Math.min(...data)
    const range = max - min || 1

    return data.map((value, index) => {
      const x = (index / (data.length - 1 || 1)) * width
      const y = height - ((value - min) / range) * height
      return `${x},${y}`
    }).join(" ")
  }, [data, width, height])

  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center text-xs text-muted-foreground" style={{ width, height }}>
        -
      </div>
    )
  }

  return (
    <svg width={width} height={height} className="overflow-visible">
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

// NOUVEAU COMPOSANT : MetricCard pour les KPI
interface MetricCardProps {
  title: string
  value: string | number
  change?: number
  trend?: 'up' | 'down' | 'neutral'
  icon?: React.ReactNode
  color?: string
}

export function MetricCard({ 
  title, 
  value, 
  change, 
  trend = 'neutral', 
  icon,
  color = "hsl(var(--primary))" 
}: MetricCardProps) {
  const trendColor = useMemo(() => {
    switch (trend) {
      case 'up': return 'text-success'
      case 'down': return 'text-destructive'
      default: return 'text-muted-foreground'
    }
  }, [trend])

  const trendIcon = useMemo(() => {
    switch (trend) {
      case 'up': return '↗'
      case 'down': return '↘'
      default: return '→'
    }
  }, [trend])

  return (
    <div className="rounded-lg border bg-card p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          <p className="text-2xl font-bold" style={{ color }}>{value}</p>
          {change !== undefined && (
            <div className={`flex items-center gap-1 text-xs ${trendColor}`}>
              <span>{trendIcon}</span>
              <span>{Math.abs(change)}%</span>
              <span>vs previous period</span>
            </div>
          )}
        </div>
        {icon && (
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
            {icon}
          </div>
        )}
      </div>
    </div>
  )
}

// NOUVEAU COMPOSANT : ProgressBar pour les pourcentages
interface ProgressBarProps {
  value: number
  max?: number
  color?: string
  showLabel?: boolean
  height?: number
}

export function ProgressBar({ 
  value, 
  max = 100, 
  color = "hsl(var(--primary))", 
  showLabel = true,
  height = 8 
}: ProgressBarProps) {
  const percentage = Math.min((value / max) * 100, 100)

  return (
    <div className="space-y-2">
      {showLabel && (
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>Progress</span>
          <span>{Math.round(percentage)}%</span>
        </div>
      )}
      <div 
        className="w-full overflow-hidden rounded-full bg-secondary"
        style={{ height }}
      >
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{
            width: `${percentage}%`,
            backgroundColor: color,
          }}
        />
      </div>
    </div>
  )
}