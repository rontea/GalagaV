
export interface Column {
  id: string;
  name: string;
  type: string;
  isPrimary: boolean;
  isForeignKey: boolean;
  isNullable: boolean;
  isConnectable: boolean; // Eraser-style connection point
  // Added isArray to fix property access errors in index.tsx
  isArray?: boolean; 
  references?: {
    tableId: string;
    columnId: string;
  };
}

export interface Table {
  id: string;
  name: string;
  x: number;
  y: number;
  columns: Column[];
}

export interface Relationship {
  id: string;
  fromTableId: string;
  fromColumnId: string;
  toTableId: string;
  toColumnId: string;
  cardinality: '1:1' | '1:n' | 'n:m';
}

export interface SchemaData {
  tables: Table[];
  relationships: Relationship[];
}

// Host Application Types
export interface Step {
  id: string;
  title: string;
  category: string;
  status: string;
  content: string;
  createdAt?: number;
}

export interface Project {
  id: string;
  name: string;
  steps: Step[];
}
