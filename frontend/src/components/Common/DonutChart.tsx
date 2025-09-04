import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';

const donutData = [
  { name: 'Active Applications', value: 400, color: '#22c0d3' },
  { name: 'Inactive Applications', value: 100, color: '#ffcf87' },
  { name: 'Pending Requests', value: 300, color: '#c64a3c' },
  { name: 'Approved Requests', value: 200, color: '#56838c' },
];

const DonutChart = () => (
  <ResponsiveContainer width="100%" height={250}>
    <PieChart>
      <Pie
        data={donutData}
        dataKey="value"
        nameKey="name"
        cx="50%"
        cy="50%"
        innerRadius={60}
        outerRadius={90}
        paddingAngle={4}
      >
        {donutData.map((entry, index) => (
          <Cell key={`cell-${index}`} fill={entry.color} />
        ))}
      </Pie>
    </PieChart>
  </ResponsiveContainer>
);

export default DonutChart;