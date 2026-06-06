// Free OpenRouter Models with Task-Based Rotation
export interface ModelConfig {
  id: string;
  name: string;
  provider: string;
  bestFor: string[];
  contextWindow: number;
  speed: 'fast' | 'medium' | 'slow';
}

export const FREE_MODELS: ModelConfig[] = [
  {
    id: 'deepseek/deepseek-chat-v3-0324:free',
    name: 'DeepSeek V3',
    provider: 'DeepSeek',
    bestFor: ['coding', 'reasoning', 'math', 'analysis'],
    contextWindow: 128000,
    speed: 'fast'
  },
  {
    id: 'meta-llama/llama-4-maverick:free',
    name: 'Llama 4 Maverick',
    provider: 'Meta',
    bestFor: ['general', 'conversation', 'summarization'],
    contextWindow: 128000,
    speed: 'medium'
  },
  {
    id: 'meta-llama/llama-4-scout:free',
    name: 'Llama 4 Scout',
    provider: 'Meta',
    bestFor: ['quick-tasks', 'classification', 'extraction'],
    contextWindow: 128000,
    speed: 'fast'
  },
  {
    id: 'google/gemini-2.5-pro-exp-03-25:free',
    name: 'Gemini 2.5 Pro',
    provider: 'Google',
    bestFor: ['reasoning', 'analysis', 'planning', 'complex-tasks'],
    contextWindow: 128000,
    speed: 'medium'
  },
  {
    id: 'qwen/qwen3-235b-a22b:free',
    name: 'Qwen 3 235B',
    provider: 'Alibaba',
    bestFor: ['coding', 'multilingual', 'reasoning'],
    contextWindow: 128000,
    speed: 'slow'
  },
  {
    id: 'mistralai/mistral-large-2:free',
    name: 'Mistral Large 2',
    provider: 'Mistral',
    bestFor: ['european-languages', 'reasoning', 'summarization'],
    contextWindow: 128000,
    speed: 'medium'
  },
  {
    id: 'nvidia/nemotron-3-super:free',
    name: 'Nemotron 3 Super',
    provider: 'NVIDIA',
    bestFor: ['enterprise', 'analysis', 'data-processing'],
    contextWindow: 128000,
    speed: 'fast'
  },
  {
    id: 'poolside/laguna-m1:free',
    name: 'Laguna M1',
    provider: 'Poolside',
    bestFor: ['creative', 'writing', 'brainstorming'],
    contextWindow: 128000,
    speed: 'medium'
  }
];

// Task to model mapping
const TASK_MODEL_PREFERENCE: Record<string, string[]> = {
  'staff-scheduling': ['deepseek/deepseek-chat-v3-0324:free', 'google/gemini-2.5-pro-exp-03-25:free'],
  'invoice-generation': ['deepseek/deepseek-chat-v3-0324:free', 'qwen/qwen3-235b-a22b:free'],
  'client-communication': ['meta-llama/llama-4-maverick:free', 'poolside/laguna-m1:free'],
  'event-planning': ['google/gemini-2.5-pro-exp-03-25:free', 'mistralai/mistral-large-2:free'],
  'payroll-calculation': ['deepseek/deepseek-chat-v3-0324:free', 'nvidia/nemotron-3-super:free'],
  'data-analysis': ['google/gemini-2.5-pro-exp-03-25:free', 'qwen/qwen3-235b-a22b:free'],
  'quick-response': ['meta-llama/llama-4-scout:free', 'nvidia/nemotron-3-super:free'],
  'complex-reasoning': ['google/gemini-2.5-pro-exp-03-25:free', 'deepseek/deepseek-chat-v3-0324:free'],
  'default': ['deepseek/deepseek-chat-v3-0324:free', 'meta-llama/llama-4-maverick:free']
};

let currentModelIndex = 0;
let lastTaskType = '';

export function getModelForTask(taskType: string): string {
  const preferredModels = TASK_MODEL_PREFERENCE[taskType] || TASK_MODEL_PREFERENCE['default'];
  
  // Reset rotation if task changed
  if (lastTaskType !== taskType) {
    currentModelIndex = 0;
    lastTaskType = taskType;
  }
  
  const selectedModel = preferredModels[currentModelIndex % preferredModels.length];
  currentModelIndex++;
  
  return selectedModel;
}

export function getAllModels(): ModelConfig[] {
  return FREE_MODELS;
}

export function getModelById(id: string): ModelConfig | undefined {
  return FREE_MODELS.find(m => m.id === id);
}
