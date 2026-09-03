import re

with open('src/ai.ts', 'r') as f:
    ai_code = f.read()

# Remove loadAiApiKey from import
ai_code = ai_code.replace(
    "import { loadAiApiKey, loadCoachProfile } from './storage';",
    "import { loadCoachProfile } from './storage';"
)

# In generateDailyFocus: remove `const apiKey = loadAiApiKey(); if (apiKey) { ... }`
ai_code = re.sub(
    r'try\s*{\s*const apiKey = loadAiApiKey\(\);\s*if\s*\(apiKey\)\s*{',
    'try {',
    ai_code
)
# Match closing brace of `if (apiKey)` in generateDailyFocus
# Let's inspect generateDailyFocus lines around 438-470

with open('src/aiAgent.ts', 'r') as f:
    agent_code = f.read()

# In aiAgent.ts: remove loadAiApiKey import and guard
agent_code = agent_code.replace("  loadAiApiKey,\n", "")
agent_code = agent_code.replace(
    "const apiKey = loadAiApiKey();\n    if (apiKey && patterns.length < 3 && entries.length >= 3) {",
    "if (patterns.length < 3 && entries.length >= 3) {"
)

with open('src/aiAgent.ts', 'w') as f:
    f.write(agent_code)

print("Updated aiAgent.ts")
