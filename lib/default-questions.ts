export interface StandardQuestionTemplate {
  order: number;
  stage: string;
  category: "conversation" | "code_editor" | "drawing" | "option_quiz";
  durationMinutes: number;
  autoSwitch: boolean;
  allowAiSwitch: boolean;
  title: string;
  promptText: string;
  options?: string[];
  correctOption?: number | null;
  explanation?: string | null;
  expectedRubric: string[];
  secondaryProbe?: string | null;
  maxProbes: number;
  isActive: boolean;
}

export const STANDARD_5_QUESTIONS_TEMPLATE: StandardQuestionTemplate[] = [
  {
    order: 1,
    stage: "intro",
    category: "conversation",
    durationMinutes: 5,
    autoSwitch: true,
    allowAiSwitch: true,
    title: "1. Introduction & Background Discussion",
    promptText:
      "Hello and welcome to your technical interview! Take a couple of minutes to introduce yourself, walk through your relevant experience, and share your initial high-level understanding of today's challenge.",
    expectedRubric: [
      "Introduces professional background and core technical competencies clearly",
      "Restates problem requirements and expected deliverables accurately",
      "Identifies key boundary conditions, constraints, and initial assumptions",
    ],
    secondaryProbe:
      "Could you highlight a challenging technical project you recently completed, or clarify any questions about the problem constraints?",
    maxProbes: 1,
    isActive: true,
  },
  {
    order: 2,
    stage: "approach",
    category: "option_quiz",
    durationMinutes: 3,
    autoSwitch: true,
    allowAiSwitch: true,
    title: "2. Conceptual Architecture & Data Structure Quiz",
    promptText:
      "Which data structure provides O(1) average time complexity for complement lookups and key-value retrieval in this problem?",
    options: [
      "Hash Map / Hash Table",
      "Binary Search Tree",
      "Doubly Linked List",
      "Sorted Array with Binary Search",
    ],
    correctOption: 0,
    explanation:
      "A Hash Map calculates bucket indexes via hashing, yielding O(1) average time complexity for insertions and lookups.",
    expectedRubric: [
      "Identifies Hash Map as the optimal O(1) complement lookup mechanism",
      "Understands hash collision handling, bucket indexing, and average time bounds",
    ],
    secondaryProbe:
      "Think about how we can avoid checking all pairs in O(n²) time by caching previously visited values in memory.",
    maxProbes: 1,
    isActive: true,
  },
  {
    order: 3,
    stage: "approach",
    category: "drawing",
    durationMinutes: 8,
    autoSwitch: true,
    allowAiSwitch: true,
    title: "3. Architecture & Data Flow Whiteboard",
    promptText:
      "Please use the whiteboard drawing canvas to sketch your system architecture or the algorithmic data flow before we write code.",
    expectedRubric: [
      "Draws a clear sequential flow of input data to output results",
      "Labels components such as state storage, cache, or pointer movements",
      "Communicates architectural design trade-offs and component interactions",
    ],
    secondaryProbe:
      "Try sketching the primary components or drawing a step-by-step diagram of how elements move through memory.",
    maxProbes: 1,
    isActive: true,
  },
  {
    order: 4,
    stage: "coding",
    category: "code_editor",
    durationMinutes: 20,
    autoSwitch: true,
    allowAiSwitch: true,
    title: "4. Live Code Implementation",
    promptText:
      "That diagram is clear. Now please go ahead and implement your solution in the code editor. You can test your code anytime using the Run Code button.",
    expectedRubric: [
      "Implements algorithm cleanly without syntax errors or unhandled exceptions",
      "Handles edge cases like empty inputs, single elements, or duplicate values",
      "Uses clear, idiomatic variable and function naming with modular structure",
    ],
    secondaryProbe:
      "Take your time with the code. If you encounter unexpected test results, walk me through line-by-line how your variables update.",
    maxProbes: 1,
    isActive: true,
  },
  {
    order: 5,
    stage: "complexity",
    category: "conversation",
    durationMinutes: 5,
    autoSwitch: true,
    allowAiSwitch: true,
    title: "5. Complexity Analysis & Wrap-up",
    promptText:
      "Great job completing the implementation! Now walk me through the time and space complexity of your code and any scalability trade-offs.",
    expectedRubric: [
      "Accurately states Big-O Time Complexity with rigorous justification",
      "Accurately states Big-O Space Complexity including auxiliary memory usage",
      "Discusses scalability and performance bottlenecks under high-volume inputs",
    ],
    secondaryProbe:
      "How many passes does your algorithm make over the input array, and how much auxiliary memory is allocated?",
    maxProbes: 1,
    isActive: true,
  },
];
