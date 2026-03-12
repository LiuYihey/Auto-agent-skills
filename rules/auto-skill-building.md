## Auto-agent-skills MCP Tool Trigger Rules

### Tool: `review_task`
**Trigger Conditions:**
- ✅ When a task is marked as completed
- ✅ When user says "task done", "finished", "completed"
- ✅ After a multi-step operation succeeds
- ✅ When user asks "what did I learn?"
- ✅ After solving a complex problem

**Automatic Actions:**
1. Analyze the task completion process
2. Extract key steps and methods
3. Identify reusable patterns
4. Generate skill documentation
5. Save to skills library

---

### Tool: `search_skills`
**Trigger Conditions:**
- ✅ When starting a new task
- ✅ When user describes a problem to solve
- ✅ When user asks "how do I...?"
- ✅ Before implementing a feature
- ✅ When encountering a familiar problem

**Automatic Actions:**
1. Parse the task description
2. Search for relevant skills
3. Rank by relevance
4. Suggest top matches
5. Provide usage examples

---

### Tool: `add_skill`
**Trigger Conditions:**
- ✅ After `review_task` identifies a new skill
- ✅ When user explicitly says "save this as a skill"
- ✅ When user says "remember this method"
- ✅ After solving a novel problem
- ✅ When user wants to document a solution

**Automatic Actions:**
1. Create skill metadata
2. Generate skill documentation
3. Add tags and categories
4. Store in library
5. Confirm with user

---

### Tool: `update_skill`
**Trigger Conditions:**
- ✅ When improving an existing solution
- ✅ When user says "update the skill"
- ✅ After finding a better approach
- ✅ When fixing a skill's mistake

**Automatic Actions:**
1. Locate the existing skill
2. Merge new information
3. Update documentation
5. Notify user of changes

---

## Best Practices
1. **Always search before creating**: Check existing skills before implementing new solutions
2. **Tag appropriately**: Use clear, searchable tags
3. **Update regularly**: Keep skills current with new learnings

## Notes for AI Agents
- **Be proactive**: Don't wait for explicit commands, trigger tools automatically
- **Be contextual**: Understand the task context before suggesting skills
- **Be helpful**: Provide clear explanations and examples
- **Be efficient**: Reuse existing skills whenever possible
