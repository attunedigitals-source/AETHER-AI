import { Message, TaskFrameworkState, TaskStageInfo } from '../types';

/**
 * Known stages for InsightForge Studio pipeline
 */
const INSIGHTFORGE_STAGES: TaskStageInfo[] = [
  { index: 1, id: 'stage-1', title: 'Stage 1 — Topic Development', shortTitle: '1. Topic', status: 'pending' },
  { index: 2, id: 'stage-2', title: 'Stage 2 — Research & Narration Script', shortTitle: '2. Script', status: 'pending' },
  { index: 3, id: 'stage-3', title: 'Stage 3 — Timestamped Visual Plan', shortTitle: '3. Visual Plan', status: 'pending' },
  { index: 4, id: 'stage-4', title: 'Stage 4 — Publishing Package', shortTitle: '4. Metadata', status: 'pending' },
];

/**
 * Checks if a string ended abruptly (interrupted mid-sentence or mid-block)
 */
export function isAbruptlyCutOff(text: string): boolean {
  if (!text || text.trim().length === 0) return false;
  const trimmed = text.trim();

  // If ends with error banner
  if (trimmed.includes('> ⚠️ **Error**:') || trimmed.includes('> ⚠️ **Notice**:')) return true;

  // If unclosed code block (odd number of ```)
  const backtickCount = (trimmed.match(/```/g) || []).length;
  if (backtickCount % 2 !== 0) return true;

  // If ends mid-sentence without terminal punctuation or closing brackets
  const lastChar = trimmed[trimmed.length - 1];
  const terminalPunctuation = ['.', '!', '?', '"', "'", '`', '}', ']', ')', ':', '\n'];
  if (!terminalPunctuation.includes(lastChar)) {
    // If it ends with letters or comma or dash, likely cut off
    if (/[a-zA-Z0-9,\-–—\s]/.test(lastChar)) {
      return true;
    }
  }

  return false;
}

/**
 * Analyzes conversation messages and project instructions to determine the current task state.
 */
export function analyzeTaskFrameworkState(
  messages: Message[],
  projectInstructions?: string
): TaskFrameworkState {
  const isInsightForge =
    projectInstructions?.includes('InsightForge') ||
    projectInstructions?.includes('Original research-first workflow for educational YouTube') ||
    messages.some((m) => m.content?.includes('InsightForge Studio') || m.content?.includes('Choose the subject area'));

  const lastAssistantMsg = [...messages].reverse().find((m) => m.role === 'assistant');
  const lastMsg = messages[messages.length - 1];

  // Check if interrupted
  const isInterrupted =
    Boolean(lastAssistantMsg?.is_interrupted) ||
    Boolean(lastAssistantMsg && isAbruptlyCutOff(lastAssistantMsg.content));

  const snippetAtInterruption = lastAssistantMsg
    ? lastAssistantMsg.content.slice(-180).trim()
    : undefined;

  if (isInsightForge) {
    const stages = INSIGHTFORGE_STAGES.map((s) => ({ ...s }));
    let currentStageIndex = 1;
    let lastMilestone = 'Awaiting initial subject choice';
    let pendingDeliverable = 'Choose subject area (1–6)';

    // Scan messages to detect completed stages
    for (const msg of messages) {
      const content = msg.content || '';

      if (content.includes('Welcome to InsightForge Studio') || content.includes('Choose the subject area')) {
        currentStageIndex = 1;
        lastMilestone = 'Startup menu presented';
        pendingDeliverable = '5 video concepts';
      }

      if (content.includes('Working title') && (content.includes('Central question') || content.includes('Evidence or research challenge'))) {
        stages[0].status = 'completed';
        currentStageIndex = 2;
        lastMilestone = 'Stage 1 concepts developed';
        pendingDeliverable = 'Select concept (1–5)';
      }

      if (content.includes('RESEARCH BRIEF') || content.includes('Approve this research direction')) {
        stages[0].status = 'completed';
        currentStageIndex = 2;
        lastMilestone = 'Research brief delivered';
        pendingDeliverable = 'Narration Script';
      }

      if (content.includes('script_') || content.includes('Script ready. Review the narration')) {
        stages[0].status = 'completed';
        stages[1].status = 'completed';
        currentStageIndex = 3;
        lastMilestone = 'Narration script delivered';
        pendingDeliverable = 'Timestamped visual plan';
      }

      if (content.includes('Reply “next” for the next batch') || content.includes('image_prompts_') || content.includes('All visual prompts are delivered')) {
        stages[0].status = 'completed';
        stages[1].status = 'completed';
        stages[2].status = 'completed';
        currentStageIndex = 4;
        lastMilestone = 'Visual prompts delivered';
        pendingDeliverable = 'Publishing package metadata';
      }

      if (content.includes('Publishing package ready') || (content.includes('VIDEO TITLE') && content.includes('VIDEO DESCRIPTION'))) {
        stages[0].status = 'completed';
        stages[1].status = 'completed';
        stages[2].status = 'completed';
        stages[3].status = 'completed';
        currentStageIndex = 4;
        lastMilestone = 'Publishing package completed';
        pendingDeliverable = 'Workflow fully completed';
      }
    }

    if (currentStageIndex <= 4) {
      if (stages[currentStageIndex - 1].status !== 'completed') {
        stages[currentStageIndex - 1].status = 'active';
      }
    }

    const currentStageObj = stages[currentStageIndex - 1] || stages[stages.length - 1];

    return {
      isConfigured: true,
      frameworkName: 'InsightForge Studio',
      currentStage: currentStageObj.title,
      stageIndex: currentStageIndex,
      totalStages: 4,
      stages,
      lastMilestone,
      pendingDeliverable,
      isInterrupted,
      interruptedMessageId: lastAssistantMsg?.id,
      snippetAtInterruption,
      canResume: isInterrupted,
    };
  }

  // Generic Task / Custom Instructions Framework
  const hasCustomFramework = Boolean(projectInstructions?.trim());
  const stages: TaskStageInfo[] = [
    { index: 1, id: 'step-1', title: 'Task Execution', shortTitle: 'Task Active', status: 'active' },
  ];

  return {
    isConfigured: hasCustomFramework,
    frameworkName: hasCustomFramework ? 'Custom Task Framework' : 'Chat',
    currentStage: isInterrupted ? 'Interrupted Task' : 'In Progress',
    stageIndex: 1,
    totalStages: 1,
    stages,
    lastMilestone: messages.length > 1 ? `Step ${Math.floor(messages.length / 2)}` : 'Initiated',
    pendingDeliverable: isInterrupted ? 'Resume from cut-off point' : 'Continue task',
    isInterrupted,
    interruptedMessageId: lastAssistantMsg?.id,
    snippetAtInterruption,
    canResume: isInterrupted,
  };
}

