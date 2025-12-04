

export interface Position {
  x: number;
  y: number;
}

export interface Entity extends Position {
  width: number;
  height: number;
  active: boolean;
}

export interface Player extends Entity {
  speed: number;
  cooldown: number;
}

export interface Bullet extends Entity {
  dy: number;
  isEnemy: boolean;
}

export interface Enemy extends Entity {
  type: 'bee' | 'butterfly' | 'boss';
  scoreValue: number;
  originalX: number;
  originalY: number;
  phase: number; // For movement patterns
}

export interface Particle extends Entity {
  dx: number;
  dy: number;
  life: number;
  color: string;
}

export interface GameState {
  score: number;
  lives: number;
  level: number;
  isPlaying: boolean;
  isGameOver: boolean;
  highScore: number;
}

// Firestore / Data Models
export interface UserProfile {
  uid: string;
  pilotName: string;
  themePreference: 'retro' | 'modern';
  createdAt: number;
}

export interface HighScore {
  id?: string;
  userId: string;
  pilotName: string;
  score: number;
  timestamp: number;
}

// Project Dashboard Models
// Changed from union to string to support custom statuses
export type StepStatus = string; 

export interface StepVersion {
  id: string;
  content: string;
  status: StepStatus;
  timestamp: number;
  failureReason?: string;
}

export interface CategoryConfig {
  key: string;
  label: string;
  color: string; // Tailwind color name e.g. 'cyan', 'rose'
}

export interface StatusConfig {
  key: string;
  label: string;
  color: string; // Tailwind color name
  icon: string; // Icon Key from ICON_MAP
}

export interface Step {
  id: string;
  title: string;
  category: string; 
  status: StepStatus;
  content: string;
  history?: StepVersion[];
  subSteps?: Step[]; // Nested tasks / sub-cards
  archivedAt?: number; // Timestamp if soft-deleted/archived
  notes?: string; // Quick scratchpad notes
  isTab?: boolean; // If true, shows as a main navigation tab
}

export interface Project {
  id: string;
  name: string;
  description: string;
  systemPrompt: string;
  icon?: string; // Icon identifier key (e.g. 'Gamepad2', 'Terminal')
  categories?: CategoryConfig[]; // Custom categories added by user
  statuses?: StatusConfig[]; // Custom statuses added by user
  steps: Step[];
  deletedAt?: number; // Timestamp if soft-deleted/archived
}

// --- PLUGIN SYSTEM TYPES ---
export interface PluginConfig {
  id: string;
  name: string;
  url: string; // The URL to the UMD script
  globalName: string; // The window variable the plugin attaches to (e.g. GalagaPlugin_SchemaBuilder)
  enabled: boolean;
}

export interface GlobalConfig {
  projectIcons: string[]; // List of active icon keys for projects
  statusIcons: string[];  // List of active icon keys for statuses
  plugins: PluginConfig[]; // Installed plugins
  theme: 'light' | 'dark'; // UI Theme preference
}