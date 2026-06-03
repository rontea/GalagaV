import fs from 'fs';
import path from 'path';

const dataFile = path.join(process.cwd(), 'src', 'data', 'todos.json');

export interface Subtask {
  text: string;
  completed: boolean;
}

export interface Todo {
  id: string;
  title: string;
  date: string;
  days: number;
  description: string;
  type: string;
  status: string;
  assign: string;
  subtask: Subtask[];
  comments: string;
  commitMessage?: string;
  timelineId?: string;
  collection?: string;
  archivedAt?: number;
}

export interface Contributor {
  name: string;
  alias: string;
}

export interface TodosData {
  assigned: Contributor[];
  developers: Contributor[];
  statuses: string[];
  types: string[];
  collections: string[];
  todos: Todo[];
}

function readData(): TodosData {
  if (!fs.existsSync(dataFile)) {
    return { assigned: [], developers: [], statuses: [], types: [], collections: [], todos: [] };
  }
  const raw = fs.readFileSync(dataFile, 'utf8');
  try {
    const parsed = JSON.parse(raw) as TodosData;
    return {
      assigned: parsed.assigned || [],
      developers: parsed.developers || [],
      statuses: parsed.statuses || [],
      types: parsed.types || [],
      collections: parsed.collections || [],
      todos: parsed.todos || [],
    };
  } catch (e) {
    return { assigned: [], developers: [], statuses: [], types: [], collections: [], todos: [] };
  }
}

function writeData(data: TodosData): void {
  const dir = path.dirname(dataFile);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(dataFile, JSON.stringify(data, null, 2), 'utf8');
}

export class TodoModel {
  static getTodos(): Todo[] {
    return readData().todos || [];
  }

  static getStatuses(): string[] {
    return readData().statuses || [];
  }

  static getTypes(): string[] {
    return readData().types || [];
  }

  static getCollections(): string[] {
    return readData().collections || [];
  }

  static getContributors(): Contributor[] {
    return readData().assigned || [];
  }

  static getDevelopers(): Contributor[] {
    return readData().developers || [];
  }

  static saveTodo(newTodo: Todo): void {
    const data = readData();
    data.todos = data.todos || [];
    if (data.todos.some(t => t.id === newTodo.id)) {
      console.warn(`Todo with id ${newTodo.id} already exists, skipping save to avoid duplicates.`);
      return;
    }
    data.todos.push(newTodo);
    writeData(data);
  }

  static updateTodo(updatedTodo: Partial<Todo> & { id: string }): void {
    const data = readData();
    data.todos = data.todos.map(t => t.id === updatedTodo.id ? { ...t, ...updatedTodo } : t);
    writeData(data);
  }

  static deleteTodo(id: string): void {
    const data = readData();
    data.todos = data.todos.filter(t => t.id !== id);
    writeData(data);
  }

  static archiveTodo(id: string): void {
    const data = readData();
    data.todos = data.todos.map(t => t.id === id ? { ...t, archivedAt: Date.now() } : t);
    writeData(data);
  }

  static saveStatuses(statuses: string[]): void {
    const data = readData();
    data.statuses = statuses;
    writeData(data);
  }

  static saveTypes(types: string[]): void {
    const data = readData();
    data.types = types;
    writeData(data);
  }

  static saveCollections(collections: string[]): void {
    const data = readData();
    data.collections = collections;
    writeData(data);
  }

  static saveContributor(contributor: Contributor): void {
    const data = readData();
    data.assigned = data.assigned || [];
    data.assigned.push(contributor);
    writeData(data);
  }

  static saveDeveloper(developer: Contributor): void {
    const data = readData();
    data.developers = data.developers || [];
    data.developers.push(developer);
    writeData(data);
  }

  static saveAllTodos(todos: Todo[]): void {
    const data = readData();
    data.todos = todos;
    writeData(data);
  }
}