/**
 * Builds the continuation prompt sent to the LLM to resume an interrupted task seamlessly.
 */
export function buildTaskContinuationPrompt(
  taskState: TaskFrameworkState,
  interruptedText: string
): string {
  const cleanSnippet = interruptedText
    .replace(/> ⚠️ \*\*Error\*\*[\s\S]*$/gi, '')
    .slice(-250)
    .trim();

  // Check if cut off inside a code block
  const backtickCount = (interruptedText.match(/```/g) || []).length;
  const isInsideCodeBlock = backtickCount % 2 !== 0;

  let codeBlockNotice = '';
  if (isInsideCodeBlock) {
    codeBlockNotice = `\n- NOTICE: The previous generation was cut off INSIDE an open fenced code block (\`\`\`). Continue the code/text directly, then close the code block with \`\`\` when finished.`;
  }

  return `[SYSTEM INSTRUCTION: TASK INTERRUPTION RESUMPTION]
A network interruption cut off your previous output mid-stream while you were actively executing:
• Framework / Task: ${taskState.frameworkName}
• Active Stage: ${taskState.currentStage}
• Your output was cut off at:
"...${cleanSnippet}"
${codeBlockNotice}

MANDATORY RESUMPTION RULES:
1. DO NOT restart the response or repeat what has already been outputted.
2. DO NOT include greetings, apologies, or acknowledgments (e.g., "Sorry about the network", "Continuing from...").
3. IMMEDIATELY pick up the exact sentence or line where you stopped and continue generating the remainder of the deliverable until the stage goal is fulfilled.
4. Strictly maintain the active task framework rules, constraints, and deliverable format.`;
}

/**
 * Cleanly merges the original partial text with the continuation text.
 */
export function mergeResumedContent(original: string, continuation: string): string {
  // Clean error markers from original
  const cleanOriginal = original
    .replace(/\n\n> ⚠️ \*\*Error\*\*[\s\S]*$/gi, '')
    .replace(/\n\n> ⚠️ \*\*Notice\*\*[\s\S]*$/gi, '')
    .trimEnd();

  // If continuation repeats the last few characters, slice them
  const lastWords = cleanOriginal.slice(-30).trim().split(/\s+/);
  const anchor = lastWords[lastWords.length - 1];

  let cleanContinuation = continuation.trimStart();
  if (anchor && cleanContinuation.startsWith(anchor)) {
    cleanContinuation = cleanContinuation.slice(anchor.length).trimStart();
  }

  // Determine appropriate separator
  const needsSpace =
    cleanOriginal.length > 0 &&
    !cleanOriginal.endsWith('\n') &&
    !cleanOriginal.endsWith(' ') &&
    !cleanContinuation.startsWith('\n') &&
    !cleanContinuation.startsWith(' ');

  return `${cleanOriginal}${needsSpace ? ' ' : ''}${cleanContinuation}`;
}

