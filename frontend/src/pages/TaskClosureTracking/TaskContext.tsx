import React, { createContext, useContext, useEffect, useState } from "react";

interface TaskLog {
    task_id: number;
  user_request_id: number;
  user_request_transaction_id: string;
  name: string;
  employee_code: string;
  application_name: string;
  role_name: string;
  task_status: string;
  user_request_status: string;
  plant_name?: string;
}

interface TaskContextType {
  tasks: TaskLog[];
  loading: boolean;
  error: string | null;
  refreshTasks: () => Promise<void>;
}

const TaskContext = createContext<TaskContextType | undefined>(undefined);

export const TaskProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [tasks, setTasks] = useState<TaskLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTasks = async () => {
    try {
      setLoading(true);
      const response = await fetch("http://localhost:4000/api/task");
      if (!response.ok) throw new Error(`HTTP error: ${response.status}`);
      const data = await response.json();
      setTasks(data);
    } catch (err: any) {
      console.error("Error fetching task data:", err);
      setError("Failed to fetch tasks. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTasks();
  }, []);

  return (
    <TaskContext.Provider value={{ tasks, loading, error, refreshTasks: fetchTasks }}>
      {children}
    </TaskContext.Provider>
  );
};

export const useTaskContext = (): TaskContextType => {
  const context = useContext(TaskContext);
  if (!context) {
    throw new Error("useTaskContext must be used within a TaskProvider");
  }
  return context;
};
