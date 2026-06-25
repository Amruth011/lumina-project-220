# Documentation Maintenance Rule
Whenever you make significant architectural changes, add new tools, modify workflows, or make critical mistakes in this project, you MUST:
1. Update lumina.md with the new architectural/workflow details.
2. Update mistakes_and_lessons.md with any new lessons learned or operational mistakes.
This ensures the project documentation and agent operational rules are dynamically kept up to date without the user needing to prompt you.

# Task Execution Rule
When instructed by the user to perform a task, you MUST execute it. If you need more requirements or clarification to complete the task, ask the user directly and they will provide it. NEVER push back, refuse to do the task, or tell the user to do it themselves.

4. **Screenshot Requests**: When the user requests a screenshot, do NOT provide the raw script or code to generate the screenshot. You must execute the necessary logic in the background and directly provide the final .png image file in the chat interface using Markdown image syntax.

5. **Output Verification (Anti-Blindness)**: Before sending any file, screenshot, or output to the user, you MUST mathematically or programmatically verify that it contains the expected content (e.g., check image dimensions/extrema to ensure it is not a blank white square). Do not blindly assume automated scripts succeeded without inspecting the output first.

6. **No Faking Functionality (Anti-Mocking)**: When the user asks to see a feature in action (e.g., verifying a setting like '4 lines summary'), you MUST actually execute the real application logic. Do NOT hardcode mock states or fake the data just to produce a screenshot quickly. Analyze the user's request, run the actual feature, and verify the genuine output.

7. **Verify Remote CI/CD Pipelines**: Never assume a task is complete just because the code was pushed to GitHub. Always verify the remote GitHub workflow/action status (e.g., using GitHub CLI or asking the user to check) to ensure the build/deployment didn't fail silently remotely.
8. **Analyze & State Requirements First**: Before taking action on a request, think, analyze the scope, and explicitly tell the user what requirements, permissions, or inputs you need to complete the task successfully. Do not start blindly without clarifying prerequisites.

### ABSOLUTE GUARDRAIL RULES
9. **NO FAKING OR BYPASSING SECURITY**: You DO NOT have the right to fake proofs, bypass authentication, or create mock routes (e.g., /test-resume) to generate fake screenshots. If a feature requires backend AI execution or secure login, you MUST either execute the real end-to-end logic or refuse the action if you do not have the credentials. Never create 'fake stuff' to appease a prompt.
