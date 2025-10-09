import React from "react";
import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";

type DonutChartData = {
  name: string;
  value: number;
  color: string;
};

type DonutChartProps = {
  data: DonutChartData[];
  height?: number;
};

const DonutChart: React.FC<DonutChartProps> = ({ data, height = 250 }) => (
  <ResponsiveContainer width="100%" height={height}>
    <PieChart>
      <Pie
        data={data}
        dataKey="value"
        nameKey="name"
        cx="50%"
        cy="50%"
        innerRadius={60}
        outerRadius={90}
        paddingAngle={4}
      >
        {data.map((entry, index) => (
          <Cell key={`cell-${index}`} fill={entry.color} />
        ))}
      </Pie>
    </PieChart>
  </ResponsiveContainer>
);

export default DonutChart;
