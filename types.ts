
export interface HighScore {
  id?: string;
  userId: string;
  pilotName: string;
  score: number;
  timestamp: number;
}

export interface UserProfile {
  uid: string;
  name: string;
  pilotName?: string;
  themePreference: 'light' | 'dark' | 'system';
  createdAt: number;
}

export interface Snippet {
  id: string;
  name: string;
  content: string;
}

export interface Project {
  id: string;
  name: string;
  description: string;
  systemPrompt: string;
  icon?: string;
  deletedAt?: number;
  repositoryUrl?: string;
  localFolderPath?: string;
  todoFolderPath?: string;
  defaultBranch?: string;
  version?: string;
  categories?: CategoryConfig[];
  statuses?: StatusConfig[];
  steps: Step[];
  snippets?: Snippet[];
  tabOrder?: string[];
  timelines?: Timeline[];
  rightPanelTimelineIds?: string[];
}

export interface Step {
  id: string;
  projectId?: string;
  parentId?: string | null;
  title: string;
  category: string;
  status: string;
  content: string;
  notes?: string;
  isTab?: boolean;
  createdAt: number;
  archivedAt?: number;
  imageUrl?: string;
  todoId?: string;
  timelineId?: string;
  subSteps?: Step[];
  history?: StepVersion[];
}

export interface Timeline {
  id: string;
  title: string;
  archivedAt?: number;
}

export interface StepVersion {
  id: string;
  content: string;
  timestamp: number;
  author?: string;
}

export interface GlobalConfig {
  theme?: string;
  [key: string]: any;
}

export interface Column {
  id: string;
  name: string;
  type: string;
  isPrimary: boolean;
  isForeignKey: boolean;
  isNullable: boolean;
  isConnectable: boolean;
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
  rows?: Record<string, any>[];
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

export interface StatusConfig {
  id?: string;
  key?: string;
  label: string;
  color: string;
  icon?: string;
}

export interface CategoryConfig {
  id?: string;
  key?: string;
  label: string;
  color: string;
  icon?: string;
}

export interface PluginManifest {
  id: string;
  name: string;
  version: string;
  description: string;
  main: string;
  style?: string;
  globalVar: string;
  type: 'theme' | 'tool' | 'integration';
}

export interface PluginConfig {
  id: string;
  enabled: boolean;
  manifest: PluginManifest;
  files: Record<string, string>;
}

// Game Types
export interface Player {
  x: number;
  y: number;
  width: number;
  height: number;
  speed: number;
  active: boolean;
  cooldown: number;
}

export interface Bullet {
  x: number;
  y: number;
  width: number;
  height: number;
  dy: number;
  isEnemy: boolean;
  active: boolean;
}

export interface Enemy {
  id?: string;
  x: number;
  y: number;
  width: number;
  height: number;
  type: 'bee' | 'butterfly' | 'boss';
  points?: number;
  health?: number;
  active: boolean;
  scoreValue: number;
  originalX: number;
  originalY: number;
  phase: number;
}

export interface Particle {
  x: number;
  y: number;
  width: number;
  height: number;
  dx: number;
  dy: number;
  life: number;
  color: string;
  active: boolean;
}

export interface GameState {
  score: number;
  lives: number;
  level: number;
  isPlaying: boolean;
  isGameOver: boolean;
  highScore: number;
  enemies?: Enemy[];
  bullets?: Bullet[];
  particles?: Particle[];
}
