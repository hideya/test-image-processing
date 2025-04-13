import React from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  ReferenceArea,
} from "recharts";

interface Measurement {
  date: string;
  angle?: number;
  angle2?: number;
  imageId?: number;
  hashKey?: string;
  memo?: string;
  iconIds?: string;
}

interface MeasurementChartProps {
  chartData: Measurement[];
  chartDateRange: string[];
  selectedDate: string | null;
  setSelectedDate: (date: string | null) => void;
  pulsingDot: string | null;
  setPulsingDot: (date: string | null) => void;
  formatSimpleDate: (dateStr: string) => string;
  isSunday: (dateStr: string) => boolean;
  isSaturday: (dateStr: string) => boolean;
}

export const MeasurementChart: React.FC<MeasurementChartProps> = ({
  chartData,
  chartDateRange,
  selectedDate,
  setSelectedDate,
  pulsingDot,
  setPulsingDot,
  formatSimpleDate,
  isSunday,
  isSaturday,
}) => {
  return (
    <div className="h-80 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart
          data={chartData}
          margin={{ top: 0, right: 0, left: 0, bottom: 0 }}
        >
          <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
          <ReferenceArea
            y1={40}
            y2={50}
            fill="#FFEBEE" /* red */
            fillOpacity={0.75}
          />
          <ReferenceArea
            y1={20}
            y2={40}
            fill="#FFF3E0"
            fillOpacity={0.75} /* orange */
          />
          <ReferenceArea
            y1={15}
            y2={20}
            fill="#FFFFE0" /* yellow */
            fillOpacity={0.75}
          />
          <ReferenceArea
            y1={0}
            y2={15}
            fill="#E8F5E9" /* green */
            fillOpacity={0.75}
          />
          <ReferenceArea
            y1={40}
            y2={40}
            fill="#FFEBEE"
            fillOpacity={0}
            label={{
              value: "40°",
              position: "insideLeft",
              fontSize: 12,
              offset: 4,
              fill: "#E02020",
            }}
          />
          <ReferenceArea
            y1={20}
            y2={20}
            fillOpacity={0}
            label={{
              value: "20°",
              position: "insideLeft",
              fontSize: 12,
              fill: "#E05000",
              offset: 4,
            }}
          />
          <ReferenceArea
            y1={15}
            y2={15}
            fillOpacity={0}
            label={{
              value: "15°",
              position: "insideLeft",
              fontSize: 12,
              fill: "#008000",
              offset: 4,
            }}
          />

          <XAxis
            dataKey="date"
            tickFormatter={(date) => formatSimpleDate(date)}
            tick={(props) => {
              const { x, y, payload } = props;
              const isSun = isSunday(payload.value);
              const isSat = isSaturday(payload.value);
              let textColor = "#6b7280"; // Default gray

              if (isSun) {
                textColor = "#ef4444"; // Red for Sunday
              } else if (isSat) {
                textColor = "#3b82f6"; // Blue for Saturday
              }

              return (
                <g transform={`translate(${x},${y})`}>
                  <text
                    x={0}
                    y={0}
                    dy={16}
                    textAnchor="middle"
                    fill={textColor}
                    fontSize={12}
                  >
                    {formatSimpleDate(payload.value)}
                  </text>
                </g>
              );
            }}
            stroke="#6b7280"
            fontSize={12}
            ticks={chartDateRange.filter(
              (date, index) =>
                index !== 0 &&
                index !== chartDateRange.length - 1,
            )}
            interval={0}
            type="category"
            padding={{ left: 0.5, right: 0.5 }}
            scale="point"
          />
          <YAxis
            domain={[0, 50]}
            hide={true}
          />

          <Line
            type="monotone"
            dataKey="angle"
            stroke="#3b82f6"
            strokeWidth={2}
            name="Primary Angle"
            isAnimationActive={false} 
            connectNulls={true}
            dot={(props: any) => {
              const { cx, cy, payload, index } = props;
              const key=`dot-${payload.date}-${index}`
              const datakey=`dot-${payload.date}-${index}`
              
              if (payload.angle === undefined) {
                return (
                  <circle
                    key={key}
                    data-key={datakey}
                    cx={cx}
                    cy={cy}
                    r={0}
                    fill="transparent"
                    stroke="none"
                  />
                );
              }

              const isSelected = selectedDate === payload.date;
              const isPulsing = pulsingDot === payload.date;

              return (
                <circle
                  key={key}
                  data-key={datakey}
                  cx={cx}
                  cy={cy}
                  r={isPulsing ? 20 : isSelected ? 6 : 4}
                  fill={isSelected ? "#2563eb" : "#3b82f6"}
                  stroke={
                    isSelected || isPulsing ? "#fff" : "none"
                  }
                  strokeWidth={isSelected || isPulsing ? 2 : 0}
                  onClick={() => {
                    if (payload && payload.angle !== undefined) {
                      if (selectedDate === payload.date) {
                        setSelectedDate(null);
                        setPulsingDot(null);
                      } else {
                        setSelectedDate(payload.date);
                        setPulsingDot(payload.date);
                      }
                    }
                  }}
                  style={{
                    cursor: "pointer",
                    animation: isPulsing
                      ? "pulse-dot 500ms cubic-bezier(0.2, 0, 0.35, 1) forwards"
                      : "none",
                  }}
                />
              );
            }}
            activeDot={(props: any) => {
              const { cx, cy, payload, index } = props;
              const key=`active-dot-${payload.date}-${index}`
              const datakey=`active-dot-${payload.date}-${index}`

              if (payload.angle === undefined) {
                return (
                  <circle
                    key={key}
                    data-key={datakey}
                    cx={cx}
                    cy={cy}
                    r={0}
                    fill="transparent"
                    stroke="none"
                  />
                );
              }

              return (
                <circle
                  key={key}
                  data-key={datakey}
                  cx={cx}
                  cy={cy}
                  r={6}
                  fill="#2563eb"
                  stroke="#fff"
                  strokeWidth={2}
                  onClick={() => {
                    if (selectedDate === payload.date) {
                      setSelectedDate(null);
                    } else {
                      setSelectedDate(payload.date);
                    }
                  }}
                  style={{ cursor: "pointer" }}
                />
              );
            }}
          />

          <Line
            type="monotone"
            dataKey="angle2"
            stroke="#10b981"
            strokeWidth={2}
            name="Secondary Angle"
            isAnimationActive={false} 
            connectNulls={true}
            dot={(props: any) => {
              const { cx, cy, payload, index } = props;
              const key=`dot2-${payload.date}-${index}`
              const datakey=`dot2-${payload.date}-${index}`

              if (payload.angle2 === undefined) {
                return (
                  <circle
                    key={key}
                    data-key={datakey}
                    cx={cx}
                    cy={cy}
                    r={0}
                    fill="transparent"
                    stroke="none"
                  />
                );
              }

              const isSelected = selectedDate === payload.date;
              const isPulsing = pulsingDot === payload.date;

              return (
                <circle
                  key={key}
                  data-key={datakey}
                  cx={cx}
                  cy={cy}
                  r={isPulsing ? 20 : isSelected ? 6 : 4}
                  fill={isSelected ? "#059669" : "#10b981"}
                  stroke={
                    isSelected || isPulsing ? "#fff" : "none"
                  }
                  strokeWidth={isSelected || isPulsing ? 2 : 0}
                  onClick={() => {
                    if (payload && payload.angle2 !== undefined) {
                      if (selectedDate === payload.date) {
                        setSelectedDate(null);
                        setPulsingDot(null);
                      } else {
                        setSelectedDate(payload.date);
                        setPulsingDot(payload.date);
                      }
                    }
                  }}
                  style={{
                    cursor: "pointer",
                    animation: isPulsing
                      ? "pulse-dot 500ms cubic-bezier(0.2, 0, 0.35, 1) forwards"
                      : "none",
                  }}
                />
              );
            }}
            activeDot={(props: any) => {
              const { cx, cy, payload, index } = props;
              const key=`active-dot2-${payload.date}-${index}`
              const datakey=`active-dot2-${payload.date}-${index}`
              
              if (payload.angle2 === undefined) {
                return (
                  <circle
                    key={key}
                    data-key={datakey}
                    cx={cx}
                    cy={cy}
                    r={0}
                    fill="transparent"
                    stroke="none"
                  />
                );
              }
              
              return (
                <circle
                  key={key}
                  data-key={datakey}
                  cx={cx}
                  cy={cy}
                  r={6}
                  fill="#059669"
                  stroke="#fff"
                  strokeWidth={2}
                  onClick={() => {
                    if (selectedDate === payload.date) {
                      setSelectedDate(null);
                    } else {
                      setSelectedDate(payload.date);
                    }
                  }}
                  style={{ cursor: "pointer" }}
                />
              );
            }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};
