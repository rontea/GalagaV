import React, { useState, useEffect } from 'react';
import { Link2, Unlink2, ListTodo, Loader2, RefreshCw } from 'lucide-react';
import { Step } from '../types';

interface Todo {
  id: string;
  title: string;
  status: string;
  type: string;
  collection?: string;
}

interface TimelineTodoConnectorProps {
  step: Step;
  onLinkTodo: (stepId: string, todoId: string) => void;
  onNavigateToTodo?: (todoId: string) => void;
}

export const TimelineTodoConnector: React.FC<TimelineTodoConnectorProps> = ({ step, onLinkTodo, onNavigateToTodo }) => {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  const fetchTodos = async () => {
    setIsLoading(true);
    try {
      // Assuming GET /api/get/todos exists or similar. We can fetch using TodoController route.
      const res = await fetch('/api/get/todos');
      const data = await res.json();
      if (Array.isArray(data)) {
        setTodos(data);
      }
    } catch (err) {
      console.error('Failed to fetch todos', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isExpanded) {
      fetchTodos();
    }
  }, [isExpanded]);

  const linkedTodo = todos.find(t => t.id === step.todoId);

  return (
    <div className="mt-4 border-t border-slate-200 dark:border-slate-800 pt-4">
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400 flex items-center gap-2">
           <ListTodo size={12} /> Connected Todo
        </h4>
        <button 
          onClick={() => setIsExpanded(!isExpanded)}
          className="text-[10px] uppercase font-bold text-cyan-600 hover:text-cyan-500 flex items-center gap-1 transition-colors"
        >
          <Link2 size={12} />
          {step.todoId ? 'Manage Link' : 'Connect Todo'}
        </button>
      </div>

      {(step.todoId && !isExpanded) && (
        <div 
          onClick={() => onNavigateToTodo?.(step.todoId!)}
          className={`flex items-center gap-2 p-2 rounded bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 ${onNavigateToTodo ? 'cursor-pointer hover:border-cyan-500 hover:bg-slate-100 dark:hover:bg-slate-800/50 transition-colors' : ''}`}
        >
          <ListTodo size={16} className="text-cyan-600 shrink-0" />
          <span className="text-xs font-mono text-slate-400">[{step.todoId}]</span>
          <span className="text-sm font-medium text-slate-700 dark:text-slate-300 truncate flex-1">
            {linkedTodo ? linkedTodo.title : 'Loading details...'}
          </span>
          {linkedTodo && (
            <span className="ml-auto flex-shrink-0 text-[10px] uppercase px-2 py-0.5 rounded bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
              {linkedTodo.status}
            </span>
          )}
        </div>
      )}

      {isExpanded && (
        <div className="p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg animate-in slide-in-from-top-2">
          {isLoading ? (
            <div className="flex items-center justify-center p-4">
              <Loader2 className="animate-spin text-cyan-600" size={16} />
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500 uppercase">Select a Todo</span>
                <button onClick={fetchTodos} className="text-slate-400 hover:text-cyan-500"><RefreshCw size={14} /></button>
              </div>
              <div className="max-h-48 overflow-y-auto space-y-1">
                {todos.map(todo => (
                  <button
                    key={todo.id}
                    onClick={() => {
                      onLinkTodo(step.id, todo.id);
                      setIsExpanded(false);
                    }}
                    className={`flex items-center w-full text-left gap-2 p-2 rounded border transition-colors ${step.todoId === todo.id ? 'bg-cyan-50 dark:bg-cyan-900/20 border-cyan-200 dark:border-cyan-800 text-cyan-700 dark:text-cyan-400' : 'bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-cyan-500'}`}
                  >
                    <span className="text-[10px] font-mono text-slate-400">[{todo.id}]</span>
                    <span className="text-sm truncate flex-1">{todo.title}</span>
                    <span className="text-[10px] uppercase font-bold">{todo.status}</span>
                  </button>
                ))}
                {todos.length === 0 && (
                  <div className="text-center p-4 text-sm text-slate-500 border border-dashed border-slate-300 dark:border-slate-700 rounded">
                    No active todos found.
                  </div>
                )}
              </div>
              {step.todoId && (
                <button 
                  onClick={() => {
                    onLinkTodo(step.id, '');
                    setIsExpanded(false);
                  }}
                  className="w-full mt-2 flex items-center justify-center gap-2 p-2 text-xs font-bold uppercase text-red-600 bg-red-50 dark:bg-red-900/20 rounded hover:bg-red-100 dark:hover:bg-red-900/40 transition-colors"
                >
                  <Unlink2 size={14} /> Remove Link
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
