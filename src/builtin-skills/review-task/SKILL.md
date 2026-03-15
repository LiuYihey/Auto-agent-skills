---
name: review-task
description: Guide for reviewing completed tasks and deciding whether to create or update skills. Use after task completion to evaluate skill usage and determine if new skills should be created or existing ones updated.
---

# Task Review Guide

This skill guides you through reviewing completed tasks and making intelligent decisions about skill creation and updates.

## When to Use This Skill

- After completing any task (automatically triggered by review_task tool)
- When evaluating whether a solution is worth capturing as a skill
- When assessing if a used skill performed well

## Review Workflow

### Step 1: Identify Skill Usage

Check if any skills were used during the task:

**If skills were used**: Proceed to Step 2 (Evaluate Skill Performance)
**If no skills were used**: Proceed to Step 3 (Evaluate Reuse Potential)

### Step 2: Evaluate Skill Performance (Skills Were Used)

Analyze how well the skill(s) performed:

| Performance | Indicators | Action |
|------------|-----------|---------|
| **Excellent** | Task completed smoothly, no workarounds needed, instructions were clear | No action needed. Acknowledge success. |
| **Good with minor issues** | Mostly worked but had small gaps or unclear parts | Consider updating the skill with `update_skill` tool |
| **Poor** | Required significant workarounds, instructions were wrong/incomplete | **Strongly recommend** updating the skill with `update_skill` tool |

#### Decision Criteria for Skill Updates

Update the skill if ANY of these apply:
- Instructions were unclear or incomplete
- Edge cases weren't handled
- Commands/APIs were outdated
- Had to improvise or work around issues
- Better patterns were discovered during execution

**If update is needed**: Call the `update_skill` MCP tool, which will provide the skill-updater guide.

### Step 3: Evaluate Reuse Potential (No Skills Were Used)

Assess whether the completed task is worth capturing as a new skill:

#### High Reuse Value ✅ (Create Skill)

Create a skill if the task has:
- **Repeatable workflow**: Same steps apply to similar problems
- **Clear trigger conditions**: Easy to identify when this solution applies
- **Non-trivial complexity**: More than 3-4 steps or requires specific knowledge
- **Broad applicability**: Useful across multiple projects/contexts

**Examples of high reuse value**:
- Setting up a development environment (React + TypeScript + Tailwind)
- Implementing authentication flow (JWT + refresh tokens)
- Configuring CI/CD pipeline (GitHub Actions + Docker)
- Data processing workflow (CSV → clean → analyze → visualize)

#### Low Reuse Value ❌ (Don't Create Skill)

Don't create a skill if the task is:
- **One-off solution**: Highly specific to current context
- **Trivial**: Simple enough that agent can handle without guidance
- **Too variable**: Every instance requires completely different approach
- **Already covered**: Existing skills or general knowledge suffice

**Examples of low reuse value**:
- Fixing a specific bug in specific codebase
- Writing a one-time data migration script
- Answering a factual question
- Simple file operations (copy, rename, delete)

#### Decision Framework

Ask yourself:
1. **Would I do this exact workflow again?** (If no → don't create)
2. **Is this more complex than basic agent knowledge?** (If no → don't create)
3. **Can I clearly define when to use this?** (If no → don't create)
4. **Would this save significant time in future tasks?** (If no → don't create)

**If 3+ answers are "yes"**: Create the skill with `create_skill` tool
**If 2 or fewer "yes"**: Skip skill creation, acknowledge task completion

**If skill creation is needed**: Call the `create_skill` MCP tool, which will provide the skill-creator guide.

## Review Response Template

Keep your review response concise. Use this template:

### If Skills Were Used:
```
Task completed using skill(s): [skill-name(s)]
Performance: [Excellent/Good/Poor]
[If issues found]: Recommend updating skill due to [specific issue]
[Action]: [Call update_skill tool / No action needed]
```

### If No Skills Were Used:
```
Task completed without skills.
Reuse potential: [High/Low]
Reasoning: [1-2 sentence justification]
[Action]: [Call create_skill tool / No skill creation needed]
```

## Examples

### Example 1: Skill Used Successfully
```
Task completed using skill: react-ts-setup
Performance: Excellent - all steps executed smoothly
No action needed.
```

### Example 2: Skill Used with Issues
```
Task completed using skill: api-integration
Performance: Poor - missing error handling for 429 rate limits
Recommend updating skill to add retry logic with exponential backoff
Action: Calling update_skill tool
```

### Example 3: No Skill, High Reuse Value
```
Task completed without skills.
Reuse potential: High
Reasoning: Implemented OAuth2 PKCE flow - repeatable pattern for secure authentication, 8+ steps, applicable to many projects
Action: Calling create_skill tool
```

### Example 4: No Skill, Low Reuse Value
```
Task completed without skills.
Reuse potential: Low
Reasoning: Fixed specific CSS bug in current project - too context-specific, unlikely to recur
No skill creation needed.
```

## Quality Checklist

Before making a decision, verify:
- [ ] Considered actual task complexity and repeatability
- [ ] Evaluated skill performance objectively (if skills were used)
- [ ] Identified specific issues (if recommending updates)
- [ ] Justified decision with concrete reasoning
- [ ] Kept response concise and actionable
